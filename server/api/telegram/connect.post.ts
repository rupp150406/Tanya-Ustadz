import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'

// Body: { fingerprint: string }
// Returns { already_connected: true } or { deepLink }
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  const body: any = await readBody(event).catch(() => null)
  const fingerprint = typeof body?.fingerprint === 'string' ? body.fingerprint.trim() : ''

  if (!fingerprint || fingerprint.length > 128) {
    throw createError({ statusCode: 400, message: 'Fingerprint wajib diisi.' })
  }

  const botUsername = config.telegramBotUsername as string
  if (!botUsername) {
    throw createError({ statusCode: 500, message: 'Username bot Telegram tidak dikonfigurasi.' })
  }

  const supabase = createClient(config.public.supabaseUrl, config.supabaseServiceRoleKey)

  // Already connected?
  const { data: existing, error: lookupError } = await supabase
    .from('telegram_subscriptions')
    .select('chat_id')
    .eq('fingerprint', fingerprint)
    .maybeSingle()

  if (lookupError) {
    console.error('[CONNECT] Lookup error:', lookupError.message)
    throw createError({ statusCode: 500, message: 'Gagal memeriksa koneksi.' })
  }

  if (existing?.chat_id) return { already_connected: true }

  // One-time token, valid 10 minutes
  const token = randomBytes(16).toString('hex')
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  const { error: upsertError } = await supabase
    .from('telegram_subscriptions')
    .upsert(
      { fingerprint, temp_token: token, token_expires_at: expires, chat_id: null },
      { onConflict: 'fingerprint' }
    )

  if (upsertError) {
    console.error('[CONNECT] Upsert error:', upsertError.message)
    throw createError({ statusCode: 500, message: 'Gagal membuat tautan Telegram.' })
  }

  return { deepLink: `https://t.me/${botUsername}?start=${token}` }
})