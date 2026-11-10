"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useDAppKit, useWalletConnection } from "@mysten/dapp-kit-react";
import { Glow } from "@/components/Glow";
import { deriveMemberKey } from "@/lib/memory/derive-key";
import { confirmMessage, rejectMessage } from "@/lib/memory/policy";
import { formatLine } from "@/lib/memory/format";
import { memberMemory } from "@/lib/memory/client";

interface Mem { id: string; type: string; attrs: Record<string, string>; text: string; date: string }
const TABS = ["Known", "Heard", "Keeper"] as const;
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
void b64;

function Line({ m, extra }: { m: Mem; extra?: React.ReactNode }) {
  return (
    <div className="memline" data-testid="memline">
      <span className="t">[{m.type}]</span> {m.date} {Object.entries(m.attrs).filter(([k]) => ["about", "by", "confirmed", "cycle", "round", "late_h", "tx"].includes(k)).map(([k, v]) => `${k}:${v.length > 14 ? v.slice(0, 10) + "…" : v}`).join(" ")} | {m.text}
      <div className="muted">stored on Walrus · blob {m.id.slice(0, 16)}… {m.attrs.confirmed ? `· confirmed by ${m.attrs.confirmed}` : ""}</div>
      {extra}
    </div>
  );
}

export default function MemoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const kit = useDAppKit();
  const conn = useWalletConnection();
  const me = conn.account?.address;
  const [tab, setTab] = useState<(typeof TABS)[number]>("Known");
  const [known, setKnown] = useState<Mem[] | null>(null);
  const [heard, setHeard] = useState<Mem[] | null>(null);
  const [accountId, setAccountId] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [fact, setFact] = useState("");
  const [chat, setChat] = useState("");
  const loadAll = () => {
    fetch("/api/planner").then((r) => r.json()).then((d) => setKnown(d.memories ?? [])).catch(() => setKnown([]));
    fetch("/api/heard").then((r) => r.json()).then((d) => setHeard(d.heard ?? [])).catch(() => setHeard([]));
  };
  useEffect(() => { loadAll(); fetch(`/api/circles/${id}`).then((r) => r.json()).then((d) => setAccountId(d.memoryAccount ?? "")); }, [id]);

  const sign = async (bytes: Uint8Array) => (await kit.signPersonalMessage({ message: bytes })).signature;
  const tell = async () => {
    setBusy(true); setMsg("Creating your memory key from one signature. It moves no money.");
    try {
      const k = await deriveMemberKey(async (b) => ({ signature: await sign(b) }), id);
      const line = formatLine({ type: "fact", date: new Date().toISOString().slice(0, 10), attrs: { by: me!, about: me!, confirmed: "own-key" }, text: fact });
      setMsg("Writing to the circle's memory with your own key. This takes about 20 seconds.");
      await memberMemory(k.privateKeyHex, accountId, "known", window.location.origin).rememberAndWait(line, { namespace: "known" } as never);
      setMsg("Stored. It now appears in Known."); setFact(""); loadAll();
    } catch (e) { setMsg(`Could not store it: ${String((e as Error).message).slice(0, 160)}`); } finally { setBusy(false); }
  };
  const scribe = async () => {
    setBusy(true); setMsg("The scribe is reading the chat text. Facts go to Heard, never to Known.");
    try {
      const r = await fetch("/api/scribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: chat, about: me }) });
      const j = await r.json(); if (!r.ok) throw new Error(j.error);
      setMsg(`${j.heard.length} candidate fact(s) are waiting for you in Heard.`); setChat(""); loadAll(); setTab("Heard");
    } catch (e) { setMsg(String((e as Error).message).slice(0, 200)); } finally { setBusy(false); }
  };
  const decide = async (h: Mem, reject: boolean, edited?: string) => {
    setBusy(true); setMsg("Sign to " + (reject ? "reject" : "confirm") + " this fact. It moves no money.");
    try {
      const signature = await sign(reject ? rejectMessage(id, h.id) : confirmMessage(id, h.id, edited ?? h.text));
      const r = await fetch("/api/heard/confirm", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ heardId: h.id, signature, reject, editedText: edited }) });
      const j = await r.json(); if (!r.ok) throw new Error(j.error);
      setMsg(reject ? "Rejected. It will not change any decision." : "Confirmed and copied to Known. Decisions can now use it."); loadAll();
    } catch (e) { setMsg(String((e as Error).message).slice(0, 200)); } finally { setBusy(false); }
  };

  const keeperTypes = ["outcome", "payout", "reminder"];
  const list = tab === "Known" ? (known ?? []).filter((m) => !keeperTypes.includes(m.type)) : tab === "Keeper" ? (known ?? []).filter((m) => keeperTypes.includes(m.type)) : heard ?? [];
  return (
    <div className="app wrap">
      <p className="eyebrow">Circle memory · owned by the stewards, read by members</p>
      <h1 style={{ fontSize: "clamp(2rem,5vw,3.25rem)", marginTop: 8 }}>What the circle remembers</h1>
      <div className="row" style={{ marginTop: 12 }}><Link href={`/c/${id}`} className="pill" style={{ minHeight: 44, display: "inline-flex" }}>Back to the circle</Link></div>
      <div className="tabs" role="tablist">{TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} data-testid={`tab-${t}`}>{t}</button>)}</div>
      <p className="muted" style={{ maxWidth: "62ch" }}>{tab === "Known" ? "Confirmed facts. Every decision reads only these." : tab === "Heard" ? "Candidate facts a model extracted from pasted chat. They change nothing until the person they are about signs." : "Verified payments, payouts and reminder results written by the keeper after checking the chain through Tatum."}</p>
      <div style={{ display: "grid", gap: 10, marginTop: 16 }} data-testid="mem-list">
        {(tab === "Heard" ? heard : known) === null ? <div className="notice" aria-busy="true">Reading from Walrus…</div> : null}
        {list.length === 0 && (tab === "Heard" ? heard : known) !== null ? <div className="notice">Nothing here yet.</div> : null}
        {list.map((m) => (
          <Line key={m.id} m={m} extra={tab === "Heard" ? (
            <div className="row" style={{ marginTop: 10 }}>
              {me && me === m.attrs.about ? (<>
                <button className="btn" disabled={busy} data-testid="confirm" onClick={() => decide(m, false)}>Confirm</button>
                <button className="btn ghost" disabled={busy} onClick={() => { const e = window.prompt("Edit the fact, then sign:", m.text); if (e) decide(m, false, e); }}>Edit</button>
                <button className="btn ghost" disabled={busy} data-testid="reject" onClick={() => decide(m, true)}>Reject</button>
              </>) : <span className="pill">waiting for {m.attrs.about ? short(m.attrs.about) : "the member"}</span>}
            </div>) : null} />
        ))}
      </div>
      {msg ? <div className="notice" style={{ marginTop: 16 }} role="status" data-testid="mem-msg">{msg}</div> : null}
      <div className="cards two" style={{ marginTop: 32 }}>
        <Glow><h3>Tell the circle something about you</h3>
          <p className="muted" style={{ marginTop: 8 }}>Written with your own key, so it goes straight to Known.</p>
          <textarea className="field" style={{ marginTop: 10 }} rows={3} value={fact} onChange={(e) => setFact(e.target.value)} placeholder="I get paid late in each round, about 70 percent through" aria-label="A fact about you" />
          <div className="spacer" /><button className="btn" disabled={!me || busy || fact.trim().length < 8} onClick={tell} data-testid="tell">{me ? "Sign and store" : "Connect a wallet first"}</button></Glow>
        <Glow><h3>Paste group chat for the scribe</h3>
          <p className="muted" style={{ marginTop: 8 }}>The scribe extracts facts about you into Heard. Nothing changes until you confirm.</p>
          <textarea className="field" style={{ marginTop: 10 }} rows={3} value={chat} onChange={(e) => setChat(e.target.value)} placeholder="Paste chat text that mentions you" aria-label="Chat text" />
          <div className="spacer" /><button className="btn ghost" disabled={!me || busy || chat.trim().length < 10} onClick={scribe} data-testid="scribe">{me ? "Send to the scribe" : "Connect a wallet first"}</button></Glow>
      </div>
      <p className="mono muted" style={{ marginTop: 20 }}>Honest limits: Walrus blobs are append-only. Retracting a fact hides it from every decision. It does not erase the blob.</p>
    </div>
  );
}
