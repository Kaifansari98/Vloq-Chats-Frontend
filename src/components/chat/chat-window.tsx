"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { motion } from "framer-motion"
import {
  FileText,
  MoreHorizontal,
  Paperclip,
  Phone,
  Send,
  Video,
  X,
  FileSpreadsheet,
  FileArchive,
  Presentation,
} from "lucide-react"
import type { MessageAttachment } from "@/hooks/use-direct-messages"

// ─── types ────────────────────────────────────────────────────────────────────

export type ChatConversation = {
  id: string
  memberId: number
  name: string
  initials: string
  lastMessage: string
  time: string
  unread: number
  latestActivityAt: number
  online: boolean
  isTyping: boolean
  gradient: string
}

export type ChatMessage = {
  uuid: string
  content: string | null
  senderName: string
  isOwnMessage: boolean
  createdAt: string
  status: "sent" | "read"
  attachments: MessageAttachment[]
}

type ChatWindowProps = {
  selected: ChatConversation
  message: string
  messages: ChatMessage[]
  selectedFiles: File[]
  isLoadingMessages?: boolean
  isSendingMessage?: boolean
  isPeerTyping?: boolean
  onMessageChange: (value: string) => void
  onSendMessage: () => void
  onFileSelect: (files: File[]) => void
  onRemoveFile: (index: number) => void
}

// ─── allowed file types ───────────────────────────────────────────────────────

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png"]
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
]
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES]
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
const MAX_FILES = 5
const FILE_INPUT_ACCEPT =
  ".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx,.csv,.zip,.ppt,.pptx,image/jpeg,image/png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,application/zip,application/x-zip-compressed,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"

// ─── helpers ──────────────────────────────────────────────────────────────────

type MessageGroup = {
  dayKey: string
  dayLabel: string
  messages: ChatMessage[]
}

function dayKey(dateString: string) {
  const d = new Date(dateString)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function formatDayLabel(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const todayKey = dayKey(now.toISOString())
  const msgKey = dayKey(dateString)

  if (msgKey === todayKey) return "Today"

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (msgKey === dayKey(yesterday.toISOString())) return "Yesterday"

  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86_400_000)
  if (diffDays < 7) {
    return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date)
  }

  if (date.getFullYear() === now.getFullYear()) {
    return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric" }).format(date)
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

function formatMessageTime(dateString: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(dateString))
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function groupMessagesByDay(messages: ChatMessage[]): MessageGroup[] {
  const groups: MessageGroup[] = []
  let currentKey = ""

  for (const msg of messages) {
    const key = dayKey(msg.createdAt)
    if (key !== currentKey) {
      currentKey = key
      groups.push({ dayKey: key, dayLabel: formatDayLabel(msg.createdAt), messages: [] })
    }
    groups[groups.length - 1].messages.push(msg)
  }

  return groups
}

function DocIconByMime({ mimeType, className }: { mimeType: string; className: string }) {
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType === "text/csv")
    return <FileSpreadsheet className={className} />
  if (mimeType.includes("zip")) return <FileArchive className={className} />
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint"))
    return <Presentation className={className} />
  return <FileText className={className} />
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
  )
}

function TypingDots({
  dotClassName,
  gapClassName = "gap-1.5",
}: {
  dotClassName: string
  gapClassName?: string
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
  )
}

