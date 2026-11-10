import { Transaction } from "@mysten/sui/transactions";
import { keeper, execSingle, evidence } from "./chain";
(async () => {
  const tx = new Transaction();
  const parts = tx.splitCoins(tx.gas, [40_000_000, 40_000_000, 40_000_000, 40_000_000]);
  tx.transferObjects([parts[0], parts[1], parts[2], parts[3]], keeper.toSuiAddress());
  const o = await execSingle(tx, keeper);
  console.log(o.success, o.digest);
  evidence("keeper splits a 4 coin sponsor gas pool (0.04 SUI each)", o.digest);
})();
