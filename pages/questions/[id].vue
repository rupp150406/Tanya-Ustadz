<script setup>
import { computed, onMounted } from 'vue'
import { useQuestions } from '~/composables/useQuestions'
import UiThemeToggle from '~/components/ui/ThemeToggle.vue'
import GradientWaves from '~/components/ui/GradientWaves.vue'
import UiShinyText from '~/components/ui/ShinyText.vue'
// import UiUpvoteButton from '~/components/ui/UpvoteButton.vue' // DISABLED

// ─── Theme ────────────────────────────────────────────────────
const { initTheme } = useTheme()
const { lowPower, bgReady, detect } = useLowPower() // phone / touch / reduce-motion mode
onMounted(async () => {
  initTheme()
  detect()
  if (!questions.value || questions.value.length === 0) {
    await fetchPublic('all')
  }
})

// ─── Composable & Route ───────────────────────────────────────
const { questions, fetchPublic, pending } = useQuestions()
const route = useRoute()
const questionId = route.params.id

// ─── Computed: find this question from the shared store ───────
const q = computed(() =>
  questions.value?.find((item) => item.id === questionId) ?? null
)

// ─── Helpers ─────────────────────────────────────────────────
const getTicketId = (id) => id?.slice(-4).toUpperCase() || '....'

const formatDate = (ds) => {
  if (!ds) return 'Baru saja'
  return new Date(ds).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const formatDateShort = (ds) => {
  if (!ds) return ''
  return new Date(ds).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// ─── Category (real value from the question; "Umum" only when it is empty) ───
// Same ids/icons as the `categories` list in ask.vue (saved value = the tile's id).
// Keys are lowercase. Add a line here if you add a category there.
const CATEGORY_ICONS = {
  'fikih': 'balance',
  'akhlak & adab': 'favorite',
  'keluarga': 'family_restroom',
  'muamalah': 'payments',
  'umum': 'language',
}
const categoryLabel = computed(() => q.value?.category?.trim() || 'Umum')
const categoryIcon = computed(() => CATEGORY_ICONS[categoryLabel.value.toLowerCase()] ?? 'category')

// ─── Upvote (optimistic local toggle) ────────────────────────
const upvoted = ref(false)
const localUpvotes = computed(() => (q.value?.upvotes ?? 0) + (upvoted.value ? 1 : 0))
function toggleUpvote() { upvoted.value = !upvoted.value }

// ─── Avatar Utilities ──────────────────────────────────────
const { 
  getAvatarDisplayState,
  handleAvatarError,
  preloadAvatar 
} = useAvatar()

// Get avatar display state for the answering ustadz
const ustadzAvatar = computed(() => 
  getAvatarDisplayState(q.value?.answered_by_profile)
)

// Preload avatar when question data is available
watch(() => q.value?.answered_by_profile?.avatar_url, async (avatarUrl) => {
  if (avatarUrl) {
    await preloadAvatar(avatarUrl)
  }
}, { immediate: true })

// ─── Share: copy the page link + "copied" feedback ──────────
const copied = ref(false)
let copiedTimer = null

async function handleShare() {
  // clean link: no ?query or #hash that the visitor happened to have
  const url = `${window.location.origin}${route.path}`
  let ok = false

  try {
    await navigator.clipboard.writeText(url)
    ok = true
  } catch {
    // Fallback: http pages, older browsers, iOS
    const ta = document.createElement('textarea')
    ta.value = url
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    ta.setSelectionRange(0, url.length)
    try { ok = document.execCommand('copy') } catch {}
    document.body.removeChild(ta)
  }

  // last resort: let the person copy it by hand
  if (!ok) { window.prompt('Salin tautan ini:', url); return }

  copied.value = true
  clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => { copied.value = false }, 2000)
}
onBeforeUnmount(() => clearTimeout(copiedTimer))

const router = useRouter()

function navigateToUstadz(id) {
  if (!id) {
    console.warn('[Tanya Ustadz] ID Ustadz belum siap atau kosong.')
    return
  }
  // Paksa redirect menggunakan Nuxt router built-in
  router.push(`/ustadz/${id}`)
}
</script>

<template>
  <div class="relative min-h-screen bg-surface dark:bg-zinc-950 font-body text-on-surface dark:text-zinc-100 antialiased transition-colors duration-300 overflow-x-hidden">

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
      <!-- ── Fixed Header ──────────────────────────────────── -->
      <header class="fixed top-0 w-full z-50 bg-surface/95 dark:bg-zinc-950/95 md:bg-surface/80 dark:md:bg-zinc-950/80 md:backdrop-blur-xl border-b border-outline-variant/10 dark:border-zinc-800 transition-colors duration-300">
      <div class="flex items-center gap-3 px-4 sm:px-6 py-3.5 max-w-3xl mx-auto">
        <NuxtLink to="/"
          class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container dark:hover:bg-zinc-800 transition-colors active:scale-90 duration-150 shrink-0">
          <span class="material-symbols-outlined text-on-surface dark:text-zinc-300" style="font-size:20px">arrow_back</span>
        </NuxtLink>

        <NuxtLink to="/" class="text-base font-extrabold tracking-tight text-emerald-900 dark:text-emerald-400 font-headline flex-1 truncate">
              <UiShinyText
                text="Tanya Ustadz"
                :speed="2"
                :delay="0"
                color="#059669"
                shine-color="#00FF7F"
                :spread="120"
                direction="left"
                :yoyo="false"
                :pause-on-hover="false"
              />
            </NuxtLink>


        <!-- Status chip -->
        <div class="shrink-0">
          <span v-if="q?.status === 'pending'"
            class="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full">
            <span class="material-symbols-outlined text-[13px]" style="font-variation-settings:'FILL' 1">schedule</span>
            Pending
          </span>
          <span v-else-if="q?.status === 'verified'"
            class="inline-flex items-center gap-1 bg-secondary-container dark:bg-primary/10 text-on-secondary-container dark:text-emerald-400 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full">
            <span class="material-symbols-outlined text-[13px]" style="font-variation-settings:'FILL' 1">verified</span>
            Verified
          </span>
          <span v-else-if="q?.status === 'answered'"
            class="inline-flex items-center gap-1 bg-secondary-container dark:bg-primary/10 text-on-secondary-container dark:text-emerald-400 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full">
            <span class="material-symbols-outlined text-[13px]" style="font-variation-settings:'FILL' 1">check_circle</span>
            Terjawab
          </span>
        </div>

        <!-- Theme Toggle -->
        <UiThemeToggle />
      </div>
    </header>

    <!-- ── Main Content ──────────────────────────────────── -->
    <main class="pt-20 pb-24 px-4 sm:px-6 max-w-3xl mx-auto">

      <!-- [A] LOADING STATE -->
      <div v-if="pending" class="flex flex-col items-center justify-center py-36 gap-5">
        <div class="w-16 h-16 bg-surface-container-low dark:bg-zinc-800 rounded-2xl flex items-center justify-center shadow-sm">
          <span class="material-symbols-outlined text-primary animate-spin" style="font-size:32px">progress_activity</span>
        </div>
        <p class="text-sm font-semibold text-outline dark:text-zinc-500">Memuat pertanyaan...</p>
      </div>

      <!-- [B] NOT FOUND -->
      <div v-else-if="!q" class="flex flex-col items-center justify-center py-36 gap-5 text-center">
        <div class="w-20 h-20 bg-surface-container-low dark:bg-zinc-800 rounded-2xl flex items-center justify-center shadow-sm">
          <span class="material-symbols-outlined text-outline/40 dark:text-zinc-600" style="font-size:40px">search_off</span>
        </div>
        <h3 class="text-lg font-extrabold font-headline text-on-surface dark:text-zinc-100">Pertanyaan Tidak Ditemukan</h3>
        <p class="text-sm text-outline dark:text-zinc-500 max-w-xs leading-relaxed">
          Pertanyaan yang antum cari mungkin telah dihapus atau ID-nya tidak valid.
        </p>
        <NuxtLink to="/"
          class="mt-2 inline-flex items-center gap-2 bg-primary text-white text-sm font-bold px-6 py-2.5 rounded-full hover:opacity-90 active:scale-95 transition-[opacity,transform] duration-150">
          <span class="material-symbols-outlined text-base">arrow_back</span>
          Kembali ke Beranda
        </NuxtLink>
      </div>

      <!-- [C] MAIN CONTENT -->
      <template v-else>

        <!-- Meta Row -->
        <div class="flex flex-wrap items-center justify-between gap-3 mb-8 pt-5">
          <div class="flex items-center gap-1.5 text-on-surface-variant dark:text-zinc-400">
            <span class="material-symbols-outlined text-[15px]">{{ categoryIcon }}</span>
            <span class="text-sm font-semibold">{{ categoryLabel }}</span>
            <span class="text-outline/40 dark:text-zinc-600 mx-1">·</span>
            <span class="text-xs text-outline dark:text-zinc-500">{{ formatDateShort(q.created_at) }}</span>
          </div>
        </div>

        <!-- QUESTION BODY -->
        <section class="mb-10">
          <!-- Author -->
          <div class="flex items-center gap-3.5 mb-6">
            <div class="w-11 h-11 rounded-full bg-surface-container dark:bg-zinc-800 flex items-center justify-center shrink-0 ring-2 ring-white dark:ring-zinc-950 shadow-sm">
              <span class="material-symbols-outlined text-on-surface-variant dark:text-zinc-500" style="font-size:22px">account_circle</span>
            </div>
            <div>
              <p class="font-bold text-sm text-on-surface dark:text-zinc-200">Hamba Allah</p>
              <p class="text-xs text-outline dark:text-zinc-500">Diajukan pada {{ formatDate(q.created_at) }}</p>
            </div>
          </div>

          <!-- Title with accent bar -->
          <div class="relative pl-5">
            <div class="absolute left-0 top-0 bottom-0 w-[3px] rounded-full transition-colors duration-500"
              :class="{
                'bg-amber-400': q.status === 'pending',
                'bg-secondary': q.status === 'verified',
                'bg-primary':   q.status === 'answered',
              }">
            </div>
            <h2 class="text-xl sm:text-3xl font-extrabold font-headline text-on-surface dark:text-zinc-100 leading-tight mb-3 md:mb-5 whitespace-pre-line">
              {{ q.question }}
            </h2>
          </div>

          <!-- Upvote + Share -->
          <div v-if="q.status === 'answered'" class="flex items-center gap-6 mt-8 pl-5">
            <!-- <UiUpvoteButton
              :question-id="q.id"
              :initial-count="q.upvotes ?? 0"
              size="sm" /> DISABLED -->
            <button
              @click="handleShare"
              :aria-label="copied ? 'Tautan disalin' : 'Salin tautan'"
              class="relative flex items-center gap-2 group active:scale-95 transition-transform"
            >
              <!-- tooltip: shows on hover, stays visible for 2s after copying -->
              <span
                role="status"
                class="pointer-events-none absolute bottom-full left-0 mb-2 whitespace-nowrap rounded-lg bg-on-surface dark:bg-zinc-100 text-surface dark:text-zinc-900 text-[11px] font-bold px-2.5 py-1 shadow-md transition-opacity duration-150"
                :class="copied ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'"
              >{{ copied ? 'Tautan disalin!' : 'Salin tautan' }}</span>

              <div
                class="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                :class="copied
                  ? 'bg-primary/10'
                  : 'bg-surface-container-low dark:bg-zinc-800 group-hover:bg-surface-container dark:group-hover:bg-zinc-700'"
              >
                <span
                  class="material-symbols-outlined transition-colors"
                  :class="copied ? 'text-primary' : 'text-outline dark:text-zinc-500'"
                >{{ copied ? 'check' : 'share' }}</span>
              </div>
              <span
                class="text-sm font-semibold transition-colors"
                :class="copied ? 'text-primary' : 'text-outline dark:text-zinc-500'"
              >Bagikan</span>
            </button>
          </div>
        </section>

        <!-- STATUS BLOCK -->

        <!-- [1] PENDING -->
        <section v-if="q.status === 'pending'">
          <div class="bg-amber-50/95 md:bg-amber-50/90 dark:bg-amber-900/40 dark:md:bg-amber-900/20 md:backdrop-blur-md border border-amber-200/70 dark:border-amber-800/50 rounded-3xl p-5 md:p-10 relative overflow-hidden">
            <div class="absolute -right-6 -top-6 opacity-[0.07] pointer-events-none">
              <span class="material-symbols-outlined text-amber-600" style="font-size:160px">shield_person</span>
            </div>
            <div class="absolute -left-4 -bottom-4 opacity-[0.04] pointer-events-none">
              <span class="material-symbols-outlined text-amber-600" style="font-size:120px">pending_actions</span>
            </div>
            <div class="relative z-10 flex flex-col items-center text-center">
              <div class="w-14 h-14 md:w-[72px] md:h-[72px] bg-white dark:bg-zinc-900 rounded-2xl shadow-md flex items-center justify-center mb-4 md:mb-6 rotate-3">
                <span class="material-symbols-outlined text-amber-500 animate-pulse !text-[28px] md:!text-[36px]"
                  style="font-variation-settings:'FILL' 1">lock_person</span>
              </div>
              <h4 class="text-lg md:text-xl font-extrabold font-headline text-amber-900 dark:text-amber-400 mb-2">
                Moderasi Sedang Berlangsung
              </h4>
              <p class="text-amber-800/70 dark:text-amber-500 max-w-sm mx-auto leading-relaxed text-xs md:text-sm mb-5 md:mb-8">
                Pertanyaan antum saat ini sedang dalam antrean moderasi oleh tim admin kami.
                Terima kasih atas kesabaran Anda.
              </p>
              <div class="grid grid-cols-2 gap-2 md:gap-3 w-full max-w-xs">
                <div class="p-3 md:p-4 bg-white/80 dark:bg-zinc-800/80 rounded-2xl flex flex-col items-center gap-1.5 border border-amber-100 dark:border-amber-900/50">
                  <span class="material-symbols-outlined text-amber-500 !text-[18px] md:!text-[22px]">pending_actions</span>
                  <span class="text-[9px] uppercase font-bold tracking-widest text-amber-700/60 dark:text-amber-600">Status</span>
                  <span class="text-xs font-bold text-amber-900 dark:text-amber-400">Dalam Antrean</span>
                </div>
                <div class="p-3 md:p-4 bg-white/80 dark:bg-zinc-800/80 rounded-2xl flex flex-col items-center gap-1.5 border border-amber-100 dark:border-amber-900/50">
                  <span class="material-symbols-outlined text-amber-500 !text-[18px] md:!text-[22px]">help_center</span>
                  <span class="text-[9px] uppercase font-bold tracking-widest text-amber-700/60 dark:text-amber-600">Bantuan</span>
                  <span class="text-xs font-bold text-amber-900 dark:text-amber-400">Lihat FAQ</span>
                </div>
              </div>
            </div>
          </div>
          <div class="mt-4 md:mt-5 flex items-start gap-3 px-1">
            <div class="w-[3px] self-stretch bg-amber-200 dark:bg-amber-800 rounded-full shrink-0 mt-0.5"></div>
            <p class="text-xs text-outline/80 dark:text-white leading-relaxed italic">
              Proses moderasi biasanya membutuhkan waktu 1–3 hari kerja. antum akan mendapat notifikasi
              setelah pertanyaan lolos verifikasi.
            </p>
          </div>
        </section>

        <!-- [2] VERIFIED -->
        <section v-else-if="q.status === 'verified'">
          <div class="bg-surface-container-low/95 md:bg-surface-container-low/90 dark:bg-zinc-900/95 dark:md:bg-zinc-900/80 md:backdrop-blur-md border border-white/60 dark:border-zinc-800 rounded-3xl p-5 md:p-10 relative overflow-hidden">
            <div class="absolute -right-8 -top-8 opacity-[0.05] pointer-events-none">
              <span class="material-symbols-outlined" style="font-size:160px">mosque</span>
            </div>
            <div class="relative z-10 flex flex-col items-center text-center">
              <div class="w-14 h-14 md:w-[72px] md:h-[72px] bg-white dark:bg-zinc-800 rounded-2xl shadow-sm flex items-center justify-center mb-4 md:mb-6 -rotate-2">
                <span class="material-symbols-outlined text-primary animate-pulse !text-[28px] md:!text-[36px]">hourglass_empty</span>
              </div>
              <h4 class="text-lg md:text-xl font-extrabold font-headline text-on-surface dark:text-zinc-100 mb-2">
                Menunggu Jawaban Ustadz
              </h4>
              <p class="text-on-surface-variant dark:text-zinc-400 max-w-sm mx-auto leading-relaxed text-xs md:text-sm mb-5 md:mb-8">
                Pertanyaan antum telah
                <UiShinyText
                  text="Terverifikasi"
                  :speed="2"
                  :delay="0"
                  color="#059669"
                  shine-color="#00FF7F"
                :spread="120"
                direction="left"
                :yoyo="false"
                :pause-on-hover="false"
              />
                oleh tim admin kami dan saat ini berada dalam antrean untuk dijawab oleh Ustadz pilihan.
              </p>
              <div class="grid grid-cols-3 gap-2 md:gap-3 w-full">
                <div v-for="item in [
                  {icon:'fact_check', label:'Status', val:'Tervalidasi'},
                  {icon:'group', label:'Antrean', val:'Sesuai Urutan'},
                  {icon:'notifications_active', label:'Notifikasi', val:'Akan Dikirim'},
                ]" :key="item.label"
                  class="p-2.5 md:p-3.5 bg-white/70 dark:bg-zinc-800/70 rounded-2xl flex flex-col items-center gap-1.5">
                  <span class="material-symbols-outlined text-primary !text-[18px] md:!text-[22px]">{{ item.icon }}</span>
                  <span class="text-[9px] uppercase font-bold tracking-widest text-outline dark:text-zinc-500">{{ item.label }}</span>
                  <span class="text-[11px] md:text-xs font-bold dark:text-zinc-300">{{ item.val }}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- [3] ANSWERED -->
        <section v-else-if="q.status === 'answered'">
          <article class="relative bg-surface-container-lowest/95 md:bg-surface-container-lowest/85 dark:bg-zinc-900/95 dark:md:bg-zinc-900/85 md:backdrop-blur-md rounded-3xl overflow-hidden
                          shadow-[0px_16px_48px_rgba(20,28,43,0.08)] dark:shadow-[0px_16px_48px_rgba(0,0,0,0.4)] border border-outline-variant/10 dark:border-zinc-800">
            <div class="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
            <div class="p-4 md:p-10 pl-5 md:pl-11">
              <!-- Ustadz Header -->
