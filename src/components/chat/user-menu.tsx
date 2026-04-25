"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DropdownMenu, Dialog } from "radix-ui"
import { ChevronsUpDown, Settings, Sun, Moon, LogOut, AlertTriangle } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { AUTH_TOKEN_COOKIE, AUTH_USER_COOKIE } from "@/lib/auth"
import { cn } from "@/lib/utils"

export function UserMenu() {
  const { user } = useAuth()
  const router = useRouter()
  const [isDark, setIsDark] = useState(true)
  const [logoutOpen, setLogoutOpen] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem("vloq-theme")
    const dark =
      stored === "dark" ||
      (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches)
    setIsDark(dark)
    document.documentElement.classList.toggle("dark", dark)
  }, [])

  function toggleTheme(e: Event) {
    e.preventDefault()
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle("dark", next)
    localStorage.setItem("vloq-theme", next ? "dark" : "light")
  }

  function confirmLogout() {
    document.cookie = `${AUTH_TOKEN_COOKIE}=; path=/; max-age=0`
    document.cookie = `${AUTH_USER_COOKIE}=; path=/; max-age=0`
    router.replace("/login")
  }

  const initials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "U"

  const itemClass =
    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] cursor-pointer outline-none transition-colors " +
    "text-slate-600 dark:text-slate-300 " +
    "hover:bg-slate-100 focus:bg-slate-100 hover:text-slate-900 focus:text-slate-900 " +
    "dark:hover:bg-white/6 dark:focus:bg-white/6 dark:hover:text-white dark:focus:text-white"

  return (
    <Dialog.Root open={logoutOpen} onOpenChange={setLogoutOpen}>
      <DropdownMenu.Root>

        {/* ── Trigger: user card ── */}
        <DropdownMenu.Trigger asChild>
          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-colors outline-none hover:bg-slate-100 dark:hover:bg-white/6 data-[state=open]:bg-slate-100 dark:data-[state=open]:bg-white/8">
            <div className="w-9 h-9 shrink-0 rounded-full bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center text-[11px] font-semibold text-white shadow-md shadow-blue-500/20">
              {initials}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[13px] font-medium text-slate-700 dark:text-slate-200 truncate">{user?.name ?? "You"}</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-600 truncate">{user?.email ?? ""}</p>
            </div>
            <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-700 shrink-0" />
          </button>
        </DropdownMenu.Trigger>

        {/* ── Dropdown content ── */}
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            side="top"
            align="start"
            sideOffset={8}
            className={cn(
              "z-50 w-64 rounded-2xl shadow-2xl shadow-black/20 dark:shadow-black/60",
              "border border-slate-200 dark:border-white/9",
              "bg-white dark:bg-[#0e1c32]",
              "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
              "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
              "data-[side=top]:slide-in-from-bottom-2",
            )}
          >
            {/* User header */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 dark:border-white/7">
              <div className="w-9 h-9 shrink-0 rounded-full bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center text-[11px] font-semibold text-white">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate">{user?.name ?? "You"}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email ?? ""}</p>
              </div>
            </div>

            {/* Menu items */}
            <div className="p-1.5 space-y-0.5">

              {/* Settings */}
              <DropdownMenu.Item className={itemClass}>
                <Settings className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                Settings
              </DropdownMenu.Item>

              {/* Theme toggle */}
              <DropdownMenu.Item onSelect={toggleTheme} className={itemClass}>
                {isDark
                  ? <Sun className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  : <Moon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                }
                <span className="flex-1">{isDark ? "Light Mode" : "Dark Mode"}</span>
                {/* pill */}
                <div className={cn(
                  "w-8 h-[18px] rounded-full flex items-center px-0.5 transition-colors",
                  isDark ? "bg-slate-300 dark:bg-slate-700" : "bg-blue-500"
                )}>
                  <div className={cn(
                    "w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform",
                    isDark ? "translate-x-0" : "translate-x-3.5"
                  )} />
                </div>
              </DropdownMenu.Item>
            </div>

            <DropdownMenu.Separator className="h-px bg-slate-200 dark:bg-white/7 mx-2" />

            {/* Logout */}
            <div className="p-1.5">
              <DropdownMenu.Item
                onSelect={e => { e.preventDefault(); setLogoutOpen(true) }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-red-500 dark:text-red-400 cursor-pointer outline-none transition-colors hover:bg-red-50 focus:bg-red-50 dark:hover:bg-red-500/10 dark:focus:bg-red-500/10"
              >
                <LogOut className="w-4 h-4" />
                Log out
              </DropdownMenu.Item>
            </div>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {/* ── Logout confirmation dialog ── */}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 dark:bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm rounded-2xl border border-slate-200 dark:border-white/9 bg-white dark:bg-[#0e1c32] p-6 shadow-2xl shadow-black/10 dark:shadow-black/60 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95">

          <div className="w-11 h-11 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-center justify-center mb-4">
            <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400" />
          </div>

          <Dialog.Title className="text-base font-semibold text-slate-900 dark:text-white mb-1.5">
            Log out of Vloq Chats?
          </Dialog.Title>
          <Dialog.Description className="text-[13px] text-slate-500 leading-relaxed mb-6">
            You'll be signed out of your account and redirected to the login page. Any unsent messages will be lost.
          </Dialog.Description>

          <div className="flex items-center gap-3">
            <Dialog.Close asChild>
              <button className="flex-1 h-9 rounded-xl border border-slate-200 dark:border-white/9 bg-slate-100 dark:bg-white/4 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/8 transition-colors">
                Cancel
              </button>
            </Dialog.Close>
            <button
              onClick={confirmLogout}
              className="flex-1 h-9 rounded-xl bg-red-500 hover:bg-red-400 text-sm font-medium text-white transition-colors shadow-lg shadow-red-500/20"
            >
              Log out
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
