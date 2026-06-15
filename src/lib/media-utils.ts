export interface MediaProbeResult {
  duration: number;
  width?: number;
  height?: number;
}

export function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 0);
  });
}

export function probeMediaMetadata(
  url: string,
  type: "video" | "audio",
  timeoutMs = 12000
): Promise<MediaProbeResult> {
  return new Promise((resolve) => {
    const el = document.createElement(type);
    el.preload = "metadata";

    if (type === "video") {
      const video = el as HTMLVideoElement;
      video.muted = true;
      video.playsInline = true;
    }

    let settled = false;

    const finish = (result: MediaProbeResult) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      el.onloadedmetadata = null;
      el.ondurationchange = null;
      el.onerror = null;
      el.removeAttribute("src");
      el.load();
      resolve(result);
    };

    const timer = window.setTimeout(
      () =>
        finish({
          duration: 5,
          width: type === "video" ? undefined : undefined,
          height: type === "video" ? undefined : undefined,
        }),
      timeoutMs
    );

    el.onloadedmetadata = () => {
      const duration =
        Number.isFinite(el.duration) && el.duration > 0 ? el.duration : 5;
      if (type === "video") {
        const video = el as HTMLVideoElement;
        finish({
          duration,
          width: video.videoWidth > 0 ? video.videoWidth : undefined,
          height: video.videoHeight > 0 ? video.videoHeight : undefined,
        });
      } else {
        finish({ duration });
      }
    };

    el.ondurationchange = () => {
      if (el.readyState >= 1 && Number.isFinite(el.duration) && el.duration > 0) {
        if (type === "video") {
          const video = el as HTMLVideoElement;
          finish({
            duration: el.duration,
            width: video.videoWidth > 0 ? video.videoWidth : undefined,
            height: video.videoHeight > 0 ? video.videoHeight : undefined,
          });
        } else {
          finish({ duration: el.duration });
        }
      }
    };

    el.onerror = () => finish({ duration: 5 });
    el.src = url;
    el.load();
  });
}

/** @deprecated Use probeMediaMetadata */
export function getMediaDuration(
  url: string,
  type: "video" | "audio",
  timeoutMs = 12000
): Promise<number> {
  return probeMediaMetadata(url, type, timeoutMs).then((r) => r.duration);
}

/** @deprecated Use probeMediaMetadata */
export function probeVideoDimensions(
  url: string
): Promise<{ width: number; height: number } | null> {
  return probeMediaMetadata(url, "video").then((r) =>
    r.width && r.height ? { width: r.width, height: r.height } : null
  );
}

export function scheduleIdleTask(task: () => void, timeoutMs = 3000): void {
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(() => task(), { timeout: timeoutMs });
  } else {
    window.setTimeout(task, 50);
  }
}

export function deferHeavyWork(task: () => void, fileSizeBytes: number): void {
  const delay =
    fileSizeBytes > 80 * 1024 * 1024
      ? 2500
      : fileSizeBytes > 30 * 1024 * 1024
        ? 800
        : 50;
  window.setTimeout(task, delay);
}