import { defineEventHandler, readBody, createError } from "h3";
import { serverSupabaseClient } from "#supabase/server";

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event);

  // 1. Ambil body
  const body = await readBody(event);
  const questionId = body.questionId || body.question_id;
  const action = body.action;

  // 2. Eksekusi langsung (biarkan RLS yang bekerja)
  // Dengan .select() agar Supabase memberikan feedback sukses
  const { data, error: updateError } = await supabase
    .from("questions")
    .update({ status: action })
    .eq("id", questionId)
    .eq("status", "pending")
    .select();

  if (updateError) {
    // Jika masih error 500, pesan aslinya akan muncul di sini
    throw createError({ 
      statusCode: 500, 
      message: "Database Error: " + updateError.message 
    });
  }

  if (!data || data.length === 0) {
    throw createError({ 
      statusCode: 404, 
      message: "Gagal: Data tidak ditemukan atau antum tidak punya akses." 
    });
  }

  return { success: true, message: `Status berhasil diubah ke ${action}` };
});