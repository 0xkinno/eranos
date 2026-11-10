import "./env";
import { tatum } from "@/lib/tatum/sui";
(async () => {
  const { ok, tx } = await tatum().getTransaction(process.argv[2]);
  console.log("ok", ok, "checkpoint", tx.checkpoint, "gas", JSON.stringify(tx.effects?.gasUsed));
  for (const o of tx.effects?.changedObjects ?? []) console.log(o.idOperation, o.objectId, tx.objectTypes?.[o.objectId] ?? "");
  for (const e of tx.events ?? []) console.log("event", e.eventType, JSON.stringify(e.json).slice(0, 300));
})();
