"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FileText, ImageIcon, Paperclip, Send, X } from "lucide-react";
import { AttachmentDisplay } from "@/components/chat/attachment-display";
import { NotificationBell } from "@/components/chat/notification-bell";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { EmojiPickerButton } from "./emoji-picker-button";
import { ImagePreviewModal } from "@/components/chat/image-preview-modal";
import type { MessageAttachment } from "@/hooks/use-direct-messages";

// ─── types ────────────────────────────────────────────────────────────────────

export type ChatConversation = {
  id: string;
  memberId: number;
  name: string;
  initials: string;
  lastMessage: string;
  time: string;
  unread: number;
  latestActivityAt: number;
  online: boolean;
  isTyping: boolean;
  gradient: string;
  participants?: Array<{ id: number; name: string; initials: string }>;
  onlineParticipantNames?: string[];
  onlineParticipants?: Array<{ id: number; name: string; initials: string }>;
};

export type ChatMessage = {
  uuid: string;
  content: string | null;
  senderName: string;
  isOwnMessage: boolean;
  createdAt: string;
  readAt?: string | null;
  status: "sent" | "read";
  attachments: MessageAttachment[];
};

type ChatWindowProps = {
  selected: ChatConversation;
  message: string;
  messages: ChatMessage[];
  selectedFiles: File[];
  isLoadingMessages?: boolean;
  isSendingMessage?: boolean;
  isPeerTyping?: boolean;
  typingNames?: string[];
  onMessageChange: (value: string) => void;
  onSendMessage: () => void;
  onFileSelect: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
};

// ─── allowed file types ───────────────────────────────────────────────────────

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png"];
const ALLOWED_DOC_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "application/zip",
  "application/x-zip-compressed",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 5;
const FILE_INPUT_ACCEPT =
  ".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx,.csv,.zip,.ppt,.pptx,image/jpeg,image/png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,application/zip,application/x-zip-compressed,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation";

// ─── helpers ──────────────────────────────────────────────────────────────────

type MessageGroup = {
  dayKey: string;
  dayLabel: string;
  messages: ChatMessage[];
};

type ParticipantPreview = {
  id: number;
  name: string;
  initials: string;
};

type ActiveMention = {
  start: number;
  end: number;
  query: string;
};

const GROUP_AVATAR_GRADIENTS = [
  "from-amber-500 to-orange-500",
  "from-pink-500 to-fuchsia-500",
  "from-violet-500 to-purple-500",
  "from-teal-500 to-cyan-500",
  "from-orange-500 to-red-500",
  "from-fuchsia-500 to-pink-500",
  "from-emerald-500 to-teal-500",
  "from-blue-500 to-cyan-500",
];

