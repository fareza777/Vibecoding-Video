"use client";

import { useEffect, useState } from "react";
import { useAutoSave } from "@/hooks/use-auto-save";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useProjectBootstrap } from "@/hooks/use-project-bootstrap";
import { Header } from "./Header";
import { MediaPanel } from "./MediaPanel";
import { OpenProjectDialog } from "./OpenProjectDialog";
import { PreviewPanel } from "./PreviewPanel";
import { ExportDialog } from "./ExportDialog";
import { SettingsDialog } from "./SettingsDialog";
import { TimelinePanel } from "./TimelinePanel";
import { VibecodingPanel } from "./VibecodingPanel";

export function EditorShell() {
  useKeyboardShortcuts();
  useProjectBootstrap();
  useAutoSave();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [openProjectOpen, setOpenProjectOpen] = useState(false);

  useEffect(() => {
    const handler = () => setOpenProjectOpen(true);
    window.addEventListener("vibecoding:open-project", handler);
    return () => window.removeEventListener("vibecoding:open-project", handler);
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background">
      <Header
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenExport={() => setExportOpen(true)}
        onOpenProject={() => setOpenProjectOpen(true)}
      />
      <div className="flex flex-1 min-h-0">
        <MediaPanel />
        <div className="flex flex-1 flex-col min-w-0">
          <PreviewPanel />
          <TimelinePanel />
        </div>
        <VibecodingPanel onOpenSettings={() => setSettingsOpen(true)} />
      </div>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} />
      <OpenProjectDialog
        open={openProjectOpen}
        onOpenChange={setOpenProjectOpen}
        onOpenSettings={() => {
          setOpenProjectOpen(false);
          setSettingsOpen(true);
        }}
      />
    </div>
  );
}