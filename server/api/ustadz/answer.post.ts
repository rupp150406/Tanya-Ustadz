// server/api/ustadz/answer.post.ts
import { defineEventHandler, readBody, createError } from 'h3'
import { serverSupabaseClient } from '#supabase/server'

function sanitizeText(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw createError({ statusCode: 401, message: 'Tidak terautentikasi.' })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'ustadz') {
    throw createError({
      statusCode: 403,
      message: 'Akses ditolak. Hanya Ustadz yang dapat mengisi jawaban.',
    })
  }

  const body = await readBody(event)
  const questionId: string = (body?.question_id ?? '').trim()
  const rawAnswer: string = (body?.answer ?? '').trim()

  if (!questionId) {
    throw createError({ statusCode: 400, message: 'question_id wajib diisi.' })
  }
  if (!rawAnswer) {
    throw createError({ statusCode: 400, message: 'Jawaban tidak boleh kosong.' })
  }
  if (rawAnswer.length > 2000) {
    throw createError({ statusCode: 400, message: 'Jawaban maksimal 2000 karakter.' })
  }

  // Ambil question + fingerprint untuk notifikasi ke user
  const { data: question, error: fetchError } = await supabase
    .from('questions')
    .select('id, status, fingerprint')
    .eq('id', questionId)
    .single()

  if (fetchError || !question) {
    throw createError({
      statusCode: 404,
      message: 'Pertanyaan tidak ditemukan. Mungkin sudah dihapus secara otomatis.',
    })
  }

  if (question.status !== 'verified') {
    throw createError({
      statusCode: 409,
      message: `Hanya pertanyaan 'verified' yang bisa dijawab. Status saat ini: ${question.status}.`,
    })
  }

  const safeAnswer = sanitizeText(rawAnswer)

  const { error: updateError } = await supabase
    .from('questions')
    .update({
      answer: safeAnswer,
      status: 'answered',
      answered_by: user.id,
    })
    .eq('id', questionId)
    .eq('status', 'verified')

  if (updateError) {
    throw createError({ statusCode: 500, message: 'Gagal menyimpan jawaban.' })
  }

  // Notify user via fingerprint kalau ada
  if (question.fingerprint) {
    await $fetch('/api/notify', {
      method: 'POST',
      body: {
        role: 'user',
        title: 'Pertanyaanmu Telah Dijawab!',
        body: 'Ustadz telah menjawab pertanyaan yang kamu kirimkan. Lihat sekarang.',
        fingerprint: question.fingerprint,
      }
    }).catch(() => {})
  }

  return {
    success: true,
    question_id: questionId,
    status: 'answered',
  }
})