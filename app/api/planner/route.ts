import { NextResponse } from "next/server";
import { keeperMemory } from "@/lib/memory/client";
import { readKnown } from "@/lib/memory/read";
import { buildPlan } from "@/lib/planner/plan";
import { circleView, CIRCLE_ID, MEMORY_ACCOUNT_ID } from "@/lib/facts/stats";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
let cache: { at: number; body: unknown } | null = null;

export async function GET() {
  if (cache && Date.now() - cache.at < 45_000) return NextResponse.json(cache.body);
  try {
    const c = await circleView(CIRCLE_ID);
    const mem = await readKnown(keeperMemory(MEMORY_ACCOUNT_ID, "known"));
    const open = c.cycleStartMs + c.currentRound * c.roundMs;
    const plan = buildPlan({ members: c.members, roundOpenMs: open, roundDeadlineMs: open + c.roundMs, memories: mem });
    const body = { ...plan, memories: mem.map((m) => ({ id: m.id, type: m.type, attrs: m.attrs, text: m.text, date: m.date })), circle: { cycle: c.cycle, currentRound: c.currentRound } };
    cache = { at: Date.now(), body };
    return NextResponse.json(body);
  } catch (e) { return NextResponse.json({ error: String((e as Error).message).slice(0, 200) }, { status: 502 }); }
}
