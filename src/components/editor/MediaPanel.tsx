"use client";

import { useCallback, useRef } from "react";
import {
  Film,
  ImageIcon,
  Music,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, formatDuration } from "@/lib/utils";
import { useEditorStore } from "@/store/editor-store";
import type { MediaAsset, MediaType, PanelId } from "@/types/editor";

const PANEL_TABS: { id: PanelId; label: string; icon: React.ElementType }[] = [
  { id: "media", label: "Media", icon: Film },
  { id: "effects", label: "Effects", icon: SparklesIcon },
  { id: "text", label: "Text", icon: TextIcon },
  { id: "audio", label: "Audio", icon: Music },
];

function SparklesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
      <path d="M5 17l.75 2.25L8 20l-2.25.75L5 23l-.75-2.25L2 20l2.25-.75L5 17z" />
    </svg>
  );
}

function TextIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path d="M4 7V4h16v3M9 20h6M12 4v16" />
    </svg>
  );
}

const TYPE_ICONS: Record<MediaType, React.ElementType> = {
  video: Film,
  audio: Music,
  image: ImageIcon,
};

const TYPE_COLORS: Record<MediaType, string> = {
  video: "text-track-video",
  audio: "text-track-audio",
  image: "text-track-text",
};

function detectMediaType(file: File): MediaType {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "image";
}

export function MediaPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activePanel = useEditorStore((s) => s.activePanel);
  const setActivePanel = useEditorStore((s) => s.setActivePanel);
  const assets = useEditorStore((s) => s.project.assets);
  const addAsset = useEditorStore((s) => s.addAsset);
  const removeAsset = useEditorStore((s) => s.removeAsset);
  const addClip = useEditorStore((s) => s.addClip);
  const playhead = useEditorStore((s) => s.project.playhead);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files) return;

      for (const file of Array.from(files)) {
        const type = detectMediaType(file);
        const url = URL.createObjectURL(file);

        let duration = 5;
        if (type === "video" || type === "audio") {
          duration = await getMediaDuration(url, type);
        }

        const asset: MediaAsset = {
          id: uuidv4(),
          name: file.name,
          type,
          url,
          duration,
          size: file.size,
          createdAt: Date.now(),
        };

        addAsset(asset);
      }
    },
    [addAsset]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const addToTimeline = (asset: MediaAsset) => {
    const trackMap: Record<MediaType, string> = {
      video: "track-video-1",
      audio: "track-audio-1",
      image: "track-video-2",
    };

    const colorMap: Record<MediaType, string> = {
      video: "#3b82f6",
      audio: "#22c55e",
      image: "#f59e0b",
    };

    addClip({
      assetId: asset.id,
      trackId: trackMap[asset.type],
      startTime: playhead,
      duration: asset.duration,
      trimStart: 0,
      trimEnd: asset.duration,
      label: asset.name,
      color: colorMap[asset.type],
      opacity: 1,
      volume: 1,
      effects: [],
    });
  };

  return (
    <aside className="flex flex-col border-r border-border bg-surface w-[280px] shrink-0">
      <div className="flex border-b border-border">
        {PANEL_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActivePanel(tab.id)}
            className={cn(
              "flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors",
              activePanel === tab.id
                ? "text-accent-glow border-b-2 border-accent"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {activePanel === "media" && (
        <>
          <div className="p-3 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                placeholder="Search media..."
                className="w-full h-8 pl-8 pr-3 text-xs bg-muted rounded-lg outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="video/*,audio/*,image/*"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" />
              Import Media
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div
              className="px-3 pb-3 space-y-2 min-h-[120px]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              {assets.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-accent/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground">
                    Drop files here or click to import
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    MP4, MOV, MP3, WAV, JPG, PNG
                  </p>
                </div>
              ) : (
                assets.map((asset) => {
                  const Icon = TYPE_ICONS[asset.type];
                  return (
                    <div
                      key={asset.id}
                      className="group flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                      onDoubleClick={() => addToTimeline(asset)}
                    >
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-md bg-surface-elevated shrink-0",
                          TYPE_COLORS[asset.type]
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{asset.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatDuration(asset.duration)} ·{" "}
                          {(asset.size / 1024 / 1024).toFixed(1)} MB
                        </p>
                      </div>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            addToTimeline(asset);
                          }}
                          title="Add to timeline"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeAsset(asset.id);
                          }}
                          title="Remove"
                        >
                          <Trash2 className="h-3 w-3 text-red-400" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </>
      )}

      {activePanel === "effects" && <EffectsLibrary />}
      {activePanel === "text" && <TextLibrary />}
      {activePanel === "audio" && <AudioLibrary />}
    </aside>
  );
}

function EffectsLibrary() {
  const effects = [
    { name: "Fade In", type: "fade-in" },
    { name: "Fade Out", type: "fade-out" },
    { name: "Blur", type: "blur" },
    { name: "Brightness", type: "brightness" },
    { name: "Speed Ramp", type: "speed" },
    { name: "Zoom", type: "zoom" },
    { name: "Cross Dissolve", type: "transition" },
  ];

  return (
    <ScrollArea className="flex-1 p-3">
      <div className="grid grid-cols-2 gap-2">
        {effects.map((fx) => (
          <button
            key={fx.type}
            className="p-3 rounded-lg bg-muted/50 hover:bg-muted text-xs font-medium transition-colors text-left"
          >
            <SparklesIcon className="h-4 w-4 text-track-effect mb-1.5" />
            {fx.name}
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}

function TextLibrary() {
  const presets = ["Title", "Subtitle", "Lower Third", "Caption", "End Card"];

  return (
    <ScrollArea className="flex-1 p-3 space-y-2">
      {presets.map((preset) => (
        <button
          key={preset}
          className="w-full p-3 rounded-lg bg-muted/50 hover:bg-muted text-xs font-medium transition-colors text-left"
        >
          <span className="text-track-text font-bold text-sm">{preset}</span>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Drag to timeline or use Vibecoding
          </p>
        </button>
      ))}
    </ScrollArea>
  );
}

function AudioLibrary() {
  const presets = ["Background Music", "Whoosh SFX", "Click SFX", "Ambient"];

  return (
    <ScrollArea className="flex-1 p-3 space-y-2">
      {presets.map((preset) => (
        <button
          key={preset}
          className="w-full p-3 rounded-lg bg-muted/50 hover:bg-muted text-xs font-medium transition-colors text-left flex items-center gap-2"
        >
          <Music className="h-4 w-4 text-track-audio" />
          {preset}
        </button>
      ))}
    </ScrollArea>
  );
}

function getMediaDuration(url: string, type: "video" | "audio"): Promise<number> {
  return new Promise((resolve) => {
    const el = document.createElement(type);
    el.preload = "metadata";
    el.onloadedmetadata = () => {
      resolve(el.duration || 5);
    };
    el.onerror = () => resolve(5);
    el.src = url;
  });
}