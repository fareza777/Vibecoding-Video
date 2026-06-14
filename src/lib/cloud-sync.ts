import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createProjectFile, parseProjectFile } from "@/lib/project-persistence";
import type { CloudSettings, EditorProject, ExportSettings } from "@/types/editor";

const BUCKET = "vibecoding-projects";

export interface CloudProjectMeta {
  id: string;
  name: string;
  updatedAt: number;
  path: string;
}

function getClient(settings: CloudSettings): SupabaseClient {
  return createClient(settings.supabaseUrl, settings.supabaseAnonKey);
}

function projectPath(syncKey: string, projectId: string): string {
  return `${syncKey}/${projectId}.vibe.json`;
}

export async function uploadProjectToCloud(
  settings: CloudSettings,
  project: EditorProject,
  exportSettings: ExportSettings
): Promise<void> {
  const client = getClient(settings);
  const file = createProjectFile(project, exportSettings);
  const json = JSON.stringify(file);
  const path = projectPath(settings.syncKey, project.id);

  const { error } = await client.storage
    .from(BUCKET)
    .upload(path, new Blob([json], { type: "application/json" }), {
      upsert: true,
      contentType: "application/json",
    });

  if (error) throw new Error(error.message);
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
  projectId: string
): Promise<{ project: EditorProject; exportSettings?: ExportSettings }> {
  const client = getClient(settings);
  const path = projectPath(settings.syncKey, projectId);

  const { data, error } = await client.storage.from(BUCKET).download(path);
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Proyek cloud tidak ditemukan.");

  const file = new File([data], `${projectId}.vibe.json`, {
    type: "application/json",
  });

  return parseProjectFile(file);
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