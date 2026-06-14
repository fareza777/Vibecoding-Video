"use client";

import type { RefObject } from "react";
import {
  computeClipVisualStyle,
  getActiveTextOverlays,
  styleToCss,
} from "@/lib/effects-engine";
import { cn } from "@/lib/utils";
import type { MediaAsset, TimelineClip } from "@/types/editor";

interface PreviewCompositorProps {
  activeClip: TimelineClip | null | undefined;
  activeAsset: MediaAsset | null | undefined;
  allClips: TimelineClip[];
  playhead: number;
  videoRef: RefObject<HTMLVideoElement | null>;
  onTimeUpdate: () => void;
  onEnded: () => void;
}

const POSITION_CLASS = {
  center: "items-center justify-center",
  top: "items-start justify-center pt-[12%]",
  bottom: "items-end justify-center pb-[12%]",
} as const;

export function PreviewCompositor({
  activeClip,
  activeAsset,
  allClips,
  playhead,
  videoRef,
  onTimeUpdate,
  onEnded,
}: PreviewCompositorProps) {
  const visualStyle = activeClip
    ? computeClipVisualStyle(activeClip, playhead)
    : null;

  const textOverlays = getActiveTextOverlays(allClips, playhead);

  if (activeAsset?.type === "video") {
    return (
      <div className="relative max-h-full max-w-full overflow-hidden shadow-2xl">
        <video
          ref={videoRef}
          className="max-h-full max-w-full object-contain transition-[filter,opacity,transform] duration-100"
          style={visualStyle ? styleToCss(visualStyle) : undefined}
          onTimeUpdate={onTimeUpdate}
          onEnded={onEnded}
        />
        <TextOverlayLayer overlays={textOverlays} />
      </div>
    );
  }

  if (activeAsset?.type === "image") {
    return (
      <div className="relative max-h-full max-w-full overflow-hidden shadow-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={activeAsset.url}
          alt={activeAsset.name}
          className="max-h-full max-w-full object-contain transition-[filter,opacity,transform] duration-100"
          style={visualStyle ? styleToCss(visualStyle) : undefined}
        />
        <TextOverlayLayer overlays={textOverlays} />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 text-muted-foreground">
      <div className="h-24 w-24 rounded-2xl border-2 border-dashed border-border flex items-center justify-center">
        <svg className="h-10 w-10 opacity-30" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-sm font-medium">Preview Area</p>
        <p className="text-xs mt-1 opacity-60">
          Import media & add to timeline to preview
        </p>
      </div>
      {textOverlays.length > 0 && (
        <div className="relative w-64 h-36 border border-border rounded-lg overflow-hidden bg-black/40">
          <TextOverlayLayer overlays={textOverlays} />
        </div>
      )}
    </div>
  );
}

function TextOverlayLayer({
  overlays,
}: {
  overlays: ReturnType<typeof getActiveTextOverlays>;
}) {
  if (overlays.length === 0) return null;

  return (
    <>
      {overlays.map((overlay) => (
        <div
          key={overlay.clipId}
          className={cn(
            "absolute inset-0 flex pointer-events-none px-6",
            POSITION_CLASS[overlay.position]
          )}
          style={{ opacity: overlay.opacity }}
        >
          <span className="text-white text-2xl font-bold drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] text-center max-w-[90%]">
            {overlay.text}
          </span>
        </div>
      ))}
    </>
  );
}