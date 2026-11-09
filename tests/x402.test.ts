import { describe, it, expect } from "vitest";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { buildRequirements, settle, b64, MemoryIdem, type Chain, type PaymentPayload, type SimResult } from "@/lib/x402/facilitator";

const PKG = "0x" + "ab".repeat(32), CIRCLE = "0x" + "cd".repeat(32), USDC = "0xdba3::usdc::USDC";
const kp = Ed25519Keypair.fromSecretKey(new Uint8Array(32).fill(11));
const payer = kp.toSuiAddress();
const req = buildRequirements({ eranosPkg: PKG, circle: CIRCLE, round: 2, member: payer, amount: 500000n, asset: USDC });

const goodSim = (): SimResult => ({
  success: true,
  events: [{ eventType: `${PKG}::circle::Contributed`, json: { circle: CIRCLE, cycle: "1", round: "2", member: payer, payer, amount: "500000" } }],
  balanceChanges: [{ coinType: USDC, address: payer, amount: "-500000" }],
});
const mkChain = (sim: SimResult = goodSim(), exec = { digest: "DIGEST1", success: true as boolean, error: undefined as string | undefined }) => {
  const executed: string[] = [];
  const chain: Chain = { simulate: async () => sim, execute: async () => { executed.push("x"); return exec; }, circleState: async () => ({ cycle: 1 }) };
  return { chain, executed };
};
const header = async (accepted = req, tamper = false) => {
  const txBytes = new TextEncoder().encode("tx bytes stand-in");
  const { signature } = await kp.signTransaction(txBytes);
  const pay: PaymentPayload = { x402Version: 2, accepted, payload: { signature: tamper ? "AAAA" : signature, transaction: Buffer.from(txBytes).toString("base64") } };
  return b64.enc(pay);
};
const run = async (h: string | null, c = mkChain(), idem = new MemoryIdem()) => ({ v: await settle({ header: h, expected: req, eranosPkg: PKG, chain: c.chain, idem }), c, idem });

describe("x402 facilitator", () => {
  it("settles a correct payment and returns the digest", async () => {
    const { v, c } = await run(await header());
    expect(v).toEqual({ ok: true, digest: "DIGEST1", payer });
    expect(c.executed.length).toBe(1);
  });
  it("402 when no payment header", async () => { expect(await run(null).then((r) => r.v)).toMatchObject({ ok: false, status: 402 }); });
  it("rejects garbage and wrong version", async () => {
    expect((await run("%%%not-b64json").then((r) => r.v))).toMatchObject({ errorReason: "invalid_payload" });
    expect((await run(b64.enc({ x402Version: 1 })).then((r) => r.v))).toMatchObject({ errorReason: "invalid_x402_version" });
    expect((await run(b64.enc({ x402Version: 2, accepted: req, payload: {} })).then((r) => r.v))).toMatchObject({ errorReason: "invalid_payload" });
  });
  it("requires an exact echo of the requirements", async () => {
    const wrong = { ...req, amount: "1" };
    expect((await run(await header(wrong)).then((r) => r.v))).toMatchObject({ errorReason: "requirements_mismatch" });
  });
  it("rejects a bad signature", async () => {
    expect((await run(await header(req, true)).then((r) => r.v))).toMatchObject({ errorReason: "invalid_signature" });
  });
  it("rejects when simulation fails and never executes", async () => {
    const c = mkChain({ success: false, error: "abort 4", events: [], balanceChanges: [] });
    const r = await run(await header(), c);
    expect(r.v).toMatchObject({ errorReason: "simulation_failed" });
    expect(c.executed.length).toBe(0);
  });
  it("rejects when the Contributed event is for another round, member, or amount", async () => {
    for (const patch of [{ round: "3" }, { member: "0x" + "99".repeat(32) }, { amount: "1" }, { circle: "0x" + "aa".repeat(32) }, { payer: "0x" + "88".repeat(32) }]) {
      const s = goodSim(); s.events[0].json = { ...s.events[0].json!, ...patch };
      expect((await run(await header(), mkChain(s)).then((r) => r.v))).toMatchObject({ errorReason: "event_missing" });
    }
    const none = goodSim(); none.events = [];
    expect((await run(await header(), mkChain(none)).then((r) => r.v))).toMatchObject({ errorReason: "event_missing" });
  });
  it("rejects when payer balance did not drop by exactly the amount", async () => {
    const s = goodSim(); s.balanceChanges[0].amount = "-499999";
    expect((await run(await header(), mkChain(s)).then((r) => r.v))).toMatchObject({ errorReason: "balance_mismatch" });
    const s2 = goodSim(); s2.balanceChanges = [];
    expect((await run(await header(), mkChain(s2)).then((r) => r.v))).toMatchObject({ errorReason: "balance_mismatch" });
  });
  it("is idempotent per (circle, cycle, round, member): second payment is refused without executing", async () => {
    const idem = new MemoryIdem();
    const first = await run(await header(), mkChain(), idem);
    expect(first.v.ok).toBe(true);
    const c2 = mkChain();
    const second = await run(await header(), c2, idem);
    expect(second.v).toMatchObject({ ok: false, status: 409, errorReason: "already_paid" });
    expect(c2.executed.length).toBe(0);
  });
  it("execution failure is reported and the key stays retryable", async () => {
    const c = mkChain(goodSim(), { digest: "", success: false, error: "boom" });
    const r = await run(await header(), c);
    expect(r.v).toMatchObject({ ok: false, status: 500, errorReason: "execution_failed" });
    const retry = await run(await header(), mkChain(), r.idem);
    expect(retry.v.ok).toBe(true);
  });
});
