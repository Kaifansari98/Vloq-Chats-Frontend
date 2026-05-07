"use client"

import { useState } from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import { NotificationManager } from "@/components/notification-manager"
import { Toaster } from "@/components/ui/sonner"
import { createQueryClient } from "@/lib/query-client"

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient)
  return (
    <QueryClientProvider client={queryClient}>
      <NotificationManager />
      <Toaster position="top-right" closeButton />
      {children}
    </QueryClientProvider>
  )
}
