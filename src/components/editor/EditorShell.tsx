"use client";

import { Header } from "./Header";
import { MediaPanel } from "./MediaPanel";
import { PreviewPanel } from "./PreviewPanel";
import { TimelinePanel } from "./TimelinePanel";
import { VibecodingPanel } from "./VibecodingPanel";

export function EditorShell() {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background">
      <Header />
      <div className="flex flex-1 min-h-0">
        <MediaPanel />
        <div className="flex flex-1 flex-col min-w-0">
          <PreviewPanel />
          <TimelinePanel />
        </div>
        <VibecodingPanel />
      </div>
    </div>
  );
}