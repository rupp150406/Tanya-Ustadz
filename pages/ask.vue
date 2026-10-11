<script setup>
import { ref, nextTick } from 'vue'
import UiThemeToggle from '~/components/ui/ThemeToggle.vue'
import GradientWaves from '~/components/ui/GradientWaves.vue'
import UiShinyText from '~/components/ui/ShinyText.vue'
import SwipeToast from '~/components/ui/SwipeToast.vue'
import GooeyNav from '~/components/ui/GooeyNav.vue'
import { DotLottieVue } from '@lottiefiles/dotlottie-vue'
const { initTheme } = useTheme()
const { addQuestion, fetchPublic, pending: isSubmitting } = useQuestions()
const { fingerprint, getFingerprint } = useFingerprint()
const { connect, checkConnection, isConnected } = useTelegram()
const { initFCM } = useFCM()
const { lowPower, bgReady, detect } = useLowPower() // phone / touch / reduce-motion mode
const SHINY_TEXT = false // true = shiny text animation on, false = static text (both ShinyText on this page)

// ─── DEV PREVIEW (remove before production) ───────────────────
// ONE flag for BOTH preview buttons (Telegram toast + "question sent" popup):
//   true  = buttons visible (testing)
//   false = buttons hidden (production)
const SHOW_PREVIEW_BUTTON = false
const previewConnected = ref(false)

// Real connection state OR the forced preview state
const showConnectedToast = computed(() => isConnected.value || previewConnected.value)

const togglePreview = async () => {
  // Close first, swap which toast is rendered, then re-open so the slide-in replays
  open.value = false
  previewConnected.value = !previewConnected.value
  await nextTick()
  setTimeout(() => { open.value = true }, 200)
}

// Shows the "question sent" success popup without sending anything
const previewSuccessAlert = () => {
  triggerAlert('Berhasil!', 'Pertanyaan antum telah terkirim secara anonim.', true)
  alertIsPreview.value = true // must come after triggerAlert (which resets it)
}

// ─── Theme ────────────────────────────────────────────────────
onMounted(async () => {
  initTheme()
  detect()
  const fp = await getFingerprint()
  if (fp) checkConnection(fp)
  // Delay the toast so the slide-in animation is visible
  setTimeout(() => { open.value = true }, 1200)
})

const handleTelegramConnect = async () => {
  const fp = await getFingerprint()
  if (fp) await connect(fp)
}

const open = ref(false)

const category = ref('Fikih')
const questionText = ref('')
const maxChars = 500

const showAlert = ref(false)
const alertTitle = ref('Warning!')
const alertMessage = ref('')
const isSuccess = ref(false)

// Direct .lottie file links (not the /embed/ iframe links)
const LOTTIE_SUCCESS = 'https://lottie.host/19c599af-dfb9-40ea-b2ed-14d2ed7f9d5b/PlnHXxxyYt.lottie' // checklist
const LOTTIE_WARNING = 'https://lottie.host/90176d91-4978-4297-812d-178a24962b88/MDQJhvWqPS.lottie' // warning
const lottieSrc = computed(() => (isSuccess.value ? LOTTIE_SUCCESS : LOTTIE_WARNING))
const lottieKey = ref(0) // bump to remount the player so the animation restarts on every open

const charCount = computed(() => questionText.value.length)

const categories = [
  { id: 'Fikih', icon: 'balance', label: 'Fikih', class: '' },
  { id: 'Akhlak & Adab', icon: 'favorite', label: 'Akhlak', class: '' },
  { id: 'Keluarga', icon: 'family_restroom', label: 'Keluarga', class: '' },
  { id: 'Muamalah', icon: 'payments', label: 'Muamalah', class: '' },
  { id: 'Umum', icon: 'language', label: 'Umum', class: 'col-span-2 md:col-span-1' },
]

// Marks the popup as a preview so closing it does NOT navigate home / refetch
const alertIsPreview = ref(false)

const triggerAlert = (title, message, success = false) => {
  alertIsPreview.value = false
  alertTitle.value = title
  alertMessage.value = message
  isSuccess.value = success
  lottieKey.value++
  showAlert.value = true
}

const closeAlert = async () => {
  showAlert.value = false
  if (alertIsPreview.value) {
    alertIsPreview.value = false
    return
  }
  if (isSuccess.value) {
    const fp = fingerprint.value || await getFingerprint()
    await fetchPublic('all', fp)
    await navigateTo('/')
  }
}

