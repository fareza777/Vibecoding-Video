"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MIN_CLIP_DURATION,
  resolveClipMove,
  resolveClipResize,
} from "@/lib/timeline-utils";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/store/editor-store";
import type { MediaAsset, TimelineClip, TimelineTrack } from "@/types/editor";
import { WaveformDisplay } from "./WaveformDisplay";

type DragMode = "move" | "resize-left" | "resize-right" | null;

interface TimelineClipBlockProps {
  clip: TimelineClip;
  asset?: MediaAsset;
  track: TimelineTrack;
  pps: number;
  isSelected: boolean;
  timelineRef: React.RefObject<HTMLDivElement | null>;
  tracks: TimelineTrack[];
}

export function TimelineClipBlock({
  clip,
  asset,
  track,
  pps,
  isSelected,
  timelineRef,
  tracks,
}: TimelineClipBlockProps) {
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const dragStart = useRef({ x: 0, startTime: 0, duration: 0, trackId: "" });

  const updateClip = useEditorStore((s) => s.updateClip);
  const pushHistory = useEditorStore((s) => s.pushHistory);
  const setSelectedClip = useEditorStore((s) => s.setSelectedClip);
  const snapEnabled = useEditorStore((s) => s.snapEnabled);

  const width = clip.duration * pps;
  const showWaveform =
    Boolean(asset?.waveform) && (track.type === "audio" || track.type === "video");

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, mode: DragMode) => {
      if (track.locked) return;
      e.stopPropagation();
      e.preventDefault();

      setSelectedClip(clip.id);
      setDragMode(mode);
      dragStart.current = {
        x: e.clientX,
        startTime: clip.startTime,
        duration: clip.duration,
        trackId: clip.trackId,
      };
      pushHistory();
    },
    [clip.id, clip.startTime, clip.duration, clip.trackId, track.locked, setSelectedClip, pushHistory]
  );

  useEffect(() => {
    if (!dragMode) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStart.current.x;
      const deltaTime = deltaX / pps;

      if (dragMode === "move") {
        const newStart = dragStart.current.startTime + deltaTime;
        let newTrackId = dragStart.current.trackId;

        if (timelineRef.current) {
          const trackEls = timelineRef.current.querySelectorAll("[data-track-id]");
          const scrollContainer = timelineRef.current;
          const rect = scrollContainer.getBoundingClientRect();
          const y = e.clientY - rect.top + scrollContainer.scrollTop;

          let offset = 24;
          for (const el of trackEls) {
            const trackId = el.getAttribute("data-track-id");
            const h = (el as HTMLElement).offsetHeight;
            if (y >= offset && y < offset + h && trackId) {
              const targetTrack = tracks.find((t) => t.id === trackId);
              if (targetTrack && !targetTrack.locked) {
                newTrackId = trackId;
              }
              break;
            }
            offset += h;
          }
        }

        const { clips, duration: projectDuration, fps } =
          useEditorStore.getState().project;

        const updates = resolveClipMove(
          clip,
          newStart,
          newTrackId,
          clips,
          projectDuration,
          snapEnabled,
          fps
        );
        updateClip(clip.id, updates);
      } else {
        const { fps } = useEditorStore.getState().project;
        const updates = resolveClipResize(
          clip,
          dragMode === "resize-left" ? "left" : "right",
          deltaTime,
          snapEnabled,
          fps
        );
        if (updates) updateClip(clip.id, updates);
      }
    };

    const handleMouseUp = () => setDragMode(null);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragMode, pps, clip, snapEnabled, tracks, timelineRef, updateClip]);

  return (
    <div
      className={cn(
        "absolute top-1 bottom-1 rounded-md border group/clip",
        "flex items-center overflow-hidden select-none",
        dragMode ? "cursor-grabbing z-20" : "cursor-grab",
        isSelected
          ? "ring-2 ring-accent ring-offset-1 ring-offset-timeline-bg z-10"
          : "hover:brightness-110"
      )}
      style={{
        left: clip.startTime * pps,
        width: Math.max(width, MIN_CLIP_DURATION * pps),
        backgroundColor: clip.color + "40",
        borderColor: clip.color + "80",
      }}
      onMouseDown={(e) => handleMouseDown(e, "move")}
      onClick={(e) => e.stopPropagation()}
    >
      {showWaveform && (
        <WaveformDisplay
          waveform={asset?.waveform}
          width={width}
          height={track.height - 8}
          color={clip.color}
        />
      )}

      <div
        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover/clip:opacity-100 bg-white/20 rounded-l-md z-10"
        onMouseDown={(e) => handleMouseDown(e, "resize-left")}
      />

      <span className="relative z-[1] text-[10px] font-medium truncate text-white/90 px-2 pointer-events-none">
        {clip.label}
      </span>

      <div
        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover/clip:opacity-100 bg-white/20 rounded-r-md z-10"
        onMouseDown={(e) => handleMouseDown(e, "resize-right")}
      />
    </div>
  );
}