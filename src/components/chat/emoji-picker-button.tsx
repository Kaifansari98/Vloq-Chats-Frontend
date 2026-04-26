"use client"

import { useState } from "react"
import { Smile } from "lucide-react"
import { EmojiPicker } from "frimousse"
import type {
  EmojiPickerListCategoryHeaderProps,
  EmojiPickerListEmojiProps,
  EmojiPickerListRowProps,
} from "frimousse"
import { Popover } from "radix-ui"

// ─── list sub-components ──────────────────────────────────────────────────────

function EmojiCategoryHeader({ category, ...props }: EmojiPickerListCategoryHeaderProps) {
  return (
    <div
      {...props}
      className="px-1 pt-3 pb-1.5 text-[13px] font-semibold text-slate-700 dark:text-slate-200"
    >
      {category.label}
    </div>
  )
}

function EmojiRow({ children, ...props }: EmojiPickerListRowProps) {
  return (
    <div {...props} className="flex items-center">
      {children}
    </div>
  )
}

function EmojiButton({ emoji, ...props }: EmojiPickerListEmojiProps) {
  return (
    <button
      {...props}
      className={`w-[42px] h-[42px] flex items-center justify-center text-[24px] rounded-xl cursor-pointer transition-colors ${
        emoji.isActive
          ? "bg-slate-100 dark:bg-white/10"
          : "hover:bg-slate-100 dark:hover:bg-white/8"
      }`}
    >
      {emoji.emoji}
    </button>
  )
}

const listComponents = {
  CategoryHeader: EmojiCategoryHeader,
  Row: EmojiRow,
  Emoji: EmojiButton,
}

// ─── main component ───────────────────────────────────────────────────────────

type EmojiPickerButtonProps = {
  onSelect: (emoji: string) => void
}

export function EmojiPickerButton({ onSelect }: EmojiPickerButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/8 transition-colors"
          title="Emoji"
        >
          <Smile className="w-4 h-4" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content side="top" align="start" sideOffset={8} className="z-50 outline-none">
          <EmojiPicker.Root
            columns={8}
            onEmojiSelect={({ emoji }) => {
              onSelect(emoji)
              setOpen(false)
            }}
            className="w-[348px] rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f172a] shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Search */}
            <div className="relative px-3 pt-3 pb-2">
              <svg
                className="absolute left-6 top-1/2 translate-y-[-2px] w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <EmojiPicker.Search
                className="w-full h-10 rounded-xl bg-slate-100 dark:bg-white/8 pl-9 pr-3 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none border border-slate-200/80 dark:border-white/8 focus:border-blue-400/60 dark:focus:border-blue-500/40 transition-colors"
                placeholder="Search…"
              />
            </div>

            {/* List */}
            <EmojiPicker.Viewport className="h-[300px] overflow-y-auto px-2">
              <EmojiPicker.Loading className="flex h-full items-center justify-center text-[12px] text-slate-400 dark:text-slate-600">
                Loading…
              </EmojiPicker.Loading>
              <EmojiPicker.Empty className="flex h-full items-center justify-center text-[12px] text-slate-400 dark:text-slate-600">
                No emoji found.
              </EmojiPicker.Empty>
              <EmojiPicker.List components={listComponents} />
            </EmojiPicker.Viewport>

            {/* Footer: hovered emoji name + skin tone selector */}
            <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-t border-slate-100 dark:border-white/6">
              <EmojiPicker.ActiveEmoji>
                {({ emoji }) =>
                  emoji ? (
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xl leading-none shrink-0">{emoji.emoji}</span>
                      <span className="text-[13px] font-medium text-slate-600 dark:text-slate-300 truncate capitalize">
                        {emoji.label}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[12px] text-slate-400 dark:text-slate-600">
                      Pick an emoji…
                    </span>
                  )
                }
              </EmojiPicker.ActiveEmoji>
              <EmojiPicker.SkinToneSelector
                emoji="👋"
                className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl text-[20px] hover:bg-slate-100 dark:hover:bg-white/8 transition-colors cursor-pointer"
              />
            </div>
          </EmojiPicker.Root>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
