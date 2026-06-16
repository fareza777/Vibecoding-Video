"use client";

import { useEffect, useRef } from "react";
import { persistProjectMedia, saveAutosave } from "@/lib/project-persistence";
import { useEditorStore } from "@/store/editor-store";

const AUTOSAVE_INTERVAL_MS = 30_000;

export function useAutoSave() {
  const projectId = useEditorStore((s) => s.project.id);
  const setLastSaved = useEditorStore((s) => s.setLastSaved);
  const projectRef = useRef(useEditorStore.getState().project);
  const exportRef = useRef(useEditorStore.getState().exportSettings);

  useEffect(() => {
    return useEditorStore.subscribe((state) => {
      projectRef.current = state.project;
      exportRef.current = state.exportSettings;
    });
  }, []);

  useEffect(() => {
    const flush = () => {
      const project = projectRef.current;
      const exportSettings = exportRef.current;
      void persistProjectMedia(project.id, project.assets);
      saveAutosave(project, exportSettings);
      setLastSaved(Date.now());
    };

    const timer = setInterval(flush, AUTOSAVE_INTERVAL_MS);

    const onBeforeUnload = () => {
      flush();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    const onHide = () => {
      flush();
    };
    document.addEventListener("visibilitychange", onHide);

    return () => {
      clearInterval(timer);
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [projectId, setLastSaved]);
}