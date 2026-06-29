<script setup>
// ─────────────────────────────────────────────────────────────
// app.vue — GLOBAL PROFILE STATE OWNER
// ─────────────────────────────────────────────────────────────
//
// MENGAPA app.vue, BUKAN index.vue?
// app.vue adalah root component — di-mount SEKALI, tidak pernah
// unmount selama sesi berlangsung. Dengan ini:
//   ✅ Fetch profil terjadi tepat satu kali per sesi login
//   ✅ useState('user-profile') tersedia di semua halaman
//   ✅ Tidak ada race condition antar halaman
//   ✅ index.vue hanya perlu baca, tidak perlu fetch
//
// ─────────────────────────────────────────────────────────────
// ROOT CAUSE — MENGAPA VERSI SEBELUMNYA GAGAL
// ─────────────────────────────────────────────────────────────
//
// Versi sebelumnya hanya mengandalkan:
//   watch(user, handler, { immediate: true })  ← di dalam onMounted
//
// Masalahnya: di Nuxt 3 + @nuxtjs/supabase, useSupabaseUser()
// adalah ref yang diisi oleh Supabase auth listener secara async.
// Timing pengisian ini TIDAK DETERMINISTIK:
//
//   • Kadang user.value sudah terisi sebelum onMounted → watch
//     immediate terpicu dengan user yang valid → fetch berhasil.
//
//   • Kadang Supabase auth listener belum selesai saat onMounted
//     dipanggil → user.value masih null → immediate handler return
//     tanpa fetch → watch menunggu perubahan berikutnya yang tidak
//     datang karena session sudah "restore" sebelum watcher terpasang
//     → profile tetap null selamanya.
//
// MENGAPA DASHBOARD BERHASIL SEMENTARA app.vue GAGAL?
//
// dashboard.vue menggunakan strategi dua lapis di forceGetAuthUser():
//   Lapis 1: cek user.value?.id  (reactive ref — tidak reliable timing)
//   Lapis 2: supabase.auth.getSession()  ← INI YANG MEMBEDAKAN
//
// getSession() membaca session langsung dari localStorage/cookie
// tanpa bergantung pada reactive ref atau auth listener. Ini
// selalu deterministik terhadap sesi yang ada, tidak peduli timing.
//
// SOLUSI: Adopsi strategi yang sama persis di app.vue.
// ─────────────────────────────────────────────────────────────

// ─── Theme ────────────────────────────────────────────────────
const { initTheme } = useTheme()

const supabase = useSupabaseClient()
const user     = useSupabaseUser()

// ── Global state ─────────────────────────────────────────────
// Key 'user-profile' di-share ke semua halaman.
// Halaman lain cukup memanggil useState('user-profile') untuk
// mendapat referensi ke objek YANG SAMA — bukan copy.
// Mutasi di sini langsung reaktif di index.vue, admin/dashboard, dll.
const globalProfile = useState('user-profile', () => null)
const { initFCM } = useFCM()
onMounted(() => {
  // Trigger permintaan izin notifikasi dan ambil token browser
  initFCM()
})

// UUID v4 guard — menolak '', 'undefined', null, non-UUID string
// Mencegah /profiles?id=eq.undefined → PostgREST 400 / 22P02
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

let _fetching = false  // mutex sinkron — cegah concurrent fetch
let _done     = false  // flag "berhasil" — cegah re-fetch saat navigasi

// ── Core fetch ───────────────────────────────────────────────
async function fetchGlobalProfile(uid) {
  // Guard 1: UUID validation — blokir sebelum menyentuh Supabase
  if (!uid || typeof uid !== 'string' || !UUID_RE.test(uid)) return

  // Guard 2: sudah berhasil di sesi ini — skip
  if (_done) return

  // Guard 3: mutex — cegah concurrent call
  if (_fetching) return
  _fetching = true

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, role, avatar_url')
      .eq('id', uid)
      .single()

    // PGRST116 = "0 rows" — valid, user belum punya profile row
    if (error && error.code !== 'PGRST116') {
      console.error('[GlobalProfile] Supabase error:', error.message)
      return
    }

    globalProfile.value = data ?? null

    if (globalProfile.value) {
      _done = true
      console.log('[GlobalProfile] loaded ✓', globalProfile.value.role)
    } else {
      console.log('[GlobalProfile] no profile row for this user')
    }
  } catch (e) {
    console.error('[GlobalProfile] unexpected:', e)
  } finally {
    _fetching = false
  }
}

// ── Bootstrap — strategi dua lapis (diadopsi dari dashboard.vue) ─
//
// Lapis 1: useSupabaseUser() — cepat jika auth listener sudah selesai
// Lapis 2: supabase.auth.getSession() — baca langsung dari storage,
//          TIDAK bergantung pada timing reactive ref
//
// Inilah yang membuat dashboard selalu berhasil: ia tidak hanya
// menunggu reactive ref, tapi aktif membaca session dari storage.
async function bootstrap() {
  // Lapis 1 — cek reactive ref terlebih dahulu (sudah terisi?)
  if (user.value?.id) {
    console.log('[GlobalProfile] bootstrap via useSupabaseUser')
    await fetchGlobalProfile(user.value.id)
    return
  }

  // Lapis 2 — fallback: baca session langsung dari Supabase storage
  // Ini yang membedakan app.vue baru dengan versi lama
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.user?.id) {
    console.log('[GlobalProfile] bootstrap via getSession()')
    await fetchGlobalProfile(session.user.id)
    return
  }

  console.log('[GlobalProfile] no active session — user not logged in')
}

// ── Lifecycle ────────────────────────────────────────────────
onMounted(async () => {
  // bootstrap() menangani hard refresh dan semua kasus di mana
  // session sudah ada saat app mount — ini adalah jalur utama.
  await bootstrap()

  // Watch TANPA immediate:true — bootstrap() sudah handle initial load.
  // Watcher ini hanya aktif untuk login/logout runtime SETELAH mount.
  watch(user, async (u) => {
    if (u?.id && !_done) {
      console.log('[GlobalProfile] watcher: login detected')
      await fetchGlobalProfile(u.id)
    } else if (!u) {
      console.log('[GlobalProfile] watcher: logout detected')
      globalProfile.value = null
      _done     = false
      _fetching = false
    }
  })
})
</script>

<template>
  <div>
    <NuxtPage />
  </div>
</template>