const handleSubmit = async () => {
  if (!questionText.value.trim()) {
    return triggerAlert('Peringatan', 'Isi pertanyaan tidak boleh kosong.')
  }
  try {
    const fp = await getFingerprint()
    if (!fp) {
      return triggerAlert('Peringatan', 'Tidak dapat mengidentifikasi perangkat. Coba muat ulang halaman.')
    }
    await addQuestion({
      question: questionText.value.trim(),
      category: category.value,
      fingerprint: fp,
    })
    triggerAlert('Berhasil!', 'Pertanyaan antum telah terkirim secara anonim.', true)
    questionText.value = ''
  } catch (err) {
    const errorMsg = err?.data?.message || err?.message || 'Terjadi kesalahan saat mengirim pertanyaan.'
    triggerAlert('Warning!', errorMsg, false)
  }
}
</script>

<template>
  <div class="relative bg-background dark:bg-zinc-950 text-on-surface dark:text-zinc-100 font-body antialiased min-h-screen transition-colors duration-300 overflow-x-hidden">
    <!-- Interactive 3D Gradient Waves Background -->
    <div class="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <GradientWaves
        v-if="bgReady"
        horizonColor="#10B981"
        waveColor="#84CC16"
        crestColor="#FFFFFF"
        :speed="0.4"
        :amplitude="2.5"
        :waveScale="0.6"
        :waveRatio="0.9"
        :swell="35"
        :turbulence="20"
        :tilt="1.11"
        :zoom="1.0"
        :height="5.5"
        :fogDepth="15"
        :detail="lowPower ? 'low' : 'medium'"
        :brightness="1.0"
        :opacity="1.0"
        :mouseInteraction="!lowPower"
        :parallaxStrength="0.5"
        :grain="!lowPower"
        :grainIntensity="0.05"
      />
    </div>

    <!-- Foreground Content Wrapper -->
    <div class="relative z-10 flex flex-col min-h-screen">
      <!-- Custom Alert Overlay -->
      <div
        class="alert-overlay"
        :class="{ 'active': showAlert }"
        @click.self="closeAlert"
      >
        <div class="alert-card shadow-2xl dark:bg-zinc-900">
          <div class="alert-header" :class="isSuccess ? 'bg-emerald-600' : 'bg-[#004d36]'">
            <div class="lottie-container">
              <ClientOnly>
                <DotLottieVue
                  v-if="showAlert"
                  :key="lottieKey"
                  :src="lottieSrc"
                  autoplay
                  style="width: 100px; height: 100px; pointer-events: none;"
                />
              </ClientOnly>
            </div>
          </div>
          <div class="alert-content dark:bg-zinc-900">
            <h2 class="alert-title dark:text-zinc-100">{{ alertTitle }}</h2>
            <p class="alert-message dark:text-zinc-400">{{ alertMessage }}</p>
            <button
              @click="closeAlert"
              class="alert-button text-white transition-transform active:scale-95"
              :class="isSuccess ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-[#004d36] hover:bg-[#003626]'"
            >
              {{ isSuccess ? 'Kembali ke Home' : 'Tutup' }}
            </button>
          </div>
        </div>
      </div>

      <header class="bg-surface/95 dark:bg-zinc-950/95 md:bg-surface/70 dark:md:bg-zinc-950/80 md:backdrop-blur-md sticky top-0 z-50 shadow-sm border-b border-transparent dark:border-zinc-800/50">
        <div class="flex justify-between items-center w-full px-6 py-3 max-w-screen-2xl mx-auto">
          <div class="flex items-center gap-4">
            <NuxtLink to="/" class="text-2xl font-bold tracking-tighter text-emerald-800 dark:text-emerald-400 font-headline">
              <UiShinyText
                text="Tanya Ustadz"
                :speed="2"
                :delay="0"
                color="#059669"
                shine-color="#00FF7F"
                :spread="120"
                direction="left"
                :yoyo="false"
                :pause-on-hover="false" :disabled="!SHINY_TEXT"
              />
            </NuxtLink>
          </div>
          <!-- Theme Toggle -->
          <UiThemeToggle />
        </div>
      </header>

      <main class="flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden text-on-surface dark:text-zinc-100 flex-1">
        <div class="w-full max-w-2xl z-10">
          <div class="text-center mb-10 space-y-3">
            <h1 class="font-headline font-extrabold text-4xl md:text-5xl tracking-tight">
              Sampaikan
              <UiShinyText
                text="Pertanyaanmu"
                :speed="2"
                :delay="0"
                color="#059669"
                shine-color="#00FF7F"
                :spread="120"
                direction="left"
                :yoyo="false"
                :pause-on-hover="false" :disabled="!SHINY_TEXT"
              />
            </h1>
            <p class="text-on-surface-variant dark:text-zinc-400 text-lg max-w-md mx-auto leading-relaxed">
              Ajukan pertanyaan seputar hukum Islam kepada para asatidzah yang kompeten dengan penuh ketenangan.
            </p>
          </div>

          <div class="bg-surface-container-lowest/85 dark:bg-zinc-900/85 md:backdrop-blur-md rounded-3xl md:rounded-[2rem] shadow-[0px_12px_32px_rgba(20,28,43,0.06)] dark:shadow-[0px_12px_32px_rgba(0,0,0,0.4)] overflow-hidden px-4 pt-4 pb-6 md:p-12 border border-outline-variant/10 dark:border-zinc-800">
          <div class="mb-4 md:mb-8 flex items-center gap-2.5 md:gap-3 p-3 md:p-4 rounded-xl bg-tertiary-fixed dark:bg-amber-900/20 text-on-tertiary-fixed-variant dark:text-amber-300">
            <span class="material-symbols-outlined !text-[20px] md:!text-[24px] text-tertiary dark:text-amber-400">info</span>
            <p class="text-xs md:text-sm leading-snug md:leading-normal font-medium">Batas bertanya: 5 pertanyaan setiap 5 menit untuk menjaga kualitas layanan.</p>
          </div>

          <form @submit.prevent="handleSubmit" class="space-y-5 md:space-y-8">
            <div class="space-y-2 md:space-y-4">
              <label class="block font-headline font-bold text-xs md:text-sm uppercase tracking-wider md:tracking-widest ml-1">
                Pilih Kategori
              </label>

              <GooeyNav v-model="category" :items="categories" :disabled="isSubmitting" :lite="false" />
            </div>

            <div class="space-y-2 md:space-y-4">
              <label class="block font-headline font-bold text-xs md:text-sm uppercase tracking-wider md:tracking-widest ml-1">
                Isi Pertanyaan
              </label>
              <div class="relative">
                <textarea
                  v-model="questionText"
                  :maxlength="maxChars"
                  :disabled="isSubmitting"
                  rows="4"
                  class="w-full bg-surface-container-low/80 dark:bg-zinc-800/80 md:backdrop-blur-sm border border-outline-variant/20 dark:border-zinc-700/50 rounded-2xl md:rounded-3xl p-4 md:p-6 focus:ring-2 focus:ring-primary/20 text-on-surface dark:text-zinc-100 placeholder:text-outline/60 dark:placeholder:text-zinc-500 resize-none disabled:opacity-50 transition-[box-shadow,opacity]"
                  placeholder="Tuliskan pertanyaan Anda..."
                ></textarea>
                <div class="absolute bottom-3 right-4 md:bottom-4 md:right-6 text-xs font-medium text-outline dark:text-zinc-500">
                  <span>{{ charCount }}</span>/{{ maxChars }}
                </div>
              </div>
            </div>

            <button
              type="submit"
              :disabled="isSubmitting"
              class="w-full py-3 md:py-4 px-6 md:px-8 rounded-full bg-gradient-to-br from-primary to-primary-container text-white font-headline font-bold text-base md:text-lg shadow-lg flex items-center justify-center gap-2 transition-transform md:hover:scale-[1.02] active:scale-95 disabled:opacity-70"
            >
              <span v-if="isSubmitting" class="material-symbols-outlined animate-spin">sync</span>
              <span v-else class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">send</span>
              {{ isSubmitting ? 'Mengirim...' : 'Kirim Pertanyaan Anonim' }}
            </button>
          </form>

          <div class="mt-6 md:mt-12 pt-5 md:pt-8 border-t border-outline-variant/15 dark:border-zinc-700 text-center">
            <div class="flex flex-col items-center gap-2">
              <div class="w-10 h-10 md:w-12 md:h-12 rounded-full bg-secondary-container dark:bg-primary/10 flex items-center justify-center mb-1 md:mb-2">
                <span class="material-symbols-outlined text-on-secondary-container dark:text-emerald-400">verified_user</span>
              </div>
              <h3 class="font-headline font-bold text-sm md:text-base">Apa yang terjadi setelah ini?</h3>
              <p class="text-xs md:text-sm text-on-surface-variant dark:text-zinc-400 max-w-sm">
                Pertanyaan antum akan ditinjau oleh tim admin kami sebelum dijawab oleh Ustadz.
              </p>
            </div>
          </div>
        </div>
      </div>

        <footer class="mt-12 md:mt-20 pt-10 pb-8 border-t border-outline-variant/15 dark:border-zinc-800 text-center">
          <p class="max-w-md mx-auto italic text-on-surface-variant/50 dark:text-white font-body text-sm mb-6 px-4 leading-relaxed">
            "Sesungguhnya amalan yang paling dicintai Allah adalah amalan yang berkelanjutan (istiqomah) walaupun sedikit."
            <span class="not-italic font-semibold text-outline dark:text-white">(HR. Muslim)</span>
          </p>
          <div class="flex flex-col sm:flex-row justify-center items-center mt-10 gap-10 text-outline dark:text-white text-[10px] uppercase tracking-widest font-bold">
            <p>© 2026 Ahsan TV. All Rights Reserved by Team IT</p>
            <div class="flex gap-5">
              <NuxtLink to="/kebijakan" class="hover:text-primary transition-colors">Kebijakan Privasi</NuxtLink>
            </div>
            <div class="flex gap-5">
              <NuxtLink to="/terms" class="hover:text-primary transition-colors">Syarat dan Ketentuan</NuxtLink>
            </div>
          </div>
        </footer>

        <!-- Telegram Connect – SwipeToast (shown when NOT connected) -->
        <SwipeToast
          v-if="!showConnectedToast"
          :open="open"
          title="Aktifkan Notifikasi Jawaban"
          description="Hubungkan Telegram untuk tahu saat Ustadz menjawab, tanpa daftar akun."
          actionLabel="Hubungkan"
          background="#18181b"
          color="#f5f5f5"
          fuseColor="#229ED9"
          :width="380"
          :radius="14"
          :slideMs="400"
          :settleBounce="0.2"
          :swipeDistance="40"
          :duration="8000"
          fuse="bottom"
          :pauseOnHover="true"
          :closeButton="true"
          @action="handleTelegramConnect"
          @close="open = false"
        >
          <template #icon>
            <span style="display:inline-block;font-size:16px;line-height:1;margin-right:12px;flex-shrink:0">✈️</span>
          </template>
        </SwipeToast>

        <!-- Connected state – SwipeToast (real connection OR preview) -->
        <SwipeToast
          v-else
          :open="open"
          title="Terhubung ke Telegram ✅"
          description="Antum akan dapat notifikasi saat Ustadz menjawab."
          background="#052e16"
          color="#bbf7d0"
          fuseColor="#4ade80"
          :width="360"
          :radius="14"
          :slideMs="400"
          :duration="4000"
          fuse="bottom"
          :pauseOnHover="true"
          :closeButton="true"
          @close="open = false"
        />
      </main>
    </div>

    <!-- DEV PREVIEW BUTTONS (both controlled by SHOW_PREVIEW_BUTTON in <script>):
         1) opens the "question sent" popup without submitting anything
         2) toggles the Telegram "connect" / "connected" toast
         Remove this block (and the DEV PREVIEW lines in <script>) before production. -->
    <div v-if="SHOW_PREVIEW_BUTTON" class="fixed bottom-4 left-4 z-[60] flex flex-col items-start gap-2">
      <button
        type="button"
        @click="previewSuccessAlert"
        class="flex items-center gap-2 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2.5 text-xs font-bold shadow-xl md:hover:scale-105 active:scale-95 transition-transform"
      >
        <span class="material-symbols-outlined text-base">mark_email_read</span>
        Preview: Pertanyaan terkirim
      </button>
      <button
        type="button"
        @click="togglePreview"
        class="flex items-center gap-2 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2.5 text-xs font-bold shadow-xl md:hover:scale-105 active:scale-95 transition-transform"
      >
        <span class="material-symbols-outlined text-base">visibility</span>
        {{ previewConnected ? 'Preview: Belum terhubung' : 'Preview: Sudah terhubung' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.alert-overlay {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background: rgba(0, 0, 0, 0.55); /* solid dim on phones: full-screen backdrop-filter is too heavy */
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s ease, visibility 0.3s ease;
}
.alert-overlay.active { opacity: 1; visibility: visible; }
@media (min-width: 768px) {
  .alert-overlay { background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(4px); }
}

.alert-card {
  background: white;
  border-radius: 24px;
  width: 90%;
  max-width: 400px;
  overflow: hidden;
  transform: scale(0.9);
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.alert-overlay.active .alert-card { transform: scale(1); }

.alert-header {
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.alert-content { padding: 32px 24px; text-align: center; }
.alert-title { font-size: 24px; font-weight: 800; color: #1f2937; margin-bottom: 8px; }
.alert-message { font-size: 16px; color: #6b7280; line-height: 1.5; margin-bottom: 24px; }
.alert-button {
  color: white;
  font-weight: 700;
  padding: 12px 48px;
  border-radius: 9999px;
  border: none;
  cursor: pointer;
  transition: transform 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
@media (hover: hover) {
  .alert-button { transition: transform 0.2s ease, box-shadow 0.2s ease; }
  .alert-button:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,105,72,0.3); }
}
.lottie-container { width: 100px; height: 100px; }
.material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
</style>