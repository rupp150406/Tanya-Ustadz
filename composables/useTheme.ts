// composables/useTheme.ts
// ─────────────────────────────────────────────────────────────
// Single source of truth for the app-wide dark-mode toggle.
//
// Rules:
//  • Default = DARK  (as per spec)
//  • Persisted in localStorage so the preference survives refreshes
//  • Synced to <html class="dark"> so Tailwind's dark: variants fire
//  • useState ensures the same ref is shared across every page/component
//    without a Pinia store
// ─────────────────────────────────────────────────────────────

export const useTheme = () => {
  // useState key must be unique and stable across the whole app
  const isDark = useState<boolean>('theme-is-dark', () => true) // default: dark

  /**
   * Apply the current isDark value to the DOM and persist it.
   * Safe to call in onMounted (client-only).
   */
  const applyTheme = (dark: boolean) => {
    if (import.meta.client) {
      const html = document.documentElement
      if (dark) {
        html.classList.add('dark')
      } else {
        html.classList.remove('dark')
      }
      try {
        localStorage.setItem('theme', dark ? 'dark' : 'light')
      } catch {
        // localStorage blocked (private browsing, etc.) — ignore silently
      }
    }
  }

  /**
   * Toggle between dark and light; persist and apply immediately.
   */
  const toggle = () => {
    isDark.value = !isDark.value
    applyTheme(isDark.value)
  }

  /**
   * Initialize theme from localStorage.
   * Call once inside onMounted of app.vue (or a plugin).
   * Pages that include <ThemeToggle> can also call this safely — it's idempotent.
   */
  const initTheme = () => {
    if (import.meta.client) {
      let stored: string | null = null
      try {
        stored = localStorage.getItem('theme')
      } catch {
        // ignore
      }

      // If no preference stored yet, default = dark (spec requirement)
      const dark = stored === null ? true : stored === 'dark'
      isDark.value = dark
      applyTheme(dark)
    }
  }

  return { isDark, toggle, initTheme, applyTheme }
}