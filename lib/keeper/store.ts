// Disposable state. Walrus and Sui are the source of truth. Upstash Redis REST when configured, otherwise a local JSON file (scripts) or memory (serverless).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
export interface KV { get(k: string): Promise<string | null>; set(k: string, v: string): Promise<void>; kind: string }
const g = globalThis as unknown as { __eranosMem?: Map<string, string> };
class Mem implements KV { kind = "memory"; m = (g.__eranosMem ??= new Map<string, string>()); async get(k: string) { return this.m.get(k) ?? null; } async set(k: string, v: string) { this.m.set(k, v); } }
class FileKV implements KV {
  kind = "file"; constructor(private path: string) {}
  private load(): Record<string, string> { return existsSync(this.path) ? JSON.parse(readFileSync(this.path, "utf8")) : {}; }
  async get(k: string) { return this.load()[k] ?? null; }
  async set(k: string, v: string) { const d = this.load(); d[k] = v; writeFileSync(this.path, JSON.stringify(d)); }
}
class Upstash implements KV {
  kind = "upstash"; constructor(private url: string, private token: string) {}
  private async cmd(...a: string[]) { const r = await fetch(this.url, { method: "POST", headers: { authorization: `Bearer ${this.token}` }, body: JSON.stringify(a) }); return (await r.json()) as { result: string | null }; }
  async get(k: string) { return (await this.cmd("GET", k)).result; }
  async set(k: string, v: string) { await this.cmd("SET", k, v); }
}
/** Vercel Blob (private store) as a key-value store. Every write is a new versioned object and a read takes the newest one from list(), which is strongly consistent. */
class BlobKV implements KV {
  kind = "vercel-blob";
  private dir = (k: string) => `eranos-kv/${Buffer.from(k).toString("base64url")}/`;
  async get(k: string) {
    const { list, get } = await import("@vercel/blob");
    const r = await list({ prefix: this.dir(k), limit: 1000 });
    const newest = r.blobs.sort((a, b) => (a.pathname < b.pathname ? 1 : -1))[0];
    if (!newest) return null;
    const b = await get(newest.pathname, { access: "private" });
    if (!b || b.statusCode !== 200) return null;
    return await new Response(b.stream).text();
  }
  async set(k: string, v: string) {
    const { put, list, del } = await import("@vercel/blob");
    const stamp = `${Date.now().toString().padStart(15, "0")}-${Math.random().toString(36).slice(2, 6)}`;
    await put(`${this.dir(k)}${stamp}.txt`, v, { access: "private", addRandomSuffix: false, allowOverwrite: true, contentType: "text/plain" });
    // keep the store small: drop versions older than the newest three
    const old = (await list({ prefix: this.dir(k), limit: 1000 })).blobs.sort((a, b) => (a.pathname < b.pathname ? 1 : -1)).slice(3);
    if (old.length) await del(old.map((o) => o.url)).catch(() => {});
  }
}
let kv: KV | null = null;
export function store(): KV {
  if (kv) return kv;
  const url = process.env.KV_REST_API_URL, token = process.env.KV_REST_API_TOKEN;
  kv = url && token ? new Upstash(url, token) : (process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID) && process.env.VERCEL ? new BlobKV() : process.env.ERANOS_LOCAL_STATE ? new FileKV(process.env.ERANOS_LOCAL_STATE) : new Mem();
  return kv;
}
