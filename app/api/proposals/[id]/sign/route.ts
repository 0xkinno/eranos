import { NextRequest, NextResponse } from "next/server";
import { addSignature, getProposal } from "@/lib/proposals";
export const dynamic = "force-dynamic";
export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const p = await getProposal((await ctx.params).id);
  return p ? NextResponse.json({ bytesB64: p.bytesB64, digest: p.digest, summary: p.summary }) : NextResponse.json({ error: "not found" }, { status: 404 });
}
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try { const { signature } = await req.json(); const p = await addSignature((await ctx.params).id, signature); return NextResponse.json({ signatures: Object.keys(p.partials).length, executed: p.executed ?? null }); }
  catch (e) { return NextResponse.json({ error: String((e as Error).message).slice(0, 300) }, { status: 400 }); }
}
