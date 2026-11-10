// Scribe: paste chat text, analyze() extracts candidate facts, they land in `heard` only. Nothing here can write to `known`.
import { NextRequest, NextResponse } from "next/server";
import { keeperMemory } from "@/lib/memory/client";
import { heardLine, heardText } from "@/lib/memory/heard";
import { MEMORY_ACCOUNT_ID, CIRCLE_ID } from "@/lib/facts/stats";
import { tatum } from "@/lib/tatum/sui";
import { limited, clientIp } from "@/lib/rate";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  if (limited(`scribe:${clientIp(req)}`, 4)) return NextResponse.json({ error: "too many requests, try again in a minute" }, { status: 429 });
  const { text, about } = (await req.json()) as { text?: string; about?: string };
  if (!text || text.length > 1500 || !about) return NextResponse.json({ error: "text (max 1500 characters) and about (member address) are required" }, { status: 400 });
  const circle = (await tatum().getCircle(CIRCLE_ID)).json as { members: string[] };
  if (!circle.members.includes(about)) return NextResponse.json({ error: "about must be a member of the circle" }, { status: 400 });
  const scribe = keeperMemory(MEMORY_ACCOUNT_ID, "scribe");
  const extracted = await scribe.analyze(text, { namespace: "scribe" } as never);
  const heard = keeperMemory(MEMORY_ACCOUNT_ID, "heard");
  const written: { id: string; blob_id: string; text: string }[] = [];
  const date = new Date().toISOString().slice(0, 10);
  for (const f of extracted.facts.slice(0, 3)) {
    const line = heardText(heardLine({ text: f.text, about, date }));
    const r = await heard.rememberAndWait(line, { namespace: "heard" } as never);
    written.push({ id: r.blob_id, blob_id: r.blob_id, text: line });
  }
  return NextResponse.json({ extracted: extracted.facts.map((f) => f.text), heard: written });
}
