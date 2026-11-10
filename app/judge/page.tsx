import Link from "next/link";
import { Glow } from "@/components/Glow";
import { circleView } from "@/lib/facts/stats";
import { PageHero } from "@/components/PageHero";
export const revalidate = 20;
export default async function Judge() {
  const c = await circleView().catch(() => null);
  const id = c?.id ?? "";
  const steps: [string, string, string, string][] = [
    ["See the circle", `/c/${id}`, "Open the circle", "The ring shows who has paid. The ember bead is whose turn it is. No wallet needed to read."],
    ["Check the round table", `/c/${id}`, "Round table", "Each paid-out round links to its mainnet transaction. The pot went to the scheduled member."],
    ["Flip memory off and on", "/#memory", "Memory switch", "One member's reminder times with and without the circle's memory, with the cited Walrus blobs."],
    ["Read the memory", `/c/${id}/memory`, "Known, Heard, Keeper", "Confirmed facts, the quarantine for model-extracted facts, and the keeper's verified outcomes."],
    ["Check membership agreement", "/proof", "Proof page", "Money roll and memory roll are compared live through Tatum. Every transaction is linked."],
    ["Pay a round with a wallet (optional)", `/c/${id}`, "Pay my round", "Connect Slush or Suiet. Gas is covered. Only members can pay."],
  ];
  return (
    <div className="app wrap">
      <PageHero eyebrow="For judges" title={<>The 60-second <em className="serif">walk</em></>}><p className="muted" style={{ maxWidth: "60ch" }}>A real circle on Sui mainnet with real payments. No wallet is needed for steps 1 to 5.</p></PageHero>
      <ol style={{ listStyle: "none", padding: 0, margin: "28px 0 0", display: "grid", gap: 14 }}>
        {steps.map(([t, href, cta, d], i) => (
          <li key={i}><Glow data-testid={`step-${i + 1}`}><div className="row" style={{ justifyContent: "space-between" }}><div><span className="mono muted">Step {i + 1}</span><h3 style={{ marginTop: 4 }}>{t}</h3><p className="muted" style={{ marginTop: 6 }}>{d}</p></div><Link href={href} className="btn ghost">{cta}</Link></div></Glow></li>))}
      </ol>
    </div>
  );
}
