import { defineEventHandler, readBody, getHeader, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  const secret = getHeader(event, 'x-telegram-bot-api-secret-token')
  if (secret !== config.telegramWebhookSecret) {
    throw createError({ statusCode: 401, message: 'Unauthorized.' })
  }

  const body = await readBody(event)
  const message = body?.message
  if (!message) return { ok: true }

  const chatId = String(message.chat?.id)
  const text: string = message.text ?? ''

  const supabase = createClient(
    config.public.supabaseUrl,
    config.supabaseServiceRoleKey
  )

  // /start <token> — first time connect or re-connect with new fingerprint
  if (text.startsWith('/start ')) {
    const token = text.replace('/start ', '').trim()

    const { data, error } = await supabase
      .from('telegram_subscriptions')
      .select('fingerprint, token_expires_at')
      .eq('temp_token', token)
      .single()

    if (error || !data) {
      await sendMessage(chatId, '❌ Token tidak ditemukan atau sudah kadaluarsa.\n\nSilakan klik tombol *Hubungkan* di forum lagi.', config.telegramBotToken)
      return { ok: true }
    }

    if (new Date(data.token_expires_at) < new Date()) {
      await sendMessage(chatId, '⏰ Token sudah kadaluarsa (10 menit).\n\nSilakan klik tombol *Hubungkan* di forum lagi.', config.telegramBotToken)
      return { ok: true }
    }

    await supabase
      .from('telegram_subscriptions')
      .update({
        chat_id: chatId,
        temp_token: null,
        token_expires_at: null,
        connected_at: new Date().toISOString()
      })
      .eq('fingerprint', data.fingerprint)

    await sendMessage(
      chatId,
      '✅ *Browser kamu berhasil terhubung!*\n\nKamu akan menerima notifikasi di sini ketika pertanyaanmu dijawab oleh Ustadz.\n\nJazakallah khairan! 🤲',
      config.telegramBotToken
    )
    return { ok: true }
  }

  // /start tanpa token — user buka bot langsung tanpa deep link
  if (text === '/start') {
    await sendMessage(
      chatId,
      '👋 *Assalamualaikum!*\n\nUntuk menghubungkan Telegram kamu dengan forum, silakan:\n\n1. Buka forum *Tanya Ustadz*\n2. Klik tombol *"Dapatkan Notifikasi via Telegram"*\n3. Kamu akan otomatis diarahkan ke sini\n\nJangan klik START secara manual ya! 🙏',
      config.telegramBotToken
    )
    return { ok: true }
  }

  // /restart — update chat_id berdasarkan chat_id lama yang sudah tersimpan
  if (text === '/restart') {
    const { data: existing } = await supabase
      .from('telegram_subscriptions')
      .select('fingerprint')
      .eq('chat_id', chatId)
      .single()

    if (!existing) {
      await sendMessage(
        chatId,
        '⚠️ Akun Telegram kamu belum terhubung ke forum.\n\nSilakan buka forum dan klik tombol *"Dapatkan Notifikasi via Telegram"* terlebih dahulu.',
        config.telegramBotToken
      )
      return { ok: true }
    }

    // Reset connection — hapus chat_id supaya user bisa connect ulang dari forum
    await supabase
      .from('telegram_subscriptions')
      .update({
        chat_id: null,
        connected_at: null
      })
      .eq('chat_id', chatId)

    await sendMessage(
      chatId,
      '🔄 *Koneksi direset.*\n\nSilakan buka forum dan klik tombol *"Dapatkan Notifikasi via Telegram"* untuk menghubungkan ulang.',
      config.telegramBotToken
    )
    return { ok: true }
  }

  // /status — cek apakah sudah terhubung
  if (text === '/status') {
    const { data: existing } = await supabase
      .from('telegram_subscriptions')
      .select('fingerprint, connected_at')
      .eq('chat_id', chatId)
      .single()

    if (existing?.connected_at) {
      const date = new Date(existing.connected_at).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric'
      })
      await sendMessage(
        chatId,
        `✅ *Terhubung sejak ${date}*\n\nKamu akan menerima notifikasi ketika pertanyaanmu dijawab Ustadz.\n\nKetik /restart untuk reset koneksi.`,
        config.telegramBotToken
      )
    } else {
      await sendMessage(
        chatId,
        '❌ *Belum terhubung.*\n\nBuka forum dan klik tombol *"Dapatkan Notifikasi via Telegram"* untuk menghubungkan.',
        config.telegramBotToken
      )
    }
    return { ok: true }
  }

  // Default — pesan tidak dikenali
  await sendMessage(
    chatId,
    '🤔 Perintah tidak dikenali.\n\nPerintah yang tersedia:\n/status — cek status koneksi\n/restart — reset dan hubungkan ulang',
    config.telegramBotToken
  )

  return { ok: true }
})

async function sendMessage(chatId: string, text: string, botToken: string) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
  })
}