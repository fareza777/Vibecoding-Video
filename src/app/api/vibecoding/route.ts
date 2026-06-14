import { NextResponse } from "next/server";
import { z } from "zod";
import { callMiniMaxVibecoding } from "@/lib/minimax-client";
import type { VibecodingContext } from "@/types/editor";

const AI_MODELS = ["MiniMax-M3", "MiniMax-M2.5", "MiniMax-M2.1"] as const;

const requestSchema = z.object({
  message: z.string().min(1).max(4000),
  context: z.custom<VibecodingContext>(),
  model: z.enum(AI_MODELS).default("MiniMax-M3"),
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
    const resolvedKey = apiKey || process.env.MINIMAX_API_KEY;

    if (!resolvedKey) {
      return NextResponse.json(
        {
          error: "no_api_key",
          message:
            "API key tidak ditemukan. Set MINIMAX_API_KEY di .env.local atau masukkan di Settings.",
        },
        { status: 401 }
      );
    }

    const result = await callMiniMaxVibecoding({
      apiKey: resolvedKey,
      model,
      message,
      context,
      history,
    });

    return NextResponse.json({
      message: result.message,
      actions: result.actions,
      source: "minimax" as const,
      usage: result.usage,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const isAuth =
      message.includes("401") ||
      message.toLowerCase().includes("api key") ||
      message.toLowerCase().includes("unauthorized");

    return NextResponse.json(
      {
        error: isAuth ? "auth_failed" : "server_error",
        message: isAuth
          ? "API key MiniMax tidak valid. Periksa Settings atau .env.local."
          : `Gagal memproses: ${message}`,
      },
      { status: isAuth ? 401 : 500 }
    );
  }
}