// Tatum Sui gateway client. Every Sui read and write goes through here.
// Throttle, per-method counters, 429 backoff, and a VISIBLE fallback to the public GraphQL endpoint on 402 / plan limits.
import { SuiGraphQLClient } from "@mysten/sui/graphql";
import type { SuiClientTypes } from "@mysten/sui/client";
import { PUBLIC_FULLNODE, TATUM_GRAPHQL } from "@/lib/config";

export const PUBLIC_GRAPHQL = "https://graphql.mainnet.sui.io/graphql";
export type Provider = "tatum" | "public-fallback";

export interface TatumOpts {
  apiKey?: string;
  url?: string;
  fallbackUrl?: string;
  fetchImpl?: typeof fetch;
  maxPerSecond?: number;
  retryTatumMs?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

const opName = (body: string): string => {
  try {
    const j = JSON.parse(body) as { query?: string; operationName?: string };
    if (j.operationName) return j.operationName;
    const m = /^\s*(?:query|mutation)?\s*(\w+)?\s*[({]\s*(\w+)?/.exec(j.query ?? "");
    return m?.[1] ?? m?.[2] ?? "unknown";
  } catch { return "unknown"; }
};

export class TatumSui {
  readonly client: SuiGraphQLClient;
  provider: Provider = "tatum";
  fallbackReason: string | null = null;
  fallbackSince: number | null = null;
  readonly counts: Record<string, number> = {};
  fallbackCounts = 0;
  private lastCall = 0;
  private cache = new Map<string, { at: number; v: unknown }>();
  private o: Required<Omit<TatumOpts, "apiKey">> & { apiKey?: string };

  constructor(opts: TatumOpts = {}) {
    this.o = {
      apiKey: opts.apiKey ?? process.env.TATUM_API_KEY,
      url: opts.url ?? TATUM_GRAPHQL,
      fallbackUrl: opts.fallbackUrl ?? PUBLIC_GRAPHQL,
      fetchImpl: opts.fetchImpl ?? ((...a) => fetch(...a)),
      maxPerSecond: opts.maxPerSecond ?? 3,
      retryTatumMs: opts.retryTatumMs ?? 10 * 60_000,
      now: opts.now ?? Date.now,
      sleep: opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms))),
    };
    this.client = new SuiGraphQLClient({ url: this.o.url, network: "mainnet", fetch: this.routedFetch });
    // The SDK reads the chain id from checkpoint 0, which the gateway has pruned. The root field is authoritative and cheap.
    let chainId: string | null = null;
    (this.client.core as unknown as { getChainIdentifier: () => Promise<{ chainIdentifier: string }> }).getChainIdentifier = async () => {
      if (!chainId) {
        const r = (await this.client.query({ query: "query ChainId { chainIdentifier }" } as never)) as { data?: { chainIdentifier?: string } };
        chainId = r.data?.chainIdentifier ?? null;
      }
      if (!chainId) throw new Error("chain identifier unavailable");
      return { chainIdentifier: chainId };
    };
  }

  private routedFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const body = typeof init?.body === "string" ? init.body : "";
    const op = opName(body);
    // retry Tatum after the cool-off
    if (this.provider === "public-fallback" && this.fallbackSince !== null && this.o.now() - this.fallbackSince >= this.o.retryTatumMs) {
      this.provider = "tatum"; this.fallbackReason = null; this.fallbackSince = null;
    }
    for (let attempt = 0; attempt < 4; attempt++) {
      const useTatum = this.provider === "tatum";
      await this.throttle(useTatum);
      const headers = new Headers(init?.headers);
      if (useTatum && this.o.apiKey) headers.set("x-api-key", this.o.apiKey);
      const res = await this.o.fetchImpl(useTatum ? this.o.url : this.o.fallbackUrl, { ...init, headers });
      if (useTatum) this.counts[op] = (this.counts[op] ?? 0) + 1; else this.fallbackCounts++;
      if (useTatum && res.status === 402) {
        this.enterFallback(`Tatum answered 402 (plan limit or credits exhausted)`);
        continue;
      }
      if (useTatum && res.status === 429) { await this.o.sleep(500 * 2 ** attempt); continue; }
      if (useTatum && res.ok) {
        const peek = await res.clone().text();
        if (/credit|plan limit|quota/i.test(peek) && /error/i.test(peek) && !/"data":\{/.test(peek)) { this.enterFallback("Tatum reported a plan or credit limit"); continue; }
      }
      return res;
    }
    throw new Error("Tatum request failed after retries");
  };

