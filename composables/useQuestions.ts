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
  fingerprint: string | null; // disimpan saat submit, dipakai untuk filter "private pending"
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
  async function addQuestion(payload: { question: string; category: string; fingerprint: string }) {
    pending.value = true;
    try {
      const { data, error: err } = await useFetch('/api/questions', {
        method: 'POST',
        body: payload // payload sudah termasuk fingerprint dari ask.vue
      });
      if (err.value) throw err.value;
      return { data: data.value, error: null };
    } catch (e: any) {
      return { data: null, error: e };
    } finally {
      pending.value = false;
    }
  }

  // =============================
  // PUBLIC
  // =============================
  // FIX BUG #2 & #3: Tambahkan parameter `fingerprintValue` agar fingerprint
  // bisa diteruskan ke server sebagai query param.
  //
  // Sebelumnya fungsi hanya menerima (tab: string), sehingga saat dipanggil
  // dengan fetchPublic('all', fingerprint.value) di index.vue dan setSearch(),
  // argumen kedua diabaikan dan fingerprint TIDAK PERNAH dikirim ke server.
  //
  // Cara kerja:
  //   - Jika fingerprintValue ada → server bisa mengembalikan pending milik user ini
  //   - Jika tidak ada → server hanya kembalikan answered/verified (publik)
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

  // FIX BUG #3: fingerprintValue kini benar-benar diteruskan ke fetchPublic
  // karena fetchPublic sudah menerima parameter kedua.
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
        {
          event: '*',
          schema: 'public',
          table: 'questions'
        },
        (payload) => {
          console.log('Realtime change:', payload)
          // Ambil fingerprint terkini saat realtime update masuk
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