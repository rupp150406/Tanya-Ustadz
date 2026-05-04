<script setup>
import { useQuestions } from '~/composables/useQuestions'
import { useFingerprint } from '~/composables/useFingerprint'
import UiThemeToggle from '~/components/ui/ThemeToggle.vue'
// import UiUpvoteButton from '~/components/ui/UpvoteButton.vue' // DISABLED  

// ─────────────────────────────────────────────────────────────
// THEME
// ─────────────────────────────────────────────────────────────
const { initTheme } = useTheme()
onMounted(() => initTheme())

// ─────────────────────────────────────────────────────────────
// PROFILE — READ-ONLY CONSUMER
// ─────────────────────────────────────────────────────────────
const profile = useState('user-profile')
const avatarBroken = ref(false)

watch(profile, () => { avatarBroken.value = false })

// ─────────────────────────────────────────────────────────────
// QUESTIONS & FINGERPRINT
// ─────────────────────────────────────────────────────────────
const {
  questions,
  fetchPublic,
  pending,
  error,
  setSearch,
  subscribeRealtime,
  unsubscribeRealtime,
  getUserBadge,
} = useQuestions()

const { fingerprint, getFingerprint } = useFingerprint()

const activeTab   = ref('all')
const searchInput = ref('')

const filteredQuestions = computed(() => {
  if (!questions.value) return []
  let list = questions.value.filter(q => {
    if (q.status === 'answered' || q.status === 'verified') return true
    if (q.status === 'pending') return !!fingerprint.value && q.fingerprint === fingerprint.value
    return false
  })
  if (activeTab.value === 'answered')   list = list.filter(q => q.status === 'answered')
  if (activeTab.value === 'unanswered') list = list.filter(q => q.status !== 'answered')
  if (searchInput.value.trim()) {
    const kw = searchInput.value.toLowerCase().trim()
    list = list.filter(item =>
      item.question.toLowerCase().includes(kw) ||
      (item.category && item.category.toLowerCase().includes(kw))
    )
  }
  return list
})

const handleSearch = (e) => {
  searchInput.value = e.target.value
  setSearch(e.target.value, fingerprint.value)
}

// ─────────────────────────────────────────────────────────────
// LIFECYCLE — QUESTIONS ONLY
// ─────────────────────────────────────────────────────────────
onMounted(async () => {
  await getFingerprint()
  await fetchPublic('all', fingerprint.value)
  subscribeRealtime('jemaah')
})

onActivated(async () => {
  await getFingerprint()
  await fetchPublic('all', fingerprint.value)
})

onUnmounted(() => unsubscribeRealtime())

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

// ─────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────
const formatDate = (d) => d
  ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  : 'Baru saja'

const getStatusLabel = (s) =>
  ({ pending: 'MENUNGGU', verified: 'DIVERIFIKASI', answered: 'TERJAWAB', rejected: 'DITOLAK' })[s]
  ?? s.toUpperCase()
</script>

