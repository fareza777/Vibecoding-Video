import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import type {
  EditorProject,
  ExportSettings,
  MediaAsset,
  PanelId,
  TimelineClip,
  TimelineTrack,
  VibeMessage,
} from "@/types/editor";

const DEFAULT_TRACKS: TimelineTrack[] = [
  { id: "track-video-1", type: "video", name: "Video 1", locked: false, muted: false, visible: true, height: 64 },
  { id: "track-video-2", type: "video", name: "Video 2", locked: false, muted: false, visible: true, height: 64 },
  { id: "track-audio-1", type: "audio", name: "Audio 1", locked: false, muted: false, visible: true, height: 48 },
  { id: "track-text-1", type: "text", name: "Text / Titles", locked: false, muted: false, visible: true, height: 40 },
  { id: "track-effect-1", type: "effect", name: "Effects", locked: false, muted: false, visible: true, height: 40 },
];

const INITIAL_MESSAGES: VibeMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    content:
      "Selamat datang di **Vibecoding Video**! 🎬\n\nSaya asisten editing Anda. Cukup jelaskan apa yang ingin Anda lakukan dengan bahasa natural:\n\n• *\"Potong bagian 0:30 sampai 1:15\"*\n• *\"Tambahkan fade in di awal clip\"*\n• *\"Percepat video 1.5x di menit ke-2\"*\n• *\"Tambahkan teks 'Subscribe!' di detik ke-5\"*\n• *\"Export dalam 1080p 30fps\"*\n\nImport media dari panel kiri, lalu beri instruksi saya!",
    timestamp: Date.now(),
    status: "applied",
  },
];

interface EditorState {
  project: EditorProject;
  isPlaying: boolean;
  activePanel: PanelId;
  selectedClipId: string | null;
  vibecodingMessages: VibeMessage[];
  isVibecodingProcessing: boolean;
  exportSettings: ExportSettings;
  sidebarWidth: number;
  vibecodingWidth: number;
  timelineHeight: number;

  setProjectName: (name: string) => void;
  setPlayhead: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setActivePanel: (panel: PanelId) => void;
  setSelectedClip: (clipId: string | null) => void;
  setTimelineZoom: (zoom: number) => void;
  addAsset: (asset: MediaAsset) => void;
  removeAsset: (assetId: string) => void;
  addClip: (clip: Omit<TimelineClip, "id">) => void;
  updateClip: (clipId: string, updates: Partial<TimelineClip>) => void;
  removeClip: (clipId: string) => void;
  addVibeMessage: (message: Omit<VibeMessage, "id" | "timestamp">) => void;
  setVibecodingProcessing: (processing: boolean) => void;
  setExportSettings: (settings: Partial<ExportSettings>) => void;
}

function createDefaultProject(): EditorProject {
  return {
    id: uuidv4(),
    name: "Untitled Project",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    duration: 120,
    fps: 30,
    resolution: { width: 1920, height: 1080 },
    assets: [],
    tracks: DEFAULT_TRACKS,
    clips: [],
    playhead: 0,
    zoom: 1,
  };
}

export const useEditorStore = create<EditorState>((set) => ({
  project: createDefaultProject(),
  isPlaying: false,
  activePanel: "media",
  selectedClipId: null,
  vibecodingMessages: INITIAL_MESSAGES,
  isVibecodingProcessing: false,
  exportSettings: {
    format: "mp4",
    quality: "high",
    resolution: "1080p",
    fps: 30,
  },
  sidebarWidth: 280,
  vibecodingWidth: 360,
  timelineHeight: 220,

  setProjectName: (name) =>
    set((state) => ({
      project: { ...state.project, name, updatedAt: Date.now() },
    })),

  setPlayhead: (time) =>
    set((state) => ({
      project: { ...state.project, playhead: Math.max(0, time) },
    })),

  setIsPlaying: (playing) => set({ isPlaying: playing }),

  setActivePanel: (panel) => set({ activePanel: panel }),

  setSelectedClip: (clipId) => set({ selectedClipId: clipId }),

  setTimelineZoom: (zoom) =>
    set((state) => ({
      project: { ...state.project, zoom: Math.max(0.25, Math.min(4, zoom)) },
    })),

  addAsset: (asset) =>
    set((state) => ({
      project: {
        ...state.project,
        assets: [...state.project.assets, asset],
        updatedAt: Date.now(),
      },
    })),

  removeAsset: (assetId) =>
    set((state) => ({
      project: {
        ...state.project,
        assets: state.project.assets.filter((a) => a.id !== assetId),
        clips: state.project.clips.filter((c) => c.assetId !== assetId),
        updatedAt: Date.now(),
      },
    })),

  addClip: (clip) =>
    set((state) => ({
      project: {
        ...state.project,
        clips: [...state.project.clips, { ...clip, id: uuidv4() }],
        updatedAt: Date.now(),
      },
    })),

  updateClip: (clipId, updates) =>
    set((state) => ({
      project: {
        ...state.project,
        clips: state.project.clips.map((c) =>
          c.id === clipId ? { ...c, ...updates } : c
        ),
        updatedAt: Date.now(),
      },
    })),

  removeClip: (clipId) =>
    set((state) => ({
      project: {
        ...state.project,
        clips: state.project.clips.filter((c) => c.id !== clipId),
        updatedAt: Date.now(),
      },
      selectedClipId:
        state.selectedClipId === clipId ? null : state.selectedClipId,
    })),

  addVibeMessage: (message) =>
    set((state) => ({
      vibecodingMessages: [
        ...state.vibecodingMessages,
        { ...message, id: uuidv4(), timestamp: Date.now() },
      ],
    })),

  setVibecodingProcessing: (processing) =>
    set({ isVibecodingProcessing: processing }),

  setExportSettings: (settings) =>
    set((state) => ({
      exportSettings: { ...state.exportSettings, ...settings },
    })),
}));