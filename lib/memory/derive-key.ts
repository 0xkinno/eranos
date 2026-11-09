// Member delegate key derived from a wallet signature over a fixed message.
// Ed25519 signatures are deterministic (RFC 8032): the same wallet re-derives the same key on any device.
// zkLogin signatures are not deterministic: those wallets must store a random key encrypted in IndexedDB (not implemented here).
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

export const derivationMessage = (circleId: string) =>
  new TextEncoder().encode(
    `Eranos memory key v1\ncircle: ${circleId}\nThis signature creates your key to this circle's memory. It moves no money.`,
  );

const b64ToBytes = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
const toHex = (u: Uint8Array) => Array.from(u, (b) => b.toString(16).padStart(2, "0")).join("");

/** Pure: signature bytes in, key out. The serialized Sui signature is flag||sig||pubkey; only the 64-byte sig is used. */
export function keyFromSignature(signatureB64: string, circleId: string) {
  const raw = b64ToBytes(signatureB64);
  if (raw[0] !== 0x00) throw new Error("memory key derivation needs an Ed25519 wallet (zkLogin and other schemes are not deterministic)");
  const sig = raw.slice(1, 65);
  const seed = hkdf(sha256, sig, new TextEncoder().encode(circleId), new TextEncoder().encode("eranos-memwal-delegate"), 32);
  const kp = Ed25519Keypair.fromSecretKey(seed);
  return { privateKeyHex: toHex(seed), publicKey: kp.getPublicKey().toRawBytes(), publicKeyHex: toHex(kp.getPublicKey().toRawBytes()), suiAddress: kp.toSuiAddress() };
}

export async function deriveMemberKey(
  signPersonalMessage: (m: Uint8Array) => Promise<{ signature: string }>,
  circleId: string,
) {
  const { signature } = await signPersonalMessage(derivationMessage(circleId));
  return keyFromSignature(signature, circleId);
}
