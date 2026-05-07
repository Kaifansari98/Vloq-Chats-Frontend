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

      const serviceWorkerRegistration = await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js",
      );

      const currentToken = await getToken(messaging, {
        vapidKey: FIREBASE_VAPID_KEY,
        serviceWorkerRegistration,
      });

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

    void syncPushNotifications();

    let unsubscribe: (() => void) | undefined;

    void (async () => {
      const messaging = await getFirebaseMessagingInstance();
      if (!messaging || isCancelled) {
        return;
      }

      unsubscribe = onMessage(messaging, () => {
        // Socket events already update the active UI. Foreground push handling
        // can stay passive until product wants toast UI.
      });
    })();

    return () => {
      isCancelled = true;
      unsubscribe?.();
    };
  }, []);

  return null;
}
