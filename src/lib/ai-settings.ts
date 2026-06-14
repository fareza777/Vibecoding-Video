import type { AiModel, AiSettings } from "@/types/editor";

const STORAGE_KEY = "vibecoding-ai-settings";

export const DEFAULT_AI_SETTINGS: AiSettings = {
  enabled: true,
  apiKey: "",
  model: "MiniMax-M3",
  provider: "minimax",
};

export function loadAiSettings(): AiSettings {
  if (typeof window === "undefined") return DEFAULT_AI_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_AI_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AiSettings>;
    return {
      ...DEFAULT_AI_SETTINGS,
      ...parsed,
      provider: "minimax",
      model: isValidModel(parsed.model) ? parsed.model : "MiniMax-M3",
    };
  } catch {
    return DEFAULT_AI_SETTINGS;
  }
}

function isValidModel(model?: string): model is AiModel {
  return model === "MiniMax-M3" || model === "MiniMax-M2.5" || model === "MiniMax-M2.1";
}

export function saveAiSettings(settings: AiSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...settings, provider: "minimax" })
  );
}