import type { EditorProject } from "@/types/editor";
import type { VibecodingContext } from "@/types/editor";

export function buildVibecodingContext(
  project: EditorProject,
  selectedClipId: string | null
): VibecodingContext {
  return {
    projectName: project.name,
    duration: project.duration,
    fps: project.fps,
    resolution: project.resolution,
    playhead: project.playhead,
    selectedClipId,
    tracks: project.tracks.map((t) => ({
      id: t.id,
      name: t.name,
      type: t.type,
    })),
    clips: project.clips.map((c) => ({
      id: c.id,
      label: c.label,
      trackId: c.trackId,
      assetId: c.assetId,
      startTime: c.startTime,
      duration: c.duration,
      trimStart: c.trimStart,
      trimEnd: c.trimEnd,
      volume: c.volume,
      effects: c.effects.map((e) => e.type),
    })),
    assets: project.assets.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      duration: a.duration,
    })),
  };
}