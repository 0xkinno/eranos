import Link from "next/link";
import { Glow } from "@/components/Glow";
import { TurnRing } from "@/components/TurnRing";
import { circleView } from "@/lib/facts/stats";
import { PageHero } from "@/components/PageHero";
export const revalidate = 15;
export default async function MyCircles() {
  const c = await circleView().catch(() => null);
  return (
    <div className="app wrap">
      <PageHero eyebrow="My circles" title={<>Your <em className="serif">circles</em></>}><p className="muted" style={{ maxWidth: "52ch" }}>Every circle you belong to, with whose turn it is and what is due. Your wallet decides which circles show here.</p></PageHero>
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
