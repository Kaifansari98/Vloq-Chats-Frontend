"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bell, ChevronLeft, ChevronRight } from "lucide-react";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  type NotificationItem,
} from "@/hooks/use-notifications";

const PAGE_SIZE = 20;

function formatRelativeTime(dateString: string) {
  const timestamp = new Date(dateString).getTime();
  if (Number.isNaN(timestamp)) return "";

  const now = Date.now();
  const diffMinutes = Math.max(0, Math.floor((now - timestamp) / 60000));
  if (diffMinutes < 1) return "now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return diffDays === 1 ? "1d ago" : `${diffDays}d ago`;
}

function dayBucketLabel(dateString: string) {
  const createdAt = new Date(dateString);
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const startOfCreated = new Date(
    createdAt.getFullYear(),
    createdAt.getMonth(),
    createdAt.getDate(),
  );
  const diffDays = Math.round(
    (startOfToday.getTime() - startOfCreated.getTime()) / 86400000,
  );

  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return createdAt.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
}

function notificationInitial(notification: NotificationItem) {
  return (
    notification.metadata?.senderName?.trim().charAt(0).toUpperCase() ||
    notification.title.trim().charAt(0).toUpperCase() ||
    "N"
  );
}

export function NotificationsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useNotifications(page, PAGE_SIZE);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = data?.data ?? [];
  const total = data?.total ?? 0;
  const unreadCount = data?.unreadCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const groups = useMemo(() => {
    const map = new Map<string, NotificationItem[]>();

    for (const notification of notifications) {
      const key = dayBucketLabel(notification.createdAt);
      const bucket = map.get(key) ?? [];
      bucket.push(notification);
      map.set(key, bucket);
    }

    return Array.from(map.entries()).map(([label, items]) => ({
      label,
      items,
    }));
  }, [notifications]);

  async function openNotification(notification: NotificationItem) {
    if (!notification.isRead) {
      await markRead.mutateAsync(notification.uuid);
    }

    if (notification.conversationUuid) {
      window.localStorage.setItem(
        "vloq:selectedChatId",
        notification.conversationUuid,
      );
      router.push(
        `/?chat=${encodeURIComponent(notification.conversationUuid)}`,
      );
      return;
    }

    router.push("/");
  }

  return (
    <main className="flex-1 min-w-0 h-full overflow-y-auto bg-white px-6 py-7 text-slate-950 dark:bg-[var(--background)] dark:text-white">
      <div className="">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/8"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Notifications
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Stay updated when someone mentions you in a conversation.
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => void markAllRead.mutateAsync()}
              className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-white/8 dark:text-slate-200 dark:hover:bg-white/6"
            >
              Mark all read
            </button>
          )}
        </div>

        <div className="space-y-6">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-20 animate-pulse rounded-xl border border-slate-200 bg-slate-50 dark:border-white/8 dark:bg-white/5"
              />
            ))
          ) : groups.length > 0 ? (
            groups.map((group) => (
              <section key={group.label}>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    {group.label}
                  </h2>
                  <div className="h-px flex-1 bg-slate-200 dark:bg-white/8" />
                </div>

                <div className="space-y-2">
                  {group.items.map((notification) => (
                    <button
                      key={notification.uuid}
                      type="button"
                      onClick={() => void openNotification(notification)}
                      className={`flex w-full items-start gap-4 rounded-xl border border-slate-200 bg-white px-4 py-4 text-left shadow-[0_4px_16px_-8px_rgba(15,23,42,0.2)] transition-colors hover:bg-slate-50 dark:border-white/8 dark:bg-[#1f2c34] dark:hover:bg-[#202c33] ${
                        notification.isRead ? "opacity-70" : ""
                      }`}
                    >
                      <div className="relative h-9 w-9 shrink-0 rounded-full">
                        {notification.senderProfilePicUrl ? (
                          <img
                            src={notification.senderProfilePicUrl}
                            alt={notification.metadata?.senderName ?? ""}
                            className="h-9 w-9 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-sm font-semibold dark:border-white/8 dark:bg-white/6">
                            {notificationInitial(notification)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-sm font-medium leading-snug text-slate-950 dark:text-white">
                            {notification.title}
                          </h3>
                          <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                            {formatRelativeTime(notification.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                          {notification.body}
                        </p>
                        <div className="mt-2 flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                          <span>
                            {notification.metadata?.conversationName ?? "Chat"}
                          </span>
                          <span>&bull;</span>
                          <span className="font-medium text-blue-500">
                            Mention
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ))
          ) : (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center dark:border-white/10 dark:bg-white/4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-[0_8px_20px_-12px_rgba(15,23,42,0.5)] dark:bg-white/8 dark:shadow-none">
                <Bell className="h-5 w-5 text-slate-400 dark:text-slate-500" />
              </div>
              <h2 className="mt-4 text-base font-semibold">
                No notifications yet
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Mention alerts will appear here when your teammates tag you.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-5 text-xs text-slate-500 dark:border-white/8 dark:text-slate-400">
          <p>
            Showing{" "}
            {notifications.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–
            {(page - 1) * PAGE_SIZE + notifications.length} of {total}{" "}
            notifications
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-slate-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/8 dark:text-slate-200"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </button>
            <span className="text-slate-600 dark:text-slate-300">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-slate-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/8 dark:text-slate-200"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
