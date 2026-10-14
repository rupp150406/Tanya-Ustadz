import { defineEventHandler, getQuery } from 'h3'
import { createClient } from '@supabase/supabase-js'

// GET /api/telegram/status?fingerprint=...  →  { connected: boolean }
// Lets the browser check its link status without reading the table directly.
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const raw = getQuery(event).fingerprint
  const fingerprint = typeof raw === 'string' ? raw.trim() : ''

  if (!fingerprint || fingerprint.length > 128) return { connected: false }

  const supabase = createClient(config.public.supabaseUrl, config.supabaseServiceRoleKey)

  const { data, error } = await supabase
    .from('telegram_subscriptions')
    .select('chat_id')
    .eq('fingerprint', fingerprint)
    .maybeSingle()

  if (error) console.error('[TELEGRAM STATUS] Lookup error:', error.message)

  return { connected: !!data?.chat_id }
})