"use client"

import { useState } from "react"
import { Search, Plus, Send, Phone, Video, MoreHorizontal } from "lucide-react"
import { UserMenu } from "@/components/chat/user-menu"
import { useAuth } from "@/hooks/use-auth"

const CONVERSATIONS = [
  { id: "1", name: "Alice Johnson",  initials: "AJ", lastMessage: "Hey, did you see the latest update?",      time: "2m",        unread: 3, online: true,  gradient: "from-violet-500 to-purple-600" },
  { id: "2", name: "Bob Smith",      initials: "BS", lastMessage: "The meeting is at 3pm today",              time: "14m",       unread: 0, online: true,  gradient: "from-blue-500 to-cyan-600" },
  { id: "3", name: "Design Team",    initials: "DT", lastMessage: "Sara: Figma link is in the thread",        time: "1h",        unread: 7, online: false, gradient: "from-emerald-500 to-teal-600" },
  { id: "4", name: "Priya Sharma",   initials: "PS", lastMessage: "Can you review this PR?",                  time: "2h",        unread: 0, online: false, gradient: "from-rose-500 to-pink-600" },
  { id: "5", name: "Dev Standup",    initials: "DS", lastMessage: "Marcus: Blocked on auth issue",            time: "3h",        unread: 0, online: false, gradient: "from-amber-500 to-yellow-600" },
  { id: "6", name: "Liam Torres",    initials: "LT", lastMessage: "Thanks! Talk soon.",                       time: "Yesterday", unread: 0, online: false, gradient: "from-indigo-500 to-blue-600" },
]

const MESSAGES: Record<string, { id: string; sender: string; content: string; time: string; mine: boolean }[]> = {
  "1": [
    { id: "1", sender: "Alice Johnson", content: "Good morning! Hope you're doing well 👋",                                                  time: "9:00 AM", mine: false },
    { id: "2", sender: "You",           content: "Hey Alice! Doing great, thanks. You?",                                                     time: "9:02 AM", mine: true  },
    { id: "3", sender: "Alice Johnson", content: "Same! Did you see the update they shipped yesterday? They revamped the entire dashboard.",  time: "9:03 AM", mine: false },
    { id: "4", sender: "You",           content: "Not yet, been heads down on the auth flow. What changed?",                                 time: "9:05 AM", mine: true  },
    { id: "5", sender: "Alice Johnson", content: "Real-time updates, new sidebar, the works. Worth checking out.",                           time: "9:06 AM", mine: false },
    { id: "6", sender: "You",           content: "Oh nice! I'll take a look after standup.",                                                 time: "9:07 AM", mine: true  },
    { id: "7", sender: "Alice Johnson", content: "Hey, did you see the latest update?",                                                      time: "9:58 AM", mine: false },
  ],
  "2": [
    { id: "1", sender: "Bob Smith", content: "Hey, just confirming — the meeting is at 3pm today right?", time: "8:45 AM", mine: false },
    { id: "2", sender: "You",       content: "Yes, 3pm. Conference room B.",                               time: "8:47 AM", mine: true  },
    { id: "3", sender: "Bob Smith", content: "The meeting is at 3pm today",                                time: "8:48 AM", mine: false },
  ],
  "3": [
    { id: "1", sender: "Sara", content: "Hey team! I've updated the design files.",      time: "10:15 AM", mine: false },
    { id: "2", sender: "You",  content: "Looks great Sara! Love the new color palette.", time: "10:20 AM", mine: true  },
    { id: "3", sender: "Sara", content: "Figma link is in the thread",                   time: "10:22 AM", mine: false },
  ],
  "4": [
    { id: "1", sender: "Priya Sharma", content: "Hi! Got a minute?",                             time: "7:30 AM", mine: false },
    { id: "2", sender: "You",          content: "Sure, what's up?",                               time: "7:32 AM", mine: true  },
    { id: "3", sender: "Priya Sharma", content: "Can you review this PR? It's blocking deploy.",  time: "7:33 AM", mine: false },
  ],
  "5": [
    { id: "1", sender: "Marcus", content: "Morning everyone!",                    time: "9:00 AM", mine: false },
    { id: "2", sender: "You",    content: "Morning! What's everyone working on?", time: "9:01 AM", mine: true  },
    { id: "3", sender: "Marcus", content: "Blocked on auth issue",                time: "9:05 AM", mine: false },
  ],
  "6": [
    { id: "1", sender: "Liam Torres", content: "Hey! Are you free to catch up tomorrow?", time: "Yesterday", mine: false },
    { id: "2", sender: "You",         content: "Sure! How about 2pm?",                    time: "Yesterday", mine: true  },
    { id: "3", sender: "Liam Torres", content: "Thanks! Talk soon.",                      time: "Yesterday", mine: false },
  ],
}

export function ChatLayout() {
  const { user } = useAuth()
  const [selectedId, setSelectedId] = useState<string>("1")
  const [message, setMessage] = useState("")
  const [search, setSearch] = useState("")

  const filtered = CONVERSATIONS.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )
  const selected = CONVERSATIONS.find(c => c.id === selectedId)
  const messages = MESSAGES[selectedId] ?? []

  const userInitials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
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

        {/* Brand: logged-in user info + New Chat */}
        <div className="flex items-center justify-between px-4 h-[68px] border-b border-slate-200 dark:border-white/6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 shrink-0 rounded-xl bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-[13px] font-bold text-white">{userInitials}</span>
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-slate-900 dark:text-white leading-tight truncate">
                {user?.name ?? "Workspace"}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-600 truncate">
                {user?.email ?? ""}
              </p>
            </div>
          </div>
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
          {filtered.map(conv => (
            <button
              key={conv.id}
              onClick={() => setSelectedId(conv.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
                selectedId === conv.id
                  ? "bg-slate-100 dark:bg-white/9 shadow-sm"
                  : "hover:bg-slate-50 dark:hover:bg-white/4"
              }`}
            >
              <div className="relative shrink-0">
                <div className={`w-10 h-10 rounded-full bg-linear-to-br ${conv.gradient} flex items-center justify-center text-[11px] font-semibold text-white shadow-sm`}>
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
          ))}
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

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.mine ? "justify-end" : "justify-start"}`}>
                  <div className={`flex flex-col gap-1 max-w-[60%] ${msg.mine ? "items-end" : "items-start"}`}>
                    {!msg.mine && (
                      <span className="text-[11px] text-slate-400 dark:text-slate-600 px-1">{msg.sender}</span>
                    )}
                    <div className={`px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
                      msg.mine
                        ? "bg-blue-500 text-white rounded-br-sm shadow-lg shadow-blue-500/10"
                        : "bg-slate-200 dark:bg-white/6 text-slate-700 dark:text-slate-200 rounded-bl-sm border border-slate-300/50 dark:border-white/6"
                    }`}>
                      {msg.content}
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-700 px-1">{msg.time}</span>
                  </div>
                </div>
              ))}
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
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-white/4 border border-slate-200 dark:border-white/7 flex items-center justify-center mx-auto">
                <span className="text-2xl">💬</span>
              </div>
              <p className="text-sm text-slate-400 dark:text-slate-600">Pick a conversation to start chatting</p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
