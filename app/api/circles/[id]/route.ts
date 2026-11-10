import { NextResponse } from "next/server";
import { circleView } from "@/lib/facts/stats";
export const dynamic = "force-dynamic";
export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try { return NextResponse.json(await circleView(id), { headers: { "cache-control": "s-maxage=10, stale-while-revalidate=30" } }); }
  catch (e) { return NextResponse.json({ error: String((e as Error).message).slice(0, 200) }, { status: 502 }); }
}
