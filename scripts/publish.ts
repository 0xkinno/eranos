// Publish move/eranos to mainnet. Dry run (simulation through Tatum, needs the keeper to hold SUI for gas selection) by default.
// Real publish: npx tsx scripts/publish.ts --execute   (spends keeper SUI; ask Kinnoski first)
import "./env";
import { readFileSync } from "node:fs";
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { tatum } from "@/lib/tatum/sui";
import { MEMWAL_PKG } from "@/lib/config";

(async () => {
  const execute = process.argv.includes("--execute");
  const keeper = Ed25519Keypair.fromSecretKey(process.env.KEEPER_SUI_KEY!);
  const t = tatum();
  const mod = readFileSync("move/eranos/build/eranos/bytecode_modules/circle.mv").toString("base64");
  const tx = new Transaction();
  tx.setSender(keeper.toSuiAddress());
  const [cap] = tx.publish({ modules: [mod], dependencies: ["0x1", "0x2", MEMWAL_PKG] });
  tx.transferObjects([cap], keeper.toSuiAddress());
  if (!execute) {
    const bytes = await tx.build({ client: t.client });
    const sim = await t.simulate(bytes);
    const r = sim.$kind === "Transaction" ? sim.Transaction : sim.FailedTransaction;
    console.log("simulate:", r.status.success ? "SUCCESS" : "FAILED", JSON.stringify(r.status).slice(0, 600));
    return;
  }
  const bytes = await tx.build({ client: t.client });
  const { signature } = await keeper.signTransaction(bytes);
  const res = await t.execute(bytes, [signature]);
  const r = res.$kind === "Transaction" ? res.Transaction : res.FailedTransaction;
  console.log("digest", r.digest, "success", r.status.success);
  const pkg = (r.effects?.changedObjects ?? []).find((o) => o.idOperation === "Created" && o.outputOwner?.$kind === "Immutable");
  console.log("package", pkg?.objectId);
})().catch((e) => { console.error(String(e?.message ?? e).slice(0, 800)); process.exit(1); });
