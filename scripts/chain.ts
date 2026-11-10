// Script helpers: load keys, execute as a single signer or as the steward multisig, append evidence.
import "./env";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import type { Transaction } from "@mysten/sui/transactions";
import { tatum } from "@/lib/tatum/sui";
import { combine, stewardAddress, txDigest } from "@/lib/sui/multisig";

export const T = tatum();
export const kp = (k: string) => Ed25519Keypair.fromSecretKey(process.env[k]!);
export const keeper = kp("KEEPER_SUI_KEY");
export const stewardKeys = [1, 2, 3].map((i) => kp(`STEWARD_${i}_KEY`));
export const members = [1, 2, 3, 4, 5].map((i) => kp(`MEMBER_${i}_KEY`));
export const PUBKEYS = process.env.STEWARD_PUBKEYS!.split(",");
export const STEWARDS = stewardAddress(PUBKEYS);
if (STEWARDS !== process.env.STEWARD_MULTISIG_ADDRESS) throw new Error("multisig address mismatch");

export function evidence(label: string, digest: string, extra: Record<string, unknown> = {}) {
  appendFileSync("docs/evidence.jsonl", JSON.stringify({ at: new Date().toISOString(), label, digest, ...extra }) + "\n");
}
export function setEnv(key: string, value: string) {
  const s = readFileSync(".env.local", "utf8");
  const re = new RegExp(`^${key}=.*$`, "m");
  writeFileSync(".env.local", re.test(s) ? s.replace(re, `${key}=${value}`) : s + `\n${key}=${value}\n`, { mode: 0o600 });
  process.env[key] = value;
}

export type Outcome = { digest: string; success: boolean; error?: string; tx: Awaited<ReturnType<typeof T.getTransaction>>["tx"] };
async function finish(res: Awaited<ReturnType<typeof T.execute>>): Promise<Outcome> {
  const r = res.$kind === "Transaction" ? res.Transaction : res.FailedTransaction;
  return { digest: r.digest, success: res.$kind === "Transaction" && r.status.success, error: r.status.success ? undefined : JSON.stringify(r.status.error), tx: r };
}
export async function execSingle(tx: Transaction, signer: Ed25519Keypair, opts: { skipSim?: boolean } = {}): Promise<Outcome> {
  tx.setSenderIfNotSet(signer.toSuiAddress());
  const bytes = await tx.build({ client: T.client });
  if (!opts.skipSim) { const s = await T.simulate(bytes); const r = s.$kind === "Transaction" ? s.Transaction : s.FailedTransaction; if (!r.status.success) throw new Error("simulation failed: " + JSON.stringify(r.status.error)); }
  return finish(await T.execute(bytes, [(await signer.signTransaction(bytes)).signature]));
}
/** Steward multisig: two stewards sign the SAME bytes, partials are verified, then combined. */
export async function execSteward(tx: Transaction, opts: { skipSim?: boolean; signers?: number[] } = {}): Promise<Outcome> {
  tx.setSender(STEWARDS);
  const bytes = await tx.build({ client: T.client });
  if (!opts.skipSim) { const s = await T.simulate(bytes); const r = s.$kind === "Transaction" ? s.Transaction : s.FailedTransaction; if (!r.status.success) throw new Error("simulation failed: " + JSON.stringify(r.status.error)); }
  const idx = opts.signers ?? [0, 1];
  const partials: Record<number, string> = {};
  for (const i of idx) partials[i] = (await stewardKeys[i].signTransaction(bytes)).signature;
  const sig = await combine(bytes, partials, PUBKEYS);
  console.log("  steward digest shown:", txDigest(bytes), "signed by stewards", idx.map((i) => i + 1).join("+"));
  return finish(await T.execute(bytes, [sig]));
}
