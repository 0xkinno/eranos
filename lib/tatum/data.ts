// Tatum Data API: exchange rates for local-currency display, and address screening for admission.
export const CURRENCIES = ["USD", "MXN", "NGN", "GHS", "GBP", "INR"] as const;
export type Currency = (typeof CURRENCIES)[number];
type F = typeof fetch;
const BASE = "https://api.tatum.io";

export async function usdcRate(base: Currency, p: { apiKey?: string; fetchImpl?: F } = {}): Promise<{ value: number; source: string; timestamp: number }> {
  const f = p.fetchImpl ?? ((...a: Parameters<F>) => fetch(...a));
  const res = await f(`${BASE}/v4/data/rate/symbol?symbol=USDC&basePair=${base}`, { headers: { "x-api-key": p.apiKey ?? process.env.TATUM_API_KEY ?? "" } });
  if (!res.ok) throw new Error(`Tatum rate ${base}: HTTP ${res.status}`);
  const j = (await res.json()) as { value: string; source: string; timestamp: number };
  const value = Number(j.value);
  if (!Number.isFinite(value) || value <= 0) throw new Error("Tatum rate: bad value");
  return { value, source: j.source, timestamp: j.timestamp };
}

/** USDC base units (6 dp, integers only) to a display amount in a local currency. Display only, never used for money. */
export const toLocal = (baseUnits: bigint, rate: number) => (Number(baseUnits) / 1e6) * rate;

export type Screening = { status: "clear" | "flagged" | "unknown"; raw?: unknown; note: string };
/** Tatum malicious-address check. It accepts 32-byte Sui addresses and answers "valid". Whether Tatum's sources cover Sui is unproven, so "clear" means "not listed", not "verified safe". */
export async function screenAddress(address: string, p: { apiKey?: string; fetchImpl?: F } = {}): Promise<Screening> {
  const f = p.fetchImpl ?? ((...a: Parameters<F>) => fetch(...a));
  const res = await f(`${BASE}/v3/security/address/${address}`, { headers: { "x-api-key": p.apiKey ?? process.env.TATUM_API_KEY ?? "" } });
  const raw = await res.json().catch(() => null) as { status?: string } | null;
  if (!res.ok) return { status: "unknown", raw, note: `screening unavailable (HTTP ${res.status})` };
  if (raw?.status === "valid") return { status: "clear", raw, note: "not listed in Tatum's malicious-address sources" };
  return { status: "flagged", raw, note: `Tatum status: ${raw?.status ?? "unrecognised"}` };
}
