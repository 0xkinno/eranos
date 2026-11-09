import "./env";
import { tatum } from "@/lib/tatum/sui";
import { USDC } from "@/lib/config";
(async () => {
const t = tatum();
const names: Record<string, string> = { STEWARD_MULTISIG_ADDRESS: "steward multisig", KEEPER_SUI_ADDRESS: "keeper", MEMBER_1_ADDRESS: "member1", MEMBER_2_ADDRESS: "member2", MEMBER_3_ADDRESS: "member3", MEMBER_4_ADDRESS: "member4", MEMBER_5_ADDRESS: "member5" };
for (const [k, label] of Object.entries(names)) {
  const owner = process.env[k]!;
  const sui = await t.client.core.getBalance({ owner });
  const usdc = await t.client.core.getBalance({ owner, coinType: USDC });
  console.log(label.padEnd(17), "SUI", (Number(sui.balance.balance) / 1e9).toFixed(4).padStart(9), " USDC", (Number(usdc.balance.balance) / 1e6).toFixed(2).padStart(7));
}
console.log(JSON.stringify(t.status().tatumCalls), t.provider);
})();
