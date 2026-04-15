// @ts-nocheck - Deno environment types not available in main project
// ============================================================
// PROJECT: TANYA USTADZ V3
// FILE: supabase/functions/auto-delete-questions/index.ts
// DESC: Edge Function — daily cron to delete expired questions
// TRIGGER: Supabase Cron Job @ "0 0 * * *" (every day 00:00 UTC)
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"; 

// These are injected automatically by Supabase runtime
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request) => {
  // Security: Only allow invocation from Supabase internal cron
  // (service role key is verified automatically by the runtime)
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || authHeader !== `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // Initialize Supabase client with service role (bypasses RLS)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  try {
    // Calculate cutoff: 30 days ago
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    const cutoffISO = cutoffDate.toISOString();

    // Delete only:
    // - NOT pinned
    // - older than 30 days
    // is_pinned = true is FULLY EXEMPT — enforced here
    const { data, error, count } = await supabase
      .from("questions")
      .delete({ count: "exact" })
      .eq("is_pinned", false)
      .lt("created_at", cutoffISO);

    if (error) {
      console.error("[AUTO-DELETE] Supabase error:", error.message);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`[AUTO-DELETE] Deleted ${count ?? 0} expired questions (before ${cutoffISO})`);

    return new Response(
      JSON.stringify({
        success: true,
        deleted_count: count ?? 0,
        cutoff_date: cutoffISO,
        ran_at: new Date().toISOString(),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[AUTO-DELETE] Unexpected error:", message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});