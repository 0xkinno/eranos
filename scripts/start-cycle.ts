// Next cycle: the planner proposes an order citing memory lines, two stewards sign the same bytes through the proposals API.
import { stewardKeys, evidence } from "./chain";
import { txDigest } from "@/lib/sui/multisig";
const BASE = process.argv[2] ?? "http://localhost:3111";
(async () => {
  const r = await fetch(`${BASE}/api/proposals`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "start", memory: "on" }) });
  const p = await r.json(); if (!r.ok) throw new Error(JSON.stringify(p));
  console.log("proposal", p.id, p.summary.slice(0, 120));
  for (const o of p.reasons) console.log(`  round ${o.round + 1}: ${o.member.slice(0, 10)}  ${o.reason}  cited ${o.cited.map((c: string) => c.slice(0, 8)).join(",")}`);
  const sg = await (await fetch(`${BASE}/api/proposals/${p.id}/sign`)).json();
  const bytes = Uint8Array.from(Buffer.from(sg.bytesB64, "base64"));
  if (txDigest(bytes) !== p.digest) throw new Error("digest shown does not match the bytes: refusing to sign");
  let last: { executed?: { digest: string; ok: boolean } | null } = {};
  for (const i of [0, 1]) {
    const sig = (await stewardKeys[i].signTransaction(bytes)).signature;
    const s = await fetch(`${BASE}/api/proposals/${p.id}/sign`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ signature: sig }) });
    last = await s.json(); console.log(`steward ${i + 1} signed:`, JSON.stringify(last));
  }
  if (last.executed?.ok) evidence("start cycle: planner proposal citing memory lines, signed by stewards 1 and 2 through the proposals API", last.executed.digest, { order: p.reasons.map((o: { member: string; round: number; reason: string; cited: string[] }) => ({ round: o.round + 1, member: o.member, reason: o.reason, cited: o.cited })) });
})().catch((e) => { console.error(String(e?.message ?? e).slice(0, 600)); process.exit(1); });
