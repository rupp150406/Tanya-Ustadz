<script setup lang="ts">
import UiThemeToggle from '~/components/ui/ThemeToggle.vue'
// ── Props ─────────────────────────────────────────────────────
const props = defineProps({
  error: Object
})

// ── Theme ─────────────────────────────────────────────────────
const { initTheme } = useTheme()
onMounted(() => initTheme())

// ── Clear Error Function ───────────────────────────────────────
const clearError = () => {
  // Clear the error and redirect to home
  return navigateTo('/')
}
</script>

<template>
  <body class="bg-white dark:bg-zinc-950 text-slate-900 dark:text-white transition-colors duration-300 overflow-hidden">
    <main class="relative min-h-screen w-full flex items-center justify-center p-6 overflow-hidden">

      <!-- Ambient Background -->
      <div class="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]"></div>
      <div class="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/5 blur-[120px]"></div>

      <!-- Theme Toggle — top-right corner -->
      <div class="absolute top-5 right-6 z-50">
        <UiThemeToggle />
      </div>

      <!-- Content -->
      <div class="relative z-10 max-w-2xl w-full flex flex-col items-center text-center">
        <div class="space-y-6">

          <!-- Icon -->
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-2">
            <span class="material-symbols-outlined text-4xl" style="font-variation-settings: 'FILL' 0;">error_outline</span>
          </div>

          <!-- Error Code -->
          <h1 class="font-display font-extrabold text-7xl md:text-9xl tracking-tighter text-primary">
            {{ error?.statusCode || 404 }}
          </h1>

          <!-- Error Message -->
          <p class="font-display text-xl md:text-2xl font-bold text-on-surface dark:text-white max-w-md mx-auto leading-tight">
            {{ error?.statusCode === 404 
              ? 'Maaf, pertanyaan atau halaman yang antum cari tidak ada.' 
              : error?.message || 'Terjadi kesalahan yang tidak terduga.' }}
          </p>

          <!-- Additional Context -->
          <p class="font-body text-sm md:text-base text-outline dark:text-slate-400 max-w-xs mx-auto">
            {{ error?.statusCode === 404 
              ? 'Mungkin halaman tersebut telah dipindahkan atau pertanyaannya sedang dalam proses moderasi.'
              : 'Silakan coba lagi atau hubungi tim support jika masalah berlanjut.' }}
          </p>

          <!-- CTA -->
          <div class="pt-8 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              @click="clearError"
              class="group relative px-8 py-4 bg-primary text-white font-bold rounded-lg shadow-[0px_12px_32px_rgba(0,105,72,0.2)] hover:shadow-[0px_12px_32px_rgba(0,105,72,0.4)] transition-all duration-300 active:scale-95 flex items-center gap-3"
            >
              <span class="material-symbols-outlined text-xl">home</span>
              <span>Kembali ke Beranda</span>
              <div class="absolute inset-0 rounded-lg bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </button>
          </div>

        </div>
      </div>


    </main>
  </body>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined');
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');

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

.font-display {
  font-family: 'Manrope', sans-serif;
}

.font-body {
  font-family: 'Plus Jakarta Sans', sans-serif;
}

body { 
  margin: 0; 
}

:deep(html::-webkit-scrollbar),
:deep(body::-webkit-scrollbar) {
  display: none;
  width: 0;
  height: 0;
}

:deep(html),
:deep(body) {
  scrollbar-width: none;
  -ms-overflow-style: none;
  overflow-y: auto;
  overflow-x: hidden;
}
</style>
