<script setup>
// Mengambil fungsi toggle dari composable UI yang sudah kita buat
const { toggleSidebar } = useUI()

// Tab state
const activeTab = ref('belum-dijawab')
const tabs = [
  { id: 'semua', label: 'Semua' },
  { id: 'belum-dijawab', label: 'Belum Dijawab' },
  { id: 'terjawab', label: 'Terjawab' }
]

// Search state
const searchQuery = ref('')
</script>

<template>
  <div class="sticky top-0 z-50 w-full">
    <!-- Green Header -->
    <header class="w-full bg-emerald-700">
      <div class="max-w-md mx-auto px-4 py-4">
        <div class="flex items-center gap-3">
          <!-- Microphone Icon -->
          <div class="flex items-center justify-center">
            <svg width="40" height="48" viewBox="0 0 40 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 4C16.6863 4 14 6.68629 14 10V24C14 27.3137 16.6863 30 20 30C23.3137 30 26 27.3137 26 24V10C26 6.68629 23.3137 4 20 4Z" stroke="white" stroke-width="2.5" fill="none"/>
              <path d="M10 20V24C10 29.5228 14.4772 34 20 34C25.5228 34 30 29.5228 30 24V20" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
              <path d="M20 34V40" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
              <path d="M14 40H26" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
              <!-- Sound waves -->
              <path d="M8 14C6 16 6 20 8 22" stroke="white" stroke-width="2" stroke-linecap="round"/>
              <path d="M32 14C34 16 34 20 32 22" stroke="white" stroke-width="2" stroke-linecap="round"/>
              <path d="M5 12C2 15 2 21 5 24" stroke="white" stroke-width="2" stroke-linecap="round"/>
              <path d="M35 12C38 15 38 21 35 24" stroke="white" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <!-- Title -->
          <div>
            <h1 class="font-bold text-white leading-none text-2xl">Tanya</h1>
            <h1 class="font-bold text-white leading-none text-2xl">Ustadz</h1>
          </div>
        </div>
      </div>
    </header>

    <!-- White Tab Bar -->
    <nav class="w-full bg-white border-b border-gray-200">
      <div class="max-w-md mx-auto">
        <div class="flex">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            class="flex-1 py-4 text-center font-medium text-base transition-colors relative"
            :class="activeTab === tab.id ? 'text-emerald-600' : 'text-gray-800'"
          >
            {{ tab.label }}
            <!-- Active indicator -->
            <span
              v-if="activeTab === tab.id"
              class="absolute bottom-0 left-0 right-0 h-1 bg-emerald-600"
            ></span>
          </button>
        </div>
      </div>
    </nav>

    <!-- Search Bar -->
    <div class="w-full bg-white px-4 py-3">
      <div class="max-w-md mx-auto">
        <div class="relative">
          <svg 
            class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" 
            xmlns="http://www.w3.org/2000/svg" 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            stroke-width="2" 
            stroke-linecap="round" 
            stroke-linejoin="round"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.3-4.3"></path>
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari pertanyaan atau topik..."
            class="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-xl text-gray-700 placeholder-gray-400 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* No additional styles needed - all handled by Tailwind */
</style>