"use client"

import { AnimatePresence, motion } from "framer-motion"
import { ChevronLeft, ChevronRight, Search } from "lucide-react"
import { UserMenu } from "@/components/chat/user-menu"
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"
import type { ChatConversation } from "@/components/chat/chat-window"

const sidebarSpring = {
  type: "spring",
  stiffness: 260,
  damping: 28,
  mass: 0.9,
} as const

const contentTransition = { duration: 0.18, ease: "easeOut" } as const

type ChatSidebarProps = {
  conversations: ChatConversation[]
  selectedId: string | null
  isLoading: boolean
  isLoadingDirectChats: boolean
  isSidebarCollapsed: boolean
  search: string
  user: {
    organizationName?: string | null
    organizationEmail?: string | null
  } | null
  onSelectConversation: (id: string) => void
  onToggleCollapse: () => void
  onSearchChange: (value: string) => void
}

export function ChatSidebar({
  conversations,
  selectedId,
  isLoading,
  isLoadingDirectChats,
  isSidebarCollapsed,
  search,
  user,
  onSelectConversation,
  onToggleCollapse,
  onSearchChange,
}: ChatSidebarProps) {
  const orgInitials = user?.organizationName
    ? user.organizationName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "V"

  return (
    <div className="relative shrink-0">
      <motion.aside
        animate={{ width: isSidebarCollapsed ? 88 : 288 }}
        transition={sidebarSpring}
        className="flex h-full shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white dark:border-white/6 dark:bg-[#0b1425]"
      >
        {/* Brand */}
        <div className={`flex h-[68px] border-b border-slate-200 dark:border-white/6 ${
          isSidebarCollapsed
            ? "items-center justify-center px-3"
            : "items-center justify-between px-4"
        }`}>
          <div className={`flex min-w-0 items-center ${
            isSidebarCollapsed ? "justify-center" : "gap-3"
          }`}>
            <div className="w-9 h-9 shrink-0 rounded-xl bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <span className="text-[13px] font-bold text-white">{orgInitials}</span>
            </div>
            <AnimatePresence initial={false}>
              {!isSidebarCollapsed && (
                <motion.div
                  key="workspace-meta"
                  initial={{ opacity: 0, x: -10, filter: "blur(4px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, x: -8, filter: "blur(4px)" }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="min-w-0"
                >
                  <p className="text-[13px] font-semibold text-slate-900 dark:text-white leading-tight truncate">
                    {user?.organizationName ?? "Workspace"}
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-600 truncate">
                    {user?.organizationEmail ?? ""}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <AnimatePresence initial={false}>
            {!isSidebarCollapsed && (
              <motion.div
                key="theme-toggle"
                initial={{ opacity: 0, scale: 0.86, x: 8 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.86, x: 8 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                <AnimatedThemeToggler
                  variant="circle"
                  duration={500}
                  className="w-8 h-8 shrink-0 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/6 flex items-center justify-center text-slate-500 dark:text-slate-400 transition-colors ml-2 [&_svg]:w-4 [&_svg]:h-4"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Search */}
        <AnimatePresence initial={false}>
          {!isSidebarCollapsed && (
            <motion.div
              key="sidebar-search"
              initial={{ opacity: 0, y: -8, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -6, filter: "blur(4px)" }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="px-4 py-3"
            >
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/4 border border-slate-200 dark:border-white/7 rounded-xl px-3 py-2.5">
                <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600 shrink-0" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={e => onSearchChange(e.target.value)}
                  className="bg-transparent text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none w-full"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Section Label */}
        <AnimatePresence initial={false}>
          {!isSidebarCollapsed && (
            <motion.p
              key="sidebar-label"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="px-5 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-700"
            >
              Direct Messages
            </motion.p>
          )}
        </AnimatePresence>

        {/* Conversations */}
        <div className={`flex-1 overflow-y-auto pb-2 ${
          isSidebarCollapsed ? "px-3 pt-3 space-y-2" : "px-2 space-y-0.5"
        }`}>
          {isLoading || isLoadingDirectChats ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`animate-pulse ${
                  isSidebarCollapsed
                    ? "flex justify-center rounded-2xl py-1.5"
                    : "flex items-center gap-3 px-3 py-2.5 rounded-xl"
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-white/8 shrink-0" />
                {!isSidebarCollapsed && (
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-slate-200 dark:bg-white/8 rounded w-2/3" />
                    <div className="h-2.5 bg-slate-100 dark:bg-white/5 rounded w-full" />
                  </div>
                )}
              </div>
            ))
          ) : (
            conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`w-full transition-all text-left ${
                  isSidebarCollapsed
                    ? `flex justify-center rounded-2xl py-2 ${
                        selectedId === conv.id
                          ? "bg-slate-100 dark:bg-white/9"
                          : "hover:bg-slate-50 dark:hover:bg-white/4"
                      }`
                    : `flex items-center gap-3 px-3 py-2.5 rounded-xl ${
                        selectedId === conv.id
                          ? "bg-slate-100 dark:bg-white/9"
                          : "hover:bg-slate-50 dark:hover:bg-white/4"
                      }`
                }`}
                title={isSidebarCollapsed ? conv.name : undefined}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className={`w-10 h-10 rounded-full bg-linear-to-br ${conv.gradient} flex items-center justify-center text-[11px] font-semibold text-white`}>
                    {conv.initials}
                  </div>
                  {conv.online && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white dark:border-[#0b1425]" />
                  )}
                </div>

                {/* Expanded content */}
                <AnimatePresence initial={false}>
                  {!isSidebarCollapsed && (
                    <motion.div
                      key={`conv-content-${conv.id}`}
                      initial={{ opacity: 0, x: -10, filter: "blur(3px)" }}
                      animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, x: -8, filter: "blur(3px)" }}
                      transition={contentTransition}
                      className="flex-1 min-w-0 flex items-center gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[13px] font-medium truncate ${
                            selectedId === conv.id
                              ? "text-slate-900 dark:text-white"
                              : "text-slate-600 dark:text-slate-300"
                          }`}>
                            {conv.name}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-700 shrink-0">{conv.time}</span>
                        </div>
                        <p className={`text-[11px] truncate mt-0.5 ${
                          conv.isTyping
                            ? "text-blue-500 dark:text-blue-400 font-medium"
                            : "text-slate-400 dark:text-slate-600"
                        }`}>
                          {conv.isTyping ? "typing..." : conv.lastMessage}
                        </p>
                      </div>

                      <AnimatePresence initial={false}>
                        {conv.unread > 0 && (
                          <motion.span
                            key={`badge-${conv.id}`}
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                            className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-blue-500 text-[10px] font-semibold text-white flex items-center justify-center"
                          >
                            {conv.unread}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            ))
          )}
        </div>

        {/* User Menu */}
        <div className={`border-t border-slate-200 dark:border-white/6 ${
          isSidebarCollapsed ? "px-3 py-2" : "px-2 py-2"
        }`}>
          <UserMenu collapsed={isSidebarCollapsed} />
        </div>
      </motion.aside>

      {/* Collapse toggle */}
      <motion.button
        type="button"
        onClick={onToggleCollapse}
        whileHover={{ scale: 1.06, x: "58%" }}
        whileTap={{ scale: 0.94 }}
        animate={{
          x: "50%",
          backgroundColor: "rgba(255,255,255,1)",
        }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="absolute right-0 top-1/2 z-20 flex h-9 w-5 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-md shadow-slate-200/70 dark:border-white/8 dark:bg-[#12203a] dark:text-slate-400 dark:shadow-black/30 dark:hover:text-white"
        aria-label={isSidebarCollapsed ? "Open sidebar" : "Collapse sidebar"}
      >
        <motion.div
          key={isSidebarCollapsed ? "open-icon" : "close-icon"}
          initial={{ opacity: 0, rotate: -90, scale: 0.8 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 90, scale: 0.8 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </motion.div>
      </motion.button>
    </div>
  )
}
