export type QuestionStatus = "pending" | "verified" | "rejected" | "answered";

export interface Question {
  id: string;
  ticket_id: string;
  created_at: string;
  question: string;
  category: string | null;
  status: QuestionStatus;
  answer: string | null;
  is_pinned: boolean;
  upvotes: number;
  fingerprint: string | null;
}

export const useQuestions = () => {
  const questions = useState<Question[]>("questions_list", () => [])
  const pending = useState<boolean>("questions_pending", () => false)
  const error = useState<string | null>("questions_error", () => null)
  const searchQuery = useState<string>("questions_search", () => "")

  // =============================
  // CORE FETCH FUNCTION
  // =============================
  // FIX UTAMA: Ganti useFetch → $fetch.
  //
  // useFetch() adalah composable Nuxt yang hanya boleh dipanggil di setup-time
  // (sekali, saat komponen pertama kali dibuat). Jika dipanggil di dalam fungsi
  // biasa, onMounted, atau event handler, Nuxt akan mengembalikan data yang
  // di-cache dari pemanggilan pertama (stale data) — sehingga re-fetch tidak
  // benar-benar terjadi dan list tidak pernah diperbarui.
  //
  // $fetch adalah HTTP client imperatif yang memang dirancang untuk dipanggil
  // kapan saja: di dalam event handler, lifecycle hooks, fungsi async, dsb.
  async function fetchAPI(url: string, query: Record<string, string> = {}) {
    pending.value = true
    error.value = null

    try {
      const data = await $fetch<Question[]>(url, { query })
      questions.value = data ?? []
    } catch (e: any) {
      error.value = e?.data?.message ?? e?.message ?? 'Terjadi kesalahan.'
    } finally {
      pending.value = false
    }
  }

  // =============================
  // POST FUNCTION (SUBMIT QUESTION)
  // =============================
  // FIX: Ganti useFetch → $fetch untuk POST imperatif.
  // useFetch pada POST tidak bisa menangkap error body (4xx/5xx) dengan benar
  // dan bisa ter-deduplicate oleh Nuxt jika dipanggil lebih dari sekali.
  async function addQuestion(payload: { question: string; category: string; fingerprint: string }) {
    pending.value = true;
    try {
      const data = await $fetch('/api/questions', {
        method: 'POST',
        body: payload,
      });
      return { data, error: null };
    } catch (e: any) {
      // Lempar ulang agar handler di ask.vue bisa menangkap pesan error
      // spesifik dari response body server (rate limit 429, validasi 400, dsb.)
      throw e;
    } finally {
      pending.value = false;
    }
  }

  // =============================
  // PUBLIC
  // =============================
  async function fetchPublic(tab: string = 'answered', fingerprintValue?: string) {
    const query: Record<string, string> = { tab }
    if (fingerprintValue) {
      query.fingerprint = fingerprintValue
    }
    return fetchAPI('/api/questions', query)
  }

  // =============================
  // ADMIN
  // =============================
  function fetchForAdmin() {
    return fetchAPI('/api/admin/questions', {
      search: searchQuery.value
    })
  }

  // =============================
  // USTADZ
  // =============================
  function fetchForUstadz() {
    return fetchAPI('/api/ustadz/questions', {
      search: searchQuery.value
    })
  }

  // =============================
  // ARCHIVE
  // =============================
  function fetchArchive() {
    return fetchAPI('/api/questions/archive')
  }

  // =============================
  // SEARCH (DEBOUNCE)
  // =============================
  let timer: any

  function setSearch(value: string, fingerprintValue?: string) {
    searchQuery.value = value
    clearTimeout(timer)
    timer = setTimeout(() => {
      fetchPublic("all", fingerprintValue)
    }, 300)
  }

  // =============================
  // LOCAL STATE
  // =============================
  function removeFromList(id: string) {
    questions.value = questions.value.filter(q => q.id !== id)
  }

  function updateInList(id: string, patch: Partial<Question>) {
    questions.value = questions.value.map(q =>
      q.id === id ? { ...q, ...patch } : q
    )
  }

  function daysUntilDeletion(createdAt: string): number {
    const created = new Date(createdAt).getTime()
    const now = Date.now()
    return Math.max(0, Math.ceil(30 - (now - created) / 86400000))
  }

  let channel: any = null

  const subscribeRealtime = (role: string) => {
    const supabase = useSupabaseClient()
    channel = supabase
      .channel('questions-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'questions' },
        (payload) => {
          console.log('Realtime change:', payload)
          const { fingerprint } = useFingerprint()
          fetchPublic('all', fingerprint.value)
        }
      )
      .subscribe()
  }

  const unsubscribeRealtime = () => {
    if (channel) {
      const supabase = useSupabaseClient()
      supabase.removeChannel(channel)
      channel = null
    }
  }

  return {
    questions,
    pending,
    error,
    searchQuery,
    addQuestion,
    subscribeRealtime,
    unsubscribeRealtime,
    fetchPublic,
    fetchForAdmin,
    fetchForUstadz,
    fetchArchive,
    setSearch,
    removeFromList,
    updateInList,
    daysUntilDeletion,
  }
}