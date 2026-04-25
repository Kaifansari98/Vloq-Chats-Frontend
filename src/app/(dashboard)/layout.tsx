import { AUTH_TOKEN_COOKIE } from "@/lib/auth";
import { Providers } from "@/components/providers";
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

  return <Providers>{children}</Providers>;
}
