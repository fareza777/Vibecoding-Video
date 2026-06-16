"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bot,
  Brain,
  History,
  Loader2,
  RotateCcw,
  Send,
  Settings,
  Sparkles,
  Wand2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { loadAiSettings, saveAiSettings } from "@/lib/ai-settings";
import { buildVibecodingContext } from "@/lib/vibecoding-context";
import {
  clearPromptHistory,
  loadPromptHistory,
  savePromptToHistory,
} from "@/lib/vibecoding-history";
import { applyVibeActions } from "@/lib/vibecoding-engine";
import { requestVibecoding } from "@/lib/vibecoding-client";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/store/editor-store";
import type { AiSettings } from "@/types/editor";

const QUICK_PROMPTS = [
  "Buat intro 5 detik dengan fade in",
  "Hapus bagian yang membosankan di tengah",
  'Tambahkan teks "Subscribe!" di detik ke-3',
  "Normalisasi volume semua clip",
  "Tambahkan cross dissolve antar clip",
  "Siapkan untuk export YouTube 1080p",
];

const WORKFLOW_PRESETS = [
  {
    label: "Hook 3 detik",
    prompt: "Buat hook 3 detik pertama yang lebih kuat dengan cut cepat dan fade in ringan",
  },
  {
    label: "Rapikan podcast",
    prompt: "Rapikan podcast clip ini, potong jeda yang terasa lambat dan siapkan subtitle besar",
  },
  {
    label: "Cutdown webinar",
    prompt: "Buat versi cutdown webinar yang lebih ringkas dan fokus pada bagian paling bernilai",
  },
  {
    label: "Siap upload",
    prompt: "Cek timeline ini lalu siapkan untuk export final yang aman diupload",
  },
];

interface VibecodingPanelProps {
  onOpenSettings?: () => void;
}

