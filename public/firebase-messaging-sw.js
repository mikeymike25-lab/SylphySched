// Import and configure the Firebase SDK inside the Service Worker context
importScripts('https://www.gstatic.com/firebasejs/10.15.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.15.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker
firebase.initializeApp({
  apiKey: "__VITE_FIREBASE_API_KEY__",
  authDomain: "__VITE_FIREBASE_AUTH_DOMAIN__",
  projectId: "__VITE_FIREBASE_PROJECT_ID__",
  storageBucket: "__VITE_FIREBASE_STORAGE_BUCKET__",
  messagingSenderId: "__VITE_FIREBASE_MESSAGING_SENDER_ID__",
  appId: "__VITE_FIREBASE_APP_ID__"
});

// Retrieve an instance of Firebase Cloud Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message: ', payload);
  
  const notificationTitle = payload.notification?.title || 'Sylphy Alert';
  const notificationOptions = {
    body: payload.notification?.body || 'New notification',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: payload.data?.tag || 'sylphy-alert',
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
