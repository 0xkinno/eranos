"use client";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Glow } from "./Glow";
import { MemoryCompare } from "./MemoryCompare";
import { Reveal, Stagger, Item, CountUp } from "./motion";
import { HeroScene, MembershipDiagram, IconCoin, IconMemory, IconShield, IconKey, IconRing, IconClock, IconAgent, IconSteward } from "./art";

export interface LandingData {
  circleId: string; members: string[]; paid: boolean[]; turn: number | null; strip: string; contribution: number; roll: { money: number; memory: number; agree: boolean; accessCounter: number };
  stats: { joinTransactions: number; contributions: number; payouts: number; x402Payments: number; memories: number; usdcMoved: number };
  recent: { label: string; digest: string }[]; leave: string | null;
}
const NAMES: [string, string][] = [["ajo", "Lagos"], ["susu", "Accra"], ["tanda", "Houston"], ["chit", "Chennai"], ["pardner", "London"], ["hui", "Taipei"], ["equb", "Addis Ababa"], ["eranos", "Athens"]];

export function Landing({ d }: { d: LandingData }) {
  const reduce = useReducedMotion();
  const n = d.members.length || 5;
  const word = (t: string, i: number) => <motion.span key={i} style={{ display: "inline-block", marginRight: "0.22em" }} initial={reduce ? false : { y: 36, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.7, delay: 0.1 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}>{t}</motion.span>;
  return (
    <>
      <section className="hero">
        <div className="wrap">
          <div className="grid">
            <div>
              <motion.p className="eyebrow" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }}>A savings circle · ajo · susu · tanda</motion.p>
              <h1 style={{ marginTop: 16 }} aria-label="Save together. Nobody holds the pot.">
                <span aria-hidden>{"Save together.".split(" ").map(word)}<br />{"Nobody holds".split(" ").map((w, i) => word(w, i + 2))}<em className="serif" style={{ color: "var(--sui-deep)" }}>{word("the pot.", 5)}</em></span>
              </h1>
              <motion.p className="sub" initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.6 }}>Eranos runs your savings circle with no collector. The money goes only to whoever's turn it is, and the circle keeps its own memory.</motion.p>
              <motion.div className="cta" initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.6 }}>
                <Link href={d.circleId ? `/c/${d.circleId}` : "/app"} className="btn" data-testid="open-circle">Open the circle</Link>
                <Link href="/judge" className="btn ghost" data-testid="see-live">See a live circle, no wallet needed</Link>
              </motion.div>
              <motion.div className="chips" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}>
                <span className="chip"><i />Sui mainnet</span><span className="chip"><i />Walrus Memory</span><span className="chip"><i />Tatum gateway</span><span className="chip"><i />x402 payments</span>
              </motion.div>
            </div>
            <div className="art">
              <HeroScene n={n} paid={d.paid} turn={d.turn} />
              <div className="float-chip" style={{ top: 6, left: 0 }}><b>[outcome]</b> cycle 1 round 3 late_h 0.00 · verified on chain</div>
              <div className="float-chip" style={{ bottom: 8, right: 0 }}><b>pot</b> to member {d.turn !== null ? d.turn + 1 : 1} · {(d.contribution / 1e6 * n).toFixed(1)} USDC · only the scheduled member</div>
            </div>
          </div>
          <div className="strip" data-testid="latest-strip"><span className="dot" aria-hidden /><span>Latest round on Sui mainnet</span><span>{d.strip}</span></div>
        </div>
      </section>

      <div className="marquee" aria-label="The same circle has many names"><div className="track" aria-hidden>
        {[...NAMES, ...NAMES].map(([a, b], i) => <span key={i}>{a}<small>{b}</small></span>)}
      </div></div>

      <section className="section" id="story"><div className="wrap">
        <div className="cards two" style={{ alignItems: "center", gap: 48 }}>
          <Reveal><p className="eyebrow">The problem</p><h2 style={{ marginTop: 14 }}>It was <em className="serif">Lucía's</em> turn.</h2>
            <div style={{ display: "grid", gap: 16, marginTop: 24, fontSize: "1.125rem" }}>
              <p>Lucía Herrera cleans homes in Houston. For seven months she put $200 into a ten-person tanda. July was hers.</p>
              <p>The woman holding the money stopped answering her phone. The notebook that said whose turn it was went with her.</p>
              <p className="serif" style={{ fontSize: "1.7rem", color: "var(--navy)", lineHeight: 1.25, borderLeft: "3px solid var(--ember)", paddingLeft: 18 }}>"Lucía's July is gone, and so is the record of who was owed what."</p>
              <p className="muted">Lucía is a fictional composite. The pattern is not: circles run on one person's trust, phone and notebook.</p>
            </div></Reveal>
          <Reveal delay={0.1}>
            <div className="cards two" style={{ gap: 14 }}>
              <Glow><span className="pill turn">before</span><h3 style={{ marginTop: 12 }}>One notebook</h3><p className="muted" style={{ marginTop: 8 }}>One phone holds the money and the record. If it goes quiet, the circle is gone.</p></Glow>
              <Glow><span className="pill verified">with Eranos</span><h3 style={{ marginTop: 12 }}>One circle</h3><p className="muted" style={{ marginTop: 8 }}>A contract holds the pot. The circle's stewards own the memory. Every member holds a key.</p></Glow>
            </div>
            <div className="notice" style={{ marginTop: 14 }}><span className="mono muted">Sources in the README: Legit.ng, Modern Ghana, Springer, World Bank Findex.</span></div>
          </Reveal>
        </div>
      </div></section>

      <section className="section tint" id="how"><div className="wrap">
        <Reveal><p className="eyebrow">How a round works</p><h2 style={{ marginTop: 14 }}>Three things happen. <em className="serif">Nothing else does.</em></h2></Reveal>
        <Stagger className="bento" gap={0.1}>
          <Item className="b2"><Glow style={{ height: "100%" }}><div className="icon-tile"><IconCoin /></div><h3>Pay your round</h3><p className="muted" style={{ marginTop: 10 }}>You sign one payment from your own wallet. The circle covers the network fee up to a small cap per member per round. The demo round is {(d.contribution / 1e6).toFixed(1)} USDC.</p></Glow></Item>
          <Item className="b2"><Glow style={{ height: "100%" }}><div className="icon-tile"><IconRing /></div><h3>The pot moves to whoever's turn it is</h3><p className="muted" style={{ marginTop: 10 }}>The contract pays only the scheduled member, and only when every member has paid. Nobody, including us, can redirect it.</p></Glow></Item>
          <Item className="b2"><Glow style={{ height: "100%" }}><div className="icon-tile"><IconMemory /></div><h3>The circle remembers</h3><p className="muted" style={{ marginTop: 10 }}>Each verified payment becomes a line the circle can read back:</p><div className="memline" style={{ marginTop: 12 }}><span className="t">[outcome]</span> cycle:1 round:0 late_h:0.00 tx:…</div></Glow></Item>
          <Item className="b3"><Glow style={{ height: "100%" }}><div className="icon-tile"><IconAgent /></div><h3>An agent can pay for you, and only for you</h3><p className="muted" style={{ marginTop: 10 }}>A standing-order agent answers an HTTP 402, signs a payment for your round and nothing more. It can never pay above your round, or for anyone else.</p><p className="mono" style={{ marginTop: 12 }}>{d.stats.x402Payments} agent payments settled on mainnet</p></Glow></Item>
          <Item className="b3"><Glow style={{ height: "100%" }}><div className="icon-tile"><IconClock /></div><h3>Reminders that learn when you get paid</h3><p className="muted" style={{ marginTop: 10 }}>At most two a round, never between 21:00 and 08:00. Late payers draw later next cycle, and every change cites the memory line that caused it.</p></Glow></Item>
        </Stagger>
      </div></section>

      <section className="section deep" id="memory"><div className="wrap">
        <Reveal><p className="eyebrow">Memory you can see</p><h2 style={{ marginTop: 14 }}>Switch it off. <em className="serif">Watch the reminder move.</em></h2>
          <p className="lede">Each member told the circle when money is available to them. With memory on, the reminder arrives then. With memory off it arrives on a fixed schedule.</p></Reveal>
        <Reveal delay={0.1}><div style={{ marginTop: 32 }}><MemoryCompare members={d.members} /></div></Reveal>
      </div></section>

      <section className="section" id="security"><div className="wrap">
        <div className="cards two" style={{ alignItems: "center", gap: 40 }}>
          <Reveal><p className="eyebrow">Who can see the notebook</p><h2 style={{ marginTop: 14 }}>Members hold keys. <em className="serif">Stewards hold the account.</em></h2>
            <p className="lede">Three stewards, any two sign, own the circle's memory account and its admin rights. Each member holds one delegate key derived from their own wallet. Leaving removes the key in the same transaction that removes the member.</p>
            <div className="row" style={{ marginTop: 22 }}>
              <span className={`pill ${d.roll.agree ? "verified" : "turn"}`} data-testid="roll">Money roll {d.roll.money} · Memory roll {d.roll.memory} · {d.roll.agree ? "agree" : "disagree"}</span>
              <span className="pill">access counter {d.roll.accessCounter}</span>
            </div>
            <p className="mono muted" style={{ marginTop: 12 }}>Checked live through Tatum. Revocation is forward only: it does not take back what a member already read.{d.leave ? <> Leave transaction <a href={`https://suiscan.xyz/mainnet/tx/${d.leave}`}>{d.leave.slice(0, 10)}…</a></> : null}</p></Reveal>
          <Reveal delay={0.1}><div className="card dark" style={{ padding: 22, background: "linear-gradient(160deg, var(--deep), var(--navy))" }}><MembershipDiagram /></div></Reveal>
        </div>
        <Stagger className="cards" gap={0.08}>
          {[[<IconShield key="a" />, "Only confirmed facts decide", "A model's guess waits in quarantine. Only the member it is about can sign it into the circle's decisions."], [<IconKey key="b" />, "Keys, not accounts", "Your memory key is derived from one wallet signature. It moves no money and is never stored."], [<IconSteward key="c" />, "Two of three to change anything", "Admitting, removing and starting a cycle need two steward signatures over the same bytes."]].map(([ic, t, p], i) => (
            <Item key={i}><Glow><div className="icon-tile">{ic}</div><h3>{t}</h3><p className="muted" style={{ marginTop: 8 }}>{p}</p></Glow></Item>))}
        </Stagger>
      </div></section>

      <section className="section tint" id="proof"><div className="wrap">
        <Reveal><p className="eyebrow">Measured, not claimed</p><h2 style={{ marginTop: 14 }}>Live numbers <em className="serif">from the chain.</em></h2></Reveal>
        <Stagger className="cards" gap={0.07}>
          {([[d.stats.joinTransactions, "Joins: money and memory in one transaction", 0, ""], [d.stats.contributions, "Contributions verified on chain", 0, ""], [d.stats.payouts, "Payouts, each to the scheduled member", 0, ""], [d.stats.x402Payments, "Agent payments over x402", 0, ""], [d.stats.memories, "Memories written to Walrus mainnet", 0, ""], [d.stats.usdcMoved, "USDC moved through the contract", 1, ""]] as [number, string, number, string][]).map(([v, l, dec], i) => (
            <Item key={i}><Glow><div className="big" data-testid={`stat-${i}`}><CountUp to={v} decimals={dec} /></div><p className="mono muted" style={{ marginTop: 10 }}>{l}</p></Glow></Item>))}
        </Stagger>
        <Reveal delay={0.1}><Glow style={{ marginTop: 20 }}>
          <div className="row" style={{ justifyContent: "space-between" }}><h3>Latest on mainnet</h3><Link href="/proof" className="btn ghost">Verify it yourself</Link></div>
          <div style={{ display: "grid", gap: 8, marginTop: 14 }}>{d.recent.map((r, i) => (<div key={i} className="memline row" style={{ justifyContent: "space-between" }}><span>{r.label}</span><a href={`https://suiscan.xyz/mainnet/tx/${r.digest}`}>{r.digest.slice(0, 10)}…</a></div>))}</div>
        </Glow></Reveal>
      </div></section>

      <section className="section"><div className="wrap">
        <Reveal><div className="card dark" style={{ padding: "48px 40px", background: "radial-gradient(600px 260px at 85% 0%, rgba(77,162,255,.5), transparent 70%), linear-gradient(160deg, var(--deep), var(--navy))" }}>
          <p className="eyebrow" style={{ color: "var(--glow)" }}>For judges</p><h2 style={{ marginTop: 14, color: "#fff" }}>Sixty seconds. <em className="serif">No wallet.</em></h2>
          <p className="lede" style={{ color: "#B6CFF0" }}>A real circle on Sui mainnet with real payments, a guided tour, and every digest linked.</p>
          <div className="row" style={{ marginTop: 26 }}><Link href="/judge" className="btn light">Start the 60-second walk</Link><Link href="/?tour=1" className="btn ghost">Take the guided tour</Link><Link href="/proof" className="btn ghost">Open /proof</Link></div>
        </div></Reveal>
      </div></section>
    </>
  );
}
