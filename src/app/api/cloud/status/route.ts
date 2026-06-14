import { NextResponse } from "next/server";

export async function GET() {
  const hasServerConfig = Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY
  );

  return NextResponse.json({
    hasServerConfig,
    bucket: "vibecoding-projects",
  });
}