export const useTelegram = () => {
  const isConnected = ref(false)
  const isLoading = ref(false)
  const deepLink = ref<string | null>(null)
  const error = ref<string | null>(null)

  let pollTimer: ReturnType<typeof setInterval> | null = null
  let stopTimer: ReturnType<typeof setTimeout> | null = null

  const stopPolling = () => {
    if (pollTimer) clearInterval(pollTimer)
    if (stopTimer) clearTimeout(stopTimer)
    pollTimer = null
    stopTimer = null
  }

  // Never throws. Asks our own server instead of reading the table from the browser.
  const checkConnection = async (fingerprint: string) => {
    try {
      const res = await $fetch<{ connected: boolean }>('/api/telegram/status', {
        query: { fingerprint },
        cache: 'no-store', // never reuse an old "false" answer
      })
      isConnected.value = !!res?.connected
    } catch (e) {
      // keep the previous value on a network hiccup, but leave a trace in the console
      console.warn('[telegram] status check failed:', e)
    }
    return isConnected.value
  }

  const connect = async (fingerprint: string) => {
    // Open the tab NOW, while we are still inside the tap/click. Browsers (iOS Safari,
    // Brave...) block window.open() that happens after an await, which made the
    // Telegram link silently never open on phones.
    const win = import.meta.client ? window.open('', '_blank') : null

    isLoading.value = true
    error.value = null
    try {
      const result = await $fetch<{ deepLink?: string; already_connected?: boolean }>(
        '/api/telegram/connect',
        { method: 'POST', body: { fingerprint } }
      )

      if (result.already_connected) {
        isConnected.value = true
        win?.close()
        return
      }

      if (!result.deepLink) throw new Error('no deepLink')

      deepLink.value = result.deepLink
      if (win) win.location.href = result.deepLink
      else window.location.href = result.deepLink // popup blocked: go there directly

      stopPolling()
      pollTimer = setInterval(async () => {
        if (await checkConnection(fingerprint)) {
          stopPolling()
          deepLink.value = null
        }
      }, 3000)
      stopTimer = setTimeout(stopPolling, 10 * 60 * 1000)
    } catch {
      win?.close()
      error.value = 'Gagal membuat tautan Telegram. Coba lagi sebentar lagi.'
    } finally {
      isLoading.value = false
    }
  }

  if (getCurrentScope()) onScopeDispose(stopPolling)

  return { isConnected, isLoading, deepLink, error, connect, checkConnection, stopPolling }
}