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

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

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
          <p className="text-sm text-balance text-muted-foreground">
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
          <Input
            id="password"
            type="password"
            required
            className="bg-background"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        {error ? (
          <FieldDescription className="text-center text-red-500">
            {error}
          </FieldDescription>
        ) : null}
        <Field>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Logging in..." : "Login"}
          </Button>
        </Field>
        <FieldSeparator>Or continue with</FieldSeparator>
        <Field>
          <Button variant="outline" type="button" disabled>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path
                d="M21.805 10.023h-9.797v3.955h5.617c-.242 1.271-.967 2.348-2.057 3.07v2.55h3.328c1.947-1.793 3.07-4.433 3.07-7.575 0-.656-.059-1.287-.16-1.9Z"
                fill="#4285F4"
              />
              <path
                d="M12.008 22c2.777 0 5.105-.92 6.805-2.49l-3.328-2.55c-.924.621-2.105.99-3.477.99-2.672 0-4.936-1.805-5.744-4.23H2.828v2.63A10.282 10.282 0 0 0 12.008 22Z"
                fill="#34A853"
              />
              <path
                d="M6.264 13.72a6.164 6.164 0 0 1 0-3.44V7.65H2.828a10.284 10.284 0 0 0 0 8.7l3.436-2.63Z"
                fill="#FBBC04"
              />
              <path
                d="M12.008 6.05c1.512 0 2.871.52 3.939 1.541l2.957-2.957C17.109 2.961 14.781 2 12.008 2A10.282 10.282 0 0 0 2.828 7.65l3.436 2.63c.808-2.425 3.072-4.23 5.744-4.23Z"
                fill="#EA4335"
              />
              <path
                d="M2 2h20v20H2z"
                fill="none"
              />
            </svg>
            Login with Google
          </Button>
          <FieldDescription className="text-center">
            Social login is not wired yet.
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  )
}
