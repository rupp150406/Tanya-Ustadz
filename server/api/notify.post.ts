// server/api/notify.post.ts
import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'

interface NotifyPayload {
  role: 'admin_it' | 'ustadz' | 'user'
  title: string
  body: string
  fingerprint?: string // untuk role 'user'
}

async function sendFCM(token: string, title: string, body: string, serverKey: string) {
  const response = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Authorization': `key=${serverKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: token,
      notification: { title, body },
      data: { title, body },
    }),
  })
  return response.json()
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const fcmServerKey = config.fcmServerKey as string

  if (!fcmServerKey) {
    throw createError({ statusCode: 500, message: 'FCM server key tidak dikonfigurasi.' })
  }

  const payload = await readBody<NotifyPayload>(event)
  const { role, title, body, fingerprint } = payload

  const supabase = createClient(
    config.public.supabaseUrl,
    config.supabaseServiceRoleKey
  )

  let query = supabase.from('fcm_tokens').select('token')

  if (role === 'user') {
    if (!fingerprint) {
      throw createError({ statusCode: 400, message: 'Fingerprint wajib untuk notifikasi user.' })
    }
    query = query.eq('role', 'user').eq('fingerprint', fingerprint)
  } else {
    query = query.eq('role', role)
  }

  const { data: tokens, error } = await query

  if (error) {
    throw createError({ statusCode: 500, message: 'Gagal mengambil token: ' + error.message })
  }

  if (!tokens || tokens.length === 0) return { success: true, sent: 0 }

  const results = await Promise.allSettled(
    tokens.map(({ token }) => sendFCM(token, title, body, fcmServerKey))
  )

  const sent = results.filter(r => r.status === 'fulfilled').length

  return { success: true, sent, total: tokens.length }
})