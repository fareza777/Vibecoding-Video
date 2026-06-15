import { generateWaveform } from "@/lib/waveform";
import { saveMediaBlob } from "@/lib/media-storage";
import {
  deferHeavyWork,
  probeMediaMetadata,
  scheduleIdleTask,
  yieldToMain,
} from "@/lib/media-utils";
import type { MediaType } from "@/types/editor";

interface ImportCallbacks {
  onProbeComplete: (
    assetId: string,
    data: {
      duration: number;
      width?: number;
      height?: number;
    }
  ) => void;
  onWaveformComplete: (assetId: string, waveform: number[]) => void;
  onDone: (assetId: string) => void;
}

interface ImportJob {
  projectId: string;
  assetId: string;
  file: File;
  url: string;
  type: MediaType;
  callbacks: ImportCallbacks;
}

const importQueue: ImportJob[] = [];
const cancelledImports = new Set<string>();
let importRunning = false;

export function cancelImportForAsset(assetId: string): void {
  cancelledImports.add(assetId);
  for (let i = importQueue.length - 1; i >= 0; i -= 1) {
    if (importQueue[i]?.assetId === assetId) {
      importQueue.splice(i, 1);
    }
  }
}

export function isImportCancelled(assetId: string): boolean {
  return cancelledImports.has(assetId);
}

function clearCancelled(assetId: string): void {
  cancelledImports.delete(assetId);
}

async function runImportQueue(): Promise<void> {
  if (importRunning) return;
  importRunning = true;

  while (importQueue.length > 0) {
    const job = importQueue.shift();
    if (!job) break;
    await processImportedMediaJob(job);
    await yieldToMain();
  }

  importRunning = false;
}

async function processImportedMediaJob(job: ImportJob): Promise<void> {
  const { projectId, assetId, file, url, type, callbacks } = job;

  if (isImportCancelled(assetId)) {
    clearCancelled(assetId);
    return;
  }

  deferHeavyWork(() => {
    if (isImportCancelled(assetId)) return;
    void saveMediaBlob(projectId, assetId, file, file.name, file.type).catch(
      () => {}
    );
  }, file.size);

  try {
    if (type === "video" || type === "audio") {
      const probe = await probeMediaMetadata(url, type);
      if (!isImportCancelled(assetId)) {
        callbacks.onProbeComplete(assetId, probe);
      }
      await yieldToMain();

      if (!isImportCancelled(assetId)) {
        scheduleIdleTask(() => {
          void (async () => {
            if (isImportCancelled(assetId)) return;
            const waveform = await generateWaveform(url, type);
            if (!isImportCancelled(assetId)) {
              callbacks.onWaveformComplete(assetId, waveform);
            }
          })();
        });
      }
    } else if (!isImportCancelled(assetId)) {
      callbacks.onProbeComplete(assetId, { duration: 5 });
    }
  } finally {
    if (!isImportCancelled(assetId)) {
      callbacks.onDone(assetId);
    }
    clearCancelled(assetId);
  }
}

export function processImportedMedia(
  projectId: string,
  assetId: string,
  file: File,
  url: string,
  type: MediaType,
  callbacks: ImportCallbacks
): void {
  importQueue.push({ projectId, assetId, file, url, type, callbacks });
  void runImportQueue();
}