// x402 v2 "exact" scheme on Sui. The payment IS the contract call: the signed PTB calls circle::contribute_for,
// so the money lands in the pot under the contract's rules, not in an address Eranos controls.
import { verifyTransactionSignature } from "@mysten/sui/verify";
import { normalizeSuiAddress } from "@mysten/sui/utils";

export type ErrorReason =
  | "invalid_x402_version" | "invalid_payload" | "requirements_mismatch" | "invalid_signature"
  | "simulation_failed" | "event_missing" | "balance_mismatch" | "already_paid" | "execution_failed";

export interface Requirements {
  scheme: "exact"; network: "sui:mainnet"; asset: string; amount: string; payTo: string; maxTimeoutSeconds: number;
  extra: { moveCall: string; circle: string; round: number; member: string };
}
export interface PaymentRequired { x402Version: 2; resource: string; accepts: Requirements[]; error?: string }
export interface PaymentPayload { x402Version: 2; accepted: Requirements; payload: { signature: string; transaction: string } }

export const b64 = {
  enc: (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64"),
  dec: <T>(s: string): T => JSON.parse(Buffer.from(s, "base64").toString("utf8")) as T,
};

export function buildRequirements(p: { eranosPkg: string; circle: string; round: number; member: string; amount: bigint; asset: string }): Requirements {
  return {
    scheme: "exact", network: "sui:mainnet", asset: p.asset, amount: p.amount.toString(), payTo: p.circle, maxTimeoutSeconds: 120,
    extra: { moveCall: `${p.eranosPkg}::circle::contribute_for`, circle: p.circle, round: p.round, member: p.member },
  };
}
export const paymentRequired = (resource: string, req: Requirements, error?: string): PaymentRequired => ({ x402Version: 2, resource, accepts: [req], ...(error ? { error } : {}) });

export interface SimEvent { eventType: string; json: Record<string, unknown> | null }
export interface SimResult { success: boolean; error?: string; events: SimEvent[]; balanceChanges: { coinType: string; address: string; amount: string }[] }
export interface Chain {
  simulate(bytes: Uint8Array): Promise<SimResult>;
  execute(bytes: Uint8Array, signatures: string[]): Promise<{ digest: string; success: boolean; error?: string }>;
  circleState(id: string): Promise<{ cycle: number }>;
}
export interface IdempotencyStore { claim(key: string, value: string): Promise<string | null>; set(key: string, value: string): Promise<void> }
export class MemoryIdem implements IdempotencyStore {
  m = new Map<string, string>();
  async claim(k: string, v: string) { const e = this.m.get(k); if (e !== undefined) return e; this.m.set(k, v); return null; }
  async set(k: string, v: string) { this.m.set(k, v); }
}

export type Verdict =
  | { ok: true; digest: string; payer: string }
  | { ok: false; status: 400 | 402 | 409 | 500; errorReason: ErrorReason; detail?: string };

const fail = (status: 400 | 402 | 409 | 500, errorReason: ErrorReason, detail?: string): Verdict => ({ ok: false, status, errorReason, detail });
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const eqAddr = (a: unknown, b: unknown) => typeof a === "string" && typeof b === "string" && normalizeSuiAddress(a) === normalizeSuiAddress(b);

export async function settle(p: {
  header: string | null; expected: Requirements; eranosPkg: string; chain: Chain; idem: IdempotencyStore;
}): Promise<Verdict> {
  if (!p.header) return fail(402, "invalid_payload", "missing PAYMENT-SIGNATURE");
  let pay: PaymentPayload;
  try { pay = b64.dec<PaymentPayload>(p.header); } catch { return fail(400, "invalid_payload", "header is not base64 JSON"); }
  if (pay?.x402Version !== 2) return fail(400, "invalid_x402_version");
  if (typeof pay.payload?.signature !== "string" || typeof pay.payload?.transaction !== "string") return fail(400, "invalid_payload");
  if (!same(pay.accepted, p.expected)) return fail(400, "requirements_mismatch", "accepted must echo the issued requirements exactly");

  let bytes: Uint8Array;
  try { bytes = Uint8Array.from(Buffer.from(pay.payload.transaction, "base64")); } catch { return fail(400, "invalid_payload"); }
  let payer: string;
  try { payer = (await verifyTransactionSignature(bytes, pay.payload.signature)).toSuiAddress(); } catch { return fail(400, "invalid_signature"); }

  const sim = await p.chain.simulate(bytes).catch((e: Error) => ({ success: false, error: e.message, events: [], balanceChanges: [] }) as SimResult);
  if (!sim.success) return fail(400, "simulation_failed", sim.error);
  const x = p.expected.extra;
  const ev = sim.events.find((e) => e.eventType === `${p.eranosPkg}::circle::Contributed` || e.eventType.endsWith("::circle::Contributed"));
  const j = ev?.json;
  if (!ev || !j || !eqAddr(j.circle, x.circle) || Number(j.round) !== x.round || !eqAddr(j.member, x.member) || String(j.amount) !== p.expected.amount || !eqAddr(j.payer, payer))
    return fail(400, "event_missing", "simulation did not show the expected Contributed event");
  const spent = sim.balanceChanges.find((b) => eqAddr(b.address, payer) && b.coinType.replace(/^0x0*/, "") === p.expected.asset.replace(/^0x0*/, ""));
  if (!spent || BigInt(spent.amount) !== -BigInt(p.expected.amount)) return fail(400, "balance_mismatch", "payer USDC did not drop by exactly the amount");

  const cycle = Number(j.cycle);
  const ikey = `x402:${x.circle}:${cycle}:${x.round}:${normalizeSuiAddress(x.member)}`;
  let prior = await p.idem.claim(ikey, "pending");
  if (prior?.startsWith("failed")) { await p.idem.set(ikey, "pending"); prior = null; }
  if (prior !== null && !prior.startsWith("failed")) return fail(409, "already_paid", prior === "pending" ? "a payment for this member and round is in flight" : `already settled: ${prior}`);

  const exec = await p.chain.execute(bytes, [pay.payload.signature]).catch((e: Error) => ({ digest: "", success: false, error: e.message }));
  if (!exec.success) { await p.idem.set(ikey, "failed:retryable").catch(() => {}); return fail(500, "execution_failed", exec.error); }
  await p.idem.set(ikey, exec.digest);
  return { ok: true, digest: exec.digest, payer };
}
