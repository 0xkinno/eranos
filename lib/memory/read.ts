// Read the circle's memory as the keeper (server) or a member (browser). Walks several queries and dedupes by blob id.
import type { MemWal } from "@mysten-incubation/memwal";
import { parseStored, type StoredMemory } from "./format";

const QUERIES = ["member paid round outcome verified", "pot payout went to member", "member money available payday fact", "agreement stewards swap", "reminder sent result", "withdrew retract fact"];
export async function readKnown(mem: MemWal, namespace = "known", limit = 50): Promise<StoredMemory[]> {
  const seen = new Map<string, StoredMemory>();
  // The relayer throttles bursts. A read where any query failed is retried for the failed queries, so a throttled moment is never mistaken for an empty circle.
  let todo = QUERIES.slice(); let failed = 0;
  for (let attempt = 0; attempt < 3 && todo.length; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 1500 * attempt));
    const results = await Promise.allSettled(todo.map((q) => mem.recall({ query: q, limit, namespace } as never)));
    const retry: string[] = [];
    results.forEach((r, i) => {
      if (r.status !== "fulfilled") { retry.push(todo[i]); return; }
      for (const hit of r.value.results) { const p = parseStored(hit.blob_id, hit.text); if (p && !seen.has(hit.blob_id)) seen.set(hit.blob_id, p); }
    });
    todo = retry; failed = retry.length;
  }
  if (failed === QUERIES.length) throw new Error("memory read failed: the relayer did not answer any query");
  return [...seen.values()];
}
