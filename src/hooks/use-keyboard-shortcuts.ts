"use client";

import { useEffect } from "react";
import { useEditorStore } from "@/store/editor-store";

export function useKeyboardShortcuts() {
  const setIsPlaying = useEditorStore((s) => s.setIsPlaying);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const setPlayhead = useEditorStore((s) => s.setPlayhead);
  const playhead = useEditorStore((s) => s.project.playhead);
  const duration = useEditorStore((s) => s.project.duration);
  const fps = useEditorStore((s) => s.project.fps);
  const selectedClipId = useEditorStore((s) => s.selectedClipId);
  const removeClip = useEditorStore((s) => s.removeClip);
  const splitClipAtPlayhead = useEditorStore((s) => s.splitClipAtPlayhead);
  const setTimelineZoom = useEditorStore((s) => s.setTimelineZoom);
  const zoom = useEditorStore((s) => s.project.zoom);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const toggleSnap = useEditorStore((s) => s.toggleSnap);
  const setSelectedClip = useEditorStore((s) => s.setSelectedClip);
  const saveProject = useEditorStore((s) => s.saveProject);

  useEffect(() => {
    const isInputFocused = () => {
      const el = document.activeElement;
      if (!el) return false;
      const tag = el.tagName.toLowerCase();
      return tag === "input" || tag === "textarea" || (el as HTMLElement).isContentEditable;
    };

    const frameStep = 1 / fps;

    const handler = (e: KeyboardEvent) => {
      if (isInputFocused()) return;

      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;

      if (key === " " && !ctrl) {
        e.preventDefault();
        setIsPlaying(!isPlaying);
        return;
      }

      if (key === "delete" || key === "backspace") {
        if (selectedClipId) {
          e.preventDefault();
          removeClip(selectedClipId);
        }
        return;
      }

      if (key === "s" && !ctrl) {
        e.preventDefault();
        splitClipAtPlayhead();
        return;
      }

      if (key === "n" && !ctrl) {
        e.preventDefault();
        toggleSnap();
        return;
      }

      if (key === "escape") {
        setSelectedClip(null);
        return;
      }

      if (ctrl && key === "s") {
        e.preventDefault();
        saveProject();
        return;
      }

      if (ctrl && key === "o") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("vibecoding:open-project"));
        return;
      }

      if (ctrl && key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      if ((ctrl && key === "y") || (ctrl && e.shiftKey && key === "z")) {
        e.preventDefault();
        redo();
        return;
      }

      if (key === "arrowleft") {
        e.preventDefault();
        const step = e.shiftKey ? 1 : frameStep;
        setPlayhead(Math.max(0, playhead - step));
        return;
      }

      if (key === "arrowright") {
        e.preventDefault();
        const step = e.shiftKey ? 1 : frameStep;
        setPlayhead(Math.min(duration, playhead + step));
        return;
      }

      if (key === "home") {
        e.preventDefault();
        setPlayhead(0);
        return;
      }

      if (key === "end") {
        e.preventDefault();
        setPlayhead(duration);
        return;
      }

      if ((key === "=" || key === "+") && ctrl) {
        e.preventDefault();
        setTimelineZoom(zoom + 0.25);
        return;
      }

      if (key === "-" && ctrl) {
        e.preventDefault();
        setTimelineZoom(zoom - 0.25);
        return;
      }

      if (key === "j") {
        e.preventDefault();
        setPlayhead(Math.max(0, playhead - 2));
        setIsPlaying(false);
        return;
      }

      if (key === "k") {
        e.preventDefault();
        setIsPlaying(false);
        return;
      }

      if (key === "l") {
        e.preventDefault();
        setPlayhead(Math.min(duration, playhead + 2));
        setIsPlaying(true);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    isPlaying,
    setIsPlaying,
    playhead,
    duration,
    fps,
    selectedClipId,
    removeClip,
    splitClipAtPlayhead,
    setPlayhead,
    setTimelineZoom,
    zoom,
    undo,
    redo,
    toggleSnap,
    setSelectedClip,
    saveProject,
  ]);
}