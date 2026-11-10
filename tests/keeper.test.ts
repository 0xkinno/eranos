import { describe, it, expect, vi, beforeEach } from "vitest";

const CIRCLE = "0x" + "cd".repeat(32), PKG = "0x" + "ab".repeat(32), M1 = "0x" + "11".repeat(32);
const USDC = "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC";
const real = { digest: "REAL", timestampMs: 2_000_000, json: { circle: CIRCLE, cycle: "1", round: "0", member: M1, payer: M1, amount: "100000" } };

const fake = {
  queryEvents: vi.fn(async (type: string) => (type.endsWith("Contributed") ? [real] : type.endsWith("CycleStarted") ? [{ digest: "S", timestampMs: 0, json: { circle: CIRCLE, cycle: "1", start_ms: "0" } }] : [])),
  getCircle: vi.fn(async () => ({ json: { round_ms: "1000000", members: [M1] } })),
  getTransaction: vi.fn(async (d: string) => d === "REAL"
    ? { ok: true, tx: { timestampMs: 2_000_000, events: [{ eventType: `${PKG}::circle::Contributed`, json: real.json }], balanceChanges: [{ address: M1, coinType: USDC, amount: "-100000" }] } }
    : { ok: false, tx: {} }),
};
vi.mock("@/lib/tatum/sui", () => ({ tatum: () => fake }));
import { tick } from "@/lib/keeper/tick";

const mk = (extra = {}) => {
  const written: string[] = [];
  return { written, ctx: { circleId: CIRCLE, pkg: PKG, startCheckpoint: 1, remember: async (t: string, ns: string, k: string) => { written.push(`${ns}|${k}|${t}`); return { blob_id: "B" + written.length }; }, ...extra } };
};
beforeEach(() => { process.env.KV_REST_API_URL = ""; });

describe("keeper tick", () => {
  it("writes a verified outcome with late hours computed from chain time", async () => {
    const { ctx, written } = mk();
    const r = await tick({ ...ctx, circleId: CIRCLE });
    expect(r.verified).toBe(1);
    expect(written[0]).toContain("[outcome]");
    expect(written[0]).toContain("late_h:");
    expect(written[0]).toContain("tx:REAL");
  });
  it("sabotage: a claimed payment Tatum cannot find is refused and nothing is written (P10)", async () => {
    const { ctx, written } = mk();
    const r = await tick({ ...ctx, circleId: CIRCLE, sabotage: "keeper-claims-unpaid" });
    expect(r.refused.length).toBe(1);
    expect(r.refused[0].why).toMatch(/not found|failed/);
    expect(written.filter((w) => w.includes("0xeeee"))).toEqual([]);
  });
});

import { withRateLimitRetry, isRateLimit, retryAfterMs } from "@/lib/memory/retry";
describe("relayer rate limit", () => {
  const limit = new Error('Walrus Memory server error (429): {"error":"Rate limit exceeded","limit":"180 weighted-requests/min","retry_after_seconds":60}');
  it("recognises a 429 and reads the wait, capped", () => { expect(isRateLimit(limit)).toBe(true); expect(retryAfterMs(limit)).toBe(45_000); expect(isRateLimit(new Error("boom"))).toBe(false); });
  it("waits and retries a limit, then succeeds", async () => {
    let n = 0; const waits: number[] = [];
    const r = await withRateLimitRetry(async () => { if (n++ < 2) throw limit; return "ok"; }, { sleep: async (ms) => { waits.push(ms); } });
    expect(r).toBe("ok"); expect(waits.length).toBe(2);
  });
  it("rethrows other errors at once and a limit that never lifts", async () => {
    await expect(withRateLimitRetry(async () => { throw new Error("boom"); }, { sleep: async () => {} })).rejects.toThrow("boom");
    await expect(withRateLimitRetry(async () => { throw limit; }, { sleep: async () => {} })).rejects.toThrow("429");
  });
  it("defers a limited write instead of failing the tick", async () => {
    const { ctx } = mk({ remember: async () => { throw limit; } });
    real.json.round = "7"; // a fresh key, so earlier tests' idempotence records do not skip it
    const r = await tick({ ...ctx, circleId: CIRCLE });
    expect(r.deferred?.length).toBeGreaterThan(0); expect(r.written.length).toBe(0);
  });
});
