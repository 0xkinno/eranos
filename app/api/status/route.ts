import { NextResponse } from "next/server";
import { tatum } from "@/lib/tatum/sui";
import { MEMWAL_RELAYER, MEMWAL_PKG, ERANOS_PKG } from "@/lib/config";

export const dynamic = "force-dynamic";

async function probe<T>(name: string, f: () => Promise<T>) {
  const t0 = Date.now();
  try { const v = await f(); return { name, ok: true, ms: Date.now() - t0, at: new Date().toISOString(), detail: v }; }
  catch (e) { return { name, ok: false, ms: Date.now() - t0, at: new Date().toISOString(), error: String((e as Error).message).slice(0, 160) }; }
}

export async function GET() {
  const t = tatum();
  const [chain, relayer] = await Promise.all([
    probe("sui-graphql", async () => (await t.checkpoint())?.sequenceNumber),
    probe("walrus-memory-relayer", async () => (await (await fetch(`${MEMWAL_RELAYER}/health`, { cache: "no-store" })).json()).status),
  ]);
  return NextResponse.json({ app: "eranos", probes: [chain, relayer], provider: t.status(), config: { memwalPackage: MEMWAL_PKG, eranosPackage: ERANOS_PKG || null } });
}
