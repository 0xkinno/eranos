import { NextRequest, NextResponse } from "next/server";
import { tatum } from "@/lib/tatum/sui";
import { USDC } from "@/lib/config";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address") ?? "";
  if (!/^0x[0-9a-fA-F]{64}$/.test(address)) return NextResponse.json({ error: "bad address" }, { status: 400 });
  const b = await tatum().client.core.getBalance({ owner: address, coinType: USDC });
  return NextResponse.json({ usdc: (Number(b.balance.balance) / 1e6).toFixed(2), baseUnits: b.balance.balance });
}
