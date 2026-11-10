// Live numbers. Chain facts are recomputed from Tatum reads. Memory counts come from docs/FACTS.json (written by scripts/facts.ts from live listMemories).
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tatum } from "@/lib/tatum/sui";
import { ERANOS_PKG, USDC } from "@/lib/config";

export const START_CHECKPOINT = Number(process.env.ERANOS_START_CHECKPOINT ?? 343633600);
export const CIRCLE_ID = process.env.DEMO_CIRCLE_ID ?? "";
export const MEMORY_ACCOUNT_ID = process.env.DEMO_MEMORY_ACCOUNT_ID ?? "";

export interface EvidenceRow { at: string; label: string; digest: string | null; [k: string]: unknown }
export function evidence(): EvidenceRow[] {
  const p = join(process.cwd(), "docs/evidence.jsonl");
  if (!existsSync(p)) return [];
  return readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as EvidenceRow);
}
export function factsFile(): Record<string, unknown> {
  const p = join(process.cwd(), "docs/FACTS.json");
  return existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")) as Record<string, unknown>) : {};
}

export interface CircleView {
  id: string; name: string; stewards: string; memoryAccount: string; contribution: number; roundMs: number; cycle: number; cycleStartMs: number;
  members: string[]; order: string[]; pot: number; paidOut: boolean[];
  paid: Record<string, string[]>; // round -> members paid (this cycle)
  currentRound: number; payouts: { round: number; to: string; digest: string }[];
  roll: { money: number; memory: number; agree: boolean; accessCounter: number; delegateCount: number };
  provider: string;
}

export async function circleView(id = CIRCLE_ID): Promise<CircleView> {
  const t = tatum();
  const c = (await t.getCircle(id)).json as Record<string, unknown>;
  const members = (c.members as string[]) ?? [];
  const cycle = Number(c.cycle);
  const [contribs, payouts] = await Promise.all([
    t.queryEvents(`${ERANOS_PKG}::circle::Contributed`, START_CHECKPOINT),
    t.queryEvents(`${ERANOS_PKG}::circle::PaidOut`, START_CHECKPOINT),
  ]);
  const paid: Record<string, string[]> = {};
  for (const e of contribs) if (e.json.circle === id && Number(e.json.cycle) === cycle) (paid[e.json.round] ??= []).push(e.json.member);
  const acct = await t.getMemWalAccount(String(c.memory_account));
  const keys = c.member_keys as { size?: string } | undefined;
  const money = members.length;
  // memory roll: member delegate keys = all delegates except the keeper
  const memory = Math.max(0, acct.delegateKeys.length - 1);
  const startMs = Number(c.cycle_start_ms);
  const roundMs = Number(c.round_ms);
  void keys;
  return {
    id, name: Buffer.from(String(c.name), "base64").toString("utf8"), stewards: String(c.stewards), memoryAccount: String(c.memory_account),
    contribution: Number(c.contribution), roundMs, cycle, cycleStartMs: startMs, members, order: (c.order as string[]) ?? [],
    pot: Number(c.pot), paidOut: (c.paid_out as boolean[]) ?? [], paid,
    currentRound: startMs ? Math.min(Math.floor((Date.now() - startMs) / roundMs), Math.max(0, members.length - 1)) : 0,
    payouts: payouts.filter((e) => e.json.circle === id).map((e) => ({ round: Number(e.json.round), to: e.json.to, digest: e.digest })),
    roll: { money, memory, agree: money === memory, accessCounter: acct.accessCounterVersion, delegateCount: acct.delegateKeys.length },
    provider: t.provider,
  };
}

export async function liveStats() {
  const t = tatum();
  const [contribs, payouts] = await Promise.all([
    t.queryEvents(`${ERANOS_PKG}::circle::Contributed`, START_CHECKPOINT),
    t.queryEvents(`${ERANOS_PKG}::circle::PaidOut`, START_CHECKPOINT),
  ]);
  const ev = evidence();
  const f = factsFile() as { memories?: { total?: number } };
  return {
    contributions: contribs.length, payouts: payouts.length, usdcMoved: payouts.reduce((a, e) => a + Number(e.json.amount), 0) / 1e6,
    joinTransactions: ev.filter((e) => e.label.startsWith("join member")).length,
    x402Payments: ev.filter((e) => e.label.startsWith("x402 agent payment")).length,
    memories: f.memories?.total ?? 0, asset: USDC, provider: t.provider, at: new Date().toISOString(),
  };
}
