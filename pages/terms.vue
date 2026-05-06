<script setup lang="ts">
import UiThemeToggle from '~/components/ui/ThemeToggle.vue'
import { useTheme } from '~/composables/useTheme'

// ── Theme ─────────────────────────────────────────────────────
const { initTheme } = useTheme()
onMounted(() => initTheme())

// ... rest of the code remains the same ...
// PROFILE — READ-ONLY CONSUMER
// ─────────────────────────────────────────────────────────────
const profile = useState('user-profile')
const avatarBroken = ref(false)

watch(profile, () => { avatarBroken.value = false })

// ─────────────────────────────────────────────────────────────
// COMPUTED — AVATAR
// ─────────────────────────────────────────────────────────────
const shouldShowAvatar = computed(() => {
  const role = profile.value?.role?.toLowerCase()
  return role === 'admin_it' || role === 'ustadz'
})

const showAvatarImage = computed(() =>
  shouldShowAvatar.value &&
  typeof profile.value?.avatar_url === 'string' &&
  profile.value.avatar_url.length > 15 &&
  !avatarBroken.value
)

const userInitial = computed(() =>
  profile.value?.full_name?.charAt(0).toUpperCase() ?? 'U'
)

const dashboardRoute = computed(() => {
  const role = profile.value?.role?.toLowerCase()
  if (role === 'admin_it') return '/admin/dashboard'
  if (role === 'ustadz')   return '/ustadz/dashboard'
  return null
})

const handleAvatarClick = () => { if (dashboardRoute.value) navigateTo(dashboardRoute.value) }
const handleAvatarError = () => { avatarBroken.value = true }
</script>

