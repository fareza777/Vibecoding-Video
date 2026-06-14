import type { AiSettings } from "@/types/editor";

const STORAGE_KEY = "vibecoding-ai-settings";

export const DEFAULT_AI_SETTINGS: AiSettings = {
  enabled: true,
  apiKey: "",
  model: "claude-sonnet-4-6",
  useStreaming: false,
};

export function loadAiSettings(): AiSettings {
  if (typeof window === "undefined") return DEFAULT_AI_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_AI_SETTINGS;
    return { ...DEFAULT_AI_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_AI_SETTINGS;
  }
}

export function saveAiSettings(settings: AiSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function hasAiConfigured(settings: AiSettings): boolean {
  return Boolean(settings.apiKey || process.env.NEXT_PUBLIC_HAS_SERVER_KEY);
}