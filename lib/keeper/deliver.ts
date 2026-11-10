// Delivers reminders and "your turn landed" notices. Each delivery is written to Walrus Memory as a typed [reminder] line (namespace keeper)
// and appended to the member's in-app inbox. The sent-key in the store makes every delivery idempotent.
import { tatum } from "@/lib/tatum/sui";
import { store } from "./store";
import { selectDue, noticeText, type Notice } from "./reminders";
import { buildPlan } from "@/lib/planner/plan";
import { formatLine, type StoredMemory } from "@/lib/memory/format";

export interface DeliverCtx { circleId: string; pkg: string; startCheckpoint: number; now?: number; readMemories: () => Promise<StoredMemory[]>; remember: (text: string, ns: string, key: string) => Promise<{ blob_id: string }> }
const inboxKey = (m: string) => `inbox:${m}`;

export async function pushNotice(n: Notice) {
  const kv = store(); const list = JSON.parse((await kv.get(inboxKey(n.member))) ?? "[]") as Notice[];
  if (list.some((x) => x.id === n.id)) return;
  await kv.set(inboxKey(n.member), JSON.stringify([n, ...list].slice(0, 20)));
}
export async function inbox(member: string): Promise<Notice[]> { return JSON.parse((await store().get(inboxKey(member))) ?? "[]"); }

export async function deliver(c: DeliverCtx) {
  const kv = store(); const t = tatum(); const now = c.now ?? Date.now();
  const circle = (await t.getCircle(c.circleId)).json as { cycle: string; cycle_start_ms: string; round_ms: string; members: string[]; order: string[]; paid_out: boolean[] };
  const cycle = Number(circle.cycle), start = Number(circle.cycle_start_ms), rms = Number(circle.round_ms);
  if (!cycle || !start) return { sent: 0, turns: 0, skipped: "no active cycle" };
  const round = Math.min(Math.floor((now - start) / rms), circle.members.length - 1);
  const [contribs, payouts] = await Promise.all([t.queryEvents(`${c.pkg}::circle::Contributed`, c.startCheckpoint), t.queryEvents(`${c.pkg}::circle::PaidOut`, c.startCheckpoint)]);
  const paid = new Set(contribs.filter((e) => e.json.circle === c.circleId && Number(e.json.cycle) === cycle && Number(e.json.round) === round).map((e) => e.json.member));
  let sent = 0, turns = 0;
  const day = new Date(now).toISOString().slice(0, 10), hhmm = new Date(now).toISOString().slice(11, 16);

  // named exception: "your turn landed" always gets through
  for (const e of payouts.filter((x) => x.json.circle === c.circleId)) {
    const key = `turn:${e.json.cycle}:${e.json.round}`;
    if (await kv.get(key)) continue;
    await kv.set(key, "1");
    await pushNotice({ id: key, member: e.json.to, kind: "turn", at: e.timestampMs, text: noticeText("turn", Number(e.json.round)), cited: [], cycle: Number(e.json.cycle), round: Number(e.json.round) });
    turns++;
  }

  // reminders for members who have not paid this round
  const planKey = `plan:${cycle}:${round}`; let plan = JSON.parse((await kv.get(planKey)) ?? "null") as ReturnType<typeof buildPlan> | null;
  if (!plan || now - ((plan as unknown as { at: number }).at ?? 0) > 5 * 60_000) {
    const open = start + round * rms;
    const memories = await c.readMemories();
    // an empty read means the relayer throttled us, not that the circle has no memory: never plan or send from it
    if (memories.length === 0) return { sent, turns, skipped: "memory read returned nothing, will retry next tick" };
    plan = buildPlan({ members: circle.members, roundOpenMs: open, roundDeadlineMs: open + rms, memories });
    (plan as unknown as { at: number }).at = now; await kv.set(planKey, JSON.stringify(plan));
  }
  const sentKeys = new Set<string>();
  for (const m of circle.members) for (let n = 0; n < 3; n++) { const k = `rem:${cycle}:${round}:${m}:${n}`; if (await kv.get(k)) sentKeys.add(k); }
  const due = selectDue({ now, cycle, round, plan: plan.reminders.on, paid, sentKeys });
  for (const d of due) {
    await kv.set(d.key, "sending");
    const line = formatLine({ type: "reminder", date: day, attrs: { cycle: String(cycle), round: String(round), member: d.member, n: String(d.n), sent: hhmm }, text: `Reminder ${d.n + 1} for round ${round + 1} sent in the app: ${d.reason}` });
    const r = await c.remember(line, "keeper", d.key);
    await kv.set(d.key, r.blob_id);
    await pushNotice({ id: d.key, member: d.member, kind: "reminder", at: now, text: noticeText("reminder", round, d.reason), cited: d.cited, cycle, round });
    sent++;
  }
  return { sent, turns };
}
