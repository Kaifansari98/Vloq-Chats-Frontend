"use client";

import { useRef, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
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
import type { MessageAttachment } from "@/hooks/use-direct-messages";

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

function getImageAttachmentRows(images: MessageAttachment[]) {
  if (images.length <= 3) return [images];
  if (images.length === 4) return [images.slice(0, 2), images.slice(2, 4)];
  return [images.slice(0, 3), images.slice(3, 5)];
}

function getDocAccent(mimeType: string) {
  if (mimeType === "application/pdf") return { icon: "text-rose-500 dark:text-rose-400" };
  if (mimeType === "text/csv" || mimeType.includes("sheet") || mimeType.includes("excel"))
    return { icon: "text-emerald-500 dark:text-emerald-400" };
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint"))
    return { icon: "text-orange-500 dark:text-orange-400" };
  if (mimeType.includes("zip")) return { icon: "text-amber-500 dark:text-amber-400" };
  return { icon: "text-slate-500 dark:text-slate-300" };
}

function getDocumentLabel(mimeType: string) {
  if (mimeType === "application/pdf") return "Portable Document";
  if (mimeType === "text/csv") return "CSV Document";
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return "Spreadsheet";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return "Presentation";
  if (mimeType.includes("zip")) return "Compressed Archive";
  if (mimeType.includes("word")) return "Word Document";
  return "Document";
}

function DocIconByMime({ mimeType, className }: { mimeType: string; className: string }) {
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType === "text/csv")
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
    s ^= s << 13; s ^= s >> 17; s ^= s << 5;
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
    const seed = track.name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) +
      (track.sizeBytes % 99991);
    return generateBars(seed);
  }, [track.name, track.sizeBytes]);

  const cardWidth = duration > 0
    ? Math.min(380, Math.max(240, Math.round(180 + duration * 14)))
    : 260;

  const progress = duration > 0 ? currentTime / duration : 0;
  const activeBars = Math.floor(progress * BAR_COUNT);

  const timeLabel = createdAt
    ? new Date(createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
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
    audio.currentTime = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * duration;
  }

  function handleWaveformHover(e: React.MouseEvent<HTMLDivElement>) {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoveredBar(Math.min(BAR_COUNT - 1, Math.floor(ratio * BAR_COUNT)));
  }

  const avatar = (
    <div className="relative shrink-0">
      <div className="h-10 w-10 overflow-hidden rounded-full">
        {senderProfilePicUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={senderProfilePicUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-400 dark:bg-slate-600 text-[13px] font-semibold text-white">
            {senderInitials ?? "?"}
          </div>
        )}
      </div>
      <div className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400 ring-2 ring-slate-100 dark:ring-slate-800">
        <Mic className="h-2.5 w-2.5 text-white" />
      </div>
    </div>
  );

  return (
    <div
      style={{ width: cardWidth, maxWidth: "calc(75vw - 32px)" }}
      className="flex items-center gap-2.5 rounded-[22px] bg-slate-100 dark:bg-slate-800 px-3 py-2.5"
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
            // webm recorded by MediaRecorder has no duration header — seek to end to force it
            hackingDurationRef.current = true;
            audio.currentTime = 1e100;
          }
        }}
        onDurationChange={() => {
          const audio = audioRef.current;
          if (!audio || !isFinite(audio.duration) || audio.duration <= 0) return;
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
        onEnded={() => { setIsPlaying(false); setCurrentTime(0); }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Own: avatar on left */}
      {isOwn && avatar}

      {/* Play / Pause */}
      <button
        type="button"
        onClick={togglePlay}
        disabled={isLoading}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-300 text-slate-700 transition-colors hover:bg-slate-400 dark:bg-white/15 dark:text-white dark:hover:bg-white/25 disabled:opacity-50"
      >
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : isPlaying ? (
          <Pause className="h-3.5 w-3.5 fill-current" />
        ) : (
          <Play className="h-3.5 w-3.5 translate-x-px fill-current" />
        )}
      </button>

      {/* Waveform + bottom row */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {/* Waveform */}
        <div
          className="relative cursor-pointer select-none"
          onClick={handleSeek}
          onMouseMove={handleWaveformHover}
          onMouseLeave={() => setHoveredBar(null)}
        >
          <div className="flex h-8 items-end gap-[1.5px]">
            {bars.map((h, i) => {
              const isActive = i < activeBars;
              const isPlayhead = isPlaying && i === activeBars && i < BAR_COUNT;
              const isHoverPreview = hoveredBar !== null && !isActive && i <= hoveredBar;
              const barHeight = Math.round(Math.max(10, h * 100));

              if (isPlayhead) {
                return (
                  <motion.div
                    key={i}
                    animate={{ scaleY: [1, 1.35, 1] }}
                    transition={{ duration: 0.55, repeat: Infinity, ease: "easeInOut" }}
                    style={{ height: `${barHeight}%` }}
                    className="flex-1 origin-bottom rounded-full bg-slate-600 dark:bg-white"
                  />
                );
              }

              return (
                <div
                  key={i}
                  style={{ height: `${barHeight}%` }}
                  className={`flex-1 rounded-full transition-colors duration-75 ${
                    isActive
                      ? "bg-slate-600 dark:bg-white"
                      : isHoverPreview
                        ? "bg-slate-400 dark:bg-white/50"
                        : "bg-slate-300 dark:bg-white/25"
                  }`}
                />
              );
            })}
          </div>

          {/* Scrubber dot */}
          {duration > 0 && (
            <motion.div
              className="pointer-events-none absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-700 dark:bg-white shadow"
              animate={{ left: `${progress * 100}%` }}
              transition={{ type: "spring", stiffness: 420, damping: 38, mass: 0.3 }}
            />
          )}
        </div>

        {/* Duration + timestamp */}
        <div className="flex items-center justify-between px-0.5">
          <span className="text-[10px] tabular-nums font-medium text-slate-500 dark:text-white/55">
            {formatTime(currentTime || duration)}
          </span>
          {timeLabel && (
            <span className="text-[10px] tabular-nums text-slate-400 dark:text-white/40">{timeLabel}</span>
          )}
        </div>
      </div>

      {/* Received: avatar on right */}
      {!isOwn && avatar}
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
                  ? isOwn ? "justify-end" : "justify-start"
                  : ""
              }`}
            >
              {row.map((img) => (
                <ImageAttachmentTile key={img.uuid} attachment={img} onPreview={onPreviewImage} />
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

      {docs.map((doc) => {
        const isPdf = doc.mimeType === "application/pdf";
        const docAccent = getDocAccent(doc.mimeType);
        const docLabel = getDocumentLabel(doc.mimeType);

        if (isPdf) {
          return (
            <a
              key={doc.uuid}
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`block w-[268px] overflow-hidden rounded-2xl border shadow-md transition-opacity hover:opacity-90 ${
                isOwn
                  ? "border-white/10 bg-blue-500"
                  : "border-slate-200 bg-white dark:border-white/8 dark:bg-[#0f172a]"
              }`}
            >
              <div className="relative h-[158px] overflow-hidden bg-slate-50">
                <iframe
                  src={`${doc.url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                  title={doc.name}
                  className="absolute inset-0 h-full w-full border-0 pointer-events-none"
                  tabIndex={-1}
                />
                <div
                  className={`absolute inset-x-0 bottom-0 h-12 bg-linear-to-t ${
                    isOwn ? "from-blue-500" : "from-white dark:from-[#0f172a]"
                  } to-transparent`}
                />
              </div>
              <div className="flex items-center gap-3 px-3 py-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className={`truncate text-[13px] font-semibold leading-tight ${isOwn ? "text-white" : "text-slate-900 dark:text-slate-100"}`}>
                    {doc.name}
                  </p>
                  <p className={`mt-0.5 text-[11px] ${isOwn ? "text-blue-200/80" : "text-slate-400 dark:text-slate-500"}`}>
                    {formatBytes(doc.sizeBytes)} · pdf
                  </p>
                </div>
              </div>
            </a>
          );
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
        );
      })}
    </div>
  );
}
