"use client";

import { useEffect } from "react";
import { getToken, onMessage } from "firebase/messaging";
import { api } from "@/lib/api";
import {
  FIREBASE_VAPID_KEY,
  getFirebaseMessagingInstance,
} from "@/lib/firebase";

const FCM_TOKEN_STORAGE_KEY = "vloq:fcmToken";

async function removeStoredPushToken(token: string) {
  await api.post("/users/push-tokens/remove", { token });
}

export function NotificationManager() {
  useEffect(() => {
    let isCancelled = false;

    async function syncPushNotifications() {
      const previousToken = window.localStorage.getItem(FCM_TOKEN_STORAGE_KEY);
      const messaging = await getFirebaseMessagingInstance();

      if (!messaging || !FIREBASE_VAPID_KEY) {
        return;
      }

      if (Notification.permission === "denied") {
        if (previousToken) {
          try {
            await removeStoredPushToken(previousToken);
          } finally {
            window.localStorage.removeItem(FCM_TOKEN_STORAGE_KEY);
          }
        }
        return;
      }

      const permission =
        Notification.permission === "granted"
          ? "granted"
          : await Notification.requestPermission();

      if (permission !== "granted") {
        return;
      }

      let serviceWorkerRegistration: ServiceWorkerRegistration;
      try {
        serviceWorkerRegistration = await navigator.serviceWorker.register(
          "/firebase-messaging-sw.js",
        );
      } catch {
        // SW registration fails when the push service is unavailable (e.g. offline, browser restriction).
        return;
      }

      let currentToken: string;
      try {
        currentToken = await getToken(messaging, {
          vapidKey: FIREBASE_VAPID_KEY,
          serviceWorkerRegistration,
        });
      } catch (err) {
        // AbortError ("Registration failed - push service not available") is a transient
        // browser/network condition — not a bug worth surfacing in the console.
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        throw err;
      }

      if (!currentToken || isCancelled) {
        return;
      }

      await api.post("/users/push-tokens", {
        token: currentToken,
        userAgent: navigator.userAgent,
      });

      if (previousToken && previousToken !== currentToken) {
        try {
          await removeStoredPushToken(previousToken);
        } catch {
          // Best effort cleanup for stale registrations.
        }
      }

      window.localStorage.setItem(FCM_TOKEN_STORAGE_KEY, currentToken);
    }

    void syncPushNotifications().catch((err) => {
      console.error("[NotificationManager] push setup failed:", err);
    });

    let unsubscribe: (() => void) | undefined;

    void (async () => {
      const messaging = await getFirebaseMessagingInstance();
      if (!messaging || isCancelled) {
        return;
      }

      unsubscribe = onMessage(messaging, (payload) => {
        if (document.visibilityState === "visible") return;

        const title = payload.notification?.title ?? "Vloq Chats";
        const body = payload.notification?.body ?? "You have a new message";
        const link =
          (payload.fcmOptions as { link?: string } | undefined)?.link ??
          (payload.data as { link?: string } | undefined)?.link ??
          "/";

        if (Notification.permission !== "granted") return;

        const n = new Notification(title, { body, icon: "/favicon.ico" });
        n.onclick = () => {
          window.focus();
          window.location.href = link;
        };
      });
    })();

    return () => {
      isCancelled = true;
      unsubscribe?.();
    };
  }, []);

  return null;
}
