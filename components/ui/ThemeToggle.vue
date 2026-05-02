<script setup>
// ─── useTheme composable is the single source of truth ───────
// This component is a pure consumer: it reads isDark and calls toggle().
const { isDark, toggle } = useTheme()
</script>

<template>
  <button
    @click="toggle"
    :aria-label="isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
    :title="isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
    class="relative flex items-center w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 shrink-0"
    :class="isDark
      ? 'bg-primary/20 border border-primary/30'
      : 'bg-surface-container-high border border-outline-variant/30'"
  >
    <!-- Track Icons -->
    <span
      class="absolute left-1.5 material-symbols-outlined transition-opacity duration-200 text-amber-500"
      style="font-size: 14px; font-variation-settings: 'FILL' 1;"
      :class="isDark ? 'opacity-30' : 'opacity-100'"
    >light_mode</span>
    <span
      class="absolute right-1.5 material-symbols-outlined transition-opacity duration-200 text-primary"
      style="font-size: 14px; font-variation-settings: 'FILL' 1;"
      :class="isDark ? 'opacity-100' : 'opacity-30'"
    >dark_mode</span>

    <!-- Thumb -->
    <span
      class="absolute w-5 h-5 rounded-full shadow-md transition-all duration-300 flex items-center justify-center"
      :class="isDark
        ? 'translate-x-7 bg-primary'
        : 'translate-x-1 bg-white'"
    >
      <span
        class="material-symbols-outlined transition-all duration-300"
        style="font-size: 11px; font-variation-settings: 'FILL' 1;"
        :class="isDark ? 'text-white' : 'text-amber-500'"
      >
        {{ isDark ? 'dark_mode' : 'light_mode' }}
      </span>
    </span>
  </button>
</template>