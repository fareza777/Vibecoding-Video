"use client";

import { useEffect } from "react";
import { useEditorStore } from "@/store/editor-store";

export function useKeyboardShortcuts() {
  useEffect(() => {
    const isInputFocused = () => {
      const el = document.activeElement;
      if (!el) return false;
      const tag = el.tagName.toLowerCase();
      return tag === "input" || tag === "textarea" || (el as HTMLElement).isContentEditable;
    };

    const handler = (e: KeyboardEvent) => {
      if (isInputFocused()) return;

      const s = useEditorStore.getState();
      const ctrl = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      const frameStep = 1 / s.project.fps;

      if (key === " " && !ctrl) {
        e.preventDefault();
        s.setIsPlaying(!s.isPlaying);
        return;
      }

      if (key === "delete" || key === "backspace") {
        if (s.selectedClipId) {
          e.preventDefault();
          s.removeClip(s.selectedClipId);
        }
        return;
      }

      if (key === "s" && !ctrl) {
        e.preventDefault();
        s.splitClipAtPlayhead();
        return;
      }

      if (key === "n" && !ctrl) {
        e.preventDefault();
        s.toggleSnap();
        return;
      }

      if (key === "escape") {
        s.setSelectedClip(null);
        return;
      }

      if (ctrl && key === "s") {
        e.preventDefault();
        s.saveProject();
        return;
      }

      if (ctrl && key === "o") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("vibecoding:open-project"));
        return;
      }

      if (ctrl && key === "z" && !e.shiftKey) {
        e.preventDefault();
        s.undo();
        return;
      }

      if ((ctrl && key === "y") || (ctrl && e.shiftKey && key === "z")) {
        e.preventDefault();
        s.redo();
        return;
      }

      if (key === "arrowleft") {
        e.preventDefault();
        const step = e.shiftKey ? 1 : frameStep;
        s.setPlayhead(Math.max(0, s.project.playhead - step));
        return;
      }

      if (key === "arrowright") {
        e.preventDefault();
        const step = e.shiftKey ? 1 : frameStep;
        s.setPlayhead(Math.min(s.project.duration, s.project.playhead + step));
        return;
      }

      if (key === "home") {
        e.preventDefault();
        s.setPlayhead(0);
        return;
      }

      if (key === "end") {
        e.preventDefault();
        s.setPlayhead(s.project.duration);
        return;
      }

      if ((key === "=" || key === "+") && ctrl) {
        e.preventDefault();
        s.setTimelineZoom(s.project.zoom + 0.25);
        return;
      }

      if (key === "-" && ctrl) {
        e.preventDefault();
        s.setTimelineZoom(s.project.zoom - 0.25);
        return;
      }

      if (key === "j") {
        e.preventDefault();
        s.setPlayhead(Math.max(0, s.project.playhead - 2));
        s.setIsPlaying(false);
        return;
      }

      if (key === "k") {
        e.preventDefault();
        s.setIsPlaying(false);
        return;
      }

      if (key === "l") {
        e.preventDefault();
        s.setPlayhead(Math.min(s.project.duration, s.project.playhead + 2));
        s.setIsPlaying(true);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}