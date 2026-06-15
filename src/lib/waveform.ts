const WAVEFORM_SAMPLES = 120;
const MAX_AUDIO_DECODE_BYTES = 12 * 1024 * 1024;

export async function generateWaveform(
  url: string,
  mediaType: "video" | "audio" = "audio"
): Promise<number[]> {
  if (mediaType === "video") {
    return generatePlaceholderWaveform();
  }

  try {
    const response = await fetch(url);
    const blob = await response.blob();
    if (blob.size > MAX_AUDIO_DECODE_BYTES) {
      return generatePlaceholderWaveform();
    }

    const arrayBuffer = await blob.arrayBuffer();
    const audioContext = new AudioContext();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    await audioContext.close();

    const channel = audioBuffer.getChannelData(0);
    const blockSize = Math.floor(channel.length / WAVEFORM_SAMPLES);
    const peaks: number[] = [];

    for (let i = 0; i < WAVEFORM_SAMPLES; i++) {
      const start = i * blockSize;
      let max = 0;
      for (let j = 0; j < blockSize; j++) {
        const abs = Math.abs(channel[start + j] ?? 0);
        if (abs > max) max = abs;
      }
      peaks.push(max);
    }

    const peakMax = Math.max(...peaks, 0.01);
    return peaks.map((p) => p / peakMax);
  } catch {
    return generatePlaceholderWaveform();
  }
}

export function generatePlaceholderWaveform(samples = WAVEFORM_SAMPLES): number[] {
  return Array.from({ length: samples }, (_, i) => {
    const t = i / samples;
    return 0.2 + Math.abs(Math.sin(t * Math.PI * 8)) * 0.5 + Math.random() * 0.15;
  });
}

export function resampleWaveform(
  waveform: number[],
  targetSamples: number
): number[] {
  if (waveform.length === 0) return generatePlaceholderWaveform(targetSamples);
  if (waveform.length === targetSamples) return waveform;

  const result: number[] = [];
  for (let i = 0; i < targetSamples; i++) {
    const srcIndex = (i / targetSamples) * waveform.length;
    const lower = Math.floor(srcIndex);
    const upper = Math.min(lower + 1, waveform.length - 1);
    const frac = srcIndex - lower;
    result.push(
      waveform[lower] * (1 - frac) + waveform[upper] * frac
    );
  }
  return result;
}