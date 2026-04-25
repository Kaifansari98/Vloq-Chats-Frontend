"use client"

import { useEffect, useState } from "react"
import { Search, Send, Phone, Video, MoreHorizontal } from "lucide-react"
import { UserMenu } from "@/components/chat/user-menu"
import { useAuth } from "@/hooks/use-auth"
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"
import { useOrganizationMembers, type Member } from "@/hooks/use-organization-members"
import { EmptyChat } from "@/components/chat/empty-chat"

const GRADIENTS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-cyan-600",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-yellow-600",
  "from-indigo-500 to-blue-600",
  "from-fuchsia-500 to-pink-600",
  "from-orange-500 to-red-600",
]

const DUMMY_MESSAGES = [
  "Hey, did you see the latest update?",
  "The meeting is at 3pm today",
  "Can you review this PR?",
  "Thanks! Talk soon.",
  "I'll check it out after standup.",
  "Sounds good to me!",
  "Let me know when you're free.",
  "Great work on the demo!",
]

const DUMMY_TIMES = ["2m", "14m", "1h", "2h", "3h", "Yesterday", "Mon", "Tue"]
const DUMMY_UNREADS = [3, 0, 7, 0, 1, 0, 0, 2]

function memberToConversation(member: Member, index: number) {
  const initials = member.name
    .split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
  return {
    id: member.uuid,
    name: member.name,
    initials,
    lastMessage: DUMMY_MESSAGES[index % DUMMY_MESSAGES.length],
    time: DUMMY_TIMES[index % DUMMY_TIMES.length],
    unread: DUMMY_UNREADS[index % DUMMY_UNREADS.length],
    online: index % 3 === 0,
    gradient: GRADIENTS[index % GRADIENTS.length],
  }
}

export function ChatLayout() {
  const { user } = useAuth()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const { data, isLoading } = useOrganizationMembers(1, debouncedSearch)

  const conversations = (data?.data ?? []).map(memberToConversation)
  const selected = conversations.find(c => c.id === selectedId)

  const orgInitials = user?.organizationName
    ? user.organizationName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "V"

  function sendMessage() {
    if (!message.trim()) return
    setMessage("")
    // TODO: wire to socket/API
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[#070d1e] text-slate-900 dark:text-slate-100">

      {/* ── Left Sidebar ── */}
      <aside className="w-72 shrink-0 flex flex-col bg-white dark:bg-[#0b1425] border-r border-slate-200 dark:border-white/6">

        {/* Brand: org info + theme toggle */}
        <div className="flex items-center justify-between px-4 h-[68px] border-b border-slate-200 dark:border-white/6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 shrink-0 rounded-xl bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <span className="text-[13px] font-bold text-white">{orgInitials}</span>
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-slate-900 dark:text-white leading-tight truncate">
                {user?.organizationName ?? "Workspace"}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-600 truncate">
                {user?.organizationEmail ?? ""}
              </p>
            </div>
          </div>
          <AnimatedThemeToggler
            variant="circle"
            duration={500}
            className="w-8 h-8 shrink-0 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/6 flex items-center justify-center text-slate-500 dark:text-slate-400 transition-colors ml-2 [&_svg]:w-4 [&_svg]:h-4"
          />
        </div>

        {/* Search */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/4 border border-slate-200 dark:border-white/7 rounded-xl px-3 py-2.5">
            <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600 shrink-0" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none w-full"
            />
          </div>
        </div>

        {/* Section Label */}
        <p className="px-5 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-700">
          Direct Messages
        </p>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto px-2 space-y-0.5 pb-2">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl animate-pulse">
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-white/8 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-slate-200 dark:bg-white/8 rounded w-2/3" />
                  <div className="h-2.5 bg-slate-100 dark:bg-white/5 rounded w-full" />
                </div>
              </div>
            ))
          ) : (
            conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => setSelectedId(conv.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
                  selectedId === conv.id
                    ? "bg-slate-100 dark:bg-white/9"
                    : "hover:bg-slate-50 dark:hover:bg-white/4"
                }`}
              >
                <div className="relative shrink-0">
                  <div className={`w-10 h-10 rounded-full bg-linear-to-br ${conv.gradient} flex items-center justify-center text-[11px] font-semibold text-white`}>
                    {conv.initials}
                  </div>
                  {conv.online && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white dark:border-[#0b1425]" />
                  )}
                </div>

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
                  <p className="text-[11px] text-slate-400 dark:text-slate-600 truncate mt-0.5">{conv.lastMessage}</p>
                </div>

                {conv.unread > 0 && (
                  <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-blue-500 text-[10px] font-semibold text-white flex items-center justify-center">
                    {conv.unread}
                  </span>
                )}
              </button>
            ))
          )}
        </div>

        {/* User Menu */}
        <div className="px-2 py-2 border-t border-slate-200 dark:border-white/6">
          <UserMenu />
        </div>
      </aside>

      {/* ── Chat Window ── */}
      <main className="flex-1 flex flex-col min-w-0">
        {selected ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between px-6 h-[68px] border-b border-slate-200 dark:border-white/6 bg-white dark:bg-[#070d1e] shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className={`w-9 h-9 rounded-full bg-linear-to-br ${selected.gradient} flex items-center justify-center text-[11px] font-semibold text-white`}>
                    {selected.initials}
                  </div>
                  {selected.online && (
                    <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-400 rounded-full border-2 border-white dark:border-[#070d1e]" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white leading-none">{selected.name}</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-600 mt-0.5">{selected.online ? "Active now" : "Offline"}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {[Phone, Video, MoreHorizontal].map((Icon, i) => (
                  <button key={i} className="w-8 h-8 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-center transition-colors">
                    <Icon className="w-4 h-4 text-slate-400 dark:text-slate-600" />
                  </button>
                ))}
              </div>
            </div>

            {/* Messages — empty until real messaging is wired */}
            <div className="flex-1 overflow-y-auto px-6 py-6 flex items-center justify-center">
              <div className="text-center space-y-2">
                <div className={`w-12 h-12 rounded-full bg-linear-to-br ${selected.gradient} flex items-center justify-center text-sm font-semibold text-white mx-auto`}>
                  {selected.initials}
                </div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{selected.name}</p>
                <p className="text-[12px] text-slate-400 dark:text-slate-600">No messages yet. Say hello!</p>
              </div>
            </div>

            {/* Input */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-white/6 bg-white dark:bg-[#070d1e] shrink-0">
              <div className="flex items-center gap-3 bg-slate-100 dark:bg-white/4 border border-slate-200 dark:border-white/8 rounded-2xl px-4 py-3 focus-within:border-blue-400/60 dark:focus-within:border-blue-500/30 transition-colors">
                <input
                  type="text"
                  placeholder={`Message ${selected.name}...`}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendMessage()}
                  className="flex-1 bg-transparent text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-700 outline-none"
                />
                <button
                  onClick={sendMessage}
                  disabled={!message.trim()}
                  className="w-8 h-8 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center transition-all shrink-0 shadow-md shadow-blue-500/20"
                >
                  <Send className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-800 text-center mt-2">Press Enter to send</p>
            </div>
          </>
        ) : (
          <EmptyChat />
        )}
      </main>
    </div>
  )
}
