// ============================================================
// PROJECT: TANYA USTADZ V3
// FILE: middleware/gate-guard.ts
// DESC: Gate 1 — verify gate_access cookie is set
//       Applied to: /login-gate, /select-role, /dashboard/**
//       If cookie missing → redirect to /password-page
// ============================================================

export default defineNuxtRouteMiddleware((to) => {
  // 1. DAFTAR HALAMAN YANG DILINDUNGI (EXCLUDE /password-page to prevent loops)
  const guardedPaths = ["/login-gate", "/select-role", "/dashboard"];
  
  // 2. CEK APAKAH HALAMAN SEKARANG PERLU DILINDUNGI
  const isGuarded = guardedPaths.some((path) => to.path.startsWith(path));

  // 3. DEBUG: Log current state
  console.log('[MIDDLEWARE] Path:', to.path, 'Cookie:', useCookie("gate_access").value);

  // 4. JIKA HALAMAN TIDAK PERLU DILINDUNGI, LEWATKAN SAJA
  if (!isGuarded) return;

  // 5. JIKA HALAMAN DILINDUNGI, BARU CEK COOKIE
  const gateAccess = useCookie("gate_access");

  if (gateAccess.value !== "true") {
    // Arahkan ke halaman login/password
    return navigateTo("/password-page");
  }
});