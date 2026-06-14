"use client";

import { useMemo } from "react";
import { resampleWaveform } from "@/lib/waveform";
import { cn } from "@/lib/utils";

interface WaveformDisplayProps {
  waveform?: number[];
  width: number;
  height: number;
  color?: string;
  className?: string;
}

export function WaveformDisplay({
  waveform,
  width,
  height,
  color = "#22c55e",
  className,
}: WaveformDisplayProps) {
  const path = useMemo(() => {
    const samples = Math.max(20, Math.floor(width / 3));
    const peaks = resampleWaveform(waveform ?? [], samples);
    const mid = height / 2;
    const step = width / peaks.length;

    let d = `M 0 ${mid}`;
    peaks.forEach((peak, i) => {
      const x = i * step;
      const h = Math.max(1, peak * (height * 0.8));
      d += ` L ${x} ${mid - h / 2} L ${x} ${mid + h / 2}`;
    });
    d += ` L ${width} ${mid} Z`;
    return d;
  }, [waveform, width, height]);

  if (width < 4) return null;

  return (
    <svg
      className={cn("absolute inset-0 pointer-events-none opacity-60", className)}
      width={width}
      height={height}
      preserveAspectRatio="none"
    >
      <path d={path} fill={color} fillOpacity={0.5} />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={0.5}
        strokeOpacity={0.8}
      />
    </svg>
  );
}