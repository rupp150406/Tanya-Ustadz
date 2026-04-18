// ============================================================
// GET /api/questions
// Query: tab = all | answered | trending
// ============================================================

import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query = getQuery(event)

  // FIX BUG #5: Pastikan clientFingerprint bertipe string atau undefined.
  // Jika kosong/undefined, jangan ikutkan dalam filter fingerprint agar
  // query Supabase tidak menghasilkan syntax error.
  const clientFingerprint = typeof query.fingerprint === 'string' && query.fingerprint.trim()
    ? query.fingerprint.trim()
    : null

  const tab = query.tab || 'answered'

  // FIX BUG #4: Gunakan config.public.supabaseUrl (bukan config.supabaseUrl)
  // agar URL bisa dibaca dengan benar di sisi server Nuxt.
  const supabase = createClient(
    config.public.supabaseUrl,
    config.supabaseServiceRoleKey
  )

  let db = supabase.from('questions').select('*');

  // =============================
  // FILTER TAB
  // =============================
  if (tab === 'all') {
    if (clientFingerprint) {
      // FIX BUG #5: Hanya tambahkan filter fingerprint jika nilainya valid.
      // Logika OR: Tampilkan yang (verified/answered) ATAU (pending milik sendiri).
      db = db.or(`status.in.(verified,answered),and(status.eq.pending,fingerprint.eq.${clientFingerprint})`);
    } else {
      // Jika tidak ada fingerprint (guest murni), hanya tampilkan yang publik.
      db = db.in('status', ['verified', 'answered']);
    }
  } else if (tab === 'answered') {
    db = db.eq('status', 'answered');
  } else if (tab === 'trending') {
    // Trending: semua yang publik, diurutkan oleh upvotes
    db = db.in('status', ['verified', 'answered']);
  }

  // =============================
  // SORTING
  // =============================
  if (tab === 'trending') {
    db = db.order('upvotes', { ascending: false })
  } else {
    db = db.order('created_at', { ascending: false })
  }

  const { data, error } = await db

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message
    })
  }

  return data
})