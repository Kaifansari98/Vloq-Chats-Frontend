"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, ChevronLeft, ChevronRight } from "lucide-react"
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  type NotificationItem,
} from "@/hooks/use-notifications"

const PAGE_SIZE = 20

function formatRelativeTime(dateString: string) {
  const timestamp = new Date(dateString).getTime()
  if (Number.isNaN(timestamp)) return ""

  const now = Date.now()
  const diffMinutes = Math.max(0, Math.floor((now - timestamp) / 60000))
  if (diffMinutes < 1) return "now"
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return diffDays === 1 ? "1d ago" : `${diffDays}d ago`
}

function dayBucketLabel(dateString: string) {
  const createdAt = new Date(dateString)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfCreated = new Date(
    createdAt.getFullYear(),
    createdAt.getMonth(),
    createdAt.getDate(),
  )
  const diffDays = Math.round((startOfToday.getTime() - startOfCreated.getTime()) / 86400000)

  if (diffDays <= 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  return createdAt.toLocaleDateString("en-US", { month: "long", day: "numeric" })
}

function notificationInitial(notification: NotificationItem) {
  return (
    notification.metadata?.senderName?.trim().charAt(0).toUpperCase() ||
    notification.title.trim().charAt(0).toUpperCase() ||
    "N"
  )
}

export function NotificationsPage() {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const { data, isLoading } = useNotifications(page, PAGE_SIZE)
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const notifications = data?.data ?? []
  const total = data?.total ?? 0
  const unreadCount = data?.unreadCount ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const groups = useMemo(() => {
    const map = new Map<string, NotificationItem[]>()

    for (const notification of notifications) {
      const key = dayBucketLabel(notification.createdAt)
      const bucket = map.get(key) ?? []
      bucket.push(notification)
      map.set(key, bucket)
    }

    return Array.from(map.entries()).map(([label, items]) => ({ label, items }))
  }, [notifications])

  async function openNotification(notification: NotificationItem) {
    if (!notification.isRead) {
      await markRead.mutateAsync(notification.uuid)
    }

    if (notification.conversationUuid) {
      window.localStorage.setItem("vloq:selectedChatId", notification.conversationUuid)
      router.push(`/?chat=${encodeURIComponent(notification.conversationUuid)}`)
      return
    }

    router.push("/")
  }

  return (
    <main className="min-h-screen overflow-y-auto bg-white px-8 py-10 text-slate-950 dark:bg-[#070d1e] dark:text-white">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-5xl font-semibold tracking-tight">Notifications</h1>
            <p className="mt-3 text-lg text-slate-500 dark:text-slate-400">
              Stay updated when someone mentions you in a conversation.
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => void markAllRead.mutateAsync()}
              className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-white/8 dark:text-slate-200 dark:hover:bg-white/6"
            >
              Mark all read
            </button>
          )}
        </div>

        <div className="mt-12 space-y-10">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-40 animate-pulse rounded-[28px] border border-slate-200 bg-slate-50 dark:border-white/8 dark:bg-white/5"
              />
            ))
          ) : groups.length > 0 ? (
            groups.map((group) => (
              <section key={group.label}>
                <div className="flex items-center gap-4">
                  <h2 className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                    {group.label}
                  </h2>
                  <div className="h-px flex-1 bg-slate-200 dark:bg-white/8" />
                </div>

                <div className="mt-6 space-y-4">
                  {group.items.map((notification) => (
                    <button
                      key={notification.uuid}
                      type="button"
                      onClick={() => void openNotification(notification)}
                      className={`flex w-full items-start gap-6 rounded-[28px] border border-slate-200 bg-white px-6 py-6 text-left shadow-[0_14px_36px_-28px_rgba(15,23,42,0.4)] transition-colors hover:bg-slate-50 dark:border-white/8 dark:bg-white/4 dark:hover:bg-white/7 ${
                        notification.isRead ? "opacity-80" : ""
                      }`}
                    >
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-xl font-semibold dark:border-white/8 dark:bg-white/6">
                        {notificationInitial(notification)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <h3 className="text-[2rem] font-medium leading-none text-slate-950 dark:text-white sm:text-[1.9rem]" style={{ fontSize: "clamp(1.2rem, 1.3vw, 2rem)" }}>
                            {notification.title}
                          </h3>
                          <span className="shrink-0 text-lg text-slate-400 dark:text-slate-500">
                            {formatRelativeTime(notification.createdAt)}
                          </span>
                        </div>
                        <p className="mt-3 text-lg leading-8 text-slate-500 dark:text-slate-400">
                          {notification.body}
                        </p>
                        <div className="mt-5 flex items-center gap-3 text-lg text-slate-400 dark:text-slate-500">
                          <span>{notification.metadata?.conversationName ?? "Chat"}</span>
                          <span>&bull;</span>
                          <span className="font-medium text-blue-500">Mention</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ))
          ) : (
            <div className="flex min-h-[24rem] flex-col items-center justify-center rounded-[32px] border border-dashed border-slate-200 bg-slate-50 text-center dark:border-white/10 dark:bg-white/4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-[0_14px_30px_-22px_rgba(15,23,42,0.5)] dark:bg-white/8 dark:shadow-none">
                <Bell className="h-6 w-6 text-slate-400 dark:text-slate-500" />
              </div>
              <h2 className="mt-6 text-2xl font-semibold">No notifications yet</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Mention alerts will appear here when your teammates tag you.
              </p>
            </div>
          )}
        </div>

        <div className="mt-10 flex items-center justify-between border-t border-slate-200 pt-8 text-sm text-slate-500 dark:border-white/8 dark:text-slate-400">
          <p>
            Showing {notifications.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}-
            {(page - 1) * PAGE_SIZE + notifications.length} of {total} notifications
          </p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-slate-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/8 dark:text-slate-200"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <span className="text-base text-slate-600 dark:text-slate-300">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-slate-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/8 dark:text-slate-200"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
