"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import {
  Check,
  Download,
  Eye,
  FileText,
  MoreHorizontal,
  Minus,
  Paperclip,
  Phone,
  Plus,
  Send,
  Video,
  X,
  FileSpreadsheet,
  FileArchive,
  Presentation,
} from "lucide-react"
import type { MessageAttachment } from "@/hooks/use-direct-messages"
import { api } from "@/lib/api"

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

function isImageFileType(mimeType: string) {
  return mimeType.startsWith("image/")
}

function getFileExtension(fileName: string) {
  const parts = fileName.split(".")
  if (parts.length < 2) return "FILE"
  return parts.at(-1)?.toUpperCase() ?? "FILE"
}

function getImageAttachmentRows(images: MessageAttachment[]) {
  if (images.length <= 1) return [images]
  if (images.length === 2) return [images]
  if (images.length === 3) return [images]
  if (images.length === 4) return [images.slice(0, 2), images.slice(2, 4)]
  return [images.slice(0, 3), images.slice(3, 5)]
}

function getDocAccent(mimeType: string) {
  if (mimeType === "application/pdf") {
    return {
      icon: "text-rose-500 dark:text-rose-400",
      badge: "text-rose-700",
    }
  }

  if (
    mimeType === "text/csv" ||
    mimeType.includes("sheet") ||
    mimeType.includes("excel")
  ) {
    return {
      icon: "text-emerald-500 dark:text-emerald-400",
      badge: "text-emerald-700",
    }
  }

  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) {
    return {
      icon: "text-orange-500 dark:text-orange-400",
      badge: "text-orange-700",
    }
  }

  if (mimeType.includes("zip")) {
    return {
      icon: "text-amber-500 dark:text-amber-400",
      badge: "text-amber-700",
    }
  }

  return {
    icon: "text-slate-500 dark:text-slate-300",
    badge: "text-slate-700",
  }
}

