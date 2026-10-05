import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const { fingerprint } = await readBody(event)

  if (!fingerprint) {
    throw createError({ statusCode: 400, message: 'Fingerprint wajib diisi.' })
  }

  const supabase = createClient(
    config.public.supabaseUrl,
    config.supabaseServiceRoleKey
  )

  // Cek apakah sudah connected
  const { data: existing } = await supabase
    .from('telegram_subscriptions')
    .select('chat_id')
    .eq('fingerprint', fingerprint)
    .single()

  if (existing?.chat_id) {
    return { already_connected: true }
  }

  // Generate token unik, berlaku 10 menit
  const token = randomBytes(16).toString('hex')
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  await supabase
    .from('telegram_subscriptions')
    .upsert(
      { fingerprint, temp_token: token, token_expires_at: expires, chat_id: null },
      { onConflict: 'fingerprint' }
    )

  const botUsername = config.telegramBotUsername
  const deepLink = `https://t.me/${botUsername}?start=${token}`

  return { deepLink }
})