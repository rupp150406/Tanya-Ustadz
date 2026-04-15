// ============================================================
// PROJECT: TANYA USTADZ V3
// FILE: middleware/gate-guard.ts
// DESC: Gate 1 — verify gate_access cookie is set
//       Applied to: /password-page, /login-gate, /select-role,
//                   /dashboard/**
//       If cookie missing → redirect to /password-page
// ============================================================

export default defineNuxtRouteMiddleware((to) => {
  // Only guard admin-area routes
  const guardedPaths = ["/login-gate", "/select-role", "/dashboard"];
  const isGuarded = guardedPaths.some((path) => to.path.startsWith(path));

  if (!isGuarded) return;

  // Read cookie (works SSR + CSR)
  const gateAccess = useCookie("gate_access");

  if (gateAccess.value !== "true") {
    return navigateTo("/password-page");
  }
});