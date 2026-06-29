<script setup lang="ts">
// ============================================================
// PROJECT : TANYA USTADZ V3
// FILE    : pages/ustadz/dashboard.vue
// ROLE    : Ustadz dashboard
// ============================================================

definePageMeta({
  middleware: ['gate-guard', 'auth'],
})

import type { Question, QuestionStatus } from '~/composables/useQuestions'
import UiThemeToggle from '~/components/ui/ThemeToggle.vue'

interface Profile {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
  role: 'admin_it' | 'ustadz' | null
  created_at?: string
}

type TabId = 'all' | QuestionStatus
interface Tab { id: TabId; label: string; icon: string }

// ── Theme ────────────────────────────────────────────────────
const { initTheme } = useTheme()

// ── Composables ──────────────────────────────────────────────
const supabase = useSupabaseClient()
const user     = useSupabaseUser()
const router   = useRouter()
const { initFCM } = useFCM()

const {
  questions,
  pending         : questionsPending,
  searchQuery,
  fetchForUstadz,
  updateInList,
  subscribeRealtime,
  unsubscribeRealtime,
} = useQuestions()

const isLoading            = ref(true)
const hasCriticalError     = ref(false)
const criticalErrorMessage = ref('')
const profile              = ref<Profile | null>(null)
const gateAccess           = useCookie('gate_access')
const activeTab            = ref<TabId>('all')
const answerDrafts         = ref<Record<string, string>>({})
let _searchTimer: ReturnType<typeof setTimeout> | null = null
const stats = reactive({ totalAnswered: 0, readyCount: 0 })
const isEditing = ref(false)
const editName  = ref('')
let _initialLoadDone = false

const tabs: Tab[] = [
  { id: 'all',      label: 'Semua',        icon: 'list'         },
  { id: 'verified', label: 'Siap Dijawab', icon: 'verified'     },
  { id: 'answered', label: 'Terjawab',     icon: 'check_circle' },
]

const filteredQuestions = computed<Question[]>(() => {
  let list = questions.value
  if (activeTab.value !== 'all') list = list.filter(q => q.status === activeTab.value)
  const term = searchQuery.value.trim().toLowerCase()
  if (term) list = list.filter(q =>
    q.question.toLowerCase().includes(term) ||
    (q.category?.toLowerCase().includes(term) ?? false)
  )
  return list
})

const countByStatus = computed(() => {
  const map: Record<string, number> = {}
  for (const q of questions.value) map[q.status] = (map[q.status] ?? 0) + 1
  return map
})

