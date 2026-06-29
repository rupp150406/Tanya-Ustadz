<script setup lang="ts">
import UiThemeToggle from '~/components/ui/ThemeToggle.vue'
import { useTheme } from '~/composables/useTheme'
import { useAdminAuth } from '~/composables/useAdminAuth'
import { useAvatar } from '~/composables/useAvatar'
import { useQuestions } from '~/composables/useQuestions'
// ── Theme ─────────────────────────────────────────────────────
const { initTheme } = useTheme()

// ── Route ─────────────────────────────────────────────────────
const route = useRoute()
const ustadzId = route.params.id as string

// ── Fetch Ustadz Profile ──────────────────────────────────────
const { data: ustadzProfile, pending: ustadzProfilePending, error: ustadzProfileError } = await useAsyncData(
  `ustadz-profile-${ustadzId}`,
  async () => {
    if (!ustadzId) {
      throw new Error('Ustadz ID is missing.')
    }
    const supabase = useSupabaseClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, role')
      .eq('id', ustadzId)
      .single()

    if (error) {
      console.error('[ustadz.vue] Error fetching ustadz profile:', error.message)
      throw error
    }
    return data as Profile
  }
)

onMounted(() => {
  initTheme()
})



// ── PROFILE — READ-ONLY CONSUMER ──────────────────────────────
const profile = useState('user-profile')

// Get avatar display state for the current user
const userAvatar = computed(() => 
  getAvatarDisplayState(profile.value)
)

// Get avatar display state for the ustadz profile page
const ustadzProfileAvatar = computed(() => 
  getAvatarDisplayState(ustadzProfile.value)
)

// Preload avatars when data is available
watch(() => profile.value?.avatar_url, async (avatarUrl) => {
  if (avatarUrl) {
    await preloadAvatar(avatarUrl)
  }
}, { immediate: true })

watch(() => ustadzProfile.value?.avatar_url, async (avatarUrl) => {
  if (avatarUrl) {
    await preloadAvatar(avatarUrl)
  }
}, { immediate: true })

// Dashboard navigation
const dashboardRoute = computed(() => {
  const role = profile.value?.role?.toLowerCase()
  if (role === 'admin_it') return '/admin/dashboard'
  if (role === 'ustadz')   return '/ustadz/dashboard'
  return null
})

const handleAvatarClick = () => { if (dashboardRoute.value) navigateTo(dashboardRoute.value) }
</script>

