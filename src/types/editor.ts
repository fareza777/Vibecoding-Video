export type MediaType = "video" | "audio" | "image";

export interface MediaAsset {
  id: string;
  name: string;
  type: MediaType;
  url: string;
  duration: number;
  width?: number;
  height?: number;
  thumbnail?: string;
  waveform?: number[];
  size: number;
  createdAt: number;
}

export type TrackType = "video" | "audio" | "text" | "effect";

export interface TimelineClip {
  id: string;
  assetId: string;
  trackId: string;
  startTime: number;
  duration: number;
  trimStart: number;
  trimEnd: number;
  label: string;
  color: string;
  opacity: number;
  volume: number;
  effects: ClipEffect[];
}

export interface ClipEffect {
  id: string;
  type: EffectType;
  params: Record<string, number | string | boolean>;
  enabled: boolean;
}

export type EffectType =
  | "fade-in"
  | "fade-out"
  | "blur"
  | "brightness"
  | "contrast"
  | "saturation"
  | "speed"
  | "zoom"
  | "crop"
  | "text-overlay"
  | "transition";

export interface TimelineTrack {
  id: string;
  type: TrackType;
  name: string;
  locked: boolean;
  muted: boolean;
  visible: boolean;
  height: number;
}

export interface VibeMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  actions?: VibeAction[];
  status?: "pending" | "applied" | "failed";
}

export interface VibeAction {
  id: string;
  type: string;
  description: string;
  params: Record<string, unknown>;
  applied: boolean;
}

export interface EditorProject {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  duration: number;
  fps: number;
  resolution: { width: number; height: number };
  assets: MediaAsset[];
  tracks: TimelineTrack[];
  clips: TimelineClip[];
  playhead: number;
  zoom: number;
}

export interface HistoryEntry {
  clips: TimelineClip[];
  selectedClipId: string | null;
}

export type PanelId = "media" | "effects" | "text" | "audio";

export interface ExportSettings {
  format: "mp4" | "webm" | "mov";
  quality: "draft" | "standard" | "high" | "ultra";
  resolution: "720p" | "1080p" | "4k";
  fps: 24 | 30 | 60;
}

export type AiModel = "MiniMax-M3" | "MiniMax-M2.5" | "MiniMax-M2.1";

export interface AiSettings {
  enabled: boolean;
  apiKey: string;
  model: AiModel;
  provider: "minimax";
}

export interface VibecodingContext {
  projectName: string;
  duration: number;
  fps: number;
  resolution: { width: number; height: number };
  playhead: number;
  selectedClipId: string | null;
  tracks: Array<{ id: string; name: string; type: TrackType }>;
  clips: Array<{
    id: string;
    label: string;
    trackId: string;
    assetId: string;
    startTime: number;
    duration: number;
    trimStart: number;
    trimEnd: number;
    volume: number;
    effects: string[];
  }>;
  assets: Array<{ id: string; name: string; type: MediaType; duration: number }>;
}

export interface VibecodingApiResponse {
  message: string;
  actions: Array<{
    type: string;
    description: string;
    params: Record<string, unknown>;
  }>;
  source: "minimax" | "local";
}