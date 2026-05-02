// ============================================================
// PROJECT: TANYA USTADZ V3
// FILE: middleware/auth.ts
// DESC: Gate 2 — verify active Supabase Google OAuth session
//       Applied to: /select-role, /dashboard/**
//       If no session → redirect to /login-gate
// ============================================================

import { defineNuxtRouteMiddleware, navigateTo } from "#app";

export default defineNuxtRouteMiddleware(async (to) => {
  // Gunakan composable bawaan, jangan inisialisasi ulang
  const client = useSupabaseClient();
  const user = useSupabaseUser();

  const guardedPaths = ["/select-role", "/dashboard", "/admin"];
  const isGuarded = guardedPaths.some((path) => to.path.startsWith(path));

  if (!isGuarded) return;

  // Cek user session dari composable yang sudah ada
  if (!user.value) {
    return navigateTo("/login-gate");
  }
});