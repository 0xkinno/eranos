// P8: memory changed the product. For every demo member: reminder times and next-cycle order with memory off vs on, with the cited memory lines.
// Also the labelled synthetic replay (12 member-months, clearly synthetic) for both error directions.
import { writeFileSync } from "node:fs";
import { members, evidence } from "./chain";
const BASE = process.argv[2] ?? "http://localhost:3111";
type Rem = { atMs: number; reason: string; cited: string[] };
(async () => {
  const p = await (await fetch(`${BASE}/api/planner?fresh=1`)).json();
  const addr = members.map((m) => m.toSuiAddress());
  const rows = addr.map((a, i) => {
    const off = p.reminders.off.find((x: { member: string }) => x.member === a), on = p.reminders.on.find((x: { member: string }) => x.member === a);
    const ro = p.order.off.find((x: { member: string }) => x.member === a), rn = p.order.on.find((x: { member: string }) => x.member === a);
    const t = (r: Rem[]) => r.map((x) => new Date(x.atMs).toISOString().slice(11, 16));
    return { member: i + 1, address: a, remindersOff: t(off.reminders), remindersOn: t(on.reminders), reminderReasonsOn: on.reminders.map((r: Rem) => ({ reason: r.reason, cited: r.cited })), orderOff: ro.round + 1, orderOn: rn.round + 1, orderReasonOn: rn.reason, orderCited: rn.cited, memoryUsed: on.memoryUsed };
  });
  const changedReminder = rows.filter((r) => JSON.stringify(r.remindersOff) !== JSON.stringify(r.remindersOn)).length;
  const changedOrder = rows.filter((r) => r.orderOff !== r.orderOn).length;
  // synthetic replay: deterministic, labelled synthetic. A member can only pay once money arrives (payday fraction), then pays after a delay.
  const synth = Array.from({ length: 12 }, (_, k) => { const payday = [0.15, 0.3, 0.45, 0.6, 0.75, 0.9][k % 6]; const delay = [0.02, 0.05, 0.1][k % 3]; return { payday, paidAt: Math.min(0.99, payday + delay) }; });
  const score = (times: (s: { payday: number; paidAt: number }) => number[]) => { let early = 0, wasted = 0, total = 0; for (const s of synth) for (const t of times(s)) { total++; if (t < s.payday) early++; else if (t > s.paidAt) wasted++; } return { reminders: total, falseEarly: early, wasted }; };
  const off = score(() => [0, 0.97 - 0.0]); // round open and about 24h before deadline (30 day round: 0.967)
  const on = score((s) => [s.payday, Math.min(0.97, s.payday + 0.2 * 1)]);
  const out = { generatedAt: new Date().toISOString(), cycle: p.circle, memoriesRead: p.memoriesRead, members: rows, changedReminderCount: changedReminder, changedOrderCount: changedOrder, syntheticReplay: { label: "SYNTHETIC: 12 invented member-months, not real data, kept out of headline numbers", memoryOff: off, memoryOn: on } };
  writeFileSync("docs/p8.json", JSON.stringify(out, null, 2) + "\n");
  console.log(JSON.stringify({ changedReminderCount: changedReminder, changedOrderCount: changedOrder, replay: out.syntheticReplay }, null, 1));
  for (const r of rows) console.log(`member ${r.member}: reminders off ${r.remindersOff} on ${r.remindersOn} | order off ${r.orderOff} on ${r.orderOn} | ${r.orderReasonOn}`);
  evidence("P8 memory off vs on for every demo member (docs/p8.json)", null, { changedReminderCount: changedReminder, changedOrderCount: changedOrder });
})().catch((e) => { console.error(String(e?.message ?? e).slice(0, 400)); process.exit(1); });
