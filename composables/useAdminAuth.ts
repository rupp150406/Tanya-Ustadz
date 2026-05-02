// ============================================================
// PROJECT: TANYA USTADZ V3
// FILE: composables/useAdminAuth.ts
// ============================================================

import type { User } from "@supabase/supabase-js";

// Definisikan type di luar agar bisa dipakai di mana saja
export type Role = "admin_it" | "ustadz" | null;

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: Role;
}

export function useAdminAuth() {
  const supabase = useSupabaseClient();

  // PINDAHKAN KE SINI: useState harus di dalam fungsi ini
  // Nuxt akan otomatis menjaga state ini tetap "singleton" berdasarkan key-nya ("admin_role", dsb)
  const _role    = useState<Role>("admin_role", () => null);
  const _profile = useState<Profile | null>("admin_profile", () => null);
  const _user    = useState<User | null>("admin_user", () => null);

  const role    = computed(() => _role.value);
  const profile = computed(() => _profile.value);
  const user    = computed(() => _user.value);
  const isAdmin  = computed(() => _role.value === "admin_it");
  const isUstadz = computed(() => _role.value === "ustadz");

  function setRole(newRole: Role) {
    _role.value = newRole;
  }

  async function fetchProfile(): Promise<void> {
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      _user.value = null;
      _profile.value = null;
      _role.value = null;
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

    // Pastikan casting type sesuai dengan DB
    _profile.value = data as Profile;
    _role.value    = data.role as Role;
  }

  async function selectRole(selectedRole: Role): Promise<void> {
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

  async function logout(): Promise<void> {
    await supabase.auth.signOut();

    // useCookie juga harus dipanggil di dalam fungsi context
    const gateCookie = useCookie("gate_access", {
      maxAge: -1,
      path: "/",
    });
    gateCookie.value = null;

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