// Browser x402 payment: the member's own wallet signs a circle::contribute_for transaction, the server verifies, simulates through Tatum,
// adds the gas sponsor signature for a plain contribution only, and executes.
import type { Transaction } from "@mysten/sui/transactions";
import { buildContributeForTx } from "@/lib/sui/ptb";
import { b64, type PaymentPayload, type PaymentRequired } from "@/lib/x402/facilitator";

export interface Signer { address: string; signTransaction: (tx: Transaction) => Promise<{ bytes: string; signature: string }> }

export async function payRoundX402(p: { circleId: string; round: number; eranosPkg: string; signer: Signer }) {
  const url = `/api/x402/circles/${p.circleId}/rounds/${p.round}/members/${p.signer.address}`;
  const r1 = await fetch(url);
  if (r1.status !== 402) { const j = await r1.json().catch(() => ({})); throw new Error(j.error ?? `unexpected ${r1.status}`); }
  const pr = JSON.parse(atob(r1.headers.get("payment-required")!)) as PaymentRequired;
  const req = pr.accepts[0];
  const sponsor = (req.extra as unknown as { sponsor: { owner: string; budget: number; gasPayment: { objectId: string; version: string; digest: string }[] } | null }).sponsor;
  if (!sponsor) throw new Error("No sponsor gas coin is available right now. Try again in a moment.");
  const tx = buildContributeForTx({ eranosPkg: p.eranosPkg, sender: p.signer.address, circleId: p.circleId, round: p.round, member: p.signer.address, amount: BigInt(req.amount) });
  tx.setGasOwner(sponsor.owner); tx.setGasPayment(sponsor.gasPayment); tx.setGasBudget(sponsor.budget);
  const { bytes, signature } = await p.signer.signTransaction(tx);
  const pay: PaymentPayload = { x402Version: 2, accepted: req, payload: { signature, transaction: bytes } };
  const r2 = await fetch(url, { headers: { "payment-signature": b64.enc(pay) } });
  const body = await r2.json();
  if (r2.status !== 200) throw new Error(`${body.errorReason ?? "payment_failed"}: ${body.detail ?? ""}`.slice(0, 220));
  return body as { paid: true; digest: string };
}
