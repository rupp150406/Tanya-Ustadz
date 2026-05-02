// ============================================================
// PROJECT: TANYA USTADZ V3
// FILE: server/api/ustadz/questions.get.ts
// DESC: Ustadz endpoint — fetch verified and answered questions
//       - Only 'ustadz' role can access
//       - Returns verified (to answer) + answered (their history)
//       - Includes answered_by profile data for answered questions
// ============================================================

import { defineEventHandler, getQuery, createError } from "h3";
import { serverSupabaseClient } from "#supabase/server";

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event);

  // --- AUTH CHECK ---
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw createError({ statusCode: 401, message: "Tidak terautentikasi." });
  }

  // --- ROLE CHECK ---
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "ustadz") {
    throw createError({
      statusCode: 403,
      message: "Akses ditolak. Hanya Ustadz yang dapat mengakses data pertanyaan.",
    });
  }

  // --- READ QUERY PARAMS ---
  const query = getQuery(event);
  const search: string = (query?.search ?? "").toString().trim();
  const statuses: string = (query?.statuses ?? "verified,answered").toString().trim();

  // --- BUILD QUERY ---
  let dbQuery = supabase
    .from("questions")
    .select(`
      *,
      answered_by_profile:profiles!questions_answered_by_fkey(
        full_name,
        avatar_url
      )
    `)
    .in("status", statuses.split(",").map(s => s.trim()).filter(Boolean));

  // --- ADD SEARCH FILTER ---
  if (search) {
    dbQuery = dbQuery.or(`question.ilike.%${search}%,category.ilike.%${search}%`);
  }

  // --- ORDER BY ---
  dbQuery = dbQuery.order("is_pinned", { ascending: false })
                .order("created_at", { ascending: false });

  // --- EXECUTE QUERY ---
  const { data, error } = await dbQuery;

  if (error) {
    console.error("[ustadz/questions] Database error:", error.message);
    throw createError({ 
      statusCode: 500, 
      message: "Gagal memuat data pertanyaan." 
    });
  }

  return data || [];
});
