import { NextResponse } from "next/server";
import { liveStats } from "@/lib/facts/stats";
export const dynamic = "force-dynamic";
export async function GET() {
  try { return NextResponse.json(await liveStats(), { headers: { "cache-control": "s-maxage=15, stale-while-revalidate=60" } }); }
  catch (e) { return NextResponse.json({ error: String((e as Error).message).slice(0, 200) }, { status: 502 }); }
}
