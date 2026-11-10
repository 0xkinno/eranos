// Assembles the planner output for a circle: reminders per member and next-cycle order, memory off and on.
import type { StoredMemory } from "@/lib/memory/format";
import { visibleKnown } from "@/lib/memory/format";
import { planMember } from "./reminders";
import { proposeOrder } from "./order";

export interface PlanInput { members: string[]; roundOpenMs: number; roundDeadlineMs: number; memories: StoredMemory[]; sent?: Record<string, number> }
const tzOf = (mem: StoredMemory[], member: string) => mem.find((m) => m.type === "fact" && m.attrs.about === member && m.attrs.tz)?.attrs.tz ?? "UTC";

export function buildPlan(p: PlanInput) {
  const known = visibleKnown(p.memories);
  const round = { openMs: p.roundOpenMs, deadlineMs: p.roundDeadlineMs };
  const per = (on: boolean) => p.members.map((m) => planMember({ member: m, round, memories: known, memoryOn: on, tz: tzOf(known, m), enforceQuiet: false, sentThisRound: p.sent?.[m] ?? 0 }));
  const joined = p.members.map((member, i) => ({ member, joinedAt: `2026-11-10T00:00:${String(i).padStart(2, "0")}` }));
  return {
    round,
    reminders: { off: per(false), on: per(true) },
    order: { off: proposeOrder({ members: joined, memories: known, memoryOn: false }), on: proposeOrder({ members: joined, memories: known, memoryOn: true }) },
    memoriesRead: known.length,
  };
}
