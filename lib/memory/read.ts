// Read the circle's memory as the keeper (server) or a member (browser). Walks several queries and dedupes by blob id.
import type { MemWal } from "@mysten-incubation/memwal";
import { parseStored, type StoredMemory } from "./format";

const QUERIES = ["member paid round outcome verified", "pot payout went to member", "member money available payday fact", "agreement stewards swap", "reminder sent result", "withdrew retract fact"];
export async function readKnown(mem: MemWal, namespace = "known", limit = 50): Promise<StoredMemory[]> {
  const seen = new Map<string, StoredMemory>();
  const results = await Promise.allSettled(QUERIES.map((q) => mem.recall({ query: q, limit, namespace } as never)));
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const hit of r.value.results) { const p = parseStored(hit.blob_id, hit.text); if (p && !seen.has(hit.blob_id)) seen.set(hit.blob_id, p); }
  }
  return [...seen.values()];
}