function AttachmentDisplay({
  attachments,
  isOwn,
  imageClassName,
  docClassName,
}: {
  attachments: MessageAttachment[]
  isOwn: boolean
  imageClassName?: string
  docClassName?: string
}) {
  if (attachments.length === 0) return null

  const images = attachments.filter((a) => a.attachmentType === "IMAGE")
  const docs = attachments.filter((a) => a.attachmentType !== "IMAGE")

  return (
    <div className="flex flex-col gap-1.5">
      {images.length > 0 && (
        <div
          className={`${imageClassName ?? ""} flex flex-wrap gap-1.5 ${
            images.length > 1 ? "max-w-[320px]" : ""
          }`}
        >
          {images.map((img) => (
            <a key={img.uuid} href={img.url} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.name}
                className="h-52 w-52 rounded-xl object-cover cursor-pointer hover:opacity-90 transition-opacity"
              />
            </a>
          ))}
        </div>
      )}
      {docs.map((doc) => {
        return (
          <a
            key={doc.uuid}
            href={doc.url}
            download={doc.name}
            className={`${docClassName ?? ""} flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors max-w-[260px] ${
              isOwn
                ? "bg-blue-600/40 hover:bg-blue-600/55"
                : "bg-slate-100 dark:bg-white/8 hover:bg-slate-200 dark:hover:bg-white/12 border border-slate-200 dark:border-white/8"
            }`}
          >
            <DocIconByMime
              mimeType={doc.mimeType}
              className={`w-4 h-4 shrink-0 ${isOwn ? "text-blue-100" : "text-slate-500 dark:text-slate-400"}`}
            />
            <div className="min-w-0">
              <p className={`text-[12px] font-medium truncate leading-tight ${isOwn ? "text-white" : "text-slate-800 dark:text-slate-100"}`}>
                {doc.name}
              </p>
              <p className={`text-[10px] ${isOwn ? "text-blue-200" : "text-slate-400 dark:text-slate-500"}`}>
                {formatBytes(doc.sizeBytes)}
              </p>
            </div>
          </a>
        )
      })}
    </div>
  )
}

