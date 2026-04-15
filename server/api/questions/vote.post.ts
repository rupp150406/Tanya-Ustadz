// ============================================================
// PROJECT: TANYA USTADZ V3
// FILE: server/api/questions/vote.post.ts
// DESC: Submit or retract an upvote for a question
//       - 1 fingerprint = 1 vote per question (DB-enforced)
//       - Upvotes count synced via trigger (not manual count)
// ============================================================

import { defineEventHandler, readBody, createError } from "h3";
import { serverSupabaseClient } from "#supabase/server";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  const questionId: string  = (body?.question_id ?? "").trim();
  const fingerprint: string = (body?.fingerprint  ?? "").trim();

  // --- VALIDATION ---
  if (!questionId) {
    throw createError({ statusCode: 400, message: "question_id wajib diisi." });
  }
  if (!fingerprint) {
    throw createError({ statusCode: 400, message: "Fingerprint tidak valid." });
  }

  const supabase = await serverSupabaseClient(event);

  // --- CHECK: Question must exist and be publicly visible ---
  const { data: question, error: fetchError } = await supabase
    .from("questions")
    .select("id, status")
    .eq("id", questionId)
    .single();

  if (fetchError || !question) {
    throw createError({ statusCode: 404, message: "Pertanyaan tidak ditemukan." });
  }

  // --- CHECK: Already voted? ---
  const { data: existingVote } = await supabase
    .from("question_votes")
    .select("id")
    .eq("question_id", questionId)
    .eq("fingerprint", fingerprint)
    .maybeSingle();

  if (existingVote) {
    // RETRACT vote (toggle off)
    const { error: deleteError } = await supabase
      .from("question_votes")
      .delete()
      .eq("question_id", questionId)
      .eq("fingerprint", fingerprint);

    if (deleteError) {
      throw createError({ statusCode: 500, message: "Gagal menghapus vote." });
    }

    return { success: true, action: "retracted" };
  }

  // --- INSERT vote ---
  const { error: insertError } = await supabase
    .from("question_votes")
    .insert({ question_id: questionId, fingerprint });

  if (insertError) {
    // Unique constraint violation = already voted (race condition safety)
    if (insertError.code === "23505") {
      return { success: false, action: "already_voted" };
    }
    throw createError({ statusCode: 500, message: "Gagal menyimpan vote." });
  }

  return { success: true, action: "voted" };
});