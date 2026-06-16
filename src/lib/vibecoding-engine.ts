import type { TimelineClip, VibeAction } from "@/types/editor";

interface ParsedCommand {
  actions: VibeAction[];
  response: string;
}

export interface VibeApplyContext {
  updateClip: (id: string, updates: Partial<TimelineClip>) => void;
  removeClip: (id: string, skipHistory?: boolean) => void;
  addClip: (clip: Omit<TimelineClip, "id">, skipHistory?: boolean) => void;
  setPlayhead: (time: number) => void;
  setSelectedClip: (id: string | null) => void;
  splitClipAtTime: (time: number, clipId?: string, skipHistory?: boolean) => void;
  pushHistory: () => void;
  selectedClipId: string | null;
  clips: TimelineClip[];
  getClips?: () => TimelineClip[];
  playhead: number;
}

const COMMAND_PATTERNS: {
  pattern: RegExp;
  handler: (match: RegExpMatchArray) => VibeAction[];
}[] = [
  {
    pattern: /potong|cut|trim|hapus\s+bagian?\s+(\d{1,2}:\d{2}(?::\d{2})?)\s*(?:sampai|to|-|–)\s*(\d{1,2}:\d{2}(?::\d{2})?)/i,
    handler: (m) => [
      {
        id: crypto.randomUUID(),
        type: "trim",
        description: `Potong dari ${m[1]} ke ${m[2]}`,
        params: { start: parseTime(m[1]), end: parseTime(m[2]) },
        applied: false,
      },
    ],
  },
  {
    pattern: /fade\s*in/i,
    handler: () => [
      {
        id: crypto.randomUUID(),
        type: "effect",
        description: "Tambahkan fade in di awal clip",
        params: { effect: "fade-in", duration: 1 },
        applied: false,
      },
    ],
  },
  {
    pattern: /fade\s*out/i,
    handler: () => [
      {
        id: crypto.randomUUID(),
        type: "effect",
        description: "Tambahkan fade out di akhir clip",
        params: { effect: "fade-out", duration: 1 },
        applied: false,
      },
    ],
  },
  {
    pattern: /percepat|speed\s*up|(\d+(?:\.\d+)?)\s*x/i,
    handler: (m) => {
      const speed = m[1] ? parseFloat(m[1]) : 1.5;
      return [
        {
          id: crypto.randomUUID(),
          type: "speed",
          description: `Ubah kecepatan menjadi ${speed}x`,
          params: { speed },
          applied: false,
        },
      ];
    },
  },
  {
    pattern: /perlambat|slow\s*down|slow\s*(\d+(?:\.\d+)?)\s*x/i,
    handler: (m) => {
      const speed = m[1] ? parseFloat(m[1]) : 0.5;
      return [
        {
          id: crypto.randomUUID(),
          type: "speed",
          description: `Perlambat menjadi ${speed}x`,
          params: { speed },
          applied: false,
        },
      ];
    },
  },
  {
    pattern: /tambah(?:kan)?\s+teks\s+['""](.+?)['""]|add\s+text\s+['""](.+?)['""]/i,
    handler: (m) => [
      {
        id: crypto.randomUUID(),
        type: "text-overlay",
        description: `Tambahkan teks "${m[1] || m[2]}"`,
        params: { text: m[1] || m[2], position: "center" },
        applied: false,
      },
    ],
  },
  {
    pattern: /blur/i,
    handler: () => [
      {
        id: crypto.randomUUID(),
        type: "effect",
        description: "Terapkan efek blur",
        params: { effect: "blur", amount: 5 },
        applied: false,
      },
    ],
  },
  {
    pattern: /brightness|terang(?:kan)?|cerah(?:kan)?/i,
    handler: () => [
      {
        id: crypto.randomUUID(),
        type: "effect",
        description: "Tingkatkan brightness",
        params: { effect: "brightness", value: 1.2 },
        applied: false,
      },
    ],
  },
  {
    pattern: /export|ekspor/i,
    handler: () => [
      {
        id: crypto.randomUUID(),
        type: "export",
        description: "Mulai proses export video",
        params: { format: "mp4", quality: "high" },
        applied: false,
      },
    ],
  },
  {
    pattern: /split|belah|pisahkan\s+(?:di|at)\s+(\d{1,2}:\d{2}(?::\d{2})?)/i,
    handler: (m) => [
      {
        id: crypto.randomUUID(),
        type: "split",
        description: `Belah clip di ${m[1]}`,
        params: { time: parseTime(m[1]) },
        applied: false,
      },
    ],
  },
  {
    pattern: /zoom\s*(\d+(?:\.\d+)?)\s*x?/i,
    handler: (m) => [
      {
        id: crypto.randomUUID(),
        type: "effect",
        description: `Zoom ${m[1] || "1.5"}x`,
        params: { effect: "zoom", scale: parseFloat(m[1] || "1.5") },
        applied: false,
      },
    ],
  },
  {
    pattern: /volume\s*(\d+)%?|suara\s*(\d+)%?/i,
    handler: (m) => {
      const vol = parseInt(m[1] || m[2] || "100", 10) / 100;
      return [
        {
          id: crypto.randomUUID(),
          type: "volume",
          description: `Set volume ke ${Math.round(vol * 100)}%`,
          params: { volume: vol },
          applied: false,
        },
      ];
    },
  },
  {
    pattern: /hapus\s+clip|delete\s+clip/i,
    handler: () => [
      {
        id: crypto.randomUUID(),
        type: "delete-clip",
        description: "Hapus clip terpilih",
        params: {},
        applied: false,
      },
    ],
  },
];

