import { NextResponse } from "next/server";
import { put, list, get } from "@vercel/blob";
export const dynamic = "force-dynamic";
export async function GET() {
  const out: Record<string, unknown> = {};
  try {
    const path = `eranos-kv/debug/${Date.now().toString().padStart(15, "0")}.txt`;
    const w = await put(path, "hello", { access: "private", addRandomSuffix: false, allowOverwrite: true, contentType: "text/plain" });
    out.put = { pathname: w.pathname, url: w.url.slice(0, 60) };
    const l = await list({ prefix: "eranos-kv/debug/", limit: 50 });
    out.list = l.blobs.map((b) => b.pathname);
    const g = await get(path, { access: "private" });
    out.get = g ? { status: g.statusCode, text: g.statusCode === 200 ? await new Response(g.stream).text() : null } : null;
  } catch (e) { out.error = String((e as Error).message).slice(0, 300); }
  return NextResponse.json(out);
}