function getDocumentLabel(mimeType: string) {
  if (mimeType === "application/pdf") return "Portable Document"
  if (mimeType === "text/csv") return "CSV Document"
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return "Spreadsheet"
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint"))
    return "Presentation"
  if (mimeType.includes("zip")) return "Compressed Archive"
  if (mimeType.includes("word")) return "Word Document"
  return "Document"
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

function ImageAttachmentTile({
  attachment,
  onPreview,
}: {
  attachment: MessageAttachment
  onPreview?: (attachment: MessageAttachment) => void
}) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [isDownloadComplete, setIsDownloadComplete] = useState(false)

  async function handleDownload(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()

    if (isDownloading) return

    setIsDownloading(true)
    setDownloadProgress(0)
    setDownloadError(null)
    setIsDownloadComplete(false)

    try {
      const response = await api.get<Blob>(
        `/chats/direct/messages/attachments/${attachment.uuid}/download`,
        {
          responseType: "blob",
          onDownloadProgress: (progressEvent) => {
            if (!progressEvent.total || progressEvent.total <= 0) return

            setDownloadProgress(
              Math.min(100, Math.round((progressEvent.loaded / progressEvent.total) * 100)),
            )
          },
        },
      )

      const blob = response.data
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = objectUrl
      link.download = attachment.name
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
      setDownloadProgress(100)
      setIsDownloadComplete(true)

      window.setTimeout(() => {
        setIsDownloading(false)
        setDownloadProgress(0)
        setIsDownloadComplete(false)
      }, 1100)
    } catch {
      setDownloadError("Download failed")
      setIsDownloading(false)
      setDownloadProgress(0)
    }
  }

  return (
    <div className="relative h-52 w-52 overflow-hidden rounded-xl bg-slate-200 dark:bg-white/8">
      <button
        type="button"
        onClick={() => onPreview?.(attachment)}
        className="absolute inset-0 z-0"
        aria-label={`Preview ${attachment.name}`}
      >
      </button>
      {!isLoaded && (
        <div className="absolute inset-0 overflow-hidden rounded-xl bg-slate-200 dark:bg-white/8">
          <motion.div
            className="absolute inset-0 bg-linear-to-r from-transparent via-white/60 to-transparent dark:via-white/10"
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{
              duration: 1.2,
              ease: "easeInOut",
              repeat: Number.POSITIVE_INFINITY,
              repeatDelay: 0.1,
            }}
          />
          <motion.div
            className="absolute inset-0 bg-slate-300/50 dark:bg-white/6"
            animate={{ opacity: [0.45, 0.7, 0.45] }}
            transition={{
              duration: 1.6,
              ease: "easeInOut",
              repeat: Number.POSITIVE_INFINITY,
            }}
          />
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={attachment.url}
        alt={attachment.name}
        onLoad={() => setIsLoaded(true)}
        onError={() => setIsLoaded(true)}
        className={`relative z-10 h-52 w-52 rounded-xl object-cover transition-opacity ${
          isLoaded ? "opacity-100" : "opacity-0"
        }`}
      />
      <button
        type="button"
        onClick={handleDownload}
        disabled={isDownloading}
        className={`absolute right-2 top-2 z-20 flex h-10 items-center justify-center overflow-hidden rounded-full border px-2.5 text-white shadow-[0_10px_30px_rgba(15,23,42,0.28)] backdrop-blur-md transition-all duration-200 disabled:cursor-wait ${
          downloadError
            ? "border-rose-300/30 bg-rose-500/90 hover:bg-rose-500"
            : isDownloadComplete
              ? "border-emerald-300/30 bg-emerald-500/90"
              : "border-white/15 bg-black/55 hover:bg-black/72"
        }`}
        aria-label={`Download ${attachment.name}`}
        title={downloadError ?? `Download ${attachment.name}`}
      >
        {isDownloading ? (
          <motion.div
            initial={{ width: 40 }}
            animate={{ width: 76 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="relative flex h-7 items-center overflow-hidden rounded-full"
          >
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-white/16"
              initial={{ width: 0 }}
              animate={{ width: `${downloadProgress}%` }}
              transition={{ ease: "easeOut", duration: 0.2 }}
            />
            <motion.div
              className="absolute inset-y-0 left-0 w-10 bg-linear-to-r from-transparent via-white/45 to-transparent"
              animate={{ x: ["-120%", "220%"] }}
              transition={{
                duration: 1,
                ease: "easeInOut",
                repeat: Number.POSITIVE_INFINITY,
              }}
            />
            <div className="relative z-10 flex w-full items-center justify-center gap-1.5 px-2">
              <Download className="h-3.5 w-3.5" />
              <motion.span
                key={downloadProgress}
                initial={{ scale: 0.96, opacity: 0.75 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-[10px] font-semibold tabular-nums tracking-[0.02em]"
              >
                {downloadProgress}%
              </motion.span>
            </div>
          </motion.div>
        ) : isDownloadComplete ? (
          <motion.div
            initial={{ scale: 0.85, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-1.5"
          >
            <Check className="h-4 w-4" />
            <span className="text-[10px] font-semibold">Saved</span>
          </motion.div>
        ) : downloadError ? (
          <motion.span
            initial={{ scale: 0.92, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-[10px] font-semibold"
          >
            Retry
          </motion.span>
        ) : (
          <motion.div
            whileHover={{ y: -0.5 }}
            whileTap={{ scale: 0.96 }}
            className="flex items-center gap-1.5"
          >
            <Download className="h-4 w-4" />
            <span className="text-[10px] font-semibold">Save</span>
          </motion.div>
        )}
      </button>
    </div>
  )
}

function AttachmentDisplay({
  attachments,
  isOwn,
  imageClassName,
  docClassName,
  onPreviewImage,
}: {
  attachments: MessageAttachment[]
  isOwn: boolean
  imageClassName?: string
  docClassName?: string
  onPreviewImage?: (attachment: MessageAttachment) => void
}) {
  if (attachments.length === 0) return null

  const images = attachments.filter((a) => a.attachmentType === "IMAGE")
  const docs = attachments.filter((a) => a.attachmentType !== "IMAGE")
  const imageRows = getImageAttachmentRows(images)

  return (
    <div className="flex flex-col gap-1.5">
      {images.length > 0 && (
        <div className={`${imageClassName ?? ""} flex flex-col gap-1.5`}>
          {imageRows.map((row, rowIndex) => (
            <div
              key={`row-${rowIndex}`}
              className={`flex gap-1.5 ${
                images.length === 5 && rowIndex === 1
                  ? isOwn
                    ? "justify-end"
                    : "justify-start"
                  : ""
              }`}
            >
              {row.map((img) => (
                <ImageAttachmentTile
                  key={img.uuid}
                  attachment={img}
                  onPreview={onPreviewImage}
                />
              ))}
            </div>
          ))}
        </div>
      )}
      {docs.map((doc) => {
        const isPdf = doc.mimeType === "application/pdf"
        const docAccent = getDocAccent(doc.mimeType)
        const docExtension = getFileExtension(doc.name)
        const docLabel = getDocumentLabel(doc.mimeType)

        if (isPdf) {
          return (
            <div
              key={doc.uuid}
              className={`max-w-[390px] overflow-hidden rounded-[28px] border p-4 shadow-[0_16px_50px_-30px_rgba(15,23,42,0.35)] ${
                isOwn
                  ? "border-white/12 bg-linear-to-br from-blue-500 to-blue-600 text-white"
                  : "border-slate-200/90 bg-white dark:border-white/10 dark:bg-[#0f172a]"
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`relative flex h-[104px] w-[104px] shrink-0 flex-col items-center justify-center rounded-[28px] ${
                    isOwn
                      ? "bg-white/12 ring-1 ring-white/10"
                      : "bg-linear-to-b from-slate-50 to-slate-100 ring-1 ring-slate-200/80 dark:from-white/8 dark:to-white/5 dark:ring-white/8"
                  }`}
                >
                  <FileText
                    className={`h-10 w-10 ${
                      isOwn ? "text-white" : docAccent.icon
                    }`}
                  />
                  <div
                    className={`absolute bottom-3 rounded-full px-3 py-1.5 text-[11px] font-bold tracking-[0.24em] ${
                      isOwn
                        ? "bg-white text-blue-700"
                        : `bg-white shadow-sm dark:bg-slate-50 ${docAccent.badge}`
                    }`}
                  >
                    {docExtension}
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate text-[15px] font-semibold leading-tight ${
                      isOwn ? "text-white" : "text-slate-900 dark:text-slate-100"
                    }`}
                  >
                    {doc.name}
                  </p>
                  <div
                    className={`mt-2 flex items-center gap-2 text-[12px] ${
                      isOwn ? "text-blue-100/90" : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    <span>{formatBytes(doc.sizeBytes)}</span>
                    <span
                      className={`h-1 w-1 rounded-full ${
                        isOwn ? "bg-blue-100/70" : "bg-slate-300 dark:bg-slate-600"
                      }`}
                    />
                    <span>{docLabel}</span>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex h-11 items-center gap-2 rounded-full px-4 text-[12px] font-semibold transition-colors ${
                        isOwn
                          ? "bg-white/12 text-white hover:bg-white/18"
                          : "bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-white/6 dark:text-slate-100 dark:hover:bg-white/10"
                      }`}
                    >
                      <Eye className="h-4 w-4" />
                      Preview
                    </a>
                    <a
                      href={doc.url}
                      download={doc.name}
                      className={`inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full px-4 text-[12px] font-semibold transition-colors ${
                        isOwn
                          ? "bg-white text-blue-700 hover:bg-blue-50"
                          : "bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                      }`}
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )
        }

        return (
          <a
            key={doc.uuid}
            href={doc.url}
            download={doc.name}
            className={`${docClassName ?? ""} flex max-w-[300px] items-center gap-3 rounded-2xl border px-3.5 py-3 transition-colors ${
              isOwn
                ? "border-white/10 bg-blue-600/40 hover:bg-blue-600/55"
                : "border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-white/8 dark:bg-white/8 dark:hover:bg-white/12"
            }`}
          >
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                isOwn ? "bg-white/12" : "bg-white ring-1 ring-slate-200 dark:bg-white/10 dark:ring-white/8"
              }`}
            >
              <DocIconByMime
                mimeType={doc.mimeType}
                className={`h-5 w-5 shrink-0 ${isOwn ? "text-blue-100" : docAccent.icon}`}
              />
            </div>
            <div className="min-w-0">
              <p className={`truncate text-[12px] font-semibold leading-tight ${isOwn ? "text-white" : "text-slate-800 dark:text-slate-100"}`}>
                {doc.name}
              </p>
              <p className={`mt-1 text-[10px] ${isOwn ? "text-blue-200" : "text-slate-400 dark:text-slate-500"}`}>
                {formatBytes(doc.sizeBytes)} · {docLabel}
              </p>
            </div>
          </a>
        )
      })}
    </div>
  )
}

function ImagePreviewModal({
  attachment,
  zoom,
  onClose,
  onZoomIn,
  onZoomOut,
}: {
  attachment: MessageAttachment
  zoom: number
  onClose: () => void
  onZoomIn: () => void
  onZoomOut: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div className="absolute right-6 top-6">
        <button
          type="button"
          onClick={onClose}
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-900 shadow-lg transition-transform hover:scale-[1.02]"
          aria-label="Close image preview"
        >
          <X className="h-7 w-7" />
        </button>
      </div>

      <div className="absolute bottom-6 right-6 flex flex-col gap-3">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onZoomIn()
          }}
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-900 shadow-lg transition-transform hover:scale-[1.02]"
          aria-label="Zoom in"
        >
          <Plus className="h-7 w-7" />
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onZoomOut()
          }}
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-900 shadow-lg transition-transform hover:scale-[1.02]"
          aria-label="Zoom out"
        >
          <Minus className="h-7 w-7" />
        </button>
      </div>

      <div
        className="flex h-full w-full items-center justify-center p-8 sm:p-16"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex max-h-full max-w-[min(92vw,1400px)] items-center justify-center overflow-auto rounded-[28px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={attachment.url}
            alt={attachment.name}
            className="max-h-[82vh] w-auto rounded-[28px] object-contain shadow-[0_18px_70px_rgba(0,0,0,0.45)] transition-transform duration-200"
            style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
          />
        </div>
      </div>
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
  const isImage = isImageFileType(file.type)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!isImage) return

    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPreviewUrl(reader.result)
      }
    }

    reader.readAsDataURL(file)
  }, [file, isImage])

  return (
    <div className="relative group shrink-0">
      {isImage && previewUrl ? (
        <div className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 dark:border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt={file.name} className="w-full h-full object-cover" />
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
  const [previewImage, setPreviewImage] = useState<MessageAttachment | null>(null)
  const [previewZoom, setPreviewZoom] = useState(1)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length, isPeerTyping])

  useEffect(() => {
    if (!previewImage) return

    const previousOverflow = document.body.style.overflow
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPreviewImage(null)
        return
      }

      if (event.key === "+" || event.key === "=") {
        setPreviewZoom((current) => Math.min(current + 0.2, 3))
      }

      if (event.key === "-") {
        setPreviewZoom((current) => Math.max(current - 0.2, 0.8))
      }
    }

    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [previewImage])

  function openPreviewImage(attachment: MessageAttachment) {
    setPreviewImage(attachment)
    setPreviewZoom(1)
  }

  function closePreviewImage() {
    setPreviewImage(null)
    setPreviewZoom(1)
  }

  function zoomPreviewIn() {
    setPreviewZoom((current) => Math.min(current + 0.2, 3))
  }

  function zoomPreviewOut() {
    setPreviewZoom((current) => Math.max(current - 0.2, 0.8))
  }

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
    <>
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
                          onPreviewImage={openPreviewImage}
                        />
                      )}

                      {chatMessage.attachments.some(
                        (attachment) => attachment.mimeType === "application/pdf",
                      ) && (
                        <AttachmentDisplay
                          attachments={chatMessage.attachments.filter(
                            (attachment) => attachment.mimeType === "application/pdf",
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
  )
}
