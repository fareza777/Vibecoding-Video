import { v4 as uuidv4 } from "uuid";
import type { EditorProject, ExportSettings, TimelineTrack } from "@/types/editor";

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  resolution: { width: number; height: number };
  fps: 24 | 30 | 60;
  duration: number;
  exportSettings: ExportSettings;
}

const DEFAULT_TRACKS: TimelineTrack[] = [
  { id: "track-video-1", type: "video", name: "Video 1", locked: false, muted: false, visible: true, height: 64 },
  { id: "track-video-2", type: "video", name: "Video 2", locked: false, muted: false, visible: true, height: 64 },
  { id: "track-audio-1", type: "audio", name: "Audio 1", locked: false, muted: false, visible: true, height: 48 },
  { id: "track-text-1", type: "text", name: "Text / Titles", locked: false, muted: false, visible: true, height: 40 },
  { id: "track-effect-1", type: "effect", name: "Effects", locked: false, muted: false, visible: true, height: 40 },
];

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: "shorts",
    name: "Shorts / Reels",
    description: "Vertikal 9:16 untuk TikTok, Reels, dan YouTube Shorts.",
    resolution: { width: 1080, height: 1920 },
    fps: 30,
    duration: 45,
    exportSettings: {
      format: "mp4",
      quality: "high",
      resolution: "1080p",
      fps: 30,
      bakeEffects: true,
      mixAudioTracks: true,
    },
  },
  {
    id: "youtube",
    name: "YouTube 16:9",
    description: "Layout standar untuk video utama, tutorial, dan demo produk.",
    resolution: { width: 1920, height: 1080 },
    fps: 30,
    duration: 180,
    exportSettings: {
      format: "mp4",
      quality: "high",
      resolution: "1080p",
      fps: 30,
      bakeEffects: true,
      mixAudioTracks: true,
    },
  },
  {
    id: "podcast",
    name: "Podcast Clip",
    description: "Siap untuk highlight quote, subtitle besar, dan cut cepat.",
    resolution: { width: 1080, height: 1350 },
    fps: 30,
    duration: 60,
    exportSettings: {
      format: "mp4",
      quality: "high",
      resolution: "1080p",
      fps: 30,
      bakeEffects: true,
      mixAudioTracks: true,
    },
  },
  {
    id: "webinar",
    name: "Webinar Cutdown",
    description: "Cocok untuk webinar recap, highlight meeting, dan materi repurpose.",
    resolution: { width: 1920, height: 1080 },
    fps: 24,
    duration: 240,
    exportSettings: {
      format: "mp4",
      quality: "standard",
      resolution: "1080p",
      fps: 24,
      bakeEffects: true,
      mixAudioTracks: true,
    },
  },
];

export function createProjectFromTemplate(template: ProjectTemplate): {
  project: EditorProject;
  exportSettings: ExportSettings;
} {
  const now = Date.now();
  return {
    project: {
      id: uuidv4(),
      name: template.name,
      createdAt: now,
      updatedAt: now,
      duration: template.duration,
      fps: template.fps,
      resolution: template.resolution,
      assets: [],
      tracks: DEFAULT_TRACKS.map((track) => ({ ...track })),
      clips: [],
      playhead: 0,
      zoom: 1,
    },
    exportSettings: { ...template.exportSettings },
  };
}
