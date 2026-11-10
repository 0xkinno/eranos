import { NextRequest, NextResponse } from "next/server";
import { usdcRate, CURRENCIES, type Currency } from "@/lib/tatum/data";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const c = (req.nextUrl.searchParams.get("c") ?? "USD") as Currency;
  if (!CURRENCIES.includes(c)) return NextResponse.json({ error: "unsupported currency" }, { status: 400 });
  try { return NextResponse.json(await usdcRate(c), { headers: { "cache-control": "s-maxage=60" } }); } catch (e) { return NextResponse.json({ error: String((e as Error).message) }, { status: 502 }); }
}
