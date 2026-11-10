// Server-side keeper run, used by the cron route. Same tick as scripts/keeper.ts.
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { tick } from "./tick";
import { keeperMemory } from "@/lib/memory/client";
import { buildPayoutTx } from "@/lib/sui/ptb";
import { tatum } from "@/lib/tatum/sui";
import { CIRCLE_ID, MEMORY_ACCOUNT_ID, START_CHECKPOINT } from "@/lib/facts/stats";
import { ERANOS_PKG } from "@/lib/config";

export async function runKeeper() {
  const keeper = Ed25519Keypair.fromSecretKey(process.env.KEEPER_SUI_KEY!);
  const mems: Record<string, ReturnType<typeof keeperMemory>> = {};
  const mem = (ns: string) => (mems[ns] ??= keeperMemory(MEMORY_ACCOUNT_ID, ns));
  const t = tatum();
  return tick({
    circleId: CIRCLE_ID, pkg: ERANOS_PKG, startCheckpoint: START_CHECKPOINT, sabotage: process.env.ERANOS_SABOTAGE || undefined,
    remember: async (text, ns, key) => (await mem(ns).rememberAndWait(text, { namespace: ns, idempotencyKey: key } as never)) as { blob_id: string },
    payout: async (round) => {
      const tx = buildPayoutTx({ eranosPkg: ERANOS_PKG, sender: keeper.toSuiAddress(), circleId: CIRCLE_ID, round });
      const bytes = await tx.build({ client: t.client });
      const res = await t.execute(bytes, [(await keeper.signTransaction(bytes)).signature]);
      const r = res.$kind === "Transaction" ? res.Transaction : res.FailedTransaction;
      if (res.$kind !== "Transaction" || !r.status.success) throw new Error("payout failed");
      return { digest: r.digest };
    },
  });
}
