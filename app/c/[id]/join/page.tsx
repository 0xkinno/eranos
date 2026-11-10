"use client";
import { useState, use } from "react";
import Link from "next/link";
import { useDAppKit, useWalletConnection } from "@mysten/dapp-kit-react";
import { Glow } from "@/components/Glow";
import { deriveMemberKey } from "@/lib/memory/derive-key";
import { PageHero } from "@/components/PageHero";

export default function JoinPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const kit = useDAppKit(); const conn = useWalletConnection(); const me = conn.account?.address;
  const [key, setKey] = useState<{ publicKeyHex: string } | null>(null);
  const [state, setState] = useState(""); const [busy, setBusy] = useState(false);
  const makeKey = async () => {
    setBusy(true); setState("");
    try { const k = await deriveMemberKey(async (b) => ({ signature: (await kit.signPersonalMessage({ message: b })).signature }), id); setKey(k); }
    catch (e) { setState(String((e as Error).message).slice(0, 200)); } finally { setBusy(false); }
  };
  const request = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/proposals", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "admit", member: me, memberKeyHex: key!.publicKeyHex }) });
      const j = await r.json(); if (!r.ok) throw new Error(j.error);
      setState(`Request sent. Two of three stewards must sign proposal ${j.id.slice(0, 8)} before you are admitted.`);
    } catch (e) { setState(String((e as Error).message).slice(0, 200)); } finally { setBusy(false); }
  };
  return (
    <div className="app wrap" style={{ maxWidth: 860 }}>
      <PageHero eyebrow="Join" title={<>Join in <em className="serif">three steps</em></>}><Link href={`/c/${id}`} className="pill" style={{ minHeight: 44, display: "inline-flex" }}>Back to the circle</Link></PageHero>
      <div style={{ display: "grid", gap: 16, marginTop: 24 }}>
        <Glow><h3>1. Connect your wallet</h3><p className="muted" style={{ marginTop: 8 }}>{me ? <>Connected as <span className="mono">{me.slice(0, 10)}…</span></> : "Use Connect wallet in the top bar. Use an Ed25519 wallet such as Slush or Suiet."}</p></Glow>
        <Glow><h3>2. Create your memory key</h3><p className="muted" style={{ marginTop: 8 }}>One signature creates your key to this circle's memory. It moves no money and is never stored. The same wallet re-creates the same key on any device.</p>
          <div className="spacer" /><button className="btn" disabled={!me || busy} onClick={makeKey} data-testid="make-key">{key ? "Key created" : "Create my memory key"}</button>
          {key ? <p className="mono" style={{ marginTop: 10 }}>public key {key.publicKeyHex.slice(0, 20)}…</p> : null}</Glow>
        <Glow><h3>3. Request to join</h3><p className="muted" style={{ marginTop: 8 }}>The stewards add your key to the circle's memory and admit you to the money roll in one transaction. Two of three must sign.</p>
          <div className="spacer" /><button className="btn" disabled={!key || busy} onClick={request} data-testid="request-join">Request to join</button></Glow>
        {state ? <div className="notice" role="status">{state}</div> : null}
      </div>
    </div>
  );
}
