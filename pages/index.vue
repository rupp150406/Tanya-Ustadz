<script setup>
import { useQuestions } from '~/composables/useQuestions'
import { useFingerprint } from '~/composables/useFingerprint'

const {
  questions,
  fetchPublic,
  pending,
  error,
  searchQuery,
  setSearch,
  subscribeRealtime,
  unsubscribeRealtime,
} = useQuestions()

const { fingerprint, getFingerprint } = useFingerprint()

const activeTab = ref('all')

// Filter pertanyaan berdasarkan tab DAN privasi (Private Pending System)
const filteredQuestions = computed(() => {
  if (!questions.value) return []

  let list = questions.value.filter(q => {
    if (q.status === 'answered' || q.status === 'verified') return true

    if (q.status === 'pending') {
      return !!fingerprint.value && q.fingerprint === fingerprint.value
    }

    return false
  })

  if (activeTab.value === 'answered') return list.filter(q => q.status === 'answered')
  if (activeTab.value === 'unanswered') return list.filter(q => q.status !== 'answered')

  return list
})

const handleSearch = (e) => {
  setSearch(e.target.value, fingerprint.value)
}

// Fungsi fetch terpusat agar tidak duplikasi kode
// antara onMounted dan onActivated
async function loadData() {
  await getFingerprint()
  await fetchPublic('all', fingerprint.value)
}

onMounted(async () => {
  // onMounted jalan saat pertama kali halaman dibuka (hard navigation / fresh load)
  await loadData()
  subscribeRealtime('jemaah')
})

// FIX: Tambahkan onActivated sebagai jaring pengaman untuk SPA navigation.
//
// Konteks masalah: Dalam SPA (Single Page Application), saat user kembali ke '/'
// dari '/ask' via navigateTo('/'), Vue TIDAK memanggil onMounted lagi karena
// komponen tidak di-destroy dan di-create ulang — ia hanya diaktifkan kembali.
//
// Dengan pre-fetch di closeAlert (ask.vue), shared state `questions` sudah
// diperbarui sebelum navigasi terjadi, sehingga halaman ini langsung tampil
// dengan data fresh tanpa perlu fetch ulang.
//
// Namun onActivated di sini berfungsi sebagai lapisan keamanan tambahan:
// jika user masuk via browser back button, link langsung, atau skenario lain
// di mana pre-fetch dari ask.vue tidak terjadi — data tetap diperbarui.
onActivated(async () => {
  await loadData()
})

onUnmounted(() => unsubscribeRealtime())

// Utils
const getTicketId = (id) => id?.slice(-4).toUpperCase() || '....'

