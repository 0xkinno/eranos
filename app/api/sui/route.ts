// Browser reads and wallet-side resolution go through Tatum on the server, so the key never reaches the browser.
import { NextRequest, NextResponse } from "next/server";
import { TATUM_GRAPHQL } from "@/lib/config";
import { tatum } from "@/lib/tatum/sui";
export const dynamic = "force-dynamic";
export async function POST(req: NextRequest) {
  const body = await req.text();
  if (body.length > 200_000) return NextResponse.json({ error: "too large" }, { status: 413 });
  const t = tatum();
  const res = await fetch(t.provider === "tatum" ? TATUM_GRAPHQL : "https://graphql.mainnet.sui.io/graphql", {
    method: "POST", body, cache: "no-store",
    headers: { "content-type": "application/json", ...(t.provider === "tatum" && process.env.TATUM_API_KEY ? { "x-api-key": process.env.TATUM_API_KEY } : {}) },
  });
  t.counts["browser-proxy"] = (t.counts["browser-proxy"] ?? 0) + 1;
  return new NextResponse(res.body, { status: res.status, headers: { "content-type": "application/json" } });
}
