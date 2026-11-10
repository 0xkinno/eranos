import Link from "next/link";
import { Glow } from "@/components/Glow";
import { TurnRing } from "@/components/TurnRing";
import { circleView } from "@/lib/facts/stats";
export const revalidate = 15;
export default async function MyCircles() {
  const c = await circleView().catch(() => null);
  return (
    <div className="app wrap">
      <p className="eyebrow">My circles</p><h1 style={{ fontSize: "clamp(2rem,5vw,3.25rem)", marginTop: 8 }}>Your circles</h1>
      <div className="cards two" style={{ marginTop: 24 }}>
        {c ? (
          <Link href={`/c/${c.id}`} style={{ textDecoration: "none", color: "inherit" }} data-testid="circle-card"><Glow>
            <TurnRing n={c.members.length} paid={c.members.map((m) => (c.paid[String(c.currentRound)] ?? []).includes(m))} turn={c.order.length ? c.members.indexOf(c.order[c.currentRound]) : null} />
            <h3 style={{ marginTop: 10 }}>{c.name}</h3>
            <p className="muted">Round {c.currentRound + 1} of {c.members.length} · {(c.contribution / 1e6).toFixed(2)} USDC each · members {c.members.length}</p>
          </Glow></Link>) : <div className="notice warn">Could not read the circle right now.</div>}
        <Glow><h3>Start your own</h3><p className="muted" style={{ marginTop: 8 }}>A circle needs three steward keys, a Walrus Memory account they own, and a contract object. The repository has the scripts that created the demo circle.</p><div className="spacer" /><a className="btn ghost" href="https://github.com/0xkinno/eranos#run-it">How to run one</a></Glow>
      </div>
    </div>
  );
}
