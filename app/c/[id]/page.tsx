"use client";
import { useCallback, useEffect, useState, use } from "react";
import Link from "next/link";
import { useDAppKit, useWalletConnection } from "@mysten/dapp-kit-react";
import { TurnRing } from "@/components/TurnRing";
import { Glow } from "@/components/Glow";
import { payRoundX402 } from "@/lib/client/pay";
import { PageHero } from "@/components/PageHero";
import { IconShield, IconKey, IconClock } from "@/components/art";
import type { CircleView } from "@/lib/facts/stats";

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const PKG = process.env.NEXT_PUBLIC_ERANOS_PKG ?? "";
function ClientTabs({ id }: { id: string }) {
  return <div className="row" style={{ margin: "12px 0 0" }}>{[["Circle", `/c/${id}`], ["Memory", `/c/${id}/memory`], ["Stewards", `/c/${id}/stewards`], ["Join", `/c/${id}/join`]].map(([l, h]) => <Link key={l} href={h} className="pill" style={{ minHeight: 44, display: "inline-flex" }}>{l}</Link>)}</div>;
}

export default function CirclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const kit = useDAppKit();
  const conn = useWalletConnection();
  const [c, setC] = useState<CircleView | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ digest: string } | null>(null);
  const [paidRound, setPaidRound] = useState<number | null>(null);
  const [rate, setRate] = useState<{ MXN?: number } | null>(null);
  const [notices, setNotices] = useState<{ id: string; kind: string; at: number; text: string }[]>([]);
  const load = useCallback(() => fetch(`/api/circles/${id}`).then((r) => r.json()).then((d) => (d.error ? setErr(d.error) : (setC(d), setErr("")))).catch((e) => setErr(String(e))), [id]);
  useEffect(() => { load(); const t = setInterval(load, 12_000); return () => clearInterval(t); }, [load]);
  useEffect(() => { fetch("/api/rate?c=MXN").then((r) => r.json()).then((d) => setRate({ MXN: d.value })).catch(() => {}); }, []);

  const meAddr = conn.account?.address;
  useEffect(() => { if (!meAddr) { setNotices([]); return; } fetch(`/api/reminders?member=${meAddr}`).then((r) => r.json()).then((d) => setNotices(d.notices ?? [])).catch(() => {}); }, [meAddr, c?.currentRound]);
  if (err && !c) return <div className="app wrap"><div className="notice warn">Could not read the circle: {err}</div></div>;
  if (!c) return <div className="app wrap"><div className="notice" aria-busy="true">Reading the circle through Tatum…</div></div>;
  const me = conn.account?.address;
  const myIdx = me ? c.members.indexOf(me) : -1;
  const round = c.currentRound;
  const paidNow = c.paid[String(round)] ?? [];
  const full = paidNow.length === c.members.length;
  const turnMember = c.order[round];
  const turnIdx = turnMember ? c.members.indexOf(turnMember) : null;
  const myTurn = me && turnMember === me;
  const iPaid = (me ? paidNow.includes(me) : false) || (done !== null && round === paidRound);
  const left = Math.max(0, c.cycleStartMs + (round + 1) * c.roundMs - Date.now());
  const pay = async () => {
    setBusy(true); setErr(""); setDone(null);
    try {
      const r = await payRoundX402({ circleId: id, round, eranosPkg: PKG, signer: { address: me!, signTransaction: async (tx) => { const s = await kit.signTransaction({ transaction: tx }); return { bytes: s.bytes, signature: s.signature }; } } });
      setDone(r); setPaidRound(round); load(); setTimeout(load, 6000); setTimeout(load, 14000);
    } catch (e) { setErr(String((e as Error).message)); } finally { setBusy(false); }
  };
  return (
    <div className="app wrap">
      <PageHero eyebrow={`Circle · cycle ${c.cycle} · round ${round + 1} of ${c.members.length}`} title={c.name}><ClientTabs id={id} /></PageHero>
      <div className="cards two" style={{ marginTop: 24 }}>
        <Glow data-testid="ring-card">
          <TurnRing n={c.members.length} paid={c.members.map((m) => paidNow.includes(m))} turn={turnIdx} labels={c.members.map((_, i) => String(i + 1))} />
          <p className="mono muted" style={{ marginTop: 8 }}>Blue beads have paid. The ember bead is whose turn it is.</p>
        </Glow>
        <Glow>
          <p className="eyebrow">This round</p>
          <div className="big" style={{ marginTop: 8 }}>{(c.contribution / 1e6).toFixed(2)} USDC</div>
          {rate?.MXN ? <p className="mono muted">about {(c.contribution / 1e6 * rate.MXN).toFixed(2)} MXN · rate from Tatum</p> : null}
          <p style={{ marginTop: 12 }} data-testid="round-status">{full ? "Everyone has paid. The pot can go out." : `${paidNow.length + (done && me && !paidNow.includes(me) && round === paidRound ? 1 : 0)} of ${c.members.length} paid. ${Math.ceil(left / 60000)} min left in this round.`}</p>
          {turnMember ? <p style={{ marginTop: 6 }}><span className="pill turn">Turn</span> member {turnIdx! + 1} <span className="mono muted">{short(turnMember)}</span>{myTurn ? " (you)" : ""}</p> : null}
          <div className="spacer" />
          {!conn.isConnected ? <div className="notice">Connect a wallet to pay your round. Gas is covered.</div>
            : myIdx < 0 ? <div className="notice warn" data-testid="not-member">This wallet is not a member of this circle. <Link href={`/c/${id}/join`}>Request to join</Link></div>
            : iPaid ? <div className="notice ok" data-testid="paid-ok"><span className="pill verified">verified</span> You have paid round {round + 1}.</div>
            : <button className="btn" data-testid="pay" disabled={busy} onClick={pay}>{busy ? "Waiting for your wallet and the chain…" : "Pay my round"}</button>}
          {done ? <p className="mono" style={{ marginTop: 10 }} data-testid="pay-digest">Paid. Transaction <a href={`https://suiscan.xyz/mainnet/tx/${done.digest}`}>{done.digest.slice(0, 12)}…</a></p> : null}
          {err ? <div className="notice warn" style={{ marginTop: 10 }} role="alert" data-testid="pay-error">{err}</div> : null}
        </Glow>
      </div>
      {me && myIdx >= 0 ? (
        <Glow style={{ marginTop: 20 }} data-testid="inbox"><div className="row" style={{ justifyContent: "space-between" }}><h3>Reminders for you</h3><span className="pill">in the app · at most 2 a round · quiet 21:00 to 08:00</span></div>
          {notices.length === 0 ? <p className="muted" style={{ marginTop: 10 }}>Nothing waiting. If a round opens and you have not paid, the keeper sends one here at the time your memory says money arrives.</p>
            : <div style={{ display: "grid", gap: 8, marginTop: 12 }}>{notices.slice(0, 4).map((n) => <div key={n.id} className="memline"><span className={n.kind === "turn" ? "pill turn" : "pill"}>{n.kind === "turn" ? "your turn" : "reminder"}</span> {n.text}<div className="muted">{new Date(n.at).toISOString().slice(11, 16)} UTC</div></div>)}{notices.length > 4 ? <p className="mono muted">{notices.length - 4} older notices cleared into this summary.</p> : null}</div>}
        </Glow>) : null}
      <h2 style={{ marginTop: 48, fontSize: "1.75rem" }}>Timeline</h2>
      <div className="scroll-x" tabIndex={0} role="region" aria-label="Scrollable table"><table className="t" style={{ marginTop: 12 }}><thead><tr><th>Round</th><th>Draws</th><th>Paid</th><th>Pot</th></tr></thead><tbody>
        {c.order.map((m, r) => { const po = c.payouts.find((p) => p.round === r && p.cycle === c.cycle); const n = (c.paid[String(r)] ?? []).length; return (
          <tr key={r} data-testid={`round-${r}`}><td>{r + 1}</td><td>Member {c.members.indexOf(m) + 1} <span className="mono muted">{short(m)}</span></td><td>{n} of {c.members.length}</td>
            <td>{po ? <a href={`https://suiscan.xyz/mainnet/tx/${po.digest}`}>paid out · {po.digest.slice(0, 8)}…</a> : r > round ? "not open" : n === c.members.length ? "ready to pay out" : `waiting: ${c.members.length - n} to pay`}</td></tr>); })}
      </tbody></table></div>
      <h2 style={{ marginTop: 48, fontSize: "1.75rem" }}>Members</h2>
      <div className="cards" style={{ marginTop: 14 }} data-testid="roster">
        {c.members.map((m, i) => (
          <Glow key={m}><div className="row" style={{ justifyContent: "space-between" }}>
            <div className="row" style={{ gap: 12 }}><span className="account" style={{ minHeight: 40, padding: 6 }}><span className="ring" style={{ width: 26, height: 26, background: i === turnIdx ? "var(--ember)" : paidNow.includes(m) ? "var(--sui-deep)" : undefined }} /></span><div><strong>Member {i + 1}</strong><div className="mono muted">{short(m)}</div></div></div>
            <span className={`pill ${paidNow.includes(m) ? "verified" : ""}`}>{paidNow.includes(m) ? "paid" : "due"}</span></div></Glow>))}
      </div>
      <div className="cards" style={{ marginTop: 28 }}>
        {[[<IconShield key="a" />, "The pot cannot be redirected", "The contract pays order[round] and no one else, and only after every member has paid."], [<IconKey key="b" />, "Your key, your signature", "You pay from your own wallet. The circle covers the fee but never signs for you."], [<IconClock key="c" />, "Reminders on your schedule", "At most two a round, never between 21:00 and 08:00, timed to when you told the circle money arrives."]].map(([ic, t, p], i) => (
          <Glow key={i}><div className="icon-tile">{ic}</div><h3>{t}</h3><p className="muted" style={{ marginTop: 8 }}>{p}</p></Glow>))}
      </div>
      <div className="notice" style={{ marginTop: 28 }} data-testid="roll-card">
        <span className="pill verified">checked live through Tatum</span> Money roll and memory roll {c.roll.agree ? "agree" : "DISAGREE"}: {c.roll.money} members hold money rights, {c.roll.memory} hold memory keys. Access counter {c.roll.accessCounter}.
        <span className="mono muted"> · data provider: {c.provider === "tatum" ? "Tatum" : "public Sui node (Tatum fallback active)"}</span>
      </div>
    </div>
  );
}
