// Circle operations on mainnet. Usage:
//   npx tsx scripts/cycle.ts start            steward multisig starts a cycle (join order, or --order 3,1,2,...)
//   npx tsx scripts/cycle.ts pay <m> <round>  member m (1..5) pays the round, gas sponsored by the keeper
//   npx tsx scripts/cycle.ts payout <round>   keeper calls permissionless payout
//   npx tsx scripts/cycle.ts state
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { T, STEWARDS, keeper, members, execSteward, execSingle, evidence } from "./chain";
import { buildStartCycleTx, buildContributeForTx, buildPayoutTx } from "@/lib/sui/ptb";
import { sponsorTx } from "@/lib/sui/sponsor";
import { USDC } from "@/lib/config";

const PKG = process.env.ERANOS_PKG!, CIRCLE = process.env.DEMO_CIRCLE_ID!;
const addr = members.map((m) => m.toSuiAddress());

export async function sponsoredPay(m: Ed25519Keypair, round: number, member = m.toSuiAddress()) {
  const coins = await T.client.core.listCoins({ owner: keeper.toSuiAddress(), coinType: "0x2::sui::SUI" });
  const gas = coins.objects.sort((a, b) => Number(BigInt(b.balance) - BigInt(a.balance))).slice(0, 1).map((c) => ({ objectId: c.objectId, version: c.version, digest: c.digest }));
  const tx = buildContributeForTx({ eranosPkg: PKG, sender: m.toSuiAddress(), circleId: CIRCLE, round, member, amount: 100000n });
  const { bytes, keeperSig } = await sponsorTx(tx, { member: m.toSuiAddress(), keeper, gasCoins: gas, budgetMist: 20_000_000, client: T.client });
  const memberSig = (await m.signTransaction(bytes)).signature;
  const res = await T.execute(bytes, [memberSig, keeperSig]);
  const r = res.$kind === "Transaction" ? res.Transaction : res.FailedTransaction;
  return { digest: r.digest, success: res.$kind === "Transaction" && r.status.success, error: JSON.stringify(r.status.error), gas: r.effects?.gasUsed };
}

(async () => {
  const [cmd, a, b] = process.argv.slice(2);
  if (cmd === "start") {
    const oi = process.argv.indexOf("--order");
    const order = oi > 0 ? process.argv[oi + 1].split(",").map((i) => addr[Number(i) - 1]) : addr;
    const o = await execSteward(buildStartCycleTx({ eranosPkg: PKG, stewards: STEWARDS, circleId: CIRCLE, order }));
    console.log("start", o.success, o.digest, o.error ?? "");
    if (o.success) evidence("start cycle (steward multisig)", o.digest, { order: order.map((x) => addr.indexOf(x) + 1) });
  } else if (cmd === "pay") {
    const r = await sponsoredPay(members[Number(a) - 1], Number(b));
    console.log("pay", r.success, r.digest, r.success ? "" : r.error);
    if (r.success) evidence(`member ${a} pays round ${b}, 0.1 USDC, keeper sponsors gas`, r.digest, { gas: r.gas });
  } else if (cmd === "payout") {
    const o = await execSingle(buildPayoutTx({ eranosPkg: PKG, sender: keeper.toSuiAddress(), circleId: CIRCLE, round: Number(a) }), keeper);
    console.log("payout", o.success, o.digest, o.error ?? "");
    if (o.success) evidence(`payout round ${a}`, o.digest);
  } else if (cmd === "state") {
    console.log(JSON.stringify((await T.getCircle(CIRCLE)).json, null, 1).slice(0, 1500));
  }
})().catch((e) => { console.error(String(e?.message ?? e).slice(0, 900)); process.exit(1); });
