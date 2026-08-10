"use client";

import { Download, FileText, FileSpreadsheet, FileArchive, Presentation } from "lucide-react";
import type { MessageAttachment } from "@/hooks/use-direct-messages";
import { cn } from "@/lib/utils";

export function formatBytes(bytes: number) {
  if (!bytes || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getDocAccent(mimeType: string) {
  if (mimeType === "application/pdf") {
    return {
      bg: "bg-rose-500",
      iconBg: "bg-rose-500/10 text-rose-500 dark:bg-rose-500/20 dark:text-rose-400",
      ext: "PDF",
    };
  }
  if (mimeType === "text/csv" || mimeType.includes("sheet") || mimeType.includes("excel")) {
    return {
      bg: "bg-emerald-500",
      iconBg: "bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20 dark:text-emerald-400",
      ext: "XLS",
    };
  }
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) {
    return {
      bg: "bg-orange-500",
      iconBg: "bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-400",
      ext: "PPT",
    };
  }
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("tar") || mimeType.includes("7z")) {
    return {
      bg: "bg-amber-500",
      iconBg: "bg-amber-500/10 text-amber-500 dark:bg-amber-500/20 dark:text-amber-400",
      ext: "ZIP",
    };
  }
  return {
    bg: "bg-blue-500",
    iconBg: "bg-blue-500/10 text-blue-500 dark:bg-blue-500/20 dark:text-blue-400",
    ext: "DOC",
  };
}

export function DocIconByMime({ mimeType, className }: { mimeType: string; className: string }) {
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType === "text/csv")
    return <FileSpreadsheet className={className} />;
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("tar"))
    return <FileArchive className={className} />;
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint"))
    return <Presentation className={className} />;
  return <FileText className={className} />;
}

interface DocumentCardProps {
  attachment: MessageAttachment;
  isOwn?: boolean;
  className?: string;
}

export function DocumentCard({ attachment, isOwn = false, className }: DocumentCardProps) {
  const accent = getDocAccent(attachment.mimeType);
  const ext = attachment.name.split(".").pop()?.toUpperCase() || accent.ext;

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      download={attachment.name}
      className={cn(
        "group flex w-[280px] sm:w-[310px] items-center gap-3 rounded-2xl p-3 border transition-all duration-150 active:scale-[0.99]",
        isOwn
          ? "border-emerald-600/30 bg-[#d9fdd3] dark:bg-[#005c4b] text-slate-900 dark:text-slate-100 shadow-xs"
          : "border-slate-200/90 bg-[#f0f2f5] dark:border-white/10 dark:bg-[#202c33] text-slate-900 dark:text-slate-100 shadow-xs",
        className
      )}
    >
      {/* Clean Document Badge */}
      <div
        className={cn(
          "relative flex h-11 w-10 shrink-0 flex-col items-center justify-center rounded-lg shadow-sm font-extrabold text-white text-[10px] tracking-wider uppercase transition-transform group-hover:scale-105",
          accent.bg
        )}
        style={{
          clipPath: "polygon(0 0, 100% 0, 100% 75%, 75% 100%, 0 100%)",
        }}
      >
        <span>{ext.slice(0, 4)}</span>
      </div>

      {/* Title & Metadata */}
      <div className="min-w-0 flex-1">
        <p
          className="truncate text-[13.5px] font-semibold leading-tight text-slate-900 dark:text-slate-100 transition-colors"
          title={attachment.name}
        >
          {attachment.name}
        </p>
        <div className="mt-1 flex items-center gap-1.5 text-[11.5px] font-medium text-slate-500 dark:text-slate-400">
          <span>{ext}</span>
          <span>•</span>
          <span>{formatBytes(attachment.sizeBytes)}</span>
        </div>
      </div>

      {/* Download Action */}
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all group-hover:scale-110",
          isOwn
            ? "bg-emerald-700/20 dark:bg-white/15 text-emerald-800 dark:text-slate-100 group-hover:bg-emerald-600 group-hover:text-white"
            : "bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 group-hover:bg-emerald-500 group-hover:text-white"
        )}
      >
        <Download className="h-4 w-4" />
      </div>
    </a>
  );
}
