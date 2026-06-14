"use client";

import { useCallback, useRef, useState } from "react";
import {
  Bot,
  Loader2,
  Send,
  Sparkles,
  Wand2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { applyVibeActions, parseVibecodingCommand } from "@/lib/vibecoding-engine";
import { useEditorStore } from "@/store/editor-store";

const QUICK_PROMPTS = [
  "Potong 0:30 sampai 1:15",
  "Tambahkan fade in",
  "Percepat 1.5x",
  'Tambahkan teks "Subscribe!"',
  "Tambahkan fade out",
  "Export video",
];

export function VibecodingPanel() {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messages = useEditorStore((s) => s.vibecodingMessages);
  const isProcessing = useEditorStore((s) => s.isVibecodingProcessing);
  const addVibeMessage = useEditorStore((s) => s.addVibeMessage);
  const setVibecodingProcessing = useEditorStore((s) => s.setVibecodingProcessing);
  const updateClip = useEditorStore((s) => s.updateClip);
  const addClip = useEditorStore((s) => s.addClip);
  const selectedClipId = useEditorStore((s) => s.selectedClipId);
  const clips = useEditorStore((s) => s.project.clips);
  const playhead = useEditorStore((s) => s.project.playhead);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isProcessing) return;

      addVibeMessage({ role: "user", content: text.trim() });
      setInput("");
      setVibecodingProcessing(true);

      await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));

      const parsed = parseVibecodingCommand(text);
      const appliedActions = applyVibeActions(parsed.actions, {
        updateClip,
        selectedClipId,
        clips,
        addClip,
        playhead,
      });

      addVibeMessage({
        role: "assistant",
        content: parsed.response,
        actions: appliedActions,
        status: appliedActions.some((a) => a.applied) ? "applied" : "pending",
      });

      setVibecodingProcessing(false);

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    },
    [
      isProcessing,
      addVibeMessage,
      setVibecodingProcessing,
      updateClip,
      selectedClipId,
      clips,
      addClip,
      playhead,
    ]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <aside className="flex flex-col border-l border-border bg-surface w-[360px] shrink-0">
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
        <div className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 text-[10px] text-accent-glow font-medium">
          <Zap className="h-3 w-3" />
          AI Ready
        </div>
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
                Menganalisis perintah editing...
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-border space-y-2">
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

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Jelaskan edit yang Anda inginkan..."
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
  const parts = content.split(/(\*[^*]+\*)/g);
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