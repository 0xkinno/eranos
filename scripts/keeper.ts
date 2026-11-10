// Run one keeper tick locally: npx tsx scripts/keeper.ts   (ERANOS_SABOTAGE=keeper-claims-unpaid to run the fault switch)
process.env.ERANOS_LOCAL_STATE ??= ".keeper-state.json";
import { keeper, execSingle, evidence } from "./chain";
import { tick } from "@/lib/keeper/tick";
import { keeperMemory } from "@/lib/memory/client";
import { buildPayoutTx } from "@/lib/sui/ptb";

(async () => {
  const acct = process.env.DEMO_MEMORY_ACCOUNT_ID!;
  const mems: Record<string, ReturnType<typeof keeperMemory>> = {};
  const mem = (ns: string) => (mems[ns] ??= keeperMemory(acct, ns));
  const rep = await tick({
    circleId: process.env.DEMO_CIRCLE_ID!, pkg: process.env.ERANOS_PKG!, startCheckpoint: Number(process.env.ERANOS_START_CHECKPOINT ?? 343633600),
    sabotage: process.env.ERANOS_SABOTAGE,
    remember: async (text, ns, key) => mem(ns).rememberAndWait(text, { namespace: ns, idempotencyKey: key } as never) as Promise<{ blob_id: string }>,
    payout: async (round) => { const o = await execSingle(buildPayoutTx({ eranosPkg: process.env.ERANOS_PKG!, sender: keeper.toSuiAddress(), circleId: process.env.DEMO_CIRCLE_ID!, round }), keeper); if (!o.success) throw new Error(o.error); evidence(`keeper payout round ${round}`, o.digest); return { digest: o.digest }; },
  });
  console.log(JSON.stringify(rep, null, 1));
  if (rep.written.length || rep.payouts.length || rep.refused.length) evidence("keeper tick run" + (process.env.ERANOS_SABOTAGE ? ` (sabotage=${process.env.ERANOS_SABOTAGE})` : ""), "tick", { report: rep });
})().catch((e) => { console.error(String(e?.message ?? e).slice(0, 900)); process.exit(1); });
