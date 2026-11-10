import { tatum } from "@/lib/tatum/sui";
import type { Chain, SimResult } from "./facilitator";

export function tatumChain(extraSigner?: (bytes: Uint8Array) => Promise<string[]>): Chain {
  const t = tatum();
  return {
    async simulate(bytes): Promise<SimResult> {
      const s = await t.simulate(bytes);
      const r = s.$kind === "Transaction" ? s.Transaction : s.FailedTransaction;
      return { success: r.status.success, error: r.status.success ? undefined : JSON.stringify(r.status.error), events: ((r.events ?? []) as { eventType: string; json: Record<string, unknown> | null }[]).map((e) => ({ eventType: e.eventType, json: e.json })), balanceChanges: (r.balanceChanges ?? []) as SimResult["balanceChanges"] };
    },
    async execute(bytes, sigs) {
      const all = extraSigner ? [...sigs, ...(await extraSigner(bytes))] : sigs;
      const res = await t.execute(bytes, all);
      const r = res.$kind === "Transaction" ? res.Transaction : res.FailedTransaction;
      return { digest: r.digest, success: res.$kind === "Transaction" && r.status.success, error: r.status.success ? undefined : JSON.stringify(r.status.error) };
    },
    async circleState(id) { const c = await t.getCircle(id); return { cycle: Number((c.json as { cycle: string }).cycle) }; },
  };
}
