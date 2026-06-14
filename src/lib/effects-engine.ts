import type { CSSProperties } from "react";
import type { ClipEffect, TimelineClip } from "@/types/editor";

export interface ComputedVisualStyle {
  opacity: number;
  filter: string;
  transform: string;
  playbackRate: number;
}

const DEFAULT_STYLE: ComputedVisualStyle = {
  opacity: 1,
  filter: "none",
  transform: "none",
  playbackRate: 1,
};

export function getClipLocalTime(clip: TimelineClip, playhead: number): number {
  return Math.max(0, Math.min(clip.duration, playhead - clip.startTime));
}

export function computeClipVisualStyle(
  clip: TimelineClip,
  playhead: number
): ComputedVisualStyle {
  const localTime = getClipLocalTime(clip, playhead);
  const filters: string[] = [];
  let opacity = clip.opacity;
  let transform = "none";
  let playbackRate = 1;

  for (const effect of clip.effects) {
    if (!effect.enabled) continue;
    applyEffect(effect, localTime, clip.duration, {
      setOpacity: (v) => {
        opacity = v;
      },
      addFilter: (f) => filters.push(f),
      setTransform: (t) => {
        transform = t;
      },
      setPlaybackRate: (r) => {
        playbackRate = r;
      },
    });
  }

  return {
    opacity,
    filter: filters.length > 0 ? filters.join(" ") : "none",
    transform,
    playbackRate,
  };
}

function applyEffect(
  effect: ClipEffect,
  localTime: number,
  duration: number,
  ctx: {
    setOpacity: (v: number) => void;
    addFilter: (f: string) => void;
    setTransform: (t: string) => void;
    setPlaybackRate: (r: number) => void;
  }
): void {
  const params = effect.params;

  switch (effect.type) {
    case "fade-in": {
      const fadeDur = (params.duration as number) ?? 1;
      if (localTime < fadeDur) {
        ctx.setOpacity(Math.min(1, localTime / fadeDur));
      }
      break;
    }
    case "fade-out": {
      const fadeDur = (params.duration as number) ?? 1;
      const fadeStart = duration - fadeDur;
      if (localTime > fadeStart) {
        ctx.setOpacity(Math.max(0, (duration - localTime) / fadeDur));
      }
      break;
    }
    case "blur":
      ctx.addFilter(`blur(${(params.amount as number) ?? 5}px)`);
      break;
    case "brightness":
      ctx.addFilter(`brightness(${(params.value as number) ?? 1.2})`);
      break;
    case "contrast":
      ctx.addFilter(`contrast(${(params.value as number) ?? 1.2})`);
      break;
    case "saturation":
      ctx.addFilter(`saturate(${(params.value as number) ?? 1.3})`);
      break;
    case "zoom": {
      const scale = (params.scale as number) ?? 1.5;
      ctx.setTransform(`scale(${scale})`);
      break;
    }
    case "speed":
      ctx.setPlaybackRate((params.speed as number) ?? 1);
      break;
    default:
      break;
  }
}

export interface ActiveTextOverlay {
  clipId: string;
  text: string;
  position: "center" | "top" | "bottom";
  opacity: number;
}

export function getActiveTextOverlays(
  clips: TimelineClip[],
  playhead: number
): ActiveTextOverlay[] {
  return clips
    .filter(
      (c) =>
        playhead >= c.startTime &&
        playhead < c.startTime + c.duration &&
        c.effects.some((e) => e.type === "text-overlay" && e.enabled)
    )
    .map((clip) => {
      const overlay = clip.effects.find((e) => e.type === "text-overlay");
      const localTime = getClipLocalTime(clip, playhead);
      let opacity = clip.opacity;

      const fadeIn = clip.effects.find((e) => e.type === "fade-in" && e.enabled);
      if (fadeIn) {
        const d = (fadeIn.params.duration as number) ?? 1;
        if (localTime < d) opacity = localTime / d;
      }

      return {
        clipId: clip.id,
        text: (overlay?.params.text as string) ?? clip.label,
        position: ((overlay?.params.position as string) ?? "center") as
          | "center"
          | "top"
          | "bottom",
        opacity,
      };
    });
}

export function styleToCss(style: ComputedVisualStyle): CSSProperties {
  return {
    opacity: style.opacity,
    filter: style.filter,
    transform: style.transform,
  };
}