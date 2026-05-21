"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bell } from "lucide-react"
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount,
  type NotificationItem,
} from "@/hooks/use-notifications"

function formatRelativeTime(dateString: string) {
  const timestamp = new Date(dateString).getTime()
  if (Number.isNaN(timestamp)) return ""

  const diffMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000))
  if (diffMinutes < 1) return "now"
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return diffDays === 1 ? "1d ago" : `${diffDays}d ago`
}

function notificationInitial(notification: NotificationItem) {
  return (
    notification.metadata?.senderName?.trim().charAt(0).toUpperCase() ||
    notification.title.trim().charAt(0).toUpperCase() ||
    "N"
  )
}

type NotificationBellProps = {
  collapsed?: boolean
}

export function NotificationBell({
  collapsed = false,
}: NotificationBellProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const { data: notificationData } = useNotifications(1, 5)
  const { data: unreadData } = useUnreadNotificationCount()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const notifications = notificationData?.data ?? []
  const unreadCount = unreadData?.unreadCount ?? 0
  const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    window.addEventListener("mousedown", handleClickOutside)
    return () => window.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const panelPositionClass = useMemo(
    () => (collapsed ? "left-[calc(100%+14px)] top-0" : "right-0 top-[calc(100%+14px)]"),
    [collapsed],
  )

  async function openNotification(notification: NotificationItem) {
    if (!notification.isRead) {
      await markRead.mutateAsync(notification.uuid)
    }

    if (notification.conversationUuid) {
      window.localStorage.setItem("vloq:selectedChatId", notification.conversationUuid)
      router.push(`/?chat=${encodeURIComponent(notification.conversationUuid)}`)
    } else {
      router.push("/notifications")
    }

    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.65)] transition-colors hover:bg-slate-50 dark:border-white/8 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
        aria-label="Open notifications"
      >
        <Bell className="h-4.5 w-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-950 px-1 text-[10px] font-semibold text-white dark:bg-white dark:text-slate-950">
            {badgeLabel}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute z-50 ${panelPositionClass} w-[min(26rem,calc(100vw-2rem))] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_30px_60px_-26px_rgba(15,23,42,0.38)] dark:border-white/8 dark:bg-[#10192d] dark:shadow-black/40`}
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/8">
            <div>
              <h3 className="text-[15px] font-semibold text-slate-950 dark:text-white">
                Notifications
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Mentions you have not cleared yet.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => void markAllRead.mutateAsync()}
                  className="text-[12px] font-semibold text-blue-500 transition-colors hover:text-blue-400"
                >
                  Mark all read
                </button>
              )}
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="text-[12px] font-semibold text-slate-600 transition-colors hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
              >
                View all
              </Link>
            </div>
          </div>

          {notifications.length > 0 ? (
            <div className="max-h-[28rem] overflow-y-auto">
              {notifications.map((notification) => (
                <button
                  key={notification.uuid}
                  type="button"
                  onClick={() => void openNotification(notification)}
                  className={`flex w-full items-start gap-4 border-b border-slate-200 px-5 py-4 text-left transition-colors last:border-b-0 hover:bg-slate-50 dark:border-white/8 dark:hover:bg-white/6 ${
                    notification.isRead ? "opacity-75" : ""
                  }`}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-[18px] font-semibold text-slate-900 dark:border-white/8 dark:bg-white/6 dark:text-white">
                    {notificationInitial(notification)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[15px] font-semibold text-slate-950 dark:text-white">
                        {notification.title}
                      </p>
                      <span className="shrink-0 text-[11px] text-slate-400 dark:text-slate-500">
                        {formatRelativeTime(notification.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[13px] leading-6 text-slate-500 dark:text-slate-400">
                      {notification.body}
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-[12px] text-slate-400 dark:text-slate-500">
                      <span>{notification.metadata?.conversationName ?? "Chat"}</span>
                      <span>&bull;</span>
                      <span className="font-medium text-blue-500">Mention</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-5 py-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-white/6">
                <Bell className="h-5 w-5 text-slate-400 dark:text-slate-500" />
              </div>
              <p className="mt-4 text-[14px] font-medium text-slate-900 dark:text-white">
                No new mentions
              </p>
              <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
                When someone tags you in a group, it will show up here.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
