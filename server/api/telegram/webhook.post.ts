import { defineEventHandler, readBody, getHeader, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'

// Telegram retries any non-200 response again and again, so after the secret check
// this handler ALWAYS answers { ok: true }, even if something inside fails.
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  const secret = getHeader(event, 'x-telegram-bot-api-secret-token')
  if (secret !== config.telegramWebhookSecret) {
    throw createError({ statusCode: 401, message: 'Unauthorized.' })
  }

  try {
    const body = await readBody(event)
    const message = body?.message
    if (!message) return { ok: true }

    const chatId = String(message.chat?.id)
    const text = String(message.text ?? '').trim()
    const botToken = config.telegramBotToken as string
    const reply = (t: string) => sendMessage(chatId, t, botToken)

    // "/start@MyBot token" → cmd = "/start", arg = "token"
    const [rawCmd = '', arg = ''] = text.split(/\s+/, 2)
    const cmd = rawCmd.split('@')[0].toLowerCase()

    const supabase = createClient(config.public.supabaseUrl, config.supabaseServiceRoleKey)

    // ── /start <token> : link this Telegram chat to the browser that made the token
    if (cmd === '/start' && arg) {
      const { data, error } = await supabase
        .from('telegram_subscriptions')
        .select('fingerprint, token_expires_at')
        .eq('temp_token', arg)
        .maybeSingle()

      if (error || !data) {
        await reply('❌ Token tidak ditemukan atau sudah kadaluarsa.\n\nSilakan klik tombol *Hubungkan* di forum lagi.')
        return { ok: true }
      }

      if (!data.token_expires_at || new Date(data.token_expires_at) < new Date()) {
        await reply('⏰ Token sudah kadaluarsa (10 menit).\n\nSilakan klik tombol *Hubungkan* di forum lagi.')
        return { ok: true }
      }

      const { error: updateError } = await supabase
        .from('telegram_subscriptions')
        .update({
          chat_id: chatId,
          temp_token: null,
          token_expires_at: null,
          connected_at: new Date().toISOString(),
        })
        .eq('fingerprint', data.fingerprint)

      if (updateError) {
        console.error('[WEBHOOK] Link update error:', updateError.message)
        await reply('⚠️ Terjadi kendala saat menghubungkan. Silakan coba lagi dari forum.')
        return { ok: true }
      }

      await reply('✅ *Browser kamu berhasil terhubung!*\n\nKamu akan menerima notifikasi di sini ketika pertanyaanmu dijawab oleh Ustadz.\n\nJazakallah khairan! 🤲')
      return { ok: true }
    }

    // ── /start without token (opened the bot directly)
    if (cmd === '/start') {
      await reply('👋 *Assalamualaikum!*\n\nUntuk menghubungkan Telegram kamu dengan forum, silakan:\n\n1. Buka forum *Tanya Ustadz*\n2. Klik tombol *"Dapatkan Notifikasi via Telegram"*\n3. Kamu akan otomatis diarahkan ke sini\n\nJangan klik START secara manual ya! 🙏')
      return { ok: true }
    }

    // One Telegram account may be linked to several browsers (phone + laptop, or a cleared
    // browser that got a new fingerprint), so these two commands never use .single().
    const findConnected = () =>
      supabase
        .from('telegram_subscriptions')
        .select('connected_at')
        .eq('chat_id', chatId)
        .not('connected_at', 'is', null)
        .order('connected_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    // ── /restart : unlink every browser tied to this chat
    if (cmd === '/restart') {
      const { data: existing } = await findConnected()

      if (!existing) {
        await reply('⚠️ Akun Telegram kamu belum terhubung ke forum.\n\nSilakan buka forum dan klik tombol *"Dapatkan Notifikasi via Telegram"* terlebih dahulu.')
        return { ok: true }
      }

      await supabase
        .from('telegram_subscriptions')
        .update({ chat_id: null, connected_at: null })
        .eq('chat_id', chatId)

      await reply('🔄 *Koneksi direset.*\n\nSilakan buka forum dan klik tombol *"Dapatkan Notifikasi via Telegram"* untuk menghubungkan ulang.')
      return { ok: true }
    }

    // ── /status
    if (cmd === '/status') {
      const { data: existing } = await findConnected()

      if (existing?.connected_at) {
        const date = new Date(existing.connected_at).toLocaleDateString('id-ID', {
          day: 'numeric', month: 'long', year: 'numeric',
        })
        await reply(`✅ *Terhubung sejak ${date}*\n\nKamu akan menerima notifikasi ketika pertanyaanmu dijawab Ustadz.\n\nKetik /restart untuk reset koneksi.`)
      } else {
        await reply('❌ *Belum terhubung.*\n\nBuka forum dan klik tombol *"Dapatkan Notifikasi via Telegram"* untuk menghubungkan.')
      }
      return { ok: true }
    }

    // ── anything else
    await reply('🤔 Perintah tidak dikenali.\n\nPerintah yang tersedia:\n/status — cek status koneksi\n/restart — reset dan hubungkan ulang')
    return { ok: true }
  } catch (err: any) {
    console.error('[WEBHOOK] Unhandled error:', err?.message ?? err)
    return { ok: true }
  }
})

async function sendMessage(chatId: string, text: string, botToken: string) {
  const send = (markdown: boolean) =>
    fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, ...(markdown ? { parse_mode: 'Markdown' } : {}) }),
    })

  try {
    let res = await send(true)
    if (res.status === 400) res = await send(false) // Markdown parse error → plain text
    // fetch() does not throw on 4xx, so log it: a wrong bot token shows up here as 401.
    if (!res.ok) console.error('[WEBHOOK] Telegram sendMessage failed:', res.status, await res.text())
  } catch (err: any) {
    console.error('[WEBHOOK] sendMessage failed:', err?.message ?? err)
  }
}