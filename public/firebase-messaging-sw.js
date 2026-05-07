/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/12.12.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.12.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBl4wbHQQKRy4HYXuUWglJuOVz8uBOgb6Q",
  authDomain: "vloq-chats.firebaseapp.com",
  projectId: "vloq-chats",
  storageBucket: "vloq-chats.firebasestorage.app",
  messagingSenderId: "477818527069",
  appId: "1:477818527069:web:699fc1117525d74cb61cb4",
  measurementId: "G-6C4V6S9F9Z",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? "Vloq Chats";
  const body = payload.notification?.body ?? "You have a new message";
  const link = payload.fcmOptions?.link ?? payload.data?.link ?? "/";

  void self.registration.showNotification(title, {
    body,
    data: {
      link,
    },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.link ?? "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          void client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return Promise.resolve(undefined);
    }),
  );
});