// Chip shown in the input area for a selected (not yet sent) file
function SelectedFileChip({
  file,
  onRemove,
}: {
  file: File
  onRemove: () => void
}) {
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type)
  const previewUrl = useMemo(
    () => (isImage ? URL.createObjectURL(file) : null),
    [file, isImage],
  )

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  return (
    <div className="relative group shrink-0">
      {isImage && previewUrl ? (
        <div className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 dark:border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt={file.name} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/8 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-2 max-w-[140px]">
          <DocIconByMime
            mimeType={file.type}
            className="w-4 h-4 shrink-0 text-slate-500 dark:text-slate-400"
          />
          <span className="text-[11px] text-slate-700 dark:text-slate-300 truncate leading-tight">
            {file.name}
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
  )
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
  onMessageChange,
  onSendMessage,
  onFileSelect,
  onRemoveFile,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length, isPeerTyping])

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(e.target.files ?? [])
    e.target.value = "" // reset so same file can be re-selected
    setFileError(null)

    if (incoming.length === 0) return

    const valid: File[] = []
    const errors: string[] = []

    for (const file of incoming) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`"${file.name}" is not a supported file type`)
        continue
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        errors.push(`"${file.name}" is larger than 10 MB`)
        continue
      }
      valid.push(file)
    }

    const existingKeys = new Set(selectedFiles.map((file) => `${file.name}-${file.size}-${file.type}`))
    const deduped = valid.filter((file) => {
      const key = `${file.name}-${file.size}-${file.type}`
      if (existingKeys.has(key)) return false
      existingKeys.add(key)
      return true
    })

    if (selectedFiles.length + deduped.length > MAX_FILES) {
      errors.push("You can attach up to 5 files in one message")
    }

    const combined = [...selectedFiles, ...deduped].slice(0, MAX_FILES)
    onFileSelect(combined)

    if (errors.length > 0) {
      setFileError(errors[0])
    }
  }

  const canSend = (message.trim().length > 0 || selectedFiles.length > 0) && !isSendingMessage

  const statusLabel = isPeerTyping
    ? "typing something..."
    : selected.online
      ? "Active now"
      : "Offline"

  const showTypingBubble = isPeerTyping && !isLoadingMessages
  const groups = groupMessagesByDay(messages)

  const lastReadOwnMessageUuid =
    [...messages].reverse().find((m) => m.isOwnMessage && m.status === "read")?.uuid ?? null

  return (
    <main className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 h-[68px] border-b border-slate-200 dark:border-white/6 bg-white dark:bg-[#070d1e] shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div
              className={`w-9 h-9 rounded-full bg-linear-to-br ${selected.gradient} flex items-center justify-center text-[11px] font-semibold text-white`}
            >
              {selected.initials}
            </div>
            {selected.online && (
              <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-400 rounded-full border-2 border-white dark:border-[#070d1e]" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white leading-none">
              {selected.name}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <p
                className={`text-[11px] transition-colors ${
                  isPeerTyping
                    ? "text-blue-500 dark:text-blue-400"
                    : "text-slate-400 dark:text-slate-600"
                }`}
              >
                {statusLabel}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {[Phone, Video, MoreHorizontal].map((Icon, i) => (
            <button
              key={i}
              className="w-8 h-8 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-center transition-colors"
            >
              <Icon className="w-4 h-4 text-slate-400 dark:text-slate-600" />
            </button>
          ))}
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
                      {chatMessage.attachments.some((attachment) => attachment.attachmentType === "IMAGE") && (
                        <AttachmentDisplay
                          attachments={chatMessage.attachments.filter(
                            (attachment) => attachment.attachmentType === "IMAGE",
                          )}
                          isOwn={chatMessage.isOwnMessage}
                          imageClassName={`mb-1.5 ${chatMessage.isOwnMessage ? "justify-end" : "justify-start"}`}
                        />
                      )}

                      {(chatMessage.content || chatMessage.attachments.some((attachment) => attachment.attachmentType !== "IMAGE")) && (
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
                              (attachment) => attachment.attachmentType !== "IMAGE",
                            )}
                            isOwn={chatMessage.isOwnMessage}
                          />
                          {chatMessage.content && (
                            <p
                              className={`text-sm leading-relaxed ${
                                chatMessage.attachments.some(
                                  (attachment) => attachment.attachmentType !== "IMAGE",
                                )
                                  ? "mt-1.5"
                                  : ""
                              }`}
                            >
                              {chatMessage.content}
                            </p>
                          )}
                        </div>
                      )}

                      {!chatMessage.content &&
                        chatMessage.attachments.length > 0 &&
                        chatMessage.attachments.every(
                          (attachment) => attachment.attachmentType === "IMAGE",
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
                              {chatMessage.attachments.length === 1 ? "Image" : `${chatMessage.attachments.length} images`}
                            </p>
                          </div>
                        )}

                      {chatMessage.attachments.some((attachment) => attachment.attachmentType === "IMAGE") &&
                        (chatMessage.content ||
                          chatMessage.attachments.some(
                            (attachment) => attachment.attachmentType !== "IMAGE",
                          )) && (
                          <div
                            className={`mt-[-6px] h-3 w-8 rounded-full ${
                              chatMessage.isOwnMessage
                                ? "bg-blue-500/18 mr-4"
                                : "bg-slate-200/80 dark:bg-white/8 ml-4"
                            }`}
                          />
                        )}

                      {/* Timestamp + Seen */}
                      <div className="flex items-center gap-1 mt-1.5 px-1">
                        <span className="text-[10px] tabular-nums text-slate-400 dark:text-slate-500">
                          {formatMessageTime(chatMessage.createdAt)}
                        </span>
                        {chatMessage.uuid === lastReadOwnMessageUuid && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">
                            · Seen
                          </span>
                        )}
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
                    {selected.name}
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
                      {selected.name}
                    </p>
                    <p className="text-[12px] text-blue-500 dark:text-blue-400">
                      Composing a message
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
      <div className="px-5 py-4 border-t border-slate-200 dark:border-white/6 bg-white dark:bg-[#070d1e] shrink-0">
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
                  Up to 5 files per message. JPG, JPEG, PNG, PDF, DOC, DOCX, XLS, XLSX, CSV, ZIP, PPT and PPTX only. Max 10 MB each.
                </p>
              )}
              {fileError && (
                <p className="mt-1 text-[11px] text-rose-500">
                  {fileError}
                </p>
              )}
            </div>
          )}

          <textarea
            placeholder="Send a message... use @ to mention someone"
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                onSendMessage()
              }
            }}
            rows={3}
            className="w-full bg-transparent text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none resize-none px-4 pt-3.5 pb-1"
          />

          <div className="flex items-center justify-between px-3 pb-3 pt-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/8 transition-colors"
              title="Attach files"
            >
              <Paperclip className="w-4 h-4" />
            </button>
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
    </main>
  )
}
