// Writes docs/FACTS.json from live reads. Numbers in the README and on the site come from here.
import "./env";
import { writeFileSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { keeperMemory } from "@/lib/memory/client";
import { tatum } from "@/lib/tatum/sui";
import { usdcRate } from "@/lib/tatum/data";

(async () => {
  const acct = process.env.DEMO_MEMORY_ACCOUNT_ID!, pkg = process.env.ERANOS_PKG!;
  const mem = keeperMemory(acct, "known");
  const byNs: Record<string, number> = {}; let cursor: string | undefined; let total = 0;
  for (let i = 0; i < 20; i++) {
    const r = await mem.listMemories({ cursor, limit: 100 });
    for (const m of r.memories) { byNs[(m as { namespace_id?: string }).namespace_id ?? "unknown"] = (byNs[(m as { namespace_id?: string }).namespace_id ?? "unknown"] ?? 0) + 1; total++; }
    if (!r.has_more) break; cursor = r.next_cursor ?? undefined;
  }
  const t = tatum();
  const [contribs, payouts] = await Promise.all([t.queryEvents(`${pkg}::circle::Contributed`, 343633600), t.queryEvents(`${pkg}::circle::PaidOut`, 343633600)]);
  const ev = readFileSync("docs/evidence.jsonl", "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const sum = (re: RegExp) => ev.filter((e) => re.test(e.label)).length;
  const sui = await usdcRate("USD").catch(() => null);
  let vitest = 0, moveTests = 0;
  try { vitest = Number(/Tests\s+(\d+) passed/.exec(execSync("npx vitest run 2>&1", { encoding: "utf8" }))?.[1] ?? 0); } catch { /* keep 0 */ }
  try { moveTests = Number(/Total tests: (\d+)/.exec(execSync("cd move/eranos && /home/user/tools/sui/sui move test 2>&1", { encoding: "utf8" }))?.[1] ?? 0); } catch { /* keep 0 */ }
  const gas = ev.filter((e) => e.gas).map((e) => Number(e.gas.computationCost) + Number(e.gas.storageCost) - Number(e.gas.storageRebate));
  const facts = {
    generatedAt: new Date().toISOString(),
    package: pkg,
    circle: { id: process.env.DEMO_CIRCLE_ID, members: (((await t.getCircle(process.env.DEMO_CIRCLE_ID!)).json as { members: string[] }).members).length, contributionUsdc: Number(((await t.getCircle(process.env.DEMO_CIRCLE_ID!)).json as { contribution: string }).contribution) / 1e6 },
    memories: { total, byNamespace: byNs },
    chain: { contributions: contribs.length, payouts: payouts.length, joinTransactions: sum(/^join member/), x402Payments: sum(/^x402 agent payment/), sponsoredContributions: sum(/pays round/) },
    tests: { vitest, move: moveTests },
    p8: (() => { try { const j = JSON.parse(readFileSync("docs/p8.json", "utf8")); return { changedReminderCount: j.changedReminderCount, changedOrderCount: j.changedOrderCount, falseEarlyOff: j.syntheticReplay.memoryOff.falseEarly, falseEarlyOn: j.syntheticReplay.memoryOn.falseEarly, wastedOff: j.syntheticReplay.memoryOff.wasted, wastedOn: j.syntheticReplay.memoryOn.wasted }; } catch { return null; } })(),
    tatumCalls: t.status().tatumCalls,
    gas: { sampleCount: gas.length, avgMist: gas.length ? Math.round(gas.reduce((a, b) => a + b, 0) / gas.length) : null },
    usdcUsd: sui?.value ?? null,
  };
  writeFileSync("docs/FACTS.json", JSON.stringify(facts, null, 2) + "\n");
  console.log(JSON.stringify(facts));
})().catch((e) => { console.error(String(e?.message ?? e).slice(0, 500)); process.exit(1); });
