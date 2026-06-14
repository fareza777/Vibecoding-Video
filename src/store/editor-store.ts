import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import {
  downloadProjectFile,
  persistProjectMedia,
  saveAutosave,
} from "@/lib/project-persistence";
import type {
  EditorProject,
  ExportSettings,
  HistoryEntry,
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

const MAX_HISTORY = 50;

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
  snapEnabled: boolean;
  historyPast: HistoryEntry[];
  historyFuture: HistoryEntry[];
  lastSavedAt: number | null;

  setProjectName: (name: string) => void;
  loadProject: (project: EditorProject, exportSettings?: ExportSettings) => void;
  resetProject: () => void;
  setLastSaved: (timestamp: number) => void;
  saveProject: () => Promise<void>;
  setPlayhead: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setActivePanel: (panel: PanelId) => void;
  setSelectedClip: (clipId: string | null) => void;
  setTimelineZoom: (zoom: number) => void;
  toggleSnap: () => void;
  addAsset: (asset: MediaAsset) => void;
  updateAsset: (assetId: string, updates: Partial<MediaAsset>) => void;
  removeAsset: (assetId: string) => void;
  addClip: (clip: Omit<TimelineClip, "id">, skipHistory?: boolean) => void;
  updateClip: (clipId: string, updates: Partial<TimelineClip>, recordHistory?: boolean) => void;
  removeClip: (clipId: string, skipHistory?: boolean) => void;
  splitClipAtPlayhead: () => void;
  splitClipAtTime: (time: number, clipId?: string, skipHistory?: boolean) => void;
  updateTrack: (trackId: string, updates: Partial<TimelineTrack>) => void;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
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

function snapshot(state: EditorState): HistoryEntry {
  return {
    clips: state.project.clips.map((c) => ({ ...c, effects: [...c.effects] })),
    selectedClipId: state.selectedClipId,
  };
}

function cloneClips(clips: TimelineClip[]): TimelineClip[] {
  return clips.map((c) => ({ ...c, effects: [...c.effects] }));
}

function revokeAssetUrls(assets: MediaAsset[]): void {
  for (const asset of assets) {
    if (asset.url.startsWith("blob:")) {
      URL.revokeObjectURL(asset.url);
    }
  }
}

export const useEditorStore = create<EditorState>((set, get) => ({
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
    bakeEffects: true,
    mixAudioTracks: true,
  },
  sidebarWidth: 280,
  vibecodingWidth: 360,
  timelineHeight: 220,
  snapEnabled: true,
  historyPast: [],
  historyFuture: [],
  lastSavedAt: null,

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

  toggleSnap: () => set((state) => ({ snapEnabled: !state.snapEnabled })),

  pushHistory: () => {
    const state = get();
    const entry = snapshot(state);
    set({
      historyPast: [...state.historyPast.slice(-MAX_HISTORY + 1), entry],
      historyFuture: [],
    });
  },

  undo: () => {
    const state = get();
    if (state.historyPast.length === 0) return;

    const previous = state.historyPast[state.historyPast.length - 1];
    const current = snapshot(state);
    set({
      historyPast: state.historyPast.slice(0, -1),
      historyFuture: [current, ...state.historyFuture],
      project: {
        ...state.project,
        clips: cloneClips(previous.clips),
        updatedAt: Date.now(),
      },
      selectedClipId: previous.selectedClipId,
    });
  },

  redo: () => {
    const state = get();
    if (state.historyFuture.length === 0) return;

    const next = state.historyFuture[0];
    const current = snapshot(state);

    set({
      historyPast: [...state.historyPast, current],
      historyFuture: state.historyFuture.slice(1),
      project: {
        ...state.project,
        clips: cloneClips(next.clips),
        updatedAt: Date.now(),
      },
      selectedClipId: next.selectedClipId,
    });
  },

  addAsset: (asset) =>
    set((state) => ({
      project: {
        ...state.project,
        assets: [...state.project.assets, asset],
        updatedAt: Date.now(),
      },
    })),

  updateAsset: (assetId, updates) =>
    set((state) => ({
      project: {
        ...state.project,
        assets: state.project.assets.map((a) =>
          a.id === assetId ? { ...a, ...updates } : a
        ),
        updatedAt: Date.now(),
      },
    })),

  removeAsset: (assetId) => {
    get().pushHistory();
    set((state) => ({
      project: {
        ...state.project,
        assets: state.project.assets.filter((a) => a.id !== assetId),
        clips: state.project.clips.filter((c) => c.assetId !== assetId),
        updatedAt: Date.now(),
      },
    }));
  },

  addClip: (clip, skipHistory = false) => {
    if (!skipHistory) get().pushHistory();
    set((state) => ({
      project: {
        ...state.project,
        clips: [...state.project.clips, { ...clip, id: uuidv4() }],
        updatedAt: Date.now(),
      },
    }));
  },

  updateClip: (clipId, updates, recordHistory = false) => {
    if (recordHistory) get().pushHistory();
    set((state) => ({
      project: {
        ...state.project,
        clips: state.project.clips.map((c) =>
          c.id === clipId ? { ...c, ...updates } : c
        ),
        updatedAt: Date.now(),
      },
    }));
  },

  removeClip: (clipId, skipHistory = false) => {
    if (!skipHistory) get().pushHistory();
    set((state) => ({
      project: {
        ...state.project,
        clips: state.project.clips.filter((c) => c.id !== clipId),
        updatedAt: Date.now(),
      },
      selectedClipId:
        state.selectedClipId === clipId ? null : state.selectedClipId,
    }));
  },

  splitClipAtPlayhead: () => {
    const state = get();
    get().splitClipAtTime(state.project.playhead, state.selectedClipId ?? undefined);
  },

  splitClipAtTime: (time, clipId, skipHistory = false) => {
    const state = get();
    const { clips } = state.project;

    const clip = clipId
      ? clips.find((c) => c.id === clipId)
      : clips.find(
          (c) =>
            c.id === state.selectedClipId ||
            (time > c.startTime && time < c.startTime + c.duration)
        );

    if (!clip) return;

    const splitOffset = time - clip.startTime;
    if (splitOffset <= 0.05 || splitOffset >= clip.duration - 0.05) return;

    if (!skipHistory) get().pushHistory();

    const leftClip: TimelineClip = {
      ...clip,
      id: clip.id,
      duration: splitOffset,
      trimEnd: clip.trimStart + splitOffset,
    };

    const rightClip: TimelineClip = {
      ...clip,
      id: uuidv4(),
      startTime: time,
      duration: clip.duration - splitOffset,
      trimStart: clip.trimStart + splitOffset,
      label: `${clip.label} (2)`,
    };

    set((s) => ({
      project: {
        ...s.project,
        clips: [
          ...s.project.clips.filter((c) => c.id !== clip.id),
          leftClip,
          rightClip,
        ],
        updatedAt: Date.now(),
      },
      selectedClipId: rightClip.id,
    }));
  },

  updateTrack: (trackId, updates) =>
    set((state) => ({
      project: {
        ...state.project,
        tracks: state.project.tracks.map((t) =>
          t.id === trackId ? { ...t, ...updates } : t
        ),
        updatedAt: Date.now(),
      },
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

  loadProject: (project, exportSettings) => {
    const state = get();
    revokeAssetUrls(state.project.assets);
    set({
      project: {
        ...project,
        assets: project.assets.map((a) => ({ ...a })),
        clips: cloneClips(project.clips),
        tracks: project.tracks.map((t) => ({ ...t })),
      },
      exportSettings: exportSettings ?? state.exportSettings,
      historyPast: [],
      historyFuture: [],
      selectedClipId: null,
      isPlaying: false,
      lastSavedAt: null,
    });
  },

  resetProject: () => {
    const state = get();
    revokeAssetUrls(state.project.assets);
    set({
      project: createDefaultProject(),
      historyPast: [],
      historyFuture: [],
      selectedClipId: null,
      isPlaying: false,
      lastSavedAt: null,
    });
  },

  setLastSaved: (timestamp) => set({ lastSavedAt: timestamp }),

  saveProject: async () => {
    const state = get();
    await persistProjectMedia(state.project.id, state.project.assets);
    downloadProjectFile(state.project, state.exportSettings);
    saveAutosave(state.project, state.exportSettings);
    set({ lastSavedAt: Date.now() });
  },
}));