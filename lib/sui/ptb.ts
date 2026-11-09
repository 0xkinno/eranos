// Transaction builders. Memory membership and money membership change in one atomic PTB.
import { Transaction, coinWithBalance } from "@mysten/sui/transactions";
import { MEMWAL_PKG, MEMWAL_REGISTRY, USDC, SUI_CLOCK } from "@/lib/config";

type Pkgs = { eranosPkg: string };
const pure = (tx: Transaction, v: Uint8Array) => tx.pure.vector("u8", Array.from(v));

export function buildCreateMemoryAccountTx(p: { stewards: string }) {
  const tx = new Transaction();
  tx.setSender(p.stewards);
  tx.moveCall({ target: `${MEMWAL_PKG}::account::create_account`, arguments: [tx.object(MEMWAL_REGISTRY), tx.object(SUI_CLOCK)] });
  return tx;
}

export function buildAddDelegateTx(p: { stewards: string; memoryAccountId: string; key: Uint8Array; label: string }) {
  const tx = new Transaction();
  tx.setSender(p.stewards);
  tx.moveCall({
    target: `${MEMWAL_PKG}::account::add_delegate_key`,
    arguments: [tx.object(p.memoryAccountId), tx.object(MEMWAL_REGISTRY), pure(tx, p.key), tx.pure.string(p.label), tx.object(SUI_CLOCK)],
  });
  return tx;
}

export function buildCreateCircleTx(p: Pkgs & { stewards: string; memoryAccountId: string; name: string; contribution: bigint; roundMs: bigint; coinType?: string }) {
  const tx = new Transaction();
  tx.setSender(p.stewards);
  tx.moveCall({
    target: `${p.eranosPkg}::circle::create`,
    typeArguments: [p.coinType ?? USDC],
    arguments: [tx.pure.vector("u8", Array.from(new TextEncoder().encode(p.name))), tx.object(p.memoryAccountId), tx.pure.u64(p.contribution), tx.pure.u64(p.roundMs)],
  });
  return tx;
}

/** Join: add_delegate_key then circle::admit in the same PTB. Two Move calls, one digest. */
export function buildJoinTx(p: Pkgs & { stewards: string; circleId: string; memoryAccountId: string; member: string; memberKey: Uint8Array; label: string; skipMemory?: boolean }) {
  const tx = new Transaction();
  tx.setSender(p.stewards);
  if (!p.skipMemory) {
    tx.moveCall({
      target: `${MEMWAL_PKG}::account::add_delegate_key`,
      arguments: [tx.object(p.memoryAccountId), tx.object(MEMWAL_REGISTRY), pure(tx, p.memberKey), tx.pure.string(p.label), tx.object(SUI_CLOCK)],
    });
  }
  tx.moveCall({
    target: `${p.eranosPkg}::circle::admit`,
    typeArguments: [USDC],
    arguments: [tx.object(p.circleId), tx.object(p.memoryAccountId), tx.pure.address(p.member), pure(tx, p.memberKey)],
  });
  return tx;
}

/** Leave: remove_delegate_key (rotates access_counter_version) then circle::remove in the same PTB. */
export function buildLeaveTx(p: Pkgs & { stewards: string; circleId: string; memoryAccountId: string; member: string; memberKey: Uint8Array }) {
  const tx = new Transaction();
  tx.setSender(p.stewards);
  tx.moveCall({
    target: `${MEMWAL_PKG}::account::remove_delegate_key`,
    arguments: [tx.object(p.memoryAccountId), tx.object(MEMWAL_REGISTRY), pure(tx, p.memberKey)],
  });
  tx.moveCall({
    target: `${p.eranosPkg}::circle::remove`,
    typeArguments: [USDC],
    arguments: [tx.object(p.circleId), tx.object(p.memoryAccountId), tx.pure.address(p.member)],
  });
  return tx;
}

export function buildStartCycleTx(p: Pkgs & { stewards: string; circleId: string; order: string[] }) {
  const tx = new Transaction();
  tx.setSender(p.stewards);
  tx.moveCall({
    target: `${p.eranosPkg}::circle::start_cycle`,
    typeArguments: [USDC],
    arguments: [tx.object(p.circleId), tx.pure(bcsAddressVec(p.order)), tx.object(SUI_CLOCK)],
  });
  return tx;
}
import { bcs } from "@mysten/sui/bcs";
const bcsAddressVec = (a: string[]) => bcs.vector(bcs.Address).serialize(a).toBytes();

/** Pay a round for `member` (member == sender for a normal contribution). Coin is split from the sender's USDC. */
export function buildContributeForTx(p: Pkgs & { sender: string; circleId: string; round: number; member: string; amount: bigint; coinType?: string }) {
  const tx = new Transaction();
  tx.setSender(p.sender);
  const t = p.coinType ?? USDC;
  const coin = coinWithBalance({ type: t, balance: p.amount });
  tx.moveCall({
    target: `${p.eranosPkg}::circle::contribute_for`,
    typeArguments: [t],
    arguments: [tx.object(p.circleId), tx.pure.u64(p.round), tx.pure.address(p.member), coin, tx.object(SUI_CLOCK)],
  });
  return tx;
}

export function buildPayoutTx(p: Pkgs & { sender: string; circleId: string; round: number }) {
  const tx = new Transaction();
  tx.setSender(p.sender);
  tx.moveCall({ target: `${p.eranosPkg}::circle::payout`, typeArguments: [USDC], arguments: [tx.object(p.circleId), tx.pure.u64(p.round)] });
  return tx;
}