<div 
  :class="{ 'opacity-60 cursor-not-allowed': !q?.answered_by_profile?.id }"
  @click="navigateToUstadz(q?.answered_by_profile?.id)"
  class="flex flex-col sm:flex-row sm:items-center gap-3 md:gap-4 mb-5 md:mb-8 pb-5 md:pb-7 border-b border-outline-variant/10 dark:border-zinc-800 hover:bg-surface-container-low/30 dark:hover:bg-zinc-800/30 transition-colors duration-200 rounded-2xl p-3 md:p-4 -mx-3 md:-mx-4 cursor-pointer group"
>
  <div class="w-12 h-12 md:w-16 md:h-16 rounded-2xl shadow-sm shrink-0 overflow-hidden bg-primary/10 flex items-center justify-center group-hover:ring-2 group-hover:ring-primary/30 transition-shadow">
    <img 
      v-if="q?.answered_by_profile?.avatar_url && q?.answered_by_profile?.avatar_url.length > 15"
      :src="q.answered_by_profile.avatar_url"
      :alt="`Avatar ${q.answered_by_profile?.full_name}`"
      class="w-full h-full object-cover"
      @error="(e) => handleAvatarError(e, ustadzAvatar.avatarUrl)"
    />
    <span v-else class="text-white font-bold text-xl md:text-2xl">
      {{ ustadzAvatar.initial }}
    </span>
  </div>

  <div class="flex-1 min-w-0">
    <h3 class="font-headline font-bold text-base md:text-xl text-primary leading-tight group-hover:text-primary-fixed transition-colors">
      Dijawab oleh Ustadz {{ q?.answered_by_profile?.full_name ?? 'Ustadz Tidak Diketahui' }}
    </h3>
    <p class="text-xs md:text-sm text-outline dark:text-zinc-500 mt-0.5 group-hover:text-on-surface-variant transition-colors">Ustadz Ahli</p>
  </div>

  <div class="shrink-0 flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 px-2.5 py-1 md:px-3 md:py-1.5 rounded-lg self-start sm:self-center group-hover:bg-primary/10 group-hover:border-primary/30 transition-colors">
    <span class="material-symbols-outlined text-primary group-hover:text-primary-fixed transition-colors" style="font-size:15px; font-variation-settings:'FILL' 1">verified</span>
    <span class="text-[10px] font-extrabold text-primary uppercase tracking-widest group-hover:text-primary-fixed transition-colors">Terverifikasi</span>
  </div>
