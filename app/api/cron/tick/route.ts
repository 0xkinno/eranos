import { NextRequest, NextResponse } from "next/server";
import { runKeeper } from "@/lib/keeper/run";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
let running = false;
export async function POST(req: NextRequest) { return handle(req); }
export async function GET(req: NextRequest) { return handle(req); }
async function handle(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!process.env.KEEPER_SUI_KEY || !process.env.KEEPER_MEMWAL_KEY) return NextResponse.json({ error: "keeper keys are not configured" }, { status: 503 });
  if (running) return NextResponse.json({ skipped: "a tick is already running" });
  running = true;
  try { return NextResponse.json({ ok: true, report: await runKeeper(), runId: req.headers.get("x-github-run-id") }); }
  catch (e) { return NextResponse.json({ error: String((e as Error).message).slice(0, 300) }, { status: 500 }); }
  finally { running = false; }
}
