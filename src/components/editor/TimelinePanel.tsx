"use client";

import { useCallback, useRef } from "react";
import {
  Lock,
  Minus,
  Plus,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatTime } from "@/lib/utils";
import { useEditorStore } from "@/store/editor-store";
import type { TimelineTrack } from "@/types/editor";

const TRACK_COLORS: Record<string, string> = {
  video: "bg-track-video/20 border-track-video/40",
  audio: "bg-track-audio/20 border-track-audio/40",
  text: "bg-track-text/20 border-track-text/40",
  effect: "bg-track-effect/20 border-track-effect/40",
};

const PIXELS_PER_SECOND = 40;

export function TimelinePanel() {
  const timelineRef = useRef<HTMLDivElement>(null);
  const tracks = useEditorStore((s) => s.project.tracks);
  const clips = useEditorStore((s) => s.project.clips);
  const playhead = useEditorStore((s) => s.project.playhead);
  const duration = useEditorStore((s) => s.project.duration);
  const zoom = useEditorStore((s) => s.project.zoom);
  const setPlayhead = useEditorStore((s) => s.setPlayhead);
  const setTimelineZoom = useEditorStore((s) => s.setTimelineZoom);
  const selectedClipId = useEditorStore((s) => s.selectedClipId);
  const setSelectedClip = useEditorStore((s) => s.setSelectedClip);
  const timelineHeight = useEditorStore((s) => s.timelineHeight);

  const pps = PIXELS_PER_SECOND * zoom;
  const totalWidth = duration * pps;

  const handleTimelineClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left + (timelineRef.current?.scrollLeft ?? 0);
      const time = x / pps;
      setPlayhead(Math.max(0, Math.min(duration, time)));
    },
    [pps, duration, setPlayhead]
  );

  const rulerMarks = [];
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
        <span className="text-xs font-medium text-muted-foreground">Timeline</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setTimelineZoom(zoom - 0.25)}
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
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="w-[140px] shrink-0 border-r border-border bg-surface">
          <div className="h-6 border-b border-border" />
          {tracks.map((track) => (
            <TrackLabel key={track.id} track={track} />
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
                className={cn(
                  "relative border-b border-border/50",
                  TRACK_COLORS[track.type]
                )}
                style={{ height: track.height }}
              >
                {clips
                  .filter((c) => c.trackId === track.id)
                  .map((clip) => (
                    <div
                      key={clip.id}
                      className={cn(
                        "absolute top-1 bottom-1 rounded-md border cursor-pointer transition-all",
                        "flex items-center px-2 overflow-hidden",
                        selectedClipId === clip.id
                          ? "ring-2 ring-accent ring-offset-1 ring-offset-timeline-bg z-10"
                          : "hover:brightness-110"
                      )}
                      style={{
                        left: clip.startTime * pps,
                        width: clip.duration * pps,
                        backgroundColor: clip.color + "40",
                        borderColor: clip.color + "80",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedClip(clip.id);
                      }}
                    >
                      <span className="text-[10px] font-medium truncate text-white/90">
                        {clip.label}
                      </span>
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
    </div>
  );
}

function TrackLabel({ track }: { track: TimelineTrack }) {
  return (
    <div
      className="flex items-center gap-1.5 px-2 border-b border-border/50 text-[10px]"
      style={{ height: track.height }}
    >
      <button className="text-muted-foreground hover:text-foreground">
        {track.muted ? (
          <VolumeX className="h-3 w-3" />
        ) : (
          <Volume2 className="h-3 w-3" />
        )}
      </button>
      <button className="text-muted-foreground hover:text-foreground">
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