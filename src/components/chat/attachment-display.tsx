"use client";

import { useRef, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Download,
  FileArchive,
  FileSpreadsheet,
  FileText,
  Loader2,
  Mic,
  Pause,
  Play,
  Presentation,
} from "lucide-react";
import { ImageAttachmentTile } from "@/components/chat/image-attachment-tile";
import { DocumentCard } from "@/components/ui/document-card";
import type { MessageAttachment } from "@/hooks/use-direct-messages";
import { cn } from "@/lib/utils";

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(secs: number) {
  if (!isFinite(secs) || secs <= 0) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

async function downloadAudio(url: string, filename: string) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename || "voice-message.webm";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch {
    window.open(url, "_blank");
  }
}

function getImageAttachmentRows(images: MessageAttachment[]) {
  if (images.length <= 3) return [images];
  if (images.length === 4) return [images.slice(0, 2), images.slice(2, 4)];
  return [images.slice(0, 3), images.slice(3, 5)];
}

function getDocAccent(mimeType: string) {
  if (mimeType === "application/pdf")
    return { icon: "text-rose-500 dark:text-rose-400" };
  if (
    mimeType === "text/csv" ||
    mimeType.includes("sheet") ||
    mimeType.includes("excel")
  )
    return { icon: "text-emerald-500 dark:text-emerald-400" };
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint"))
    return { icon: "text-orange-500 dark:text-orange-400" };
  if (mimeType.includes("zip"))
    return { icon: "text-amber-500 dark:text-amber-400" };
  return { icon: "text-slate-500 dark:text-slate-300" };
}

function getDocumentLabel(mimeType: string) {
  if (mimeType === "application/pdf") return "Portable Document";
  if (mimeType === "text/csv") return "CSV Document";
  if (mimeType.includes("sheet") || mimeType.includes("excel"))
    return "Spreadsheet";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint"))
    return "Presentation";
  if (mimeType.includes("zip")) return "Compressed Archive";
  if (mimeType.includes("word")) return "Word Document";
  return "Document";
}

function DocIconByMime({
  mimeType,
  className,
}: {
  mimeType: string;
  className: string;
}) {
  if (
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    mimeType === "text/csv"
  )
    return <FileSpreadsheet className={className} />;
  if (mimeType.includes("zip")) return <FileArchive className={className} />;
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint"))
    return <Presentation className={className} />;
  return <FileText className={className} />;
}

// ─── audio waveform player ────────────────────────────────────────────────────

const BAR_COUNT = 48;

function generateBars(seed: number): number[] {
  let s = seed | 1;
  const rand = () => {
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    return Math.abs(s % 1000) / 1000;
  };
  return Array.from({ length: BAR_COUNT }, (_, i) => {
    const envelope = Math.sin((i / (BAR_COUNT - 1)) * Math.PI);
    return 0.12 + envelope * 0.55 + rand() * 0.33;
  });
}

