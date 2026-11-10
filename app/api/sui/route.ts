// Browser reads and wallet-side resolution go through Tatum on the server, so the key never reaches the browser.
// On a 429 or a 402 the proxy retries with backoff, then answers from the public Sui node and counts it as a fallback.
import { NextRequest, NextResponse } from "next/server";
import { TATUM_GRAPHQL } from "@/lib/config";
import { tatum, PUBLIC_GRAPHQL } from "@/lib/tatum/sui";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: NextRequest) {
  const body = await req.text();
  if (body.length > 200_000) return NextResponse.json({ error: "too large" }, { status: 413 });
  const t = tatum();
  const call = (url: string, key: boolean) => fetch(url, { method: "POST", body, cache: "no-store", headers: { "content-type": "application/json", ...(key && process.env.TATUM_API_KEY ? { "x-api-key": process.env.TATUM_API_KEY } : {}) } });
  if (t.provider === "tatum") {
    for (let i = 0; i < 4; i++) {
      const res = await call(TATUM_GRAPHQL, true);
      t.counts["browser-proxy"] = (t.counts["browser-proxy"] ?? 0) + 1;
      if (res.status !== 429 && res.status !== 402) return new NextResponse(res.body, { status: res.status, headers: { "content-type": "application/json" } });
      if (res.status === 402) break;
      await wait(350 * 2 ** i);
    }
  }
  t.fallbackCounts++;
  const res = await call(PUBLIC_GRAPHQL, false);
  return new NextResponse(res.body, { status: res.status, headers: { "content-type": "application/json", "x-eranos-provider": "public-fallback" } });
}
