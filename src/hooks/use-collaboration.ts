"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  isCloudConfigured,
  loadCloudSettings,
} from "@/lib/cloud-settings";
import { downloadCloudProject } from "@/lib/cloud-sync";
import {
  broadcastProjectUpdate,
  createCollaborationChannel,
  subscribeCollaboration,
  unsubscribeCollaboration,
  type CollaboratorPresence,
} from "@/lib/collaboration";
import { useEditorStore } from "@/store/editor-store";

export function useCollaboration() {
  const project = useEditorStore((s) => s.project);
  const loadProject = useEditorStore((s) => s.loadProject);

  const [collaborators, setCollaborators] = useState<CollaboratorPresence[]>([]);
  const [remoteUpdatedAt, setRemoteUpdatedAt] = useState<number | null>(null);
  const [enabled, setEnabled] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const updatedAtRef = useRef(project.updatedAt);
  updatedAtRef.current = project.updatedAt;

  const [settingsVersion, setSettingsVersion] = useState(0);

  useEffect(() => {
    const onSettingsChanged = () => setSettingsVersion((v) => v + 1);
    const onStorage = (e: StorageEvent) => {
      if (e.key === "vibecoding-cloud-settings") onSettingsChanged();
    };
    window.addEventListener("vibecoding:cloud-settings-changed", onSettingsChanged);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("vibecoding:cloud-settings-changed", onSettingsChanged);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    const settings = loadCloudSettings();
    const active = isCloudConfigured(settings);
    setEnabled(active);

    if (!active) {
      setCollaborators([]);
      setRemoteUpdatedAt(null);
      if (channelRef.current) {
        unsubscribeCollaboration(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    if (channelRef.current) {
      unsubscribeCollaboration(channelRef.current);
      channelRef.current = null;
    }

    const channel = createCollaborationChannel(settings, project.id);
    channelRef.current = channel;

    subscribeCollaboration(channel, settings.displayName, {
      onPresence: setCollaborators,
      onProjectUpdate: (update) => {
        if (
          update.projectId === project.id &&
          update.updatedAt > updatedAtRef.current
        ) {
          setRemoteUpdatedAt(update.updatedAt);
        }
      },
    });

    return () => {
      unsubscribeCollaboration(channel);
      channelRef.current = null;
    };
  }, [project.id, settingsVersion]);

  const broadcastUpdate = useCallback(async () => {
    const channel = channelRef.current;
    if (!channel) return;

    const settings = loadCloudSettings();
    await broadcastProjectUpdate(channel, {
      projectId: project.id,
      updatedAt: Date.now(),
      editorName: settings.displayName?.trim() || "Editor",
    });
  }, [project.id]);

  const pullRemoteUpdates = useCallback(async () => {
    const settings = loadCloudSettings();
    if (!isCloudConfigured(settings)) return;

    const result = await downloadCloudProject(settings, project.id, true);
    loadProject(result.project, result.exportSettings);
    setRemoteUpdatedAt(null);
  }, [project.id, loadProject]);

  return {
    enabled,
    collaborators,
    remoteUpdatedAt,
    broadcastUpdate,
    pullRemoteUpdates,
  };
}