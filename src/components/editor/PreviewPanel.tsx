"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Loader2,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  computeClipVisualStyle,
  getActiveTextOverlays,
  styleToCss,
} from "@/lib/effects-engine";
import { cn, formatTime } from "@/lib/utils";
import { useEditorStore } from "@/store/editor-store";

const POSITION_CLASS = {
  center: "items-center justify-center",
  top: "items-start justify-center pt-[12%]",
  bottom: "items-end justify-center pb-[12%]",
} as const;

export function PreviewPanel() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const boundUrlRef = useRef<string | null>(null);
  const seekGuardRef = useRef(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

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

  const textOverlays = getActiveTextOverlays(clips, playhead);
  const showVideo = activeAsset?.type === "video";
  const showImage = activeAsset?.type === "image";
  const shouldBindVideo =
    showVideo && Boolean(activeAsset?.url) && (isPlaying || previewReady);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !showVideo || !activeAsset?.url) return;

    if (!shouldBindVideo) {
      if (boundUrlRef.current) {
        video.removeAttribute("src");
        video.load();
        boundUrlRef.current = null;
      }
      return;
    }

    if (boundUrlRef.current !== activeAsset.url) {
      video.preload = isPlaying ? "auto" : "metadata";
      video.src = activeAsset.url;
      boundUrlRef.current = activeAsset.url;
    }

    video.muted = isMuted;

    if (visualStyle) {
      video.playbackRate = visualStyle.playbackRate;
    }

    if (isPlaying || seekGuardRef.current) return;

    const clipTime =
      playhead - (activeClip?.startTime ?? 0) + (activeClip?.trimStart ?? 0);
    if (
      Number.isFinite(clipTime) &&
      video.readyState >= 1 &&
      Math.abs(video.currentTime - clipTime) > 0.12
    ) {
      seekGuardRef.current = true;
      video.currentTime = clipTime;
    }
  }, [
    playhead,
    activeAsset,
    activeClip,
    visualStyle,
    isPlaying,
    showVideo,
    shouldBindVideo,
    isMuted,
  ]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !showVideo || !shouldBindVideo) return;

    if (isPlaying) {
      video.play().catch(() => setIsPlaying(false));
    } else {
      video.pause();
    }
  }, [isPlaying, setIsPlaying, showVideo, shouldBindVideo]);

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

  const togglePlay = () => {
    if (!activeClip || !activeAsset) return;
    setPreviewReady(true);
    setIsPlaying(!isPlaying);
  };

  const skip = (delta: number) => {
    seekGuardRef.current = true;
    setPreviewReady(true);
    setIsPlaying(false);
    setPlayhead(Math.max(0, Math.min(duration, playhead + delta)));
  };

  const handleScrub = (value: number) => {
    seekGuardRef.current = true;
    setPreviewReady(true);
    setIsPlaying(false);
    setPlayhead(value);
  };

  const toggleFullscreen = async () => {
    const el = viewportRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch {
      // fullscreen not supported
    }
  };

  return (
    <div className="flex flex-1 flex-col min-w-0 min-h-0 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface/50 shrink-0 z-10">
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
        <Button
          variant="ghost"
          size="icon-sm"
          title="Fullscreen preview"
          onClick={toggleFullscreen}
        >
          {isFullscreen ? (
            <Minimize2 className="h-3.5 w-3.5" />
          ) : (
            <Maximize2 className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      <div
        ref={viewportRef}
        className="preview-viewport preview-grid bg-[#080810]"
      >
        <div className="preview-stage">
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden" style={{ aspectRatio: resolution.width / resolution.height }}>
            <video
              ref={videoRef}
              className={cn(
                "preview-media transition-[filter,opacity,transform] duration-100",
                showVideo && shouldBindVideo ? "block" : "hidden"
              )}
              style={showVideo && visualStyle ? styleToCss(visualStyle) : undefined}
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => setIsPlaying(false)}
              onWaiting={() => setIsBuffering(true)}
              onCanPlay={() => setIsBuffering(false)}
              onLoadedData={() => setIsBuffering(false)}
              onSeeked={() => {
                seekGuardRef.current = false;
              }}
              playsInline
              disablePictureInPicture
              preload="none"
            />

            {showVideo && !shouldBindVideo && activeAsset && (
              <div className="flex flex-col items-center gap-3 text-muted-foreground py-8 px-6 max-w-[280px]">
                <div className="h-16 w-16 rounded-2xl border border-cyan/20 bg-cyan/5 flex items-center justify-center">
                  <Play className="h-7 w-7 text-cyan/60 ml-1" />
                </div>
                <p className="text-xs text-center">{activeAsset.name}</p>
                <p className="text-[10px] text-center opacity-60">
                  Tekan Play untuk memuat preview
                </p>
              </div>
            )}

            {showImage && activeAsset && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={activeAsset.url}
                alt={activeAsset.name}
                className="preview-media transition-[filter,opacity,transform] duration-100"
                style={visualStyle ? styleToCss(visualStyle) : undefined}
              />
            )}

            {!activeClip && (
              <div className="flex flex-col items-center gap-3 text-muted-foreground py-8 px-6">
                <div className="h-20 w-20 rounded-2xl border-2 border-dashed border-border flex items-center justify-center">
                  <svg className="h-8 w-8 opacity-30" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <p className="text-sm font-medium">Preview Area</p>
                <p className="text-xs opacity-60 text-center">
                  Import media — otomatis masuk timeline
                </p>
              </div>
            )}

            {textOverlays.length > 0 && (
              <div className="absolute inset-0 pointer-events-none">
                {textOverlays.map((overlay) => (
                  <div
                    key={overlay.clipId}
                    className={cn(
                      "absolute inset-0 flex px-6",
                      POSITION_CLASS[overlay.position]
                    )}
                    style={{ opacity: overlay.opacity }}
                  >
                    <span className="text-white text-xl font-bold drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] text-center max-w-[90%]">
                      {overlay.text}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {isBuffering && showVideo && shouldBindVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none z-10">
            <Loader2 className="h-8 w-8 animate-spin text-cyan" />
          </div>
        )}

        <div className="absolute bottom-3 left-3 px-2 py-1 rounded bg-black/60 text-[10px] font-mono text-white/80 z-10 pointer-events-none">
          PREVIEW
        </div>
      </div>

      <div className="flex items-center gap-3 px-4 py-2.5 border-t border-border bg-surface shrink-0 z-10">
        <Button variant="ghost" size="icon-sm" onClick={() => skip(-5)}>
          <SkipBack className="h-3.5 w-3.5" />
        </Button>

        <Button
          variant="secondary"
          size="icon"
          onClick={togglePlay}
          className="h-10 w-10 rounded-full"
          disabled={!activeClip}
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

        <div className="flex-1 flex items-center gap-2 mx-2 min-w-0">
          <span className="text-xs font-mono text-foreground w-20 text-right shrink-0">
            {formatTime(playhead)}
          </span>
          <input
            type="range"
            min={0}
            max={duration}
            step={0.01}
            value={playhead}
            onChange={(e) => handleScrub(parseFloat(e.target.value))}
            className="flex-1 h-1 accent-accent cursor-pointer min-w-0"
          />
          <span className="text-xs font-mono text-muted-foreground w-20 shrink-0">
            {formatTime(duration)}
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setIsMuted((m) => !m)}
          title={isMuted ? "Unmute" : "Mute"}
          disabled={!showVideo}
        >
          {isMuted ? (
            <VolumeX className="h-3.5 w-3.5" />
          ) : (
            <Volume2 className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}