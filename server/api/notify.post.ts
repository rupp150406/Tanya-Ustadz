import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { ofetch } from 'ofetch'

// Purpose: tell ONE asker (by fingerprint) that their question was answered.
// Body: { fingerprint: string, message: string, role?: 'user' }
// Staff broadcast was removed on purpose: it messaged every subscriber.

type SendResult = 'ok' | 'blocked' | 'failed'

const statusOf = (err: any): number | undefined =>
  err?.response?.status ?? err?.statusCode ?? err?.status

function postToTelegram(chatId: string, text: string, botToken: string, markdown: boolean) {
  return ofetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    body: { chat_id: chatId, text, ...(markdown ? { parse_mode: 'Markdown' } : {}) },
  })
}

async function sendTelegram(chatId: string, message: string, botToken: string): Promise<SendResult> {
  try {
    await postToTelegram(chatId, message, botToken, true)
    return 'ok'
  } catch (err: any) {
    const status = statusOf(err)
    if (status === 403) return 'blocked' // user blocked the bot / deleted the chat

    if (status === 400) {
      // Most often a Markdown parse error (stray _ * `). Retry as plain text.
      try {
        await postToTelegram(chatId, message, botToken, false)
        return 'ok'
      } catch (err2: any) {
        if (statusOf(err2) === 403) return 'blocked'
        console.error('[NOTIFY] Telegram send failed (plain retry):', err2?.message ?? err2)
        return 'failed'
      }
    }

    console.error('[NOTIFY] Telegram send failed:', err?.message ?? err)
    return 'failed'
  }
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const botToken = config.telegramBotToken as string
  if (!botToken) {
    throw createError({ statusCode: 500, message: 'Telegram bot token tidak dikonfigurasi.' })
  }

  const body: any = await readBody(event).catch(() => null)
  const fingerprint = typeof body?.fingerprint === 'string' ? body.fingerprint.trim() : ''
  const message = typeof body?.message === 'string' ? body.message.trim().slice(0, 4000) : ''

  // Old callers may still send role: 'admin_it' | 'ustadz'. Ignore instead of broadcasting.
  if (body?.role && body.role !== 'user') {
    return { success: true, sent: 0, reason: 'staff notifications are disabled' }
  }

  if (!fingerprint || !message) {
    throw createError({ statusCode: 400, message: 'Fingerprint dan pesan wajib diisi.' })
  }

  const supabase = createClient(config.public.supabaseUrl, config.supabaseServiceRoleKey)

  const { data, error } = await supabase
    .from('telegram_subscriptions')
    .select('chat_id')
    .eq('fingerprint', fingerprint)
    .maybeSingle()

  if (error) {
    console.error('[NOTIFY] Lookup error:', error.message)
    throw createError({ statusCode: 500, message: 'Gagal membaca data langganan.' })
  }

  if (!data?.chat_id) return { success: true, sent: 0, reason: 'not connected' }

  const result = await sendTelegram(data.chat_id, message, botToken)

  if (result === 'blocked') {
    // Dead chat: unlink it so the user can connect again from the forum.
    await supabase
      .from('telegram_subscriptions')
      .update({ chat_id: null, connected_at: null })
      .eq('chat_id', data.chat_id)
    return { success: true, sent: 0, reason: 'blocked' }
  }

  return result === 'ok'
    ? { success: true, sent: 1 }
    : { success: true, sent: 0, reason: 'telegram error' }
})