</div>

              <!-- Answer content -->
              <div class="prose prose-sm sm:prose-base max-w-none text-on-surface dark:text-zinc-200 font-body leading-relaxed text-lg
                          prose-strong:text-on-surface dark:prose-strong:text-zinc-100
                          prose-em:text-on-surface-variant dark:prose-em:text-zinc-400
                          prose-blockquote:border-l-4 prose-blockquote:border-emerald-200 dark:prose-blockquote:border-emerald-800
                          prose-blockquote:bg-surface-container-low dark:prose-blockquote:bg-zinc-800 prose-blockquote:px-4 md:prose-blockquote:px-6 prose-blockquote:py-3 md:prose-blockquote:py-4
                          prose-blockquote:rounded-r-2xl prose-blockquote:text-on-surface-variant prose-blockquote:italic prose-blockquote:my-5 md:prose-blockquote:my-8
                          prose-ol:pl-5 prose-li:leading-relaxed prose-p:mb-4 whitespace-pre-line"
                v-html="q.answer">
              </div>

              <!-- Date footer -->
              <div class="mt-5 md:mt-8 pt-4 md:pt-6 border-t border-outline-variant/10 dark:border-zinc-800 flex items-center gap-2 text-outline dark:text-zinc-500">
                <span class="material-symbols-outlined" style="font-size:15px">calendar_today</span>
                <span class="text-xs">Dijawab pada {{ formatDate(q.created_at) }}</span>
              </div>
            </div>
          </article>
        </section>

        <!-- FOOTER -->
        <footer class="mt-20 pt-10 border-t border-outline-variant/15 dark:border-zinc-800 text-center">
          <p class="max-w-md mx-auto italic text-on-surface-variant/50 dark:text-white font-body text-sm mb-6 px-4 leading-relaxed">
            "Sesungguhnya amalan yang paling dicintai Allah adalah amalan yang berkelanjutan (istiqomah) walaupun sedikit."
            <span class="not-italic font-semibold text-outline dark:text-white">(HR. Muslim)</span>
          </p>
          <div class="flex flex-col sm:flex-row justify-between items-center gap-3 text-outline dark:text-white text-[10px] uppercase tracking-widest font-bold">
            <p>© 2026 Ahsan TV. All Rights Reserved by Team IT</p>
            <div class="flex gap-5">
              <NuxtLink to="/kebijakan" class="hover:text-primary transition-colors">Kebijakan Privasi</NuxtLink>
            </div>
            <div class="flex gap-5">
              <NuxtLink to="/terms" class="hover:text-primary transition-colors">Syarat & Ketentuan</NuxtLink>
            </div>
          </div>
        </footer>

      </template>
    </main>
    </div>
  </div>
</template>

<style scoped>
.prose blockquote p { margin: 0; }
</style>