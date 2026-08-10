"use client";

import { useEffect, useRef, useState } from "react";
import { Smile } from "lucide-react";
import { EmojiPicker } from "frimousse";
import type {
  EmojiPickerListCategoryHeaderProps,
  EmojiPickerListEmojiProps,
  EmojiPickerListRowProps,
} from "frimousse";
import { Popover } from "radix-ui";

// ─── category icons ──────────────────────────────────────────────────────────

const CATEGORIES = [
  {
    name: "Smileys & People",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-[18px] h-[18px]"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
        <line x1="9" y1="9" x2="9.01" y2="9" />
        <line x1="15" y1="9" x2="15.01" y2="9" />
      </svg>
    ),
  },
  {
    name: "Animals & Nature",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-[18px] h-[18px]"
      >
        <path d="M12 10c-1.1 0-2-.9-2-2V4a2 2 0 1 1 4 0v4c0 1.1-.9 2-2 2z" />
        <path d="M5 13c-1.1 0-2-.9-2-2V7a2 2 0 1 1 4 0v4c0 1.1-.9 2-2 2z" />
        <path d="M19 13c-1.1 0-2-.9-2-2V7a2 2 0 1 1 4 0v4c0 1.1-.9 2-2 2z" />
        <path d="M12 20c-3.3 0-6-2.7-6-6v-2c0-1.1.9-2 2-2h8c1.1 0 2 .9 2 2v2c0 3.3-2.7 6-6 6z" />
      </svg>
    ),
  },
  {
    name: "Food & Drink",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-[18px] h-[18px]"
      >
        <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
        <line x1="6" y1="2" x2="6" y2="4" />
        <line x1="10" y1="2" x2="10" y2="4" />
        <line x1="14" y1="2" x2="14" y2="4" />
      </svg>
    ),
  },
  {
    name: "Activities",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-[18px] h-[18px]"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M6.2 6.2L17.8 17.8" />
        <path d="M17.8 6.2L6.2 17.8" />
        <circle cx="12" cy="12" r="4" />
      </svg>
    ),
  },
  {
    name: "Travel & Places",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-[18px] h-[18px]"
      >
        <rect x="1" y="3" width="15" height="13" rx="2" ry="2" />
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
  },
  {
    name: "Objects",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-[18px] h-[18px]"
      >
        <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5 5 0 0 0 8 8c0 1 .3 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
        <line x1="9" y1="18" x2="15" y2="18" />
        <line x1="10" y1="22" x2="14" y2="22" />
      </svg>
    ),
  },
  {
    name: "Symbols",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-[18px] h-[18px]"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
  {
    name: "Flags",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-[18px] h-[18px]"
      >
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
        <line x1="4" y1="22" x2="4" y2="15" />
      </svg>
    ),
  },
];

const mapCategoryToTab = (catName: string): number => {
  const lower = catName.toLowerCase();
  if (
    lower.includes("smiley") ||
    lower.includes("emotion") ||
    lower.includes("people") ||
    lower.includes("body")
  )
    return 0;
  if (lower.includes("animal") || lower.includes("nature")) return 1;
  if (lower.includes("food") || lower.includes("drink")) return 2;
  if (lower.includes("activit")) return 3;
  if (lower.includes("travel") || lower.includes("place")) return 4;
  if (lower.includes("object")) return 5;
  if (lower.includes("symbol")) return 6;
  if (lower.includes("flag")) return 7;
  return 0;
};

// ─── list sub-components ──────────────────────────────────────────────────────

function EmojiCategoryHeader({
  category,
  ...props
}: EmojiPickerListCategoryHeaderProps) {
  return (
    <div
      {...props}
      data-category={category.label}
      style={{
        ...props.style,
        height: "8px",
        opacity: 0,
        margin: 0,
        padding: 0,
      }}
    />
  );
}

function EmojiRow({ children, ...props }: EmojiPickerListRowProps) {
  return (
    <div {...props} className="flex items-center justify-between">
      {children}
    </div>
  );
}

function EmojiButton({ emoji, ...props }: EmojiPickerListEmojiProps) {
  return (
    <button
      {...props}
      className={`w-10 h-10 flex items-center justify-center text-[24px] rounded-lg cursor-pointer transition-transform hover:scale-115 active:scale-95 ${
        emoji.isActive ? "bg-slate-100 dark:bg-white/8" : ""
      }`}
    >
      {emoji.emoji}
    </button>
  );
}

