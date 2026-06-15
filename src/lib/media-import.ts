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
let importRunning = false;

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

  deferHeavyWork(() => {
    void saveMediaBlob(projectId, assetId, file, file.name, file.type).catch(
      () => {}
    );
  }, file.size);

  try {
    if (type === "video" || type === "audio") {
      const probe = await probeMediaMetadata(url, type);
      callbacks.onProbeComplete(assetId, probe);
      await yieldToMain();

      scheduleIdleTask(() => {
        void (async () => {
          const waveform = await generateWaveform(url, type);
          callbacks.onWaveformComplete(assetId, waveform);
        })();
      });
    } else {
      callbacks.onProbeComplete(assetId, { duration: 5 });
    }
  } finally {
    callbacks.onDone(assetId);
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