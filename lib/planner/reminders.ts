// Deterministic reminder planner. Pure. Reads only decision memories (confirmed facts, outcomes, reminder results).
import type { StoredMemory } from "@/lib/memory/format";
import { decisionMemories } from "@/lib/memory/policy";
import { HOUR, isQuiet, localParts, zonedToMs } from "./time";

export const MAX_REMINDERS_PER_ROUND = 2;
export const EWMA_ALPHA = 0.5;

export interface Round { openMs: number; deadlineMs: number }
export interface Reminder { atMs: number; reason: string; cited: string[] }
export interface MemberPlan { member: string; reminders: Reminder[]; memoryUsed: boolean }

export function ewmaLateness(outcomes: StoredMemory[]): number {
  const sorted = [...outcomes].sort((a, b) => (a.date + (a.attrs.cycle ?? "") + (a.attrs.round ?? "")).localeCompare(b.date + (b.attrs.cycle ?? "") + (b.attrs.round ?? "")));
  let v: number | null = null;
  for (const o of sorted) {
    const x = Number(o.attrs.late_h);
    if (!Number.isFinite(x)) continue;
    v = v === null ? x : EWMA_ALPHA * x + (1 - EWMA_ALPHA) * v;
  }
  return v ?? 0;
}

/** Fraction of the round (0..1) at which this member's money is expected to be available, from a confirmed fact. */
export function paydayFraction(f: StoredMemory, round: Round, tz: string): number | null {
  if (f.attrs.pays_at !== undefined) {
    const x = Number(f.attrs.pays_at);
    return x >= 0 && x <= 1 ? x : null;
  }
  if (f.attrs.payday !== undefined) {
    const day = Number(f.attrs.payday);
    if (!(day >= 1 && day <= 31)) return null;
    // find the payday instant inside or just before the round window, in the member's timezone
    const o = localParts(round.openMs, tz);
    for (const [y, m] of [[o.y, o.m], [o.m === 12 ? o.y + 1 : o.y, o.m === 12 ? 1 : o.m + 1]] as const) {
      const t = zonedToMs(y, m, day, 9, 0, tz);
      if (t >= round.openMs && t < round.deadlineMs) return (t - round.openMs) / (round.deadlineMs - round.openMs);
    }
  }
  return null;
}

const shiftOutOfQuiet = (ms: number, tz: string, round: Round, enforce: boolean): number => {
  if (!enforce) return ms;
  let t = ms;
  for (let i = 0; i < 48 && isQuiet(t, tz); i++) t += HOUR / 2;
  if (t >= round.deadlineMs) { // go earlier instead
    t = ms;
    for (let i = 0; i < 48 && isQuiet(t, tz); i++) t -= HOUR / 2;
  }
  return t;
};

export function planMember(p: {
  member: string; round: Round; memories: StoredMemory[]; memoryOn: boolean; tz?: string; enforceQuiet?: boolean; sentThisRound?: number;
}): MemberPlan {
  const tz = p.tz ?? "UTC";
  const enforce = p.enforceQuiet ?? true;
  const span = p.round.deadlineMs - p.round.openMs;
  const mine = decisionMemories(p.memories).filter((m) => m.attrs.about === p.member || m.attrs.member === p.member);
  const facts = mine.filter((m) => m.type === "fact");
  const outcomes = mine.filter((m) => m.type === "outcome");
  const remindersLeft = Math.max(0, MAX_REMINDERS_PER_ROUND - (p.sentThisRound ?? 0));

  const defaults: Reminder[] = [
    { atMs: p.round.openMs, reason: "round opened", cited: [] },
    { atMs: Math.max(p.round.openMs, p.round.deadlineMs - Math.min(24 * HOUR, span / 2)), reason: "24 hours before the deadline", cited: [] },
  ];
  let reminders = defaults;
  let used = false;

  if (p.memoryOn) {
    const pf = facts.map((f) => ({ f, frac: paydayFraction(f, p.round, tz) })).find((x) => x.frac !== null);
    if (pf && pf.frac !== null) {
      const first = p.round.openMs + pf.frac * span;
      const late = ewmaLateness(outcomes);
      const lateIds = outcomes.filter((o) => Number(o.attrs.late_h) > 0).map((o) => o.id);
      // second nudge: after the first by a day (or a fifth of the round), pulled earlier for habitually late payers, never past 6h before deadline
      const gap = Math.max(span * 0.2, 0);
      let second = Math.min(first + Math.min(24 * HOUR, gap), p.round.deadlineMs - Math.min(6 * HOUR, span * 0.1));
      if (late > 0) second = Math.min(second, first + Math.max(span * 0.05, 0));
      reminders = [
        { atMs: first, reason: `payday on the ${f2(pf.f)}: first reminder when the money arrives`, cited: [pf.f.id] },
        { atMs: Math.max(second, first), reason: late > 0 ? `paid ${late.toFixed(1)} h late on average: second reminder follows quickly` : "second reminder before the deadline", cited: late > 0 ? [pf.f.id, ...lateIds] : [pf.f.id] },
      ];
      used = true;
    } else if (outcomes.length) {
      const late = ewmaLateness(outcomes);
      if (late > 0) {
        reminders = [defaults[0], { atMs: Math.max(p.round.openMs, p.round.deadlineMs - Math.min(24 * HOUR, span / 2) - late * HOUR), reason: `usually ${late.toFixed(1)} h late: second reminder moved earlier`, cited: outcomes.map((o) => o.id) }];
        used = true;
      }
    }
  }
  const final = reminders
    .map((r) => ({ ...r, atMs: Math.round(shiftOutOfQuiet(r.atMs, tz, p.round, enforce)) }))
    .sort((a, b) => a.atMs - b.atMs)
    .slice(0, remindersLeft);
  return { member: p.member, reminders: final, memoryUsed: used };
}
const f2 = (f: StoredMemory) => f.attrs.payday ?? `${Math.round(Number(f.attrs.pays_at) * 100)}% mark`;
