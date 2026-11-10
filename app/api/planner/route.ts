import { NextResponse } from "next/server";
import { keeperMemory } from "@/lib/memory/client";
import { readKnown } from "@/lib/memory/read";
import { buildPlan } from "@/lib/planner/plan";
import { circleView, CIRCLE_ID, MEMORY_ACCOUNT_ID } from "@/lib/facts/stats";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
let cache: { at: number; body: unknown } | null = null;

export async function GET(req: Request) {
  const fresh = new URL(req.url).searchParams.get("fresh") === "1";
  if (!fresh && cache && Date.now() - cache.at < 180_000) return NextResponse.json(cache.body);
  if (!process.env.KEEPER_MEMWAL_KEY) return NextResponse.json({ error: "memory reader is not configured on this deployment" }, { status: 503 });
  try {
    const c = await circleView(CIRCLE_ID);
    const mem = await readKnown(keeperMemory(MEMORY_ACCOUNT_ID, "known"));
    if (mem.length === 0) return NextResponse.json({ error: "the circle's memory read returned nothing, try again in a moment" }, { status: 502 });
    const open = c.cycleStartMs + c.currentRound * c.roundMs;
    const plan = buildPlan({ members: c.members, roundOpenMs: open, roundDeadlineMs: open + c.roundMs, memories: mem });
    const body = { ...plan, memories: mem.map((m) => ({ id: m.id, type: m.type, attrs: m.attrs, text: m.text, date: m.date })), circle: { cycle: c.cycle, currentRound: c.currentRound } };
    cache = { at: Date.now(), body };
    return NextResponse.json(body);
  } catch (e) { return NextResponse.json({ error: String((e as Error).message).slice(0, 200) }, { status: 502 }); }
}
