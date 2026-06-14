import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    hasServerKey: Boolean(process.env.MINIMAX_API_KEY),
    provider: "minimax",
    defaultModel: "MiniMax-M3",
  });
}