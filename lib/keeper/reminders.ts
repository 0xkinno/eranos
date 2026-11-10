// Reminder delivery. The keeper sends in-app reminders (shown on the circle page for the member) inside the interruption budget:
// at most 2 per member per round, none between 21:00 and 08:00 in the member's timezone, none to a member who has already paid.
// Two named exceptions always get through: "your turn landed" and "a steward vote needs you".
import { isQuiet } from "@/lib/planner/time";
import { MAX_REMINDERS_PER_ROUND } from "@/lib/planner/reminders";

export interface DueInput {
  now: number; cycle: number; round: number;
  plan: { member: string; tz: string; reminders: { atMs: number; reason: string; cited: string[] }[] }[];
  paid: Set<string>; sentKeys: Set<string>;
}
export interface Due { key: string; member: string; kind: "reminder"; atMs: number; reason: string; cited: string[]; n: number }

export function selectDue(i: DueInput): Due[] {
  const out: Due[] = [];
  for (const m of i.plan) {
    if (i.paid.has(m.member)) continue;
    let sent = [...i.sentKeys].filter((k) => k.startsWith(`rem:${i.cycle}:${i.round}:${m.member}:`)).length;
    for (const [n, r] of m.reminders.entries()) {
      const key = `rem:${i.cycle}:${i.round}:${m.member}:${n}`;
      if (i.sentKeys.has(key) || r.atMs > i.now) continue;
      if (sent >= MAX_REMINDERS_PER_ROUND) break;
      if (isQuiet(i.now, m.tz)) continue;
      out.push({ key, member: m.member, kind: "reminder", atMs: i.now, reason: r.reason, cited: r.cited, n });
      sent++;
    }
  }
  return out;
}

export interface Notice { id: string; member: string; kind: "reminder" | "turn" | "steward"; at: number; text: string; cited: string[]; cycle: number; round: number }
export const noticeText = (kind: Notice["kind"], round: number, reason = "") =>
  kind === "turn" ? `Your turn landed: the pot for round ${round + 1} was paid to your wallet.` : kind === "steward" ? "A steward vote needs you." : `Round ${round + 1} is open and not yet paid. ${reason}`.trim();
