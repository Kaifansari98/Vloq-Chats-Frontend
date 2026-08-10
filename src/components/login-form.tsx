"use client"

import { useState, useTransition } from "react"
import { AxiosError } from "axios"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"
import {
  AUTH_COOKIE_MAX_AGE,
  AUTH_TOKEN_COOKIE,
  AUTH_USER_COOKIE,
} from "@/lib/auth"
import type { LoginRequest, LoginResponse } from "@/types/auth"
import { cn } from "@/lib/utils"

import { Eye, EyeOff } from "lucide-react"

import Image from "next/image"
import nexynLogo from "@/assets/nexynchat.png"
import nexynLogoDark from "@/assets/nexynchatdark.png"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")

    startTransition(async () => {
      try {
        const payload: LoginRequest = {
          email: email.trim().toLowerCase(),
          password,
          provider: "EMAIL",
        }

        const response = await api.post<LoginResponse>("/auth/login", payload)

        document.cookie = `${AUTH_TOKEN_COOKIE}=${encodeURIComponent(response.data.accessToken)}; path=/; max-age=${AUTH_COOKIE_MAX_AGE}; samesite=lax`
        document.cookie = `${AUTH_USER_COOKIE}=${encodeURIComponent(JSON.stringify(response.data.user))}; path=/; max-age=${AUTH_COOKIE_MAX_AGE}; samesite=lax`

        router.replace("/")
        router.refresh()
      } catch (error) {
        const message =
          error instanceof AxiosError
            ? (error.response?.data?.message as string | undefined) ??
              "Login failed"
            : "Login failed"

        setError(message)
      }
    })
  }

  return (
    <form
      className={cn("flex flex-col gap-6", className)}
      onSubmit={handleSubmit}
      {...props}
    >
      <FieldGroup>
        <div className="flex flex-col items-center text-center">
          <h1 className="text-2xl font-bold">Login to your account</h1>
          <p className="text-sm text-balance text-muted-foreground mt-2">
            Enter your email below to login to your account
          </p>
        </div>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="m@example.com"
            required
            className="bg-background"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            suppressHydrationWarning
          />
        </Field>
        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            {/* <a
              href="#"
              className="ml-auto text-sm underline-offset-4 hover:underline"
            >
              Forgot your password?
            </a> */}
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              className="bg-background pr-10"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              suppressHydrationWarning
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors focus:outline-none"
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </Field>
        {error ? (
          <FieldDescription className="text-center text-red-500">
            {error}
          </FieldDescription>
        ) : null}
        <Field>
          <Button
            type="submit"
            disabled={isPending}
            className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold h-11 rounded-xl shadow-md transition-all active:scale-[0.99]"
          >
            {isPending ? "Logging in..." : "Login"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}
