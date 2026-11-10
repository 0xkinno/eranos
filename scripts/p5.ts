// P5: a payout that is not allowed is refused by the contract. Round 3 is not full, so payout must abort with ERoundNotFull (6).
import { keeper, T, evidence } from "./chain";
import { buildPayoutTx } from "@/lib/sui/ptb";
(async () => {
  const round = Number(process.argv[2] ?? 4);
  try {
    const tx = buildPayoutTx({ eranosPkg: process.env.ERANOS_PKG!, sender: keeper.toSuiAddress(), circleId: process.env.DEMO_CIRCLE_ID!, round });
    await tx.build({ client: T.client });
    console.log("UNEXPECTED: payout was accepted");
  } catch (e) { const m = String((e as Error).message); console.log("refused:", m.slice(0, 300)); evidence(`P5 payout for round ${round + 1} before it is full refused by the contract`, null, { error: m.slice(0, 220), expectedAbort: "ERoundNotFull (6)" }); }
})();
