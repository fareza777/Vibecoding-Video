import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import {
  buildAudioFilter,
  buildClipVideoFilter,
  getScaleFilter,
} from "@/lib/ffmpeg-filters";
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

function getEncodeArgs(settings: ExportSettings): string[] {
  const crfMap = { draft: 28, standard: 23, high: 18, ultra: 15 };
  const crf = crfMap[settings.quality];
  return [
    "-c:v",
    "libx264",
    "-preset",
    settings.quality === "draft" ? "ultrafast" : "medium",
    "-crf",
    String(crf),
    "-c:a",
    "aac",
    "-r",
    String(settings.fps),
    "-movflags",
    "+faststart",
  ];
}

async function writeAssetFile(
  asset: MediaAsset,
  ffmpeg: FFmpeg,
  filename: string
): Promise<void> {
  await ffmpeg.writeFile(filename, await fetchFile(asset.url));
}

function buildSegmentArgs(
  clip: TimelineClip,
  asset: MediaAsset,
  inputFile: string,
  settings: ExportSettings,
  segmentName: string
): string[] {
  const bakeEffects = settings.bakeEffects !== false;
  const videoFilter = bakeEffects
    ? buildClipVideoFilter(clip, settings)
    : getScaleFilter(settings);
  const audioFilter = bakeEffects ? buildAudioFilter(clip) : null;
  const encodeArgs = getEncodeArgs(settings);

  if (asset.type === "image") {
    return [
      "-loop",
      "1",
      "-framerate",
      String(settings.fps),
      "-i",
      inputFile,
      "-t",
      String(clip.duration),
      "-vf",
      videoFilter,
      ...encodeArgs,
      "-an",
      segmentName,
    ];
  }

  const args = [
    "-ss",
    String(clip.trimStart),
    "-i",
    inputFile,
    "-t",
    String(clip.duration),
    "-vf",
    videoFilter,
  ];

  if (audioFilter) {
    args.push("-af", audioFilter);
  }

  return [...args, ...encodeArgs, segmentName];
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
  const assetFileMap = new Map<string, string>();
  const outputName = `output.${settings.format === "mov" ? "mov" : settings.format}`;
  const baking = settings.bakeEffects !== false;

  let fileIndex = 0;
  for (const clip of videoClips) {
    const asset = assetMap.get(clip.assetId);
    if (!asset) continue;
    if (asset.type !== "video" && asset.type !== "image") continue;
    if (assetFileMap.has(asset.id)) continue;

    const ext =
      asset.type === "image"
        ? (asset.name.split(".").pop() ?? "png")
        : (asset.name.split(".").pop() ?? "mp4");
    const filename = `input_${fileIndex}.${ext}`;
    await writeAssetFile(asset, ffmpeg, filename);
    assetFileMap.set(asset.id, filename);
    fileIndex++;

    onProgress?.({
      phase: "preparing",
      progress: 10 + Math.round((fileIndex / videoClips.length) * 20),
      message: `Loaded ${asset.name}`,
    });
  }

  if (assetFileMap.size === 0) {
    throw new Error("Tidak ada file video/gambar valid untuk export.");
  }

  const segmentFiles: string[] = [];

  for (let i = 0; i < videoClips.length; i++) {
    const clip = videoClips[i];
    const asset = assetMap.get(clip.assetId);
    if (!asset || (asset.type !== "video" && asset.type !== "image")) continue;

    const inputFile = assetFileMap.get(asset.id);
    if (!inputFile) continue;

    const segmentName = `segment_${i}.mp4`;
    segmentFiles.push(segmentName);

    onProgress?.({
      phase: "encoding",
      progress: 30 + Math.round((i / videoClips.length) * 40),
      message: baking
        ? `Rendering effects clip ${i + 1}/${videoClips.length}...`
        : `Trimming clip ${i + 1}/${videoClips.length}...`,
    });

    await ffmpeg.exec(buildSegmentArgs(clip, asset, inputFile, settings, segmentName));
  }

  if (segmentFiles.length === 0) {
    throw new Error("Tidak ada segment valid untuk export.");
  }

  if (segmentFiles.length === 1) {
    await ffmpeg.exec(["-i", segmentFiles[0], "-c", "copy", outputName]);
  } else {
    const listContent = segmentFiles.map((f) => `file '${f}'`).join("\n");
    await ffmpeg.writeFile("concat.txt", listContent);

    onProgress?.({
      phase: "encoding",
      progress: 75,
      message: `Concatenating ${segmentFiles.length} segments...`,
    });

    await ffmpeg.exec([
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      "concat.txt",
      "-c",
      "copy",
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
    message: baking ? "Export dengan effects selesai!" : "Export selesai!",
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