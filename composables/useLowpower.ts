// ============================================================
// FILE: composables/useLowPower.ts
// DESC: One place that decides "phone / touch / reduce-motion" mode.
//       lowPower → pages use lighter animations (no heavy blur, no particles, static shiny text…)
//       bgReady  → true after detection, so the WebGL background mounts ONCE with the right settings
//       Call detect() inside onMounted() of any page that needs it.
// ============================================================
export function useLowPower() {
  const lowPower = useState<boolean>('low-power', () => false)
  const bgReady = useState<boolean>('bg-ready', () => false)

  function detect() {
    if (!import.meta.client) return
    lowPower.value = window.matchMedia(
      '(max-width: 767px), (pointer: coarse), (prefers-reduced-motion: reduce)'
    ).matches
    bgReady.value = true
  }

  return { lowPower, bgReady, detect }
}