"use client";

import { useCallback, useRef } from "react";
import {
  Lock,
  Magnet,
  Minus,
  Plus,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatTime } from "@/lib/utils";
import { PIXELS_PER_SECOND } from "@/lib/timeline-utils";
import { useEditorStore } from "@/store/editor-store";
import type { TimelineTrack } from "@/types/editor";
import { TimelineClipBlock } from "./TimelineClipBlock";

const TRACK_COLORS: Record<string, string> = {
  video: "bg-track-video/20 border-track-video/40",
  audio: "bg-track-audio/20 border-track-audio/40",
  text: "bg-track-text/20 border-track-text/40",
  effect: "bg-track-effect/20 border-track-effect/40",
};

export function TimelinePanel() {
  const timelineRef = useRef<HTMLDivElement>(null);
  const tracks = useEditorStore((s) => s.project.tracks);
  const clips = useEditorStore((s) => s.project.clips);
  const assets = useEditorStore((s) => s.project.assets);
  const playhead = useEditorStore((s) => s.project.playhead);
  const duration = useEditorStore((s) => s.project.duration);
  const zoom = useEditorStore((s) => s.project.zoom);
  const setPlayhead = useEditorStore((s) => s.setPlayhead);
  const setTimelineZoom = useEditorStore((s) => s.setTimelineZoom);
  const selectedClipId = useEditorStore((s) => s.selectedClipId);
  const timelineHeight = useEditorStore((s) => s.timelineHeight);
  const snapEnabled = useEditorStore((s) => s.snapEnabled);
  const toggleSnap = useEditorStore((s) => s.toggleSnap);
  const updateTrack = useEditorStore((s) => s.updateTrack);

  const pps = PIXELS_PER_SECOND * zoom;
  const totalWidth = duration * pps;

  const handleTimelineClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest("[data-clip-block]")) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left + (timelineRef.current?.scrollLeft ?? 0);
      const time = x / pps;
      setPlayhead(Math.max(0, Math.min(duration, time)));
    },
    [pps, duration, setPlayhead]
  );

  const rulerMarks: number[] = [];
  const interval = zoom >= 2 ? 1 : zoom >= 1 ? 5 : 10;
  for (let t = 0; t <= duration; t += interval) {
    rulerMarks.push(t);
  }

  return (
    <div
      className="flex flex-col border-t border-border bg-timeline-bg shrink-0"
      style={{ height: timelineHeight }}
    >
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-surface">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Timeline</span>
          <Button
            variant={snapEnabled ? "cyan" : "ghost"}
            size="sm"
            onClick={toggleSnap}
            title="Toggle snap (N)"
            className="h-6 px-2 text-[10px]"
          >
            <Magnet className="h-3 w-3" />
            Snap
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setTimelineZoom(zoom - 0.25)}
            title="Zoom out (Ctrl+-)"
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="text-[10px] font-mono text-muted-foreground w-10 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setTimelineZoom(zoom + 0.25)}
            title="Zoom in (Ctrl++)"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="w-[140px] shrink-0 border-r border-border bg-surface">
          <div className="h-6 border-b border-border" />
          {tracks.map((track) => (
            <TrackLabel key={track.id} track={track} onUpdate={updateTrack} />
          ))}
        </div>

        <div
          ref={timelineRef}
          className="flex-1 overflow-x-auto overflow-y-hidden relative"
          onClick={handleTimelineClick}
        >
          <div style={{ width: totalWidth, minWidth: "100%" }}>
            <div className="h-6 border-b border-border relative bg-surface/50 sticky top-0 z-10">
              {rulerMarks.map((t) => (
                <div
                  key={t}
                  className="absolute top-0 h-full flex flex-col items-start"
                  style={{ left: t * pps }}
                >
                  <div className="w-px h-2 timeline-ruler-tick" />
                  <span className="text-[9px] font-mono text-muted-foreground ml-0.5 -mt-0.5">
                    {formatTime(t)}
                  </span>
                </div>
              ))}
            </div>

            {tracks.map((track) => (
              <div
                key={track.id}
                data-track-id={track.id}
                className={cn(
                  "relative border-b border-border/50",
                  TRACK_COLORS[track.type]
                )}
                style={{ height: track.height }}
              >
                {clips
                  .filter((c) => c.trackId === track.id)
                  .map((clip) => (
                    <div key={clip.id} data-clip-block>
                      <TimelineClipBlock
                        clip={clip}
                        asset={assets.find((a) => a.id === clip.assetId)}
                        track={track}
                        pps={pps}
                        isSelected={selectedClipId === clip.id}
                        timelineRef={timelineRef}
                        tracks={tracks}
                      />
                    </div>
                  ))}
              </div>
            ))}

            <div
              className="absolute top-0 bottom-0 w-0.5 bg-accent z-20 pointer-events-none"
              style={{ left: playhead * pps }}
            >
              <div className="absolute -top-0 -left-1.5 w-3 h-3 bg-accent rotate-45 -translate-y-1" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 px-3 py-1 border-t border-border/50 bg-surface/30">
        <span className="text-[9px] text-muted-foreground font-mono">
          <kbd className="px-1 py-0.5 rounded bg-muted text-[8px]">Space</kbd> Play
        </span>
        <span className="text-[9px] text-muted-foreground font-mono">
          <kbd className="px-1 py-0.5 rounded bg-muted text-[8px]">S</kbd> Split
        </span>
        <span className="text-[9px] text-muted-foreground font-mono">
          <kbd className="px-1 py-0.5 rounded bg-muted text-[8px]">Del</kbd> Delete
        </span>
        <span className="text-[9px] text-muted-foreground font-mono">
          <kbd className="px-1 py-0.5 rounded bg-muted text-[8px]">J/K/L</kbd> Shuttle
        </span>
        <span className="text-[9px] text-muted-foreground font-mono">
          <kbd className="px-1 py-0.5 rounded bg-muted text-[8px]">Ctrl+Z</kbd> Undo
        </span>
      </div>
    </div>
  );
}

function TrackLabel({
  track,
  onUpdate,
}: {
  track: TimelineTrack;
  onUpdate: (id: string, updates: Partial<TimelineTrack>) => void;
}) {
  return (
    <div
      className="flex items-center gap-1.5 px-2 border-b border-border/50 text-[10px]"
      style={{ height: track.height }}
    >
      <button
        className="text-muted-foreground hover:text-foreground"
        onClick={() => onUpdate(track.id, { muted: !track.muted })}
      >
        {track.muted ? (
          <VolumeX className="h-3 w-3" />
        ) : (
          <Volume2 className="h-3 w-3" />
        )}
      </button>
      <button
        className="text-muted-foreground hover:text-foreground"
        onClick={() => onUpdate(track.id, { visible: !track.visible })}
      >
        {track.visible ? (
          <Eye className="h-3 w-3" />
        ) : (
          <EyeOff className="h-3 w-3" />
        )}
      </button>
      {track.locked && <Lock className="h-3 w-3 text-muted-foreground" />}
      <span className="truncate text-muted-foreground font-medium">
        {track.name}
      </span>
    </div>
  );
}