<script setup>
// ─────────────────────────────────────────────────────────────
// pages/select-role.vue
// ─────────────────────────────────────────────────────────────
//
// Halaman pemilihan peran yang muncul setelah user login.
// User memilih antara 'ustadz' atau 'admin_it', lalu diarahkan
// ke dashboard yang sesuai.
//
// STATE:
//   - profile (useState) → dibaca dari global state app.vue
//   - selectedRole (ref) → pilihan user di halaman ini
//
// GUARD:
//   Jika tidak ada sesi aktif saat onMounted, redirect ke login.
//   Menggunakan supabase.auth.getSession() (bukan useSupabaseUser)
//   karena reactive ref bisa belum terisi saat mount — pelajaran
//   yang sama dari fix profile fetching sebelumnya.

const supabase = useSupabaseClient()
const router   = useRouter()

// ── Admin Auth composable — integrates with middleware ─────────
const adminAuth = useAdminAuth()

// ── Local state ───────────────────────────────────────────────
const selectedRole = ref('')   // 'ustadz' | 'admin_it' | ''
const isNavigating = ref(false)

// ── Guard: pastikan sesi ada sebelum halaman dirender ─────────
onMounted(async () => {
  // Fetch profile using adminAuth to sync with middleware
  await adminAuth.fetchProfile()

  // Check if user exists
  if (!adminAuth.user.value) {
    console.log('Select Role: No user found, redirecting to login-gate')
    await navigateTo('/login-gate')
    return
  }

  // If user already has a valid role, redirect directly to appropriate dashboard
  const userRole = adminAuth.role.value?.toLowerCase()
  if (userRole === 'admin_it') {
    console.log('Select Role: User already has admin_it role, redirecting to admin dashboard')
    await navigateTo('/admin/dashboard')
    return
  } else if (userRole === 'ustadz') {
    console.log('Select Role: User already has ustadz role, redirecting to ustadz dashboard')
    await navigateTo('/ustadz/dashboard')
    return
  }

  console.log('Select Role: User has no role, showing role selection')
})

// ── Submit handler ────────────────────────────────────────────
async function handleConfirm() {
  if (!selectedRole.value || isNavigating.value) return

  isNavigating.value = true

  try {
    // Use adminAuth.selectRole to update role and sync with middleware
    await adminAuth.selectRole(selectedRole.value)

    console.log('Select Role: Role updated successfully, navigating to dashboard')

    // Navigate based on selected role
    if (selectedRole.value === 'admin_it') {
      await navigateTo('/admin/dashboard')
    } else if (selectedRole.value === 'ustadz') {
      await navigateTo('/ustadz/dashboard')
    }
  } catch (error) {
    console.error('Select Role: Error in handleConfirm:', error)
    // Show error to user
    alert('Gagal memilih peran: ' + (error instanceof Error ? error.message : 'Terjadi kesalahan'))
  } finally {
    isNavigating.value = false
  }
}

// ── Header ────────────────────────────────────────────
// ... (rest of the code remains the same)

</script>

