"use client";

import { useState } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { Header } from "./Header";
import { MediaPanel } from "./MediaPanel";
import { PreviewPanel } from "./PreviewPanel";
import { ExportDialog } from "./ExportDialog";
import { SettingsDialog } from "./SettingsDialog";
import { TimelinePanel } from "./TimelinePanel";
import { VibecodingPanel } from "./VibecodingPanel";

export function EditorShell() {
  useKeyboardShortcuts();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background">
      <Header
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenExport={() => setExportOpen(true)}
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
    </div>
  );
}