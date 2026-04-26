"use client";

import { Minus, Plus, X } from "lucide-react";
import type { MessageAttachment } from "@/hooks/use-direct-messages";

export function ImagePreviewModal({
  attachment,
  zoom,
  onClose,
  onZoomIn,
  onZoomOut,
}: {
  attachment: MessageAttachment;
  zoom: number;
  onClose: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
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
            event.stopPropagation();
            onZoomIn();
          }}
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-900 shadow-lg transition-transform hover:scale-[1.02]"
          aria-label="Zoom in"
        >
          <Plus className="h-7 w-7" />
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onZoomOut();
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
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "center center",
            }}
          />
        </div>
      </div>
    </div>
  );
}
