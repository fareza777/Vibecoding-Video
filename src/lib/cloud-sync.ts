import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getMediaBlob } from "@/lib/media-storage";
import {
  createProjectFile,
  parseProjectJson,
  rehydrateProjectAssets,
} from "@/lib/project-persistence";
import type {
  CloudSettings,
  EditorProject,
  ExportSettings,
  MediaAsset,
} from "@/types/editor";

const BUCKET = "vibecoding-projects";
const MEDIA_MAX_BYTES = 50 * 1024 * 1024;

export interface CloudProjectMeta {
  id: string;
  name: string;
  updatedAt: number;
  path: string;
}

export interface CloudSyncProgress {
  phase: "project" | "media";
  current: number;
  total: number;
  fileName: string;
}

function getClient(settings: CloudSettings): SupabaseClient {
  return createClient(settings.supabaseUrl, settings.supabaseAnonKey);
}

function projectPath(syncKey: string, projectId: string): string {
  return `${syncKey}/${projectId}.vibe.json`;
}

function mediaPath(
  syncKey: string,
  projectId: string,
  assetId: string,
  fileName: string
): string {
  const ext = fileName.split(".").pop() ?? "bin";
  return `${syncKey}/${projectId}/media/${assetId}.${ext}`;
}

async function blobFromAsset(asset: MediaAsset): Promise<Blob | null> {
  if (!asset.url.startsWith("blob:")) return null;
  try {
    const res = await fetch(asset.url);
    return await res.blob();
  } catch {
    return null;
  }
}

export async function uploadMediaToCloud(
  settings: CloudSettings,
  projectId: string,
  assets: MediaAsset[],
  onProgress?: (p: CloudSyncProgress) => void
): Promise<{ uploaded: number; skipped: number }> {
  if (!settings.uploadMedia) {
    return { uploaded: 0, skipped: assets.length };
  }

  const client = getClient(settings);
  let uploaded = 0;
  let skipped = 0;

  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];
    onProgress?.({
      phase: "media",
      current: i + 1,
      total: assets.length,
      fileName: asset.name,
    });

    const blob = await blobFromAsset(asset);
    if (!blob) {
      skipped++;
      continue;
    }
    if (blob.size > MEDIA_MAX_BYTES) {
      skipped++;
      continue;
    }

    const path = mediaPath(settings.syncKey, projectId, asset.id, asset.name);
    const { error } = await client.storage.from(BUCKET).upload(path, blob, {
      upsert: true,
      contentType: blob.type || "application/octet-stream",
    });

    if (error) {
      skipped++;
    } else {
      uploaded++;
    }
  }

  return { uploaded, skipped };
}

export async function downloadMediaFromCloud(
  settings: CloudSettings,
  projectId: string,
  asset: MediaAsset
): Promise<Blob | null> {
  const client = getClient(settings);
  const path = mediaPath(settings.syncKey, projectId, asset.id, asset.name);
  const { data, error } = await client.storage.from(BUCKET).download(path);
  if (error || !data) return null;
  return data;
}

export async function rehydrateWithCloudMedia(
  settings: CloudSettings,
  project: EditorProject
): Promise<{ project: EditorProject; missing: string[]; cloudLoaded: number }> {
  const missing: string[] = [];
  const assets: MediaAsset[] = [];
  let cloudLoaded = 0;

  for (const asset of project.assets) {
    const cloudBlob = await downloadMediaFromCloud(settings, project.id, asset);
    if (cloudBlob) {
      assets.push({
        ...asset,
        url: URL.createObjectURL(cloudBlob),
      });
      cloudLoaded++;
      continue;
    }

    const localBlob = await getMediaBlob(project.id, asset.id);
    if (localBlob) {
      assets.push({
        ...asset,
        url: URL.createObjectURL(localBlob),
      });
    } else {
      missing.push(asset.name);
      assets.push({ ...asset, url: "" });
    }
  }

  return {
    project: { ...project, assets },
    missing,
    cloudLoaded,
  };
}

