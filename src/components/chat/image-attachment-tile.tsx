"use client";

import { useState } from "react";
import { Check, Download } from "lucide-react";
import { motion } from "framer-motion";
import type { MessageAttachment } from "@/hooks/use-direct-messages";
import { api } from "@/lib/api";

export function ImageAttachmentTile({
  attachment,
  onPreview,
}: {
  attachment: MessageAttachment;
  onPreview?: (attachment: MessageAttachment) => void;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [isDownloadComplete, setIsDownloadComplete] = useState(false);

  async function handleDownload(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();

    if (isDownloading) return;

    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadError(null);
    setIsDownloadComplete(false);

    try {
      const response = await api.get<Blob>(
        `/chats/direct/messages/attachments/${attachment.uuid}/download`,
        {
          responseType: "blob",
          onDownloadProgress: (progressEvent) => {
            if (!progressEvent.total || progressEvent.total <= 0) return;

            setDownloadProgress(
              Math.min(
                100,
                Math.round((progressEvent.loaded / progressEvent.total) * 100),
              ),
            );
          },
        },
      );

      const blob = response.data;
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = attachment.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      setDownloadProgress(100);
      setIsDownloadComplete(true);

      window.setTimeout(() => {
        setIsDownloading(false);
        setDownloadProgress(0);
        setIsDownloadComplete(false);
      }, 1100);
    } catch {
      setDownloadError("Download failed");
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  }

  return (
    <div className="relative h-52 w-52 overflow-hidden rounded-xl bg-slate-200 dark:bg-white/8">
      <button
        type="button"
        onClick={() => onPreview?.(attachment)}
        className="absolute inset-0 z-11"
        aria-label={`Preview ${attachment.name}`}
      />
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
  );
}
