"use client";

import {
  FileArchive,
  FileSpreadsheet,
  FileText,
  Presentation,
} from "lucide-react";
import { ImageAttachmentTile } from "@/components/chat/image-attachment-tile";
import type { MessageAttachment } from "@/hooks/use-direct-messages";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getImageAttachmentRows(images: MessageAttachment[]) {
  if (images.length <= 1) return [images];
  if (images.length === 2) return [images];
  if (images.length === 3) return [images];
  if (images.length === 4) return [images.slice(0, 2), images.slice(2, 4)];
  return [images.slice(0, 3), images.slice(3, 5)];
}

function getDocAccent(mimeType: string) {
  if (mimeType === "application/pdf") {
    return {
      icon: "text-rose-500 dark:text-rose-400",
    };
  }

  if (
    mimeType === "text/csv" ||
    mimeType.includes("sheet") ||
    mimeType.includes("excel")
  ) {
    return {
      icon: "text-emerald-500 dark:text-emerald-400",
    };
  }

  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) {
    return {
      icon: "text-orange-500 dark:text-orange-400",
    };
  }

  if (mimeType.includes("zip")) {
    return {
      icon: "text-amber-500 dark:text-amber-400",
    };
  }

  return {
    icon: "text-slate-500 dark:text-slate-300",
  };
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
  ) {
    return <FileSpreadsheet className={className} />;
  }
  if (mimeType.includes("zip")) return <FileArchive className={className} />;
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) {
    return <Presentation className={className} />;
  }
  return <FileText className={className} />;
}

export function AttachmentDisplay({
  attachments,
  isOwn,
  imageClassName,
  docClassName,
  onPreviewImage,
}: {
  attachments: MessageAttachment[];
  isOwn: boolean;
  imageClassName?: string;
  docClassName?: string;
  onPreviewImage?: (attachment: MessageAttachment) => void;
}) {
  if (attachments.length === 0) return null;

  const images = attachments.filter((a) => a.attachmentType === "IMAGE");
  const docs = attachments.filter((a) => a.attachmentType !== "IMAGE");
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
                  <p
                    className={`truncate text-[13px] font-semibold leading-tight ${isOwn ? "text-white" : "text-slate-900 dark:text-slate-100"}`}
                  >
                    {doc.name}
                  </p>
                  <p
                    className={`mt-0.5 text-[11px] ${isOwn ? "text-blue-200/80" : "text-slate-400 dark:text-slate-500"}`}
                  >
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
                isOwn
                  ? "bg-white/12"
                  : "bg-white ring-1 ring-slate-200 dark:bg-white/10 dark:ring-white/8"
              }`}
            >
              <DocIconByMime
                mimeType={doc.mimeType}
                className={`h-5 w-5 shrink-0 ${isOwn ? "text-blue-100" : docAccent.icon}`}
              />
            </div>
            <div className="min-w-0">
              <p
                className={`truncate text-[12px] font-semibold leading-tight ${isOwn ? "text-white" : "text-slate-800 dark:text-slate-100"}`}
              >
                {doc.name}
              </p>
              <p
                className={`mt-1 text-[10px] ${isOwn ? "text-blue-200" : "text-slate-400 dark:text-slate-500"}`}
              >
                {formatBytes(doc.sizeBytes)} · {docLabel}
              </p>
            </div>
          </a>
        );
      })}
    </div>
  );
}
