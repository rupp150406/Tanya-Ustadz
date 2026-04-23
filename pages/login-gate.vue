<script setup>
// Define page middleware for Gate 2 protection
definePageMeta({
  middleware: 'gate-guard'
})

// Cookie access for Gate 1 verification
const gateAccess = useCookie('gate_access')

// Handle Google login (only after Gate 1 verification)
const handleGoogleLogin = () => {
  console.log('Gate 2: Starting Google OAuth flow')
  // Trigger Google OAuth flow
  // e.g. navigateTo('/api/auth/google') or use nuxt-auth module
}

// Verify Gate 1 access on component mount
onMounted(() => {
  console.log('Gate 2: Checking Gate 1 access...')
  console.log('Gate 2: Cookie value:', gateAccess.value)
  
  // Double-check Gate 1 access (fallback if middleware missed it)
  if (gateAccess.value !== 'true') {
    console.log('Gate 2: No Gate 1 access, redirecting to password page')
    navigateTo('/password-page', { replace: true })
  } else {
    console.log('Gate 2: Gate 1 verified, ready for authentication')
  }
})
</script>

<template>
  <div class="text-on-surface antialiased overflow-x-hidden min-h-screen flex flex-col items-center justify-center p-4 md:p-8 bg-primary-bg">
    
    <!-- Back to Home Floating -->
    <NuxtLink
      to="/"
      class="fixed top-8 left-8 flex items-center gap-2 text-white hover:text-primary transition-colors z-50 hidden lg:flex"
    >
      <span class="material-symbols-outlined text-sm">arrow_back</span>
      <span class="text-xs font-semibold uppercase tracking-wider">Kembali ke Beranda</span>
    </NuxtLink>

    <!-- Main Content Card -->
    <div class="login-container w-full max-w-5xl flex flex-col md:flex-row p-6 md:p-8 gap-8 items-stretch min-h-[600px]">
      
      <!-- Left Side: Scenic Image -->
      <div class="w-full md:w-[45%] flex-shrink-0">
        <div class="relative w-full h-[600px] overflow-hidden rounded-3xl shadow-2xl">
          <img
            alt="Scenic vertical landscape"
            class="w-full h-full object-cover"
            src="https://lh3.googleusercontent.com/aida/ADBb0uijhQinQEsjheKA67fvwbRL0K4ANkDDJMgCi8hps4xd7pDx3CIYRgZ4OGvZnmv8X-XqNbr2AF43hOgFfD09pF3D7leHut3_Ts4C4dCgbemsGd2z1OcJgRA-LapDFUrZacdS9EkUeu5erqw4YYBATKL8spWezAOSKq89LK05Jn2kmNlmxkuJccrtgnOr0uy5Z00q_qK_vocIj09CUNfJ_P9KwdcwGeYNKblGsoyDjaE_eSJgk7jUhLZBoifkrMpIlzxUpYp_PSQ9lQ"
          />
        </div>
      </div>

      <!-- Right Side: Auth Panel -->
      <div class="w-full md:w-[55%] flex flex-col items-center justify-center px-4 md:px-12 text-center">
        
        <!-- Branding -->
        <div class="mb-12 flex flex-col items-center gap-2">
          <div class="text-xl font-bold text-primary italic">Tanya Ustadz</div>
        </div>


        <div class="w-full max-w-sm">
          <h1 class="text-3xl font-bold text-on-surface mb-3">Selamat Datang Kembali</h1>
          <p class="text-on-surface-variant text-sm mb-10">Pilih metode masuk untuk mengelola pertanyaan umat.</p>

          <!-- Google Login Button -->
          <button
            class="w-full flex items-center justify-center gap-3 py-3 px-6 border border-outline-variant hover:bg-gray-50 transition-all rounded-full group active:scale-[0.98] mb-8"
            @click="handleGoogleLogin"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span class="font-medium text-on-surface">Lanjutkan dengan Google</span>
          </button>

          <!-- Helper Link -->
          <p class="text-sm text-on-surface-variant">
            Butuh bantuan akses?
            <NuxtLink to="#" class="text-primary font-bold hover:underline underline-offset-4 ml-1">
              Hubungi Admin IT
            </NuxtLink>
          </p>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <footer class="w-full max-w-5xl mt-8 px-4">
      <div class="flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] md:text-xs font-bold text-white tracking-widest uppercase">
        <div class="flex gap-8">
          <NuxtLink to="#" class="hover:text-primary transition-colors">KEBIJAKAN PRIVASI</NuxtLink>
          <NuxtLink to="#" class="hover:text-primary transition-colors">SYARAT &amp; KETENTUAN</NuxtLink>
        </div>
        <div class="opacity-70">
          © 2026 Ahsan TV. All Rights Reserved by Team IT
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.bg-primary-bg {
  background-color: #259869;
}

.login-container {
  background-color: #ffffff;
  border-radius: 40px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);
}

.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}
</style>