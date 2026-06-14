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

  return actions.map((action) => {
    const vibeAction: VibeAction = {
      id: crypto.randomUUID(),
      type: action.type,
      description: action.description,
      params: action.params,
      applied: false,
    };

    const clipId = resolveClipId(action.params, context);

    switch (action.type) {
      case "effect": {
        if (!clipId) return vibeAction;
        const clip = context.clips.find((c) => c.id === clipId);
        if (!clip) return vibeAction;
        context.updateClip(clipId, {
          effects: [
            ...clip.effects,
            {
              id: crypto.randomUUID(),
              type: action.params.effect as TimelineClip["effects"][0]["type"],
              params: action.params as Record<string, string | number | boolean>,
              enabled: true,
            },
          ],
        });
        return { ...vibeAction, applied: true };
      }

      case "speed": {
        if (!clipId) return vibeAction;
        const clip = context.clips.find((c) => c.id === clipId);
        if (!clip) return vibeAction;
        context.updateClip(clipId, {
          effects: [
            ...clip.effects,
            {
              id: crypto.randomUUID(),
              type: "speed",
              params: action.params as Record<string, string | number | boolean>,
              enabled: true,
            },
          ],
        });
        return { ...vibeAction, applied: true };
      }

      case "volume": {
        if (!clipId) return vibeAction;
        context.updateClip(clipId, {
          volume: action.params.volume as number,
        });
        return { ...vibeAction, applied: true };
      }

      case "trim": {
        if (!clipId) return vibeAction;
        const start = action.params.start as number;
        const end = action.params.end as number;
        context.updateClip(clipId, {
          trimStart: start,
          trimEnd: end,
          duration: end - start,
        });
        return { ...vibeAction, applied: true };
      }

      case "text-overlay": {
        context.addClip(
          {
          assetId: "text-generated",
          trackId: "track-text-1",
          startTime: (action.params.startTime as number) ?? context.playhead,
          duration: (action.params.duration as number) ?? 5,
          trimStart: 0,
          trimEnd: (action.params.duration as number) ?? 5,
          label: action.params.text as string,
          color: "#f59e0b",
          opacity: 1,
          volume: 1,
          effects: [
            {
              id: crypto.randomUUID(),
              type: "text-overlay",
              params: {
                text: action.params.text as string,
                position: (action.params.position as string) ?? "center",
              },
              enabled: true,
            },
          ],
          },
          true
        );
        return { ...vibeAction, applied: true };
      }

      case "move-clip": {
        if (!clipId) return vibeAction;
        const updates: Partial<TimelineClip> = {};
        if (typeof action.params.startTime === "number") {
          updates.startTime = action.params.startTime;
        }
        if (typeof action.params.trackId === "string") {
          updates.trackId = action.params.trackId;
        }
        context.updateClip(clipId, updates);
        return { ...vibeAction, applied: true };
      }

      case "delete-clip": {
        const targetId = clipId ?? context.selectedClipId;
        if (!targetId) return vibeAction;
        context.removeClip(targetId, true);
        return { ...vibeAction, applied: true };
      }

      case "set-playhead": {
        const time = action.params.time as number;
        if (typeof time === "number") {
          context.setPlayhead(time);
          return { ...vibeAction, applied: true };
        }
        return vibeAction;
      }

      case "split": {
        const time = (action.params.time as number) ?? context.playhead;
        context.splitClipAtTime(time, clipId ?? undefined, true);
        return { ...vibeAction, applied: true };
      }

      case "transition": {
        if (!clipId) return vibeAction;
        const clip = context.clips.find((c) => c.id === clipId);
        if (!clip) return vibeAction;
        context.updateClip(clipId, {
          effects: [
            ...clip.effects,
            {
              id: crypto.randomUUID(),
              type: "transition",
              params: action.params as Record<string, string | number | boolean>,
              enabled: true,
            },
          ],
        });
        return { ...vibeAction, applied: true };
      }

      case "export":
        return { ...vibeAction, applied: true };

      default:
        return vibeAction;
    }
  });
}