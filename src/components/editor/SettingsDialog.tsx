"use client";

import { useCallback, useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, Cloud, Eye, EyeOff, Key, Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DEFAULT_AI_SETTINGS,
  loadAiSettings,
  saveAiSettings,
} from "@/lib/ai-settings";
import {
  DEFAULT_CLOUD_SETTINGS,
  isCloudConfigured,
  loadCloudSettings,
  saveCloudSettings,
} from "@/lib/cloud-settings";
import { testCloudConnection } from "@/lib/cloud-sync";
import type { AiModel, AiSettings, CloudSettings } from "@/types/editor";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MODELS: { id: AiModel; label: string; desc: string }[] = [
  { id: "MiniMax-M3", label: "MiniMax M3", desc: "Coding/Agentic SOTA — recommended" },
  { id: "MiniMax-M2.5", label: "MiniMax M2.5", desc: "Balanced performance" },
  { id: "MiniMax-M2.1", label: "MiniMax M2.1", desc: "Fast & economical" },
];

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [settings, setSettings] = useState<AiSettings>(DEFAULT_AI_SETTINGS);
  const [cloudSettings, setCloudSettings] = useState<CloudSettings>(DEFAULT_CLOUD_SETTINGS);
  const [showKey, setShowKey] = useState(false);
  const [showCloudKey, setShowCloudKey] = useState(false);
  const [hasServerKey, setHasServerKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [cloudTest, setCloudTest] = useState<string | null>(null);
  const [testingCloud, setTestingCloud] = useState(false);

  useEffect(() => {
    if (open) {
      setSettings(loadAiSettings());
      setCloudSettings(loadCloudSettings());
      setCloudTest(null);
      fetch("/api/vibecoding/status")
        .then((r) => r.json())
        .then((d) => setHasServerKey(d.hasServerKey))
        .catch(() => setHasServerKey(false));
    }
  }, [open]);

  const handleSave = useCallback(() => {
    saveAiSettings(settings);
    saveCloudSettings(cloudSettings);
    window.dispatchEvent(new CustomEvent("vibecoding:cloud-settings-changed"));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [settings, cloudSettings]);

  const handleTestCloud = useCallback(async () => {
    setTestingCloud(true);
    setCloudTest(null);
    const result = await testCloudConnection(cloudSettings);
    setCloudTest(result.ok ? `✓ ${result.message}` : `✗ ${result.message}`);
    setTestingCloud(false);
  }, [cloudSettings]);

  const update = (patch: Partial<AiSettings>) =>
    setSettings((s) => ({ ...s, ...patch }));

  const updateCloud = (patch: Partial<CloudSettings>) =>
    setCloudSettings((s) => ({ ...s, ...patch }));

  const isConnected = hasServerKey || settings.apiKey.length > 10;
  const cloudReady = isCloudConfigured(cloudSettings);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md glass-panel rounded-2xl shadow-2xl glow-accent max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-surface/95 backdrop-blur-sm z-10">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-accent-glow" />
              <Dialog.Title className="text-sm font-semibold">Settings</Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon-sm">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          <div className="p-5 space-y-5">
            <section className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Vibecoding AI — MiniMax
              </h3>

              <label className="flex items-center justify-between">
                <span className="text-xs">Enable MiniMax AI</span>
                <button
                  onClick={() => update({ enabled: !settings.enabled })}
                  className={cn(
                    "w-9 h-5 rounded-full transition-colors relative",
                    settings.enabled ? "bg-accent" : "bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform",
                      settings.enabled ? "translate-x-4" : "translate-x-0.5"
                    )}
                  />
                </button>
              </label>

              <div className="flex items-center gap-2 text-[10px]">
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full font-medium",
                    isConnected
                      ? "bg-track-audio/20 text-track-audio"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {isConnected ? "● Connected" : "○ Not connected"}
                </span>
                {hasServerKey && (
                  <span className="text-muted-foreground">Server key detected</span>
                )}
              </div>
            </section>

            <section className="space-y-2">
              <label className="text-xs text-muted-foreground flex items-center gap-1">
                <Key className="h-3 w-3" />
                MiniMax API Key
              </label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={settings.apiKey}
                  onChange={(e) => update({ apiKey: e.target.value })}
                  placeholder="MiniMax API key..."
                  className="w-full h-9 px-3 pr-9 text-xs bg-muted rounded-lg outline-none focus:ring-1 focus:ring-accent font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </section>

            <section className="space-y-2">
              <label className="text-xs text-muted-foreground">Model</label>
              <div className="space-y-1.5">
                {MODELS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => update({ model: m.id })}
                    className={cn(
                      "w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-colors",
                      settings.model === m.id
                        ? "bg-accent/20 border border-accent/40"
                        : "bg-muted/50 hover:bg-muted border border-transparent"
                    )}
                  >
                    <div>
                      <p className="text-xs font-medium">{m.label}</p>
                      <p className="text-[10px] text-muted-foreground">{m.desc}</p>
                    </div>
                    {settings.model === m.id && (
                      <Check className="h-3.5 w-3.5 text-accent-glow" />
                    )}
                  </button>
                ))}
              </div>
            </section>

            <div className="h-px bg-border" />

            <section className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Cloud className="h-3.5 w-3.5" />
                Cloud Sync — Supabase
              </h3>

              <label className="flex items-center justify-between">
                <span className="text-xs">Enable cloud sync</span>
                <button
                  onClick={() => updateCloud({ enabled: !cloudSettings.enabled })}
                  className={cn(
                    "w-9 h-5 rounded-full transition-colors relative",
                    cloudSettings.enabled ? "bg-accent" : "bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform",
                      cloudSettings.enabled ? "translate-x-4" : "translate-x-0.5"
                    )}
                  />
                </button>
              </label>

              <div className="space-y-2">
                <input
                  type="url"
                  value={cloudSettings.supabaseUrl}
                  onChange={(e) => updateCloud({ supabaseUrl: e.target.value })}
                  placeholder="https://xxx.supabase.co"
                  className="w-full h-9 px-3 text-xs bg-muted rounded-lg outline-none focus:ring-1 focus:ring-accent font-mono"
                />
                <div className="relative">
                  <input
                    type={showCloudKey ? "text" : "password"}
                    value={cloudSettings.supabaseAnonKey}
                    onChange={(e) => updateCloud({ supabaseAnonKey: e.target.value })}
                    placeholder="Supabase anon key..."
                    className="w-full h-9 px-3 pr-9 text-xs bg-muted rounded-lg outline-none focus:ring-1 focus:ring-accent font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCloudKey(!showCloudKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showCloudKey ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
                <input
                  type="text"
                  value={cloudSettings.syncKey}
                  onChange={(e) => updateCloud({ syncKey: e.target.value })}
                  placeholder="Sync key (folder ID, min 3 chars)"
                  className="w-full h-9 px-3 text-xs bg-muted rounded-lg outline-none focus:ring-1 focus:ring-accent"
                />
                <input
                  type="text"
                  value={cloudSettings.displayName}
                  onChange={(e) => updateCloud({ displayName: e.target.value })}
                  placeholder="Display name (untuk kolaborasi)"
                  className="w-full h-9 px-3 text-xs bg-muted rounded-lg outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <label className="flex items-center justify-between">
                <span className="text-xs">Upload media ke cloud (max 50MB/file)</span>
                <button
                  onClick={() =>
                    updateCloud({ uploadMedia: !cloudSettings.uploadMedia })
                  }
                  className={cn(
                    "w-9 h-5 rounded-full transition-colors relative",
                    cloudSettings.uploadMedia ? "bg-accent" : "bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform",
                      cloudSettings.uploadMedia ? "translate-x-4" : "translate-x-0.5"
                    )}
                  />
                </button>
              </label>

              <p className="text-[10px] text-muted-foreground">
                Bucket: <code className="px-1 py-0.5 rounded bg-muted">vibecoding-projects</code>.
                Sync key yang sama = kolaborasi tim. Realtime presence via Supabase Broadcast.
              </p>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestCloud}
                  disabled={testingCloud || !cloudSettings.enabled}
                >
                  {testingCloud ? "Testing..." : "Test Connection"}
                </Button>
                {cloudReady && (
                  <span className="text-[10px] text-track-audio">● Ready</span>
                )}
              </div>
              {cloudTest && (
                <p
                  className={cn(
                    "text-[10px] rounded-lg px-3 py-2",
                    cloudTest.startsWith("✓")
                      ? "text-track-audio bg-track-audio/10"
                      : "text-red-400 bg-red-400/10"
                  )}
                >
                  {cloudTest}
                </p>
              )}
            </section>
          </div>

          <div className="flex justify-end gap-2 px-5 py-4 border-t border-border sticky bottom-0 bg-surface/95 backdrop-blur-sm">
            <Dialog.Close asChild>
              <Button variant="ghost" size="sm">
                Cancel
              </Button>
            </Dialog.Close>
            <Button variant="default" size="sm" onClick={handleSave}>
              {saved ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Saved
                </>
              ) : (
                "Save Settings"
              )}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}