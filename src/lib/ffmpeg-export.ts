import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import type { EditorProject, ExportSettings, MediaAsset, TimelineClip } from "@/types/editor";

export type ExportProgress = {
  phase: "loading" | "preparing" | "encoding" | "done" | "error";
  progress: number;
  message: string;
};

let ffmpegInstance: FFmpeg | null = null;

export async function loadFFmpeg(
  onProgress?: (p: ExportProgress) => void
): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;

  onProgress?.({
    phase: "loading",
    progress: 0,
    message: "Loading FFmpeg.wasm...",
  });

  const ffmpeg = new FFmpeg();

  ffmpeg.on("progress", ({ progress }) => {
    onProgress?.({
      phase: "encoding",
      progress: Math.round(progress * 100),
      message: `Encoding... ${Math.round(progress * 100)}%`,
    });
  });

  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  });

  ffmpegInstance = ffmpeg;
  onProgress?.({
    phase: "loading",
    progress: 100,
    message: "FFmpeg ready",
  });

  return ffmpeg;
}

function getVideoClipsSorted(clips: TimelineClip[]): TimelineClip[] {
  return clips
    .filter((c) => c.trackId.startsWith("track-video"))
    .sort((a, b) => a.startTime - b.startTime);
}

async function fetchAssetBlob(
  asset: MediaAsset,
  ffmpeg: FFmpeg,
  index: number
): Promise<string> {
  const ext = asset.name.split(".").pop() ?? "mp4";
  const filename = `input_${index}.${ext}`;
  await ffmpeg.writeFile(filename, await fetchFile(asset.url));
  return filename;
}

export async function exportTimeline(
  project: EditorProject,
  settings: ExportSettings,
  onProgress?: (p: ExportProgress) => void
): Promise<Blob> {
  const videoClips = getVideoClipsSorted(project.clips);

  if (videoClips.length === 0) {
    throw new Error("Tidak ada clip video di timeline untuk di-export.");
  }

  const ffmpeg = await loadFFmpeg(onProgress);

  onProgress?.({
    phase: "preparing",
    progress: 10,
    message: "Preparing media files...",
  });

  const assetMap = new Map(project.assets.map((a) => [a.id, a]));
  const inputFiles: string[] = [];

  for (let i = 0; i < videoClips.length; i++) {
    const clip = videoClips[i];
    const asset = assetMap.get(clip.assetId);
    if (!asset || asset.type !== "video") continue;

    const filename = await fetchAssetBlob(asset, ffmpeg, i);
    inputFiles.push(filename);

    onProgress?.({
      phase: "preparing",
      progress: 10 + Math.round((i / videoClips.length) * 30),
      message: `Loaded ${asset.name}`,
    });
  }

  if (inputFiles.length === 0) {
    throw new Error("Tidak ada file video valid untuk export.");
  }

  const crfMap = { draft: 28, standard: 23, high: 18, ultra: 15 };
  const crf = crfMap[settings.quality];
  const outputName = `output.${settings.format === "mov" ? "mov" : settings.format}`;

  if (inputFiles.length === 1) {
    const clip = videoClips[0];
    const args = [
      "-ss",
      String(clip.trimStart),
      "-i",
      inputFiles[0],
      "-t",
      String(clip.duration),
      "-c:v",
      "libx264",
      "-preset",
      settings.quality === "draft" ? "ultrafast" : "medium",
      "-crf",
      String(crf),
      "-c:a",
      "aac",
      "-movflags",
      "+faststart",
      outputName,
    ];

    onProgress?.({
      phase: "encoding",
      progress: 40,
      message: "Encoding video...",
    });

    await ffmpeg.exec(args);
  } else {
    const listContent = inputFiles.map((f) => `file '${f}'`).join("\n");
    await ffmpeg.writeFile("concat.txt", listContent);

    onProgress?.({
      phase: "encoding",
      progress: 40,
      message: `Concatenating ${inputFiles.length} clips...`,
    });

    await ffmpeg.exec([
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      "concat.txt",
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      String(crf),
      "-c:a",
      "aac",
      "-movflags",
      "+faststart",
      outputName,
    ]);
  }

  onProgress?.({
    phase: "encoding",
    progress: 90,
    message: "Reading output...",
  });

  const data = await ffmpeg.readFile(outputName);
  const bytes =
    data instanceof Uint8Array
      ? new Uint8Array(data)
      : new TextEncoder().encode(data as string);

  const mime =
    settings.format === "webm"
      ? "video/webm"
      : settings.format === "mov"
        ? "video/quicktime"
        : "video/mp4";

  onProgress?.({
    phase: "done",
    progress: 100,
    message: "Export selesai!",
  });

  return new Blob([bytes.buffer], { type: mime });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}