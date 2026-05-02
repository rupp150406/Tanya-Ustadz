export type QuestionStatus = "pending" | "verified" | "rejected" | "answered";

export interface Question {
  id: string;
  ticket_id: string;
  created_at: string;
  answered_at: string | null;
  question: string;
  category: string | null;
  status: QuestionStatus;
  answer: string | null;
  is_pinned: boolean;
  upvotes: number;
  fingerprint: string | null;
  answered_by: string | null;
  answered_by_profile?: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
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
  // Pass an explicit status list so the API route is never allowed to
  // silently default to a subset. Admin must see pending + verified + answered.
const fetchForAdmin = async () => {
  pending.value = true
  try {
    // WAJIB panggil endpoint internal kita, bukan Supabase SDK
    const data = await $fetch('/api/admin/questions', {
      params: { 
        search: searchQuery.value,
        statuses: 'pending,verified,answered,rejected' 
      }
    })
    questions.value = data
  } catch (err: any) {
    error.value = err.message
  } finally {
    pending.value = false
  }
}

  // =============================
  // USTADZ
  // =============================
  // Ustadz sees verified (to answer) + answered (their history).
  // Pending rows are not their concern and must not appear.
  function fetchForUstadz() {
    return fetchAPI('/api/ustadz/questions', {
      search: searchQuery.value,
      statuses: 'verified,answered'
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

  function getUserBadge(fingerprintValue?: string): string {
    if (!fingerprintValue) return 'Hamba Allah #....'
    const firstFour = fingerprintValue.slice(0, 4).toUpperCase()
    return `Hamba Allah #${firstFour}`
  }

  let channel: any = null

  const subscribeRealtime = (role: 'admin' | 'ustadz' | 'jemaah') => {
    const supabase = useSupabaseClient()
    channel = supabase
      .channel('questions-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'questions' },
        (_payload) => {
          // Re-fetch via the endpoint that matches the subscriber's role so
          // realtime events never overwrite privileged data with public data.
          if (role === 'admin') {
            fetchForAdmin()
          } else if (role === 'ustadz') {
            fetchForUstadz()
          } else {
            const { fingerprint } = useFingerprint()
            fetchPublic('all', fingerprint.value)
          }
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
    getUserBadge,
  }
}