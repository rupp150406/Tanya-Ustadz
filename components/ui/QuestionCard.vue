<template>
  <div 
    class="relative overflow-hidden rounded-2xl border-4 transition-all duration-300"
    :class="[
      isAnswered ? 'border-emerald-600 bg-white shadow-sm' : 'border-teal-700 bg-stone-50'
    ]"
  >
    <!-- Header: Hamba Allah #ID + Pending Badge -->
    <div class="flex items-center justify-between px-5 pt-5 pb-2">
      <span 
        class="text-base tracking-wide"
        :class="isAnswered ? 'text-emerald-600 font-semibold' : 'text-gray-700'"
      >
        Hamba Allah #{{ ticketId }}
      </span>
      <span 
        v-if="!isAnswered" 
        class="inline-flex items-center gap-1.5 rounded-full border-2 bg-amber-200/80 px-4 py-1 text-sm font-medium text-amber-800"
      >
        Pending
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12,6 12,12 16,14"/>
        </svg>
      </span>
    </div>

    <!-- Question Title -->
    <div class="px-5 pb-4">
      <h2 class="text-2xl font-bold leading-tight text-gray-900">
        {{ question.question }}
      </h2>
    </div>

    <div class="px-5 pb-4">
      <!-- Pending State: Verification Box -->
      <div v-if="!isAnswered" class="rounded-xl border-2 border-dashed border-amber-400 bg-amber-100/70 px-4 py-3">
        <div class="flex items-center gap-2 text-amber-800">
          <svg class="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 2v2H4v4l2 4-2 4v4h2v2h12v-2h2v-4l-2-4 2-4V4h-2V2H6zm2 2h8v1.5l-2.5 5 2.5 5V18H8v-2.5l2.5-5-2.5-5V4z"/>
          </svg>
          <span class="text-sm font-medium">Sedang diverifikasi oleh Admin...</span>
        </div>
      </div>

      <!-- Answered State -->
      <div v-else class="space-y-3">
        <div class="rounded-xl bg-emerald-600 p-4 text-white">
          <div class="mb-1 flex items-center gap-1.5 opacity-80">
            <component :is="CheckBadgeIcon" class="h-4 w-4" />
            <span class="text-[10px] font-bold uppercase tracking-widest">Jawaban Ustadz</span>
          </div>
          <p class="text-sm leading-relaxed">
            {{ question.answer }}
          </p>
        </div>
      </div>
    </div>

    <!-- Footer: Delete Timer + Vote Button -->
    <div class="flex items-center justify-between px-5 pb-5">
      <div class="flex items-center gap-2 text-gray-600">
        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12,6 12,12 16,14"/>
        </svg>
        <span class="text-sm">Hapus dalam {{ daysRemaining }} hari</span>
      </div>
      
      <button 
        @click="handleVote"
        :disabled="isVoting"
        class="flex items-center gap-2 rounded-xl border-2 px-4 py-1.5 transition-colors"
        :class="hasVoted ? 'border-teal-700 bg-teal-50 text-teal-700' : 'border-teal-700 bg-white text-teal-700 hover:bg-teal-50'"
      >
        <svg 
          class="h-5 w-5" 
          viewBox="0 0 24 24" 
          :fill="hasVoted ? 'currentColor' : 'none'" 
          stroke="currentColor" 
          stroke-width="2"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
        <span class="text-base font-bold">{{ question.upvotes || 0 }}</span>
      </button>
    </div>

    <div v-if="mode !== 'jemaah'" class="border-t border-gray-100 bg-gray-50/50 p-3">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { HeartIcon, CheckBadgeIcon } from '@heroicons/vue/24/outline'

const props = defineProps({
  question: { type: Object, required: true },
  mode: { type: String, default: 'jemaah' } // jemaah, admin, ustadz
})

// Logic Ticket ID: Ambil 4 digit terakhir UUID (Acuan Baku)
const ticketId = computed(() => props.question.id?.slice(-4).toUpperCase() || '....')

// Logic Expiry: Hitung sisa hari dari 30 hari (Acuan Baku)
const daysRemaining = computed(() => {
  if (!props.question.created_at) return 30

  const created = new Date(props.question.created_at)
  const now = new Date()
  const diffTime = Math.abs(now - created)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return Math.max(0, 30 - diffDays)
})

const isAnswered = computed(() => props.question.status === 'answered')

// Upvote State (Local only for UI feedback)
const isVoting = ref(false)
const hasVoted = ref(false) // Idealnya cek localStorage via useFingerprint.ts

const handleVote = async () => {
  if (hasVoted.value) return
  isVoting.value = true
  // Di sini nanti panggil emit atau function dari useQuestions.ts
  // emit('vote', props.question.id)
  setTimeout(() => {
    isVoting.value = false
    hasVoted.value = true
  }, 500)
}
</script>