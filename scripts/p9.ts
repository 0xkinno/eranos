// P9: a model's guess cannot change a decision. Chat text -> scribe -> heard (plan unchanged) -> member signs -> known (plan changes).
import { members, evidence } from "./chain";
import { confirmMessage } from "@/lib/memory/policy";
const BASE = process.argv[2] ?? "http://localhost:3111";
const m = members[3], addr = m.toSuiAddress(), CIRCLE = process.env.DEMO_CIRCLE_ID!;
const plan = async () => (await (await fetch(`${BASE}/api/planner?fresh=1`)).json()) as { order: { on: { member: string; round: number; reason: string }[] } };
const pos = (p: Awaited<ReturnType<typeof plan>>) => p.order.on.find((o) => o.member === addr)!.round;
(async () => {
  const before = await plan();
  console.log("1. order position of member 4 before:", pos(before) + 1);
  const r = await fetch(`${BASE}/api/scribe`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: "Member 4 told the group chat: I need the pot early, in round 1, because the school fee is due.", about: addr }) });
  const sj = await r.json(); console.log("2. scribe:", r.status, JSON.stringify(sj).slice(0, 400));
  const h = sj.heard?.find((x: { text: string }) => /needs_round/.test(x.text));
  if (!h) throw new Error("scribe produced no needs_round candidate; extracted: " + JSON.stringify(sj.extracted));
  const mid = await plan();
  console.log("3. position with the line only in heard:", pos(mid) + 1, pos(mid) === pos(before) ? "(unchanged, as required)" : "(CHANGED: FAIL)");
  const text = h.text.split(" | ")[1];
  const sig = (await m.signPersonalMessage(confirmMessage(CIRCLE, h.id, text))).signature;
  const c = await fetch(`${BASE}/api/heard/confirm`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ heardId: h.id, signature: sig }) });
  const cj = await c.json(); console.log("4. confirm:", c.status, JSON.stringify(cj).slice(0, 300));
  const after = await plan();
  console.log("5. position after the member confirmed:", pos(after) + 1, JSON.stringify(after.order.on.find((o) => o.member === addr)));
  evidence("P9 false-able heard fact: no plan change until the member signs, then order changes", cj.blob_id ?? null, { before: pos(before) + 1, whileHeard: pos(mid) + 1, afterConfirm: pos(after) + 1, heardBlob: h.id });
})().catch((e) => { console.error(String(e?.message ?? e).slice(0, 500)); process.exit(1); });