export function VibecodingPanel({ onOpenSettings }: VibecodingPanelProps) {
  const [input, setInput] = useState("");
  const [aiSettings, setAiSettings] = useState<AiSettings>(loadAiSettings());
  const [aiConnected, setAiConnected] = useState(false);
  const [promptHistory, setPromptHistory] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const messages = useEditorStore((s) => s.vibecodingMessages);
  const isProcessing = useEditorStore((s) => s.isVibecodingProcessing);
  const project = useEditorStore((s) => s.project);
  const addVibeMessage = useEditorStore((s) => s.addVibeMessage);
  const setVibecodingProcessing = useEditorStore((s) => s.setVibecodingProcessing);
  const updateClip = useEditorStore((s) => s.updateClip);
  const addClip = useEditorStore((s) => s.addClip);
  const removeClip = useEditorStore((s) => s.removeClip);
  const setPlayhead = useEditorStore((s) => s.setPlayhead);
  const setSelectedClip = useEditorStore((s) => s.setSelectedClip);
  const splitClipAtTime = useEditorStore((s) => s.splitClipAtTime);
  const pushHistory = useEditorStore((s) => s.pushHistory);
  const selectedClipId = useEditorStore((s) => s.selectedClipId);
  const activeClip = project.clips.find(
    (c) =>
      project.playhead >= c.startTime &&
      project.playhead < c.startTime + c.duration
  );

  useEffect(() => {
    const settings = loadAiSettings();
    setAiSettings(settings);
    fetch("/api/vibecoding/status")
      .then((r) => r.json())
      .then((d) => {
        const serverHasKey = Boolean(d.hasServerKey);
        const userHasKey = settings.apiKey.length > 10;
        setAiConnected(serverHasKey || userHasKey);
        if (serverHasKey && !settings.enabled) {
          const fixed = { ...settings, enabled: true };
          saveAiSettings(fixed);
          setAiSettings(fixed);
        }
      })
      .catch(() => setAiConnected(settings.apiKey.length > 10));
  }, []);

  useEffect(() => {
    const handler = () => {
      inputRef.current?.focus();
      inputRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    };
    window.addEventListener("vibecoding:focus", handler);
    return () => window.removeEventListener("vibecoding:focus", handler);
  }, []);

  useEffect(() => {
    setPromptHistory(loadPromptHistory());
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isProcessing) return;
      const normalized = text.trim();

      const settings = loadAiSettings();
      setAiSettings(settings);
      setPromptHistory(savePromptToHistory(normalized));

      addVibeMessage({ role: "user", content: normalized });
      setInput("");
      setVibecodingProcessing(true);

      const context = buildVibecodingContext(project, selectedClipId);
      const history = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-6)
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content.replace(/\*([^*]+)\*/g, "$1"),
        }));

      try {
        const result = await requestVibecoding({
          message: normalized,
          context,
          settings,
          history,
        });

        const appliedActions = applyVibeActions(result.actions, {
          updateClip,
          removeClip,
          addClip,
          setPlayhead,
          setSelectedClip,
          splitClipAtTime,
          pushHistory,
          selectedClipId,
          clips: project.clips,
          getClips: () => useEditorStore.getState().project.clips,
          playhead: project.playhead,
        });

        // Kalau ada fade-in/fade-out effect yang ke-apply, set playhead ke posisi
        // supaya user langsung lihat efeknya (default playhead=0 + fade-in = layar hitam).
        const fadeApplied = appliedActions.find(
          (a) =>
            a.applied &&
            a.type === "effect" &&
            (a.params.effect === "fade-in" || a.params.effect === "fade-out")
        );
        if (fadeApplied && activeClip) {
          const fadeDur = (fadeApplied.params.duration as number) ?? 1;
          if (fadeApplied.params.effect === "fade-in") {
            setPlayhead(activeClip.startTime + Math.min(fadeDur * 0.5, activeClip.duration / 2));
          } else {
            setPlayhead(
              activeClip.startTime +
                Math.max(activeClip.duration - fadeDur * 1.5, 0)
            );
          }
        }

        addVibeMessage({
          role: "assistant",
          content: result.message,
          actions: appliedActions,
          status: appliedActions.some((a) => a.applied) ? "applied" : "pending",
        });
      } catch (err) {
        addVibeMessage({
          role: "assistant",
          content: `Gagal memproses: ${err instanceof Error ? err.message : "Unknown error"}`,
          status: "failed",
        });
      }

      setVibecodingProcessing(false);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    },
    [
      isProcessing,
      project,
      selectedClipId,
      messages,
      addVibeMessage,
      setVibecodingProcessing,
      updateClip,
      removeClip,
      addClip,
      setPlayhead,
      setSelectedClip,
      splitClipAtTime,
      pushHistory,
      activeClip,
    ]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const modeLabel =
    aiSettings.enabled && aiConnected
      ? aiSettings.model.replace("MiniMax-", "")
      : "Local";

  return (
    <aside className="flex h-full flex-col border-l border-border bg-surface w-full shrink-0">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20">
          <Wand2 className="h-4 w-4 text-accent-glow" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">Vibecoding</h2>
          <p className="text-[10px] text-muted-foreground">
            Edit dengan bahasa natural
          </p>
        </div>
        <div
          className={cn(
            "ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
            aiSettings.enabled && aiConnected
              ? "bg-accent/10 text-accent-glow"
              : "bg-muted text-muted-foreground"
          )}
        >
          {aiSettings.enabled && aiConnected ? (
            <Brain className="h-3 w-3" />
          ) : (
            <Zap className="h-3 w-3" />
          )}
          {modeLabel}
        </div>
        {onOpenSettings && (
          <Button variant="ghost" size="icon-sm" onClick={onOpenSettings} title="Settings">
            <Settings className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-2",
                msg.role === "user" ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                  msg.role === "user"
                    ? "bg-cyan/20 text-cyan"
                    : "bg-accent/20 text-accent-glow"
                )}
              >
                {msg.role === "user" ? (
                  <Sparkles className="h-3.5 w-3.5" />
                ) : (
                  <Bot className="h-3.5 w-3.5" />
                )}
              </div>
              <div
                className={cn(
                  "flex-1 rounded-xl px-3 py-2 text-xs leading-relaxed",
                  msg.role === "user"
                    ? "bg-cyan/10 text-foreground"
                    : "bg-muted/60 text-foreground"
                )}
              >
                <MessageContent content={msg.content} />
                {msg.actions && msg.actions.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {msg.actions.map((action) => (
                      <div
                        key={action.id}
                        className={cn(
                          "flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-md",
                          action.applied
                            ? "bg-track-audio/10 text-track-audio"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        <span>{action.applied ? "✓" : "○"}</span>
                        {action.description}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />

          {isProcessing && (
            <div className="flex gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/20">
                <Loader2 className="h-3.5 w-3.5 text-accent-glow animate-spin" />
              </div>
              <div className="bg-muted/60 rounded-xl px-3 py-2 text-xs text-muted-foreground">
                {aiSettings.enabled && aiConnected
                  ? "MiniMax menganalisis timeline & perintah..."
                  : "Menganalisis perintah editing..."}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-border space-y-2">
        {promptHistory.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                <History className="h-3 w-3" />
                Riwayat cepat
              </p>
              <button
                type="button"
                onClick={() => {
                  clearPromptHistory();
                  setPromptHistory([]);
                }}
                className="text-[10px] text-muted-foreground hover:text-foreground"
              >
                Bersihkan
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {promptHistory.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  disabled={isProcessing}
                  className="max-w-full truncate rounded-full border border-border bg-surface px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:border-cyan/20 hover:text-foreground disabled:opacity-50"
                  title={prompt}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-1">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => sendMessage(prompt)}
              disabled={isProcessing}
              className="text-[10px] px-2 py-1 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            <RotateCcw className="h-3 w-3" />
            Preset workflow
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {WORKFLOW_PRESETS.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => sendMessage(item.prompt)}
                disabled={isProcessing}
                className="rounded-lg border border-border bg-muted/40 px-2.5 py-2 text-left transition-colors hover:border-cyan/25 hover:bg-muted disabled:opacity-50"
              >
                <p className="text-[10px] font-medium text-foreground">{item.label}</p>
                <p className="mt-1 line-clamp-2 text-[10px] text-muted-foreground">
                  {item.prompt}
                </p>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              aiConnected
                ? "Jelaskan edit kompleks — AI paham konteks timeline..."
                : "Jelaskan edit yang Anda inginkan..."
            }
            disabled={isProcessing}
            className="flex-1 h-9 px-3 text-xs bg-muted rounded-lg outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isProcessing}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </form>
      </div>
    </aside>
  );
}

function MessageContent({ content }: { content: string }) {
  const parts = content.split(/(\*[^*]+\*|`[^`]+`)/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith("*") && part.endsWith("*")) {
          return (
            <em key={i} className="text-accent-glow not-italic font-medium">
              {part.slice(1, -1)}
            </em>
          );
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code
              key={i}
              className="px-1 py-0.5 rounded bg-muted font-mono text-[10px]"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        return part.split("\n").map((line, j) => (
          <span key={`${i}-${j}`}>
            {j > 0 && <br />}
            {line}
          </span>
        ));
      })}
    </span>
  );
}
