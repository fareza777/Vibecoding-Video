import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    hasServerKey: Boolean(process.env.ANTHROPIC_API_KEY),
  });
}