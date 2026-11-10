import { Landing, type LandingData } from "@/components/Landing";
import { circleView, liveStats, evidence } from "@/lib/facts/stats";

export const revalidate = 30;
const isD = (d: unknown): d is string => typeof d === "string" && /^[1-9A-HJ-NP-Za-km-z]{43,44}$/.test(d);

export default async function Home() {
  const [c, s] = await Promise.all([circleView().catch(() => null), liveStats().catch(() => null)]);
  const ev = evidence();
  const n = c?.members.length ?? 5;
  const last = c?.payouts.at(-1);
  const paidNow = c ? (c.paid[String(c.currentRound)] ?? []) : [];
  const strip = last && c ? `Round ${last.round + 1} paid out to member ${c.members.indexOf(last.to) + 1} · ${c.contribution / 1e6} USDC x ${n} · verified`
    : c ? `Cycle ${c.cycle} · round ${c.currentRound + 1} open · ${paidNow.length} of ${n} paid` : "Reading the circle";
  const data: LandingData = {
    circleId: c?.id ?? "", members: c?.members ?? [], paid: c ? c.members.map((m) => paidNow.includes(m)) : [], turn: c && c.order.length ? c.members.indexOf(c.order[c.currentRound]) : 0,
    strip, contribution: c?.contribution ?? 100000, roll: c?.roll ?? { money: 0, memory: 0, agree: false, accessCounter: 0 },
    stats: { joinTransactions: s?.joinTransactions ?? 0, contributions: s?.contributions ?? 0, payouts: s?.payouts ?? 0, x402Payments: s?.x402Payments ?? 0, memories: s?.memories ?? 0, usdcMoved: s?.usdcMoved ?? 0 },
    recent: ev.filter((e) => isD(e.digest)).slice(-5).reverse().map((e) => ({ label: e.label.slice(0, 70), digest: e.digest as string })),
    leave: (ev.find((e) => e.label.startsWith("leave") && isD(e.digest))?.digest as string) ?? null,
  };
  return <Landing d={data} />;
}
