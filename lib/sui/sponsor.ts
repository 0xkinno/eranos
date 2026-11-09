// Sponsored gas: the member signs as sender, the keeper signs as gas owner. A per-member per-round cap bounds the keeper's exposure.
import type { Transaction } from "@mysten/sui/transactions";
import type { Keypair } from "@mysten/sui/cryptography";

export interface CapStore { get(key: string): Promise<number>; incr(key: string, by: number): Promise<number> }
export class MemoryCapStore implements CapStore {
  m = new Map<string, number>();
  async get(k: string) { return this.m.get(k) ?? 0; }
  async incr(k: string, by: number) { const v = (this.m.get(k) ?? 0) + by; this.m.set(k, v); return v; }
}
export const capKey = (circle: string, cycle: number, round: number, member: string) => `sponsor:${circle}:${cycle}:${round}:${member}`;
export class SponsorCapError extends Error {}

/** Reserve gas budget before sponsoring. Throws when the member's cap for this round would be exceeded. */
export async function reserveGas(store: CapStore, p: { circle: string; cycle: number; round: number; member: string; budgetMist: number; capMist: number }) {
  const k = capKey(p.circle, p.cycle, p.round, p.member);
  const used = await store.get(k);
  if (used + p.budgetMist > p.capMist) throw new SponsorCapError(`gas cap reached for this member in this round (${used} of ${p.capMist} MIST used)`);
  await store.incr(k, p.budgetMist);
}
export async function refundGas(store: CapStore, p: { circle: string; cycle: number; round: number; member: string; budgetMist: number }) {
  await store.incr(capKey(p.circle, p.cycle, p.round, p.member), -p.budgetMist);
}

/** Prepare a sponsored transaction: member is sender, keeper owns the gas. Returns bytes for the member to sign, and the keeper signature. */
export async function sponsorTx(tx: Transaction, p: { member: string; keeper: Keypair; gasCoins: { objectId: string; version: string; digest: string }[]; budgetMist: number; client: Parameters<Transaction["build"]>[0] extends infer O ? O extends { client?: infer C } ? C : never : never }) {
  tx.setSender(p.member);
  tx.setGasOwner(p.keeper.toSuiAddress());
  tx.setGasPayment(p.gasCoins);
  tx.setGasBudget(p.budgetMist);
  const bytes = await tx.build({ client: p.client });
  const keeperSig = (await p.keeper.signTransaction(bytes)).signature;
  return { bytes, keeperSig };
}
