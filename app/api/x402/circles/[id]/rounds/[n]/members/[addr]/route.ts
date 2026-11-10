// x402 v2 resource: pay one member's round. The payment is a signed circle::contribute_for transaction.
// Clerk checks, simulates through Tatum, adds the keeper's gas signature (only for a plain contribution), executes.
import { NextRequest, NextResponse } from "next/server";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { buildRequirements, paymentRequired, settle, b64, type IdempotencyStore } from "@/lib/x402/facilitator";
import { tatumChain } from "@/lib/x402/chain";
import { checkSponsorable } from "@/lib/x402/sponsor-check";
import { tatum } from "@/lib/tatum/sui";
import { store } from "@/lib/keeper/store";
import { ERANOS_PKG, USDC } from "@/lib/config";
import { reserveGas, MemoryCapStore } from "@/lib/sui/sponsor";

export const dynamic = "force-dynamic";
const caps = new MemoryCapStore();
const idem: IdempotencyStore = {
  async claim(k, v) { const kv = store(); const e = await kv.get(k); if (e) return e; await kv.set(k, v); return null; },
  async set(k, v) { await store().set(k, v); },
};

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string; n: string; addr: string }> }) {
  const { id, n, addr } = await ctx.params;
  const round = Number(n);
  if (!Number.isInteger(round) || round < 0) return NextResponse.json({ error: "bad round" }, { status: 400 });
  const t = tatum();
  const circle = (await t.getCircle(id).catch(() => null))?.json as { contribution: string; members: string[]; cycle: string } | null;
  if (!circle) return NextResponse.json({ error: "circle not found" }, { status: 404 });
  if (!circle.members.includes(addr)) return NextResponse.json({ error: "not a member of this circle" }, { status: 404 });
  const keeper = Ed25519Keypair.fromSecretKey(process.env.KEEPER_SUI_KEY!);
  const resource = req.nextUrl.href;
  const expected = buildRequirements({ eranosPkg: ERANOS_PKG, circle: id, round, member: addr, amount: BigInt(circle.contribution), asset: USDC });

  const header = req.headers.get("payment-signature");
  if (!header) {
    // gas coin for the sponsored transaction: any keeper SUI coin except the largest (kept for the keeper's own transactions)
    const coins = (await t.client.core.listCoins({ owner: keeper.toSuiAddress(), coinType: "0x2::sui::SUI" })).objects.sort((a, b) => Number(BigInt(b.balance) - BigInt(a.balance)));
    const pool = coins.slice(1);
    const pick = pool[Math.floor(Math.random() * pool.length)];
    const body = paymentRequired(resource, expected);
    (body.accepts[0].extra as Record<string, unknown>).sponsor = pick ? { owner: keeper.toSuiAddress(), budget: 20_000_000, gasPayment: [{ objectId: pick.objectId, version: pick.version, digest: pick.digest }] } : null;
    // the echo check compares `accepted` with what we issue, so the same sponsor block must be echoed. Store it on the requirement we verify against.
    return NextResponse.json(body, { status: 402, headers: { "PAYMENT-REQUIRED": b64.enc(body) } });
  }

  // Rebuild the expected requirements from what the client echoed for the sponsor block only (the rest must match exactly).
  let echoed: { accepted?: { extra?: { sponsor?: unknown } } } = {};
  try { echoed = b64.dec(header); } catch { /* settle reports invalid_payload */ }
  const expectedWithSponsor = { ...expected, extra: { ...expected.extra, sponsor: echoed.accepted?.extra?.sponsor ?? null } };
  const chain = tatumChain(async (bytes) => {
    const chk = checkSponsorable(bytes, { keeper: keeper.toSuiAddress(), target: expected.extra.moveCall, maxBudget: 20_000_000n });
    if (!chk.ok) throw new Error(`sponsorship refused: ${chk.why}`);
    await reserveGas(caps, { circle: id, cycle: Number(circle.cycle), round, member: addr, budgetMist: 20_000_000, capMist: Number(process.env.SPONSOR_CAP_PER_MEMBER_PER_ROUND_MIST ?? 20_000_000) });
    return [(await keeper.signTransaction(bytes)).signature];
  });
  const v = await settle({ header, expected: expectedWithSponsor as never, eranosPkg: ERANOS_PKG, chain, idem });
  if (!v.ok) return NextResponse.json({ x402Version: 2, errorReason: v.errorReason, detail: v.detail }, { status: v.status, headers: v.status === 402 ? { "PAYMENT-REQUIRED": b64.enc(paymentRequired(resource, expected)) } : {} });
  return NextResponse.json({ paid: true, digest: v.digest }, { status: 200, headers: { "PAYMENT-RESPONSE": b64.enc({ success: true, transaction: v.digest, network: "sui:mainnet", payer: v.payer }) } });
}
