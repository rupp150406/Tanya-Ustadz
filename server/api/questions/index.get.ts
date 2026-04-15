// ============================================================
// GET /api/questions
// Query: tab = all | answered | trending
// ============================================================

import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query = getQuery(event)

  const tab = query.tab || 'answered'

  const supabase = createClient(
    config.supabaseUrl, // server pakai SERVICE ROLE
    config.supabaseServiceRoleKey
  )

  let db = supabase
    .from('questions')
    .select('*')

  // =============================
  // FILTER TAB
  // =============================
  if (tab === 'answered') {
    db = db.eq('status', 'answered')
  } else if (tab === 'all') {
    db = db.in('status', ['pending', 'verified', 'answered'])
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
