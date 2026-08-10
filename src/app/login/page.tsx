import { LoginForm } from "@/components/login-form"
import { AUTH_TOKEN_COOKIE } from "@/lib/auth"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import Image from "next/image"
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"
import nexynLogo from "@/assets/nexynchat.png"
import nexynLogoDark from "@/assets/nexynchatdark.png"

export default async function LoginPage() {
  const cookieStore = await cookies()

  if (cookieStore.get(AUTH_TOKEN_COOKIE)?.value) {
    redirect("/")
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2 bg-[var(--background)] text-[var(--foreground)]">
      {/* Left Login Form Area */}
      <div className="flex flex-col justify-between p-6 sm:p-10 md:p-12 bg-[var(--sidebar-bg)] border-r border-[var(--border-color)] relative">
        {/* Invisible Theme Toggler to listen for 'D' key shortcut */}
        <AnimatedThemeToggler className="sr-only" />

        {/* Top Header with Centered Logo */}
        <div className="flex items-center justify-center select-none pt-8 md:pt-12 pb-4">
          {/* Light Mode Logo */}
          <Image
            src={nexynLogo}
            alt="Nexyn Chat Logo"
            width={280}
            height={280}
            priority
            className="h-16 w-auto object-contain dark:hidden"
          />
          {/* Dark Mode Logo */}
          <Image
            src={nexynLogoDark}
            alt="Nexyn Chat Logo Dark"
            width={280}
            height={280}
            priority
            className="hidden h-16 w-auto object-contain dark:block"
          />
        </div>

        {/* Form Container */}
        <div className="my-auto w-full max-w-sm mx-auto py-8">
          <LoginForm />
        </div>

        {/* Footer */}
        <div className="text-xs text-[var(--text-muted)] text-center sm:text-left">
          &copy; {new Date().getFullYear()} Nexyn Studio. All rights reserved.
        </div>
      </div>

      {/* Right Background Image Section */}
      <div className="relative hidden lg:block bg-[var(--surface)] overflow-hidden">
        <Image
          src="/image1.jpg"
          alt="Team workspace background"
          fill
          sizes="50vw"
          priority
          className="object-cover dark:brightness-[0.75]"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/20 to-transparent" />
        <div className="absolute bottom-10 left-10 right-10 text-white z-10">
          <h3 className="text-2xl font-bold tracking-tight">Stay connected with your team</h3>
          <p className="mt-2 text-sm text-slate-200">Instant messaging, voice notes and secure file sharing in one place.</p>
        </div>
      </div>
    </div>
  )
}