function parseTime(timeStr: string): number {
  const parts = timeStr.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}

function resolveClipId(
  params: Record<string, unknown>,
  context: VibeApplyContext
): string | null {
  if (typeof params.clipId === "string") {
    const exists = context.clips.some((c) => c.id === params.clipId);
    if (exists) return params.clipId;
  }
  return context.selectedClipId ?? context.clips[0]?.id ?? null;
}

export function parseVibecodingCommand(input: string): ParsedCommand {
  const trimmed = input.trim();
  const allActions: VibeAction[] = [];

  for (const { pattern, handler } of COMMAND_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      allActions.push(...handler(match));
    }
  }

  if (allActions.length > 0) {
    const actionList = allActions.map((a) => `• ${a.description}`).join("\n");
    return {
      actions: allActions,
      response: `Siap! Saya akan menerapkan ${allActions.length} operasi:\n\n${actionList}\n\nPerubahan sudah diterapkan ke timeline. Cek preview untuk hasilnya.`,
    };
  }

  return {
    actions: [],
    response: `Saya memahami permintaan Anda: "${trimmed}"\n\nCoba perintah seperti:\n• *Potong 0:30 sampai 1:15*\n• *Tambahkan fade in*\n• *Percepat 2x*\n• *Tambahkan teks "Hello World"*\n• *Split di 0:45*\n\nAtau hubungkan API key MiniMax di **Settings** untuk editing AI yang lebih canggih.`,
  };
}