const formatDate = (dateString) => {
  if (!dateString) return 'Baru saja'
  const date = new Date(dateString)
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

const getStatusLabel = (status) => {
  const labels = {
    pending: 'MENUNGGU',
    verified: 'DIVERIFIKASI',
    answered: 'TERJAWAB',
    rejected: 'DITOLAK'
  }
  return labels[status] || status.toUpperCase()
}
</script>

<template>
  <main class="min-h-screen bg-surface font-body text-on-surface">
    <div class="max-w-6xl mx-auto px-4 py-8">
      
      <div class="mb-8 max-w-2xl mx-auto">
        <div class="relative group">
          <div class="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <span class="material-symbols-outlined text-outline group-focus-within:text-primary transition-colors">search</span>
          </div>
          <input
            :value="searchQuery"
            @input="handleSearch"
            type="text"
            class="w-full h-14 pl-12 pr-4 rounded-full border-none bg-surface-container-high text-on-surface focus:ring-2 focus:ring-primary/20 placeholder:text-outline/60 transition-all shadow-sm"
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
        <div class="inline-flex bg-surface-container-low p-1.5 rounded-full shadow-sm border border-outline-variant/10">
          <button
            v-for="tab in [{id:'all', n:'Semua'}, {id:'answered', n:'Terjawab'}, {id:'unanswered', n:'Belum Dijawab'}]"
            :key="tab.id"
            @click="activeTab = tab.id"
            class="px-8 py-2.5 rounded-full text-xs font-bold transition-all duration-300 active:scale-90"
            :class="activeTab === tab.id 
              ? 'bg-primary text-white shadow-lg scale-105' 
              : 'text-on-surface-variant hover:text-primary hover:bg-primary/5'"
          >{{ tab.n }}</button>
        </div>
      </nav>

      <div v-if="filteredQuestions.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <NuxtLink
          v-for="q in filteredQuestions" 
          :key="q.id"
          :to="`/questions/${q.id}`"
          class="bg-surface-container-lowest rounded-3xl p-6 relative overflow-hidden shadow-[0px_12px_32px_rgba(20,28,43,0.04)] border border-outline-variant/10 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 group/card flex flex-col cursor-pointer"
        >
          <div :class="[
            q.status === 'answered' ? 'bg-primary' : 
            q.status === 'verified' ? 'bg-cyan-500' : 'bg-amber-500'
          ]" class="absolute top-0 left-0 w-1 h-full transition-all group-hover/card:w-1.5"></div>

          <div class="flex justify-between items-start mb-4">
            <span :class="q.status === 'answered' ? 'text-primary bg-secondary-container/30' : 'text-amber-800 bg-amber-100'"
                  class="text-[10px] font-bold px-2 py-1 rounded">
              Hamba Allah #{{ getTicketId(q.id) }}
            </span>
            <div class="flex items-center gap-1.5 text-outline text-[11px]">
              <span>{{ formatDate(q.created_at) }}</span>
            </div>
          </div>

          <h3 class="font-headline text-on-surface font-bold text-lg mb-6 leading-snug group-hover/card:text-primary transition-colors line-clamp-2">
            {{ q.question }}
          </h3>

          <template v-if="q.status === 'answered'">
            <div class="flex items-center gap-3 p-4 rounded-2xl bg-surface-container-low mb-4">
              <div class="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xs ring-2 ring-white">U</div>
              <div>
                <p class="text-xs font-bold text-on-surface">Ustadz Official</p>
                <p class="text-[10px] text-outline italic">Jawaban Ustadz</p>
              </div>
            </div>
            <p class="text-sm text-on-surface-variant line-clamp-3 leading-relaxed italic mb-4 px-1">"{{ q.answer }}"</p>
          </template>

          <template v-else>
            <div class="flex items-center gap-2 p-3 rounded-xl border-2 border-dashed mb-6 transition-colors"
                 :class="q.status === 'verified' ? 'border-cyan-200 bg-cyan-50' : 'border-outline-variant/30 bg-surface-container-low'">
               <span class="material-symbols-outlined text-lg" 
                     :class="q.status === 'pending' ? 'text-amber-500 animate-spin' : 'text-cyan-600'">
                  {{ q.status === 'pending' ? 'sync' : 'verified' }}
               </span>
               <span class="text-[11px] font-bold" :class="q.status === 'verified' ? 'text-cyan-700' : 'text-on-surface-variant'">
                 {{ q.status === 'pending' ? 'Menunggu antrean moderasi...' : 'Telah diverifikasi, menunggu jawaban Ustadz.' }}
               </span>
            </div>
          </template>

          <div class="flex items-center justify-between mt-auto pt-4 border-t border-outline-variant/10">
            <span v-if="q.status === 'answered'" class="text-primary text-xs font-bold flex items-center gap-1 group/btn">
              Baca Selengkapnya 
              <span class="material-symbols-outlined text-sm group-hover/btn:translate-x-1 transition-transform">arrow_forward</span>
            </span>
            
            <div v-else :class="[
              q.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-cyan-100 text-cyan-800'
            ]" class="flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
              {{ getStatusLabel(q.status) }}
            </div>
            
            <div class="flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary/5 text-primary group/upvote transition-all duration-200">
              <span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 1;">favorite</span>
              <span class="text-[11px] font-bold">{{ q.upvotes || 0 }}</span>
            </div>
          </div>
        </NuxtLink>
      </div>

      <div v-else class="text-center py-20">
        <span class="material-symbols-outlined text-6xl text-outline/30 mb-4 animate-pulse">inbox</span>
        <p class="text-on-surface-variant font-bold">Belum ada pertanyaan ditemukan.</p>
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
.font-headline { font-family: 'Manrope', sans-serif; }
.font-body { font-family: 'Plus Jakarta Sans', sans-serif; }

a { text-decoration: none; color: inherit; }
</style>