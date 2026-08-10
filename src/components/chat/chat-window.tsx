"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CornerUpLeft,
  FileText,
  ImageIcon,
  Mic,
  Paperclip,
  Pause,
  Play,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { AttachmentDisplay } from "@/components/chat/attachment-display";
import { NotificationBell } from "@/components/chat/notification-bell";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { EmojiPickerButton } from "./emoji-picker-button";
import { ImagePreviewModal } from "@/components/chat/image-preview-modal";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  participants?: Array<{
    id: number;
    name: string;
    initials: string;
    profile_pic_url?: string | null;
  }>;
  onlineParticipantNames?: string[];
  onlineParticipants?: Array<{
    id: number;
    name: string;
    initials: string;
    profile_pic_url?: string | null;
  }>;
  profile_pic_url?: string | null;
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
  isPending?: boolean;
  uploadProgress?: number;
  replyTo?: {
    uuid: string;
    senderName: string;
    content: string | null;
    attachmentType: string | null;
  } | null;
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
  replyToMessage?: ChatMessage | null;
  onMessageChange: (value: string) => void;
  onSendMessage: () => void;
  onFileSelect: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  onSendVoiceMessage?: (file: File) => void;
  onReply?: (message: ChatMessage) => void;
  onCancelReply?: () => void;
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
  "audio/mpeg",
  "audio/wav",
];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES];
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const MAX_FILES = 5;
const FILE_INPUT_ACCEPT =
  ".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx,.csv,.zip,.ppt,.pptx,.mp3,.wav,image/jpeg,image/png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,application/zip,application/x-zip-compressed,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,audio/mpeg,audio/wav";

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
  profile_pic_url?: string | null;
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
    <div className="w-[300px] max-h-[380px] overflow-y-auto pr-1 pl-0.5 py-0.5 custom-scrollbar">
      <div className="mb-2.5 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
        Members ({participants.length})
      </div>
      <div className="grid grid-cols-4 gap-x-2 gap-y-3.5">
        {participants.map((item, itemIndex) => {
          const itemGradient =
            GROUP_AVATAR_GRADIENTS[itemIndex % GROUP_AVATAR_GRADIENTS.length];
          const [firstName = "", secondName = ""] = item.name.split(" ");

          return (
            <div
              key={item.id}
              className="flex flex-col items-center text-center group/member cursor-pointer"
            >
              {item.profile_pic_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.profile_pic_url}
                  alt={item.name}
                  title={item.name}
                  className="h-10 w-10 rounded-full object-cover shadow-xs group-hover/member:scale-105 transition-transform"
                />
              ) : (
                <div
                  title={item.name}
                  className={`flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br ${itemGradient} text-[11px] font-semibold text-white shadow-xs group-hover/member:scale-105 transition-transform`}
                >
                  {item.initials}
                </div>
              )}
              <div className="mt-1.5 w-full text-[10.5px] leading-tight text-slate-700 dark:text-slate-200 font-medium">
                <div className="truncate px-0.5">{firstName}</div>
                {secondName && <div className="truncate px-0.5">{secondName}</div>}
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
  const visibleParticipants = participants.slice(0, 3);
  const extraCount = participants.length - visibleParticipants.length;

  if (participants.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center pl-3">
      <Popover>
        <PopoverTrigger asChild>
          <div className="flex items-center cursor-pointer group/cluster">
            {visibleParticipants.map((participant, index) => {
              const gradient =
                GROUP_AVATAR_GRADIENTS[index % GROUP_AVATAR_GRADIENTS.length];

              return (
                <div
                  key={participant.id}
                  className="relative transition-transform group-hover/cluster:-translate-y-0.5"
                  style={{
                    marginLeft: index === 0 ? 0 : -10,
                    zIndex: visibleParticipants.length - index,
                  }}
                >
                  <div
                    className={`h-8 w-8 rounded-full border border-white/80 dark:border-white/10 shadow-[0_12px_24px_-16px_rgba(15,23,42,0.38)] dark:shadow-[0_10px_24px_-18px_rgba(15,23,42,0.85)] overflow-hidden ${participant.profile_pic_url ? "" : `flex items-center justify-center bg-linear-to-br ${gradient} text-[11px] font-semibold text-white`}`}
                  >
                    {participant.profile_pic_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={participant.profile_pic_url}
                        alt={participant.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      participant.initials
                    )}
                  </div>
                </div>
              );
            })}

            {extraCount > 0 && (
              <div
                className="relative transition-transform group-hover/cluster:-translate-y-0.5"
                style={{ marginLeft: visibleParticipants.length > 0 ? -10 : 0 }}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-200 text-[11px] font-semibold text-slate-700 dark:border-white/10 dark:bg-[#202b4a] dark:text-slate-200">
                  +{extraCount}
                </div>
              </div>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent
          side="bottom"
          align="end"
          sideOffset={10}
          className="w-[320px] pt-3 pb-3 pl-3 pr-1.5 rounded-[24px] border border-slate-200/80 bg-white/95 dark:bg-[#1f2c34]/98 backdrop-blur-md shadow-[0_16px_40px_-10px_rgba(0,0,0,0.35)] dark:border-white/10 dark:shadow-[0_16px_40px_-10px_rgba(0,0,0,0.7)] z-50 animate-in fade-in-0 zoom-in-95 duration-150 overflow-hidden"
        >
          <MemberPopoverContent participants={participants} />
        </PopoverContent>
      </Popover>
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
      errors.push(`"${file.name}" is larger than 50 MB`);
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

  return parts.flatMap((part, index) => {
    if (!part) return [];

    if (!URL_REGEX.test(part)) {
      URL_REGEX.lastIndex = 0;
      const lines = part.split("\n");
      return lines.flatMap((line, lineIndex) => {
        const nodes: React.ReactElement[] = [
          <span key={`${keyPrefix}-text-${index}-${lineIndex}`}>{line}</span>,
        ];
        if (lineIndex < lines.length - 1) {
          nodes.push(<br key={`${keyPrefix}-br-${index}-${lineIndex}`} />);
        }
        return nodes;
      });
    }

    URL_REGEX.lastIndex = 0;

    return [
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
      </a>,
    ];
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

  const names = [
    ...new Set(participants.map((participant) => participant.name)),
  ].sort((a, b) => b.length - a.length);

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

function findActiveMention(
  value: string,
  caretIndex: number,
): ActiveMention | null {
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

// ─── upload progress ─────────────────────────────────────────────────────────

const RING_R = 21;
const RING_CIRC = 2 * Math.PI * RING_R;

function CircularUploadProgress({
  progress,
  size = "md",
}: {
  progress: number;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? 44 : 56;
  const c = dim / 2;
  const r = size === "sm" ? 16 : RING_R;
  const circ = size === "sm" ? 2 * Math.PI * 16 : RING_CIRC;
  const sw = size === "sm" ? 2.5 : 2.8;
  const isIdle = progress <= 0;
  const offset = circ - (progress / 100) * circ;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: dim, height: dim }}
    >
      <svg
        width={dim}
        height={dim}
        viewBox={`0 0 ${dim} ${dim}`}
        className="absolute"
        aria-hidden
      >
        {/* Track */}
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.28)"
          strokeWidth={sw}
        />
        {isIdle ? (
          /* Indeterminate spinning arc */
          <motion.g
            animate={{ rotate: 360 }}
            transition={{ duration: 0.85, repeat: Infinity, ease: "linear" }}
            style={{ originX: `${c}px`, originY: `${c}px` }}
          >
            <circle
              cx={c}
              cy={c}
              r={r}
              fill="none"
              stroke="white"
              strokeWidth={sw}
              strokeLinecap="round"
              strokeDasharray={`${circ * 0.22} ${circ * 0.78}`}
              transform={`rotate(-90 ${c} ${c})`}
            />
          </motion.g>
        ) : (
          /* Determinate fill */
          <motion.circle
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke="white"
            strokeWidth={sw}
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: offset }}
            transition={{ ease: "linear", duration: 0.15 }}
            transform={`rotate(-90 ${c} ${c})`}
          />
        )}
      </svg>
      {!isIdle && (
        <span className="relative text-[10px] font-bold text-white tabular-nums leading-none drop-shadow-sm">
          {progress}%
        </span>
      )}
    </div>
  );
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

function DragDropOverlay({ files }: { files: File[] }) {
  const previewFile = files[0] ?? null;
  const isImage = previewFile
    ? ALLOWED_IMAGE_TYPES.includes(previewFile.type)
    : false;
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
                <ImageIcon
                  className="h-11 w-11 text-slate-700"
                  strokeWidth={1.8}
                />
              ) : (
                <FileText
                  className="h-11 w-11 text-slate-700"
                  strokeWidth={1.8}
                />
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

// ─── voice recording bar ─────────────────────────────────────────────────────

function RecordingBar({
  recordingState,
  seconds,
  barHeights,
  onCancel,
  onTogglePause,
  onSend,
}: {
  recordingState: "recording" | "paused";
  seconds: number;
  barHeights: number[];
  onCancel: () => void;
  onTogglePause: () => void;
  onSend: () => void;
}) {
  function fmt(secs: number) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 dark:border-white/8 dark:bg-white/5">
      {/* Cancel */}
      <button
        type="button"
        onClick={onCancel}
        className="shrink-0 text-slate-400 transition-colors hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      {/* Status + timer */}
      <div className="flex shrink-0 items-center gap-2">
        {recordingState === "recording" ? (
          <motion.span
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
            className="h-2 w-2 rounded-full bg-rose-500"
          />
        ) : (
          <button
            type="button"
            onClick={onTogglePause}
            className="text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
          </button>
        )}
        <span className="min-w-[28px] text-[12px] font-medium tabular-nums text-slate-600 dark:text-slate-300">
          {fmt(seconds)}
        </span>
      </div>

      {/* Waveform */}
      <div className="flex h-8 flex-1 items-end gap-[2px] overflow-hidden">
        {barHeights.map((h, i) => (
          <div
            key={i}
            style={{ height: `${Math.round(Math.max(8, h * 92))}%` }}
            className={`flex-1 rounded-full ${
              recordingState === "recording" && i === barHeights.length - 1
                ? "bg-blue-500"
                : "bg-slate-300 dark:bg-slate-600"
            }`}
          />
        ))}
      </div>

      {/* Pause / Resume */}
      <button
        type="button"
        onClick={onTogglePause}
        className="shrink-0 text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"
      >
        {recordingState === "recording" ? (
          <Pause className="h-4 w-4 fill-current" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </button>

      {/* Send */}
      <button
        type="button"
        onClick={onSend}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white shadow-[0_4px_14px_rgba(59,130,246,0.4)] transition-colors hover:bg-blue-400"
      >
        <Send className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── attach menu ──────────────────────────────────────────────────────────────

// ─── attach menu ──────────────────────────────────────────────────────────────

const ATTACH_ITEMS = [
  {
    label: "Document",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="w-5.5 h-5.5 text-[#7f66ff]"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    label: "Photos & videos",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="w-5.5 h-5.5 text-[#1e90ff]"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    ),
  },
  {
    label: "Audio",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="w-5.5 h-5.5 text-[#ff7f50]"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
      </svg>
    ),
  },
];

function AttachMenu({
  onDocument,
  onPhotos,
  onAudio,
}: {
  onDocument: () => void;
  onPhotos: () => void;
  onAudio: () => void;
}) {
  const [open, setOpen] = useState(false);

  const handlers = [
    () => {
      onDocument();
      setOpen(false);
    },
    () => {
      onPhotos();
      setOpen(false);
    },
    () => {
      onAudio();
      setOpen(false);
    },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Attach"
          className="w-8 h-8 flex items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--surface-hover)] transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={14}
        className="w-[240px] p-2.5 rounded-[24px] border border-slate-200/80 bg-white/95 dark:bg-[#1f2c34]/98 backdrop-blur-md shadow-[0_16px_40px_-10px_rgba(0,0,0,0.35)] dark:border-white/10 dark:shadow-[0_16px_40px_-10px_rgba(0,0,0,0.7)] z-50 animate-in fade-in-0 zoom-in-95 duration-150"
      >
        <div className="flex flex-col gap-1">
          {ATTACH_ITEMS.map((item, i) => (
            <button
              key={i}
              type="button"
              onClick={handlers[i]}
              className="flex w-full items-center gap-4 px-3.5 py-3 text-left rounded-[16px] transition-all hover:bg-slate-100 dark:hover:bg-white/8 active:scale-[0.98]"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100/80 dark:bg-white/5">
                {item.icon}
              </div>
              <span className="text-[15px] font-medium text-slate-800 dark:text-[#e9edef]">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
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
  replyToMessage,
  onMessageChange,
  onSendMessage,
  onFileSelect,
  onRemoveFile,
  onSendVoiceMessage,
  onReply,
  onCancelReply,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionListRef = useRef<HTMLDivElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [showProfilePreview, setShowProfilePreview] = useState(false);
  const [highlightedUuid, setHighlightedUuid] = useState<string | null>(null);

  const messagesByUuid = useMemo(
    () => new Map(messages.map((m) => [m.uuid, m])),
    [messages],
  );
  const [previewImage, setPreviewImage] = useState<MessageAttachment | null>(
    null,
  );
  const [previewZoom, setPreviewZoom] = useState(1);
  const [activeMention, setActiveMention] = useState<ActiveMention | null>(
    null,
  );
  const [highlightedMentionIndex, setHighlightedMentionIndex] = useState(0);
  const [draggedFiles, setDraggedFiles] = useState<File[]>([]);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const pendingSelectionRef = useRef<number | null>(null);
  const dragDepthRef = useRef(0);

  // ── voice recording ────────────────────────────────────────────────────────
  type RecordingState = "idle" | "recording" | "paused";
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [liveBarHeights, setLiveBarHeights] = useState<number[]>(
    Array(48).fill(0.05),
  );
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waveformSamplerRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const waveformHistoryRef = useRef<number[]>(Array(48).fill(0.05));
  const pendingSendRef = useRef(false);

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

  function scrollToMessage(uuid: string) {
    const el = document.querySelector(`[data-message-uuid="${uuid}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedUuid(uuid);
    setTimeout(() => setHighlightedUuid(null), 1500);
  }

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

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, [message]);

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

  // ── recording helpers ─────────────────────────────────────────────────────

  function stopRecordingTimers() {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (waveformSamplerRef.current) {
      clearInterval(waveformSamplerRef.current);
      waveformSamplerRef.current = null;
    }
  }

  function startWaveformSampling() {
    waveformSamplerRef.current = setInterval(() => {
      if (!analyserRef.current) return;
      const data = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteTimeDomainData(data);
      let sumSq = 0;
      for (const v of data) {
        const n = (v - 128) / 128;
        sumSq += n * n;
      }
      const amplitude = Math.min(
        0.95,
        0.05 + Math.sqrt(sumSq / data.length) * 4,
      );
      waveformHistoryRef.current = [
        ...waveformHistoryRef.current.slice(1),
        amplitude,
      ];
      setLiveBarHeights([...waveformHistoryRef.current]);
    }, 100);
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const AudioCtxClass =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const audioCtx = new AudioCtxClass();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
            ? "audio/ogg;codecs=opus"
            : "audio/mp4";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      recordingChunksRef.current = [];
      waveformHistoryRef.current = Array(48).fill(0.05);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordingChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const mt = recorder.mimeType;
        const blob = new Blob(recordingChunksRef.current, { type: mt });
        if (pendingSendRef.current) {
          const ext = mt.includes("webm")
            ? "webm"
            : mt.includes("ogg")
              ? "ogg"
              : "mp4";
          const file = new File([blob], `voice-${Date.now()}.${ext}`, {
            type: mt.split(";")[0],
          });
          onSendVoiceMessage?.(file);
        }
        pendingSendRef.current = false;
        audioContextRef.current?.close();
        audioContextRef.current = null;
        analyserRef.current = null;
        mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      };

      recorder.start(100);
      setRecordingState("recording");
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(
        () => setRecordingSeconds((s) => s + 1),
        1000,
      );
      startWaveformSampling();
    } catch {
      setFileError(
        "Microphone access was denied. Please allow mic access to record audio.",
      );
    }
  }

  function cancelRecording() {
    pendingSendRef.current = false;
    stopRecordingTimers();
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    mediaRecorderRef.current = null;
    setRecordingState("idle");
    setRecordingSeconds(0);
    waveformHistoryRef.current = Array(48).fill(0.05);
    setLiveBarHeights(Array(48).fill(0.05));
  }

  function toggleRecordingPause() {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    if (recordingState === "recording") {
      recorder.pause();
      stopRecordingTimers();
      setRecordingState("paused");
    } else if (recordingState === "paused") {
      recorder.resume();
      setRecordingState("recording");
      recordingTimerRef.current = setInterval(
        () => setRecordingSeconds((s) => s + 1),
        1000,
      );
      startWaveformSampling();
    }
  }

  function sendRecording() {
    pendingSendRef.current = true;
    stopRecordingTimers();
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    else pendingSendRef.current = false;
    mediaRecorderRef.current = null;
    setRecordingState("idle");
    setRecordingSeconds(0);
    waveformHistoryRef.current = Array(48).fill(0.05);
    setLiveBarHeights(Array(48).fill(0.05));
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
          <div className="flex items-center justify-between px-4 h-[60px] border-b border-[var(--border-color)] bg-[var(--sidebar-header)] shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                {!isGroup && selected.profile_pic_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selected.profile_pic_url}
                    alt={selected.name}
                    onClick={() => setShowProfilePreview(true)}
                    className="w-9 h-9 rounded-full object-cover cursor-pointer transition-opacity hover:opacity-85"
                  />
                ) : (
                  <div
                    className={`w-9 h-9 rounded-full bg-linear-to-br ${selected.gradient} flex items-center justify-center text-[11px] font-semibold text-white`}
                  >
                    {selected.initials}
                  </div>
                )}
                {!isGroup && selected.online && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[var(--online)] rounded-full border-2 border-[var(--sidebar-header)]" />
                )}
              </div>
              <div>
                <p className="text-[15px] font-semibold text-[var(--text-primary)] leading-none">
                  {selected.name}
                </p>
                <div className="mt-0.5 flex items-center gap-2">
                  {isGroup ? (
                    <p className="text-[12px] text-[var(--text-muted)] truncate max-w-[520px]">
                      {activeParticipantLabel || "No active users"}
                    </p>
                  ) : (
                    <p
                      className={`text-[12px] transition-colors ${
                        isPeerTyping
                          ? "text-[var(--accent)] italic"
                          : "text-[var(--text-muted)]"
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
                  <GroupParticipantsCluster
                    participants={selected.participants ?? []}
                  />
                  <NotificationBell />
                  <AnimatedThemeToggler
                    variant="circle"
                    duration={500}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.65)] transition-colors hover:bg-slate-50 dark:border-white/8 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 [&_svg]:h-4.5 [&_svg]:w-4.5"
                  />
                </>
              ) : (
                <>
                  <NotificationBell />
                  <AnimatedThemeToggler
                    variant="circle"
                    duration={500}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.65)] transition-colors hover:bg-slate-50 dark:border-white/8 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 [&_svg]:h-4.5 [&_svg]:w-4.5"
                  />
                </>
              )}
            </div>
          </div>

          {/* Messages + Floating Input overlay */}
          <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden">
            {/* Scrollable Messages Area */}
            <div className="flex-1 overflow-y-auto px-6 pt-4 pb-20 ">
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
                            data-message-uuid={chatMessage.uuid}
                            className={`group/msg flex flex-col rounded-xl transition-colors duration-75 ${chatMessage.isOwnMessage ? "items-end" : "items-start"} ${highlightedUuid === chatMessage.uuid ? "bg-blue-500/10 dark:bg-blue-400/10" : ""}`}
                          >
                            {chatMessage.attachments.some(
                              (attachment) =>
                                attachment.attachmentType === "IMAGE",
                            ) && (
                              <div className="relative mb-1.5">
                                <AttachmentDisplay
                                  attachments={chatMessage.attachments.filter(
                                    (attachment) =>
                                      attachment.attachmentType === "IMAGE",
                                  )}
                                  isOwn={chatMessage.isOwnMessage}
                                  imageClassName={
                                    chatMessage.isOwnMessage
                                      ? "justify-end"
                                      : "justify-start"
                                  }
                                  onPreviewImage={
                                    chatMessage.isPending
                                      ? undefined
                                      : openPreviewImage
                                  }
                                />
                                {chatMessage.isPending && (
                                  <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center rounded-xl bg-black/48">
                                    <CircularUploadProgress
                                      progress={chatMessage.uploadProgress ?? 0}
                                    />
                                  </div>
                                )}
                                {!chatMessage.isOwnMessage && (
                                  <button
                                    type="button"
                                    onClick={() => onReply?.(chatMessage)}
                                    className="absolute left-full top-1/2 -translate-y-1/2 ml-3 flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-[#1e2a3a] border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 opacity-0 group-hover/msg:opacity-100 transition-all duration-150 hover:scale-110"
                                    aria-label="Reply"
                                  >
                                    <CornerUpLeft className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            )}

                            {chatMessage.attachments.some(
                              (attachment) =>
                                attachment.mimeType === "application/pdf",
                            ) && (
                              <div className="relative mb-1.5">
                                <AttachmentDisplay
                                  attachments={chatMessage.attachments.filter(
                                    (attachment) =>
                                      attachment.mimeType === "application/pdf",
                                  )}
                                  isOwn={chatMessage.isOwnMessage}
                                />
                                {chatMessage.isPending && (
                                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-black/35">
                                    <CircularUploadProgress
                                      progress={chatMessage.uploadProgress ?? 0}
                                      size="sm"
                                    />
                                  </div>
                                )}
                              </div>
                            )}

                            {chatMessage.attachments.some((a) =>
                              a.mimeType.startsWith("audio/"),
                            ) && (
                              <div className="relative mb-1.5">
                                <AttachmentDisplay
                                  attachments={chatMessage.attachments.filter(
                                    (a) => a.mimeType.startsWith("audio/"),
                                  )}
                                  isOwn={chatMessage.isOwnMessage}
                                  senderProfilePicUrl={
                                    chatMessage.isOwnMessage
                                      ? (groupMembers.find(
                                          (m) =>
                                            m.name === chatMessage.senderName,
                                        )?.profile_pic_url ?? null)
                                      : isGroup
                                        ? (groupMembers.find(
                                            (m) =>
                                              m.name === chatMessage.senderName,
                                          )?.profile_pic_url ?? null)
                                        : (selected.profile_pic_url ?? null)
                                  }
                                  senderInitials={
                                    chatMessage.isOwnMessage
                                      ? (groupMembers.find(
                                          (m) =>
                                            m.name === chatMessage.senderName,
                                        )?.initials ??
                                        chatMessage.senderName
                                          .charAt(0)
                                          .toUpperCase())
                                      : isGroup
                                        ? (groupMembers.find(
                                            (m) =>
                                              m.name === chatMessage.senderName,
                                          )?.initials ??
                                          chatMessage.senderName
                                            .charAt(0)
                                            .toUpperCase())
                                        : selected.initials
                                  }
                                  createdAt={chatMessage.createdAt}
                                />
                                {/* Received: reply button only — download is now inside each player card */}
                                {!chatMessage.isOwnMessage && (
                                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 flex flex-row gap-1.5 opacity-0 group-hover/msg:opacity-100 transition-all duration-150">
                                    <button
                                      type="button"
                                      onClick={() => onReply?.(chatMessage)}
                                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-[#1e2a3a] border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:scale-110 transition-transform"
                                      aria-label="Reply"
                                    >
                                      <CornerUpLeft className="h-4 w-4" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {(chatMessage.replyTo ||
                              chatMessage.content ||
                              chatMessage.attachments.some(
                                (attachment) =>
                                  attachment.attachmentType !== "IMAGE" &&
                                  attachment.mimeType !== "application/pdf" &&
                                  !attachment.mimeType.startsWith("audio/"),
                              )) && (
                              <div
                                className={`relative max-w-[75%] px-3.5 py-2 ${
                                  chatMessage.isOwnMessage
                                    ? "rounded-xl rounded-tr-sm bg-[var(--message-out)] text-[var(--text-primary)]"
                                    : "rounded-xl rounded-tl-sm bg-[var(--message-in)] text-[var(--text-primary)] border border-[var(--border-color)]"
                                }`}
                              >
                                {!chatMessage.isOwnMessage && (
                                  <p className="text-[11px] font-medium mb-1 text-slate-500 dark:text-slate-400">
                                    {chatMessage.senderName}
                                  </p>
                                )}
                                {chatMessage.replyTo &&
                                  !chatMessage.isPending && (
                                    <div
                                      onClick={() =>
                                        scrollToMessage(
                                          chatMessage.replyTo!.uuid,
                                        )
                                      }
                                      className={`mb-2 flex gap-2 overflow-hidden rounded-xl px-2.5 py-2 cursor-pointer active:opacity-70 transition-opacity ${
                                        chatMessage.isOwnMessage
                                          ? "bg-white/15 hover:bg-white/20"
                                          : "bg-slate-100 dark:bg-white/6 hover:bg-slate-200 dark:hover:bg-white/10"
                                      }`}
                                    >
                                      <div
                                        className={`w-0.5 shrink-0 rounded-full ${chatMessage.isOwnMessage ? "bg-white/60" : "bg-blue-400"}`}
                                      />
                                      <div className="min-w-0 flex-1">
                                        <p
                                          className={`text-[11px] font-semibold ${chatMessage.isOwnMessage ? "text-white/90" : "text-blue-500 dark:text-blue-400"}`}
                                        >
                                          {chatMessage.replyTo.senderName}
                                        </p>
                                        {chatMessage.replyTo.attachmentType ===
                                        "IMAGE" ? (
                                          <div className="flex items-center justify-between gap-2 w-full">
                                            <p
                                              className={`flex items-center gap-1 text-[11px] ${chatMessage.isOwnMessage ? "text-white/65" : "text-slate-500 dark:text-slate-400"}`}
                                            >
                                              <ImageIcon className="h-3 w-3" />{" "}
                                              Photo
                                            </p>
                                            {(() => {
                                              const thumb = messagesByUuid
                                                .get(chatMessage.replyTo!.uuid)
                                                ?.attachments.find(
                                                  (a) =>
                                                    a.attachmentType ===
                                                    "IMAGE",
                                                )?.url;
                                              return thumb ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                  src={thumb}
                                                  alt=""
                                                  className="h-10 w-10 rounded-md object-cover shrink-0"
                                                />
                                              ) : null;
                                            })()}
                                          </div>
                                        ) : chatMessage.replyTo
                                            .attachmentType === "FILE" ? (
                                          <p
                                            className={`flex items-center gap-1 text-[11px] ${chatMessage.isOwnMessage ? "text-white/65" : "text-slate-500 dark:text-slate-400"}`}
                                          >
                                            <FileText className="h-3 w-3" />{" "}
                                            File
                                          </p>
                                        ) : chatMessage.replyTo
                                            .attachmentType === "AUDIO" ? (
                                          <p
                                            className={`flex items-center gap-1 text-[11px] ${chatMessage.isOwnMessage ? "text-white/65" : "text-slate-500 dark:text-slate-400"}`}
                                          >
                                            <Mic className="h-3 w-3" /> Voice
                                            message
                                          </p>
                                        ) : (
                                          <p
                                            className={`truncate text-[11px] ${chatMessage.isOwnMessage ? "text-white/65" : "text-slate-500 dark:text-slate-400"}`}
                                          >
                                            {chatMessage.replyTo.content}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                <AttachmentDisplay
                                  attachments={chatMessage.attachments.filter(
                                    (attachment) =>
                                      attachment.attachmentType !== "IMAGE" &&
                                      attachment.mimeType !==
                                        "application/pdf" &&
                                      !attachment.mimeType.startsWith("audio/"),
                                  )}
                                  isOwn={chatMessage.isOwnMessage}
                                />
                                {chatMessage.content && (
                                  <p
                                    className={`text-sm leading-relaxed ${
                                      chatMessage.attachments.some(
                                        (attachment) =>
                                          attachment.attachmentType !==
                                            "IMAGE" &&
                                          attachment.mimeType !==
                                            "application/pdf",
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
                                {!chatMessage.isOwnMessage && (
                                  <button
                                    type="button"
                                    onClick={() => onReply?.(chatMessage)}
                                    className="absolute left-full top-1/2 -translate-y-1/2 ml-3 flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-[#1e2a3a] border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 opacity-0 group-hover/msg:opacity-100 transition-all duration-150 hover:scale-110"
                                    aria-label="Reply"
                                  >
                                    <CornerUpLeft className="h-4 w-4" />
                                  </button>
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
                                      ? "rounded-xl rounded-tr-sm bg-blue-500/12 text-blue-700 dark:text-blue-200"
                                      : "rounded-xl rounded-tl-sm bg-slate-100 text-slate-500 dark:bg-white/6 dark:text-slate-400 border border-slate-200 dark:border-white/8"
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
                                {chatMessage.isPending
                                  ? "Uploading…"
                                  : formatMessageTime(chatMessage.createdAt)}
                              </span>
                              {chatMessage.uuid === lastReadOwnMessageUuid && (
                                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                  · Seen
                                </span>
                              )}
                              {/* Tooltip */}
                              <div
                                className={`pointer-events-none absolute bottom-full mb-2 z-50 opacity-0 transition-opacity duration-150 ${chatMessage.isPending ? "" : "group-hover/ts:opacity-100"} ${chatMessage.isOwnMessage ? "right-0" : "left-0"}`}
                              >
                                <div className="rounded-xl bg-slate-900 dark:bg-slate-800 px-3 py-2 shadow-lg whitespace-nowrap">
                                  <p className="text-[11px] text-slate-300">
                                    <span className="text-slate-500 mr-1">
                                      Sent at
                                    </span>
                                    {formatFullDateTime(chatMessage.createdAt)}
                                  </p>
                                  {chatMessage.uuid ===
                                    lastReadOwnMessageUuid && (
                                    <p className="text-[11px] text-slate-300 mt-0.5">
                                      <span className="text-slate-500 mr-1">
                                        Seen at
                                      </span>
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
                        {!isGroup && selected.profile_pic_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={selected.profile_pic_url}
                            alt={selected.name}
                            className="h-11 w-11 rounded-full object-cover shadow-lg shadow-slate-200/60 dark:shadow-none"
                          />
                        ) : (
                          <div
                            className={`h-11 w-11 rounded-full bg-linear-to-br ${selected.gradient} flex items-center justify-center text-sm font-semibold text-white shadow-lg shadow-slate-200/60 dark:shadow-none`}
                          >
                            {selected.initials}
                          </div>
                        )}
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
                      {!isGroup && selected.profile_pic_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={selected.profile_pic_url}
                          alt={selected.name}
                          className="w-12 h-12 rounded-full object-cover mx-auto"
                        />
                      ) : (
                        <div
                          className={`w-12 h-12 rounded-full bg-linear-to-br ${selected.gradient} flex items-center justify-center text-sm font-semibold text-white mx-auto`}
                        >
                          {selected.initials}
                        </div>
                      )}
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
            <div className="absolute bottom-[10px] left-[10px] right-[10px] z-20 bg-transparent">
              {isGroup &&
                activeMention &&
                filteredMentionMembers.length > 0 && (
                  <div className="absolute bottom-[calc(100%-8px)] left-5 z-30">
                    <div className="w-[270px] overflow-hidden rounded-xl border border-slate-200/90 bg-white/98 p-1.5 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.45)] backdrop-blur-sm dark:border-white/10 dark:bg-[#1f2c34]/98 dark:shadow-[0_18px_36px_-24px_rgba(0,0,0,0.72)]">
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
                            {participant.profile_pic_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={participant.profile_pic_url}
                                alt={participant.name}
                                className="h-8 w-8 shrink-0 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-cyan-500 text-[10px] font-semibold text-white">
                                {participant.initials}
                              </div>
                            )}
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

              {/* Hidden file inputs */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={FILE_INPUT_ACCEPT}
                className="hidden"
                onChange={handleFileInputChange}
              />
              <input
                id="img-input"
                type="file"
                multiple
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={handleFileInputChange}
              />
              <input
                id="doc-audio-input"
                type="file"
                multiple
                accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,application/zip,application/x-zip-compressed,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,audio/mpeg,audio/wav"
                className="hidden"
                onChange={handleFileInputChange}
              />

              {recordingState !== "idle" ? (
                <RecordingBar
                  recordingState={recordingState}
                  seconds={recordingSeconds}
                  barHeights={liveBarHeights}
                  onCancel={cancelRecording}
                  onTogglePause={toggleRecordingPause}
                  onSend={sendRecording}
                />
              ) : (
                <div className="bg-transparent border-0 overflow-hidden">
                  {replyToMessage && (
                    <div className="flex items-center gap-3 px-3.5 py-2.5 border-b border-slate-200 dark:border-white/8">
                      <div className="w-[3px] self-stretch shrink-0 rounded-full bg-blue-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-blue-500 dark:text-blue-400 leading-none mb-1">
                          {replyToMessage.senderName}
                        </p>
                        {replyToMessage.attachments[0]?.mimeType.startsWith(
                          "audio/",
                        ) ? (
                          <p className="flex items-center gap-1 text-[11px] text-emerald-500 dark:text-emerald-400">
                            <Mic className="h-3 w-3" /> Voice message
                          </p>
                        ) : replyToMessage.attachments[0]?.mimeType.startsWith(
                            "image/",
                          ) ? (
                          <p className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                            <ImageIcon className="h-3 w-3" /> Image
                          </p>
                        ) : replyToMessage.attachments.length > 0 ? (
                          <p className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                            <FileText className="h-3 w-3" /> File
                          </p>
                        ) : (
                          <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                            {replyToMessage.content}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={onCancelReply}
                        aria-label="Cancel reply"
                        className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-white/20 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
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
                          Up to 5 files per message. JPG, JPEG, PNG, PDF, DOC,
                          DOCX, XLS, XLSX, CSV, ZIP, PPT, PPTX, MP3 and WAV
                          only. Max 50 MB each.
                        </p>
                      )}
                      {fileError && (
                        <p className="mt-1 text-[11px] text-rose-500">
                          {fileError}
                        </p>
                      )}
                    </div>
                  )}

                  {/* WhatsApp Pill Input Bar */}
                  <div className="flex items-center gap-1.5 px-3 py-1.5 min-h-[52px] max-h-[220px] rounded-[24px] bg-white dark:bg-[#202c33] border border-slate-200/90 dark:border-white/10 shadow-xs focus-within:border-emerald-500/50 dark:focus-within:border-emerald-500/50 transition-all">
                    {/* Plus / Attach */}
                    <div className="flex items-center self-center shrink-0">
                      <AttachMenu
                        onDocument={() =>
                          document.getElementById("doc-audio-input")?.click()
                        }
                        onPhotos={() =>
                          document.getElementById("img-input")?.click()
                        }
                        onAudio={() =>
                          document.getElementById("doc-audio-input")?.click()
                        }
                      />
                    </div>

                    {/* Emoji Picker */}
                    <div className="flex items-center self-center shrink-0">
                      <EmojiPickerButton
                        onSelect={(emoji) => onMessageChange(message + emoji)}
                      />
                    </div>

                    {/* Textarea for Multi-line Auto Expand */}
                    <textarea
                      ref={textareaRef}
                      placeholder="Type a message"
                      value={message}
                      rows={1}
                      onChange={(e) => {
                        handleComposerChange(
                          e.currentTarget.value,
                          e.currentTarget.selectionStart ?? 0,
                        );
                        // Auto resize height up to 180px
                        e.currentTarget.style.height = "auto";
                        e.currentTarget.style.height = `${Math.min(e.currentTarget.scrollHeight, 180)}px`;
                      }}
                      onClick={(e) =>
                        syncMentionState(
                          e.currentTarget.value,
                          e.currentTarget.selectionStart ?? 0,
                        )
                      }
                      onSelect={(e) =>
                        syncMentionState(
                          e.currentTarget.value,
                          e.currentTarget.selectionStart ?? 0,
                        )
                      }
                      onKeyDown={(e) => {
                        if (
                          isGroup &&
                          activeMention &&
                          filteredMentionMembers.length > 0
                        ) {
                          if (e.key === "ArrowDown") {
                            e.preventDefault();
                            setHighlightedMentionIndex((current) =>
                              Math.min(
                                current + 1,
                                filteredMentionMembers.length - 1,
                              ),
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

                          if (
                            (e.key === "Enter" && !e.shiftKey) ||
                            e.key === "Tab"
                          ) {
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
                      style={{ height: "auto" }}
                      className="flex-1 bg-transparent text-[14.5px] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none px-2 py-2.5 resize-none max-h-[180px] leading-normal overflow-y-auto custom-scrollbar my-auto"
                    />

                    {/* Right Action: Send OR Mic button */}
                    <div className="flex items-center self-center shrink-0">
                      {message.trim().length > 0 || selectedFiles.length > 0 ? (
                        <button
                          type="button"
                          onClick={onSendMessage}
                          disabled={!canSend}
                          title="Send message"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white hover:bg-[#008f70] transition-colors shadow-xs"
                        >
                          <Send className="w-4 h-4 translate-x-0.5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void startRecording()}
                          title="Record voice message"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                        >
                          <Mic className="h-5 w-5 stroke-[2]" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
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

      {showProfilePreview && !isGroup && selected.profile_pic_url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setShowProfilePreview(false)}
          role="presentation"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={selected.profile_pic_url}
            alt={selected.name}
            onClick={(e) => e.stopPropagation()}
            className="h-64 w-64 rounded-full object-cover shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
          />
        </div>
      )}
    </>
  );
}
