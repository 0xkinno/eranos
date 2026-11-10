import Link from "next/link";
import { Glow } from "@/components/Glow";
import { circleView, evidence, liveStats, factsFile } from "@/lib/facts/stats";
import { tatum } from "@/lib/tatum/sui";

export const revalidate = 20;
const scan = (d: string) => `https://suiscan.xyz/mainnet/tx/${d}`;
const isDigest = (d: unknown): d is string => typeof d === "string" && /^[1-9A-HJ-NP-Za-km-z]{43,44}$/.test(d);

export default async function Proof() {
  const [c, s] = await Promise.all([circleView().catch(() => null), liveStats().catch(() => null)]);
  const ev = evidence();
  const facts = factsFile() as { memories?: { total?: number; byNamespace?: Record<string, number> }; tests?: Record<string, number> };
  const st = tatum().status();
  return (
    <div className="app wrap">
      <p className="eyebrow">Proof · recomputed from live reads</p>
      <h1 style={{ fontSize: "clamp(2rem,5vw,3.5rem)", marginTop: 8 }}>Verify it yourself</h1>
      <p className="muted" style={{ marginTop: 12, maxWidth: "64ch" }}>Every row below is a Sui mainnet transaction or a Walrus blob. The reality rung is capped funds: the demo circle pays 0.1 USDC per member per 20-minute round. A real circle runs monthly.</p>
      <div className="cards" style={{ marginTop: 24 }}>
        <Glow data-testid="roll"><p className="eyebrow">Membership agreement</p><div className="big" style={{ marginTop: 8 }}>{c ? `${c.roll.money} of ${c.roll.memory}` : "…"}</div><p className="mono muted" style={{ marginTop: 6 }}>{c?.roll.agree ? "Money roll and memory roll agree, read live through Tatum." : "Rolls disagree."} Access counter {c?.roll.accessCounter ?? "…"}.</p></Glow>
        <Glow><p className="eyebrow">Provider</p><div className="big" style={{ marginTop: 8 }}>{st.provider === "tatum" ? "Tatum" : "Fallback"}</div><p className="mono muted" style={{ marginTop: 6 }}>{st.provider === "tatum" ? `${st.tatumCallTotal} gateway calls served by this instance.` : `Tatum answered with a plan limit: ${st.fallbackReason}. Reading from the public Sui node.`}</p></Glow>
        <Glow><p className="eyebrow">Memories on Walrus mainnet</p><div className="big" style={{ marginTop: 8 }}>{s?.memories ?? 0}</div><p className="mono muted" style={{ marginTop: 6 }}>{Object.entries(facts.memories?.byNamespace ?? {}).map(([k, v]) => `${k} ${v}`).join(" · ") || "counted by scripts/facts.ts"}</p></Glow>
      </div>
      <h2 style={{ marginTop: 48, fontSize: "1.75rem" }}>Transactions and blobs</h2>
      <div className="scroll-x"><table className="t" style={{ marginTop: 12 }} data-testid="evidence-table"><thead><tr><th>When (UTC)</th><th>What it proves</th><th>Digest or blob</th></tr></thead><tbody>
        {ev.map((e, i) => (
          <tr key={i}><td className="mono">{e.at.slice(5, 16).replace("T", " ")}</td><td>{e.label}{typeof e.error === "string" && e.error ? <div className="mono muted">{e.error.slice(0, 150)}</div> : null}</td>
            <td className="mono">{isDigest(e.digest) ? <a href={scan(e.digest)}>{e.digest.slice(0, 10)}…</a> : e.digest ? `blob ${String(e.digest).slice(0, 12)}…` : "refused before execution"}</td></tr>))}
      </tbody></table></div>
      <p className="mono muted" style={{ marginTop: 24 }}>Contract package <a href={`https://suiscan.xyz/mainnet/object/${process.env.ERANOS_PKG}`}>{process.env.ERANOS_PKG?.slice(0, 12)}…</a> · Circle <a href={`https://suiscan.xyz/mainnet/object/${c?.id}`}>{c?.id.slice(0, 12)}…</a> · Walrus Memory account <a href={`https://suiscan.xyz/mainnet/object/${c?.memoryAccount}`}>{c?.memoryAccount.slice(0, 12)}…</a></p>
      <p style={{ marginTop: 16 }}><Link href="/judge">Back to the 60-second walk</Link></p>
    </div>
  );
}
