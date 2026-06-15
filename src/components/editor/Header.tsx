"use client";

import Link from "next/link";
import {
  CloudUpload,
  Download,
  Film,
  FolderOpen,
  Home,
  Redo2,
  Save,
  Settings,
  Sparkles,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEditorStore } from "@/store/editor-store";

interface HeaderProps {
  onOpenSettings?: () => void;
  onOpenExport?: () => void;
  onOpenProject?: () => void;
  onCloudSync?: () => void | Promise<void>;
}

export function Header({
  onOpenSettings,
  onOpenExport,
  onOpenProject,
  onCloudSync,
}: HeaderProps) {
  const projectName = useEditorStore((s) => s.project.name);
  const setProjectName = useEditorStore((s) => s.setProjectName);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const historyPast = useEditorStore((s) => s.historyPast);
  const historyFuture = useEditorStore((s) => s.historyFuture);
  const lastSavedAt = useEditorStore((s) => s.lastSavedAt);
  const saveProject = useEditorStore((s) => s.saveProject);

  return (
    <header className="flex h-12 items-center justify-between border-b border-border/80 bg-surface/90 backdrop-blur-md px-4 shrink-0">
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 group" title="Kembali ke beranda">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan/10 border border-cyan/20 glow-accent-sm transition-transform group-hover:scale-105">
            <Film className="h-4 w-4 text-cyan" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-gradient leading-none">
              Vibecoding Video
            </h1>
            <p className="text-[10px] text-muted-foreground">AI-Powered Editor</p>
          </div>
        </Link>

        <div className="h-5 w-px bg-border" />

        <div className="flex flex-col">
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="bg-transparent text-sm text-foreground outline-none hover:bg-muted/50 focus:bg-muted/50 rounded px-2 py-1 max-w-[200px] transition-colors"
          />
          {lastSavedAt && (
            <span className="text-[9px] text-muted-foreground px-2">
              Saved {new Date(lastSavedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          title="Undo (Ctrl+Z)"
          onClick={undo}
          disabled={historyPast.length === 0}
        >
          <Undo2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          title="Redo (Ctrl+Y)"
          onClick={redo}
          disabled={historyFuture.length === 0}
        >
          <Redo2 className="h-3.5 w-3.5" />
        </Button>

        <div className="h-5 w-px bg-border mx-2" />

        <Button variant="ghost" size="sm" onClick={onOpenProject} title="Open (Ctrl+O)">
          <FolderOpen className="h-3.5 w-3.5" />
          Open
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => saveProject()}
          title="Save (Ctrl+S)"
        >
          <Save className="h-3.5 w-3.5" />
          Save
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCloudSync}
          title="Upload to Cloud"
        >
          <CloudUpload className="h-3.5 w-3.5" />
          Sync
        </Button>

        <div className="h-5 w-px bg-border mx-2" />

        <Button variant="ghost" size="icon-sm" asChild title="Beranda">
          <Link href="/">
            <Home className="h-3.5 w-3.5" />
          </Link>
        </Button>

        <Button variant="secondary" size="sm">
          <Sparkles className="h-3.5 w-3.5 text-cyan" />
          Vibe Assist
        </Button>
        <Button variant="default" size="sm" onClick={onOpenExport}>
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          title="Settings"
          onClick={onOpenSettings}
        >
          <Settings className="h-3.5 w-3.5" />
        </Button>
      </div>
    </header>
  );
}