  private enterFallback(reason: string) {
    this.provider = "public-fallback"; this.fallbackReason = reason; this.fallbackSince = this.o.now();
  }
  private async throttle(useTatum: boolean) {
    if (!useTatum) return;
    const gap = 1000 / this.o.maxPerSecond;
    const wait = this.lastCall + gap - this.o.now();
    this.lastCall = Math.max(this.o.now(), this.lastCall + gap);
    if (wait > 0) await this.o.sleep(wait);
  }
  private async cached<T>(key: string, ttlMs: number, f: () => Promise<T>): Promise<T> {
    const hit = this.cache.get(key);
    if (hit && this.o.now() - hit.at < ttlMs) return hit.v as T;
    const v = await f();
    this.cache.set(key, { at: this.o.now(), v });
    return v;
  }

  status() {
    return { provider: this.provider, fallbackReason: this.fallbackReason, fallbackSince: this.fallbackSince, tatumCalls: { ...this.counts }, tatumCallTotal: Object.values(this.counts).reduce((a, b) => a + b, 0), fallbackCalls: this.fallbackCounts, publicFullnode: PUBLIC_FULLNODE };
  }

  // ---- typed helpers (cache: objects 10 s, events 30 s) ----
  getObject(objectId: string) {
    return this.cached(`obj:${objectId}`, 10_000, async () => (await this.client.core.getObject({ objectId, include: { json: true } })).object);
  }
  async getCircle(id: string) {
    const o = await this.getObject(id);
    return { type: o.type, json: o.json as Record<string, unknown> | null, version: o.version };
  }
  async getMemWalAccount(id: string) {
    const o = await this.getObject(id);
    const j = (o.json ?? {}) as Record<string, unknown>;
    const keys = ((j.delegate_keys as Array<Record<string, unknown>>) ?? []).map((k) => ({ publicKey: k.public_key as unknown, suiAddress: k.sui_address as string, label: k.label as string }));
    return { type: o.type, owner: j.owner as string, delegateKeys: keys, accessCounterVersion: Number(j.access_counter_version ?? 0), active: Boolean(j.active), raw: j };
  }
  /** Events by fully qualified type. The gateway prunes old history, so an afterCheckpoint bound is required. Pages are followed. */
  async queryEvents(type: string, afterCheckpoint: number, maxPages = 10) {
    return this.cached(`ev:${type}:${afterCheckpoint}`, 15_000, async () => {
      const out: { digest: string; timestampMs: number; json: Record<string, string> }[] = [];
      let after: string | null = null;
      for (let i = 0; i < maxPages; i++) {
        const r = (await this.client.query({
          query: `query Events($type: String!, $cp: UInt53!, $after: String) { events(first: 50, after: $after, filter: { type: $type, afterCheckpoint: $cp }) { pageInfo { hasNextPage endCursor } nodes { transaction { digest } contents { json } timestamp } } }`,
          variables: { type, cp: afterCheckpoint, after },
        } as never)) as { data?: { events?: { pageInfo: { hasNextPage: boolean; endCursor: string }; nodes: { transaction: { digest: string }; contents: { json: Record<string, string> }; timestamp: string }[] } }; errors?: { message: string }[] };
        const ev = r.data?.events;
        if (!ev) throw new Error(`events query failed: ${JSON.stringify(r.errors ?? r).slice(0, 200)}`);
        for (const n of ev.nodes) out.push({ digest: n.transaction.digest, timestampMs: Date.parse(n.timestamp), json: n.contents.json });
        if (!ev.pageInfo.hasNextPage) break;
        after = ev.pageInfo.endCursor;
      }
      return out;
    });
  }
  /** Verification source of truth: status, sender, balance changes, checkpoint time, events. Never cached. */
  async getTransaction(digest: string) {
    const r = await this.client.core.getTransaction({ digest, include: { balanceChanges: true, effects: true, events: true, transaction: true, objectTypes: true } });
    const t = r.$kind === "Transaction" ? r.Transaction : r.FailedTransaction;
    return { ok: r.$kind === "Transaction" && t.status.success, tx: t };
  }
  async simulate(txBytes: Uint8Array) {
    return this.client.core.simulateTransaction({ transaction: txBytes, include: { balanceChanges: true, effects: true, events: true, objectTypes: true } });
  }
  async execute(txBytes: Uint8Array, signatures: string[]) {
    return this.client.core.executeTransaction({ transaction: txBytes, signatures, include: { balanceChanges: true, effects: true, events: true, objectTypes: true } });
  }
  async checkpoint() {
    const res = await this.client.query({ query: "query Checkpoint { checkpoint { sequenceNumber timestamp } }" } as never) as { data?: { checkpoint?: { sequenceNumber: number; timestamp: string } } };
    return res.data?.checkpoint;
  }
}
export type { SuiClientTypes };
let singleton: TatumSui | null = null;
export const tatum = () => (singleton ??= new TatumSui());
