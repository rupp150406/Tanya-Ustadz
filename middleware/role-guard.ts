// ============================================================
// PROJECT: TANYA USTADZ V3
// FILE: middleware/role-guard.ts
// DESC: Gate 3 — verify profiles.role is NOT null
//       Applied to: /dashboard/**
//       If role is null → redirect to /select-role
// ============================================================

export default defineNuxtRouteMiddleware(async (to) => {
  const isDashboard = to.path.startsWith("/dashboard");
  if (!isDashboard) return;

  const supabase   = useSupabaseClient();
  const adminAuth  = useAdminAuth(); // composable defined in composables/useAdminAuth.ts

  // Use cached role if already loaded in composable state
  if (adminAuth.role.value !== null) return;

  // Fetch role from DB
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return navigateTo("/login-gate");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role === null) {
    return navigateTo("/select-role");
  }

  // Hydrate composable state so downstream pages don't re-fetch
  adminAuth.setRole(profile.role as "admin" | "ustadz");
});