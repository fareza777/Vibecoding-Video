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
import { ClipInspector } from "./ClipInspector";
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
  const sidebarWidth = useEditorStore((s) => s.sidebarWidth);
  const vibecodingWidth = useEditorStore((s) => s.vibecodingWidth);
  const timelineHeight = useEditorStore((s) => s.timelineHeight);
  const showMediaPanel = useEditorStore((s) => s.showMediaPanel);
  const showVibecodingPanel = useEditorStore((s) => s.showVibecodingPanel);
  const focusMode = useEditorStore((s) => s.focusMode);
  const setLastSaved = useEditorStore((s) => s.setLastSaved);
  const setSidebarWidth = useEditorStore((s) => s.setSidebarWidth);
  const setVibecodingWidth = useEditorStore((s) => s.setVibecodingWidth);
  const setTimelineHeight = useEditorStore((s) => s.setTimelineHeight);

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

  const startResize = useCallback(
    (target: "sidebar" | "vibecoding" | "timeline", startClient: number) => {
      const initialSidebarWidth = sidebarWidth;
      const initialVibecodingWidth = vibecodingWidth;
      const initialTimelineHeight = timelineHeight;

      const handleMove = (event: MouseEvent) => {
        if (target === "sidebar") {
          setSidebarWidth(initialSidebarWidth + (event.clientX - startClient));
          return;
        }
        if (target === "vibecoding") {
          setVibecodingWidth(initialVibecodingWidth - (event.clientX - startClient));
          return;
        }
        setTimelineHeight(initialTimelineHeight + (startClient - event.clientY));
      };

      const handleUp = () => {
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("mouseup", handleUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor =
        target === "timeline" ? "row-resize" : "col-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleUp);
    },
    [
      sidebarWidth,
      vibecodingWidth,
      timelineHeight,
      setSidebarWidth,
      setTimelineHeight,
      setVibecodingWidth,
    ]
  );

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
        {!focusMode && showMediaPanel && (
          <>
            <div
              className="shrink-0 min-w-0"
              style={{ width: sidebarWidth }}
            >
              <MediaPanel />
            </div>
            <div
              className="w-1.5 shrink-0 cursor-col-resize bg-transparent hover:bg-cyan/20 transition-colors"
              title="Geser untuk ubah lebar panel media"
              onMouseDown={(e) => {
                e.preventDefault();
                startResize("sidebar", e.clientX);
              }}
            />
          </>
        )}
        <div className="flex flex-1 flex-col min-w-0 min-h-0 overflow-hidden">
          <PreviewPanel />
          <ClipInspector />
          <div
            className="h-1.5 shrink-0 cursor-row-resize bg-transparent hover:bg-cyan/20 transition-colors"
            title="Geser untuk ubah tinggi timeline"
            onMouseDown={(e) => {
              e.preventDefault();
              startResize("timeline", e.clientY);
            }}
          />
          <TimelinePanel />
        </div>
        {!focusMode && showVibecodingPanel && (
          <>
            <div
              className="w-1.5 shrink-0 cursor-col-resize bg-transparent hover:bg-cyan/20 transition-colors"
              title="Geser untuk ubah lebar panel AI"
              onMouseDown={(e) => {
                e.preventDefault();
                startResize("vibecoding", e.clientX);
              }}
            />
            <div
              className="shrink-0 min-w-0"
              style={{ width: vibecodingWidth }}
            >
              <VibecodingPanel onOpenSettings={() => setSettingsOpen(true)} />
            </div>
          </>
        )}
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
