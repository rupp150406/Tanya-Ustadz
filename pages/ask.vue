<script setup>
// 1. Import useQuestions dan helper Nuxt
const { addQuestion, pending: isSubmitting } = useQuestions()

const category = ref('Fikih')
const questionText = ref('')
const maxChars = 500

// State untuk Custom Alert
const showAlert = ref(false)
const alertTitle = ref('Warning!')
const alertMessage = ref('')
const isSuccess = ref(false)

const charCount = computed(() => questionText.value.length)

// List Kategori disesuaikan dengan VALID_CATEGORIES di server
const categories = [
  { id: 'Fikih', icon: 'balance', label: 'Fikih', class: '' },
  { id: 'Akhlak & Adab', icon: 'favorite', label: 'Akhlak', class: '' },
  { id: 'Keluarga', icon: 'family_restroom', label: 'Keluarga', class: '' },
  { id: 'Muamalah', icon: 'payments', label: 'Muamalah', class: '' },
  { id: 'Umum', icon: 'language', label: 'Umum', class: 'col-span-2 md:col-span-1' },
]

// Fungsi Helper untuk Fingerprint
const getFingerprint = () => {
  if (process.server) return ''
  let fp = localStorage.getItem('user_fingerprint')
  if (!fp) {
    fp = 'fp_' + Math.random().toString(36).substring(2, 15)
    localStorage.setItem('user_fingerprint', fp)
  }
  return fp
}

// Fungsi memicu alert kustom
const triggerAlert = (title, message, success = false) => {
  alertTitle.value = title
  alertMessage.value = message
  isSuccess.value = success
  showAlert.value = true
}

const closeAlert = () => {
  showAlert.value = false
  if (isSuccess.value) {
    navigateTo('/')
  }
}

// 2. Update handleSubmit
const handleSubmit = async () => {
  if (!questionText.value.trim()) {
    return triggerAlert('Peringatan', 'Isi pertanyaan tidak boleh kosong.')
  }
  
  try {
    await addQuestion({
      question: questionText.value,
      category: category.value,
      fingerprint: getFingerprint()
    })
    
    // Tampilkan alert sukses
    triggerAlert('Berhasil!', 'Pertanyaan Anda telah terkirim secara anonim.', true)
    questionText.value = ''
  } catch (err) {
    const errorMsg = err.data?.message || 'Terjadi kesalahan saat mengirim pertanyaan.'
    triggerAlert('Warning!', errorMsg, false)
  }
}
</script>

<template>
  <div class="bg-background text-on-surface font-body antialiased min-h-screen">
