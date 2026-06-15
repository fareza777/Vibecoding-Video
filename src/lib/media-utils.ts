export function getMediaDuration(
  url: string,
  type: "video" | "audio",
  timeoutMs = 15000
): Promise<number> {
  return new Promise((resolve) => {
    const el = document.createElement(type);
    el.preload = "metadata";
    if (type === "video") {
      const video = el as HTMLVideoElement;
      video.muted = true;
      video.playsInline = true;
    }

    let settled = false;

    const finish = (duration: number) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      el.onloadedmetadata = null;
      el.ondurationchange = null;
      el.onerror = null;
      el.removeAttribute("src");
      el.load();
      const value =
        Number.isFinite(duration) && duration > 0 ? duration : 5;
      resolve(value);
    };

    const timer = window.setTimeout(() => finish(5), timeoutMs);

    el.onloadedmetadata = () => finish(el.duration);
    el.ondurationchange = () => {
      if (el.readyState >= 1 && Number.isFinite(el.duration)) {
        finish(el.duration);
      }
    };
    el.onerror = () => finish(5);
    el.src = url;
    el.load();
  });
}

export function probeVideoDimensions(
  url: string
): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const timer = window.setTimeout(() => {
      cleanup();
      resolve(null);
    }, 10000);

    const cleanup = () => {
      window.clearTimeout(timer);
      video.onloadedmetadata = null;
      video.onerror = null;
      video.removeAttribute("src");
      video.load();
    };

    video.onloadedmetadata = () => {
      const result =
        video.videoWidth > 0 && video.videoHeight > 0
          ? { width: video.videoWidth, height: video.videoHeight }
          : null;
      cleanup();
      resolve(result);
    };
    video.onerror = () => {
      cleanup();
      resolve(null);
    };
    video.src = url;
    video.load();
  });
}