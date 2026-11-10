import Link from "next/link";
import { TurnRing } from "@/components/TurnRing";
import { Glow } from "@/components/Glow";
import { MemoryCompare } from "@/components/MemoryCompare";
import { circleView, liveStats, evidence } from "@/lib/facts/stats";

export const revalidate = 30;
const shortA = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export default async function Home() {
  const [c, s] = await Promise.all([circleView().catch(() => null), liveStats().catch(() => null)]);
  const ev = evidence();
  const leave = ev.find((e) => e.label.startsWith("leave"));
  const n = c?.members.length ?? 5;
  const paidMap = c ? c.members.map((m) => (c.paid[String(c.currentRound)] ?? []).includes(m)) : [];
  const lastPayout = c?.payouts.at(-1);
  const strip = lastPayout && c
    ? `Round ${lastPayout.round + 1} paid out to member ${c.members.indexOf(lastPayout.to) + 1} · ${c.contribution / 1e6} USDC x ${n} · verified`
    : c ? `Cycle ${c.cycle} · round ${c.currentRound + 1} open · ${(c.paid[String(c.currentRound)] ?? []).length} of ${n} paid` : "Reading the circle";
  return (
    <>
      <section className="hero">
        <div className="wrap">
          <div className="grid">
            <div>
              <p className="eyebrow" style={{ color: "#E7E0FF" }}>A savings circle, ajo, susu, tanda</p>
              <h1 style={{ marginTop: 12 }}>Save together.<br />Nobody holds the pot.</h1>
              <p className="sub">Eranos runs your savings circle with no collector. The money goes only to whoever's turn it is, and the circle keeps its own memory.</p>
              <div className="cta">
                <Link href={c ? `/c/${c.id}` : "/app"} className="btn light" data-testid="open-circle">Open the circle</Link>
                <Link href="/judge" className="link" data-testid="see-live">See a live circle, no wallet needed</Link>
              </div>
            </div>
            <div className="art"><TurnRing n={n} paid={paidMap} turn={c ? c.order.length ? c.members.indexOf(c.order[c.currentRound]) : 0 : 0} dark title="Ring of circle members, the current turn glows" /></div>
          </div>
          <div className="strip" data-testid="latest-strip"><span>Latest round on Sui mainnet</span><span>{strip}</span></div>
        </div>
      </section>

      <section className="section" id="story"><div className="wrap" style={{ maxWidth: 780 }}>
        <p className="eyebrow">The problem</p>
        <h2 style={{ marginTop: 10 }}>It was Lucía's turn.</h2>
        <div style={{ display: "grid", gap: 18, marginTop: 24, fontSize: "1.125rem" }}>
          <p>Lucía Herrera cleans homes in Houston. For seven months she put $200 into a ten-person tanda. July was hers.</p>
          <p>The woman holding the money stopped answering her phone. The notebook that said whose turn it was went with her.</p>
          <blockquote style={{ margin: 0, padding: "6px 0 6px 20px", borderLeft: "3px solid var(--ember)", fontFamily: "var(--display)", fontSize: "1.5rem", color: "var(--amethyst)" }}>"Lucía's July is gone, and so is the record of who was owed what."</blockquote>
          <p>Lucía is a fictional composite. The pattern is not: circles are run on one person's trust, one person's phone and one person's notebook.</p>
        </div>
        <div className="scroll-x" style={{ marginTop: 28 }}>
          <table className="t"><tbody><tr><th>Ajo</th><th>Susu</th><th>Tanda</th><th>Chit</th><th>Pardner</th><th>Hui</th><th>Equb</th></tr><tr><td>Lagos</td><td>Accra</td><td>Houston, Mexico City</td><td>Chennai</td><td>London</td><td>Taipei</td><td>Addis Ababa</td></tr></tbody></table>
        </div>
        <p className="muted" style={{ marginTop: 14 }}>In ancient Athens it was an <em>eranos</em>: friends putting money in so one of them could draw it. The README lists the sources.</p>
      </div></section>

      <section className="section" id="how" style={{ background: "var(--vellum)" }}><div className="wrap">
        <p className="eyebrow">How a round works</p><h2 style={{ marginTop: 10 }}>Three things happen.</h2>
        <div className="cards" style={{ marginTop: 28 }}>
          <Glow><h3>Pay your round</h3><p className="muted" style={{ marginTop: 10 }}>You sign from your own wallet. The circle covers the network fee, up to a small cap per member per round. Your round is 0.1 USDC in the demo circle.</p></Glow>
          <Glow><h3>The pot moves to whoever's turn it is</h3><p className="muted" style={{ marginTop: 10 }}>The contract pays only the member scheduled for that round, and only when every member has paid. Nobody, including us, can redirect it.</p></Glow>
          <Glow><h3>The circle remembers</h3><p className="muted" style={{ marginTop: 10 }}>Each verified payment becomes a line the circle can read back:</p><div className="memline" style={{ marginTop: 10 }}><span className="t">[outcome]</span> cycle:1 round:0 late_h:0.00 tx:…</div></Glow>
        </div>
      </div></section>

      <section className="section" id="memory"><div className="wrap">
        <p className="eyebrow">Memory you can see</p><h2 style={{ marginTop: 10 }}>Switch it off and watch the reminder move.</h2>
        <p className="muted" style={{ marginTop: 12, maxWidth: "60ch" }}>Each member told the circle when money is available to them. With memory on, the reminder arrives then. With memory off it arrives on a fixed schedule.</p>
        <div style={{ marginTop: 24 }}><MemoryCompare members={c?.members ?? []} /></div>
      </div></section>

      <section className="section" id="security" style={{ background: "var(--vellum)" }}><div className="wrap">
        <p className="eyebrow">Who can see the notebook</p><h2 style={{ marginTop: 10 }}>Members hold keys. Stewards hold the account.</h2>
        <div className="cards two" style={{ marginTop: 28 }}>
          <Glow>
            <h3>Three stewards, any two sign</h3>
            <p className="muted" style={{ marginTop: 10 }}>The circle's memory account and the circle's admin rights belong to a 2 of 3 multisig address. Each member holds one delegate key, derived from their own wallet signature. Leaving removes the key in the same transaction that removes the member.</p>
            <p className="mono" style={{ marginTop: 14 }} data-testid="roll">Money roll and memory roll agree: {c ? `${c.roll.money} of ${c.roll.memory}` : "…"} {c?.roll.agree ? "· checked live through Tatum" : ""}</p>
          </Glow>
          <Glow>
            <h3>Leaving is provable</h3>
            <p className="muted" style={{ marginTop: 10 }}>Removing a key rotates the account's access counter. Revocation is forward only: it does not take back what a member already read.</p>
            <p className="mono" style={{ marginTop: 14 }}>{leave ? <>Leave transaction <a href={`https://suiscan.xyz/mainnet/tx/${leave.digest}`}>{String(leave.digest).slice(0, 10)}…</a></> : "Leave proof is recorded on /proof once a member leaves between cycles."}</p>
          </Glow>
        </div>
      </div></section>

      <section className="section" id="proof"><div className="wrap">
        <p className="eyebrow">Measured, not claimed</p><h2 style={{ marginTop: 10 }}>Live numbers from the chain.</h2>
        <div className="cards" style={{ marginTop: 28 }} data-testid="proof-strip">
          {[[s?.joinTransactions ?? 0, "Joins, money and memory in one transaction"], [s?.contributions ?? 0, "Contributions verified on chain"], [s?.payouts ?? 0, "Payouts, each to the scheduled member"], [s?.x402Payments ?? 0, "Agent payments over x402"], [s?.memories ?? 0, "Memories written to Walrus, mainnet"], [`${s?.usdcMoved ?? 0} USDC`, "Moved through the contract"]].map(([v, l], i) => (
            <Glow key={i}><div className="big">{v}</div><p className="mono muted" style={{ marginTop: 8 }}>{l}</p></Glow>))}
        </div>
        <p style={{ marginTop: 20 }}><Link href="/proof">Verify it yourself on the proof page</Link></p>
      </div></section>

      <section className="section" style={{ background: "var(--vellum)" }}><div className="wrap">
        <p className="eyebrow">For judges</p><h2 style={{ marginTop: 10 }}>Sixty seconds, no wallet.</h2>
        <div className="row" style={{ marginTop: 24 }}><Link href="/judge" className="btn">Start the 60-second walk</Link><Link href="/proof" className="btn ghost">Open /proof</Link></div>
      </div></section>

      <footer className="footer"><div className="wrap row" style={{ justifyContent: "space-between" }}>
        <div><strong style={{ fontFamily: "var(--display)", fontSize: "1.25rem" }}>eranos</strong><p style={{ marginTop: 6 }}>Built on Walrus Memory and Tatum, on Sui mainnet.</p></div>
        <div className="row" style={{ gap: 20 }}><a href="https://github.com/0xkinno/eranos">GitHub</a><Link href="/proof">Proof</Link><Link href="/judge">Judge</Link><a href="https://github.com/0xkinno/eranos#readme">Docs</a></div>
      </div></footer>
    </>
  );
}
