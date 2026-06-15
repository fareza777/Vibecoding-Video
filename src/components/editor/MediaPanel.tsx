"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Film,
  ImageIcon,
  Loader2,
  Music,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  appendEffectToClip,
  buildTextClip,
  EFFECT_PRESETS,
  TEXT_PRESETS,
} from "@/lib/clip-effects";
import { processImportedMedia } from "@/lib/media-import";
import { yieldToMain } from "@/lib/media-utils";
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

function buildTimelineClip(asset: MediaAsset, startTime: number) {
  const trackMap: Record<MediaType, string> = {
    video: "track-video-1",
    audio: "track-audio-1",
    image: "track-video-2",
  };

  const colorMap: Record<MediaType, string> = {
    video: "#38bdf8",
    audio: "#34d399",
    image: "#fbbf24",
  };

  const duration = asset.duration > 0 ? asset.duration : 5;

  return {
    assetId: asset.id,
    trackId: trackMap[asset.type],
    startTime,
    duration,
    trimStart: 0,
    trimEnd: duration,
    label: asset.name,
    color: colorMap[asset.type],
    opacity: 1,
    volume: 1,
    effects: [],
  };
}

export function MediaPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [loadingAssets, setLoadingAssets] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [panelHint, setPanelHint] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  const activePanel = useEditorStore((s) => s.activePanel);
  const setActivePanel = useEditorStore((s) => s.setActivePanel);
  const projectId = useEditorStore((s) => s.project.id);
  const assets = useEditorStore((s) => s.project.assets);
  const addAsset = useEditorStore((s) => s.addAsset);
  const removeAsset = useEditorStore((s) => s.removeAsset);
  const addClip = useEditorStore((s) => s.addClip);
  const finalizeAssetImport = useEditorStore((s) => s.finalizeAssetImport);
  const playhead = useEditorStore((s) => s.project.playhead);
  const clips = useEditorStore((s) => s.project.clips);

  const markLoading = useCallback((assetId: string, loading: boolean) => {
    setLoadingAssets((prev) => {
      const next = new Set(prev);
      if (loading) next.add(assetId);
      else next.delete(assetId);
      return next;
    });
  }, []);

  const addToTimeline = useCallback(
    (asset: MediaAsset) => {
      if (clips.some((c) => c.assetId === asset.id)) return;
      addClip(buildTimelineClip(asset, playhead), true);
    },
    [addClip, clips, playhead]
  );

  const handleRemoveAsset = useCallback(
    (assetId: string) => {
      markLoading(assetId, false);
      removeAsset(assetId);
      setSelectedAssetId((prev) => (prev === assetId ? null : prev));
    },
    [markLoading, removeAsset]
  );

  const selectedAsset = assets.find((a) => a.id === selectedAssetId) ?? null;

  useEffect(() => {
    if (assets.length === 0) {
      setSelectedAssetId(null);
      return;
    }
    if (!selectedAssetId || !assets.some((a) => a.id === selectedAssetId)) {
      setSelectedAssetId(assets[0].id);
    }
  }, [assets, selectedAssetId]);

  const filteredAssets = assets.filter((a) =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const fileList = Array.from(files);
      setImporting(true);

      for (const file of fileList) {
        const type = detectMediaType(file);
        const url = URL.createObjectURL(file);
        const assetId = uuidv4();

        const asset: MediaAsset = {
          id: assetId,
          name: file.name,
          type,
          url,
          duration: 0,
          size: file.size,
          createdAt: Date.now(),
        };

        addAsset(asset);
        markLoading(assetId, true);
        addToTimeline(asset);
        setSelectedAssetId(assetId);

        void processImportedMedia(projectId, assetId, file, url, type, {
          onProbeComplete: (id, data) => {
            finalizeAssetImport(id, data);
          },
          onWaveformComplete: (id, waveform) => {
            finalizeAssetImport(id, { waveform });
          },
          onDone: (id) => {
            markLoading(id, false);
          },
        });
      }

      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";

      void yieldToMain();
    },
    [addAsset, addToTimeline, finalizeAssetImport, markLoading, projectId]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  return (
    <aside className="flex flex-col h-full border-r border-border bg-surface w-[300px] shrink-0 min-h-0">
      <div className="flex border-b border-border shrink-0">
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
          <div className="p-3 space-y-2 shrink-0 border-b border-border/50">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                placeholder="Cari media..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
              disabled={importing}
              onClick={() => fileInputRef.current?.click()}
            >
              {importing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              {importing ? "Importing..." : "Import Media"}
            </Button>

          </div>

          <div
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <div className="px-3 pb-3 pt-2 space-y-2">
              {panelHint && (
                <p className="text-[10px] text-cyan bg-cyan/10 border border-cyan/20 rounded-lg px-2 py-1.5">
                  {panelHint}
                </p>
              )}

              {assets.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-accent/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground">
                    Drop file atau klik untuk import
                  </p>
                </div>
              ) : (
                filteredAssets.map((asset) => {
                  const Icon = TYPE_ICONS[asset.type];
                  const isLoading = loadingAssets.has(asset.id);
                  const onTimeline = clips.some((c) => c.assetId === asset.id);
                  const isSelected = selectedAssetId === asset.id;

                  return (
                    <div
                      key={asset.id}
                      className={cn(
                        "relative rounded-lg border p-2 pr-10 transition-colors cursor-pointer",
                        isSelected
                          ? "border-cyan/50 bg-cyan/5 ring-1 ring-cyan/20"
                          : "border-border/60 bg-muted/40 hover:bg-muted/60"
                      )}
                      onClick={() => setSelectedAssetId(asset.id)}
                    >
                      <button
                        type="button"
                        title={`Hapus ${asset.name}`}
                        aria-label={`Hapus ${asset.name}`}
                        className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-white shadow-md hover:bg-red-500 hover:scale-105 transition-all z-10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveAsset(asset.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>

                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-md bg-surface-elevated shrink-0",
                            TYPE_COLORS[asset.type]
                          )}
                        >
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Icon className="h-4 w-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate pr-1">{asset.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {isLoading || asset.duration <= 0
                              ? "Memuat..."
                              : `${formatDuration(asset.duration)} · ${(asset.size / 1024 / 1024).toFixed(1)} MB`}
                            {onTimeline ? " · timeline" : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-1.5 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-8 text-[10px]"
                          onClick={(e) => {
                            e.stopPropagation();
                            addToTimeline(asset);
                          }}
                        >
                          <Plus className="h-3 w-3" />
                          Timeline
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="flex-1 h-8 text-[10px] font-semibold"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveAsset(asset.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Hapus
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="shrink-0 border-t border-border bg-surface-elevated/80 p-3 space-y-1.5">
            {selectedAsset ? (
              <Button
                variant="destructive"
                size="lg"
                className="w-full h-10 text-sm font-semibold shadow-lg shadow-red-900/30"
                onClick={() => handleRemoveAsset(selectedAsset.id)}
              >
                <Trash2 className="h-5 w-5" />
                Hapus Media Terpilih
              </Button>
            ) : assets.length > 0 ? (
              <p className="text-[10px] text-center text-muted-foreground">
                Klik kartu media — tombol hapus merah di pojok kanan atas setiap file
              </p>
            ) : null}
          </div>
        </>
      )}

      {activePanel === "effects" && <EffectsLibrary onHint={setPanelHint} />}
      {activePanel === "text" && <TextLibrary onHint={setPanelHint} />}
      {activePanel === "audio" && (
        <AudioLibrary
          onImportClick={() => {
            setActivePanel("media");
            fileInputRef.current?.click();
          }}
          onHint={setPanelHint}
        />
      )}
    </aside>
  );
}

function EffectsLibrary({ onHint }: { onHint: (msg: string | null) => void }) {
  const selectedClipId = useEditorStore((s) => s.selectedClipId);
  const clips = useEditorStore((s) => s.project.clips);
  const updateClip = useEditorStore((s) => s.updateClip);
  const pushHistory = useEditorStore((s) => s.pushHistory);

  const applyEffect = (preset: (typeof EFFECT_PRESETS)[number]) => {
    const clip = clips.find((c) => c.id === selectedClipId) ?? clips[0];
    if (!clip) {
      onHint("Pilih clip di timeline dulu, lalu klik efek.");
      return;
    }
    pushHistory();
    updateClip(clip.id, {
      effects: appendEffectToClip(clip, preset),
    });
    onHint(`"${preset.name}" → ${clip.label}`);
  };

  return (
    <ScrollArea className="flex-1 min-h-0 p-3">
      <p className="text-[10px] text-muted-foreground mb-2">
        {selectedClipId ? "Klik efek untuk menambah ke clip terpilih" : "Pilih clip di timeline"}
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {EFFECT_PRESETS.map((fx) => (
          <button
            key={`${fx.name}-${fx.type}`}
            type="button"
            onClick={() => applyEffect(fx)}
            className="p-2.5 rounded-lg bg-muted/50 hover:bg-muted hover:border-cyan/30 border border-transparent text-[11px] font-medium transition-colors text-left"
          >
            <SparklesIcon className="h-3.5 w-3.5 text-track-effect mb-1" />
            {fx.name}
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}

function TextLibrary({ onHint }: { onHint: (msg: string | null) => void }) {
  const playhead = useEditorStore((s) => s.project.playhead);
  const addClip = useEditorStore((s) => s.addClip);
  const pushHistory = useEditorStore((s) => s.pushHistory);
  const [customText, setCustomText] = useState("Teks Anda");

  const addText = (preset: (typeof TEXT_PRESETS)[number]) => {
    pushHistory();
    addClip(buildTextClip(preset, playhead));
    onHint(`"${preset.label}" di ${playhead.toFixed(1)}s`);
  };

  const addCustom = () => {
    if (!customText.trim()) return;
    pushHistory();
    addClip(
      buildTextClip(
        {
          label: "Custom",
          text: customText.trim(),
          position: "center",
          duration: 5,
        },
        playhead
      )
    );
    onHint(`Teks custom ditambahkan.`);
  };

  return (
    <ScrollArea className="flex-1 min-h-0 p-3 space-y-2">
      <p className="text-[10px] text-muted-foreground">Teks di posisi playhead</p>

      <div className="flex gap-1">
        <input
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          className="flex-1 h-8 px-2 text-xs bg-muted rounded-lg outline-none focus:ring-1 focus:ring-accent"
          placeholder="Teks custom..."
        />
        <Button size="sm" className="h-8 text-[10px]" onClick={addCustom}>
          Tambah
        </Button>
      </div>

      {TEXT_PRESETS.map((preset) => (
        <button
          key={preset.label}
          type="button"
          onClick={() => addText(preset)}
          className="w-full p-2.5 rounded-lg bg-muted/50 hover:bg-muted hover:border-cyan/30 border border-transparent text-xs text-left"
        >
          <span className="text-track-text font-bold text-sm">{preset.label}</span>
          <p className="text-[10px] text-muted-foreground mt-0.5">{preset.text}</p>
        </button>
      ))}
    </ScrollArea>
  );
}

function AudioLibrary({
  onImportClick,
  onHint,
}: {
  onImportClick: () => void;
  onHint: (msg: string | null) => void;
}) {
  const selectedClipId = useEditorStore((s) => s.selectedClipId);
  const clips = useEditorStore((s) => s.project.clips);
  const updateClip = useEditorStore((s) => s.updateClip);
  const pushHistory = useEditorStore((s) => s.pushHistory);

  const audioClip = clips.find((c) => c.id === selectedClipId);

  return (
    <ScrollArea className="flex-1 min-h-0 p-3 space-y-3">
      <Button variant="outline" size="sm" className="w-full" onClick={onImportClick}>
        <Upload className="h-3.5 w-3.5" />
        Import Audio (MP3/WAV)
      </Button>

      {audioClip && audioClip.trackId.startsWith("track-audio") && (
        <div className="space-y-2 p-2 rounded-lg border border-border bg-muted/30">
          <p className="text-[10px] text-muted-foreground">Volume clip audio terpilih</p>
          <input
            type="range"
            min={0}
            max={2}
            step={0.05}
            value={audioClip.volume}
            onChange={(e) => {
              pushHistory();
              updateClip(audioClip.id, { volume: parseFloat(e.target.value) });
            }}
            className="w-full h-1 accent-accent"
          />
          <p className="text-[10px] font-mono text-center">
            {Math.round(audioClip.volume * 100)}%
          </p>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">
        Audio track mixing aktif saat export (toggle di dialog Export).
      </p>
      <button
        type="button"
        className="text-[10px] text-cyan hover:underline"
        onClick={() => onHint("Import file audio asli lewat tombol di atas.")}
      >
        Bukan sample — pakai file Anda sendiri
      </button>
    </ScrollArea>
  );
}