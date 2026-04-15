// ============================================================
// PROJECT: TANYA USTADZ V3
// FILE: server/api/admin/moderate.post.ts
// DESC: Admin action — approve (verified) or reject a question
//       - Only 'admin' role can call this
//       - Cannot touch 'answer' column
//       - Cannot re-moderate answered questions
// ============================================================

import { defineEventHandler, readBody, createError } from "h3";
import { serverSupabaseClient } from "#supabase/server";

type AllowedAction = "verified" | "rejected";
const ALLOWED_ACTIONS: AllowedAction[] = ["verified", "rejected"];

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
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "admin") {
    throw createError({
      statusCode: 403,
      message: "Akses ditolak. Hanya Admin yang dapat melakukan moderasi.",
    });
  }

  // --- READ BODY ---
  const body = await readBody(event);
  const questionId: string = (body?.question_id ?? "").trim();
  const action: string     = (body?.action      ?? "").trim();

  if (!questionId) {
    throw createError({ statusCode: 400, message: "question_id wajib diisi." });
  }

  if (!ALLOWED_ACTIONS.includes(action as AllowedAction)) {
    throw createError({
      statusCode: 400,
      message: "Action tidak valid. Gunakan 'verified' atau 'rejected'.",
    });
  }

  // --- CHECK: Question exists and is still pending ---
  const { data: question, error: fetchError } = await supabase
    .from("questions")
    .select("id, status")
    .eq("id", questionId)
    .single();

  if (fetchError || !question) {
    throw createError({ statusCode: 404, message: "Pertanyaan tidak ditemukan." });
  }

  if (question.status === "answered") {
    throw createError({
      statusCode: 409,
      message: "Pertanyaan yang sudah dijawab tidak bisa dimoderasi ulang.",
    });
  }

  if (question.status !== "pending") {
    throw createError({
      statusCode: 409,
      message: `Pertanyaan sudah dimoderasi (status: ${question.status}).`,
    });
  }

  // --- UPDATE: only status column, never answer ---
  const { error: updateError } = await supabase
    .from("questions")
    .update({ status: action as AllowedAction })
    .eq("id", questionId)
    .eq("status", "pending"); // extra guard: only update if still pending

  if (updateError) {
    console.error("[admin/moderate] Update error:", updateError.message);
    throw createError({ statusCode: 500, message: "Gagal memperbarui status pertanyaan." });
  }

  return {
    success: true,
    question_id: questionId,
    new_status: action,
  };
});