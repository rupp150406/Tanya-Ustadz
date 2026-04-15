// ============================================================
// PROJECT: TANYA USTADZ V3
// FILE: server/api/admin/pin.post.ts
// DESC: Admin action — toggle is_pinned on a question
//       - Pinned questions are exempt from 30-day auto-delete
//       - Only 'admin' role can call this
// ============================================================

import { defineEventHandler, readBody, createError } from "h3";
import { serverSupabaseClient } from "#supabase/server";

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

  // --- ROLE CHECK ---
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    throw createError({
      statusCode: 403,
      message: "Akses ditolak. Hanya Admin yang dapat mengubah pin.",
    });
  }

  // --- READ BODY ---
  const body = await readBody(event);
  const questionId: string = (body?.question_id ?? "").trim();

  if (!questionId) {
    throw createError({ statusCode: 400, message: "question_id wajib diisi." });
  }

  // --- FETCH current is_pinned state ---
  const { data: question, error: fetchError } = await supabase
    .from("questions")
    .select("id, is_pinned")
    .eq("id", questionId)
    .single();

  if (fetchError || !question) {
    throw createError({ statusCode: 404, message: "Pertanyaan tidak ditemukan." });
  }

  // --- TOGGLE is_pinned ---
  const newPinnedState = !question.is_pinned;

  const { error: updateError } = await supabase
    .from("questions")
    .update({ is_pinned: newPinnedState })
    .eq("id", questionId);

  if (updateError) {
    throw createError({ statusCode: 500, message: "Gagal mengubah status pin." });
  }

  return {
    success: true,
    question_id: questionId,
    is_pinned: newPinnedState,
  };
});