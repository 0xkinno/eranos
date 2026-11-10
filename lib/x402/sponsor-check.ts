// Before the keeper adds a gas signature, the transaction must be a plain contribution and nothing else.
// A sponsored sender must not be able to use the keeper's gas coin for anything but gas.
import { Transaction } from "@mysten/sui/transactions";
import { normalizeSuiAddress } from "@mysten/sui/utils";

export interface SponsorPolicy { keeper: string; target: string; maxBudget: bigint }
export type SponsorCheck = { ok: true; sender: string } | { ok: false; why: string };

export function checkSponsorable(bytes: Uint8Array, p: SponsorPolicy): SponsorCheck {
  let d: ReturnType<Transaction["getData"]>;
  try { d = Transaction.from(bytes).getData(); } catch { return { ok: false, why: "unparseable transaction" }; }
  if (!d.sender) return { ok: false, why: "no sender" };
  if (!d.gasData.owner || normalizeSuiAddress(d.gasData.owner) !== normalizeSuiAddress(p.keeper)) return { ok: false, why: "gas owner is not the keeper" };
  if (normalizeSuiAddress(d.sender) === normalizeSuiAddress(p.keeper)) return { ok: false, why: "sender must not be the keeper" };
  if (BigInt(d.gasData.budget ?? 0) > p.maxBudget) return { ok: false, why: "gas budget above the sponsor cap" };
  const [pkg, mod, fn] = p.target.split("::");
  let calls = 0;
  for (const c of d.commands) {
    if (c.$kind === "SplitCoins" || c.$kind === "MergeCoins") {
      const args = c.$kind === "SplitCoins" ? [c.SplitCoins.coin] : [c.MergeCoins.destination, ...c.MergeCoins.sources];
      if (args.some((a) => a.$kind === "GasCoin")) return { ok: false, why: "gas coin used as a payment coin" };
    } else if (c.$kind === "MoveCall") {
      const m = c.MoveCall;
      if (normalizeSuiAddress(m.package) !== normalizeSuiAddress(pkg) || m.module !== mod || m.function !== fn) return { ok: false, why: `only ${p.target} may be called` };
      calls++;
    } else return { ok: false, why: `command ${c.$kind} is not allowed` };
  }
  if (calls !== 1) return { ok: false, why: "exactly one contribute_for call is required" };
  const gasUsedAsArg = JSON.stringify(d.commands).includes('"GasCoin"');
  if (gasUsedAsArg) return { ok: false, why: "gas coin referenced by a command" };
  return { ok: true, sender: d.sender };
}
