import { describe, it, expect } from "vitest";
import { TatumSui } from "@/lib/tatum/sui";

const ok = (data: unknown) => new Response(JSON.stringify({ data }), { status: 200, headers: { "content-type": "application/json" } });
const mk = (handler: (url: string, init: RequestInit) => Response | Promise<Response>, extra = {}) => {
  const calls: { url: string; key: string | null }[] = [];
  let t = 1_000_000;
  const t1 = new TatumSui({
    apiKey: "k", url: "https://tatum.test/graphql", fallbackUrl: "https://public.test/graphql", maxPerSecond: 1000,
    now: () => t, sleep: async (ms) => { t += ms; },
    fetchImpl: (async (u: string, init: RequestInit) => { calls.push({ url: u, key: new Headers(init.headers).get("x-api-key") }); return handler(u, init); }) as typeof fetch,
    ...extra,
  });
  return { t1, calls, advance: (ms: number) => { t += ms; } };
};

describe("TatumSui", () => {
  it("sends the api key to Tatum and counts calls by operation", async () => {
    const { t1, calls } = mk(() => ok({ chainIdentifier: "x" }));
    await t1.client.query({ query: "query ChainId { chainIdentifier }" } as never);
    expect(calls[0]).toEqual({ url: "https://tatum.test/graphql", key: "k" });
    expect(t1.status().tatumCalls.ChainId).toBe(1);
    expect(t1.provider).toBe("tatum");
  });
  it("falls back visibly on 402 and never sends the key to the public node", async () => {
    const { t1, calls } = mk((u) => (u.includes("tatum") ? new Response("payment required", { status: 402 }) : ok({ chainIdentifier: "x" })));
    await t1.client.query({ query: "query ChainId { chainIdentifier }" } as never);
    expect(t1.provider).toBe("public-fallback");
    expect(t1.status().fallbackReason).toMatch(/402/);
    expect(calls.at(-1)).toEqual({ url: "https://public.test/graphql", key: null });
    expect(t1.status().fallbackCalls).toBe(1);
  });
  it("retries Tatum after the cool-off", async () => {
    let tatumDown = true;
    const { t1, calls, advance } = mk((u) => (u.includes("tatum") && tatumDown ? new Response("", { status: 402 }) : ok({ chainIdentifier: "x" })));
    await t1.client.query({ query: "query A { chainIdentifier }" } as never);
    expect(t1.provider).toBe("public-fallback");
    tatumDown = false; advance(10 * 60_000 + 1);
    await t1.client.query({ query: "query A { chainIdentifier }" } as never);
    expect(t1.provider).toBe("tatum");
    expect(calls.at(-1)!.url).toContain("tatum");
  });
  it("backs off on 429 then succeeds", async () => {
    let n = 0;
    const { t1 } = mk(() => (n++ < 2 ? new Response("", { status: 429 }) : ok({ chainIdentifier: "x" })));
    await t1.client.query({ query: "query A { chainIdentifier }" } as never);
    expect(n).toBe(3);
    expect(t1.provider).toBe("tatum");
  });
  it("throttles to the configured rate", async () => {
    let t = 0; const slept: number[] = [];
    const t1 = new TatumSui({ apiKey: "k", url: "https://tatum.test/g", maxPerSecond: 2, now: () => t, sleep: async (ms) => { slept.push(ms); t += ms; }, fetchImpl: (async () => ok({ chainIdentifier: "x" })) as typeof fetch });
    for (let i = 0; i < 3; i++) await t1.client.query({ query: "query A { chainIdentifier }" } as never);
    expect(slept.filter((x) => x > 0).length).toBeGreaterThanOrEqual(2);
  });
});
