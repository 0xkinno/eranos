// Pass-through to the Walrus Memory relayer. The relayer's CORS blocks browsers. The SDK signs
// "{timestamp}.{method}.{path}.{body_sha256}.{nonce}.{account_id}" and the "/api/mw" prefix is not part of the
// signed path, so forwarding bytes unchanged keeps every member's own signature valid. We never see a private key.
import { NextRequest, NextResponse } from "next/server";
import { MEMWAL_RELAYER } from "@/lib/config";

export const runtime = "nodejs";
const ALLOWED = [/^api\/remember(\/bulk|\/status(\/.*)?)?$/, /^api\/recall$/, /^api\/analyze$/, /^api\/ask$/, /^api\/restore$/, /^api\/memories(\/.*)?$/, /^api\/namespaces$/, /^api\/jobs(\/.*)?$/, /^(version|config|health)$/];
const FORWARD_HEADERS = ["content-type", "x-public-key", "x-signature", "x-timestamp", "x-nonce", "x-account-id", "x-delegate-key", "x-seal-session", "x-idempotency-key"];
const hits = new Map<string, { n: number; t: number }>();
const LIMIT = 120; // per IP per minute

function limited(ip: string) {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now - h.t > 60_000) { hits.set(ip, { n: 1, t: now }); return false; }
  h.n++;
  return h.n > LIMIT;
}

async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const p = path.join("/");
  if (!ALLOWED.some((r) => r.test(p))) return NextResponse.json({ error: "path not allowed" }, { status: 404 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (limited(ip)) return NextResponse.json({ error: "rate limited" }, { status: 429 });
  const headers = new Headers();
  for (const k of FORWARD_HEADERS) { const v = req.headers.get(k); if (v) headers.set(k, v); }
  // forward every x-* auth header the SDK may add, unchanged
  req.headers.forEach((v, k) => { if (k.startsWith("x-") && !k.startsWith("x-forwarded") && !k.startsWith("x-vercel") && !headers.has(k)) headers.set(k, v); });
  const body = ["GET", "HEAD"].includes(req.method) ? undefined : new Uint8Array(await req.arrayBuffer());
  const url = `${MEMWAL_RELAYER}/${p}${req.nextUrl.search}`;
  const res = await fetch(url, { method: req.method, headers, body, cache: "no-store" });
  const out = new Headers();
  const ct = res.headers.get("content-type"); if (ct) out.set("content-type", ct);
  return new NextResponse(res.body, { status: res.status, headers: out });
}
export { handle as GET, handle as POST, handle as PUT, handle as DELETE };
