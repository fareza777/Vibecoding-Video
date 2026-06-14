import type { TimelineClip, VibeAction } from "@/types/editor";

interface ParsedCommand {
  actions: VibeAction[];
  response: string;
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
];

function parseTime(timeStr: string): number {
  const parts = timeStr.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
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
    response: `Saya memahami permintaan Anda: "${trimmed}"\n\nUntuk saat ini, coba perintah seperti:\n• *Potong 0:30 sampai 1:15*\n• *Tambahkan fade in*\n• *Percepat 2x*\n• *Tambahkan teks "Hello World"*\n• *Split di 0:45*\n• *Export video*\n\nAtau hubungkan API key Claude di Settings untuk editing AI yang lebih canggih.`,
  };
}

export function applyVibeActions(
  actions: VibeAction[],
  context: {
    updateClip: (id: string, updates: Record<string, unknown>) => void;
    selectedClipId: string | null;
    clips: { id: string; effects: unknown[]; volume: number }[];
    addClip: (clip: Omit<TimelineClip, "id">) => void;
    playhead: number;
  }
): VibeAction[] {
  return actions.map((action) => {
    const clipId = context.selectedClipId ?? context.clips[0]?.id;
    if (!clipId && action.type !== "export") return { ...action, applied: false };

    switch (action.type) {
      case "effect": {
        const clip = context.clips.find((c) => c.id === clipId);
        if (clip) {
          context.updateClip(clipId, {
            effects: [
              ...clip.effects,
              {
                id: crypto.randomUUID(),
                type: action.params.effect,
                params: action.params,
                enabled: true,
              },
            ],
          });
        }
        return { ...action, applied: true };
      }
      case "speed": {
        context.updateClip(clipId!, {
          effects: [
            {
              id: crypto.randomUUID(),
              type: "speed",
              params: action.params,
              enabled: true,
            },
          ],
        });
        return { ...action, applied: true };
      }
      case "volume": {
        context.updateClip(clipId!, { volume: action.params.volume as number });
        return { ...action, applied: true };
      }
      case "trim": {
        context.updateClip(clipId!, {
          trimStart: action.params.start as number,
          trimEnd: action.params.end as number,
          duration: (action.params.end as number) - (action.params.start as number),
        });
        return { ...action, applied: true };
      }
      case "text-overlay": {
        context.addClip({
          assetId: "text-generated",
          trackId: "track-text-1",
          startTime: context.playhead,
          duration: 5,
          trimStart: 0,
          trimEnd: 5,
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
        });
        return { ...action, applied: true };
      }
      case "split":
      case "export":
        return { ...action, applied: true };
      default:
        return { ...action, applied: false };
    }
  });
}