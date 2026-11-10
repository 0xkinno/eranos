// P6 and P7: a member leaves between cycles. Same key, same request, before and after. Run only when the cycle is complete.
// Usage: npx tsx scripts/prove-leave.ts <memberIndex 1..5>
import { MemWal } from "@mysten-incubation/memwal";
import { members, STEWARDS, execSteward, evidence, T } from "./chain";
import { deriveMemberKey } from "@/lib/memory/derive-key";
import { buildLeaveTx } from "@/lib/sui/ptb";

(async () => {
  const mi = Number(process.argv[2] ?? 5), m = members[mi - 1];
  const acct = process.env.DEMO_MEMORY_ACCOUNT_ID!, circleId = process.env.DEMO_CIRCLE_ID!;
  const k = await deriveMemberKey(async (b) => ({ signature: (await m.signPersonalMessage(b)).signature }), circleId);
  const client = () => MemWal.create({ key: k.privateKeyHex, accountId: acct, serverUrl: "https://relayer.memory.walrus.xyz", namespace: "known" });
  const attempt = async () => { try { const r = await client().recall({ query: "member paid round outcome", limit: 3, namespace: "known" } as never); return { ok: true, results: r.results.length, total: r.total }; } catch (e) { const x = e as { status?: number; message?: string; name?: string }; return { ok: false, status: x.status, name: x.name, message: String(x.message).slice(0, 300) }; } };
  const ctr0 = (await T.getMemWalAccount(acct)).accessCounterVersion;
  const before = await attempt();
  console.log("before leave:", JSON.stringify(before), "access counter", ctr0);
  const o = await execSteward(buildLeaveTx({ eranosPkg: process.env.ERANOS_PKG!, stewards: STEWARDS, circleId, memoryAccountId: acct, member: m.toSuiAddress(), memberKey: k.publicKey }));
  if (!o.success) throw new Error(o.error);
  await new Promise((r) => setTimeout(r, 6000));
  const ctr1 = (await T.getMemWalAccount(acct)).accessCounterVersion;
  console.log("leave tx", o.digest, "access counter", ctr0, "->", ctr1);
  let after = await attempt();
  for (let i = 0; i < 5 && after.ok; i++) { await new Promise((r) => setTimeout(r, 8000)); after = await attempt(); } // the relayer may cache the delegate set briefly
  console.log("after leave:", JSON.stringify(after));
  evidence(`leave member ${mi}: remove_delegate_key and circle::remove in one PTB`, o.digest, { member: m.toSuiAddress(), accessCounterBefore: ctr0, accessCounterAfter: ctr1, commands: 2, gas: o.tx.effects?.gasUsed });
  evidence(`P7 same key and request before and after leave (member ${mi})`, null, { before, after, note: "same derived key, same recall request, same relayer" });
})().catch((e) => { console.error(String(e?.message ?? e).slice(0, 600)); process.exit(1); });
