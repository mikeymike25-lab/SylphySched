// Import and configure the Firebase SDK inside the Service Worker context
importScripts('https://www.gstatic.com/firebasejs/10.15.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.15.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyDK0M9fLTrG1T3-Nw1u2CDc654QeLymPSQ",
  authDomain: "sylphysched.firebaseapp.com",
  projectId: "sylphysched",
  storageBucket: "sylphysched.firebasestorage.app",
  messagingSenderId: "533629262445",
  appId: "1:533629262445:web:e7bb4d4c1ac640a76dfd64"
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
