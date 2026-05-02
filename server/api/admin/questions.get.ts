import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  try {
    // Get query parameters
    const query = getQuery(event)
    
    // Security check - ensure user is authenticated
    const supabase = await serverSupabaseClient(event)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - Please login to access this endpoint'
      })
    }

    // Check user role from user metadata or profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin_it', 'ustadz'].includes((profile as any).role)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden - Insufficient permissions'
      })
    }

    // Build Supabase query
    let supabaseQuery = supabase
      .from('questions')
      .select(`
        *,
        answered_by_profile:profiles!questions_answered_by_fkey(
          full_name,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false })

    // Apply status filter if provided
    if (query.statuses && typeof query.statuses === 'string') {
      const statuses = query.statuses.split(',').map(s => s.trim())
      supabaseQuery = supabaseQuery.in('status', statuses)
    }

    // Apply search filter if provided
    if (query.search && typeof query.search === 'string') {
      supabaseQuery = supabaseQuery.ilike('question', `%${query.search}%`)
    }

    // Execute query
    const { data, error } = await supabaseQuery

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Database error: ' + error.message
      })
    }

    return data || []
  } catch (error: any) {
    // If this is already an H3Error (a createError() we threw intentionally
    // above — 401, 403, or 500 DB error), re-throw it unchanged so the correct
    // status code reaches the client.
    //
    // The original code wrapped EVERY error in a new createError({ statusCode: 500 }),
    // which silently converted our deliberate 401/403 into generic 500s. That made
    // auth failures and permission errors invisible to the frontend — the dashboard
    // received a 500 instead of a clear 401/403, fetchForAdmin() set error.value,
    // and questions.value stayed empty with no useful diagnostic.
    if (error.statusCode) throw error

    // Only truly unexpected errors reach here.
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Internal server error'
    })
  }
})