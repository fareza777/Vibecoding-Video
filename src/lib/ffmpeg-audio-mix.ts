import type { FFmpeg } from "@ffmpeg/ffmpeg";
import { buildAudioFilter } from "@/lib/ffmpeg-filters";
import type {
  EditorProject,
  ExportSettings,
  MediaAsset,
  TimelineClip,
} from "@/types/editor";

export function getAudioClipsForMix(
  project: EditorProject
): TimelineClip[] {
  const mutedTracks = new Set(
    project.tracks.filter((t) => t.muted).map((t) => t.id)
  );

  return project.clips
    .filter(
      (c) =>
        c.trackId.startsWith("track-audio") && !mutedTracks.has(c.trackId)
    )
    .sort((a, b) => a.startTime - b.startTime);
}

export function computeTimelineDuration(project: EditorProject): number {
  const videoEnd = project.clips
    .filter((c) => c.trackId.startsWith("track-video"))
    .reduce((max, c) => Math.max(max, c.startTime + c.duration), 0);

  const audioEnd = project.clips
    .filter((c) => c.trackId.startsWith("track-audio"))
    .reduce((max, c) => Math.max(max, c.startTime + c.duration), 0);

  return Math.max(project.duration, videoEnd, audioEnd, 1);
}

function buildVolumeFilter(clip: TimelineClip, settings: ExportSettings): string {
  const parts: string[] = [];
  if (clip.volume !== 1) {
    parts.push(`volume=${clip.volume}`);
  }
  const speedFilter = buildAudioFilter(clip);
  if (speedFilter) {
    parts.push(speedFilter);
  }
  return parts.length > 0 ? parts.join(",") : "anull";
}

export async function mixAudioIntoVideo(
  ffmpeg: FFmpeg,
  project: EditorProject,
  settings: ExportSettings,
  videoFile: string,
  outputFile: string,
  assetFileMap: Map<string, string>,
  writeAsset: (asset: MediaAsset, filename: string) => Promise<void>
): Promise<boolean> {
  const audioClips = getAudioClipsForMix(project);
  if (audioClips.length === 0) {
    return false;
  }

  const assetMap = new Map(project.assets.map((a) => [a.id, a]));
  const segmentFiles: string[] = [];

  for (let i = 0; i < audioClips.length; i++) {
    const clip = audioClips[i];
    const asset = assetMap.get(clip.assetId);
    if (!asset || asset.type !== "audio") continue;

    let inputFile = assetFileMap.get(asset.id);
    if (!inputFile) {
      const ext = asset.name.split(".").pop() ?? "mp3";
      inputFile = `audio_input_${i}.${ext}`;
      await writeAsset(asset, inputFile);
      assetFileMap.set(asset.id, inputFile);
    }

    const segmentFile = `audio_seg_${i}.aac`;
    const volFilter = buildVolumeFilter(clip, settings);

    await ffmpeg.exec([
      "-ss",
      String(clip.trimStart),
      "-i",
      inputFile,
      "-t",
      String(clip.duration),
      "-af",
      volFilter,
      "-c:a",
      "aac",
      segmentFile,
    ]);

    segmentFiles.push(segmentFile);
  }

  if (segmentFiles.length === 0) {
    return false;
  }

  const hasVideoAudio = project.clips
    .filter((c) => c.trackId.startsWith("track-video"))
    .some((c) => assetMap.get(c.assetId)?.type === "video");

  const filterParts: string[] = [];
  const mixInputs: string[] = hasVideoAudio ? ["[0:a]"] : [];

  for (let i = 0; i < segmentFiles.length; i++) {
    const clip = audioClips[i];
    const delayMs = Math.round(clip.startTime * 1000);
    const label = `a${i}`;
    filterParts.push(
      `[${i + 1}:a]adelay=${delayMs}|${delayMs}[${label}]`
    );
    mixInputs.push(`[${label}]`);
  }

  const inputCount = mixInputs.length;
  filterParts.push(
    `${mixInputs.join("")}amix=inputs=${inputCount}:duration=longest:dropout_transition=0[aout]`
  );

  const args = ["-i", videoFile];
  for (const seg of segmentFiles) {
    args.push("-i", seg);
  }
  args.push(
    "-filter_complex",
    filterParts.join(";"),
    "-map",
    "0:v",
    "-map",
    "[aout]",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-shortest",
    outputFile
  );

  await ffmpeg.exec(args);
  return true;
}

export async function muxVideoOnly(
  ffmpeg: FFmpeg,
  videoFile: string,
  outputFile: string
): Promise<void> {
  await ffmpeg.exec(["-i", videoFile, "-c", "copy", outputFile]);
}