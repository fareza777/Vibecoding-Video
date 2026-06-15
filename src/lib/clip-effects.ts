import { v4 as uuidv4 } from "uuid";
import type { ClipEffect, EffectType, TimelineClip } from "@/types/editor";

export interface EffectPreset {
  name: string;
  type: EffectType;
  params: Record<string, number | string | boolean>;
}

export const EFFECT_PRESETS: EffectPreset[] = [
  { name: "Fade In", type: "fade-in", params: { duration: 1 } },
  { name: "Fade Out", type: "fade-out", params: { duration: 1 } },
  { name: "Blur", type: "blur", params: { amount: 5 } },
  { name: "Brightness", type: "brightness", params: { amount: 1.2 } },
  { name: "Speed Ramp", type: "speed", params: { speed: 1.5 } },
  { name: "Zoom", type: "zoom", params: { scale: 1.2 } },
  { name: "Cross Dissolve", type: "transition", params: { duration: 0.5 } },
];

export const TEXT_PRESETS: Array<{
  label: string;
  text: string;
  position: "center" | "top" | "bottom";
  duration: number;
}> = [
  { label: "Title", text: "Judul Video", position: "center", duration: 4 },
  { label: "Subtitle", text: "Subjudul", position: "bottom", duration: 5 },
  { label: "Lower Third", text: "Nama · Jabatan", position: "bottom", duration: 6 },
  { label: "Caption", text: "Caption di sini", position: "bottom", duration: 4 },
  { label: "End Card", text: "Terima kasih!", position: "center", duration: 5 },
];

export function createClipEffect(
  type: EffectType,
  params: Record<string, number | string | boolean>
): ClipEffect {
  return {
    id: uuidv4(),
    type,
    params,
    enabled: true,
  };
}

export function appendEffectToClip(
  clip: TimelineClip,
  preset: EffectPreset
): ClipEffect[] {
  return [...clip.effects, createClipEffect(preset.type, preset.params)];
}

export function buildTextClip(
  preset: (typeof TEXT_PRESETS)[number],
  playhead: number
): Omit<TimelineClip, "id"> {
  return {
    assetId: "text-generated",
    trackId: "track-text-1",
    startTime: playhead,
    duration: preset.duration,
    trimStart: 0,
    trimEnd: preset.duration,
    label: preset.label,
    color: "#fbbf24",
    opacity: 1,
    volume: 1,
    effects: [
      createClipEffect("text-overlay", {
        text: preset.text,
        position: preset.position,
      }),
    ],
  };
}