<template>
  <div class="bg-background text-on-background font-body min-h-screen flex flex-col">

    <!-- ── Header ──────────────────────────────────────────── -->
    <header class="bg-surface/70 backdrop-blur-md sticky top-0 z-50 shadow-sm bg-gradient-to-b from-slate-100/10 to-transparent">
      <div class="flex justify-between items-center w-full px-6 py-3 max-w-screen-2xl mx-auto">
        <div class="flex items-center gap-4">
          <NuxtLink
            to="/"
            class="text-2xl font-bold tracking-tighter text-emerald-800 font-headline"
          >
            Tanya Ustadz
          </NuxtLink>
        </div>

        <!-- Tampilkan greeting singkat jika profile sudah tersedia -->
        <div v-if="adminAuth.profile?.full_name" class="text-sm text-on-surface-variant font-medium">
          Halo, <span class="font-bold text-on-surface">{{ adminAuth.profile.full_name }}</span>
        </div>
      </div>
    </header>

    <!-- ── Main Content ────────────────────────────────────── -->
    <main class="flex-grow flex items-center justify-center p-6 lg:p-12">
      <div class="max-w-4xl w-full">

        <!-- Headline -->
        <div class="text-center mb-12">
          <h1 class="font-headline text-4xl lg:text-5xl font-extrabold text-on-surface tracking-tight mb-4">
            Masuk Sebagai Apa?
          </h1>
          <p class="text-on-surface-variant text-lg max-w-lg mx-auto">
            Silakan pilih peran antum untuk melanjutkan ke dashboard yang sesuai dengan wewenang Anda.
          </p>
        </div>

        <!-- Role Selection -->
        <!-- 
          Konversi dari HTML:
          HTML menggunakan <input type="radio"> + CSS :checked sibling selector.
          Di Vue, kita ganti dengan v-model pada <input> tersembunyi, lalu
          drive visual state melalui :class binding berdasarkan selectedRole.
          Efek CSS asli (.role-card-radio:checked + .role-card-ui) dipertahankan
          di <style scoped> untuk mendukung tab/keyboard navigation native,
          sementara :class binding menambahkan state yang sama via Vue reactivity.
        -->
        <form class="space-y-12" @submit.prevent="handleConfirm">

          <!-- Bento Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

            <!-- Card 1: Ustadz -->
            <label class="relative group cursor-pointer">
              <input
                v-model="selectedRole"
                class="role-card-radio hidden"
                name="role_selection"
                type="radio"
                value="ustadz"
                required
              />
              <div
                class="role-card-ui h-full bg-surface-container-lowest p-8 rounded-[2rem] transition-all duration-300 flex flex-col items-start gap-6 border-2 border-transparent"
                :class="{ 'card-selected': selectedRole === 'ustadz' }"
              >
                <!-- Icon -->
                <div
                  class="icon-wrapper w-14 h-14 rounded-2xl bg-surface-container-high flex items-center justify-center transition-colors duration-300"
                  :class="{ 'icon-selected': selectedRole === 'ustadz' }"
                >
                  <span class="material-symbols-outlined text-3xl">verified_user</span>
                </div>

                <!-- Text -->
                <div class="space-y-2">
                  <h3 class="font-headline text-2xl font-bold text-on-surface">Ustadz</h3>
                  <p class="text-on-surface-variant leading-relaxed">
                    Menjawab pertanyaan dan memberikan edukasi hukum Islam.
                  </p>
                </div>

                <!-- CTA hint — visible on hover OR selected -->
                <div
                  class="mt-auto pt-4 flex items-center gap-2 text-primary font-semibold transition-opacity duration-200"
                  :class="selectedRole === 'ustadz' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'"
                >
                  <span>Pilih Peran</span>
                  <span class="material-symbols-outlined text-sm">arrow_forward</span>
                </div>
              </div>
            </label>

            <!-- Card 2: Admin IT -->
            <!-- Catatan: value di HTML asli adalah 'admin', disesuaikan ke 'admin_it' -->
            <label class="relative group cursor-pointer">
              <input
                v-model="selectedRole"
                class="role-card-radio hidden"
                name="role_selection"
                type="radio"
                value="admin_it"
              />
              <div
                class="role-card-ui h-full bg-surface-container-lowest p-8 rounded-[2rem] transition-all duration-300 flex flex-col items-start gap-6 border-2 border-transparent"
                :class="{ 'card-selected': selectedRole === 'admin_it' }"
              >
                <!-- Icon -->
                <div
                  class="icon-wrapper w-14 h-14 rounded-2xl bg-surface-container-high flex items-center justify-center transition-colors duration-300"
                  :class="{ 'icon-selected': selectedRole === 'admin_it' }"
                >
                  <span class="material-symbols-outlined text-3xl">settings</span>
                </div>

                <!-- Text -->
                <div class="space-y-2">
                  <h3 class="font-headline text-2xl font-bold text-on-surface">Admin IT</h3>
                  <p class="text-on-surface-variant leading-relaxed">
                    Mengelola sistem, kategori, dan validasi pertanyaan masuk.
                  </p>
                </div>

                <!-- CTA hint -->
                <div
                  class="mt-auto pt-4 flex items-center gap-2 text-primary font-semibold transition-opacity duration-200"
                  :class="selectedRole === 'admin_it' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'"
                >
                  <span>Pilih Peran</span>
                  <span class="material-symbols-outlined text-sm">arrow_forward</span>
                </div>
              </div>
            </label>

          </div>
          <!-- /Bento Grid -->

          <!-- Footer Action -->
          <div class="flex flex-col items-center gap-6">
            <button
              type="submit"
              :disabled="!selectedRole || isNavigating"
              class="group relative px-12 py-4 rounded-full font-headline font-bold text-lg text-white bg-gradient-to-br from-primary to-primary-container shadow-primary-md hover:shadow-primary-lg transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              <span v-if="!isNavigating">Konfirmasi Peran</span>
              <span v-else class="flex items-center gap-2">
                <span class="material-symbols-outlined text-base animate-spin">sync</span>
                Mengarahkan...
              </span>
            </button>

            <p class="text-on-surface-variant text-sm font-label uppercase tracking-widest flex items-center gap-2">
              <span class="material-symbols-outlined text-lg">lock</span>
              Akses Terenkripsi &amp; Aman
            </p>
          </div>

        </form>
      </div>
    </main>

    <!-- ── Background Decoration ──────────────────────────── -->
    <div class="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div class="absolute -top-24 -right-24 w-96 h-96 bg-primary-fixed/20 blur-[120px] rounded-full"></div>
      <div class="absolute -bottom-24 -left-24 w-96 h-96 bg-secondary-fixed/20 blur-[120px] rounded-full"></div>
    </div>

    <!-- Bottom spacer mobile -->
    <footer class="md:hidden h-24"></footer>

  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');

