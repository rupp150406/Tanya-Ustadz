// server/api/admin/moderate.post.ts
import { defineEventHandler, readBody, createError } from 'h3'
import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)

  const body = await readBody(event)
  const questionId = body.questionId || body.question_id
  const action = body.action

  const { data, error: updateError } = await supabase
    .from('questions')
    .update({ status: action })
    .eq('id', questionId)
    .eq('status', 'pending')
    .select()

  if (updateError) {
    throw createError({
      statusCode: 500,
      message: 'Database Error: ' + updateError.message
    })
  }

  if (!data || data.length === 0) {
    throw createError({
      statusCode: 404,
      message: 'Gagal: Data tidak ditemukan atau antum tidak punya akses.'
    })
  }

  // Notify ustadz hanya kalau pertanyaan di-approve (bukan rejected)
  if (action === 'verified') {
    await $fetch('/api/notify', {
      method: 'POST',
      body: {
        role: 'ustadz',
        title: 'Pertanyaan Baru Siap Dijawab',
        body: 'Ada pertanyaan yang telah diverifikasi dan menunggu jawaban antum.',
      }
    }).catch(() => {}) // non-blocking, jangan gagalkan request utama
  }

  return { success: true, message: `Status berhasil diubah ke ${action}` }
})