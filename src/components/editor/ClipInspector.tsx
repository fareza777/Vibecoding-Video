"use client";

import { useMemo } from "react";
import {
  Copy,
  Scissors,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  EFFECT_TYPE_LABELS,
  removeEffectFromClip,
  toggleEffectOnClip,
  upsertSpeedEffect,
} from "@/lib/clip-effects";
import { formatDuration, formatTime } from "@/lib/utils";
import { useEditorStore } from "@/store/editor-store";

function SliderField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{label}</span>
        <span className="font-mono text-foreground">
          {format ? format(value) : value.toFixed(2)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 accent-accent cursor-pointer"
      />
    </div>
  );
}

export function ClipInspector() {
  const clips = useEditorStore((s) => s.project.clips);
  const assets = useEditorStore((s) => s.project.assets);
  const selectedClipId = useEditorStore((s) => s.selectedClipId);
  const playhead = useEditorStore((s) => s.project.playhead);
  const updateClip = useEditorStore((s) => s.updateClip);
  const pushHistory = useEditorStore((s) => s.pushHistory);
  const duplicateClip = useEditorStore((s) => s.duplicateClip);
  const splitClipAtPlayhead = useEditorStore((s) => s.splitClipAtPlayhead);

  const clip = useMemo(
    () => clips.find((c) => c.id === selectedClipId) ?? null,
    [clips, selectedClipId]
  );

  const asset = clip
    ? assets.find((a) => a.id === clip.assetId)
    : undefined;

  const speedEffect = clip?.effects.find((e) => e.type === "speed" && e.enabled);
  const currentSpeed = (speedEffect?.params.speed as number) ?? 1;

  const textEffect = clip?.effects.find((e) => e.type === "text-overlay");

  if (!clip) {
    return (
      <div className="shrink-0 border-t border-border bg-surface/80 px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
          <div>
            <p className="text-xs font-medium text-foreground">Inspector siap dipakai</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Pilih clip di timeline untuk mengatur volume, opacity, speed, teks, dan efek.
            </p>
          </div>
          <div className="flex gap-2 text-[10px] text-muted-foreground">
            <span className="rounded-full border border-border bg-surface px-2 py-1">
              Double-click asset
            </span>
            <span className="rounded-full border border-border bg-surface px-2 py-1">
              Klik clip
            </span>
            <span className="rounded-full border border-border bg-surface px-2 py-1">
              Edit di sini
            </span>
          </div>
        </div>
      </div>
    );
  }

  const patch = (updates: Parameters<typeof updateClip>[1]) => {
    pushHistory();
    updateClip(clip.id, updates);
  };

  return (
    <div className="shrink-0 border-t border-border bg-surface/90 max-h-[220px] flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/60 shrink-0">
        <div className="min-w-0">
          <p className="text-xs font-semibold truncate">{clip.label}</p>
          <p className="text-[10px] text-muted-foreground font-mono">
            {formatTime(clip.startTime)} · {formatDuration(clip.duration)}
            {asset ? ` · ${asset.type}` : " · teks"}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[10px]"
            onClick={() => splitClipAtPlayhead()}
            title="Split di playhead (S)"
          >
            <Scissors className="h-3 w-3" />
            Split
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[10px]"
            onClick={() => duplicateClip(clip.id)}
            title="Duplikat clip"
          >
            <Copy className="h-3 w-3" />
            Duplikat
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-3 py-2 grid grid-cols-2 md:grid-cols-4 gap-3 min-w-0">
          <SliderField
            label="Volume"
            value={clip.volume}
            min={0}
            max={2}
            step={0.05}
            onChange={(v) => patch({ volume: v })}
            format={(v) => `${Math.round(v * 100)}%`}
          />
          <SliderField
            label="Opacity"
            value={clip.opacity}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => patch({ opacity: v })}
            format={(v) => `${Math.round(v * 100)}%`}
          />

          <div className="space-y-1 col-span-2 md:col-span-1">
            <p className="text-[10px] text-muted-foreground">Kecepatan</p>
            <div className="flex flex-wrap gap-1">
              {[0.5, 1, 1.5, 2].map((speed) => (
                <button
                  key={speed}
                  type="button"
                  onClick={() =>
                    patch({ effects: upsertSpeedEffect(clip, speed) })
                  }
                  className={`px-2 py-1 rounded text-[10px] font-mono border transition-colors ${
                    currentSpeed === speed
                      ? "bg-cyan/20 border-cyan/40 text-cyan"
                      : "bg-muted/50 border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          {textEffect && (
            <div className="space-y-1 col-span-2">
              <label className="text-[10px] text-muted-foreground">Teks overlay</label>
              <input
                type="text"
                value={(textEffect.params.text as string) ?? ""}
                onChange={(e) => {
                  pushHistory();
                  updateClip(clip.id, {
                    label: e.target.value,
                    effects: clip.effects.map((fx) =>
                      fx.id === textEffect.id
                        ? { ...fx, params: { ...fx.params, text: e.target.value } }
                        : fx
                    ),
                  });
                }}
                className="w-full h-8 px-2 text-xs bg-muted rounded-lg outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          )}

          {clip.effects.length > 0 && (
            <div className="space-y-1 col-span-2 md:col-span-4">
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Efek pada clip ({clip.effects.length})
              </p>
              <div className="flex flex-wrap gap-1">
                {clip.effects.map((fx) => (
                  <div
                    key={fx.id}
                    className="flex items-center gap-1 rounded-md border border-border bg-muted/40 pl-2 pr-1 py-0.5"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        patch({ effects: toggleEffectOnClip(clip, fx.id) })
                      }
                      className={`text-[10px] ${fx.enabled ? "text-cyan" : "text-muted-foreground line-through"}`}
                    >
                      {EFFECT_TYPE_LABELS[fx.type] ?? fx.type}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        patch({ effects: removeEffectFromClip(clip, fx.id) })
                      }
                      className="px-1 text-[10px] text-muted-foreground hover:text-foreground"
                      title="Buang efek"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="px-3 py-1 border-t border-border/40 text-[9px] text-muted-foreground font-mono shrink-0">
        Playhead: {formatTime(playhead)}
      </div>
    </div>
  );
}
