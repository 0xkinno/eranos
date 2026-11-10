// Small in-memory per-key limiter. It bounds abuse of write routes on one instance; it is not a global quota.
const hits = new Map<string, number[]>();
export function limited(key: string, max: number, windowMs = 60_000): boolean {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  arr.push(now); hits.set(key, arr);
  return arr.length > max;
}
export const clientIp = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