/* ── Material Symbols ─────────────────────────────────────── */
.material-symbols-outlined {
  font-family: 'Material Symbols Outlined';
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
  font-weight: normal;
  font-style: normal;
  font-size: 24px;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  display: inline-block;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  -webkit-font-smoothing: antialiased;
}

/* ── Font families ────────────────────────────────────────── */
.font-headline { font-family: 'Manrope', sans-serif; }
.font-body     { font-family: 'Plus Jakarta Sans', sans-serif; }
.font-label    { font-family: 'Plus Jakarta Sans', sans-serif; }

/*
  ── Catatan warna ────────────────────────────────────────────
  Semua token warna (primary, surface, on-surface, dst.) kini
  sepenuhnya dikelola melalui tailwind.config.js.
  Tidak ada lagi CSS custom properties manual di sini.
  ─────────────────────────────────────────────────────────────
*/

/* ── Card selected state ─────────────────────────────────── */
/*
  Dua pendekatan dipakai bersamaan untuk maksimum kompatibilitas:
  1. CSS sibling selector (:checked + .role-card-ui) — untuk
     keyboard navigation dan browser native behavior.
  2. Vue :class binding (.card-selected) — untuk reactivity Vue
     saat v-model berubah.
  Keduanya menghasilkan visual yang identik.
  Nilai warna diambil dari token yang sama dengan tailwind.config.js.
*/
.role-card-radio:checked + .role-card-ui,
.card-selected {
  background-color: #f5fff7; /* on-primary-container */
  box-shadow: 0 0 0 2px #006948, 0px 12px 32px rgba(20, 28, 43, 0.08); /* primary */
  transform: scale(1.02);
}

/* Icon saat card dipilih */
.role-card-radio:checked + .role-card-ui .icon-wrapper,
.icon-selected {
  background-color: #006948 !important; /* primary — override bg-surface-container-high */
  color: #ffffff;
}

/* Pastikan icon text inherit color dari icon-wrapper saat selected */
.icon-selected .material-symbols-outlined {
  color: #ffffff;
}
</style>