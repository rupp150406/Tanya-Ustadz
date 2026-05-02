<script setup>
// Define page middleware for Gate 2 protection
definePageMeta({
  middleware: 'gate-guard'
})

// Supabase client and user state
const supabase = useSupabaseClient()
const user = useSupabaseUser()

// Cookie access for Gate 1 verification
const gateAccess = useCookie('gate_access')

// Loading state for OAuth
const isAuthenticating = ref(false)

// Handle Google OAuth login
const handleGoogleLogin = async () => {
  try {
    isAuthenticating.value = true
    console.log('Gate 2: Starting Google OAuth flow')
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/login-gate`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
    
    if (error) {
      console.error('OAuth Error:', error.message)
      throw error
    }
  } catch (error) {
    console.error('Login failed:', error)
    // You could show an error message to user here
  } finally {
    isAuthenticating.value = false
  }
}

// Check user role and redirect accordingly
const handleUserSession = async (currentUser) => {
  if (!currentUser) return
  
  try {
    console.log('Gate 2: User authenticated, ensuring session synchronization...')
    
    // Ensure session is properly synchronized before redirect
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      console.log('Gate 2: Session not synchronized, waiting...')
      // Wait a moment for session to sync
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    console.log('Gate 2: Session synchronized, redirecting to select-role')
    
    // Always redirect to select-role after successful login
    // Let select-role handle the role validation and navigation
    await navigateTo('/select-role', { replace: true })
    
  } catch (error) {
    console.error('Error handling user session:', error)
  }
}

// Watch user state changes
watch(user, (currentUser) => {
  if (currentUser) {
    handleUserSession(currentUser)
  }
}, { immediate: true })

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
    
    // Refresh gate access cookie if needed (optional)
    if (user.value) {
      console.log('Gate 2: User already authenticated, checking role...')
      handleUserSession(user.value)
    }
  }
})
</script>

<template>
  <div class="text-on-surface antialiased overflow-x-hidden min-h-screen flex flex-col items-center p-4 md:p-8 bg-primary-bg">
    
    <!-- Back to Home Floating (Mobile optimized) --> 
    <NuxtLink
      to="/"
      class="self-start mb-6 flex items-center gap-2 text-white hover:text-primary transition-colors z-50 lg:fixed lg:top-8 lg:left-8 lg:mb-0"
    >
      <span class="material-symbols-outlined text-sm">arrow_back</span>
      <span class="text-xs font-semibold uppercase tracking-wider">Kembali ke Beranda</span>
    </NuxtLink>

    <!-- Main Content Card -->
    <div class="login-container w-full max-w-5xl flex flex-col md:flex-row p-6 md:p-8 gap-8 items-stretch md:min-h-[600px]">
      
      <!-- Top (Mobile) / Left (Desktop): Scenic Image -->
      <div class="w-full md:w-[45%] flex-shrink-0">
        <div class="image-container w-full h-[300px] md:h-full min-h-[300px] md:min-h-[400px] overflow-hidden">
          <img
            alt="Scenic landscape"
            class="w-full h-full object-cover"
            src="https://ahsan.tv/wp-content/uploads/2026/04/rumah.jpg"
          />
        </div>
      </div>

      <!-- Bottom (Mobile) / Right (Desktop): Auth Panel -->
      <div class="w-full md:w-[55%] flex flex-col items-center justify-center px-2 md:px-12 text-center py-4 md:py-0">
        
        <!-- Branding/Logo -->
        <div class="mb-8 md:mb-12 flex flex-col items-center gap-2">
          <div class="text-xl font-bold text-primary italic">Tanya Ustadz</div>
        </div>

        <div class="w-full max-w-sm">
          <h1 class="text-2xl md:text-3xl font-bold text-on-surface mb-3">Selamat Datang Kembali</h1>
          <p class="text-on-surface-variant text-sm mb-8 md:mb-10">Pilih metode masuk untuk mengelola pertanyaan umat.</p>

          <!-- Google Login Button (Large for mobile accessibility) -->
          <button
            class="w-full flex items-center justify-center gap-3 py-4 px-6 border border-outline-variant hover:bg-gray-50 transition-all rounded-full group active:scale-[0.98] mb-8 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            @click="handleGoogleLogin"
            :disabled="isAuthenticating"
          >
            <span v-if="isAuthenticating" class="material-symbols-outlined animate-spin">sync</span>
            <svg v-else class="w-6 h-6" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span class="font-semibold text-on-surface">
              {{ isAuthenticating ? 'Menghubungkan...' : 'Lanjutkan dengan Google' }}
            </span>
          </button>

          <!-- Helper Link -->
          <p class="text-sm text-on-surface-variant mb-4 md:mb-0">
            Butuh bantuan akses?
            <NuxtLink to="#" class="text-primary font-bold hover:underline underline-offset-4 ml-1">
              Hubungi Admin IT
            </NuxtLink>
          </p>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <footer class="w-full max-w-5xl mt-auto md:mt-8 py-8 px-4">
      <div class="flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] md:text-xs font-bold text-white tracking-widest uppercase">
        <div class="flex gap-6 md:gap-8 flex-wrap justify-center">
          <NuxtLink to="#" class="hover:text-primary transition-colors">KEBIJAKAN PRIVASI</NuxtLink>
          <NuxtLink to="#" class="hover:text-primary transition-colors">SYARAT &amp; KETENTUAN</NuxtLink>
        </div>
        <div class="opacity-70 text-center">
          2026 Ahsan TV. All Rights Reserved by Team IT
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

.image-container {
  border-radius: 32px;
}

.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}

@media (max-width: 767px) {
  .login-container {
    border-radius: 24px;
    padding: 16px;
  }
  .image-container {
    border-radius: 16px;
    height: 300px !important;
    min-height: 300px !important;
  }
}
</style>