<template>
  <main class="min-h-screen bg-surface dark:bg-zinc-950 font-body text-on-surface dark:text-zinc-100 transition-colors duration-300">

    <header class="bg-surface/70 dark:bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50 shadow-sm bg-gradient-to-b from-slate-100/10 dark:from-zinc-800/10 to-transparent border-b border-transparent dark:border-zinc-800/50">
      <div class="flex justify-between items-center w-full px-6 py-3 max-w-screen-2xl mx-auto">
        <div class="flex items-center gap-4">
          <NuxtLink to="/" class="text-2xl font-bold tracking-tighter text-emerald-800 dark:text-emerald-400 font-headline">
            Tanya Ustadz
          </NuxtLink>
        </div>

        <div class="flex items-center gap-3">
          <!-- Theme Toggle -->
          <UiThemeToggle/>

          <!-- Avatar area -->
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

    <div class="max-w-6xl mx-auto px-4 py-8">

      <div class="mb-8 max-w-2xl mx-auto">
        <div class="relative group">
          <div class="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <span class="material-symbols-outlined text-outline dark:text-zinc-500 group-focus-within:text-primary transition-colors">search</span>
          </div>
          <input
            v-model="searchInput"
            type="text"
            class="w-full h-14 pl-12 pr-4 rounded-full border-none bg-surface-container-high dark:bg-zinc-800 text-on-surface dark:text-zinc-100 focus:ring-2 focus:ring-primary/20 placeholder:text-outline/60 dark:placeholder:text-zinc-500 transition-all shadow-sm"
            placeholder="Cari jawaban atau topik hukum..."
          />
        </div>
      </div>

      <div class="mb-10 relative overflow-hidden rounded-[2rem] bg-primary h-52 flex flex-col justify-end p-8 shadow-xl shadow-primary/10 transition-transform hover:scale-[1.01] duration-500">
        <div class="absolute inset-0">
          <img class="w-full h-full object-cover" src="https://ahsan.tv/wp-content/uploads/2026/04/test-2.png" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        </div>
        <div class="relative z-10">
          <p class="text-primary-fixed text-[12px] font-extrabold tracking-[0.2em] mb-2 uppercase">Tanya Ustadz Eksklusif</p>
          <h2 class="font-headline text-white text-2xl font-extrabold leading-tight">Mencari Ketenangan Melalui Ilmu Syar'i</h2>
        </div>
      </div>

      <nav class="flex justify-center mb-10">
        <div class="inline-flex bg-surface-container-low dark:bg-zinc-800/70 p-1.5 rounded-full shadow-sm border border-outline-variant/10 dark:border-zinc-700/50">
          <button
            v-for="tab in [{id:'all', n:'Semua'}, {id:'answered', n:'Terjawab'}, {id:'unanswered', n:'Belum Dijawab'}]"
            :key="tab.id"
            @click="activeTab = tab.id"
            class="px-8 py-2.5 rounded-full text-xs font-bold transition-all duration-300 active:scale-90"
            :class="activeTab === tab.id
              ? 'bg-primary text-white shadow-lg scale-105'
              : 'text-on-surface-variant dark:text-zinc-400 hover:text-primary hover:bg-primary/5'"
          >{{ tab.n }}</button>
        </div>
      </nav>

      <div v-if="filteredQuestions.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <NuxtLink
          v-for="q in filteredQuestions"
          :key="q.id"
          :to="`/questions/${q.id}`"
          class="bg-surface-container-lowest dark:bg-zinc-900 rounded-3xl p-6 relative overflow-hidden shadow-[0px_12px_32px_rgba(20,28,43,0.04)] dark:shadow-[0px_12px_32px_rgba(0,0,0,0.3)] border border-outline-variant/10 dark:border-zinc-800 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 group/card flex flex-col cursor-pointer"
        >
          <div :class="[
            q.status === 'answered' ? 'bg-primary' :
            q.status === 'verified' ? 'bg-cyan-500' : 'bg-amber-500'
          ]" class="absolute top-0 left-0 w-1 h-full transition-all group-hover/card:w-1.5"></div>

          <div class="flex justify-between items-start mb-4">
            <span :class="q.status === 'answered' ? 'text-primary bg-secondary-container/30 dark:bg-primary/10 dark:text-emerald-400' : 'text-amber-800 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300'"
                  class="text-[10px] font-bold px-2 py-1 rounded">
              {{ getUserBadge(q.fingerprint) }}
            </span>
            <div class="flex items-center gap-1.5 text-outline dark:text-zinc-500 text-[11px]">
              <span>{{ formatDate(q.created_at) }}</span>
            </div>
          </div>

          <h3 class="font-headline text-on-surface dark:text-zinc-100 font-bold text-lg mb-6 leading-snug group-hover/card:text-primary transition-colors line-clamp-2">
            {{ q.question }}
          </h3>

          <template v-if="q.status === 'answered'">
            <div class="flex items-center gap-3 p-4 rounded-2xl bg-surface-container-low dark:bg-zinc-800 mb-4">
              <div class="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xs ring-2 ring-white dark:ring-zinc-900 overflow-hidden shrink-0">
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
            <p class="text-sm text-on-surface-variant dark:text-zinc-400 line-clamp-3 leading-relaxed italic mb-4 px-1 ">"{{ q.answer }}"</p>
          </template>

          <template v-else>
            <div class="flex items-center gap-2 p-3 rounded-xl border-2 border-dashed mb-6 transition-colors"
                 :class="q.status === 'verified' ? 'border-cyan-200 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-900/20' : 'border-outline-variant/30 dark:border-zinc-700 bg-surface-container-low dark:bg-zinc-800/50'">
               <span class="material-symbols-outlined text-lg"
                     :class="q.status === 'pending' ? 'text-amber-500 animate-spin' : 'text-cyan-600 dark:text-cyan-400'">
                  {{ q.status === 'pending' ? 'sync' : 'verified' }}
               </span>
               <span class="text-[11px] font-bold" :class="q.status === 'verified' ? 'text-cyan-700 dark:text-cyan-400' : 'text-on-surface-variant dark:text-zinc-400'">
                 {{ q.status === 'pending' ? 'Menunggu antrean moderasi...' : 'Telah diverifikasi, menunggu jawaban Ustadz.' }}
               </span>
            </div>
          </template>

          <div class="flex items-center justify-between mt-auto pt-4 border-t border-outline-variant/10 dark:border-zinc-800">
            <span v-if="q.status === 'answered'" class="text-primary text-xs font-bold flex items-center gap-1 group/btn">
              Baca Selengkapnya
              <span class="material-symbols-outlined text-sm group-hover/btn:translate-x-1 transition-transform">arrow_forward</span>
            </span>

            <div v-else :class="[
              q.status === 'pending' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300' : 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-300'
            ]" class="flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
              {{ getStatusLabel(q.status) }}
            </div>

            <!-- <UiUpvoteButton
              :question-id="q.id"
              :initial-count="q.upvotes ?? 0"
              size="sm" /> DISABLED -->
          </div>
        </NuxtLink>
      </div>

      <div v-else class="text-center py-20">
        <span class="material-symbols-outlined text-6xl text-outline/30 mb-4 animate-pulse">inbox</span>
        <p class="text-on-surface-variant dark:text-zinc-500 font-bold">Belum ada pertanyaan ditemukan.</p>
      </div>
    </div>

    <div class="fixed bottom-8 right-8 z-50">
      <NuxtLink
        to="/ask"
        class="bg-gradient-to-br from-primary to-primary-container text-white h-16 px-8 rounded-full shadow-2xl flex items-center gap-3 hover:scale-105 hover:shadow-primary/30 active:scale-95 transition-all duration-300 group/fab"
      >
        <span class="material-symbols-outlined transition-transform group-hover/fab:rotate-12" style="font-variation-settings: 'FILL' 1;">add_comment</span>
        <span class="font-bold text-sm tracking-wide font-headline">Tanya Ustadz</span>
      </NuxtLink>
    </div>
  </main>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');

.material-symbols-outlined {
  font-family: 'Material Symbols Outlined';
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

body { margin: 0; background-color: #f9f9ff; }
.dark body { background-color: #09090b; }
.font-headline { font-family: 'Manrope', sans-serif; }
.font-body { font-family: 'Plus Jakarta Sans', sans-serif; }

a { text-decoration: none; color: inherit; }

:deep(html::-webkit-scrollbar),
:deep(body::-webkit-scrollbar),
:deep(main::-webkit-scrollbar),
:deep(.max-w-6xl::-webkit-scrollbar) {
  display: none;
  width: 0;
  height: 0;
}

:deep(html),
:deep(body),
:deep(main),
:deep(.max-w-6xl) {
  scrollbar-width: none;
  -ms-overflow-style: none;
  overflow-y: auto;
  overflow-x: hidden;
}
</style>