const listComponents = {
  CategoryHeader: EmojiCategoryHeader,
  Row: EmojiRow,
  Emoji: EmojiButton,
};

// ─── main component ───────────────────────────────────────────────────────────

type EmojiPickerButtonProps = {
  onSelect: (emoji: string) => void;
};

export function EmojiPickerButton({ onSelect }: EmojiPickerButtonProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Reset active tab when picker opens
  useEffect(() => {
    if (open) {
      setActiveTab(0);
    }
  }, [open]);

  const scrollToCategory = (tabIndex: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const headers = viewport.querySelectorAll("[data-category]");
    let targetHeader: HTMLElement | null = null;

    for (let i = 0; i < headers.length; i++) {
      const el = headers[i] as HTMLElement;
      const cat = el.getAttribute("data-category") || "";
      if (mapCategoryToTab(cat) === tabIndex) {
        targetHeader = el;
        break;
      }
    }

    if (targetHeader) {
      const parentEl = (targetHeader as HTMLElement).parentElement;
      if (parentEl) {
        viewport.scrollTo({
          top: parentEl.offsetTop,
          behavior: "smooth",
        });
        setActiveTab(tabIndex);
      }
    }
  };

  const handleViewportScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const viewport = e.currentTarget;
    const headers = viewport.querySelectorAll("[data-category]");
    let currentActive = "";
    let minDiff = Infinity;

    headers.forEach((header) => {
      const el = header as HTMLElement;
      const parentEl = el.parentElement;
      if (!parentEl) return;
      const diff = viewport.scrollTop - parentEl.offsetTop;
      if (diff >= -10 && diff < minDiff) {
        minDiff = diff;
        currentActive = el.getAttribute("data-category") || "";
      }
    });

    if (currentActive) {
      setActiveTab(mapCategoryToTab(currentActive));
    }
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="w-8 h-8 flex items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--surface-hover)] transition-colors"
          title="Emoji"
        >
          <Smile className="w-5 h-5" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="top"
          align="start"
          sideOffset={12}
          className="z-50 outline-none w-[380px] rounded-2xl border border-slate-200/50 bg-white dark:bg-[#1f2c34] shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:border-white/5 flex flex-col overflow-hidden"
        >
          <EmojiPicker.Root
            columns={9}
            onEmojiSelect={({ emoji }) => {
              onSelect(emoji);
              setOpen(false);
            }}
            className="w-full flex flex-col"
          >
            {/* Top Category tabs */}
            <div className="flex justify-between items-center px-2 pt-2 pb-0.5 border-b border-slate-100 dark:border-white/5 bg-slate-50/60 dark:bg-[#182229]/40">
              {CATEGORIES.map((cat, idx) => {
                const isActive = activeTab === idx;
                return (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => scrollToCategory(idx)}
                    title={cat.name}
                    className={`flex flex-col items-center flex-1 py-2 transition-all relative ${
                      isActive
                        ? "text-[var(--accent)]"
                        : "text-[#8696a0] dark:text-[#667781] hover:text-[#111b21] dark:hover:text-[#e9edef]"
                    }`}
                  >
                    {cat.icon}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-[var(--accent)] rounded-t-full" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative px-3.5 py-2.5">
              <EmojiPicker.Search
                className="w-full h-9.5 rounded-full bg-white dark:bg-[#1f2c34] border border-[#00a884] dark:border-[#00a884] pl-10 pr-4 text-[15px] text-[#111b21] dark:text-[#e9edef] placeholder:text-[#8696a0] dark:placeholder:text-[#667781] outline-none focus:border-[#00a884]"
                placeholder="Search emoji"
              />
              <svg
                className="absolute left-7 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#8696a0] dark:text-[#667781] pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.2}
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </div>

            {/* List Viewport */}
            <EmojiPicker.Viewport
              ref={viewportRef}
              onScroll={handleViewportScroll}
              style={{ scrollbarGutter: "auto" }}
              className="h-[310px] overflow-y-auto pl-3.5 pr-1.5 scrolling-touch"
            >
              <EmojiPicker.Loading className="flex h-full items-center justify-center text-[13px] text-slate-400 dark:text-slate-600">
                Loading…
              </EmojiPicker.Loading>
              <EmojiPicker.Empty className="flex h-full items-center justify-center text-[13px] text-slate-400 dark:text-slate-600">
                No emoji found.
              </EmojiPicker.Empty>
              <EmojiPicker.List components={listComponents} />
            </EmojiPicker.Viewport>
          </EmojiPicker.Root>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
