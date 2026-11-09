// heard -> known promotion. A model's guess never becomes decision memory without the subject's signature.
import { verifyPersonalMessageSignature } from "@mysten/sui/verify";
import { sha256 } from "@noble/hashes/sha2.js";
import type { MemLine, StoredMemory } from "./format";

export const confirmMessage = (circleId: string, heardId: string, text: string) =>
  new TextEncoder().encode(`Eranos confirm v1\ncircle: ${circleId}\nmemory: ${heardId}\nfact: ${text}\nThis signature confirms the fact above is about you and true. It moves no money.`);

const hex8 = (b: Uint8Array) => Array.from(b.slice(0, 4), (x) => x.toString(16).padStart(2, "0")).join("");
export const sigRef = (signatureB64: string) => "sig#" + hex8(sha256(new TextEncoder().encode(signatureB64)));

export class PolicyError extends Error {}

/** Verifies the subject signed this exact heard line, then returns the `known` line to write. */
export async function promoteHeard(p: {
  circleId: string; heard: StoredMemory; signatureB64: string; today: string; editedText?: string;
}): Promise<MemLine> {
  if (p.heard.type !== "heard") throw new PolicyError("only heard lines can be promoted");
  const about = p.heard.attrs.about;
  if (!about) throw new PolicyError("heard line has no subject");
  const text = (p.editedText ?? p.heard.text).trim();
  const pk = await verifyPersonalMessageSignature(confirmMessage(p.circleId, p.heard.id, text), p.signatureB64).catch(() => null);
  if (!pk) throw new PolicyError("signature does not verify");
  if (pk.toSuiAddress() !== about) throw new PolicyError("signature is not from the member this fact is about");
  const attrs: Record<string, string> = { by: about, about, confirmed: sigRef(p.signatureB64), from: p.heard.id };
  for (const k of ["payday", "pays_at", "tz", "lang", "needs_round"]) if (p.heard.attrs[k] && p.editedText === undefined) attrs[k] = p.heard.attrs[k];
  return { type: "fact", date: p.today, attrs, text };
}

/** Decisions read only confirmed facts, agreements and verified outcomes. Never `heard`. */
export function decisionMemories(items: StoredMemory[]): StoredMemory[] {
  return items.filter((i) => {
    if (i.type === "heard") return false;
    if (i.type === "fact") return Boolean(i.attrs.confirmed);
    return true;
  });
}
