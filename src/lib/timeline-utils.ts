import type { TimelineClip, TimelineTrack } from "@/types/editor";

export const PIXELS_PER_SECOND = 40;
export const MIN_CLIP_DURATION = 0.1;
export const SNAP_INTERVAL = 0.1;

export function snapTime(time: number, enabled: boolean, fps = 30): number {
  if (!enabled) return Math.max(0, time);
  const frameInterval = 1 / fps;
  const interval = Math.min(SNAP_INTERVAL, frameInterval * 3);
  return Math.max(0, Math.round(time / interval) * interval);
}

export function getClipEnd(clip: TimelineClip): number {
  return clip.startTime + clip.duration;
}

export function clipsOverlap(a: TimelineClip, b: TimelineClip): boolean {
  if (a.trackId !== b.trackId || a.id === b.id) return false;
  return a.startTime < getClipEnd(b) && getClipEnd(a) > b.startTime;
}

export function findTrackAtY(
  tracks: TimelineTrack[],
  y: number,
  rulerHeight = 24
): TimelineTrack | null {
  let offset = rulerHeight;
  for (const track of tracks) {
    if (y >= offset && y < offset + track.height) return track;
    offset += track.height;
  }
  return null;
}

export function resolveClipMove(
  clip: TimelineClip,
  newStart: number,
  newTrackId: string,
  allClips: TimelineClip[],
  duration: number,
  snapEnabled: boolean,
  fps: number
): Partial<TimelineClip> {
  const snappedStart = snapTime(newStart, snapEnabled, fps);
  const maxStart = duration - clip.duration;
  const startTime = Math.max(0, Math.min(maxStart, snappedStart));

  const moved: TimelineClip = { ...clip, startTime, trackId: newTrackId };
  const hasCollision = allClips.some(
    (c) => c.id !== clip.id && clipsOverlap(moved, c)
  );

  if (hasCollision) {
    return { startTime: clip.startTime, trackId: clip.trackId };
  }

  return { startTime, trackId: newTrackId };
}

export function resolveClipResize(
  clip: TimelineClip,
  edge: "left" | "right",
  deltaTime: number,
  snapEnabled: boolean,
  fps: number
): Partial<TimelineClip> | null {
  if (edge === "left") {
    const rawStart = clip.startTime + deltaTime;
    const startTime = snapTime(rawStart, snapEnabled, fps);
    const delta = startTime - clip.startTime;
    if (delta === 0) return null;

    const newDuration = clip.duration - delta;
    if (newDuration < MIN_CLIP_DURATION) return null;

    const newTrimStart = clip.trimStart + delta;
    if (newTrimStart < 0) return null;

    return {
      startTime,
      duration: newDuration,
      trimStart: newTrimStart,
    };
  }

  const rawEnd = clip.startTime + clip.duration + deltaTime;
  const snappedEnd = snapTime(rawEnd, snapEnabled, fps);
  const duration = snappedEnd - clip.startTime;
  if (duration < MIN_CLIP_DURATION) return null;

  const trimEnd = clip.trimStart + duration;
  if (trimEnd > clip.trimEnd + 0.001) return null;

  return { duration, trimEnd };
}