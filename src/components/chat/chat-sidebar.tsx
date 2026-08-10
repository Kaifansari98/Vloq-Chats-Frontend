"use client"

import { useEffect, useRef, useState } from "react"
import { Check, ChevronLeft, ChevronRight, MessageSquarePlus, Search, Users } from "lucide-react"
import { UserMenu } from "@/components/chat/user-menu"
import type { ChatConversation } from "@/components/chat/chat-window"
import { cn } from "@/lib/utils"
import type { ChatListFilter } from "@/hooks/use-direct-chats"

const FILTER_TABS: Array<{ value: ChatListFilter; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "UNREAD", label: "Unread" },
  { value: "GROUPS", label: "Groups" },
]

type ChatSidebarProps = {
  conversations: ChatConversation[]
  selectedId: string | null
  isLoading: boolean
  isLoadingDirectChats: boolean
  isSidebarCollapsed: boolean
  search: string
  activeFilter: ChatListFilter
  isAdmin: boolean
  user: {
    organizationName?: string | null
    organizationEmail?: string | null
  } | null
  onSelectConversation: (id: string) => void
  onToggleCollapse: () => void
  onSearchChange: (value: string) => void
  onFilterChange: (value: ChatListFilter) => void
  onCreateGroup: () => void
}

export function ChatSidebar({
  conversations,
  selectedId,
  isLoading,
  isLoadingDirectChats,
  isSidebarCollapsed,
  search,
  activeFilter,
  isAdmin,
  user,
  onSelectConversation,
  onToggleCollapse,
  onSearchChange,
  onFilterChange,
  onCreateGroup,
}: ChatSidebarProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    const onScroll = () => setIsScrolled(el.scrollTop > 4)
    el.addEventListener("scroll", onScroll, { passive: true })
    return () => el.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <aside
      className={cn("relative flex h-full shrink-0 flex-col border-r border-[var(--border-color)] bg-[var(--sidebar-bg)] transition-all duration-300", 
        isSidebarCollapsed ? "w-[80px]" : "w-[360px]"
      )}
      style={{ overflow: "hidden" }}
    >
      {/* Header */}
      <div className={cn("flex h-[60px] shrink-0 items-center bg-(--sidebar-header) transition-all", isSidebarCollapsed ? "justify-center px-0" : "justify-between px-4")}>
        <div className={cn("flex items-center min-w-0", isSidebarCollapsed ? "justify-center" : "gap-3")}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white font-bold text-sm select-none">
            N
          </div>
          {!isSidebarCollapsed && (
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-[var(--text-primary)] leading-tight truncate">
                {user?.organizationName ?? "Nexyn Chat"}
              </p>
              <p className="text-[12px] text-[var(--text-muted)] truncate">
                {user?.organizationEmail ?? ""}
              </p>
            </div>
          )}
        </div>
        {!isSidebarCollapsed && (
          <div className="flex items-center gap-1 shrink-0">
            {isAdmin && (
              <button
                type="button"
                onClick={onCreateGroup}
                title="New Group"
                className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors"
              >
                <MessageSquarePlus className="w-5 h-5" />
              </button>
            )}
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Collapse sidebar"
              className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Search */}
      <div className={cn("shrink-0 bg-[var(--sidebar-bg)] transition-all overflow-hidden", isSidebarCollapsed ? "h-0 opacity-0" : "px-3 py-2 opacity-100 h-auto")}>
        <div className="flex items-center gap-2 bg-[var(--search-bg)] rounded-full px-3 py-2">
          <Search className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
          <input
            type="text"
            placeholder="Search or start new chat"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            className="bg-transparent text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none w-full"
          />
        </div>
      </div>

      {/* Filter chips */}
      <div className={cn("shrink-0 flex gap-2 transition-all overflow-hidden", isSidebarCollapsed ? "h-0 opacity-0" : "px-3 pb-2.5 opacity-100 h-auto")}>
        {FILTER_TABS.map((tab) => {
          const isActive = activeFilter === tab.value
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => onFilterChange(tab.value)}
              className={`rounded-full px-3 py-1 text-[12px] font-medium transition-all ${
                isActive
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Scroll shadow — visible only when list is scrolled */}
      <div
        className="pointer-events-none shrink-0 h-px transition-all duration-200"
        style={{
          boxShadow: isScrolled
            ? "0 4px 12px 0 rgba(0,0,0,0.12)"
            : "none",
          background: isScrolled ? "transparent" : "transparent",
          zIndex: 2,
        }}
      />

      {/* Conversation List */}
      <div ref={listRef} className="flex-1 overflow-y-auto">
        {isLoading || isLoadingDirectChats ? (
          <div className="space-y-0">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-[var(--surface)] shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-[var(--surface)] rounded w-2/5" />
                  <div className="h-3 bg-[var(--surface)] rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : activeFilter === "UNREAD" && conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full pb-16 gap-4 text-center px-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface)]">
              <Check className="h-7 w-7 text-[var(--accent)]" />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-[var(--text-primary)]">All caught up</p>
              <p className="text-[13px] text-[var(--text-muted)] mt-1">No unread messages</p>
            </div>
            <button
              type="button"
              onClick={() => onFilterChange("ALL")}
              className="text-[13px] font-medium text-[var(--accent)] hover:underline"
            >
              View all chats
            </button>
          </div>
        ) : activeFilter === "GROUPS" && conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full pb-16 gap-4 text-center px-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface)]">
              <Users className="h-7 w-7 text-[var(--text-muted)]" />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-[var(--text-primary)]">No groups yet</p>
              <p className="text-[13px] text-[var(--text-muted)] mt-1">Create a group to start</p>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={onCreateGroup}
                className="flex items-center gap-2 text-[13px] font-medium text-[var(--accent)] hover:underline"
              >
                <MessageSquarePlus className="w-4 h-4" />
                Create Group
              </button>
            )}
          </div>
        ) : (
          <div>
            {activeFilter === "GROUPS" && isAdmin && (
              <button
                type="button"
                onClick={onCreateGroup}
                className="flex w-full items-center gap-4 px-4 py-3.5 hover:bg-[var(--surface-hover)] transition-colors border-b border-[var(--divider)]"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]">
                  <MessageSquarePlus className="w-5 h-5 text-white" />
                </div>
                <span className="text-[15px] font-medium text-[var(--accent)]">New Group</span>
              </button>
            )}

            {conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                title={isSidebarCollapsed ? conv.name : undefined}
                className={`flex w-full items-center transition-colors border-b border-[var(--divider)] last:border-b-0 ${
                  isSidebarCollapsed ? "justify-center py-3 px-0" : "gap-3 px-4 py-3 text-left"
                } ${
                  selectedId === conv.id
                    ? "bg-[var(--surface-hover)]"
                    : "hover:bg-[var(--surface-hover)]"
                }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  {conv.profile_pic_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={conv.profile_pic_url}
                      alt={conv.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${conv.gradient} flex items-center justify-center text-[13px] font-semibold text-white`}>
                      {conv.initials}
                    </div>
                  )}
                  {conv.online && (
                    <span className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 bg-[var(--online)] rounded-full border-2 border-[var(--sidebar-bg)]" />
                  )}
                  {isSidebarCollapsed && conv.unread > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-[var(--unread-badge)] text-[11px] font-semibold text-white flex items-center justify-center border-2 border-[var(--sidebar-bg)]">
                      {conv.unread}
                    </span>
                  )}
                </div>

                {/* Content */}
                {!isSidebarCollapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-[15px] font-medium text-[var(--text-primary)] truncate">
                        {conv.name}
                      </span>
                      <span className={`text-[12px] shrink-0 ${conv.unread > 0 ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}`}>
                        {conv.time}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-[13px] truncate ${
                        conv.isTyping
                          ? "text-[var(--accent)] italic"
                          : "text-[var(--text-secondary)]"
                      }`}>
                        {conv.isTyping ? "typing..." : conv.lastMessage}
                      </p>
                      {conv.unread > 0 && (
                        <span className="shrink-0 min-w-[20px] h-5 px-1 rounded-full bg-[var(--unread-badge)] text-[11px] font-semibold text-white flex items-center justify-center">
                          {conv.unread}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* User menu footer */}
      <div className={cn("shrink-0 border-t border-[var(--divider)] bg-[var(--sidebar-header)]", isSidebarCollapsed ? "p-2 flex justify-center" : "px-2 py-1.5")}>
        <UserMenu collapsed={isSidebarCollapsed} />
      </div>
    </aside>
  )
}
