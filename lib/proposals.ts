// Steward proposals: the server builds the bytes once, stewards sign those exact bytes, two verified partials combine and execute.
import { randomUUID } from "node:crypto";
import { store } from "@/lib/keeper/store";
import { tatum } from "@/lib/tatum/sui";
import { combine, stewardAddress, txDigest, verifyPartial } from "@/lib/sui/multisig";
import { buildJoinTx, buildLeaveTx, buildStartCycleTx } from "@/lib/sui/ptb";
import { ERANOS_PKG } from "@/lib/config";
import { CIRCLE_ID, MEMORY_ACCOUNT_ID } from "@/lib/facts/stats";

export interface Proposal { id: string; kind: "admit" | "remove" | "start"; summary: string; digest: string; bytesB64: string; partials: Record<string, string>; createdAt: number; executed?: { digest: string; ok: boolean }; detail: Record<string, unknown> }
export const pubkeys = () => (process.env.STEWARD_PUBKEYS ?? "").split(",").filter(Boolean);
const idxKey = "proposals:index";

export async function listProposals(): Promise<Proposal[]> {
  const ids = JSON.parse((await store().get(idxKey)) ?? "[]") as string[];
  const out: Proposal[] = [];
  for (const id of ids) { const p = await store().get(`proposal:${id}`); if (p) out.push(JSON.parse(p)); }
  return out.sort((a, b) => b.createdAt - a.createdAt);
}
export async function getProposal(id: string) { const p = await store().get(`proposal:${id}`); return p ? (JSON.parse(p) as Proposal) : null; }
async function save(p: Proposal) {
  await store().set(`proposal:${p.id}`, JSON.stringify(p));
  const ids = JSON.parse((await store().get(idxKey)) ?? "[]") as string[];
  if (!ids.includes(p.id)) await store().set(idxKey, JSON.stringify([...ids, p.id]));
}

export async function createProposal(input: { kind: "admit" | "remove" | "start"; member?: string; memberKeyHex?: string; order?: string[]; why?: string[] }): Promise<Proposal> {
  const stewards = stewardAddress(pubkeys());
  const t = tatum();
  let tx, summary: string;
  if (input.kind === "admit") {
    if (!input.member || !/^[0-9a-f]{64}$/.test(input.memberKeyHex ?? "")) throw new Error("member and a 32-byte memberKeyHex are required");
    tx = buildJoinTx({ eranosPkg: ERANOS_PKG, stewards, circleId: CIRCLE_ID, memoryAccountId: MEMORY_ACCOUNT_ID, member: input.member, memberKey: Uint8Array.from(Buffer.from(input.memberKeyHex!, "hex")), label: `member-${input.member.slice(2, 8)}` });
    summary = `Admit ${input.member.slice(0, 10)}… to the money roll and add their key to the circle's memory, in one transaction.`;
  } else if (input.kind === "remove") {
    if (!input.member || !/^[0-9a-f]{64}$/.test(input.memberKeyHex ?? "")) throw new Error("member and memberKeyHex are required");
    tx = buildLeaveTx({ eranosPkg: ERANOS_PKG, stewards, circleId: CIRCLE_ID, memoryAccountId: MEMORY_ACCOUNT_ID, member: input.member, memberKey: Uint8Array.from(Buffer.from(input.memberKeyHex!, "hex")) });
    summary = `Remove ${input.member.slice(0, 10)}… from the money roll and revoke their memory key, in one transaction. Only between cycles.`;
  } else {
    if (!input.order?.length) throw new Error("order is required");
    tx = buildStartCycleTx({ eranosPkg: ERANOS_PKG, stewards, circleId: CIRCLE_ID, order: input.order });
    summary = `Start the next cycle with this order: ${input.order.map((a, i) => `${i + 1}. ${a.slice(0, 8)}…`).join(", ")}.`;
  }
  const bytes = await tx.build({ client: t.client });
  const sim = await t.simulate(bytes);
  const r = sim.$kind === "Transaction" ? sim.Transaction : sim.FailedTransaction;
  if (!r.status.success) throw new Error(`The chain would refuse this: ${JSON.stringify(r.status.error).slice(0, 160)}`);
  const p: Proposal = { id: randomUUID(), kind: input.kind, summary, digest: txDigest(bytes), bytesB64: Buffer.from(bytes).toString("base64"), partials: {}, createdAt: Date.now(), detail: { ...input } };
  await save(p);
  return p;
}

export async function addSignature(id: string, signature: string): Promise<Proposal> {
  const p = await getProposal(id);
  if (!p) throw new Error("proposal not found");
  if (p.executed) throw new Error("proposal already executed");
  const bytes = Uint8Array.from(Buffer.from(p.bytesB64, "base64"));
  const { stewardIndex } = await verifyPartial(bytes, signature, pubkeys());
  p.partials[String(stewardIndex)] = signature;
  if (Object.keys(p.partials).length >= 2) {
    const sig = await combine(bytes, Object.fromEntries(Object.entries(p.partials).map(([k, v]) => [Number(k), v])), pubkeys());
    const res = await tatum().execute(bytes, [sig]);
    const r = res.$kind === "Transaction" ? res.Transaction : res.FailedTransaction;
    p.executed = { digest: r.digest, ok: res.$kind === "Transaction" && r.status.success };
  }
  await save(p);
  return p;
}
