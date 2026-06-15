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
  { name: "Fade In 2s", type: "fade-in", params: { duration: 2 } },
  { name: "Fade Out 2s", type: "fade-out", params: { duration: 2 } },
  { name: "Blur", type: "blur", params: { amount: 5 } },
  { name: "Blur Kuat", type: "blur", params: { amount: 12 } },
  { name: "Brightness", type: "brightness", params: { value: 1.25 } },
  { name: "Gelap", type: "brightness", params: { value: 0.75 } },
  { name: "Contrast", type: "contrast", params: { value: 1.35 } },
  { name: "Saturation", type: "saturation", params: { value: 1.4 } },
  { name: "B&W", type: "saturation", params: { value: 0 } },
  { name: "Lambat 0.5x", type: "speed", params: { speed: 0.5 } },
  { name: "Normal 1x", type: "speed", params: { speed: 1 } },
  { name: "Cepat 1.5x", type: "speed", params: { speed: 1.5 } },
  { name: "Cepat 2x", type: "speed", params: { speed: 2 } },
  { name: "Zoom In", type: "zoom", params: { scale: 1.25 } },
  { name: "Zoom Out", type: "zoom", params: { scale: 0.85 } },
  { name: "Cross Dissolve", type: "transition", params: { duration: 0.5 } },
];

export const EFFECT_TYPE_LABELS: Record<string, string> = {
  "fade-in": "Fade In",
  "fade-out": "Fade Out",
  blur: "Blur",
  brightness: "Brightness",
  contrast: "Contrast",
  saturation: "Saturation",
  speed: "Speed",
  zoom: "Zoom",
  transition: "Transition",
  "text-overlay": "Teks",
};

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

export function removeEffectFromClip(
  clip: TimelineClip,
  effectId: string
): ClipEffect[] {
  return clip.effects.filter((e) => e.id !== effectId);
}

export function toggleEffectOnClip(
  clip: TimelineClip,
  effectId: string
): ClipEffect[] {
  return clip.effects.map((e) =>
    e.id === effectId ? { ...e, enabled: !e.enabled } : e
  );
}

export function upsertSpeedEffect(
  clip: TimelineClip,
  speed: number
): ClipEffect[] {
  const withoutSpeed = clip.effects.filter((e) => e.type !== "speed");
  return [...withoutSpeed, createClipEffect("speed", { speed })];
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