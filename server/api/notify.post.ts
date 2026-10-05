import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { ofetch } from 'ofetch'

interface NotifyPayload {
  role: 'admin_it' | 'ustadz' | 'user'
  message: string
  fingerprint?: string
}

async function sendTelegram(chatId: string, message: string, botToken: string) {
  try {
    const res = await ofetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      body: { chat_id: chatId, text: message, parse_mode: 'Markdown' }
    })
    console.log('[NOTIFY] Telegram response:', JSON.stringify(res))
    return res
  } catch (err: any) {
    console.error('[NOTIFY] Telegram send error:', err?.message ?? err)
    return null
  }
}

export default defineEventHandler(async (event) => {
  console.log('[NOTIFY] Handler hit')

  const config = useRuntimeConfig()
  const botToken = config.telegramBotToken as string

  console.log('[NOTIFY] Bot token exists:', !!botToken)

  if (!botToken) {
    throw createError({ statusCode: 500, message: 'Telegram bot token tidak dikonfigurasi.' })
  }

  const payload = await readBody<NotifyPayload>(event)
  console.log('[NOTIFY] Payload:', JSON.stringify(payload))

  const { role, message, fingerprint } = payload

  const supabase = createClient(
    config.public.supabaseUrl,
    config.supabaseServiceRoleKey
  )

  if (role === 'user') {
    if (!fingerprint) {
      throw createError({ statusCode: 400, message: 'Fingerprint wajib untuk notifikasi user.' })
    }

    console.log('[NOTIFY] Looking up fingerprint:', fingerprint)

    const { data, error } = await supabase
      .from('telegram_subscriptions')
      .select('chat_id')
      .eq('fingerprint', fingerprint)
      .single()

    console.log('[NOTIFY] Lookup result:', JSON.stringify(data), error?.message)

    if (!data?.chat_id) {
      console.log('[NOTIFY] No chat_id found, skipping')
      return { success: true, sent: 0 }
    }

    await sendTelegram(data.chat_id, message, botToken)
    return { success: true, sent: 1 }

  } else {
    console.log('[NOTIFY] Staff broadcast')

    const { data: rows, error } = await supabase
      .from('telegram_subscriptions')
      .select('chat_id')
      .not('chat_id', 'is', null)

    console.log('[NOTIFY] Rows found:', rows?.length, error?.message)

    if (!rows || rows.length === 0) return { success: true, sent: 0 }

    const results = await Promise.allSettled(
      rows.map(row => sendTelegram(row.chat_id!, message, botToken))
    )

    const sent = results.filter(r => r.status === 'fulfilled').length
    console.log('[NOTIFY] Sent:', sent, '/', rows.length)
    return { success: true, sent, total: rows.length }
  }
})