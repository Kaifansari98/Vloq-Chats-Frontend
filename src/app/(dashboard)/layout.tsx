import { AUTH_TOKEN_COOKIE } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();

  if (!cookieStore.get(AUTH_TOKEN_COOKIE)?.value) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-7xl flex-col overflow-hidden rounded-[32px] border border-[var(--color-border)] bg-[var(--color-panel)] shadow-2xl shadow-slate-950/30 backdrop-blur">
        <header className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-orange-300/80">
              Vloq Chats
            </p>
            <h1 className="text-lg font-semibold text-white">Dashboard</h1>
          </div>
          <LogoutButton />
        </header>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
