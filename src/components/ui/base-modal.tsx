"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export type ModalSize = "sm" | "md" | "lg" | "xl" | "xxl" | "2xl" | "3xl" | "full"

export interface BaseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: React.ReactNode
  desc?: React.ReactNode
  description?: React.ReactNode
  size?: ModalSize
  children?: React.ReactNode
  footer?: React.ReactNode
  className?: string
  showCloseButton?: boolean
  headerExtra?: React.ReactNode
  headerClassName?: string
  contentClassName?: string
}

const sizeClasses: Record<ModalSize, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
  xxl: "sm:max-w-2xl",
  "2xl": "sm:max-w-2xl",
  "3xl": "sm:max-w-3xl",
  full: "sm:max-w-[95vw] w-[95vw]",
}

export function BaseModal({
  open,
  onOpenChange,
  title,
  desc,
  description,
  size = "md",
  children,
  footer,
  className,
  showCloseButton = true,
  headerExtra,
  headerClassName,
  contentClassName,
}: BaseModalProps) {
  const modalDescription = desc || description

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={showCloseButton}
        className={cn(
          "bg-white dark:bg-[#1f2c34] border border-slate-200 dark:border-white/10 p-0 overflow-hidden flex flex-col shadow-2xl rounded-2xl",
          sizeClasses[size] || sizeClasses.md,
          className
        )}
      >
        {!title && (
          <DialogTitle className="sr-only">Modal</DialogTitle>
        )}
        {!modalDescription && (
          <DialogDescription className="sr-only">Modal content</DialogDescription>
        )}
        {(title || modalDescription || headerExtra) && (
          <DialogHeader
            className={cn(
              "px-6 pt-6 pb-4 flex flex-row items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 shrink-0",
              headerClassName
            )}
          >
            <div className="space-y-1">
              {title && (
                <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-white leading-none">
                  {title}
                </DialogTitle>
              )}
              {modalDescription && (
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {modalDescription}
                </DialogDescription>
              )}
            </div>
            {headerExtra && <div className="shrink-0">{headerExtra}</div>}
          </DialogHeader>
        )}

        <div className={cn("flex-1 overflow-y-auto p-6 min-h-0", contentClassName)}>
          {children}
        </div>

        {footer && (
          <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/60 dark:bg-[#182229]/60 shrink-0">
            {footer}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
