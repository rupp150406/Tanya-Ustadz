// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: "AIzaSyBjUunIokOVcE5AVd03-MmdmtY9H7R4DdM",
  authDomain: "tanya-ustyadz.firebaseapp.com",
  projectId: "tanya-ustyadz",
  storageBucket: "tanya-ustyadz.firebasestorage.app",
  messagingSenderId: "825294927046",
  appId: "1:825294927046:web:4a0b45fd0712f2055113c7"
})

const messaging = firebase.messaging()

// Handle background notifications
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message:', payload)
  self.registration.showNotification(
    payload.notification?.title ?? 'Notifikasi',
    {
      body: payload.notification?.body,
      icon: '/icon-192.png' // sesuaikan dengan icon app kamu
    }
  )
})