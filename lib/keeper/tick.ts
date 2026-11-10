// Keeper tick: verify every contribution and payout on chain through Tatum, write verified outcomes to memory, call payout when a round is full.
// The keeper never moves money except by calling the permissionless payout (which pays only order[round]).
import { tatum } from "@/lib/tatum/sui";
import { USDC } from "@/lib/config";
import { formatLine } from "@/lib/memory/format";
import { store } from "./store";
import { txDigest } from "@/lib/sui/multisig";
import { normalizeSuiAddress } from "@mysten/sui/utils";

export interface Ctx {
  circleId: string; pkg: string; startCheckpoint: number;
  remember: (text: string, namespace: string, idempotencyKey: string) => Promise<{ blob_id: string }>;
  payout?: (round: number) => Promise<{ digest: string }>;
  sabotage?: string;
}
export interface TickReport { at: string; verified: number; refused: { digest: string; why: string }[]; written: { key: string; blob_id: string }[]; payouts: string[]; skipped: number }

type Ev = { eventType: string; json: Record<string, string> | null };
const evs = (tx: { events?: unknown }) => (tx.events ?? []) as Ev[];
const eq = (a: string, b: string) => normalizeSuiAddress(a) === normalizeSuiAddress(b);

export async function verifyContribution(digest: string, ev: Record<string, string>) {
  const t = tatum();
  const { ok, tx } = await t.getTransaction(digest);
  if (!ok) return { ok: false as const, why: "transaction not found or failed on chain" };
  const e = evs(tx).find((x) => x.eventType.endsWith("::circle::Contributed") && x.json && eq(x.json.member, ev.member) && x.json.round === ev.round && x.json.cycle === ev.cycle);
  if (!e) return { ok: false as const, why: "no matching Contributed event in the transaction" };
  const spent = (tx.balanceChanges ?? []).find((b: { address: string; coinType: string; amount: string }) => eq(b.address, ev.payer) && b.coinType.replace(/^0x0*/, "") === USDC.replace(/^0x0*/, ""));
  if (!spent || BigInt(spent.amount) !== -BigInt(ev.amount)) return { ok: false as const, why: "payer USDC balance did not drop by the contribution amount" };
  return { ok: true as const, timestampMs: Number(tx.timestampMs ?? 0) };
}

export async function tick(c: Ctx): Promise<TickReport> {
  const t = tatum(); const kv = store();
  const rep: TickReport = { at: new Date().toISOString(), verified: 0, refused: [], written: [], payouts: [], skipped: 0 };
  const [contribs, payouts, starts] = await Promise.all([
    t.queryEvents(`${c.pkg}::circle::Contributed`, c.startCheckpoint),
    t.queryEvents(`${c.pkg}::circle::PaidOut`, c.startCheckpoint),
    t.queryEvents(`${c.pkg}::circle::CycleStarted`, c.startCheckpoint),
  ]);
  const mine = <T extends { json: Record<string, string> }>(l: T[]) => l.filter((e) => eq(e.json.circle, c.circleId));
  const startMs = new Map(mine(starts).map((e) => [e.json.cycle, Number(e.json.start_ms)]));
  const roundMs = Number(((await t.getCircle(c.circleId)).json as { round_ms: string }).round_ms);
  const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);

  const claimed = mine(contribs).map((e) => ({ ...e }));
  if (c.sabotage === "keeper-claims-unpaid") claimed.push({ digest: txDigest(new TextEncoder().encode("eranos-sabotage-unpaid")), timestampMs: Date.now(), json: { circle: c.circleId, cycle: "1", round: "4", member: "0x" + "ee".repeat(32), payer: "0x" + "ee".repeat(32), amount: "100000" } });

  for (const e of claimed) {
    const key = `outcome:${e.json.cycle}:${e.json.round}:${e.json.member}`;
    if (await kv.get(key)) { rep.skipped++; continue; }
    const v = await verifyContribution(e.digest, e.json).catch((err: Error) => ({ ok: false as const, why: err.message.slice(0, 120) }));
    if (!v.ok) { rep.refused.push({ digest: e.digest, why: v.why }); continue; }
    rep.verified++;
    const deadline = (startMs.get(e.json.cycle) ?? 0) + (Number(e.json.round) + 1) * roundMs;
    const lateH = Math.max(0, (v.timestampMs - deadline) / 3_600_000);
    const text = formatLine({ type: "outcome", date: day(v.timestampMs), attrs: { cycle: e.json.cycle, round: e.json.round, member: e.json.member, late_h: lateH.toFixed(2), tx: e.digest }, text: `Member paid round ${Number(e.json.round) + 1} of cycle ${e.json.cycle}${lateH > 0 ? ` ${lateH.toFixed(2)} hours after the deadline` : " on time"}, verified on chain` });
    const r = await c.remember(text, "known", key);
    await kv.set(key, r.blob_id);
    rep.written.push({ key, blob_id: r.blob_id });
  }

  for (const e of mine(payouts)) {
    const key = `payout:${e.json.cycle}:${e.json.round}`;
    if (await kv.get(key)) { rep.skipped++; continue; }
    const { ok, tx } = await t.getTransaction(e.digest);
    const ev = evs(tx).find((x) => x.eventType.endsWith("::circle::PaidOut"));
    if (!ok || !ev) { rep.refused.push({ digest: e.digest, why: "payout transaction not verified" }); continue; }
    const text = formatLine({ type: "payout", date: day(Number(tx.timestampMs ?? Date.now())), attrs: { cycle: e.json.cycle, round: e.json.round, to: e.json.to, tx: e.digest }, text: `Round ${Number(e.json.round) + 1} pot of ${Number(e.json.amount) / 1e6} USDC went to the member whose turn it was` });
    const r = await c.remember(text, "known", key);
    await kv.set(key, r.blob_id);
    rep.written.push({ key, blob_id: r.blob_id });
  }

  // payout when a round is full and not yet paid out
  if (c.payout) {
    const n = ((await t.getCircle(c.circleId)).json as { members: string[] }).members.length;
    const paidOut = new Set(mine(payouts).map((e) => `${e.json.cycle}:${e.json.round}`));
    const counts = new Map<string, Set<string>>();
    for (const e of mine(contribs)) { const k = `${e.json.cycle}:${e.json.round}`; (counts.get(k) ?? counts.set(k, new Set()).get(k)!).add(e.json.member); }
    for (const [k, set] of counts) if (set.size === n && !paidOut.has(k)) {
      const pk = `payout-sent:${k}`;
      if (await kv.get(pk)) continue;
      await kv.set(pk, "pending");
      try { const r = await c.payout(Number(k.split(":")[1])); await kv.set(pk, r.digest); rep.payouts.push(r.digest); } catch (err) { await kv.set(pk, ""); rep.refused.push({ digest: "", why: `payout failed: ${(err as Error).message.slice(0, 100)}` }); }
    }
  }
  return rep;
}