<template>
  <!-- ── Top Navigation ──────────────────────────────────────── -->
  <header class="header-bar sticky top-0 z-50 shadow-sm border-b border-transparent dark:border-zinc-800/60">
    <div class="flex justify-between items-center w-full px-6 py-3 max-w-screen-2xl mx-auto">

      <!-- Brand -->
      <div class="flex items-center gap-4">
        <NuxtLink
          to="/"
          class="text-2xl font-bold tracking-tighter font-headline
                 text-primary dark:text-primary-fixed"
        >
          Tanya Ustadz
        </NuxtLink>
      </div>

      <!-- Right Side Actions -->
      <div class="flex items-center gap-3">
        <UiThemeToggle />

        <!-- Avatar Dropdown -->
        <div v-if="userAvatar.showAvatar" class="relative group/avatar">
          <button
            @click="handleAvatarClick"
            class="relative flex items-center justify-center w-11 h-11 rounded-full overflow-hidden
                   border-2 border-primary/30 dark:border-primary-fixed/30
                   shadow-md hover:ring-2 hover:ring-primary dark:hover:ring-primary-fixed
                   hover:scale-105 transition-all duration-300 cursor-pointer
                   bg-primary dark:bg-zinc-800"
            :title="`${profile.full_name} (${profile.role})`"
          >
            <img
              v-if="userAvatar.showImage"
              :src="userAvatar.avatarUrl"
              :alt="profile.full_name"
              class="w-full h-full object-cover"
              referrerpolicy="no-referrer"
              @error="(e) => handleAvatarError(e, userAvatar.avatarUrl)"
            />
            <span v-else class="font-bold text-base select-none text-on-primary dark:text-primary-fixed">
              {{ userAvatar.initial }}
            </span>
          </button>

          <!-- Tooltip Dropdown -->
          <div class="absolute right-0 top-full mt-3 w-56 rounded-2xl shadow-xl p-4
                      opacity-0 invisible group-hover/avatar:opacity-100 group-hover/avatar:visible
                      transition-all duration-200 z-50
                      bg-surface-container-lowest dark:bg-zinc-900
                      border border-surface-container-low dark:border-zinc-700/60">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0
                          bg-primary dark:bg-zinc-700">
                <img
                  v-if="userAvatar.showImage"
                  :src="userAvatar.avatarUrl"
                  :alt="profile.full_name"
                  class="w-full h-full object-cover"
                  referrerpolicy="no-referrer"
                  @error="(e) => handleAvatarError(e, userAvatar.avatarUrl)"
                />
                <span v-else class="font-bold text-sm select-none text-on-primary dark:text-primary-fixed">
                  {{ userAvatar.initial }}
                </span>
              </div>
              <div class="min-w-0">
                <p class="text-sm font-bold truncate text-primary dark:text-primary-fixed">
                  {{ profile.full_name }}
                </p>
                <p class="text-xs capitalize text-outline dark:text-zinc-500">
                  {{ profile.role?.replace('_', ' ') }}
                </p>
              </div>
            </div>
            <div class="border-t pt-3 border-surface-container-low dark:border-zinc-700/60">
              <button
                @click="handleAvatarClick"
                class="w-full text-left text-xs font-semibold flex items-center justify-between
                       transition-colors
                       text-primary dark:text-primary-fixed
                       hover:text-on-surface dark:hover:text-zinc-100"
              >
                <span>Buka Dashboard</span>
                <span class="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  </header>

  <!-- ── Page Wrapper (dark bg) ─────────────────────────────── -->
  <div class="min-h-screen bg-surface dark:bg-zinc-950 transition-colors duration-300">

    <!-- ── Main Content ──────────────────────────────────────── -->
    <main class="max-w-4xl mx-auto px-6 py-12 space-y-16">

      <!-- Profile Hero -->
      <section class="flex flex-col items-center text-center space-y-6">
        <div class="relative inline-block">
          <!-- Glow -->
          <div class="absolute inset-0 blur-xl rounded-full transform scale-110
                      bg-primary/20 dark:bg-primary-fixed/10"></div>

          <!-- Avatar: tampilkan gambar jika ada, fallback ke inisial -->
          <div class="relative w-32 h-32 rounded-full overflow-hidden shadow-sm p-1 z-10
                      bg-surface-container-high dark:bg-zinc-800
                      ring-2 ring-primary/10 dark:ring-primary-fixed/20
                      flex items-center justify-center">
            <img
              v-if="ustadzProfileAvatar.showImage"
              :src="ustadzProfileAvatar.avatarUrl"
              :alt="`Avatar ${q?.answered_by_profile?.full_name}`"
              class="w-full h-full object-cover rounded-full"
              @error="(e) => handleAvatarError(e, ustadzProfileAvatar.avatarUrl)"
            />
            <span
              v-else
              class="text-on-primary dark:text-primary-fixed font-bold text-5xl select-none"
            >
              {{ ustadzProfileAvatar.initial }}
            </span>
          </div>

          <!-- Decorative Ring -->
          <div class="absolute inset-0 rounded-full opacity-20 -z-10 transform scale-105
                      bg-gradient-to-tr from-primary to-primary-container
                      dark:from-primary-fixed dark:to-primary-container"></div>
        </div>

        <div class="space-y-2">
          <h1 class="font-headline text-4xl md:text-5xl font-bold tracking-tight leading-tight
                     text-on-surface dark:text-zinc-100">
            {{ q?.answered_by_profile?.full_name }}
          </h1>
          <p class="font-body text-xs font-semibold tracking-widest uppercase
                    text-primary dark:text-primary-fixed">
            (Hafizhahullah)
          </p>
          <p class="font-body text-base max-w-2xl mx-auto pt-2 leading-relaxed
                    text-on-surface-variant dark:text-zinc-400">
            Spesialis Fiqih Muamalah Kontemporer &amp; Ushul Fiqh. Berdedikasi dalam menebar pemahaman Islam yang moderat dan aplikatif.
          </p>
        </div>
      </section>

      <!-- ── Bento Grid ────────────────────────────────────────── -->
      <div class="grid grid-cols-1 md:grid-cols-12 gap-8">

        <!-- Left Column: Riwayat Pendidikan -->
        <div class="md:col-span-5 space-y-6">
          <h2 class="font-headline text-2xl font-semibold flex items-center gap-3
                     text-on-surface dark:text-zinc-100">
            <span class="material-symbols-outlined icon-fill text-primary dark:text-primary-fixed">school</span>
            Riwayat Pendidikan
          </h2>

          <div class="rounded-xl p-8 relative overflow-hidden
                      bg-surface-container-low dark:bg-zinc-900
                      border border-transparent dark:border-zinc-800/60">
            <!-- Ambient glow blob -->
            <div class="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-40 -translate-y-1/2 translate-x-1/2
                        bg-surface-container-high dark:bg-primary-fixed/10"></div>

            <div class="relative z-10 space-y-8">

              <!-- Timeline Item 1 — S3 -->
              <div class="relative pl-8">
                <div class="absolute left-0 top-1.5 w-3 h-3 rounded-full shadow-[0_0_12px_rgba(0,105,72,0.4)]
                            bg-primary dark:bg-primary-fixed"></div>
                <div class="absolute left-1.5 top-5 bottom-[-2rem] w-px
                            bg-outline-variant/30 dark:bg-zinc-700/40"></div>
                <h3 class="font-body font-bold text-on-surface dark:text-zinc-100">S3 Fiqih &amp; Ushul Fiqh</h3>
                <p class="font-body text-sm text-on-surface-variant dark:text-zinc-400">Universitas Islam Madinah</p>
                <span class="inline-block mt-1 font-body text-xs px-2 py-1 rounded-md
                             bg-surface-container-high dark:bg-zinc-800
                             text-on-surface-variant dark:text-zinc-400">
                  2010 - 2014
                </span>
              </div>

              <!-- Timeline Item 2 — S2 -->
              <div class="relative pl-8">
                <div class="absolute left-0 top-1.5 w-3 h-3 rounded-full
                            bg-secondary-container dark:bg-zinc-700"></div>
                <div class="absolute left-1.5 top-5 bottom-[-2rem] w-px
                            bg-outline-variant/30 dark:bg-zinc-700/40"></div>
                <h3 class="font-body font-bold text-on-surface dark:text-zinc-100">S2 Syariah Islamiyyah</h3>
                <p class="font-body text-sm text-on-surface-variant dark:text-zinc-400">Universitas Al-Azhar, Kairo</p>
                <span class="inline-block mt-1 font-body text-xs px-2 py-1 rounded-md
                             bg-surface-container-high dark:bg-zinc-800
                             text-on-surface-variant dark:text-zinc-400">
                  2006 - 2009
                </span>
              </div>

              <!-- Timeline Item 3 — S1 -->
              <div class="relative pl-8">
                <div class="absolute left-0 top-1.5 w-3 h-3 rounded-full border-2
                            bg-surface-container-high dark:bg-zinc-800
                            border-primary/20 dark:border-primary-fixed/20"></div>
                <h3 class="font-body font-bold text-on-surface dark:text-zinc-100">S1 Perbandingan Madzhab</h3>
                <p class="font-body text-sm text-on-surface-variant dark:text-zinc-400">LIPIA Jakarta</p>
                <span class="inline-block mt-1 font-body text-xs px-2 py-1 rounded-md
                             bg-surface-container-high dark:bg-zinc-800
                             text-on-surface-variant dark:text-zinc-400">
                  2001 - 2005
                </span>
              </div>

            </div>
          </div>
        </div>

        <!-- Right Column: Aktivitas & Karya -->
        <div class="md:col-span-7 space-y-8">

          <!-- Aktivitas Dakwah -->
          <section class="space-y-6">
            <h2 class="font-headline text-2xl font-semibold flex items-center gap-3
                       text-on-surface dark:text-zinc-100">
              <span class="material-symbols-outlined icon-fill text-primary dark:text-primary-fixed">campaign</span>
              Aktivitas Dakwah
            </h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <!-- Card: Dosen Tetap -->
              <div class="p-6 rounded-xl flex flex-col justify-between group
                          hover:-translate-y-1 transition-transform duration-300
                          shadow-[0_12px_32px_rgba(20,28,43,0.03)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.2)]
                          bg-surface-container-lowest dark:bg-zinc-900
                          border border-transparent dark:border-zinc-800/60">
                <div class="space-y-4">
                  <div class="w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300
                              bg-surface-container-low dark:bg-zinc-800
                              text-primary dark:text-primary-fixed
                              group-hover:bg-primary group-hover:text-on-primary
                              dark:group-hover:bg-primary-fixed dark:group-hover:text-on-tertiary-fixed">
                    <span class="material-symbols-outlined">menu_book</span>
                  </div>
                  <div>
                    <h3 class="font-body font-bold mb-1 text-on-surface dark:text-zinc-100">Dosen Tetap</h3>
                    <p class="font-body text-sm text-on-surface-variant dark:text-zinc-400">STDI Imam Syafi'i Jember</p>
                  </div>
                </div>
              </div>

              <!-- Card: Pembina Yayasan -->
              <div class="p-6 rounded-xl flex flex-col justify-between group
                          hover:-translate-y-1 transition-transform duration-300
                          shadow-[0_12px_32px_rgba(20,28,43,0.03)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.2)]
                          bg-surface-container-lowest dark:bg-zinc-900
                          border border-transparent dark:border-zinc-800/60">
                <div class="space-y-4">
                  <div class="w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300
                              bg-surface-container-low dark:bg-zinc-800
                              text-primary dark:text-primary-fixed
                              group-hover:bg-primary group-hover:text-on-primary
                              dark:group-hover:bg-primary-fixed dark:group-hover:text-on-tertiary-fixed">
                    <span class="material-symbols-outlined">foundation</span>
                  </div>
                  <div>
                    <h3 class="font-body font-bold mb-1 text-on-surface dark:text-zinc-100">Pembina Yayasan</h3>
                    <p class="font-body text-sm text-on-surface-variant dark:text-zinc-400">Yayasan Nidaul Fithrah</p>
                  </div>
                </div>
              </div>

            </div>
          </section>

          <!-- Karya & Publikasi -->
          <section class="space-y-6">
            <h2 class="font-headline text-2xl font-semibold flex items-center gap-3
                       text-on-surface dark:text-zinc-100">
              <span class="material-symbols-outlined icon-fill text-primary dark:text-primary-fixed">auto_stories</span>
              Karya &amp; Publikasi
            </h2>
            <div class="rounded-xl p-2
                        shadow-[0_12px_32px_rgba(20,28,43,0.03)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.2)]
                        bg-surface-container-lowest dark:bg-zinc-900
                        border border-transparent dark:border-zinc-800/60">
              <ul class="divide-y divide-outline-variant/10 dark:divide-zinc-800">

                <li class="p-4 flex gap-4 items-start rounded-lg transition-colors
                           hover:bg-surface-container-low/50 dark:hover:bg-zinc-800/50">
                  <div class="mt-1 text-primary dark:text-primary-fixed">
                    <span class="material-symbols-outlined">book</span>
                  </div>
                  <div>
                    <h4 class="font-body font-semibold text-on-surface dark:text-zinc-100">
                      Panduan Praktis Fiqih Muamalah
                    </h4>
                    <p class="font-body text-sm mt-1 text-on-surface-variant dark:text-zinc-400">
                      Pustaka Imam Asy-Syafii (2020)
                    </p>
                  </div>
                </li>

                <li class="p-4 flex gap-4 items-start rounded-lg transition-colors
                           hover:bg-surface-container-low/50 dark:hover:bg-zinc-800/50">
                  <div class="mt-1 text-primary dark:text-primary-fixed">
                    <span class="material-symbols-outlined">article</span>
                  </div>
                  <div>
                    <h4 class="font-body font-semibold text-on-surface dark:text-zinc-100">
                      Hukum Jual Beli Dropship dalam Tinjauan Fiqih Kontemporer
                    </h4>
                    <p class="font-body text-sm mt-1 text-on-surface-variant dark:text-zinc-400">
                      Jurnal Ekonomi Syariah UIN (2018)
                    </p>
                  </div>
                </li>

                <li class="p-4 flex gap-4 items-start rounded-lg transition-colors
                           hover:bg-surface-container-low/50 dark:hover:bg-zinc-800/50">
                  <div class="mt-1 text-primary dark:text-primary-fixed">
                    <span class="material-symbols-outlined">book</span>
                  </div>
                  <div>
                    <h4 class="font-body font-semibold text-on-surface dark:text-zinc-100">
                      Tanya Jawab Seputar Riba di Era Modern
                    </h4>
                    <p class="font-body text-sm mt-1 text-on-surface-variant dark:text-zinc-400">
                      Darul Haq (2016)
                    </p>
                  </div>
                </li>

              </ul>
            </div>
          </section>

        </div>
      </div>

      <!-- ── CTA Button ────────────────────────────────────────── -->
      <div class="mt-12 flex justify-center">
        <button class="px-8 py-4 rounded-xl font-body font-semibold
                       flex items-center gap-3 group
                       transition-all duration-300 hover:brightness-110
                       bg-gradient-to-br from-primary to-primary-container
                       dark:from-primary-fixed dark:to-secondary-fixed
                       text-on-primary-container dark:text-on-tertiary-fixed
                       shadow-primary-md hover:shadow-primary-lg">
          <span class="material-symbols-outlined group-hover:-rotate-12 transition-transform duration-300">
            edit_document
          </span>
          Ajukan Pertanyaan ke Ustadz
        </button>
      </div>

    </main>

    <!-- ── Footer ────────────────────────────────────────────── -->
    <footer class="mt-20 pt-10 pb-8 border-t text-center
                   border-outline-variant/20 dark:border-zinc-800">
      <p class="max-w-md mx-auto italic font-body text-sm mb-6 px-4 leading-relaxed
                text-on-surface-variant/50 dark:text-zinc-600">
        "Sesungguhnya amalan yang paling dicintai Allah adalah amalan yang berkelanjutan (istiqomah) walaupun sedikit."
        <span class="not-italic font-semibold text-outline dark:text-zinc-500">(HR. Muslim)</span>
      </p>
      <div class="flex flex-col sm:flex-row justify-center items-center mt-10 gap-10 text-[10px] uppercase tracking-widest font-bold
                  text-outline dark:text-zinc-600">
        <p>© 2026 Ahsan TV. All Rights Reserved by Team IT</p>
        <div class="flex gap-5">
          <NuxtLink
            to="/kebijakan"
            class="transition-colors hover:text-primary dark:hover:text-primary-fixed"
          >
            Kebijakan Privasi
          </NuxtLink>
        </div>
        <div class="flex gap-5">
          <NuxtLink
            to="/terms"
            class="transition-colors hover:text-primary dark:hover:text-primary-fixed"
          >
            Syarat dan Ketentuan
          </NuxtLink>
        </div>
      </div>
    </footer>

  </div><!-- end page wrapper -->
</template>

<style scoped>
/* ── Header glass blur ─────────────────────────────────────────
   Opacity modifier Tailwind tidak bekerja pada custom color token
   yang tidak generate CSS variable otomatis. Diimplementasi manual. */
.header-bar {
  background: rgba(249, 249, 255, 0.72); /* surface #f9f9ff @ 72% */
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

:root.dark .header-bar {
  background: rgba(9, 9, 11, 0.82);     /* zinc-950 @ 82% */
}

/* ── Material Symbols ───────────────────────────────────────── */
.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}

.icon-fill {
  font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}
</style>