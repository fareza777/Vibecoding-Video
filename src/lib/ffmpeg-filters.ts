import type { ExportSettings, TimelineClip } from "@/types/editor";

const RESOLUTION_MAP = {
  "720p": { width: 1280, height: 720 },
  "1080p": { width: 1920, height: 1080 },
  "4k": { width: 3840, height: 2160 },
} as const;

export function getResolutionDimensions(settings: ExportSettings): {
  width: number;
  height: number;
} {
  return RESOLUTION_MAP[settings.resolution];
}

export function getScaleFilter(settings: ExportSettings): string {
  const { width, height } = getResolutionDimensions(settings);
  return `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`;
}

export function getClipSpeedMultiplier(clip: TimelineClip): number {
  const speedEffect = clip.effects.find((e) => e.enabled && e.type === "speed");
  if (!speedEffect) return 1;
  const speed = speedEffect.params.speed as number;
  return speed > 0 ? speed : 1;
}

export function buildClipVideoFilter(
  clip: TimelineClip,
  settings: ExportSettings
): string {
  const { width, height } = getResolutionDimensions(settings);
  const filters: string[] = [
    `scale=${width}:${height}:force_original_aspect_ratio=decrease`,
    `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`,
  ];

  let hasFade = false;

  for (const effect of clip.effects) {
    if (!effect.enabled) continue;
    const params = effect.params;

    switch (effect.type) {
      case "blur":
        filters.push(`gblur=sigma=${((params.amount as number) ?? 5) / 2}`);
        break;
      case "brightness":
        filters.push(`eq=brightness=${((params.value as number) ?? 1.2) - 1}`);
        break;
      case "contrast":
        filters.push(`eq=contrast=${(params.value as number) ?? 1.2}`);
        break;
      case "saturation":
        filters.push(`eq=saturation=${(params.value as number) ?? 1.3}`);
        break;
      case "zoom": {
        const scale = (params.scale as number) ?? 1.5;
        filters.push(`scale=iw*${scale}:ih*${scale}`);
        filters.push(`crop=${width}:${height}:(iw-${width})/2:(ih-${height})/2`);
        break;
      }
      case "fade-in":
      case "fade-out":
        hasFade = true;
        break;
      case "text-overlay": {
        const text = escapeDrawtext((params.text as string) ?? clip.label);
        const fontSize = Math.max(24, Math.round(height * 0.05));
        const y = positionToDrawtextY((params.position as string) ?? "center");
        filters.push(
          `drawtext=text='${text}':fontsize=${fontSize}:fontcolor=white@0.95:x=(w-text_w)/2:y=${y}:shadowcolor=black@0.85:shadowx=2:shadowy=2`
        );
        break;
      }
      default:
        break;
    }
  }

  if (clip.opacity < 1 && !hasFade) {
    filters.push(`colorchannelmixer=aa=${clip.opacity}`);
  }

  for (const effect of clip.effects) {
    if (!effect.enabled) continue;

    if (effect.type === "fade-in") {
      const duration = (effect.params.duration as number) ?? 1;
      filters.push(`fade=t=in:st=0:d=${duration}`);
    }

    if (effect.type === "fade-out") {
      const duration = (effect.params.duration as number) ?? 1;
      const start = Math.max(0, clip.duration - duration);
      filters.push(`fade=t=out:st=${start}:d=${duration}`);
    }
  }

  const speed = getClipSpeedMultiplier(clip);
  if (speed !== 1) {
    filters.push(`setpts=PTS/${speed}`);
  }

  return filters.join(",");
}

export function buildAudioFilter(clip: TimelineClip): string | null {
  const speed = getClipSpeedMultiplier(clip);
  if (speed === 1) return null;

  const filters: string[] = [];
  let remaining = speed;

  while (remaining > 2) {
    filters.push("atempo=2");
    remaining /= 2;
  }
  while (remaining < 0.5) {
    filters.push("atempo=0.5");
    remaining /= 0.5;
  }
  if (remaining !== 1) {
    filters.push(`atempo=${remaining}`);
  }

  return filters.join(",");
}

function escapeDrawtext(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/:/g, "\\:")
    .replace(/%/g, "\\%");
}

function positionToDrawtextY(position: string): string {
  switch (position) {
    case "top":
      return "h*0.12";
    case "bottom":
      return "h*0.88-text_h";
    default:
      return "(h-text_h)/2";
  }
}