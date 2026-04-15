// ============================================================
// PROJECT: TANYA USTADZ V3
// FILE: server/api/profile/select-role.post.ts
// DESC: Set role for authenticated Google OAuth user
//       - Only allowed if current role IS NULL (first-time)
//       - Accepts: 'admin' or 'ustadz'
// ============================================================

import { defineEventHandler, readBody, createError } from "h3";
import { serverSupabaseClient } from "#supabase/server";

type ValidRole = "admin" | "ustadz";
const VALID_ROLES: ValidRole[] = ["admin", "ustadz"];

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event);

  // --- AUTH CHECK ---
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw createError({ statusCode: 401, message: "Tidak terautentikasi." });
  }

  // --- READ BODY ---
  const body = await readBody(event);
  const role: string = (body?.role ?? "").trim();

  if (!VALID_ROLES.includes(role as ValidRole)) {
    throw createError({
      statusCode: 400,
      message: "Role tidak valid. Pilih 'admin' atau 'ustadz'.",
    });
  }

  // --- FETCH existing profile ---
  const { data: existing, error: fetchError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (fetchError || !existing) {
    throw createError({ statusCode: 404, message: "Profil tidak ditemukan." });
  }

  // --- GUARD: Role already set — do not allow override ---
  if (existing.role !== null) {
    return {
      success: true,
      role: existing.role,
      message: "Role sudah dipilih sebelumnya.",
    };
  }

  // --- UPDATE role ---
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ role: role as ValidRole })
    .eq("id", user.id);

  if (updateError) {
    console.error("[select-role] Update error:", updateError.message);
    throw createError({ statusCode: 500, message: "Gagal menyimpan role." });
  }

  return {
    success: true,
    role,
  };
});