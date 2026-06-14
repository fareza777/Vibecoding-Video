"use client";

import {
  Download,
  Film,
  FolderOpen,
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
}

export function Header({ onOpenSettings }: HeaderProps) {
  const projectName = useEditorStore((s) => s.project.name);
  const setProjectName = useEditorStore((s) => s.setProjectName);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const historyPast = useEditorStore((s) => s.historyPast);
  const historyFuture = useEditorStore((s) => s.historyFuture);

  return (
    <header className="flex h-12 items-center justify-between border-b border-border bg-surface px-4 shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20 glow-accent">
            <Film className="h-4 w-4 text-accent-glow" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-gradient leading-none">
              Vibecoding Video
            </h1>
            <p className="text-[10px] text-muted-foreground">AI-Powered Editor</p>
          </div>
        </div>

        <div className="h-5 w-px bg-border" />

        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="bg-transparent text-sm text-foreground outline-none hover:bg-muted/50 focus:bg-muted/50 rounded px-2 py-1 max-w-[200px] transition-colors"
        />
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

        <Button variant="ghost" size="sm">
          <FolderOpen className="h-3.5 w-3.5" />
          Open
        </Button>
        <Button variant="ghost" size="sm">
          <Save className="h-3.5 w-3.5" />
          Save
        </Button>

        <div className="h-5 w-px bg-border mx-2" />

        <Button variant="secondary" size="sm">
          <Sparkles className="h-3.5 w-3.5 text-accent-glow" />
          Vibe Assist
        </Button>
        <Button variant="default" size="sm">
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