function defaultAvatar(name: string | null) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name ?? 'Ustadz')}&background=259869&color=ffffff&size=160`
}
function onAvatarError(event: Event) {
  (event.target as HTMLImageElement).src = defaultAvatar(profile.value?.full_name ?? null)
}
function formatDate(iso: string | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}
function formatTime(d: Date) {
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

const STATUS_META: Record<QuestionStatus, { label: string }> = {
  pending:  { label: 'Menunggu Moderasi' },
  verified: { label: 'Siap Dijawab'      },
  answered: { label: 'Terjawab'          },
  rejected: { label: 'Ditolak'           },
}

async function loadOrCreateProfile(confirmedUser: NonNullable<typeof user.value>) {
  const { data, error: selectError } = await supabase
    .from('profiles').select('id, full_name, email, avatar_url, role, created_at')
    .eq('id', confirmedUser.id).single()
  if (!selectError && data) { profile.value = data as Profile; return }
  if (selectError?.code === 'PGRST116') {
    const payload = {
      id: confirmedUser.id,
      full_name: confirmedUser.user_metadata?.full_name ?? confirmedUser.email?.split('@')[0] ?? 'Ustadz',
      email: confirmedUser.email ?? null,
      avatar_url: confirmedUser.user_metadata?.avatar_url ?? confirmedUser.user_metadata?.picture ?? null,
      role: 'ustadz',
    }
    profile.value = await $fetch<Profile>('/api/admin/profile/upsert', { method: 'POST', body: payload })
    return
  }
  throw new Error(selectError?.message ?? 'Gagal memuat profil.')
}

function computeStats() {
  stats.totalAnswered = questions.value.filter(q => q.status === 'answered').length
  stats.readyCount    = questions.value.filter(q => q.status === 'verified').length
}

async function runFullLoad(currentUser: any) {
  isLoading.value = true; hasCriticalError.value = false
  try {
    if (!currentUser?.id) throw new Error('ID Pengguna tidak ditemukan.')
    await loadOrCreateProfile(currentUser)
    if (profile.value?.role?.toLowerCase() !== 'ustadz') {
      await navigateTo('/login-gate')
      throw new Error('Akses ditolak: Hanya Ustadz yang dapat mengakses dashboard ini.')
    }
    await fetchForUstadz(); computeStats(); subscribeRealtime('ustadz')
  } catch (err: unknown) {
    hasCriticalError.value = true
    criticalErrorMessage.value = err instanceof Error ? err.message : 'Terjadi kesalahan tidak terduga.'
  } finally { isLoading.value = false }
}

async function forceGetAuthUser() {
  if (_initialLoadDone) return
  if (user.value?.id) { await runFullLoad(user.value); _initialLoadDone = true; return }
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.user?.id) { await runFullLoad(session.user); _initialLoadDone = true; return }
  throw new Error('Tidak dapat menemukan sesi pengguna yang valid.')
}

watch(user, async (newUser) => { if (newUser?.id && !_initialLoadDone) await forceGetAuthUser() }, { immediate: true })

onMounted(async () => {
  initTheme()
  initFCM('ustadz')
  try { await forceGetAuthUser() } catch {
    setTimeout(async () => {
      try { await forceGetAuthUser() } catch {
        isLoading.value = false; hasCriticalError.value = true
        criticalErrorMessage.value = 'Sesi login tidak terdeteksi. Silakan login ulang.'
      }
    }, 1000)
  }
})

watch(questions, () => computeStats(), { deep: false })
onUnmounted(() => unsubscribeRealtime())

async function submitAnswer(id: string) {
  const draft = (answerDrafts.value[id] ?? '').trim()
  if (!draft) return
  try {
    await $fetch('/api/ustadz/answer', { method: 'POST', body: { question_id: id, answer: draft } })
    updateInList(id, {
      status: 'answered', answer: draft,
      answered_at: new Date().toISOString(), answered_by: user.value?.id || null,
      answered_by_profile: { full_name: profile.value?.full_name || null, avatar_url: profile.value?.avatar_url || null },
    })
    delete answerDrafts.value[id]; computeStats()
  } catch (err: any) {
    alert('Gagal mengirim jawaban: ' + (err.data?.message ?? err.message ?? 'Terjadi kesalahan.'))
  }
}

function handleSearch(event: Event) {
  searchQuery.value = (event.target as HTMLInputElement).value
  if (_searchTimer) clearTimeout(_searchTimer)
  _searchTimer = setTimeout(() => fetchForUstadz(), 300)
}

function handleAvatarError(event) {
  const img = event.target
  img.style.display = 'none'
}

async function handleLogout() {
  try {
    unsubscribeRealtime(); await supabase.auth.signOut()
    const globalProfile = useState('user-profile')
    globalProfile.value = null; profile.value = null; gateAccess.value = null
    questions.value = []; answerDrafts.value = {}; stats.totalAnswered = 0; stats.readyCount = 0
    _initialLoadDone = false; await router.replace('/login-gate')
  } catch { await router.replace('/login-gate') }
}

async function retryLoad() {
  hasCriticalError.value = false; criticalErrorMessage.value = ''; _initialLoadDone = false; isLoading.value = true
  if (user.value) await runFullLoad(user.value)
}

function startEditing() { if (!profile.value) return; isEditing.value = true; editName.value = profile.value.full_name ?? '' }
function cancelEditing() { isEditing.value = false; editName.value = '' }

async function handleUpdateProfile() {
  if (!profile.value || !editName.value.trim()) return
  try {
    const { error } = await supabase.from('profiles').update({ full_name: editName.value.trim() } as Partial<Profile>).eq('id', profile.value.id).single()
    if (error) throw error
    profile.value.full_name = editName.value.trim()
    const globalProfile = useState('user-profile')
    if (globalProfile.value && typeof globalProfile.value === 'object') (globalProfile.value as any).full_name = editName.value.trim()
    isEditing.value = false
  } catch (err) { console.error('[Ustadz Dashboard] Update profile error:', err) }
}
</script>

<template>
  <div class="text-on-surface dark:text-zinc-100 antialiased min-h-screen bg-surface dark:bg-zinc-950 transition-colors duration-300">

    <!-- ══ TOP APP BAR ══════════════════════════════════════════ -->
    <header class="bg-surface/80 dark:bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50 border-b border-outline-variant/10 dark:border-zinc-800 shadow-sm">
      <div class="flex items-center justify-between px-5 md:px-10 py-3 max-w-7xl mx-auto">
        <NuxtLink to="/" class="text-2xl font-bold tracking-tighter text-emerald-800 dark:text-emerald-400 font-headline">
          Tanya Ustadz
        </NuxtLink>
        <div class="flex items-center gap-3">
          <!-- Theme Toggle -->
          <UiThemeToggle />
          <span v-if="profile" class="px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-extrabold uppercase tracking-widest">
            {{ profile.role ?? 'User' }}
          </span>
        </div>
      </div>
    </header>

    <main class="pt-4">

      <!-- Loading -->
      <div v-if="isLoading" class="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <span class="material-symbols-outlined text-5xl animate-spin text-primary">sync</span>
        <p class="text-on-surface-variant dark:text-zinc-400 font-medium">Memuat dashboard…</p>
      </div>

      <!-- Critical Error -->
      <div v-else-if="hasCriticalError" class="flex items-center justify-center min-h-[60vh] px-5">
        <div class="text-center max-w-md w-full">
          <span class="material-symbols-outlined text-6xl text-error mb-4 block">error</span>
          <h2 class="text-on-surface dark:text-zinc-100 text-xl font-bold mb-2">Gagal Memuat Dashboard</h2>
          <p class="text-on-surface-variant dark:text-zinc-400 text-sm mb-6">{{ criticalErrorMessage }}</p>
          <div class="bg-surface-container-low dark:bg-zinc-900 p-4 rounded-2xl text-left mb-6 border dark:border-zinc-800">
            <p class="text-xs font-bold text-on-surface dark:text-zinc-200 mb-2">Kemungkinan Penyebab:</p>
            <ul class="text-xs text-on-surface-variant dark:text-zinc-400 space-y-1 list-disc list-inside">
              <li>Role akun antum bukan <code>ustadz</code> di tabel <code>profiles</code></li>
              <li>RLS Supabase mencegah UPSERT pada tabel <code>profiles</code></li>
              <li>Server API <code>/api/admin/profile/upsert</code> belum dibuat</li>
              <li>Masalah koneksi jaringan sementara</li>
            </ul>
          </div>
          <button class="px-8 py-3 bg-primary text-on-primary rounded-2xl font-bold text-sm hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95" @click="retryLoad">
            Coba Lagi
          </button>
        </div>
      </div>

      <!-- Dashboard Content -->
      <div v-else-if="profile" class="px-5 py-8 md:p-10 max-w-7xl mx-auto space-y-12">

        <!-- Hero -->
        <section class="text-center md:text-left">
          <h1 class="font-extrabold text-3xl md:text-4xl text-on-surface dark:text-zinc-100 tracking-tight mb-2">Dashboard Ustadz</h1>
          <p class="text-on-surface-variant dark:text-zinc-400 text-base md:text-lg">Jawab pertanyaan ummat dan kelola profil antum di Tanya Ustadz V3.</p>
        </section>

        <!-- Profile + Stats -->
        <section class="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start">

          <!-- Left: Identity card -->
          <div class="lg:col-span-8 space-y-6">
            <div class="bg-surface-container-lowest dark:bg-zinc-900 rounded-3xl p-6 md:p-8 shadow-sm dark:shadow-none relative overflow-hidden group border border-transparent dark:border-zinc-800">
              <div class="absolute top-0 right-0 w-64 h-64 bg-primary-container/5 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none group-hover:bg-primary-container/10 transition-all" />
              <div class="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8 relative z-10">
                <!-- Avatar -->
                <div class="w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-surface dark:border-zinc-950 ring-4 ring-primary-fixed dark:ring-primary/40 shadow-xl shrink-0">
                  <img :src="profile.avatar_url || defaultAvatar(profile.full_name)" :alt="`Avatar ${profile.full_name}`" class="w-full h-full object-cover" @error="onAvatarError" />
                </div>
                <!-- Info -->
                <div class="flex-1 text-center md:text-left">
                  <div class="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mb-2">
                    <h2 class="font-bold text-2xl md:text-3xl text-on-surface dark:text-zinc-100">{{ profile.full_name ?? '—' }}</h2>
                    <span class="inline-flex self-center items-center px-3 py-1 bg-secondary-container dark:bg-primary/10 text-on-secondary-container dark:text-emerald-400 rounded-full text-[10px] font-bold uppercase tracking-wider">{{ profile.role }}</span>
                  </div>
                  <p class="text-on-surface-variant dark:text-zinc-400 text-sm mb-6 flex items-center justify-center md:justify-start gap-2">
                    <span class="material-symbols-outlined text-emerald-600 dark:text-emerald-500 text-base" style="font-variation-settings:'FILL' 1;">verified</span>
                    {{ profile.email ?? '—' }}
                  </p>
                  <div class="flex flex-col sm:flex-row justify-center md:justify-start gap-3">
                    <template v-if="isEditing">
                      <button class="px-6 py-3 bg-primary text-on-primary rounded-2xl font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95 text-sm" @click="handleUpdateProfile">
                        <span class="material-symbols-outlined text-lg">save</span> Simpan
                      </button>
                      <button class="px-6 py-3 border-2 border-outline-variant dark:border-zinc-700 text-on-surface-variant dark:text-zinc-400 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-surface-container-highest dark:hover:bg-zinc-800 transition-all active:scale-95 text-sm" @click="cancelEditing">
                        <span class="material-symbols-outlined text-lg">close</span> Batal
                      </button>
                    </template>
                    <template v-else>
                      <button class="px-6 py-3 bg-primary text-on-primary rounded-2xl font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95 text-sm" @click="startEditing">
                        <span class="material-symbols-outlined text-lg">edit</span> Edit Profil
                      </button>
                    </template>
                    <button class="px-6 py-3 border-2 border-error text-error rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-error-container/20 transition-all active:scale-95 text-sm" @click="handleLogout">
                      <span class="material-symbols-outlined text-lg">logout</span> Keluar
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Info fields -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="bg-surface-container-low dark:bg-zinc-900 p-6 rounded-3xl border border-transparent dark:border-zinc-800">
                <label class="block text-[10px] font-bold text-on-surface-variant dark:text-zinc-500 uppercase tracking-widest mb-2">Nama Lengkap</label>
                <div v-if="!isEditing" class="bg-surface-container-lowest dark:bg-zinc-800 px-5 py-3 rounded-2xl text-on-surface dark:text-zinc-200 font-semibold text-sm border border-outline-variant/10 dark:border-zinc-700">
                  {{ profile.full_name ?? '—' }}
                </div>
                <input v-else v-model="editName" type="text" class="bg-surface-container-lowest dark:bg-zinc-800 px-5 py-3 rounded-2xl text-on-surface dark:text-zinc-200 font-semibold text-sm border border-outline-variant/10 dark:border-zinc-700 w-full focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Masukkan nama lengkap" />
              </div>
              <div class="bg-surface-container-low dark:bg-zinc-900 p-6 rounded-3xl border border-transparent dark:border-zinc-800">
                <label class="block text-[10px] font-bold text-on-surface-variant dark:text-zinc-500 uppercase tracking-widest mb-2">Alamat Email</label>
                <div class="bg-surface-container-lowest dark:bg-zinc-800 px-5 py-3 rounded-2xl text-on-surface dark:text-zinc-200 font-semibold text-sm border border-outline-variant/10 dark:border-zinc-700 flex items-center justify-between">
                  {{ profile.email ?? '—' }}
                  <span class="material-symbols-outlined text-secondary dark:text-emerald-500 text-sm" style="font-variation-settings:'FILL' 1;">check_circle</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Right: Stats -->
          <div class="lg:col-span-4 space-y-6">
            <div class="bg-primary text-on-primary rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
              <div class="absolute bottom-0 right-0 opacity-10 translate-x-1/4 translate-y-1/4 pointer-events-none">
                <span class="material-symbols-outlined !text-[120px]" style="font-variation-settings:'FILL' 1;">stars</span>
              </div>
              <div class="relative z-10 space-y-4">
                <div>
                  <p class="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">Total Terjawab</p>
                  <h3 class="font-extrabold text-5xl">{{ stats.totalAnswered }}</h3>
                  <p class="text-base font-medium mt-1">Pertanyaan Selesai</p>
                </div>
                <div class="bg-white/15 rounded-2xl p-4 backdrop-blur-md">
                  <div class="flex justify-between text-sm font-bold mb-2">
                    <span>Siap Dijawab</span>
                    <span>{{ stats.readyCount }}</span>
                  </div>
                  <div class="w-full bg-white/20 rounded-full h-2">
                    <div class="bg-white h-full rounded-full transition-all duration-500" :style="`width: ${questions.length ? Math.round((stats.readyCount / questions.length) * 100) : 0}%`" />
                  </div>
                </div>
              </div>
            </div>

            <div class="bg-surface-container-low dark:bg-zinc-900 p-6 rounded-3xl border border-transparent dark:border-zinc-800">
              <h4 class="font-bold text-on-surface dark:text-zinc-100 mb-4">Informasi Akun</h4>
              <div class="space-y-4">
                <div class="flex justify-between items-center text-sm">
                  <span class="text-on-surface-variant dark:text-zinc-500 font-medium">Bergabung</span>
                  <span class="text-on-surface dark:text-zinc-200 font-bold">{{ formatDate(profile.created_at) }}</span>
                </div>
                <div class="flex justify-between items-center text-sm">
                  <span class="text-on-surface-variant dark:text-zinc-500 font-medium">Status</span>
                  <span class="px-2 py-0.5 bg-secondary-container dark:bg-emerald-900/30 text-on-secondary-container dark:text-emerald-400 rounded-md text-[10px] font-extrabold uppercase">Aktif</span>
                </div>
                <div class="flex justify-between items-center text-sm">
                  <span class="text-on-surface-variant dark:text-zinc-500 font-medium">Login Terakhir</span>
                  <span class="text-on-surface dark:text-zinc-200 font-bold">Hari ini, {{ formatTime(new Date()) }}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Questions -->
        <section>
          <div class="flex items-end justify-between mb-6 md:mb-8">
            <div>
              <h2 class="font-bold text-xl md:text-2xl text-on-surface dark:text-zinc-100">Pertanyaan Ummat</h2>
              <p class="text-on-surface-variant dark:text-zinc-500 text-sm mt-0.5">{{ filteredQuestions.length }} dari {{ questions.length }} pertanyaan</p>
            </div>
          </div>

          <!-- Search -->
          <div class="mb-8 max-w-2xl mx-auto">
            <div class="relative group">
              <div class="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <span class="material-symbols-outlined text-outline dark:text-zinc-500 group-focus-within:text-primary transition-colors">search</span>
              </div>
              <input :value="searchQuery" type="text" class="w-full h-14 pl-12 pr-4 rounded-full border-none bg-surface-container-high dark:bg-zinc-800 text-on-surface dark:text-zinc-100 focus:ring-2 focus:ring-primary/20 placeholder:text-outline/60 dark:placeholder:text-zinc-500 transition-all shadow-sm" placeholder="Cari pertanyaan atau kategori…" @input="handleSearch" />
            </div>
          </div>

          <!-- Tabs -->
          <nav class="flex justify-center mb-10">
            <div class="inline-flex flex-wrap justify-center gap-1 bg-surface-container-low dark:bg-zinc-800/70 p-1.5 rounded-full shadow-sm border border-outline-variant/10 dark:border-zinc-700/50">
              <button
                v-for="tab in tabs" :key="tab.id"
                class="px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-300 active:scale-90 flex items-center gap-1.5"
                :class="activeTab === tab.id ? 'bg-primary text-white shadow-lg scale-105' : 'text-on-surface-variant dark:text-zinc-400 hover:text-primary hover:bg-primary/5'"
                @click="activeTab = tab.id"
              >
                <span class="material-symbols-outlined text-sm">{{ tab.icon }}</span>
                {{ tab.label }}
                <span v-if="tab.id !== 'all' && countByStatus[tab.id]" class="ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold" :class="activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'">
                  {{ countByStatus[tab.id] }}
                </span>
              </button>
            </div>
          </nav>

          <!-- Empty -->
          <div v-if="filteredQuestions.length === 0 && !questionsPending" class="text-center py-16">
            <span class="material-symbols-outlined text-6xl text-on-surface-variant dark:text-zinc-600 mb-4 block">inbox</span>
            <p class="text-on-surface-variant dark:text-zinc-500 text-lg font-medium">Tidak ada pertanyaan ditemukan.</p>
          </div>

          <div v-else-if="questionsPending" class="flex justify-center py-8">
            <span class="material-symbols-outlined text-3xl animate-spin text-primary">sync</span>
          </div>

          <!-- Grid -->
          <div v-else class="columns-1 md:columns-2 lg:columns-3 gap-6">
            <div
              v-for="q in filteredQuestions" :key="q.id"
              class="break-inside-avoid mb-6 bg-surface-container-lowest dark:bg-zinc-900 rounded-3xl p-6 relative overflow-hidden
                     shadow-[0px_12px_32px_rgba(20,28,43,0.04)] dark:shadow-[0px_12px_32px_rgba(0,0,0,0.3)]
                     border border-outline-variant/10 dark:border-zinc-800
                     hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 group/card flex flex-col"
            >
              <!-- Accent bar -->
              <div :class="q.status === 'answered' ? 'bg-primary' : 'bg-cyan-500'" class="absolute top-0 left-0 w-1 h-full transition-all group-hover/card:w-1.5" />

              <!-- Header -->
              <div class="flex justify-between items-start mb-4">
                <span :class="q.status === 'answered' ? 'text-primary bg-secondary-container/30 dark:bg-primary/10 dark:text-emerald-400' : 'text-cyan-700 bg-cyan-100 dark:bg-cyan-900/30 dark:text-cyan-400'" class="text-[10px] font-bold px-2 py-1 rounded">
                  {{ q.category || 'Umum' }} &nbsp;·&nbsp; <span class="font-mono">#{{ q.id.slice(0, 5) }}</span>
                </span>
                <div class="flex items-center gap-1.5 text-outline dark:text-zinc-500 text-[11px]">
                  <span>{{ formatDate(q.created_at) }}</span>
                </div>
              </div>

              <h3 class="font-headline text-on-surface dark:text-zinc-100 font-bold text-lg mb-6 leading-snug group-hover/card:text-primary transition-colors line-clamp-2">
                {{ q.question }}
              </h3>

              <!-- ANSWERED -->
              <template v-if="q.status === 'answered'">
                <div class="flex items-center gap-3 p-4 rounded-2xl bg-surface-container-low dark:bg-zinc-800 mb-4">
                  <div class="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xs ring-2 ring-white dark:ring-zinc-900 shrink-0 overflow-hidden">
                    <!-- Display actual avatar if available, fallback to initial -->
                    <img 
                      v-if="q.answered_by_profile?.avatar_url && q.answered_by_profile?.avatar_url.length > 15"
                      :src="q.answered_by_profile.avatar_url"
                      :alt="`Avatar ${q.answered_by_profile.full_name}`"
                      class="w-full h-full object-cover"
                      @error="handleAvatarError"
                    />
                    <span v-else>
                      {{ q.answered_by_profile?.full_name?.charAt(0)?.toUpperCase() ?? 'U' }}
                    </span>
                  </div>
                  <div>
                    <p class="text-xs font-bold text-on-surface dark:text-zinc-200">Ustadz {{ q.answered_by_profile?.full_name ?? 'Ustadz Tidak Diketahui' }}</p>
                    <p class="text-[10px] text-outline dark:text-zinc-500 italic">Jawaban Ustadz</p>
                  </div>
                </div>
                <p class="text-sm text-on-surface-variant dark:text-zinc-400 line-clamp-3 leading-relaxed italic mb-4 px-1">"{{ q.answer }}"</p>
              </template>

              <!-- VERIFIED: answer textarea -->
              <template v-else-if="q.status === 'verified'">
                <div class="space-y-3 mb-4">
                  <textarea v-model="answerDrafts[q.id]" rows="3"
                    class="w-full bg-surface-container-low dark:bg-zinc-800 border border-outline-variant/20 dark:border-zinc-700 rounded-2xl p-3
                           text-sm text-on-surface dark:text-zinc-200 placeholder:text-outline/60 dark:placeholder:text-zinc-500 resize-none
                           focus:ring-2 focus:ring-primary/20 focus:outline-none"
                    placeholder="Tulis jawaban di sini…"
                  />
                  <button :disabled="!(answerDrafts[q.id] ?? '').trim()"
                    class="w-full py-2.5 bg-primary text-on-primary rounded-2xl font-bold text-xs hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                    @click="submitAnswer(q.id)"
                  >Kirim Jawaban</button>
                </div>
              </template>

              <!-- Footer -->
              <div class="flex items-center justify-between mt-auto pt-4 border-t border-outline-variant/10 dark:border-zinc-800">
                <div :class="q.status === 'answered' ? 'bg-secondary-container/30 dark:bg-primary/10 text-primary' : 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-400'"
                  class="flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
                  {{ STATUS_META[q.status].label }}
                </div>
                <div class="flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary/5 dark:bg-primary/10 text-primary transition-all duration-200">
                  <span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 1;">favorite</span>
                  <span class="text-[11px] font-bold">{{ q.upvotes || 0 }}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

    </main>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');
.material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
</style>