const HISTORY_KEY = "vibecoding-prompt-history";
const MAX_HISTORY = 8;

export function loadPromptHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

export function savePromptToHistory(prompt: string): string[] {
  const value = prompt.trim();
  if (!value || typeof window === "undefined") return loadPromptHistory();

  const next = [value, ...loadPromptHistory().filter((item) => item !== value)].slice(
    0,
    MAX_HISTORY
  );
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  return next;
}

export function clearPromptHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(HISTORY_KEY);
}