export async function uploadProjectToCloud(
  settings: CloudSettings,
  project: EditorProject,
  exportSettings: ExportSettings,
  onProgress?: (p: CloudSyncProgress) => void
): Promise<{ mediaUploaded: number; mediaSkipped: number }> {
  const client = getClient(settings);
  const file = createProjectFile(project, exportSettings);
  const json = JSON.stringify(file);
  const path = projectPath(settings.syncKey, project.id);

  onProgress?.({
    phase: "project",
    current: 1,
    total: 1,
    fileName: `${project.name}.vibe.json`,
  });

  const { error } = await client.storage
    .from(BUCKET)
    .upload(path, new Blob([json], { type: "application/json" }), {
      upsert: true,
      contentType: "application/json",
    });

  if (error) throw new Error(error.message);

  const mediaResult = await uploadMediaToCloud(
    settings,
    project.id,
    project.assets,
    onProgress
  );

  return {
    mediaUploaded: mediaResult.uploaded,
    mediaSkipped: mediaResult.skipped,
  };
}

export async function listCloudProjects(
  settings: CloudSettings
): Promise<CloudProjectMeta[]> {
  const client = getClient(settings);
  const { data, error } = await client.storage
    .from(BUCKET)
    .list(settings.syncKey, {
      limit: 50,
      sortBy: { column: "updated_at", order: "desc" },
    });

  if (error) throw new Error(error.message);
  if (!data) return [];

  const projects: CloudProjectMeta[] = [];

  for (const item of data) {
    if (!item.name.endsWith(".vibe.json")) continue;
    const id = item.name.replace(".vibe.json", "");
    const path = `${settings.syncKey}/${item.name}`;
    let name = id;
    let updatedAt = new Date(
      item.updated_at ?? item.created_at ?? Date.now()
    ).getTime();

    try {
      const { data: blob } = await client.storage.from(BUCKET).download(path);
      if (blob) {
        const parsed = JSON.parse(await blob.text()) as {
          project?: { name?: string; updatedAt?: number };
        };
        name = parsed.project?.name ?? id;
        updatedAt = parsed.project?.updatedAt ?? updatedAt;
      }
    } catch {
      // use storage metadata fallback
    }

    projects.push({ id, name, updatedAt, path });
  }

  return projects.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function downloadCloudProject(
  settings: CloudSettings,
  projectId: string,
  withMedia = true
): Promise<{
  project: EditorProject;
  exportSettings?: ExportSettings;
  cloudLoaded?: number;
}> {
  const client = getClient(settings);
  const path = projectPath(settings.syncKey, projectId);

  const { data, error } = await client.storage.from(BUCKET).download(path);
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Proyek cloud tidak ditemukan.");

  const { project: baseProject, exportSettings } = parseProjectJson(
    await data.text()
  );

  if (!withMedia || !settings.uploadMedia) {
    const { project, missing } = await rehydrateProjectAssets(baseProject);
    if (missing.length > 0 && missing.length === baseProject.assets.length) {
      throw new Error(
        `Media tidak ditemukan (${missing.length} file). Import ulang media.`
      );
    }
    return { project, exportSettings };
  }

  const { project, missing, cloudLoaded } = await rehydrateWithCloudMedia(
    settings,
    baseProject
  );

  if (missing.length > 0 && missing.length === project.assets.length) {
    throw new Error(
      `Media cloud tidak ditemukan (${missing.length} file). Import ulang media.`
    );
  }

  return {
    project,
    exportSettings,
    cloudLoaded,
  };
}

export async function deleteCloudProject(
  settings: CloudSettings,
  projectId: string
): Promise<void> {
  const client = getClient(settings);
  const path = projectPath(settings.syncKey, projectId);
  const { error } = await client.storage.from(BUCKET).remove([path]);
  if (error) throw new Error(error.message);
}

export async function testCloudConnection(
  settings: CloudSettings
): Promise<{ ok: boolean; message: string }> {
  try {
    const client = getClient(settings);
    const { error } = await client.storage.from(BUCKET).list(settings.syncKey, {
      limit: 1,
    });
    if (error) {
      return { ok: false, message: error.message };
    }
    return { ok: true, message: "Terhubung ke Supabase Storage" };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Koneksi gagal",
    };
  }
}