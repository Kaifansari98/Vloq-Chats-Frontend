"use client"

import { useRouter } from "next/navigation"
import { AUTH_TOKEN_COOKIE, AUTH_USER_COOKIE } from "@/lib/auth"

export function LogoutButton() {
  const router = useRouter()

  function handleLogout() {
    document.cookie = `${AUTH_TOKEN_COOKIE}=; path=/; max-age=0`
    document.cookie = `${AUTH_USER_COOKIE}=; path=/; max-age=0`
    router.replace("/login")
  }

  return (
    <button
      onClick={handleLogout}
      className="rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1 text-sm text-red-300 transition-colors hover:bg-red-500/20 hover:text-red-200"
    >
      Logout
    </button>
  )
}