<div 
      class="alert-overlay" 
      :class="{ 'active': showAlert }"
      @click.self="closeAlert"
    >
      <div class="alert-card shadow-2xl">
        <div class="alert-header" :class="isSuccess ? 'bg-emerald-600' : 'bg-[#004d36]'">
          <div class="lottie-container">
            <iframe 
              :key="showAlert"
              :src="isSuccess 
                ? 'https://lottie.host/embed/19c599af-dfb9-40ea-b2ed-14d2ed7f9d5b/PlnHXxxyYt.lottie?loop=0' 
                : 'https://lottie.host/embed/90176d91-4978-4297-812d-178a24962b88/MDQJhvWqPS.lottie?loop=0'" 
              style="border: none; width: 100%; height: 100%; pointer-events: none;"
            ></iframe>
          </div>
        </div>
        <div class="alert-content">
          <h2 class="alert-title">{{ alertTitle }}</h2>
          <p class="alert-message">{{ alertMessage }}</p>
          <button 
            @click="closeAlert" 
            class="alert-button text-white transition-transform active:scale-95" 
            :class="isSuccess ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-[#004d36] hover:bg-[#003626]'"
          >
            {{ isSuccess ? 'Kembali ke Home' : 'Tutup' }}
          </button>
        </div>
      </div>
    </div>

    <header class="bg-surface/70 backdrop-blur-md sticky top-0 z-50 shadow-sm bg-gradient-to-b from-slate-100/10 to-transparent">
      <div class="flex justify-between items-center w-full px-6 py-3 max-w-screen-2xl mx-auto">
        <div class="flex items-center gap-4">
          <NuxtLink to="/" class="text-2xl font-bold tracking-tighter text-emerald-800">
            Tanya Ustadz
          </NuxtLink>
        </div>
      </div>
    </header>

    <main class="flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden text-on-surface">
      <div class="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]"></div>
      <div class="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/5 blur-[120px]"></div>

      <div class="w-full max-w-2xl z-10">
        <div class="text-center mb-10 space-y-3">
          <h1 class="font-headline font-extrabold text-4xl md:text-5xl tracking-tight">
            Sampaikan <span class="text-primary">Pertanyaanmu</span>
          </h1>
          <p class="text-on-surface-variant text-lg max-w-md mx-auto leading-relaxed">
            Ajukan pertanyaan seputar hukum Islam kepada para asatidzah yang kompeten dengan penuh ketenangan.
          </p>
        </div>

        <div class="bg-surface-container-lowest rounded-[2rem] shadow-[0px_12px_32px_rgba(20,28,43,0.06)] overflow-hidden p-8 md:p-12">
          <div class="mb-8 flex items-center gap-3 p-4 rounded-xl bg-tertiary-fixed text-on-tertiary-fixed-variant">
            <span class="material-symbols-outlined text-tertiary">info</span>
            <p class="text-sm font-medium">Batas bertanya: 5 pertanyaan setiap 5 menit untuk menjaga kualitas layanan.</p>
          </div>

          <form @submit.prevent="handleSubmit" class="space-y-8">
            <div class="space-y-4">
              <label class="block font-headline font-bold text-sm uppercase tracking-widest ml-1">
                Pilih Kategori
              </label>
              <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
                <label v-for="cat in categories" :key="cat.id" :class="['cursor-pointer group', cat.class]">
                  <input 
                    type="radio" 
                    name="category" 
                    :value="cat.id" 
                    v-model="category" 
                    class="sr-only peer"
                    :disabled="isSubmitting"
                  />
                  <div class="px-3 py-4 rounded-2xl bg-surface-container-low text-center transition-all duration-200 peer-checked:bg-primary peer-checked:text-on-primary hover:bg-surface-container-high group-active:scale-95 flex flex-col items-center justify-center peer-disabled:opacity-50">
                    <span class="material-symbols-outlined block mb-1">{{ cat.icon }}</span>
                    <span class="text-xs font-bold">{{ cat.label }}</span>
                  </div>
                </label>
              </div>
            </div>

            <div class="space-y-4">
              <label class="block font-headline font-bold text-sm uppercase tracking-widest ml-1">
                Isi Pertanyaan
              </label>
              <div class="relative">
                <textarea 
                  v-model="questionText"
                  :maxlength="maxChars"
                  :disabled="isSubmitting"
                  rows="4"
                  class="w-full bg-surface-container-low border-none rounded-3xl p-6 focus:ring-2 focus:ring-primary/20 text-on-surface placeholder:text-outline/60 resize-none disabled:opacity-50 transition-all"
                  placeholder="Tuliskan pertanyaan Anda..."
                ></textarea>
                <div class="absolute bottom-4 right-6 text-xs font-medium text-outline">
                  <span>{{ charCount }}</span>/{{ maxChars }}
                </div>
              </div>
            </div>

            <button 
              type="submit"
              :disabled="isSubmitting"
              class="w-full py-4 px-8 rounded-full bg-gradient-to-br from-primary to-primary-container text-white font-headline font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-70"
            >
              <span v-if="isSubmitting" class="material-symbols-outlined animate-spin">sync</span>
              <span v-else class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">send</span>
              {{ isSubmitting ? 'Mengirim...' : 'Kirim Pertanyaan Anonim' }}
            </button>
          </form>

          <div class="mt-12 pt-8 border-t border-outline-variant/15 text-center">
            <div class="flex flex-col items-center gap-2">
              <div class="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center mb-2">
                <span class="material-symbols-outlined text-on-secondary-container">verified_user</span>
              </div>
              <h3 class="font-headline font-bold">Apa yang terjadi setelah ini?</h3>
              <p class="text-sm text-on-surface-variant max-w-sm">
                Pertanyaan Anda akan ditinjau oleh tim admin kami sebelum dijawab oleh Ustadz.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="fixed top-20 right-[-10%] w-96 h-96 opacity-10 pointer-events-none">
        <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuALbJLnCOM9cscKqUVeAc6HaUh6ox8tiEyVRPs1cJ6UgN7KrF24OGrU5az_RWDAvA10-uTdOAP34sX8cgdPEUUsVpk92CYD2BiEYrUMylSHJ7GcPqU920wj23DrhBxtV9VKRk4fcRQwvxS6uod1gZCZv1x6l8hSXnEcdN_UDJ1XYBpJ6Ic8ODYvzh2pSHTvIYi6MUX2gMPjKjOYCVo5uarM8wDrddwB_7rn0dikfFaa5mCxH_KmXzzyT-maLkY-t1JspKskZUKKFRs" alt="" class="w-full h-full text-primary" />
      </div>
    </main>
  </div>
</template>

<style scoped>
/* Custom Alert Styles (Integrasi dari alert.html) */
.alert-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
}

.alert-overlay.active {
  opacity: 1;
  visibility: visible;
}

.alert-card {
  background: white;
  border-radius: 24px;
  width: 90%;
  max-width: 400px;
  overflow: hidden;
  transform: scale(0.9);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.alert-overlay.active .alert-card {
  transform: scale(1);
}

.alert-header {
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.alert-content {
  padding: 32px 24px;
  text-align: center;
}

.alert-title {
  font-size: 24px;
  font-weight: 800;
  color: #1f2937;
  margin-bottom: 8px;
}

.alert-message {
  font-size: 16px;
  color: #6b7280;
  line-height: 1.5;
  margin-bottom: 24px;
}

.alert-button {
  color: white;
  font-weight: 700;
  padding: 12px 48px;
  border-radius: 9999px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.alert-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 105, 72, 0.3);
}

.lottie-container {
  width: 100px;
  height: 100px;
}

.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}
</style>