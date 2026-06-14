"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  Maximize2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { computeClipVisualStyle } from "@/lib/effects-engine";
import { formatTime } from "@/lib/utils";
import { useEditorStore } from "@/store/editor-store";
import { PreviewCompositor } from "./PreviewCompositor";

export function PreviewPanel() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const setIsPlaying = useEditorStore((s) => s.setIsPlaying);
  const playhead = useEditorStore((s) => s.project.playhead);
  const setPlayhead = useEditorStore((s) => s.setPlayhead);
  const duration = useEditorStore((s) => s.project.duration);
  const clips = useEditorStore((s) => s.project.clips);
  const assets = useEditorStore((s) => s.project.assets);
  const fps = useEditorStore((s) => s.project.fps);
  const resolution = useEditorStore((s) => s.project.resolution);

  const activeClip = clips.find(
    (c) => playhead >= c.startTime && playhead < c.startTime + c.duration
  );
  const activeAsset = activeClip
    ? assets.find((a) => a.id === activeClip.assetId)
    : null;

  const visualStyle = activeClip
    ? computeClipVisualStyle(activeClip, playhead)
    : null;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeAsset || activeAsset.type !== "video") return;

    if (video.src !== activeAsset.url) {
      video.src = activeAsset.url;
    }

    const clipTime =
      playhead - (activeClip?.startTime ?? 0) + (activeClip?.trimStart ?? 0);
    if (Math.abs(video.currentTime - clipTime) > 0.1) {
      video.currentTime = clipTime;
    }

    if (visualStyle) {
      video.playbackRate = visualStyle.playbackRate;
    }
  }, [playhead, activeAsset, activeClip, visualStyle]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.play().catch(() => setIsPlaying(false));
    } else {
      video.pause();
    }
  }, [isPlaying, setIsPlaying]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || !activeClip || !isPlaying) return;

    const rate = visualStyle?.playbackRate ?? 1;
    const newPlayhead =
      activeClip.startTime +
      (video.currentTime - activeClip.trimStart) * rate;
    setPlayhead(newPlayhead);

    if (newPlayhead >= activeClip.startTime + activeClip.duration) {
      setIsPlaying(false);
    }
  }, [activeClip, isPlaying, setPlayhead, setIsPlaying, visualStyle]);

  const togglePlay = () => setIsPlaying(!isPlaying);

  const skip = (delta: number) => {
    setPlayhead(Math.max(0, Math.min(duration, playhead + delta)));
  };

  return (
    <div className="flex flex-1 flex-col min-w-0">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface/50">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="px-2 py-0.5 rounded bg-muted font-mono">
            {resolution.width}×{resolution.height}
          </span>
          <span className="px-2 py-0.5 rounded bg-muted font-mono">{fps} fps</span>
          {activeClip && (
            <span className="text-foreground font-medium truncate max-w-[200px]">
              {activeClip.label}
            </span>
          )}
          {activeClip && activeClip.effects.length > 0 && (
            <span className="px-2 py-0.5 rounded bg-track-effect/20 text-track-effect text-[10px]">
              {activeClip.effects.length} FX
            </span>
          )}
        </div>
        <Button variant="ghost" size="icon-sm" title="Fullscreen">
          <Maximize2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex-1 flex items-center justify-center preview-grid bg-[#080810] relative overflow-hidden">
        <PreviewCompositor
          activeClip={activeClip}
          activeAsset={activeAsset}
          allClips={clips}
          playhead={playhead}
          videoRef={videoRef}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
        />

        <div className="absolute bottom-3 left-3 px-2 py-1 rounded bg-black/60 text-[10px] font-mono text-white/80">
          PREVIEW
        </div>
      </div>

      <div className="flex items-center gap-3 px-4 py-2.5 border-t border-border bg-surface shrink-0">
        <Button variant="ghost" size="icon-sm" onClick={() => skip(-5)}>
          <SkipBack className="h-3.5 w-3.5" />
        </Button>

        <Button
          variant="secondary"
          size="icon"
          onClick={togglePlay}
          className="h-10 w-10 rounded-full"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4 ml-0.5" />
          )}
        </Button>

        <Button variant="ghost" size="icon-sm" onClick={() => skip(5)}>
          <SkipForward className="h-3.5 w-3.5" />
        </Button>

        <div className="flex-1 flex items-center gap-2 mx-2">
          <span className="text-xs font-mono text-foreground w-20 text-right">
            {formatTime(playhead)}
          </span>
          <input
            type="range"
            min={0}
            max={duration}
            step={0.01}
            value={playhead}
            onChange={(e) => setPlayhead(parseFloat(e.target.value))}
            className="flex-1 h-1 accent-accent cursor-pointer"
          />
          <span className="text-xs font-mono text-muted-foreground w-20">
            {formatTime(duration)}
          </span>
        </div>

        <Button variant="ghost" size="icon-sm">
          <Volume2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}