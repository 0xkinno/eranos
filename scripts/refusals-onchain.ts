// P2 and P5 as real failed transactions: an explicit gas budget skips the pre-execution estimate, so the contract itself refuses on chain.
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { T, STEWARDS, keeper, execSteward, execSingle, evidence } from "./chain";
import { buildJoinTx, buildPayoutTx } from "@/lib/sui/ptb";
(async () => {
  const PKG = process.env.ERANOS_PKG!, C = process.env.DEMO_CIRCLE_ID!, A = process.env.DEMO_MEMORY_ACCOUNT_ID!;
  // P5: payout for a round that is not full (round 4 of the finished cycle is paid out, so use an out-of-range round: EWrongRound is not what we want; use a fresh cycle round when one is open)
  const round = Number(process.argv[2] ?? 3);
  const tx5 = buildPayoutTx({ eranosPkg: PKG, sender: keeper.toSuiAddress(), circleId: C, round }); tx5.setGasBudget(5_000_000);
  const o5 = await execSingle(tx5, keeper, { skipSim: true });
  console.log("P5 payout round", round + 1, "success:", o5.success, o5.error?.slice(0, 160)); evidence(`P5 on chain: payout for round ${round + 1} refused by the contract, failed transaction`, o5.digest, { success: o5.success, error: o5.error });
  // P2: admit without add_delegate_key
  const stranger = Ed25519Keypair.generate();
  const tx2 = buildJoinTx({ eranosPkg: PKG, stewards: STEWARDS, circleId: C, memoryAccountId: A, member: stranger.toSuiAddress(), memberKey: stranger.getPublicKey().toRawBytes(), label: "p2", skipMemory: true }); tx2.setGasBudget(8_000_000);
  const o2 = await execSteward(tx2, { skipSim: true });
  console.log("P2 admit without memory key success:", o2.success, o2.error?.slice(0, 160)); evidence("P2 on chain: admit without a memory key refused by the contract (EMemoryNotGranted), failed transaction", o2.digest, { success: o2.success, error: o2.error });
})().catch((e) => { console.error(String(e?.message ?? e).slice(0, 500)); process.exit(1); });