<template>
  <div
    class="bg-background dark:bg-zinc-950 text-on-background dark:text-zinc-100 selection:bg-primary-container selection:text-on-primary-container overflow-x-hidden"
  >
    <!-- TopAppBar Shell -->
    <header
      class="bg-surface/70 dark:bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50 shadow-sm bg-gradient-to-b from-slate-100/10 dark:from-zinc-800/10 to-transparent border-b border-transparent dark:border-zinc-800/50"
    >
      <div class="flex justify-between items-center w-full px-6 py-3 max-w-screen-2xl mx-auto">
        <div class="flex items-center gap-4">
          <NuxtLink
            to="/"
            class="text-2xl font-bold tracking-tighter text-emerald-800 dark:text-emerald-400 font-headline"
          >
            Tanya Ustadz
          </NuxtLink>
        </div>

        <div class="flex items-center gap-3">
          <!-- Theme Toggle -->
          <UiThemeToggle />
                    <div v-if="shouldShowAvatar" class="relative group/avatar">
            <button
              @click="handleAvatarClick"
              class="relative flex items-center justify-center w-11 h-11 rounded-full overflow-hidden border-2 border-[#A6F55B]/30 shadow-md hover:ring-2 hover:ring-[#A6F55B] hover:scale-105 transition-all duration-300 cursor-pointer bg-emerald-900"
              :title="`${profile.full_name} (${profile.role})`"
            >
              <img
                v-if="showAvatarImage"
                :src="profile.avatar_url"
                :alt="profile.full_name"
                class="w-full h-full object-cover"
                referrerpolicy="no-referrer"
                @error="handleAvatarError"
              />
              <span v-else class="text-white font-bold text-base select-none">
                {{ userInitial }}
              </span>
            </button>

            <!-- Tooltip dropdown -->
            <div class="absolute right-0 top-full mt-3 w-56 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-emerald-50 dark:border-zinc-700 p-4 opacity-0 invisible group-hover/avatar:opacity-100 group-hover/avatar:visible transition-all duration-200 z-50">
              <div class="flex items-center gap-3 mb-3">
                <div class="w-10 h-10 rounded-full overflow-hidden bg-emerald-900 flex items-center justify-center flex-shrink-0">
                  <img
                    v-if="showAvatarImage"
                    :src="profile.avatar_url"
                    :alt="profile.full_name"
                    class="w-full h-full object-cover"
                    referrerpolicy="no-referrer"
                    @error="handleAvatarError"
                  />
                  <span v-else class="text-white font-bold text-sm select-none">
                    {{ userInitial }}
                  </span>
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-bold text-emerald-900 dark:text-emerald-300 truncate">{{ profile.full_name }}</p>
                  <p class="text-xs text-emerald-600 dark:text-emerald-500 capitalize">{{ profile.role?.replace('_', ' ') }}</p>
                </div>
              </div>
              <div class="border-t border-emerald-50 dark:border-zinc-700 pt-3">
                <button
                  @click="handleAvatarClick"
                  class="w-full text-left text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:text-emerald-800 dark:hover:text-emerald-200 transition-colors flex items-center justify-between"
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

    <!-- Main Content -->
    <main class="min-h-screen">

      <!-- Hero Section -->
      <section class="relative w-full h-[400px] overflow-hidden">
        <div class="absolute inset-0 z-0">
          <img
            class="w-full h-full object-cover"
            src="https://ahsan.tv/wp-content/uploads/2026/05/ohyeah.webp"
            alt="A serene landscape of a misty morning in a lush green valley with light rays piercing through old banyan trees."
          />
          <div class="absolute inset-0 bg-gradient-to-b from-transparent via-white/60 to-white dark:via-black/60 dark:to-black"></div>
        </div>
        <div class="relative z-10 max-w-4xl mx-auto pt-24 px-8 text-center">
          <p class="font-amiri text-4xl text-primary mb-4 dark:text-zinc-100">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</p>
          <h1 class="font-headline font-extrabold text-5xl md:text-6xl text-on-surface dark:text-zinc-100 tracking-tight leading-tight">
            Syarat &amp; <span class="text-primary italic">Ketentuan</span>
          </h1>
        </div>
      </section>

      <!-- Content Canvas -->
      <div class="max-w-4xl mx-auto px-8 pb-24 -mt-10 relative z-20">
        <div
          class="bg-surface-container-lowest dark:bg-zinc-900 rounded-3xl p-8 md:p-16 shadow-xl shadow-on-surface/5 space-y-16"
        >

          <!-- 1. Tujuan Layanan -->
          <article class="flex flex-col md:flex-row gap-8 md:gap-12 items-start">
            <div
              class="flex-shrink-0 w-16 h-16 rounded-2xl bg-surface-container-low dark:bg-zinc-800 flex items-center justify-center text-primary dark:text-zinc-400"
            >
              <span class="material-symbols-outlined text-3xl">flag</span>
            </div>
            <div class="space-y-4">
              <h2 class="font-headline font-bold text-2xl text-on-surface dark:text-zinc-100 flex items-center gap-2">
                1. Tujuan Layanan
              </h2>
              <p class="font-nunito text-lg text-on-surface-variant dark:text-zinc-300 leading-relaxed">
                Layanan Tanya Ustadz V3 hadir sebagai jembatan ilmu antara Jemaah dengan para
                Asatidzah untuk mempermudah akses pemahaman agama Islam yang berdasarkan Al-Qur'an
                dan As-Sunnah dengan pemahaman para sahabat. Seluruh konten bertujuan untuk edukasi
                dan dakwah, bukan sebagai pengganti konsultasi hukum atau medis profesional.
              </p>
            </div>
          </article>

          <!-- 2. Adab & Etika Bertanya -->
          <article class="flex flex-col md:flex-row gap-8 md:gap-12 items-start">
            <div
              class="flex-shrink-0 w-16 h-16 rounded-2xl bg-surface-container-low dark:bg-zinc-800 flex items-center justify-center text-primary dark:text-zinc-400"
            >
              <span class="material-symbols-outlined text-3xl">menu_book</span>
            </div>
            <div class="space-y-4">
              <h2 class="font-headline font-bold text-2xl text-on-surface dark:text-zinc-100">
                2. Adab &amp; Etika Bertanya
              </h2>
              <ul class="font-nunito text-lg text-on-surface-variant dark:text-zinc-300 space-y-4 list-none">
                <li class="flex gap-4">
                  <span class="w-1.5 h-1.5 mt-2.5 rounded-full bg-primary dark:bg-zinc-400 flex-shrink-0"></span>
                  Menggunakan bahasa yang santun dan tidak provokatif.
                </li>
                <li class="flex gap-4">
                  <span class="w-1.5 h-1.5 mt-2.5 rounded-full bg-primary dark:bg-zinc-400 flex-shrink-0"></span>
                  Pertanyaan harus bersifat umum (bukan masalah privat yang sangat sensitif).
                </li>
                <li class="flex gap-4">
                  <span class="w-1.5 h-1.5 mt-2.5 rounded-full bg-primary dark:bg-zinc-400 flex-shrink-0"></span>
                  Menghindari pertanyaan yang bersifat mengadu domba antar ulama atau kelompok.
                </li>
              </ul>
            </div>
          </article>

          <!-- 3. Kebijakan Anonimitas & Tanggung Jawab -->
          <article class="flex flex-col md:flex-row gap-8 md:gap-12 items-start">
            <div
              class="flex-shrink-0 w-16 h-16 rounded-2xl bg-surface-container-low dark:bg-zinc-800 flex items-center justify-center text-primary dark:text-zinc-400"
            >
              <span class="material-symbols-outlined text-3xl">shield</span>
            </div>
            <div class="space-y-6 flex-1">
              <h2 class="font-headline font-bold text-2xl text-on-surface dark:text-zinc-100">
                3. Kebijakan Anonimitas &amp; Tanggung Jawab
              </h2>
              <p class="font-nunito text-lg text-on-surface-variant dark:text-zinc-300 leading-relaxed">
                Kami menghormati privasi Anda sebagai penanya. Data identitas tidak akan
                dipublikasikan secara publik untuk menjaga kenyamanan Jemaah dalam berkonsultasi.
              </p>
              <div
                class="p-8 rounded-3xl bg-secondary-container dark:bg-zinc-800 border border-primary/10 dark:border-zinc-700 flex items-start gap-6"
              >
                <span class="material-symbols-outlined text-primary dark:text-zinc-400 text-3xl mt-1">verified</span>
                <div>
                  <h4 class="font-headline font-bold text-on-secondary-container dark:text-zinc-100 mb-2">
                    Anonimitas Mutlak
                  </h4>
                  <p class="font-nunito text-on-secondary-container/80 dark:text-zinc-300 text-base leading-relaxed">
                    Setiap pertanyaan yang muncul di feed publik akan disamarkan identitasnya secara
                    otomatis kecuali Anda secara sadar mencantumkan nama dalam isi teks pertanyaan.
                  </p>
                </div>
              </div>
            </div>
          </article>

          <!-- 4. Hak Moderasi Pengembang -->
          <article class="flex flex-col md:flex-row gap-8 md:gap-12 items-start">
            <div
              class="flex-shrink-0 w-16 h-16 rounded-2xl bg-surface-container-low dark:bg-zinc-800 flex items-center justify-center text-primary dark:text-zinc-400"
            >
              <span class="material-symbols-outlined text-3xl">settings</span>
            </div>
            <div class="space-y-4">
              <h2 class="font-headline font-bold text-2xl text-on-surface dark:text-zinc-100">
                4. Hak Moderasi Pengembang
              </h2>
              <p class="font-nunito text-lg text-on-surface-variant dark:text-zinc-300 leading-relaxed">
                Tim Admin berhak melakukan penyuntingan (editing) pada teks pertanyaan untuk
                memperbaiki tata bahasa tanpa mengubah substansi, atau menolak pertanyaan yang
                dianggap tidak sesuai dengan visi dan misi Tanya Ustadz V3.
              </p>
            </div>
          </article>

          <!-- 5. Pembatasan Tanggung Jawab -->
          <article class="flex flex-col md:flex-row gap-8 md:gap-12 items-start">
            <div
              class="flex-shrink-0 w-16 h-16 rounded-2xl bg-error-container/30 dark:bg-zinc-800 flex items-center justify-center text-error dark:text-zinc-400"
            >
              <span class="material-symbols-outlined text-3xl">warning</span>
            </div>
            <div class="space-y-4">
              <h2 class="font-headline font-bold text-2xl text-on-surface dark:text-zinc-100">
                5. Pembatasan Tanggung Jawab
              </h2>
              <p
                class="font-nunito text-lg text-on-surface-variant dark:text-zinc-300 leading-relaxed italic border-l-4 border-error/20 dark:border-zinc-600 pl-6"
              >
                "AhsanTV Development Team tidak bertanggung jawab atas penyalahgunaan informasi
                yang didapatkan dari platform ini. Setiap tindakan hukum atau keputusan besar yang
                diambil oleh pengguna tetap merupakan tanggung jawab pribadi masing-masing."
              </p>
            </div>
          </article>

          <!-- Closing Section -->
          <div class="pt-16 border-t border-outline-variant/20 dark:border-zinc-800 text-center space-y-8">
            <p class="font-amiri text-3xl text-primary">
              وَآخِرُ دَعْوَانَا أَنِ الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ
            </p>
            <p class="font-nunito text-on-surface-variant dark:text-zinc-300 italic max-w-2xl mx-auto">
              "Semoga Allah senantiasa memberikan kita taufik dan hidayah-Nya dalam mempelajari dan
              mengamalkan ilmu syar'i."
            </p>
            <div class="space-y-1">
              <p class="font-headline font-bold text-on-surface dark:text-zinc-100 uppercase tracking-widest text-sm">
                AhsanTV Development Team
              </p>
            </div>
          </div>

        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer
      class="mt-20 pt-10 pb-8 border-t border-outline-variant/15 dark:border-zinc-800 text-center"
    >
      <p
        class="max-w-md mx-auto italic text-on-surface-variant/50 dark:text-zinc-600 font-body text-sm mb-6 px-4 leading-relaxed"
      >
        "Sesungguhnya amalan yang paling dicintai Allah adalah amalan yang berkelanjutan
        (istiqomah) walaupun sedikit."
        <span class="not-italic font-semibold text-outline dark:text-zinc-500">(HR. Muslim)</span>
      </p>
      <div
        class="flex flex-col sm:flex-row justify-center items-center gap-10 text-outline dark:text-zinc-600 text-[10px] uppercase tracking-widest font-bold"
      >
        <p> 2026 Ahsan TV. All Rights Reserved by Team IT</p>
      </div>
    </footer>
  </div>
</template>



<style scoped>
.font-amiri {
  font-family: 'Amiri', serif;
}

.font-nunito {
  font-family: 'Nunito', sans-serif;
}

.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}
</style>