function AudioAttachmentPlayer({
  track,
  isOwn,
  senderProfilePicUrl,
  senderInitials,
  createdAt,
}: {
  track: MessageAttachment;
  isOwn: boolean;
  senderProfilePicUrl?: string | null;
  senderInitials?: string;
  createdAt?: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const hackingDurationRef = useRef(false);

  const bars = useMemo(() => {
    const seed =
      track.name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) +
      (track.sizeBytes % 99991);
    return generateBars(seed);
  }, [track.name, track.sizeBytes]);

  const cardWidth =
    duration > 0
      ? Math.min(380, Math.max(240, Math.round(180 + duration * 14)))
      : 260;

  const progress = duration > 0 ? currentTime / duration : 0;
  const activeBars = Math.floor(progress * BAR_COUNT);

  const timeLabel = createdAt
    ? new Date(createdAt).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio || isLoading) return;
    if (isPlaying) audio.pause();
    else void audio.play();
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    audio.currentTime =
      Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * duration;
  }

  function handleWaveformHover(e: React.MouseEvent<HTMLDivElement>) {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(
      0,
      Math.min(1, (e.clientX - rect.left) / rect.width),
    );
    setHoveredBar(Math.min(BAR_COUNT - 1, Math.floor(ratio * BAR_COUNT)));
  }

  const avatar = (
    <div className="relative shrink-0 select-none">
      <div className="h-10 w-10 overflow-hidden rounded-full ring-1 ring-black/5 dark:ring-white/10">
        {senderProfilePicUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={senderProfilePicUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900 text-[13px] font-semibold text-white">
            {senderInitials ?? "?"}
          </div>
        )}
      </div>
      <div className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#00a884] dark:bg-[#00a884] shadow-xs">
        <Mic className="h-2.5 w-2.5 text-white stroke-[2.5]" />
      </div>
    </div>
  );

  return (
    <div
      style={{ width: cardWidth, maxWidth: "calc(85vw - 32px)" }}
      className={cn(
        "flex items-center gap-3 rounded-[20px] px-3.5 py-2.5 transition-all shadow-xs border",
        isOwn
          ? "bg-[#d9fdd3] dark:bg-[#005c4b] border-emerald-600/20 text-slate-900 dark:text-slate-100"
          : "bg-white dark:bg-[#202c33] border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-slate-100"
      )}
    >
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={audioRef}
        src={track.url}
        onTimeUpdate={() => {
          if (hackingDurationRef.current) return;
          setCurrentTime(audioRef.current?.currentTime ?? 0);
        }}
        onLoadedMetadata={() => {
          const audio = audioRef.current;
          if (!audio) return;
          if (isFinite(audio.duration) && audio.duration > 0) {
            setDuration(audio.duration);
            setIsLoading(false);
          } else {
            hackingDurationRef.current = true;
            audio.currentTime = 1e100;
          }
        }}
        onDurationChange={() => {
          const audio = audioRef.current;
          if (!audio || !isFinite(audio.duration) || audio.duration <= 0)
            return;
          setDuration(audio.duration);
          if (hackingDurationRef.current) {
            hackingDurationRef.current = false;
            audio.currentTime = 0;
          }
          setIsLoading(false);
        }}
        onCanPlay={() => {
          const audio = audioRef.current;
          if (audio && isFinite(audio.duration) && audio.duration > 0) {
            setDuration(audio.duration);
          }
          setIsLoading(false);
        }}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Play / Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        disabled={isLoading}
        aria-label={isPlaying ? "Pause voice message" : "Play voice message"}
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95 disabled:opacity-50",
          isOwn
            ? "text-slate-800 dark:text-slate-100 hover:bg-emerald-600/10 dark:hover:bg-white/10"
            : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10"
        )}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-slate-500 dark:text-slate-300" />
        ) : isPlaying ? (
          <Pause className="h-4.5 w-4.5 fill-current" />
        ) : (
          <Play className="h-4.5 w-4.5 translate-x-0.5 fill-current" />
        )}
      </button>

      {/* Waveform + Duration Row */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
        {/* Waveform track */}
        <div
          className="relative cursor-pointer select-none py-1"
          onClick={handleSeek}
          onMouseMove={handleWaveformHover}
          onMouseLeave={() => setHoveredBar(null)}
        >
          <div className="flex h-7 items-center gap-[2px]">
            {bars.map((h, i) => {
              const isActive = i < activeBars;
              const isPlayhead = isPlaying && i === activeBars && i < BAR_COUNT;
              const isHoverPreview =
                hoveredBar !== null && !isActive && i <= hoveredBar;
              const barHeight = Math.round(Math.max(15, h * 100));

              if (isPlayhead) {
                return (
                  <motion.div
                    key={i}
                    animate={{ scaleY: [1, 1.4, 1] }}
                    transition={{
                      duration: 0.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    style={{ height: `${barHeight}%` }}
                    className={cn(
                      "flex-1 origin-center rounded-full",
                      isOwn
                        ? "bg-[#34b7f1] dark:bg-[#34b7f1]"
                        : "bg-[#34b7f1] dark:bg-[#34b7f1]"
                    )}
                  />
                );
              }

              return (
                <div
                  key={i}
                  style={{ height: `${barHeight}%` }}
                  className={cn(
                    "flex-1 rounded-full transition-colors duration-100",
                    isActive
                      ? "bg-[#34b7f1] dark:bg-[#34b7f1]"
                      : isHoverPreview
                        ? "bg-slate-400 dark:bg-slate-400"
                        : isOwn
                          ? "bg-emerald-700/25 dark:bg-white/30"
                          : "bg-slate-300 dark:bg-white/25"
                  )}
                />
              );
            })}
          </div>

          {/* WhatsApp Scrubber cyan dot */}
          {duration > 0 && (
            <motion.div
              className="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#34b7f1] shadow-xs ring-2 ring-white dark:ring-[#202c33]"
              animate={{ left: `${progress * 100}%` }}
              transition={{
                type: "spring",
                stiffness: 450,
                damping: 40,
                mass: 0.2,
              }}
            />
          )}
        </div>

        {/* Time + Timestamp + Download */}
        <div className="flex items-center justify-between text-[11px] font-normal leading-none text-slate-500 dark:text-slate-400">
          <span className="tabular-nums">
            {formatTime(currentTime || duration)}
          </span>
          <div className="flex items-center gap-1.5">
            {timeLabel && <span className="tabular-nums">{timeLabel}</span>}
            <button
              type="button"
              onClick={() => void downloadAudio(track.url, track.name)}
              aria-label="Download audio"
              className="opacity-70 hover:opacity-100 transition-opacity"
            >
              <Download className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Avatar on right side (WhatsApp Voice Note style) */}
      {avatar}
    </div>
  );
}

// ─── main export ──────────────────────────────────────────────────────────────

export function AttachmentDisplay({
  attachments,
  isOwn,
  imageClassName,
  docClassName,
  onPreviewImage,
  senderProfilePicUrl,
  senderInitials,
  createdAt,
}: {
  attachments: MessageAttachment[];
  isOwn: boolean;
  imageClassName?: string;
  docClassName?: string;
  onPreviewImage?: (attachment: MessageAttachment) => void;
  senderProfilePicUrl?: string | null;
  senderInitials?: string;
  createdAt?: string;
}) {
  if (attachments.length === 0) return null;

  const images = attachments.filter((a) => a.attachmentType === "IMAGE");
  const audioFiles = attachments.filter((a) => a.mimeType.startsWith("audio/"));
  const docs = attachments.filter(
    (a) => a.attachmentType !== "IMAGE" && !a.mimeType.startsWith("audio/"),
  );
  const imageRows = getImageAttachmentRows(images);

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

      {audioFiles.map((track) => (
        <AudioAttachmentPlayer
          key={track.uuid}
          track={track}
          isOwn={isOwn}
          senderProfilePicUrl={senderProfilePicUrl}
          senderInitials={senderInitials}
          createdAt={createdAt}
        />
      ))}

      {docs.map((doc) => (
        <DocumentCard key={doc.uuid} attachment={doc} isOwn={isOwn} className={docClassName} />
      ))}
    </div>
  );
}
