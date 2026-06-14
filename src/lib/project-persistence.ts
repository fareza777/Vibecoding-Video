import { z } from "zod";
import { getMediaBlob, saveMediaBlob } from "@/lib/media-storage";
import type {
  EditorProject,
  ExportSettings,
  MediaAsset,
  TimelineClip,
  TimelineTrack,
} from "@/types/editor";

export const PROJECT_FILE_VERSION = 1;

const clipEffectSchema = z.object({
  id: z.string(),
  type: z.string(),
  params: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  enabled: z.boolean(),
});

const clipSchema = z.object({
  id: z.string(),
  assetId: z.string(),
  trackId: z.string(),
  startTime: z.number(),
  duration: z.number(),
  trimStart: z.number(),
  trimEnd: z.number(),
  label: z.string(),
  color: z.string(),
  opacity: z.number(),
  volume: z.number(),
  effects: z.array(clipEffectSchema),
});

const assetSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["video", "audio", "image"]),
  duration: z.number(),
  width: z.number().optional(),
  height: z.number().optional(),
  thumbnail: z.string().optional(),
  waveform: z.array(z.number()).optional(),
  size: z.number(),
  createdAt: z.number(),
  storageKey: z.string().optional(),
});

const projectFileSchema = z.object({
  version: z.literal(1),
  savedAt: z.number(),
  project: z.object({
    id: z.string(),
    name: z.string(),
    createdAt: z.number(),
    updatedAt: z.number(),
    duration: z.number(),
    fps: z.number(),
    resolution: z.object({ width: z.number(), height: z.number() }),
    assets: z.array(assetSchema),
    tracks: z.array(
      z.object({
        id: z.string(),
        type: z.enum(["video", "audio", "text", "effect"]),
        name: z.string(),
        locked: z.boolean(),
        muted: z.boolean(),
        visible: z.boolean(),
        height: z.number(),
      })
    ),
    clips: z.array(clipSchema),
    playhead: z.number(),
    zoom: z.number(),
  }),
  exportSettings: z
    .object({
      format: z.enum(["mp4", "webm", "mov"]),
      quality: z.enum(["draft", "standard", "high", "ultra"]),
      resolution: z.enum(["720p", "1080p", "4k"]),
      fps: z.union([z.literal(24), z.literal(30), z.literal(60)]),
    })
    .optional(),
});

export type ProjectFile = z.infer<typeof projectFileSchema>;

export interface RecentProjectMeta {
  id: string;
  name: string;
  updatedAt: number;
  clipCount: number;
  assetCount: number;
}

const RECENT_KEY = "vibecoding-recent-projects";
const AUTOSAVE_KEY = "vibecoding-autosave";
const MAX_RECENT = 8;

export function createProjectFile(
  project: EditorProject,
  exportSettings?: ExportSettings
): ProjectFile {
  return {
    version: PROJECT_FILE_VERSION,
    savedAt: Date.now(),
    project: {
      ...project,
      assets: project.assets.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        duration: a.duration,
        width: a.width,
        height: a.height,
        thumbnail: a.thumbnail,
        waveform: a.waveform,
        size: a.size,
        createdAt: a.createdAt,
        storageKey: `${project.id}::${a.id}`,
      })),
      clips: project.clips.map((c) => ({
        ...c,
        effects: c.effects.map((e) => ({ ...e, params: { ...e.params } })),
      })),
    },
    exportSettings,
  };
}

export async function rehydrateProjectAssets(
  project: EditorProject
): Promise<{ project: EditorProject; missing: string[] }> {
  const missing: string[] = [];
  const assets: MediaAsset[] = [];

  for (const asset of project.assets) {
    const blob = await getMediaBlob(project.id, asset.id);
    if (blob) {
      assets.push({
        ...asset,
        url: URL.createObjectURL(blob),
      });
    } else if (asset.url?.startsWith("blob:")) {
      missing.push(asset.name);
      assets.push(asset);
    } else {
      missing.push(asset.name);
      assets.push({ ...asset, url: "" });
    }
  }

  return {
    project: { ...project, assets },
    missing,
  };
}

export async function persistProjectMedia(
  projectId: string,
  assets: MediaAsset[]
): Promise<void> {
  for (const asset of assets) {
    if (!asset.url.startsWith("blob:")) continue;
    try {
      const res = await fetch(asset.url);
      const blob = await res.blob();
      await saveMediaBlob(projectId, asset.id, blob, asset.name, blob.type);
    } catch {
      // skip failed persistence
    }
  }
}

export function downloadProjectFile(
  project: EditorProject,
  exportSettings?: ExportSettings
): void {
  const file = createProjectFile(project, exportSettings);
  const json = JSON.stringify(file, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${project.name.replace(/[^\w\-]+/g, "_")}.vibe.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function parseProjectFile(
  file: File
): Promise<{ project: EditorProject; exportSettings?: ExportSettings }> {
  const text = await file.text();
  const parsed = projectFileSchema.parse(JSON.parse(text));
  const project: EditorProject = {
    ...parsed.project,
    assets: parsed.project.assets.map((a) => ({
      ...a,
      url: "",
    })),
    clips: parsed.project.clips as TimelineClip[],
    tracks: parsed.project.tracks as TimelineTrack[],
  };

  const { project: hydrated, missing } = await rehydrateProjectAssets(project);

  if (missing.length > 0 && missing.length === project.assets.length) {
    throw new Error(
      `Media tidak ditemukan di browser ini (${missing.length} file). Import ulang media setelah load.`
    );
  }

  return {
    project: hydrated,
    exportSettings: parsed.exportSettings,
  };
}

export function saveAutosave(
  project: EditorProject,
  exportSettings: ExportSettings
): void {
  if (typeof window === "undefined") return;
  const file = createProjectFile(project, exportSettings);
  localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(file));
  upsertRecentProject(project);
}

export async function loadAutosave(): Promise<{
  project: EditorProject;
  exportSettings?: ExportSettings;
} | null> {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(AUTOSAVE_KEY);
  if (!raw) return null;

  try {
    const parsed = projectFileSchema.parse(JSON.parse(raw));
    const project: EditorProject = {
      ...parsed.project,
      assets: parsed.project.assets.map((a) => ({ ...a, url: "" })),
      clips: parsed.project.clips as TimelineClip[],
      tracks: parsed.project.tracks as TimelineTrack[],
    };
    const { project: hydrated } = await rehydrateProjectAssets(project);
    return { project: hydrated, exportSettings: parsed.exportSettings };
  } catch {
    return null;
  }
}

export function getRecentProjects(): RecentProjectMeta[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentProjectMeta[];
  } catch {
    return [];
  }
}

function upsertRecentProject(project: EditorProject): void {
  const recent = getRecentProjects().filter((r) => r.id !== project.id);
  const entry: RecentProjectMeta = {
    id: project.id,
    name: project.name,
    updatedAt: project.updatedAt,
    clipCount: project.clips.length,
    assetCount: project.assets.length,
  };
  localStorage.setItem(
    RECENT_KEY,
    JSON.stringify([entry, ...recent].slice(0, MAX_RECENT))
  );
}

export async function loadRecentProject(
  id: string
): Promise<{ project: EditorProject; exportSettings?: ExportSettings } | null> {
  const autosave = await loadAutosave();
  if (!autosave || autosave.project.id !== id) return null;
  return autosave;
}