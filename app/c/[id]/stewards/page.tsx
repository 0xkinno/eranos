"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useDAppKit, useWalletConnection } from "@mysten/dapp-kit-react";
import { Glow } from "@/components/Glow";
import { Transaction } from "@mysten/sui/transactions";
import { PageHero } from "@/components/PageHero";

interface P { id: string; kind: string; summary: string; digest: string; partials: string[]; executed?: { digest: string; ok: boolean }; reasons?: { member: string; round: number; reason: string; cited: string[] }[] }
export default function Stewards({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const kit = useDAppKit(); const conn = useWalletConnection();
  const [ps, setPs] = useState<P[] | null>(null); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const load = () => fetch("/api/proposals").then((r) => r.json()).then((d) => setPs(d.proposals)).catch(() => setPs([]));
  useEffect(() => { load(); }, []);
  const sign = async (p: P) => {
    setBusy(true); setMsg("");
    try {
      const j = await (await fetch(`/api/proposals/${p.id}/sign`)).json();
      const bytes = j.bytesB64 as string;
      // the digest shown on screen must equal the digest of the bytes the wallet signs
      const s = await kit.signTransaction({ transaction: Transaction.from(bytes) });
      const r = await fetch(`/api/proposals/${p.id}/sign`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ signature: s.signature }) });
      const out = await r.json(); if (!r.ok) throw new Error(out.error);
      setMsg(out.executed ? `Executed: ${out.executed.digest}` : `Signature recorded (${out.signatures} of 2).`); load();
    } catch (e) { setMsg(String((e as Error).message).slice(0, 200)); } finally { setBusy(false); }
  };
  const propose = async (memory: "on" | "off") => {
    setBusy(true); setMsg("Building the proposal and simulating it through Tatum…");
    try { const r = await fetch("/api/proposals", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "start", memory }) }); const j = await r.json(); if (!r.ok) throw new Error(j.error); setMsg("Proposal created. Order reasons are listed below it."); load(); }
    catch (e) { setMsg(String((e as Error).message).slice(0, 220)); } finally { setBusy(false); }
  };
  return (
    <div className="app wrap">
      <PageHero eyebrow="Stewards · three keys, any two sign" title={<>Proposals <em className="serif">to sign</em></>}><Link href={`/c/${id}`} className="pill" style={{ minHeight: 44, display: "inline-flex" }}>Back to the circle</Link></PageHero>
      <p className="muted" style={{ marginTop: 14, maxWidth: "62ch" }}>Each proposal is built once. Every steward signs the same bytes, and the digest shown here is the digest of those bytes. Steward wallets must be Ed25519 accounts. zkLogin accounts are not supported in the multisig.</p>
      <div className="row" style={{ marginTop: 18 }}><button className="btn" disabled={busy} onClick={() => propose("on")} data-testid="propose-on">Propose next cycle order (memory on)</button><button className="btn ghost" disabled={busy} onClick={() => propose("off")}>Memory off</button></div>
      {msg ? <div className="notice" style={{ marginTop: 14 }} role="status">{msg}</div> : null}
      <div style={{ display: "grid", gap: 14, marginTop: 24 }}>
        {ps === null ? <div className="notice" aria-busy="true">Loading…</div> : ps.length === 0 ? <div className="notice">No proposals yet.</div> : null}
        {ps?.map((p) => (
          <Glow key={p.id} data-testid="proposal"><span className="pill">{p.kind}</span><p style={{ marginTop: 10 }}>{p.summary}</p>
            <p className="mono muted" style={{ marginTop: 8 }}>digest {p.digest.slice(0, 20)}… · signatures {p.partials.length} of 2</p>
            {p.executed ? <p className="mono" style={{ marginTop: 8 }}>{p.executed.ok ? "Executed" : "Failed"}: <a href={`https://suiscan.xyz/mainnet/tx/${p.executed.digest}`}>{p.executed.digest.slice(0, 12)}…</a></p>
              : <div style={{ marginTop: 12 }}><button className="btn" disabled={!conn.isConnected || busy} onClick={() => sign(p)}>{conn.isConnected ? "Sign with my wallet" : "Connect a steward wallet"}</button></div>}</Glow>))}
      </div>
    </div>
  );
}
