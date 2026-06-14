import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  VIBECODING_SYSTEM_PROMPT,
  buildContextPrompt,
  extractJsonFromText,
} from "@/lib/vibecoding-prompt";
import { vibeResponseSchema } from "@/lib/vibecoding-schema";
import type { VibecodingContext } from "@/types/editor";

const requestSchema = z.object({
  message: z.string().min(1).max(4000),
  context: z.custom<VibecodingContext>(),
  model: z
    .enum(["claude-sonnet-4-6", "claude-haiku-4-5-20251001", "claude-opus-4-6"])
    .default("claude-sonnet-4-6"),
  apiKey: z.string().optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .max(10)
    .optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { message, context, model, apiKey, history } = parsed.data;
    const resolvedKey = apiKey || process.env.ANTHROPIC_API_KEY;

    if (!resolvedKey) {
      return NextResponse.json(
        {
          error: "no_api_key",
          message:
            "API key tidak ditemukan. Set ANTHROPIC_API_KEY di .env.local atau masukkan di Settings.",
        },
        { status: 401 }
      );
    }

    const client = new Anthropic({ apiKey: resolvedKey });

    const contextBlock = buildContextPrompt(context);
    const historyMessages = (history ?? []).map((h) => ({
      role: h.role as "user" | "assistant",
      content: h.content,
    }));

    const response = await client.messages.create({
      model,
      max_tokens: 2048,
      system: VIBECODING_SYSTEM_PROMPT,
      messages: [
        ...historyMessages,
        {
          role: "user",
          content: `${contextBlock}\n\n## User request\n${message}`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "empty_response", message: "Claude returned no text." },
        { status: 502 }
      );
    }

    const jsonText = extractJsonFromText(textBlock.text);
    const jsonParsed = JSON.parse(jsonText);
    const validated = vibeResponseSchema.safeParse(jsonParsed);

    if (!validated.success) {
      return NextResponse.json(
        {
          error: "invalid_ai_response",
          message: "AI response tidak valid. Coba lagi.",
          raw: textBlock.text.slice(0, 500),
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      message: validated.data.message,
      actions: validated.data.actions.map((a) => ({
        type: a.type,
        description: a.description,
        params: a.params,
      })),
      source: "claude" as const,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const isAuth = message.includes("401") || message.toLowerCase().includes("api key");

    return NextResponse.json(
      {
        error: isAuth ? "auth_failed" : "server_error",
        message: isAuth
          ? "API key tidak valid. Periksa Settings atau .env.local."
          : `Gagal memproses: ${message}`,
      },
      { status: isAuth ? 401 : 500 }
    );
  }
}