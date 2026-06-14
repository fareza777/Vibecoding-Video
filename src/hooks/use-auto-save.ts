"use client";

import { useEffect, useRef } from "react";
import { persistProjectMedia, saveAutosave } from "@/lib/project-persistence";
import { useEditorStore } from "@/store/editor-store";

const AUTOSAVE_INTERVAL_MS = 30_000;

export function useAutoSave() {
  const project = useEditorStore((s) => s.project);
  const exportSettings = useEditorStore((s) => s.exportSettings);
  const setLastSaved = useEditorStore((s) => s.setLastSaved);
  const initialDone = useRef(false);

  useEffect(() => {
    if (!initialDone.current) {
      initialDone.current = true;
      return;
    }

    const timer = setInterval(async () => {
      await persistProjectMedia(project.id, project.assets);
      saveAutosave(project, exportSettings);
      setLastSaved(Date.now());
    }, AUTOSAVE_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [project, exportSettings, setLastSaved]);
}