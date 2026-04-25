import { AUTH_USER_COOKIE } from "@/lib/auth";
import type { AuthenticatedUser } from "@/types/auth";
import { cookies } from "next/headers";

function parseUserCookie(value: string | undefined): AuthenticatedUser | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(decodeURIComponent(value)) as AuthenticatedUser;
  } catch {
    return null;
  }
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const user = parseUserCookie(cookieStore.get(AUTH_USER_COOKIE)?.value);

  return (
    <main className="grid gap-6 p-6 lg:grid-cols-[1.4fr_0.9fr]">
      <section className="rounded-[28px] border border-white/10 bg-white/6 p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-sky-200/70">
          Workspace overview
        </p>
        <h2 className="mt-4 max-w-xl text-4xl font-semibold tracking-tight text-white">
          {user ? `Welcome back, ${user.name}.` : "Welcome to Vloq Chats."}
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
          You are authenticated through the backend login API and protected by a
          server-side route guard on the dashboard layout.
        </p>
      </section>

      <section className="rounded-[28px] border border-orange-400/20 bg-[var(--color-accent-soft)] p-6">
        <p className="text-sm font-medium text-orange-100">Session details</p>
        <ul className="mt-4 space-y-3 text-sm text-orange-50/90">
          <li>Email: {user?.email ?? "Unknown"}</li>
          <li>User UUID: {user?.uuid ?? "Unknown"}</li>
          <li>Protected route: `/`</li>
          <li>Login route: `/login`</li>
        </ul>
      </section>
    </main>
  );
}
