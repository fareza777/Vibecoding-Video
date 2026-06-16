"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Cloud,
  CloudDownload,
  CloudUpload,
  Clock,
  FileJson,
  FileVideo,
  FolderOpen,
  Loader2,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  isCloudConfigured,
  loadCloudSettings,
} from "@/lib/cloud-settings";
import {
  downloadCloudProject,
  listCloudProjects,
  uploadProjectToCloud,
  type CloudProjectMeta,
} from "@/lib/cloud-sync";
import {
  getRecentProjects,
  loadRecentProject,
  parseProjectFile,
  persistProjectMedia,
  type RecentProjectMeta,
} from "@/lib/project-persistence";
import {
  createProjectFromTemplate,
  PROJECT_TEMPLATES,
} from "@/lib/editor-templates";
import { useEditorStore } from "@/store/editor-store";

interface OpenProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenSettings?: () => void;
  onCloudSynced?: () => void | Promise<void>;
}

export function OpenProjectDialog({
  open,
  onOpenChange,
  onOpenSettings,
  onCloudSynced,
}: OpenProjectDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadProject = useEditorStore((s) => s.loadProject);
  const resetProject = useEditorStore((s) => s.resetProject);
  const project = useEditorStore((s) => s.project);
  const exportSettings = useEditorStore((s) => s.exportSettings);
  const setLastSaved = useEditorStore((s) => s.setLastSaved);

  const [recent, setRecent] = useState<RecentProjectMeta[]>([]);
  const [cloudProjects, setCloudProjects] = useState<CloudProjectMeta[]>([]);
  const [cloudEnabled, setCloudEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const refreshCloud = useCallback(async () => {
    const settings = loadCloudSettings();
    if (!isCloudConfigured(settings)) {
      setCloudEnabled(false);
      setCloudProjects([]);
      return;
    }
    setCloudEnabled(true);
    try {
      const list = await listCloudProjects(settings);
      setCloudProjects(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat cloud projects.");
    }
  }, []);

  useEffect(() => {
    if (open) {
      setRecent(getRecentProjects());
      setError(null);
      setSuccess(null);
      refreshCloud();
    }
  }, [open, refreshCloud]);

  const handleFile = useCallback(
    async (file: File) => {
      setLoading(true);
      setError(null);
      try {
        const { project: loaded, exportSettings: loadedExport } =
          await parseProjectFile(file);
        loadProject(loaded, loadedExport);
        onOpenChange(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal membuka proyek.");
      } finally {
        setLoading(false);
      }
    },
    [loadProject, onOpenChange]
  );

  const handleRecent = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const saved = await loadRecentProject(id);
        if (!saved) {
          setError("Proyek tidak ditemukan di autosave browser ini.");
          return;
        }
        loadProject(saved.project, saved.exportSettings);
        onOpenChange(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal memuat proyek.");
      } finally {
        setLoading(false);
      }
    },
    [loadProject, onOpenChange]
  );

  const handleCloudLoad = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const settings = loadCloudSettings();
        const saved = await downloadCloudProject(settings, id, true);
        loadProject(saved.project, saved.exportSettings);
        if (saved.cloudLoaded && saved.cloudLoaded > 0) {
          setSuccess(`Loaded ${saved.cloudLoaded} media file(s) from cloud.`);
        }
        onOpenChange(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal memuat dari cloud.");
      } finally {
        setLoading(false);
      }
    },
    [loadProject, onOpenChange]
  );

  const handleCloudUpload = useCallback(async () => {
    const settings = loadCloudSettings();
    if (!isCloudConfigured(settings)) {
      setError("Cloud sync belum dikonfigurasi. Buka Settings.");
      return;
    }

    setSyncing(true);
    setError(null);
    setSuccess(null);
    try {
      await persistProjectMedia(project.id, project.assets);
      const result = await uploadProjectToCloud(
        settings,
        project,
        exportSettings
      );
      setLastSaved(Date.now());
      await onCloudSynced?.();
      const mediaNote =
        result.mediaUploaded > 0
          ? ` + ${result.mediaUploaded} media file(s)`
          : "";
      setSuccess(`"${project.name}" di-upload ke cloud${mediaNote}.`);
      await refreshCloud();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload cloud gagal.");
    } finally {
      setSyncing(false);
    }
  }, [project, exportSettings, setLastSaved, refreshCloud]);

  const handleNewProject = () => {
    resetProject();
    onOpenChange(false);
  };

  const handleTemplateProject = (templateId: string) => {
    const template = PROJECT_TEMPLATES.find((item) => item.id === templateId);
    if (!template) return;
    const next = createProjectFromTemplate(template);
    loadProject(next.project, next.exportSettings);
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg glass-panel rounded-2xl shadow-2xl glow-accent max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-surface/95 backdrop-blur-sm z-10">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-accent-glow" />
              <Dialog.Title className="text-sm font-semibold">Open Project</Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon-sm">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          <div className="p-5 space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.vibe.json,application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = "";
              }}
            />

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="h-auto py-4 flex-col gap-2"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
              >
                <FileJson className="h-5 w-5 text-accent-glow" />
                <span className="text-xs font-medium">Open .vibe.json</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex-col gap-2"
                onClick={handleNewProject}
                disabled={loading}
              >
                <Plus className="h-5 w-5 text-accent-glow" />
                <span className="text-xs font-medium">New Project</span>
              </Button>
            </div>

            <section className="space-y-2">
              <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <FileVideo className="h-3 w-3" />
                Project Templates
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PROJECT_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleTemplateProject(template.id)}
                    disabled={loading}
                    className={cn(
                      "rounded-xl border border-border bg-muted/40 px-3 py-3 text-left transition-colors hover:border-cyan/30 hover:bg-muted/70",
                      loading && "opacity-50 pointer-events-none"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-foreground">
                        {template.name}
                      </p>
                      <span className="rounded-full bg-surface px-2 py-0.5 text-[9px] font-mono text-muted-foreground">
                        {template.resolution.width}×{template.resolution.height}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-muted-foreground leading-relaxed">
                      {template.description}
                    </p>
                    <div className="mt-2 flex items-center gap-1.5 text-[9px] text-muted-foreground">
                      <span className="rounded-full border border-border bg-surface px-2 py-0.5">
                        {template.fps} fps
                      </span>
                      <span className="rounded-full border border-border bg-surface px-2 py-0.5">
                        {Math.round(template.duration)} dtk
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {recent.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  Recent Projects
                </h3>
                <div className="space-y-1 max-h-[160px] overflow-y-auto">
                  {recent.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleRecent(item.id)}
                      disabled={loading}
                      className={cn(
                        "w-full flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left",
                        loading && "opacity-50 pointer-events-none"
                      )}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {item.clipCount} clips · {item.assetCount} media
                        </p>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                        {formatRelativeTime(item.updatedAt)}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Cloud className="h-3 w-3" />
                  Cloud Projects
                </h3>
                {cloudEnabled && (
                  <button
                    onClick={refreshCloud}
                    className="text-muted-foreground hover:text-foreground"
                    title="Refresh"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </button>
                )}
              </div>

              {cloudEnabled ? (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={handleCloudUpload}
                    disabled={syncing || loading}
                  >
                    {syncing ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <CloudUpload className="h-3.5 w-3.5" />
                        Upload Current to Cloud
                      </>
                    )}
                  </Button>

                  {cloudProjects.length > 0 ? (
                    <div className="space-y-1 max-h-[160px] overflow-y-auto">
                      {cloudProjects.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleCloudLoad(item.id)}
                          disabled={loading}
                          className={cn(
                            "w-full flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left",
                            loading && "opacity-50 pointer-events-none"
                          )}
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{item.name}</p>
                            <p className="text-[10px] text-muted-foreground">Cloud</p>
                          </div>
                          <CloudDownload className="h-3.5 w-3.5 text-accent-glow shrink-0 ml-2" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-muted-foreground text-center py-3">
                      Belum ada proyek di cloud.
                    </p>
                  )}
                </>
              ) : (
                <div className="text-center py-3 space-y-2">
                  <p className="text-[10px] text-muted-foreground">
                    Cloud sync membutuhkan Supabase. Konfigurasi di Settings.
                  </p>
                  {onOpenSettings && (
                    <Button variant="outline" size="sm" onClick={onOpenSettings}>
                      Open Settings
                    </Button>
                  )}
                </div>
              )}
            </section>

            {error && (
              <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            {success && (
              <p className="text-xs text-track-audio bg-track-audio/10 rounded-lg px-3 py-2">
                {success}
              </p>
            )}

            <p className="text-[10px] text-muted-foreground/70">
              Cloud sync menyimpan timeline + media (max 50MB/file). Gunakan sync key
              yang sama dengan tim untuk kolaborasi.
            </p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes}m lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}j lalu`;
  const days = Math.floor(hours / 24);
  return `${days}h lalu`;
}
