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
}

export const useQuestions = () => {
  const questions = useState<Question[]>("questions_list", () => [])
  const pending = useState<boolean>("questions_pending", () => false)
  const error = useState<string | null>("questions_error", () => null)
  const searchQuery = useState<string>("questions_search", () => "")

  // =============================
  // CORE FETCH FUNCTION
  // =============================
  async function fetchAPI(url: string, query: any = {}) {
    pending.value = true
    error.value = null

    try {
      const { data, error: err } = await useFetch(url, { query })

      if (err.value) throw err.value

      questions.value = data.value ?? []
    } catch (e: any) {
      error.value = e.message
    } finally {
      pending.value = false
    }
  }

  // =============================
  // POST FUNCTION (SUBMIT QUESTION)
  // =============================
  async function addQuestion(payload: { question: string, category: string, fingerprint: string }) {
    pending.value = true
    error.value = null

    try {
      // Menggunakan $fetch untuk request POST ke server/api/questions/index.post.ts
      const response = await $fetch('/api/questions', {
        method: 'POST',
        body: payload
      })

      return response
    } catch (e: any) {
      // Menangkap error detail dari server (seperti pesan rate limit)
      error.value = e.data?.message || e.message
      throw e 
    } finally {
      pending.value = false
    }
  }

  // =============================
  // PUBLIC
  // =============================
  function fetchPublic(tab: "all" | "answered" | "trending" = "answered") {
    return fetchAPI('/api/questions', {
      tab,
      search: searchQuery.value
    })
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

  function setSearch(value: string) {
    searchQuery.value = value

    clearTimeout(timer)

    timer = setTimeout(() => {
      fetchPublic("all")
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
        {
          event: '*',
          schema: 'public',
          table: 'questions'
        },
        (payload) => {
          console.log('Realtime change:', payload)
          fetchPublic('all')
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
    addQuestion, // <--- Pastikan diekspor agar bisa dipakai di ask.vue
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