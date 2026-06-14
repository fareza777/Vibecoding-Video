"use client";

import { useCallback, useEffect, useState } from "react";
import { useAutoSave } from "@/hooks/use-auto-save";
import { useCollaboration } from "@/hooks/use-collaboration";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useProjectBootstrap } from "@/hooks/use-project-bootstrap";
import { isCloudConfigured, loadCloudSettings } from "@/lib/cloud-settings";
import { uploadProjectToCloud } from "@/lib/cloud-sync";
import { persistProjectMedia } from "@/lib/project-persistence";
import { useEditorStore } from "@/store/editor-store";
import { CollaborationBar } from "./CollaborationBar";
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

  const project = useEditorStore((s) => s.project);
  const exportSettings = useEditorStore((s) => s.exportSettings);
  const setLastSaved = useEditorStore((s) => s.setLastSaved);

  const {
    enabled: collabEnabled,
    collaborators,
    remoteUpdatedAt,
    broadcastUpdate,
    pullRemoteUpdates,
  } = useCollaboration();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [openProjectOpen, setOpenProjectOpen] = useState(false);
  const [pulling, setPulling] = useState(false);

  useEffect(() => {
    const handler = () => setOpenProjectOpen(true);
    window.addEventListener("vibecoding:open-project", handler);
    return () => window.removeEventListener("vibecoding:open-project", handler);
  }, []);

  const handleCloudSync = useCallback(async () => {
    const settings = loadCloudSettings();
    if (!isCloudConfigured(settings)) {
      setSettingsOpen(true);
      return;
    }
    await persistProjectMedia(project.id, project.assets);
    await uploadProjectToCloud(settings, project, exportSettings);
    setLastSaved(Date.now());
    await broadcastUpdate();
  }, [project, exportSettings, setLastSaved, broadcastUpdate]);

  const handlePullUpdates = useCallback(async () => {
    setPulling(true);
    try {
      await pullRemoteUpdates();
    } finally {
      setPulling(false);
    }
  }, [pullRemoteUpdates]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background">
      <Header
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenExport={() => setExportOpen(true)}
        onOpenProject={() => setOpenProjectOpen(true)}
        onCloudSync={handleCloudSync}
      />
      <CollaborationBar
        enabled={collabEnabled}
        collaborators={collaborators}
        remoteUpdatedAt={remoteUpdatedAt}
        onPullUpdates={handlePullUpdates}
        pulling={pulling}
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
        onCloudSynced={broadcastUpdate}
      />
    </div>
  );
}