function MemberPopoverContent({
  participants,
}: {
  participants: ParticipantPreview[];
}) {
  return (
    <div className="w-[220px] rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.4)] dark:border-white/10 dark:bg-[#0f172a] dark:shadow-[0_18px_36px_-24px_rgba(0,0,0,0.72)]">
      <div className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
        Members
      </div>
      <div className="grid grid-cols-3 gap-x-2 gap-y-3">
        {participants.map((item, itemIndex) => {
          const itemGradient =
            GROUP_AVATAR_GRADIENTS[itemIndex % GROUP_AVATAR_GRADIENTS.length];
          const [firstName = "", secondName = ""] = item.name.split(" ");

          return (
            <div key={item.id} className="flex flex-col items-center text-center">
              <div
                title={item.name}
                className={`flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br ${itemGradient} text-[10px] font-semibold text-white`}
              >
                {item.initials}
              </div>
              <div className="mt-1 min-h-[24px] text-[10px] leading-tight text-slate-600 dark:text-slate-300">
                <div>{firstName}</div>
                <div>{secondName}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GroupParticipantsCluster({
  participants,
}: {
  participants: ParticipantPreview[];
}) {
  const [hoveredParticipantId, setHoveredParticipantId] = useState<number | null>(null);
  const [openPopoverId, setOpenPopoverId] = useState<number | "more" | null>(null);
  const clusterRef = useRef<HTMLDivElement>(null);
  const visibleParticipants = participants.slice(0, 3);
  const extraCount = participants.length - visibleParticipants.length;

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!clusterRef.current) return;
      if (clusterRef.current.contains(event.target as Node)) return;
      setOpenPopoverId(null);
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  if (participants.length === 0) {
    return null;
  }

  return (
    <div ref={clusterRef} className="flex items-center pl-3">
      {visibleParticipants.map((participant, index) => {
        const isHovered = hoveredParticipantId === participant.id;
        const isPopoverOpen = openPopoverId === participant.id;
        const gradient =
          GROUP_AVATAR_GRADIENTS[index % GROUP_AVATAR_GRADIENTS.length];

        return (
          <div
            key={participant.id}
            className="relative"
            style={{
              marginLeft: index === 0 ? 0 : -10,
              zIndex: visibleParticipants.length - index,
            }}
            onMouseEnter={() => setHoveredParticipantId(participant.id)}
            onMouseLeave={() =>
              setHoveredParticipantId((current) =>
                current === participant.id ? null : current,
              )
            }
          >
            <motion.button
              type="button"
              onClick={() =>
                setOpenPopoverId((current) =>
                  current === participant.id ? null : participant.id,
                )
              }
              whileHover={{ y: -2, scale: 1.04 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className={`flex h-8 w-8 items-center justify-center rounded-full border border-white/50 bg-linear-to-br ${gradient} text-[11px] font-semibold text-white shadow-[0_12px_24px_-16px_rgba(15,23,42,0.38)] dark:border-white/10 dark:shadow-[0_10px_24px_-18px_rgba(15,23,42,0.85)]`}
            >
              {participant.initials}
            </motion.button>

            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.92 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.92 }}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                  className="pointer-events-none absolute top-full left-1/2 z-20 mt-3 -translate-x-1/2"
                >
                  <div className="rounded-full bg-slate-950 px-3 py-1.5 text-[11px] font-medium whitespace-nowrap text-white shadow-lg dark:bg-white dark:text-slate-900">
                    {participant.name}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {isPopoverOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.96 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
                className="absolute top-full right-0 z-30 mt-3"
              >
                <MemberPopoverContent participants={participants} />
              </motion.div>
            )}
          </AnimatePresence>
          </div>
        );
      })}

      {extraCount > 0 && (
        <div
          className="relative"
          style={{ marginLeft: visibleParticipants.length > 0 ? -10 : 0 }}
          onMouseEnter={() => setHoveredParticipantId(-1)}
          onMouseLeave={() =>
            setHoveredParticipantId((current) => (current === -1 ? null : current))
          }
        >
          <motion.button
            type="button"
            onClick={() =>
              setOpenPopoverId((current) => (current === "more" ? null : "more"))
            }
            whileHover={{ y: -2, scale: 1.04 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-200 text-[11px] font-semibold text-slate-700 dark:border-white/10 dark:bg-[#202b4a] dark:text-slate-200"
          >
            +{extraCount}
          </motion.button>

          <AnimatePresence>
            {hoveredParticipantId === -1 && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.92 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
                className="pointer-events-none absolute top-full left-1/2 z-20 mt-3 -translate-x-1/2"
              >
                <div className="rounded-full bg-slate-950 px-3 py-1.5 text-[11px] font-medium whitespace-nowrap text-white shadow-lg dark:bg-white dark:text-slate-900">
                  {extraCount} more active
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {openPopoverId === "more" && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.96 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
                className="absolute top-full right-0 z-30 mt-3"
              >
                <MemberPopoverContent participants={participants} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function dayKey(dateString: string) {
  const d = new Date(dateString);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function formatDayLabel(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const todayKey = dayKey(now.toISOString());
  const msgKey = dayKey(dateString);

  if (msgKey === todayKey) return "Today";

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (msgKey === dayKey(yesterday.toISOString())) return "Yesterday";

  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
  if (diffDays < 7) {
    return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date);
  }

  if (date.getFullYear() === now.getFullYear()) {
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
    }).format(date);
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatMessageTime(dateString: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(dateString));
}

function formatFullDateTime(dateString: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(dateString));
}

function isImageFileType(mimeType: string) {
  return mimeType.startsWith("image/");
}

function getFileExtension(fileName: string) {
  const parts = fileName.split(".");
  if (parts.length < 2) return "FILE";
  return parts.at(-1)?.toUpperCase() ?? "FILE";
}

function truncateMiddle(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  const segmentLength = Math.max(1, Math.floor((maxLength - 3) / 2));
  return `${value.slice(0, segmentLength)}...${value.slice(-segmentLength)}`;
}

function formatIncomingFiles(
  incoming: File[],
  selectedFiles: File[],
): {
  files: File[];
  error: string | null;
} {
  if (incoming.length === 0) {
    return {
      files: selectedFiles,
      error: null,
    };
  }

  const valid: File[] = [];
  const errors: string[] = [];

  for (const file of incoming) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      errors.push(`"${file.name}" is not a supported file type`);
      continue;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      errors.push(`"${file.name}" is larger than 10 MB`);
      continue;
    }
    valid.push(file);
  }

  const existingKeys = new Set(
    selectedFiles.map((file) => `${file.name}-${file.size}-${file.type}`),
  );
  const deduped = valid.filter((file) => {
    const key = `${file.name}-${file.size}-${file.type}`;
    if (existingKeys.has(key)) return false;
    existingKeys.add(key);
    return true;
  });

  if (selectedFiles.length + deduped.length > MAX_FILES) {
    errors.push("You can attach up to 5 files in one message");
  }

  return {
    files: [...selectedFiles, ...deduped].slice(0, MAX_FILES),
    error: errors[0] ?? null,
  };
}

function groupMessagesByDay(messages: ChatMessage[]): MessageGroup[] {
  const groups: MessageGroup[] = [];
  let currentKey = "";

  for (const msg of messages) {
    const key = dayKey(msg.createdAt);
    if (key !== currentKey) {
      currentKey = key;
      groups.push({
        dayKey: key,
        dayLabel: formatDayLabel(msg.createdAt),
        messages: [],
      });
    }
    groups[groups.length - 1].messages.push(msg);
  }

  return groups;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const URL_REGEX = /((?:https?:\/\/|www\.)[^\s<]+)/gi;

function normalizeUrl(url: string) {
  return url.startsWith("http://") || url.startsWith("https://")
    ? url
    : `https://${url}`;
}

function renderTextWithLinks(text: string, keyPrefix: string, isOwn: boolean) {
  const parts = text.split(URL_REGEX);

  return parts.map((part, index) => {
    if (!part) return null;

    if (!URL_REGEX.test(part)) {
      return <span key={`${keyPrefix}-text-${index}`}>{part}</span>;
    }

    URL_REGEX.lastIndex = 0;

    return (
      <a
        key={`${keyPrefix}-link-${index}`}
        href={normalizeUrl(part)}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline rounded px-0.5 py-px break-all transition-opacity hover:opacity-80 ${
          isOwn
            ? "bg-white/20 text-white underline underline-offset-2"
            : "bg-blue-50 text-blue-600 underline underline-offset-2 dark:bg-blue-500/15 dark:text-blue-300"
        }`}
      >
        {part}
      </a>
    );
  });
}

function renderMessageWithMentions({
  content,
  participants,
  isOwn,
}: {
  content: string;
  participants: ParticipantPreview[];
  isOwn: boolean;
}) {
  if (participants.length === 0) {
    return renderTextWithLinks(content, "message", isOwn);
  }

  const names = [...new Set(participants.map((participant) => participant.name))]
    .sort((a, b) => b.length - a.length);

  if (names.length === 0) {
    return renderTextWithLinks(content, "message", isOwn);
  }

  const mentionRegex = new RegExp(
    `(@(?:${names.map((name) => escapeRegExp(name)).join("|")}))`,
    "g",
  );
  const parts = content.split(mentionRegex);

  return parts.map((part, index) => {
    if (!part) return null;

    if (!mentionRegex.test(part)) {
      mentionRegex.lastIndex = 0;
      return (
        <span key={`${part}-${index}`}>
          {renderTextWithLinks(part, `message-${index}`, isOwn)}
        </span>
      );
    }

    mentionRegex.lastIndex = 0;

    return (
      <span
        key={`${part}-${index}`}
        className={`rounded-full px-1.5 py-0.5 font-semibold ${
          isOwn
            ? "bg-white/16 text-white"
            : "bg-blue-100 text-blue-700 dark:bg-blue-500/18 dark:text-blue-300"
        }`}
      >
        {part}
      </span>
    );
  });
}

function findActiveMention(value: string, caretIndex: number): ActiveMention | null {
  const textBeforeCaret = value.slice(0, caretIndex);
  const match = /(^|\s)@([^\s@]*)$/.exec(textBeforeCaret);

  if (!match) {
    return null;
  }

  const query = match[2] ?? "";
  const start = caretIndex - query.length - 1;

  return {
    start,
    end: caretIndex,
    query,
  };
}

// ─── sub-components ───────────────────────────────────────────────────────────

function DateSeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-5 select-none">
      <div className="flex-1 h-px bg-slate-200 dark:bg-white/6" />
      <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-600 shrink-0 px-1 tracking-wide">
        {label}
      </span>
      <div className="flex-1 h-px bg-slate-200 dark:bg-white/6" />
    </div>
  );
}

function TypingDots({
  dotClassName,
  gapClassName = "gap-1.5",
}: {
  dotClassName: string;
  gapClassName?: string;
}) {
  return (
    <div className={`flex items-end ${gapClassName}`}>
      {[0, 1, 2].map((index) => (
        <motion.span
          key={index}
          className={dotClassName}
          animate={{ scale: [0.72, 1.2, 0.72], opacity: [0.45, 1, 0.45] }}
          transition={{
            duration: 0.9,
            ease: "easeInOut",
            repeat: Number.POSITIVE_INFINITY,
            repeatDelay: 0.05,
            delay: index * 0.18,
          }}
        />
      ))}
    </div>
  );
}

// Chip shown in the input area for a selected (not yet sent) file
function SelectedFileChip({
  file,
  onRemove,
}: {
  file: File;
  onRemove: () => void;
}) {
  const isImage = isImageFileType(file.type);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isImage) return;

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPreviewUrl(reader.result);
      }
    };

    reader.readAsDataURL(file);
  }, [file, isImage]);

  return (
    <div className="relative group shrink-0">
      {isImage && previewUrl ? (
        <div className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 dark:border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={file.name}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="flex h-16 w-16 items-center justify-center bg-slate-100 dark:bg-white/8 border border-slate-200 dark:border-white/10 rounded-lg px-2">
          <span className="text-[11px] font-semibold tracking-wide text-slate-600 dark:text-slate-300">
            .{getFileExtension(file.name)}
          </span>
        </div>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 rounded-full bg-slate-700 dark:bg-slate-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Remove file"
      >
        <X className="w-2.5 h-2.5" />
      </button>
    </div>
  );
}

function DragDropOverlay({
  files,
}: {
  files: File[];
}) {
  const previewFile = files[0] ?? null;
  const isImage = previewFile ? ALLOWED_IMAGE_TYPES.includes(previewFile.type) : false;
  const title = files.length > 1 ? "Drop files here" : "Drop file here";

  return (
    <div className="pointer-events-none absolute inset-3 z-40 overflow-hidden rounded-[28px] bg-[#0c0d0f]/90 shadow-[0_28px_80px_rgba(0,0,0,0.45)] backdrop-blur-sm">
      <svg
        className="absolute inset-4 h-[calc(100%-2rem)] w-[calc(100%-2rem)]"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <rect
          x="1"
          y="1"
          width="98"
          height="98"
          rx="3"
          ry="3"
          fill="none"
          stroke="rgba(96,165,250,0.9)"
          strokeWidth="0.35"
          strokeDasharray="1 1.25"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.06),transparent_28%),radial-gradient(circle_at_80%_28%,rgba(16,185,129,0.14),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))]" />
      <div className="absolute inset-0 flex items-center justify-center px-8">
        <div className="flex items-center gap-6 text-white">
          <div className="flex flex-col items-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-[22px] border border-white/10 bg-white/92 shadow-[0_20px_45px_rgba(0,0,0,0.25)]">
              {isImage ? (
                <ImageIcon className="h-11 w-11 text-slate-700" strokeWidth={1.8} />
              ) : (
                <FileText className="h-11 w-11 text-slate-700" strokeWidth={1.8} />
              )}
            </div>
            {previewFile ? (
              <div className="mt-3 max-w-[180px] rounded-md bg-blue-600 px-2.5 py-1 text-center text-[12px] font-medium leading-tight text-white shadow-[0_12px_20px_rgba(37,99,235,0.35)]">
                {truncateMiddle(previewFile.name, 28)}
              </div>
            ) : null}
            {files.length > 1 ? (
              <p className="mt-2 text-[11px] font-medium text-white/65">
                {files.length} files selected
              </p>
            ) : null}
          </div>
          <div className="pt-3">
            <p className="text-[20px] font-semibold tracking-[-0.02em] text-white">
              {title}
            </p>
            <p className="mt-2 text-sm text-white/55">
              Images and documents will be attached to this message.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export function ChatWindow({
  selected,
  message,
  messages,
  selectedFiles,
  isLoadingMessages = false,
  isSendingMessage = false,
  isPeerTyping = false,
  typingNames = [],
  onMessageChange,
  onSendMessage,
  onFileSelect,
  onRemoveFile,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionListRef = useRef<HTMLDivElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<MessageAttachment | null>(
    null,
  );
  const [previewZoom, setPreviewZoom] = useState(1);
  const [activeMention, setActiveMention] = useState<ActiveMention | null>(null);
  const [highlightedMentionIndex, setHighlightedMentionIndex] = useState(0);
  const [draggedFiles, setDraggedFiles] = useState<File[]>([]);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const pendingSelectionRef = useRef<number | null>(null);
  const dragDepthRef = useRef(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isPeerTyping]);

  useEffect(() => {
    if (!previewImage) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPreviewImage(null);
        return;
      }

      if (event.key === "+" || event.key === "=") {
        setPreviewZoom((current) => Math.min(current + 0.2, 3));
      }

      if (event.key === "-") {
        setPreviewZoom((current) => Math.max(current - 0.2, 0.8));
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [previewImage]);

  function openPreviewImage(attachment: MessageAttachment) {
    setPreviewImage(attachment);
    setPreviewZoom(1);
  }

  function closePreviewImage() {
    setPreviewImage(null);
    setPreviewZoom(1);
  }

  function zoomPreviewIn() {
    setPreviewZoom((current) => Math.min(current + 0.2, 3));
  }

  function zoomPreviewOut() {
    setPreviewZoom((current) => Math.max(current - 0.2, 0.8));
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(e.target.files ?? []);
    e.target.value = ""; // reset so same file can be re-selected
    const nextSelection = formatIncomingFiles(incoming, selectedFiles);
    onFileSelect(nextSelection.files);
    setFileError(nextSelection.error);
  }

  function resetDragState() {
    dragDepthRef.current = 0;
    setIsDraggingFiles(false);
    setDraggedFiles([]);
  }

  function handleDragEnter(event: React.DragEvent<HTMLElement>) {
    const hasFiles = Array.from(event.dataTransfer.types).includes("Files");
    if (!hasFiles) return;

    event.preventDefault();
    dragDepthRef.current += 1;
    setIsDraggingFiles(true);

    const previewFiles = Array.from(event.dataTransfer.items)
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null);

    if (previewFiles.length > 0) {
      setDraggedFiles(previewFiles);
    }
  }

  function handleDragOver(event: React.DragEvent<HTMLElement>) {
    const hasFiles = Array.from(event.dataTransfer.types).includes("Files");
    if (!hasFiles) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    if (!isDraggingFiles) {
      setIsDraggingFiles(true);
    }
  }

  function handleDragLeave(event: React.DragEvent<HTMLElement>) {
    const hasFiles = Array.from(event.dataTransfer.types).includes("Files");
    if (!hasFiles) return;

    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);

    if (dragDepthRef.current === 0) {
      resetDragState();
    }
  }

  function handleDrop(event: React.DragEvent<HTMLElement>) {
    const hasFiles = Array.from(event.dataTransfer.types).includes("Files");
    if (!hasFiles) return;

    event.preventDefault();
    const incoming = Array.from(event.dataTransfer.files ?? []);
    const nextSelection = formatIncomingFiles(incoming, selectedFiles);
    onFileSelect(nextSelection.files);
    setFileError(nextSelection.error);
    resetDragState();
  }

  const groupMembers = selected.participants ?? [];
  const filteredMentionMembers = activeMention
    ? groupMembers.filter((participant) => {
        if (!activeMention.query.trim()) {
          return true;
        }

        const normalizedQuery = activeMention.query.trim().toLowerCase();
        return (
          participant.name.toLowerCase().includes(normalizedQuery) ||
          participant.initials.toLowerCase().includes(normalizedQuery)
        );
      })
    : [];
  const activeMentionIndex = Math.min(
    highlightedMentionIndex,
    Math.max(filteredMentionMembers.length - 1, 0),
  );

  useEffect(() => {
    if (pendingSelectionRef.current === null || !textareaRef.current) return;

    const selection = pendingSelectionRef.current;
    pendingSelectionRef.current = null;
    textareaRef.current.focus();
    textareaRef.current.setSelectionRange(selection, selection);
  }, [message]);

  useEffect(() => {
    if (!activeMention || !mentionListRef.current) return;

    const activeItem = mentionListRef.current.querySelector<HTMLElement>(
      `[data-mention-index="${activeMentionIndex}"]`,
    );

    activeItem?.scrollIntoView({
      block: "nearest",
    });
  }, [activeMention, activeMentionIndex]);

  function syncMentionState(nextValue: string, caretIndex: number | null) {
    if (!isGroup || caretIndex === null) {
      setActiveMention(null);
      setHighlightedMentionIndex(0);
      return;
    }

    setActiveMention(findActiveMention(nextValue, caretIndex));
    setHighlightedMentionIndex(0);
  }

  function handleComposerChange(value: string, caretIndex: number | null) {
    onMessageChange(value);
    syncMentionState(value, caretIndex);
  }

  function insertMention(participant: ParticipantPreview) {
    if (!activeMention) return;

    const nextValue =
      `${message.slice(0, activeMention.start)}@${participant.name} ` +
      message.slice(activeMention.end);
    const nextCaretIndex = activeMention.start + participant.name.length + 2;

    pendingSelectionRef.current = nextCaretIndex;
    setHighlightedMentionIndex(0);
    onMessageChange(nextValue);
    syncMentionState(nextValue, nextCaretIndex);
  }

  const canSend =
    (message.trim().length > 0 || selectedFiles.length > 0) &&
    !isSendingMessage;

  const isGroup = selected.memberId === 0;
  const activeParticipantLabel = (selected.onlineParticipants ?? [])
    .map((participant) => participant.name.split(" ")[0])
    .join(", ");
  const typingLabel =
    typingNames.length > 1
      ? `${typingNames[0]} and ${typingNames.length - 1} others are typing...`
      : typingNames.length === 1
        ? `${typingNames[0]} is typing...`
        : "typing something...";
  const typingActorLabel = typingNames[0] ?? selected.name;

  const statusLabel = isPeerTyping
    ? typingLabel
    : selected.online
      ? "Active now"
      : "Offline";

  const showTypingBubble = isPeerTyping && !isLoadingMessages;
  const groups = groupMessagesByDay(messages);

  const lastReadOwnMessageUuid =
    [...messages].reverse().find((m) => m.isOwnMessage && m.status === "read")
      ?.uuid ?? null;

  return (
    <>
      <main
        className="relative flex-1 min-w-0"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDraggingFiles && <DragDropOverlay files={draggedFiles} />}
        <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 h-[68px] border-b border-slate-200 dark:border-white/6 bg-white dark:bg-[#070d1e] shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div
                className={`w-9 h-9 rounded-full bg-linear-to-br ${selected.gradient} flex items-center justify-center text-[11px] font-semibold text-white`}
              >
                {selected.initials}
              </div>
              {!isGroup && selected.online && (
                <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-400 rounded-full border-2 border-white dark:border-[#070d1e]" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white leading-none">
                {selected.name}
              </p>
              <div className="mt-1 flex items-center gap-2">
                {isGroup ? (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[520px]">
                    {activeParticipantLabel || "No active users"}
                  </p>
                ) : (
                  <p
                    className={`text-[11px] transition-colors ${
                      isPeerTyping
                        ? "text-blue-500 dark:text-blue-400"
                        : "text-slate-400 dark:text-slate-600"
                    }`}
                  >
                    {statusLabel}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {isGroup ? (
              <>
                <GroupParticipantsCluster participants={selected.participants ?? []} />
                <NotificationBell />
                <AnimatedThemeToggler
                  variant="circle"
                  duration={500}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.65)] transition-colors hover:bg-slate-50 dark:border-white/8 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 [&_svg]:h-4.5 [&_svg]:w-4.5"
                />
              </>
            ) : (
              <>
                <NotificationBell />
                <AnimatedThemeToggler
                  variant="circle"
                  duration={500}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.65)] transition-colors hover:bg-slate-50 dark:border-white/8 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 [&_svg]:h-4.5 [&_svg]:w-4.5"
                />
              </>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {isLoadingMessages ? (
            <div className="h-full flex items-center justify-center text-[12px] text-slate-400 dark:text-slate-600">
              Loading messages...
            </div>
          ) : messages.length > 0 ? (
            <div>
              {groups.map((group) => (
                <div key={group.dayKey}>
                  <DateSeparator label={group.dayLabel} />
                  <div className="space-y-1">
                    {group.messages.map((chatMessage) => (
                      <div
                        key={chatMessage.uuid}
                        className={`flex flex-col ${chatMessage.isOwnMessage ? "items-end" : "items-start"}`}
                      >
                        {chatMessage.attachments.some(
                          (attachment) => attachment.attachmentType === "IMAGE",
                        ) && (
                          <AttachmentDisplay
                            attachments={chatMessage.attachments.filter(
                              (attachment) =>
                                attachment.attachmentType === "IMAGE",
                            )}
                            isOwn={chatMessage.isOwnMessage}
                            imageClassName={`mb-1.5 ${chatMessage.isOwnMessage ? "justify-end" : "justify-start"}`}
                            onPreviewImage={openPreviewImage}
                          />
                        )}

                        {chatMessage.attachments.some(
                          (attachment) =>
                            attachment.mimeType === "application/pdf",
                        ) && (
                          <AttachmentDisplay
                            attachments={chatMessage.attachments.filter(
                              (attachment) =>
                                attachment.mimeType === "application/pdf",
                            )}
                            isOwn={chatMessage.isOwnMessage}
                            docClassName="mb-1.5"
                          />
                        )}

                        {(chatMessage.content ||
                          chatMessage.attachments.some(
                            (attachment) =>
                              attachment.attachmentType !== "IMAGE" &&
                              attachment.mimeType !== "application/pdf",
                          )) && (
                          <div
                            className={`max-w-[75%] px-4 py-2.5 ${
                              chatMessage.isOwnMessage
                                ? "rounded-2xl rounded-tr-sm bg-blue-500 text-white"
                                : "rounded-2xl rounded-tl-sm bg-white dark:bg-white/6 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-white/8"
                            }`}
                          >
                            {!chatMessage.isOwnMessage && (
                              <p className="text-[11px] font-medium mb-1 text-slate-500 dark:text-slate-400">
                                {chatMessage.senderName}
                              </p>
                            )}
                            <AttachmentDisplay
                              attachments={chatMessage.attachments.filter(
                                (attachment) =>
                                  attachment.attachmentType !== "IMAGE" &&
                                  attachment.mimeType !== "application/pdf",
                              )}
                              isOwn={chatMessage.isOwnMessage}
                            />
                            {chatMessage.content && (
                              <p
                                className={`text-sm leading-relaxed ${
                                  chatMessage.attachments.some(
                                    (attachment) =>
                                      attachment.attachmentType !== "IMAGE" &&
                                      attachment.mimeType !== "application/pdf",
                                  )
                                    ? "mt-1.5"
                                    : ""
                                }`}
                              >
                                {renderMessageWithMentions({
                                  content: chatMessage.content,
                                  participants: selected.participants ?? [],
                                  isOwn: chatMessage.isOwnMessage,
                                })}
                              </p>
                            )}
                          </div>
                        )}

                        {!chatMessage.content &&
                          chatMessage.attachments.length > 0 &&
                          chatMessage.attachments.every(
                            (attachment) =>
                              attachment.attachmentType === "IMAGE",
                          ) && (
                            <div
                              className={`max-w-[75%] px-3 py-1.5 ${
                                chatMessage.isOwnMessage
                                  ? "rounded-2xl rounded-tr-sm bg-blue-500/12 text-blue-700 dark:text-blue-200"
                                  : "rounded-2xl rounded-tl-sm bg-slate-100 text-slate-500 dark:bg-white/6 dark:text-slate-400 border border-slate-200 dark:border-white/8"
                              }`}
                            >
                              {!chatMessage.isOwnMessage && (
                                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                  {chatMessage.senderName}
                                </p>
                              )}
                              <p className="text-[11px]">
                                {chatMessage.attachments.length === 1
                                  ? "Image"
                                  : `${chatMessage.attachments.length} images`}
                              </p>
                            </div>
                          )}

                        {/* Timestamp + Seen */}
                        <div className="group/ts relative flex items-center gap-1 mt-1.5 px-1 cursor-default">
                          <span className="text-[10px] tabular-nums text-slate-400 dark:text-slate-500">
                            {formatMessageTime(chatMessage.createdAt)}
                          </span>
                          {chatMessage.uuid === lastReadOwnMessageUuid && (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">
                              · Seen
                            </span>
                          )}
                          {/* Tooltip */}
                          <div className={`pointer-events-none absolute bottom-full mb-2 z-50 opacity-0 group-hover/ts:opacity-100 transition-opacity duration-150 ${chatMessage.isOwnMessage ? "right-0" : "left-0"}`}>
                            <div className="rounded-xl bg-slate-900 dark:bg-slate-800 px-3 py-2 shadow-lg whitespace-nowrap">
                              <p className="text-[11px] text-slate-300">
                                <span className="text-slate-500 mr-1">Sent at</span>
                                {formatFullDateTime(chatMessage.createdAt)}
                              </p>
                              {chatMessage.uuid === lastReadOwnMessageUuid && (
                                <p className="text-[11px] text-slate-300 mt-0.5">
                                  <span className="text-slate-500 mr-1">Seen at</span>
                                  {chatMessage.readAt
                                    ? formatFullDateTime(chatMessage.readAt)
                                    : "—"}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {showTypingBubble && (
                <div className="flex justify-start mt-2">
                  <div className="max-w-[75%]">
                    <div className="mb-1 px-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      {typingActorLabel}
                    </div>
                    <div className="relative overflow-hidden rounded-[22px] rounded-bl-md border border-slate-200/90 bg-white px-4 py-3 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.45)] dark:border-white/8 dark:bg-white/6 dark:shadow-none">
                      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-blue-300/70 to-transparent dark:via-blue-400/30" />
                      <TypingDots dotClassName="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-500" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              {showTypingBubble ? (
                <div className="w-full max-w-sm">
                  <div className="mb-3 flex items-center justify-center gap-3">
                    <div
                      className={`h-11 w-11 rounded-full bg-linear-to-br ${selected.gradient} flex items-center justify-center text-sm font-semibold text-white shadow-lg shadow-slate-200/60 dark:shadow-none`}
                    >
                      {selected.initials}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {typingActorLabel}
                      </p>
                      <p className="text-[12px] text-blue-500 dark:text-blue-400">
                        {typingLabel}
                      </p>
                    </div>
                  </div>
                  <div className="mx-auto w-fit rounded-[24px] rounded-bl-md border border-slate-200 bg-white px-5 py-4 dark:border-white/8 dark:bg-white/6 dark:shadow-none shadow-none">
                    <TypingDots
                      dotClassName="h-2.5 w-2.5 rounded-full bg-blue-400"
                      gapClassName="gap-2"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-2">
                  <div
                    className={`w-12 h-12 rounded-full bg-linear-to-br ${selected.gradient} flex items-center justify-center text-sm font-semibold text-white mx-auto`}
                  >
                    {selected.initials}
                  </div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {selected.name}
                  </p>
                  <p className="text-[12px] text-slate-400 dark:text-slate-600">
                    No messages yet. Say hello!
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="relative px-5 py-4 border-t border-slate-200 dark:border-white/6 bg-white dark:bg-[#070d1e] shrink-0">
          {isGroup && activeMention && filteredMentionMembers.length > 0 && (
            <div className="absolute bottom-[calc(100%-8px)] left-5 z-30">
                <div className="w-[270px] overflow-hidden rounded-2xl border border-slate-200/90 bg-white/98 p-1.5 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.45)] backdrop-blur-sm dark:border-white/10 dark:bg-[#0f172a]/98 dark:shadow-[0_18px_36px_-24px_rgba(0,0,0,0.72)]">
                  <div className="px-2.5 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                    Mention
                  </div>
                <div
                  ref={mentionListRef}
                  className="max-h-56 overflow-y-auto"
                >
                  {filteredMentionMembers.map((participant, index) => (
                    <button
                      key={participant.id}
                      data-mention-index={index}
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        insertMention(participant);
                      }}
                      className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors ${
                        activeMentionIndex === index
                          ? "bg-slate-100 dark:bg-white/8"
                          : "hover:bg-slate-50 dark:hover:bg-white/5"
                      }`}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-cyan-500 text-[10px] font-semibold text-white">
                        {participant.initials}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-medium text-slate-800 dark:text-slate-100">
                          {participant.name}
                        </p>
                        <p className="truncate text-[10px] text-slate-400 dark:text-slate-500">
                          @{participant.name.replace(/\s+/g, "")}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={FILE_INPUT_ACCEPT}
            className="hidden"
            onChange={handleFileInputChange}
          />

          <div className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/8 rounded-2xl focus-within:border-blue-400/40 dark:focus-within:border-blue-500/25 transition-colors overflow-hidden">
            {/* Selected files preview */}
            {selectedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 px-4 pt-3 pb-1">
                {selectedFiles.map((file, i) => (
                  <SelectedFileChip
                    key={`${file.name}-${file.size}-${i}`}
                    file={file}
                    onRemove={() => onRemoveFile(i)}
                  />
                ))}
                {selectedFiles.length < MAX_FILES && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 dark:border-white/15 flex items-center justify-center text-slate-400 dark:text-slate-600 hover:border-blue-400 hover:text-blue-400 transition-colors shrink-0"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {(selectedFiles.length > 0 || fileError) && (
              <div className="px-4 pt-2">
                {selectedFiles.length > 0 && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Up to 5 files per message. JPG, JPEG, PNG, PDF, DOC, DOCX,
                    XLS, XLSX, CSV, ZIP, PPT and PPTX only. Max 10 MB each.
                  </p>
                )}
                {fileError && (
                  <p className="mt-1 text-[11px] text-rose-500">{fileError}</p>
                )}
              </div>
            )}

            <textarea
              ref={textareaRef}
              placeholder="Send a message... use @ to mention someone"
              value={message}
              onChange={(e) =>
                handleComposerChange(
                  e.currentTarget.value,
                  e.currentTarget.selectionStart,
                )
              }
              onClick={(e) =>
                syncMentionState(e.currentTarget.value, e.currentTarget.selectionStart)
              }
              onSelect={(e) =>
                syncMentionState(e.currentTarget.value, e.currentTarget.selectionStart)
              }
              onKeyUp={(e) => {
                if (
                  e.key === "ArrowDown" ||
                  e.key === "ArrowUp" ||
                  e.key === "Enter" ||
                  e.key === "Tab" ||
                  e.key === "Escape"
                ) {
                  return;
                }

                syncMentionState(e.currentTarget.value, e.currentTarget.selectionStart);
              }}
              onKeyDown={(e) => {
                if (isGroup && activeMention && filteredMentionMembers.length > 0) {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setHighlightedMentionIndex((current) =>
                      Math.min(current + 1, filteredMentionMembers.length - 1),
                    );
                    return;
                  }

                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setHighlightedMentionIndex((current) =>
                      Math.max(current - 1, 0),
                    );
                    return;
                  }

                  if (e.key === "Enter" || e.key === "Tab") {
                    e.preventDefault();
                    insertMention(
                      filteredMentionMembers[activeMentionIndex] ??
                        filteredMentionMembers[0],
                    );
                    return;
                  }

                  if (e.key === "Escape") {
                    e.preventDefault();
                    setActiveMention(null);
                    return;
                  }
                }

                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSendMessage();
                }
              }}
              rows={3}
              className="w-full bg-transparent text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none resize-none px-4 pt-3.5 pb-1"
            />

            <div className="flex items-center justify-between px-3 pb-3 pt-1">
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/8 transition-colors"
                  title="Attach files"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <EmojiPickerButton
                  onSelect={(emoji) => onMessageChange(message + emoji)}
                />
              </div>

              <button
                type="button"
                onClick={onSendMessage}
                disabled={!canSend}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 dark:text-slate-200 text-[13px] font-medium transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                Send
              </button>
            </div>
          </div>
        </div>
        </div>
      </main>

      {previewImage && (
        <ImagePreviewModal
          attachment={previewImage}
          zoom={previewZoom}
          onClose={closePreviewImage}
          onZoomIn={zoomPreviewIn}
          onZoomOut={zoomPreviewOut}
        />
      )}
    </>
  );
}
