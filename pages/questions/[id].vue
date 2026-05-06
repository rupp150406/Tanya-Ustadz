<script setup>
import { computed, onMounted } from 'vue'
import { useQuestions } from '~/composables/useQuestions'
import UiThemeToggle from '~/components/ui/ThemeToggle.vue'
// import UiUpvoteButton from '~/components/ui/UpvoteButton.vue' // DISABLED

// ─── Theme ────────────────────────────────────────────────────
const { initTheme } = useTheme()
onMounted(async () => {
  initTheme()
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

// ─── Upvote (optimistic local toggle) ────────────────────────
const upvoted = ref(false)
const localUpvotes = computed(() => (q.value?.upvotes ?? 0) + (upvoted.value ? 1 : 0))
function toggleUpvote() { upvoted.value = !upvoted.value }

// ─── Avatar Error Handler ───────────────────────────────────
function handleAvatarError(event) {
  const img = event.target
  img.style.display = 'none'
}

// ─── Share Function ─────────────────────────────────────────
async function handleShare() {
  try {
    const url = window.location.href
    await navigator.clipboard.writeText(url)
    // You could add a toast notification here if needed
    console.log('Link copied to clipboard:', url)
  } catch (err) {
    // Fallback for older browsers
    const url = window.location.href
    const textArea = document.createElement('textarea')
    textArea.value = url
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
    console.log('Link copied to clipboard (fallback):', url)
  }
}

</script>

<template>
  <div class="min-h-screen bg-surface dark:bg-zinc-950 font-body text-on-surface dark:text-zinc-100 antialiased transition-colors duration-300">

    <!-- ── Fixed Header ──────────────────────────────────── -->
    <header class="fixed top-0 w-full z-50 bg-surface/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-outline-variant/10 dark:border-zinc-800 transition-colors duration-300">
      <div class="flex items-center gap-3 px-4 sm:px-6 py-3.5 max-w-3xl mx-auto">
        <NuxtLink to="/"
          class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container dark:hover:bg-zinc-800 transition-colors active:scale-90 duration-150 shrink-0">
          <span class="material-symbols-outlined text-on-surface dark:text-zinc-300" style="font-size:20px">arrow_back</span>
        </NuxtLink>

        <h1 class="text-base font-extrabold tracking-tight text-emerald-900 dark:text-emerald-400 font-headline flex-1 truncate">
          Tanya Ustadz
        </h1>

        <!-- Theme Toggle -->
        <UiThemeToggle />

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

        <!-- Ticket ID -->
        <span v-if="q" class="text-[10px] font-bold uppercase tracking-wider text-outline dark:text-zinc-500 bg-surface-container dark:bg-zinc-800 px-2.5 py-1 rounded-full shrink-0">
          #{{ getTicketId(q.id) }}
        </span>
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
          class="mt-2 inline-flex items-center gap-2 bg-primary text-white text-sm font-bold px-6 py-2.5 rounded-full hover:opacity-90 active:scale-95 transition-all duration-150">
          <span class="material-symbols-outlined text-base">arrow_back</span>
          Kembali ke Beranda
        </NuxtLink>
      </div>

      <!-- [C] MAIN CONTENT -->
      <template v-else>

        <!-- Meta Row -->
        <div class="flex flex-wrap items-center justify-between gap-3 mb-8 pt-5">
          <div class="flex items-center gap-1.5 text-on-surface-variant dark:text-zinc-400">
            <span class="material-symbols-outlined text-[15px]">category</span>
            <span class="text-sm font-semibold">Umum</span>
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
            <h2 class="text-[1.5rem] sm:text-3xl font-extrabold font-headline text-on-surface dark:text-zinc-100 leading-tight mb-5 whitespace-pre-line">
              {{ q.question }}
            </h2>
          </div>

          <!-- Upvote + Share -->
          <div v-if="q.status === 'answered'" class="flex items-center gap-6 mt-8 pl-5">
            <!-- <UiUpvoteButton
              :question-id="q.id"
              :initial-count="q.upvotes ?? 0"
              size="sm" /> DISABLED -->
            <button @click="handleShare" class="flex items-center gap-2 group active:scale-95 transition-transform">
              <div class="w-10 h-10 rounded-full bg-surface-container-low dark:bg-zinc-800 group-hover:bg-surface-container dark:group-hover:bg-zinc-700 flex items-center justify-center transition-colors">
                <span class="material-symbols-outlined text-outline dark:text-zinc-500">share</span>
              </div>
              <span class="text-sm font-semibold text-outline dark:text-zinc-500">Bagikan</span>
            </button>
          </div>
        </section>

        <!-- STATUS BLOCK -->

        <!-- [1] PENDING -->
        <section v-if="q.status === 'pending'">
          <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200/70 dark:border-amber-800/50 rounded-3xl p-8 md:p-10 relative overflow-hidden">
            <div class="absolute -right-6 -top-6 opacity-[0.07] pointer-events-none">
              <span class="material-symbols-outlined text-amber-600" style="font-size:160px">shield_person</span>
            </div>
            <div class="absolute -left-4 -bottom-4 opacity-[0.04] pointer-events-none">
              <span class="material-symbols-outlined text-amber-600" style="font-size:120px">pending_actions</span>
            </div>
            <div class="relative z-10 flex flex-col items-center text-center">
              <div class="w-[72px] h-[72px] bg-white dark:bg-zinc-900 rounded-2xl shadow-md flex items-center justify-center mb-6 rotate-3">
                <span class="material-symbols-outlined text-amber-500 animate-pulse"
                  style="font-size:36px; font-variation-settings:'FILL' 1">lock_person</span>
              </div>
              <h4 class="text-xl font-extrabold font-headline text-amber-900 dark:text-amber-400 mb-2">
                Moderasi Sedang Berlangsung
              </h4>
              <p class="text-amber-800/70 dark:text-amber-500 max-w-sm mx-auto leading-relaxed text-sm mb-8">
                Pertanyaan antum saat ini sedang dalam antrean moderasi oleh tim admin kami.
                Terima kasih atas kesabaran Anda.
              </p>
              <div class="grid grid-cols-2 gap-3 w-full max-w-xs">
                <div class="p-4 bg-white/80 dark:bg-zinc-800/80 rounded-2xl flex flex-col items-center gap-1.5 border border-amber-100 dark:border-amber-900/50">
                  <span class="material-symbols-outlined text-amber-500" style="font-size:22px">pending_actions</span>
                  <span class="text-[9px] uppercase font-bold tracking-widest text-amber-700/60 dark:text-amber-600">Status</span>
                  <span class="text-xs font-bold text-amber-900 dark:text-amber-400">Dalam Antrean</span>
                </div>
                <div class="p-4 bg-white/80 dark:bg-zinc-800/80 rounded-2xl flex flex-col items-center gap-1.5 border border-amber-100 dark:border-amber-900/50">
                  <span class="material-symbols-outlined text-amber-500" style="font-size:22px">help_center</span>
                  <span class="text-[9px] uppercase font-bold tracking-widest text-amber-700/60 dark:text-amber-600">Bantuan</span>
                  <span class="text-xs font-bold text-amber-900 dark:text-amber-400">Lihat FAQ</span>
                </div>
              </div>
            </div>
          </div>
          <div class="mt-5 flex items-start gap-3 px-1">
            <div class="w-[3px] self-stretch bg-amber-200 dark:bg-amber-800 rounded-full shrink-0 mt-0.5"></div>
            <p class="text-xs text-outline/80 dark:text-zinc-500 leading-relaxed italic">
              Proses moderasi biasanya membutuhkan waktu 1–3 hari kerja. antum akan mendapat notifikasi
              setelah pertanyaan lolos verifikasi.
            </p>
          </div>
        </section>

        <!-- [2] VERIFIED -->
        <section v-else-if="q.status === 'verified'">
          <div class="bg-surface-container-low dark:bg-zinc-900 border border-white/60 dark:border-zinc-800 rounded-3xl p-8 md:p-10 relative overflow-hidden">
            <div class="absolute -right-8 -top-8 opacity-[0.05] pointer-events-none">
              <span class="material-symbols-outlined" style="font-size:160px">mosque</span>
            </div>
            <div class="relative z-10 flex flex-col items-center text-center">
              <div class="w-[72px] h-[72px] bg-white dark:bg-zinc-800 rounded-2xl shadow-sm flex items-center justify-center mb-6 -rotate-2">
                <span class="material-symbols-outlined text-primary animate-pulse" style="font-size:36px">hourglass_empty</span>
              </div>
              <h4 class="text-xl font-extrabold font-headline text-on-surface dark:text-zinc-100 mb-2">
                Menunggu Jawaban Ustadz
              </h4>
              <p class="text-on-surface-variant dark:text-zinc-400 max-w-sm mx-auto leading-relaxed text-sm mb-8">
                Pertanyaan antum telah
                <span class="text-primary font-bold">Terverifikasi</span>
                oleh tim admin kami dan saat ini berada dalam antrean untuk dijawab oleh Ustadz pilihan.
              </p>
              <div class="grid grid-cols-3 gap-3 w-full">
                <div v-for="item in [
                  {icon:'fact_check', label:'Status', val:'Tervalidasi'},
                  {icon:'group', label:'Antrean', val:'Sesuai Urutan'},
                  {icon:'notifications_active', label:'Notifikasi', val:'Akan Dikirim'},
                ]" :key="item.label"
                  class="p-3.5 bg-white/70 dark:bg-zinc-800/70 rounded-2xl flex flex-col items-center gap-1.5">
                  <span class="material-symbols-outlined text-primary" style="font-size:22px">{{ item.icon }}</span>
                  <span class="text-[9px] uppercase font-bold tracking-widest text-outline dark:text-zinc-500">{{ item.label }}</span>
                  <span class="text-xs font-bold dark:text-zinc-300">{{ item.val }}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- [3] ANSWERED -->
        <section v-else-if="q.status === 'answered'">
          <article class="relative bg-surface-container-lowest dark:bg-zinc-900 rounded-3xl overflow-hidden
                          shadow-[0px_16px_48px_rgba(20,28,43,0.08)] dark:shadow-[0px_16px_48px_rgba(0,0,0,0.4)] border border-outline-variant/10 dark:border-zinc-800">
            <div class="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
            <div class="p-7 md:p-10 pl-8 md:pl-11">
              <!-- Ustadz Header -->
              <div class="flex flex-col sm:flex-row sm:items-center gap-4 mb-8 pb-7 border-b border-outline-variant/10 dark:border-zinc-800">
                <div class="w-16 h-16 rounded-2xl shadow-sm shrink-0 overflow-hidden bg-primary/10 flex items-center justify-center">
                  <!-- Display actual avatar if available, fallback to initial -->
                  <img 
                    v-if="q.answered_by_profile?.avatar_url && q.answered_by_profile?.avatar_url.length > 15"
                    :src="q.answered_by_profile.avatar_url"
                    :alt="`Avatar ${q.answered_by_profile.full_name}`"
                    class="w-full h-full object-cover"
                    @error="handleAvatarError"
                  />
                  <span v-else class="text-white font-bold text-2xl">
                    {{ q.answered_by_profile?.full_name?.charAt(0)?.toUpperCase() ?? 'U' }}
                  </span>
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="font-headline font-bold text-xl text-primary leading-tight">
                    Dijawab oleh Ustadz {{ q.answered_by_profile?.full_name ?? 'Ustadz Tidak Diketahui' }}
                  </h3>
                  <p class="text-sm text-outline dark:text-zinc-500 mt-0.5">Ustadz Ahli</p>
                </div>
                <div class="shrink-0 flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 px-3 py-1.5 rounded-lg self-start sm:self-center">
                  <span class="material-symbols-outlined text-primary" style="font-size:15px; font-variation-settings:'FILL' 1">verified</span>
                  <span class="text-[10px] font-extrabold text-primary uppercase tracking-widest">Terverifikasi</span>
                </div>
              </div>

              <!-- Answer content -->
              <div class="prose prose-sm sm:prose-base max-w-none text-on-surface dark:text-zinc-200 font-body leading-relaxed text-lg
                          prose-strong:text-on-surface dark:prose-strong:text-zinc-100
                          prose-em:text-on-surface-variant dark:prose-em:text-zinc-400
                          prose-blockquote:border-l-4 prose-blockquote:border-emerald-200 dark:prose-blockquote:border-emerald-800
                          prose-blockquote:bg-surface-container-low dark:prose-blockquote:bg-zinc-800 prose-blockquote:px-6 prose-blockquote:py-4
                          prose-blockquote:rounded-r-2xl prose-blockquote:text-on-surface-variant prose-blockquote:italic prose-blockquote:my-8
                          prose-ol:pl-5 prose-li:leading-relaxed prose-p:mb-4 whitespace-pre-line"
                v-html="q.answer">
              </div>

              <!-- Date footer -->
              <div class="mt-8 pt-6 border-t border-outline-variant/10 dark:border-zinc-800 flex items-center gap-2 text-outline dark:text-zinc-500">
                <span class="material-symbols-outlined" style="font-size:15px">calendar_today</span>
                <span class="text-xs">Dijawab pada {{ formatDate(q.created_at) }}</span>
              </div>
            </div>
          </article>
        </section>

        <!-- FOOTER -->
        <footer class="mt-20 pt-10 border-t border-outline-variant/15 dark:border-zinc-800 text-center">
          <p class="max-w-md mx-auto italic text-on-surface-variant/50 dark:text-zinc-600 font-body text-sm mb-6 px-4 leading-relaxed">
            "Sesungguhnya amalan yang paling dicintai Allah adalah amalan yang berkelanjutan (istiqomah) walaupun sedikit."
            <span class="not-italic font-semibold text-outline dark:text-zinc-500">(HR. Muslim)</span>
          </p>
          <div class="flex flex-col sm:flex-row justify-between items-center gap-3 text-outline dark:text-zinc-600 text-[10px] uppercase tracking-widest font-bold">
            <p>© 2026 Ahsan TV. All Rights Reserved by Team IT</p>
            <div class="flex gap-5">
              <NuxtLink to="/kebijakan" class="hover:text-primary transition-colors">Kebijakan Privasi</NuxtLink>
            </div>
          </div>
        </footer>

      </template>
    </main>

    <!-- Ambient Background -->
    <div class="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
      <div class="absolute top-[-15%] right-[-10%] w-[55%] h-[55%] rounded-full blur-[130px] transition-colors duration-700"
        :class="{
          'bg-amber-500/5': q?.status === 'pending',
          'bg-primary/5':   q?.status === 'verified' || q?.status === 'answered',
        }">
      </div>
      <div class="absolute bottom-[-10%] left-[-10%] w-[45%] h-[45%] rounded-full blur-[110px] transition-colors duration-700"
        :class="{
          'bg-amber-300/5':            q?.status === 'pending',
          'bg-secondary-container/10 dark:bg-primary/5': q?.status !== 'pending',
        }">
      </div>
    </div>

  </div>
</template>

<style scoped>
.prose blockquote p { margin: 0; }
</style>