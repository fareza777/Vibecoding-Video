"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Clock,
  FileJson,
  FolderOpen,
  Plus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getRecentProjects,
  loadRecentProject,
  parseProjectFile,
  type RecentProjectMeta,
} from "@/lib/project-persistence";
import { useEditorStore } from "@/store/editor-store";

interface OpenProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OpenProjectDialog({ open, onOpenChange }: OpenProjectDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadProject = useEditorStore((s) => s.loadProject);
  const resetProject = useEditorStore((s) => s.resetProject);
  const [recent, setRecent] = useState<RecentProjectMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setRecent(getRecentProjects());
      setError(null);
    }
  }, [open]);

  const handleFile = useCallback(
    async (file: File) => {
      setLoading(true);
      setError(null);
      try {
        const { project, exportSettings } = await parseProjectFile(file);
        loadProject(project, exportSettings);
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

  const handleNewProject = () => {
    resetProject();
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg glass-panel rounded-2xl shadow-2xl glow-accent">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
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

            {recent.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  Recent Projects
                </h3>
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
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

            {error && (
              <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <p className="text-[10px] text-muted-foreground/70">
              Media disimpan di IndexedDB browser ini. Buka file .vibe.json di browser lain
              memerlukan import ulang media.
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