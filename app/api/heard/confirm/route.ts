// The person a fact is about signs to confirm it. Only then does the keeper copy it to `known`.
import { NextRequest, NextResponse } from "next/server";
import { keeperMemory } from "@/lib/memory/client";
import { readKnown } from "@/lib/memory/read";
import { promoteHeard, verifyReject, PolicyError } from "@/lib/memory/policy";
import { formatLine } from "@/lib/memory/format";
import { MEMORY_ACCOUNT_ID, CIRCLE_ID } from "@/lib/facts/stats";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const { heardId, signature, editedText, reject } = (await req.json()) as { heardId: string; signature: string; editedText?: string; reject?: boolean };
  const heardMem = keeperMemory(MEMORY_ACCOUNT_ID, "heard");
  const heard = (await readKnown(heardMem, "heard")).find((h) => h.id === heardId);
  if (!heard) return NextResponse.json({ error: "heard line not found" }, { status: 404 });
  const today = new Date().toISOString().slice(0, 10);
  if (reject) {
    if (!(await verifyReject({ circleId: CIRCLE_ID, heard, signatureB64: signature }))) return NextResponse.json({ error: "signature is not from the member this fact is about" }, { status: 403 });
    await heardMem.rememberAndWait(formatLine({ type: "retract", date: today, attrs: { ref: heardId, by: heard.attrs.about, reason: "rejected" }, text: "the member rejected this fact" }), { namespace: "heard" } as never);
    return NextResponse.json({ rejected: true });
  }
  try {
    const known = await promoteHeard({ circleId: CIRCLE_ID, heard, signatureB64: signature, today, editedText });
    const r = await keeperMemory(MEMORY_ACCOUNT_ID, "known").rememberAndWait(formatLine(known), { namespace: "known", idempotencyKey: `confirm:${heardId}` } as never);
    await heardMem.rememberAndWait(formatLine({ type: "retract", date: today, attrs: { ref: heardId, by: heard.attrs.about, reason: "confirmed" }, text: "moved to known after the member confirmed it" }), { namespace: "heard" } as never);
    return NextResponse.json({ known: formatLine(known), blob_id: r.blob_id });
  } catch (e) {
    if (e instanceof PolicyError) return NextResponse.json({ error: e.message }, { status: 403 });
    return NextResponse.json({ error: String((e as Error).message).slice(0, 200) }, { status: 502 });
  }
}
