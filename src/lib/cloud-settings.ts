import type { CloudSettings } from "@/types/editor";

const STORAGE_KEY = "vibecoding-cloud-settings";

export const DEFAULT_CLOUD_SETTINGS: CloudSettings = {
  enabled: false,
  supabaseUrl: "",
  supabaseAnonKey: "",
  syncKey: "",
  displayName: "",
  uploadMedia: true,
};

export function loadCloudSettings(): CloudSettings {
  if (typeof window === "undefined") return DEFAULT_CLOUD_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CLOUD_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<CloudSettings>;
    return { ...DEFAULT_CLOUD_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_CLOUD_SETTINGS;
  }
}

export function saveCloudSettings(settings: CloudSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function isCloudConfigured(settings: CloudSettings): boolean {
  return (
    settings.enabled &&
    settings.supabaseUrl.length > 10 &&
    settings.supabaseAnonKey.length > 20 &&
    settings.syncKey.length >= 3
  );
}