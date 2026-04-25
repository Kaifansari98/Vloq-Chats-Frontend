"use client"

import { useMemo } from "react"
import { AUTH_TOKEN_COOKIE, AUTH_USER_COOKIE } from "@/lib/auth"
import type { AuthenticatedUser } from "@/types/auth"

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

export function useAuth(): {
  user: AuthenticatedUser | null
  token: string | null
  isAuthenticated: boolean
} {
  return useMemo(() => {
    const token = readCookie(AUTH_TOKEN_COOKIE)

    let user: AuthenticatedUser | null = null
    const raw = readCookie(AUTH_USER_COOKIE)
    if (raw) {
      try {
        user = JSON.parse(raw) as AuthenticatedUser
      } catch {
        user = null
      }
    }

    return { user, token, isAuthenticated: !!token }
  }, [])
}
