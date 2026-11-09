// Next-cycle order proposal. Pure. A proposal only: stewards sign start_cycle with it or edit it.
import type { StoredMemory } from "@/lib/memory/format";
import { decisionMemories } from "@/lib/memory/policy";
import { ewmaLateness } from "./reminders";

export interface OrderEntry { member: string; round: number; reason: string; cited: string[] }
export interface Joined { member: string; joinedAt: string } // YYYY-MM-DD

export function proposeOrder(p: { members: Joined[]; memories: StoredMemory[]; memoryOn: boolean }): OrderEntry[] {
  const n = p.members.length;
  const mem = p.memoryOn ? decisionMemories(p.memories) : [];
  const byJoin = [...p.members].sort((a, b) => a.joinedAt.localeCompare(b.joinedAt) || a.member.localeCompare(b.member));
  if (!p.memoryOn) return byJoin.map((m, i) => ({ member: m.member, round: i, reason: "join order (memory off)", cited: [] }));

  const info = new Map(p.members.map((m) => {
    const mine = mem.filter((x) => x.attrs.about === m.member || x.attrs.member === m.member);
    const outs = mine.filter((x) => x.type === "outcome");
    const need = mine.filter((x) => x.type === "fact" && x.attrs.needs_round !== undefined).sort((a, b) => b.date.localeCompare(a.date))[0];
    return [m.member, { late: ewmaLateness(outs), lateIds: outs.filter((o) => Number(o.attrs.late_h) > 0).map((o) => o.id), need, outs }];
  }));

  const slots: (OrderEntry | null)[] = new Array(n).fill(null);
  // rule 1: confirmed dated need pins a round; earliest joiner wins a conflict
  for (const m of byJoin) {
    const need = info.get(m.member)!.need;
    const r = need ? Number(need.attrs.needs_round) : NaN;
    if (need && Number.isInteger(r) && r >= 0 && r < n && !slots[r]) slots[r] = { member: m.member, round: r, reason: `confirmed need for round ${r + 1}: "${need.text}"`, cited: [need.id] };
  }
  const placed = new Set(slots.filter(Boolean).map((s) => s!.member));
  // rule 2 and 3: remaining sorted by lateness ascending (late payers draw later), ties by join date
  const rest = byJoin.filter((m) => !placed.has(m.member)).sort((a, b) => info.get(a.member)!.late - info.get(b.member)!.late);
  let k = 0;
  for (const m of rest) {
    while (slots[k]) k++;
    const i = info.get(m.member)!;
    slots[k] = { member: m.member, round: k, reason: i.late > 0 ? `paid ${i.late.toFixed(1)} h late on average, so draws later` : i.outs.length ? "paid on time in every recorded round" : "no history yet: join order", cited: i.late > 0 ? i.lateIds : i.outs.map((o) => o.id) };
  }
  return slots as OrderEntry[];
}
