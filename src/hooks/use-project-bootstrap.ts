"use client";

import { useEffect, useRef } from "react";
import { loadAutosave } from "@/lib/project-persistence";
import { useEditorStore } from "@/store/editor-store";

export function useProjectBootstrap() {
  const loadProject = useEditorStore((s) => s.loadProject);
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    loadAutosave().then((saved) => {
      if (saved) {
        loadProject(saved.project, saved.exportSettings);
      }
    });
  }, [loadProject]);
}