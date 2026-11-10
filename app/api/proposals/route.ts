import { NextRequest, NextResponse } from "next/server";
import { createProposal, listProposals } from "@/lib/proposals";
import { keeperMemory } from "@/lib/memory/client";
import { readKnown } from "@/lib/memory/read";
import { buildPlan } from "@/lib/planner/plan";
import { circleView, CIRCLE_ID, MEMORY_ACCOUNT_ID } from "@/lib/facts/stats";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const strip = (p: Awaited<ReturnType<typeof listProposals>>[number]) => ({ ...p, bytesB64: undefined, partials: Object.keys(p.partials) });
export async function GET() { return NextResponse.json({ proposals: (await listProposals()).map(strip) }); }
export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    if (b.kind === "start") {
      const c = await circleView(CIRCLE_ID);
      const mem = await readKnown(keeperMemory(MEMORY_ACCOUNT_ID, "known"));
      const plan = buildPlan({ members: c.members, roundOpenMs: Date.now(), roundDeadlineMs: Date.now() + c.roundMs, memories: mem });
      const order = (b.memory === "off" ? plan.order.off : plan.order.on);
      const p = await createProposal({ kind: "start", order: order.map((o) => o.member) });
      return NextResponse.json({ ...strip(p), reasons: order });
    }
    return NextResponse.json(strip(await createProposal(b)));
  } catch (e) { return NextResponse.json({ error: String((e as Error).message).slice(0, 300) }, { status: 400 }); }
}
