// ============================================================
// PROJECT: TANYA USTADZ V3
// FILE: composables/useAdminAuth.ts
// DESC: State management for admin/ustadz session & role
//       - Reactive role + profile state (shared across dashboard)
//       - Role persisted in memory (not localStorage — SSR safe)
//       - Logout clears all state and cookies
// ============================================================

import type { User } from "@supabase/supabase-js";

type Role = "admin" | "ustadz" | null;

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: Role;
}

// Shared reactive state (singleton pattern via useState)
const _role    = useState<Role>("admin_role", () => null);
const _profile = useState<Profile | null>("admin_profile", () => null);
const _user    = useState<User | null>("admin_user", () => null);

export function useAdminAuth() {
  const supabase = useSupabaseClient();

  const role    = computed(() => _role.value);
  const profile = computed(() => _profile.value);
  const user    = computed(() => _user.value);
  const isAdmin  = computed(() => _role.value === "admin");
  const isUstadz = computed(() => _role.value === "ustadz");

  function setRole(newRole: "admin" | "ustadz") {
    _role.value = newRole;
  }

  /**
   * Fetch full profile + role from Supabase.
   * Call this once after login or on dashboard mount.
   */
  async function fetchProfile(): Promise<void> {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      _user.value    = null;
      _profile.value = null;
      _role.value    = null;
      return;
    }

    _user.value = authUser;

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url, role")
      .eq("id", authUser.id)
      .single();

    if (error || !data) {
      console.error("[useAdminAuth] fetchProfile error:", error?.message);
      return;
    }

    _profile.value = data as Profile;
    _role.value    = data.role as Role;
  }

  /**
   * Submit role selection (first-time only).
   * Calls server API → updates profiles.role in DB.
   */
  async function selectRole(selectedRole: "admin" | "ustadz"): Promise<void> {
    const { error } = await useFetch("/api/profile/select-role", {
      method: "POST",
      body: { role: selectedRole },
    });

    if (error.value) {
      throw new Error(error.value.data?.message ?? "Gagal memilih role.");
    }

    _role.value = selectedRole;
    if (_profile.value) {
      _profile.value.role = selectedRole;
    }
  }

  /**
   * Full logout: clear Supabase session + gate cookie + local state.
   */
  async function logout(): Promise<void> {
    await supabase.auth.signOut();

    // Clear gate cookie (set to expired)
    const gateCookie = useCookie("gate_access", {
      maxAge: -1,
      path: "/",
    });
    gateCookie.value = null;

    // Clear shared state
    _user.value    = null;
    _profile.value = null;
    _role.value    = null;

    await navigateTo("/password-page");
  }

  return {
    role,
    profile,
    user,
    isAdmin,
    isUstadz,
    setRole,
    fetchProfile,
    selectRole,
    logout,
  };
}