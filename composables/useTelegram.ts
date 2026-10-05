// composables/useTelegram.ts
export const useTelegram = () => {
  const isConnected = ref(false)
  const isLoading = ref(false)
  const deepLink = ref<string | null>(null)

  const checkConnection = async (fingerprint: string) => {
    const supabase = useSupabaseClient()
    const { data } = await supabase
      .from('telegram_subscriptions')
      .select('chat_id')
      .eq('fingerprint', fingerprint)
      .single()
      .catch(() => ({ data: null }))

    isConnected.value = !!data?.chat_id
    return isConnected.value
  }

  const connect = async (fingerprint: string) => {
    isLoading.value = true
    try {
      const result = await $fetch<{ deepLink?: string; already_connected?: boolean }>(
        '/api/telegram/connect',
        { method: 'POST', body: { fingerprint } }
      )

      if (result.already_connected) {
        isConnected.value = true
        return
      }

      if (result.deepLink) {
        deepLink.value = result.deepLink
        // Buka Telegram langsung
        window.open(result.deepLink, '_blank')

        // Poll setiap 3 detik untuk cek apakah user sudah klik START
        const interval = setInterval(async () => {
          const connected = await checkConnection(fingerprint)
          if (connected) {
            clearInterval(interval)
            deepLink.value = null
          }
        }, 3000)

        // Stop polling setelah 10 menit (sama dengan token expiry)
        setTimeout(() => clearInterval(interval), 10 * 60 * 1000)
      }
    } catch {
      // silent fail
    } finally {
      isLoading.value = false
    }
  }

  return { isConnected, isLoading, deepLink, connect, checkConnection }
}