// P11: the memory survives the app. A fresh process with no database and no Redis: only MEMBER_KEY_HEX and ACCOUNT_ID.
// It recalls the circle's memory and reproduces the planner's reminder schedule and next-cycle order.
// Usage: MEMBER_KEY_HEX=... ACCOUNT_ID=0x... npx tsx scripts/portable.ts
import { MemWal } from "@mysten-incubation/memwal";
import { readKnown } from "@/lib/memory/read";
import { visibleKnown } from "@/lib/memory/format";
import { buildPlan } from "@/lib/planner/plan";

(async () => {
  const key = process.env.MEMBER_KEY_HEX, account = process.env.ACCOUNT_ID;
  if (!key || !account) throw new Error("set MEMBER_KEY_HEX and ACCOUNT_ID");
  const mem = MemWal.create({ key, accountId: account, serverUrl: process.env.MEMWAL_SERVER_URL ?? "https://relayer.memory.walrus.xyz", namespace: "known" });
  const all = visibleKnown(await readKnown(mem));
  const members = [...new Set(all.map((m) => m.attrs.about ?? m.attrs.member).filter(Boolean))] as string[];
  console.log(`recalled ${all.length} lines, ${members.length} members found in memory`);
  for (const m of all.filter((x) => x.type === "agreement" || x.type === "payout")) console.log(" ", `[${m.type}]`, m.text);
  const open = Date.now();
  const plan = buildPlan({ members, roundOpenMs: open, roundDeadlineMs: open + 20 * 60_000, memories: all });
  for (const p of plan.reminders.on) console.log(p.member.slice(0, 10), p.reminders.map((r) => new Date(r.atMs).toISOString().slice(11, 16) + " " + r.reason).join(" | "));
  console.log("next order:", plan.order.on.map((o) => `${o.round + 1}:${o.member.slice(0, 8)}`).join(" "));
})().catch((e) => { console.error(String(e?.message ?? e).slice(0, 500)); process.exit(1); });
