// ============================================================
// PROJECT: TANYA USTADZ V3
// FILE: server/api/ustadz/answer.post.ts
// DESC: Ustadz action — submit answer to a verified question
//       - Only 'ustadz' role can call this
//       - Only 'verified' questions can be answered
//       - Validates question still exists before submit (cron edge case)
//       - Sets status → 'answered' + fills answer column
// ============================================================

import { defineEventHandler, readBody, createError } from "h3";
import { serverSupabaseClient } from "#supabase/server";

/**
 * XSS sanitizer for answer text
 */
function sanitizeText(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

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

  if (!profile || profile.role !== "ustadz") {
    throw createError({
      statusCode: 403,
      message: "Akses ditolak. Hanya Ustadz yang dapat mengisi jawaban.",
    });
  }

  // --- READ BODY ---
  const body = await readBody(event);
  const questionId: string = (body?.question_id ?? "").trim();
  const rawAnswer: string  = (body?.answer      ?? "").trim();

  if (!questionId) {
    throw createError({ statusCode: 400, message: "question_id wajib diisi." });
  }

  if (!rawAnswer) {
    throw createError({ statusCode: 400, message: "Jawaban tidak boleh kosong." });
  }

  if (rawAnswer.length > 2000) {
    throw createError({ statusCode: 400, message: "Jawaban maksimal 2000 karakter." });
  }

  // --- CRITICAL EDGE CASE: Validate question still exists ---
  // (Cron may have deleted it while Ustadz had the modal open)
  const { data: question, error: fetchError } = await supabase
    .from("questions")
    .select("id, status")
    .eq("id", questionId)
    .single();

  if (fetchError || !question) {
    throw createError({
      statusCode: 404,
      message: "Pertanyaan tidak ditemukan. Mungkin sudah dihapus secara otomatis.",
    });
  }

  if (question.status !== "verified") {
    throw createError({
      statusCode: 409,
      message: `Hanya pertanyaan 'verified' yang bisa dijawab. Status saat ini: ${question.status}.`,
    });
  }

  // --- SANITIZE ANSWER ---
  const safeAnswer = sanitizeText(rawAnswer);

  // --- UPDATE: answer + status, nothing else ---
  const { error: updateError } = await supabase
    .from("questions")
    .update({
      answer: safeAnswer,
      status: "answered",
    })
    .eq("id", questionId)
    .eq("status", "verified"); // extra guard: only update if still verified

  if (updateError) {
    console.error("[ustadz/answer] Update error:", updateError.message);
    throw createError({ statusCode: 500, message: "Gagal menyimpan jawaban." });
  }

  return {
    success: true,
    question_id: questionId,
    status: "answered",
  };
});