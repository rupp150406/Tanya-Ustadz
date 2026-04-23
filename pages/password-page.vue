<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useCookie, useRuntimeConfig } from '#imports'

// Runtime config for secure password access
const config = useRuntimeConfig()

// Cookie management for middleware synchronization
const gateAccess = useCookie('gate_access', {
  default: () => null,
  maxAge: 60 * 60 * 24, // 1 day expiration
  path: '/',
  watch: true // Ensure reactivity
})

// Reactive state
const password = ref('')
const showError = ref(false)
const errorMessage = ref('')
const isLoading = ref(false)

// Password validation function
const validatePassword = async () => {
  if (!password.value.trim()) {
    showError.value = true
    errorMessage.value = 'Kata sandi tidak boleh kosong.'
    return
  }

  isLoading.value = true
  showError.value = false
  errorMessage.value = ''

  try {
    // Simulate processing delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500))

    // Check against environment variable
    if (password.value === config.public.adminGatePassword) {
      console.log('✅ Password validation SUCCESS')
      
      // Save authentication status in cookie for middleware access
      gateAccess.value = 'true'
      console.log('🍪 Cookie set to:', gateAccess.value)
      
      // Cleanup state before navigation
      isLoading.value = false
      showError.value = false
      errorMessage.value = ''
      
      // Race condition prevention: Ensure cookie is fully persisted
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 200)) // 200ms delay
      
      console.log('🚀 Attempting navigation to /login-gate')
      
      try {
        // Primary navigation method
        await navigateTo('/login-gate', { replace: true })
        console.log('✅ navigateTo succeeded')
      } catch (navError) {
        console.log('❌ navigateTo failed:', navError)
        console.log('🔄 Using fallback: window.location.href')
        
        // Hard redirect fallback to force browser to send new cookie
        window.location.href = '/login-gate'
      }
    } else {
      showError.value = true
      errorMessage.value = 'Kata sandi salah. Silakan coba lagi.'
      
      // Add shake animation to card
      const card = document.querySelector('.glass-card')
      if (card) {
        card.classList.add('animate-shake')
        setTimeout(() => {
          card.classList.remove('animate-shake')
        }, 500)
      }
    }
  } catch (error) {
    showError.value = true
    errorMessage.value = 'Terjadi kesalahan. Silakan coba lagi.'
  } finally {
    isLoading.value = false
  }
}

// Handle form submission
const handleSubmit = async (e) => {
  e.preventDefault() // Prevent native HTML reload
  await validatePassword()
}

// Toggle password visibility
const showPassword = ref(false)
const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value
}

// Check if already authenticated on mount
onMounted(() => {
  console.log('🔍 onMounted - Cookie value:', gateAccess.value)
  
  if (gateAccess.value === 'true') {
    console.log('✅ onMounted - Redirecting to /login-gate')
    navigateTo('/login-gate', { replace: true })
  } else {
    console.log('❌ onMounted - No valid cookie found')
  }
})
</script>

