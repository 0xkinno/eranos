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
let kv: KV | null = null;
export function store(): KV {
  if (kv) return kv;
  const url = process.env.KV_REST_API_URL, token = process.env.KV_REST_API_TOKEN;
  kv = url && token ? new Upstash(url, token) : process.env.ERANOS_LOCAL_STATE ? new FileKV(process.env.ERANOS_LOCAL_STATE) : new Mem();
  return kv;
}
