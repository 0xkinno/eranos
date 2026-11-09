// Steward multisig: 2 of 3 Ed25519 keys own the circle's memory account and the circle's admin rights.
import { MultiSigPublicKey } from "@mysten/sui/multisig";
import { Ed25519PublicKey } from "@mysten/sui/keypairs/ed25519";
import { verifyTransactionSignature } from "@mysten/sui/verify";
import { blake2b } from "@noble/hashes/blake2.js";
import { toBase58 } from "@mysten/sui/utils";

export const THRESHOLD = 2;

export function stewardsKey(pubkeysBase64: string[], threshold = THRESHOLD) {
  if (pubkeysBase64.length !== 3) throw new Error("exactly 3 stewards");
  return MultiSigPublicKey.fromPublicKeys({
    threshold,
    publicKeys: pubkeysBase64.map((b64) => ({ publicKey: new Ed25519PublicKey(b64), weight: 1 })),
  });
}
export const stewardAddress = (pubkeysBase64: string[]) => stewardsKey(pubkeysBase64).toSuiAddress();

/** The digest a steward's wallet shows and signs: blake2b of the intent-wrapped tx bytes (same as Sui's transaction digest). */
export function txDigest(txBytes: Uint8Array): string {
  const typeTag = new TextEncoder().encode("TransactionData::");
  const data = new Uint8Array(typeTag.length + txBytes.length);
  data.set(typeTag); data.set(txBytes, typeTag.length);
  return toBase58(blake2b(data, { dkLen: 32 }));
}

/** Verifies one steward's partial signature over the exact bytes and that it came from a listed steward. */
export async function verifyPartial(txBytes: Uint8Array, signatureB64: string, pubkeysBase64: string[]): Promise<{ stewardIndex: number; address: string }> {
  const pk = await verifyTransactionSignature(txBytes, signatureB64);
  const idx = pubkeysBase64.findIndex((b) => new Ed25519PublicKey(b).toSuiAddress() === pk.toSuiAddress());
  if (idx < 0) throw new Error("signature is not from a steward");
  return { stewardIndex: idx, address: pk.toSuiAddress() };
}

export interface PartialSet { [stewardIndex: number]: string }

/** Combines once the threshold of distinct stewards signed the same bytes. */
export async function combine(txBytes: Uint8Array, partials: PartialSet, pubkeysBase64: string[]): Promise<string> {
  const msk = stewardsKey(pubkeysBase64);
  const sigs: string[] = [];
  const seen = new Set<number>();
  for (const sig of Object.values(partials)) {
    const { stewardIndex } = await verifyPartial(txBytes, sig, pubkeysBase64);
    if (seen.has(stewardIndex)) continue;
    seen.add(stewardIndex);
    sigs.push(sig);
  }
  if (sigs.length < THRESHOLD) throw new Error(`need ${THRESHOLD} steward signatures, have ${sigs.length}`);
  return msk.combinePartialSignatures(sigs.slice(0, THRESHOLD));
}
