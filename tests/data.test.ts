import { describe, it, expect } from "vitest";
import { usdcRate, toLocal, screenAddress } from "@/lib/tatum/data";
const json = (o: unknown, status = 200) => (async () => new Response(JSON.stringify(o), { status })) as unknown as typeof fetch;
describe("tatum data", () => {
  it("parses a rate and converts integers only", async () => {
    const r = await usdcRate("MXN", { apiKey: "k", fetchImpl: json({ value: "18.5", source: "CoinGecko", timestamp: 1 }) });
    expect(r.value).toBe(18.5);
    expect(toLocal(500000n, r.value)).toBeCloseTo(9.25);
  });
  it("rejects bad rates and http errors", async () => {
    await expect(usdcRate("MXN", { fetchImpl: json({ value: "0", source: "x", timestamp: 1 }) })).rejects.toThrow();
    await expect(usdcRate("MXN", { fetchImpl: json({}, 402) })).rejects.toThrow(/402/);
  });
  it("screening: valid is clear, other is flagged, errors are unknown", async () => {
    expect((await screenAddress("0x" + "1".repeat(64), { fetchImpl: json({ status: "valid" }) })).status).toBe("clear");
    expect((await screenAddress("0x" + "1".repeat(64), { fetchImpl: json({ status: "malicious" }) })).status).toBe("flagged");
    expect((await screenAddress("0x" + "1".repeat(64), { fetchImpl: json({}, 400) })).status).toBe("unknown");
  });
});