export function applyVibeActions(
  actions: Array<{
    type: string;
    description: string;
    params: Record<string, unknown>;
  }>,
  context: VibeApplyContext
): VibeAction[] {
  if (actions.length > 0) context.pushHistory();

  const readClips = (): TimelineClip[] =>
    context.getClips ? context.getClips() : context.clips;

  // First pass: classify actions by clip + type, accumulate all effects per clip.
  // This avoids losing earlier actions when later actions re-read stale clip.effects.
  const effectsByClip = new Map<string, Array<{ type: string; params: Record<string, unknown> }>>();
  const textOverlaysToAdd: Array<{ params: Record<string, unknown>; description: string }> = [];
  const deleteClipIds: string[] = [];
  const playheadTargets: number[] = [];
  const splits: Array<{ time: number; clipId?: string }> = [];
  const moveUpdates = new Map<string, { startTime?: number; trackId?: string }>();
  const volumeUpdates = new Map<string, number>();
  const trimUpdates = new Map<string, { trimStart: number; trimEnd: number; duration: number }>();
  let exportRequested = false;

  for (const action of actions) {
    const clipId = resolveClipId(action.params, context);
    switch (action.type) {
      case "effect":
      case "speed":
      case "transition": {
        if (!clipId) break;
        const arr = effectsByClip.get(clipId) ?? [];
        arr.push({ type: action.params.effect as string ?? action.type, params: action.params });
        effectsByClip.set(clipId, arr);
        break;
      }
      case "volume": {
        if (!clipId) break;
        if (typeof action.params.volume === "number") {
          volumeUpdates.set(clipId, action.params.volume);
        }
        break;
      }
      case "trim": {
        if (!clipId) break;
        const start = action.params.start as number;
        const end = action.params.end as number;
        if (typeof start === "number" && typeof end === "number") {
          trimUpdates.set(clipId, { trimStart: start, trimEnd: end, duration: end - start });
        }
        break;
      }
      case "text-overlay": {
        textOverlaysToAdd.push({ params: action.params, description: action.description });
        break;
      }
      case "move-clip": {
        if (!clipId) break;
        const upd: { startTime?: number; trackId?: string } = {};
        if (typeof action.params.startTime === "number") upd.startTime = action.params.startTime;
        if (typeof action.params.trackId === "string") upd.trackId = action.params.trackId;
        moveUpdates.set(clipId, { ...moveUpdates.get(clipId), ...upd });
        break;
      }
      case "delete-clip": {
        const targetId = clipId ?? context.selectedClipId;
        if (targetId) deleteClipIds.push(targetId);
        break;
      }
      case "set-playhead": {
        if (typeof action.params.time === "number") {
          playheadTargets.push(action.params.time);
        }
        break;
      }
      case "split": {
        const time = (action.params.time as number) ?? context.playhead;
        splits.push({ time, clipId: clipId ?? undefined });
        break;
      }
      case "export":
        exportRequested = true;
        break;
    }
  }

  // Second pass: apply all accumulated changes per clip atomically.
  // Order: 1) effects, 2) volume, 3) trim, 4) move (each reads fresh clips).
  for (const [clipId, newEffects] of effectsByClip) {
    const clip = readClips().find((c) => c.id === clipId);
    if (!clip) continue;
    const effectObjects = newEffects.map((e) => ({
      id: crypto.randomUUID(),
      type: e.type as TimelineClip["effects"][0]["type"],
      params: e.params as Record<string, string | number | boolean>,
      enabled: true,
    }));
    context.updateClip(clipId, { effects: [...clip.effects, ...effectObjects] });
  }
  for (const [clipId, volume] of volumeUpdates) {
    context.updateClip(clipId, { volume });
  }
  for (const [clipId, trim] of trimUpdates) {
    context.updateClip(clipId, trim);
  }
  for (const [clipId, move] of moveUpdates) {
    context.updateClip(clipId, move);
  }
  // Text overlays add new clips
  for (const overlay of textOverlaysToAdd) {
    context.addClip(
      {
        assetId: "text-generated",
        trackId: "track-text-1",
        startTime: (overlay.params.startTime as number) ?? context.playhead,
        duration: (overlay.params.duration as number) ?? 5,
        trimStart: 0,
        trimEnd: (overlay.params.duration as number) ?? 5,
        label: overlay.params.text as string,
        color: "#f59e0b",
        opacity: 1,
        volume: 1,
        effects: [
          {
            id: crypto.randomUUID(),
            type: "text-overlay",
            params: {
              text: overlay.params.text as string,
              position: (overlay.params.position as string) ?? "center",
            },
            enabled: true,
          },
        ],
      },
      true
    );
  }
  // Splits (one at a time, reading fresh state between)
  for (const split of splits) {
    context.splitClipAtTime(split.time, split.clipId, true);
  }
  // Deletes
  for (const id of deleteClipIds) {
    context.removeClip(id, true);
  }
  // Set playhead (last, so it reflects the final timeline)
  if (playheadTargets.length > 0) {
    context.setPlayhead(playheadTargets[playheadTargets.length - 1]);
  }

  // Build result for each action
  return actions.map((action) => {
    const vibeAction: VibeAction = {
      id: crypto.randomUUID(),
      type: action.type,
      description: action.description,
      params: action.params,
      applied: false,
    };

    const clipId = resolveClipId(action.params, context);

    // Mark applied based on whether the action was processed
    switch (action.type) {
      case "effect":
      case "speed":
      case "transition": {
        if (!clipId) return vibeAction;
        if (action.type === "transition") {
          return { ...vibeAction, applied: false, description: `${vibeAction.description} (akan diterapkan saat export)` };
        }
        return { ...vibeAction, applied: true };
      }
      case "volume":
        if (!clipId) return vibeAction;
        return { ...vibeAction, applied: true };
      case "trim":
        if (!clipId) return vibeAction;
        return { ...vibeAction, applied: true };
      case "text-overlay":
        return { ...vibeAction, applied: true };
      case "move-clip":
        if (!clipId) return vibeAction;
        return { ...vibeAction, applied: true };
      case "delete-clip": {
        const targetId = clipId ?? context.selectedClipId;
        if (!targetId) return vibeAction;
        return { ...vibeAction, applied: true };
      }
      case "set-playhead":
        if (typeof action.params.time === "number") {
          return { ...vibeAction, applied: true };
        }
        return vibeAction;
      case "split":
        return { ...vibeAction, applied: true };
      case "export":
        return { ...vibeAction, applied: true };
      default:
        return vibeAction;
    }
  });
}