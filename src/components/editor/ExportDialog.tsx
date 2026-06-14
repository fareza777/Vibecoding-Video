"use client";

import { useCallback, useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Download, Film, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  downloadBlob,
  exportTimeline,
  type ExportProgress,
} from "@/lib/ffmpeg-export";
import { useEditorStore } from "@/store/editor-store";
import type { ExportSettings } from "@/types/editor";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportDialog({ open, onOpenChange }: ExportDialogProps) {
  const project = useEditorStore((s) => s.project);
  const exportSettings = useEditorStore((s) => s.exportSettings);
  const setExportSettings = useEditorStore((s) => s.setExportSettings);

  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setProgress({ phase: "loading", progress: 0, message: "Starting..." });

    try {
      const blob = await exportTimeline(project, exportSettings, setProgress);
      const filename = `${project.name.replace(/\s+/g, "_")}.${exportSettings.format}`;
      downloadBlob(blob, filename);
    } catch (err) {
      setProgress({
        phase: "error",
        progress: 0,
        message: err instanceof Error ? err.message : "Export failed",
      });
    } finally {
      setIsExporting(false);
    }
  }, [project, exportSettings]);

  const update = (patch: Partial<ExportSettings>) =>
    setExportSettings(patch);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md glass-panel rounded-2xl shadow-2xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Film className="h-4 w-4 text-accent-glow" />
              <Dialog.Title className="text-sm font-semibold">
                Export Video
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon-sm" disabled={isExporting}>
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Format">
                <select
                  value={exportSettings.format}
                  onChange={(e) =>
                    update({ format: e.target.value as ExportSettings["format"] })
                  }
                  className="w-full h-8 px-2 text-xs bg-muted rounded-lg outline-none"
                  disabled={isExporting}
                >
                  <option value="mp4">MP4</option>
                  <option value="webm">WebM</option>
                  <option value="mov">MOV</option>
                </select>
              </Field>

              <Field label="Quality">
                <select
                  value={exportSettings.quality}
                  onChange={(e) =>
                    update({
                      quality: e.target.value as ExportSettings["quality"],
                    })
                  }
                  className="w-full h-8 px-2 text-xs bg-muted rounded-lg outline-none"
                  disabled={isExporting}
                >
                  <option value="draft">Draft</option>
                  <option value="standard">Standard</option>
                  <option value="high">High</option>
                  <option value="ultra">Ultra</option>
                </select>
              </Field>

              <Field label="Resolution">
                <select
                  value={exportSettings.resolution}
                  onChange={(e) =>
                    update({
                      resolution: e.target.value as ExportSettings["resolution"],
                    })
                  }
                  className="w-full h-8 px-2 text-xs bg-muted rounded-lg outline-none"
                  disabled={isExporting}
                >
                  <option value="720p">720p</option>
                  <option value="1080p">1080p</option>
                  <option value="4k">4K</option>
                </select>
              </Field>

              <Field label="FPS">
                <select
                  value={exportSettings.fps}
                  onChange={(e) =>
                    update({
                      fps: Number(e.target.value) as ExportSettings["fps"],
                    })
                  }
                  className="w-full h-8 px-2 text-xs bg-muted rounded-lg outline-none"
                  disabled={isExporting}
                >
                  <option value={24}>24 fps</option>
                  <option value={30}>30 fps</option>
                  <option value={60}>60 fps</option>
                </select>
              </Field>
            </div>

            <p className="text-[10px] text-muted-foreground">
              Export via FFmpeg.wasm di browser. Clip video:{" "}
              {project.clips.filter((c) => c.trackId.startsWith("track-video")).length}
            </p>

            {progress && (
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{progress.message}</span>
                  <span>{progress.progress}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all duration-300 rounded-full",
                      progress.phase === "error"
                        ? "bg-red-500"
                        : "bg-accent"
                    )}
                    style={{ width: `${progress.progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
            <Dialog.Close asChild>
              <Button variant="ghost" size="sm" disabled={isExporting}>
                Cancel
              </Button>
            </Dialog.Close>
            <Button
              variant="default"
              size="sm"
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />
                  Export
                </>
              )}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}