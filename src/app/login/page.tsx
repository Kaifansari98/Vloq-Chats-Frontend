import { LoginForm } from "@/components/login-form"
import { AUTH_TOKEN_COOKIE } from "@/lib/auth"
import { GalleryVerticalEndIcon } from "lucide-react"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import Image from "next/image"

export default async function LoginPage() {
  const cookieStore = await cookies()

  if (cookieStore.get(AUTH_TOKEN_COOKIE)?.value) {
    redirect("/")
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="/login" className="flex items-center gap-2 font-medium">
            <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GalleryVerticalEndIcon className="size-4" />
            </div>
            Vloq Chats
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <Image
          src="/image1.jpg"
          alt="Team collaboration workspace"
          fill
          priority
          className="object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  )
}
