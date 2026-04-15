// ============================================================
// PROJECT: TANYA USTADZ V3
// FILE: middleware/auth.ts
// DESC: Gate 2 — verify active Supabase Google OAuth session
//       Applied to: /select-role, /dashboard/**
//       If no session → redirect to /login-gate
// ============================================================

import { defineNuxtRouteMiddleware, navigateTo } from "nuxt/app";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NUXT_PUBLIC_SUPABASE_URL!,
  process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default defineNuxtRouteMiddleware(async (to) => {
  const guardedPaths = ["/select-role", "/dashboard"];
  const isGuarded = guardedPaths.some((path) => to.path.startsWith(path));

  if (!isGuarded) return;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return navigateTo("/login-gate");
  }
});