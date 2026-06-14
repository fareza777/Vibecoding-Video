import {
  VIBECODING_SYSTEM_PROMPT,
  buildContextPrompt,
  extractJsonFromText,
  stripThinkingContent,
} from "@/lib/vibecoding-prompt";
import { vibeResponseSchema } from "@/lib/vibecoding-schema";
import type { AiModel, VibecodingContext } from "@/types/editor";

const MINIMAX_API_URL = "https://api.minimax.io/v1/chat/completions";

interface MiniMaxMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface MiniMaxChatResponse {
  choices?: Array<{
    message?: { content?: string };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  base_resp?: {
    status_code?: number;
    status_msg?: string;
  };
}

export interface MiniMaxVibecodingResult {
  message: string;
  actions: Array<{
    type: string;
    description: string;
    params: Record<string, unknown>;
  }>;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export async function callMiniMaxVibecoding(opts: {
  apiKey: string;
  model: AiModel;
  message: string;
  context: VibecodingContext;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<MiniMaxVibecodingResult> {
  const contextBlock = buildContextPrompt(opts.context);

  const messages: MiniMaxMessage[] = [
    { role: "system", content: VIBECODING_SYSTEM_PROMPT },
    ...(opts.history ?? []).map((h) => ({
      role: h.role as "user" | "assistant",
      content: h.content,
    })),
    {
      role: "user",
      content: `${contextBlock}\n\n## User request\n${opts.message}`,
    },
  ];

  const res = await fetch(MINIMAX_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify({
      model: opts.model,
      messages,
      max_completion_tokens: 2048,
      temperature: 0.3,
      thinking: { type: "disabled" },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`MiniMax API ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = (await res.json()) as MiniMaxChatResponse;

  if (data.base_resp?.status_code && data.base_resp.status_code !== 0) {
    throw new Error(data.base_resp.status_msg ?? "MiniMax API error");
  }

  const rawContent = data.choices?.[0]?.message?.content;
  if (!rawContent) {
    throw new Error("MiniMax returned empty response");
  }

  const cleaned = stripThinkingContent(rawContent);
  const jsonText = extractJsonFromText(cleaned);
  const jsonParsed = JSON.parse(jsonText);
  const validated = vibeResponseSchema.safeParse(jsonParsed);

  if (!validated.success) {
    throw new Error("Invalid JSON structure from MiniMax");
  }

  return {
    message: validated.data.message,
    actions: validated.data.actions.map((a) => ({
      type: a.type,
      description: a.description,
      params: a.params,
    })),
    usage: {
      inputTokens: data.usage?.prompt_tokens ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
    },
  };
}