<template>
  <div class="bg-background font-body text-on-surface antialiased min-h-screen flex items-center justify-center p-6 islamic-pattern">
    
    <!-- Top Navigation -->
    <header class="fixed top-0 left-0 w-full p-8 flex justify-center md:justify-start pointer-events-none">
          <header class="bg-surface/70 backdrop-blur-md sticky top-0 z-50 shadow-sm bg-gradient-to-b from-slate-100/10 to-transparent">
      <div class="flex justify-between items-center w-full px-6 py-3 max-w-screen-2xl mx-auto">
        <div class="flex items-center gap-4">
          <NuxtLink to="/" class="text-2xl font-bold tracking-tighter text-emerald-800">
            Tanya Ustadz
          </NuxtLink>
        </div>
      </div>
    </header>
    </header>

    <main class="w-full max-w-md">
      <!-- Secure Gate Card -->
      <div class="glass-card rounded-[2.5rem] p-8 md:p-12 shadow-[0px_12px_32px_rgba(20,28,43,0.06)] flex flex-col items-center text-center relative overflow-hidden">
        
        <!-- Visual Accent Line -->
        <div class="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>
        
        <!-- Lock Icon Container -->
        <div class="w-20 h-20 bg-secondary-container text-on-secondary-container rounded-full flex items-center justify-center mb-8">
          <span class="material-symbols-outlined text-4xl" style="font-variation-settings: 'FILL' 1;">lock_person</span>
        </div>

        <!-- Content Hierarchy -->
        <h1 class="font-headline text-3xl font-extrabold text-on-surface mb-3 tracking-tight">
          Akses Terbatas
        </h1>
        <p class="font-body text-on-surface-variant text-sm md:text-base leading-relaxed mb-10 px-2">
          Silakan masukkan kata sandi untuk melanjutkan ke panel ustadz.
        </p>

        <!-- Access Form -->
        <form @submit="handleSubmit" class="w-full space-y-6">
          <div class="relative group">
            <div class="absolute inset-y-0 left-4 flex items-center pointer-events-none text-outline">
              <span class="material-symbols-outlined text-[20px]">key</span>
            </div>
            <input 
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              class="w-full pl-12 pr-12 py-4 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all text-on-surface placeholder:text-outline/60 font-medium disabled:opacity-50 disabled:cursor-not-allowed" 
              placeholder="Masukkan Kata Sandi"
              :disabled="isLoading"
            />
            <button 
              type="button"
              @click="togglePasswordVisibility"
              class="absolute inset-y-0 right-4 flex items-center text-outline hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
              :disabled="isLoading"
            >
              <span class="material-symbols-outlined text-[20px]">
                {{ showPassword ? 'visibility_off' : 'visibility' }}
              </span>
            </button>
          </div>

          <!-- Error Message -->
          <div v-if="showError" class="p-4 bg-error/10 border border-error/20 rounded-2xl flex items-center gap-2">
            <span class="material-symbols-outlined text-error text-[18px] shrink-0">error</span>
            <p class="text-error text-sm font-medium text-left">{{ errorMessage }}</p>
          </div>

          <button 
            type="submit"
            :disabled="isLoading || !password.trim()"
            class="w-full py-4 bg-gradient-to-br from-primary to-primary-container text-white font-bold rounded-2xl shadow-[0px_8px_24px_rgba(0,105,72,0.25)] hover:shadow-[0px_12px_32px_rgba(0,105,72,0.35)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:active:scale-100"
          >
            <span v-if="isLoading" class="material-symbols-outlined animate-spin">sync</span>
            <span v-else class="material-symbols-outlined">verified_user</span>
            {{ isLoading ? 'Memverifikasi...' : 'Buka Akses' }}
          </button>
        </form>

        <!-- Security Notice -->
        <div class="mt-8 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-outline/60">
          <span class="material-symbols-outlined text-[14px]">shield</span>
          Sistem Terenkripsi
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="mt-10 text-center space-y-4">
        <p class="text-sm font-medium text-on-surface-variant">
          Lupa kata sandi? 
          <a href="#" class="text-primary hover:underline underline-offset-4 decoration-primary/30 transition-all font-semibold ml-1">
            Hubungi Admin IT.
          </a>
        </p>
      </div>
    </main>

    <!-- Decorative Bottom Gradient -->
    <div class="fixed bottom-0 left-0 w-full h-32 bg-gradient-to-t from-primary/5 to-transparent pointer-events-none"></div>
    
    <!-- Background Illustration Details -->
    <div class="fixed -bottom-20 -right-20 w-80 h-80 opacity-[0.03] pointer-events-none">
      <span class="material-symbols-outlined text-[320px] text-primary">auto_awesome</span>
    </div>
    <div class="fixed -top-20 -left-20 w-80 h-80 opacity-[0.03] pointer-events-none rotate-45">
      <span class="material-symbols-outlined text-[320px] text-primary" style="font-variation-settings: 'FILL' 1;">star_rate</span>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0');

.islamic-pattern {
  background-color: #f9f9ff;
  background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l2.5 12.5L45 15l-12.5 2.5L30 30l-2.5-12.5L15 15l12.5-2.5z' fill='%23006948' fill-opacity='0.03' fill-rule='evenodd'/%3E%3C/svg%3E");
}

.glass-card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
}

.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}

/* Shake animation for wrong password */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
  20%, 40%, 60%, 80% { transform: translateX(5px); }
}

.animate-shake {
  animation: shake 0.5s ease-in-out;
}

/* Spin animation for loading state */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

/* Hide scrollbar for clean look */
:deep(html::-webkit-scrollbar),
:deep(body::-webkit-scrollbar) {
  display: none;
}

:deep(html),
:deep(body) {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
</style>