import { parseVibecodingCommand } from "@/lib/vibecoding-engine";
import type { AiSettings, VibecodingApiResponse, VibecodingContext } from "@/types/editor";

interface VibecodingRequest {
  message: string;
  context: VibecodingContext;
  settings: AiSettings;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}

export async function requestVibecoding(
  req: VibecodingRequest
): Promise<VibecodingApiResponse> {
  if (!req.settings.enabled) {
    return toLocalResponse(req.message);
  }

  try {
    const res = await fetch("/api/vibecoding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: req.message,
        context: req.context,
        model: req.settings.model,
        apiKey: req.settings.apiKey || undefined,
        history: req.history,
      }),
    });

    if (res.status === 401) {
      const local = toLocalResponse(req.message);
      return {
        ...local,
        message: appendNote(
          local.message,
          local.actions.length > 0
            ? "_MiniMax tidak terhubung — hasil dari parser lokal._"
            : "⚠️ Hubungkan API key di **Settings** atau set `MINIMAX_API_KEY` di .env.local"
        ),
      };
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const local = toLocalResponse(req.message);
      if (local.actions.length > 0) {
        return {
          ...local,
          message: appendNote(
            local.message,
            `_Fallback lokal — AI error: ${err.message ?? res.statusText}_`
          ),
        };
      }
      throw new Error(
        (err as { message?: string }).message ?? "Vibecoding API failed"
      );
    }

    const data = await res.json();
    return {
      message: data.message,
      actions: data.actions.map(
        (a: { type: string; description: string; params: Record<string, unknown> }) => ({
          type: a.type,
          description: a.description,
          params: a.params,
        })
      ),
      source: "minimax",
    };
  } catch {
    const local = toLocalResponse(req.message);
    return {
      ...local,
      message: appendNote(
        local.message,
        local.actions.length > 0
          ? "_Mode offline — parser lokal._"
          : local.message
      ),
    };
  }
}

function toLocalResponse(message: string): VibecodingApiResponse {
  const parsed = parseVibecodingCommand(message);
  return {
    message: parsed.response,
    actions: parsed.actions.map((a) => ({
      type: a.type,
      description: a.description,
      params: a.params,
    })),
    source: "local",
  };
}

function appendNote(message: string, note: string): string {
  return `${message}\n\n${note}`;
}