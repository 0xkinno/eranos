// Standing-order agent: pays one member's round over x402. Budget rules enforced by the agent itself:
// at most one contribution per round, never more than the contribution amount the circle states, only for its own member.
// Usage: npx tsx scripts/standing-order-agent.ts <memberIndex 1..5> <round> [baseUrl]
import { Transaction } from "@mysten/sui/transactions";
import { T, members, evidence } from "./chain";
import { buildContributeForTx } from "@/lib/sui/ptb";
import { b64, type PaymentPayload, type PaymentRequired } from "@/lib/x402/facilitator";

(async () => {
  const [mi, rd, base = process.env.ERANOS_URL || "http://localhost:3111"] = process.argv.slice(2);
  const m = members[Number(mi) - 1], me = m.toSuiAddress(), round = Number(rd);
  const circleId = process.env.DEMO_CIRCLE_ID!;
  const circle = (await T.getCircle(circleId)).json as { contribution: string };
  const url = `${base}/api/x402/circles/${circleId}/rounds/${round}/members/${me}`;
  const r1 = await fetch(url);
  if (r1.status !== 402) throw new Error(`expected 402, got ${r1.status}: ${await r1.text()}`);
  const pr = b64.dec<PaymentRequired>(r1.headers.get("payment-required")!);
  const req = pr.accepts[0];
  // the agent's own budget rules
  if (BigInt(req.amount) > BigInt(circle.contribution)) throw new Error("refusing: requested amount is above the circle's contribution");
  if (req.extra.member !== me || req.extra.round !== round || req.payTo !== circleId) throw new Error("refusing: requirement is not for my member, this round, this circle");
  const sponsor = (req.extra as unknown as { sponsor: { owner: string; budget: number; gasPayment: { objectId: string; version: string; digest: string }[] } }).sponsor;
  const tx: Transaction = buildContributeForTx({ eranosPkg: process.env.ERANOS_PKG!, sender: me, circleId, round, member: me, amount: BigInt(req.amount) });
  tx.setGasOwner(sponsor.owner); tx.setGasPayment(sponsor.gasPayment); tx.setGasBudget(sponsor.budget);
  const bytes = await tx.build({ client: T.client });
  const { signature } = await m.signTransaction(bytes);
  const pay: PaymentPayload = { x402Version: 2, accepted: req, payload: { signature, transaction: Buffer.from(bytes).toString("base64") } };
  const r2 = await fetch(url, { headers: { "payment-signature": b64.enc(pay) } });
  const body = await r2.json();
  console.log("status", r2.status, JSON.stringify(body));
  if (r2.status === 200) evidence(`x402 agent payment: member ${mi} round ${round}`, body.digest, { via: base, standingOrder: true });
})().catch((e) => { console.error(String(e?.message ?? e).slice(0, 700)); process.exit(1); });
