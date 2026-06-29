// composables/useFCM.ts
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: "AIzaSyBjUunIokOVcE5AVd03-MmdmtY9H7R4DdM",
  authDomain: "tanya-ustyadz.firebaseapp.com",
  projectId: "tanya-ustyadz",
  storageBucket: "tanya-ustyadz.firebasestorage.app",
  messagingSenderId: "825294927046",
  appId: "1:825294927046:web:4a0b45fd0712f2055113c7",
  measurementId: "G-6R3M5H67HM"
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

const waitForServiceWorker = (registration: ServiceWorkerRegistration): Promise<ServiceWorkerRegistration> => {
  return new Promise((resolve, reject) => {
    if (registration.active) {
      resolve(registration)
      return
    }

    const sw = registration.installing ?? registration.waiting
    if (!sw) {
      reject(new Error('[FCM] Tidak ada service worker yang bisa diaktifkan.'))
      return
    }

    sw.addEventListener('statechange', function handler(e) {
      if ((e.target as ServiceWorker).state === 'activated') {
        sw.removeEventListener('statechange', handler)
        resolve(registration)
      } else if ((e.target as ServiceWorker).state === 'redundant') {
        sw.removeEventListener('statechange', handler)
        reject(new Error('[FCM] Service worker jadi redundant sebelum active.'))
      }
    })
  })
}

export const useFCM = () => {
  const fcmToken = ref<string | null>(null)
  let messaging: Messaging | null = null

  const initFCM = async (role: 'user' | 'admin_it' | 'ustadz', fingerprint?: string) => {
    if (import.meta.server) return

    if (!('Notification' in window) || !('serviceWorker' in navigator)) return

    try {
      messaging = getMessaging(app)

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return

      let registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/firebase-cloud-messaging-push-scope'
      })

      registration = await waitForServiceWorker(registration)

      const existingSubscription = await registration.pushManager.getSubscription()
      if (existingSubscription) {
        await existingSubscription.unsubscribe()
      }

      const token = await getToken(messaging, {
        vapidKey: 'BCp3f5rzfIB7dEd73XMn1BTrrRwSs54lAqhrbW_tJWMTTmIJYx7OPrO2rzy9H85otunvs7qMGJLo-1rLj-yEAmQ',
        serviceWorkerRegistration: registration
      })

      if (!token) return

      fcmToken.value = token

      // Simpan token ke Supabase berdasarkan role
      const supabase = useSupabaseClient()

      if (role === 'user' && fingerprint) {
        await supabase
          .from('fcm_tokens')
          .upsert(
            { role: 'user', fingerprint, token, updated_at: new Date().toISOString() },
            { onConflict: 'token' }
          )
      } else if (role === 'admin_it' || role === 'ustadz') {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase
            .from('fcm_tokens')
            .upsert(
              { role, profile_id: user.id, token, updated_at: new Date().toISOString() },
              { onConflict: 'token' }
            )
        }
      }

      onMessage(messaging, (payload) => {
        // TODO: replace with toast notification
      })

    } catch {
      // silent fail
    }
  }

  return { fcmToken, initFCM }
}