// Creates the circle on mainnet: memory account (steward multisig), keeper delegate, Circle<USDC>, member joins.
// Each step is idempotent through .env.local. Usage: npx tsx scripts/setup-circle.ts <account|keeper|circle|join|p2|all>
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { T, STEWARDS, keeper, members, execSteward, evidence, setEnv } from "./chain";
import { buildCreateMemoryAccountTx, buildAddDelegateTx, buildCreateCircleTx, buildJoinTx } from "@/lib/sui/ptb";
import { deriveMemberKey } from "@/lib/memory/derive-key";
import { MemWal } from "@mysten-incubation/memwal";

const PKG = process.env.ERANOS_PKG!;
const created = (o: Awaited<ReturnType<typeof execSteward>>, sub: string) => (o.tx.effects?.changedObjects ?? []).find((c: { idOperation: string; objectId: string }) => c.idOperation === "Created" && (o.tx.objectTypes?.[c.objectId] ?? "").includes(sub))?.objectId;

async function account() {
  if (process.env.DEMO_MEMORY_ACCOUNT_ID) return console.log("account exists", process.env.DEMO_MEMORY_ACCOUNT_ID);
  const o = await execSteward(buildCreateMemoryAccountTx({ stewards: STEWARDS }));
  if (!o.success) throw new Error(o.error);
  const id = created(o, "::account::MemWalAccount")!;
  setEnv("DEMO_MEMORY_ACCOUNT_ID", id);
  evidence("create memory account (steward multisig 2 of 3)", o.digest, { account: id });
  console.log("account", id, o.digest);
}
async function keeperKey() {
  const acct = process.env.DEMO_MEMORY_ACCOUNT_ID!;
  const pub = await MemWal.create({ key: process.env.KEEPER_MEMWAL_KEY!, accountId: acct, serverUrl: "https://relayer.memory.walrus.xyz" }).getPublicKeyHex();
  const a = await T.getMemWalAccount(acct);
  console.log("keeper delegate pubkey", pub);
  setEnv("MEMWAL_AGENT_ID", pub);
  if (JSON.stringify(a.raw).includes(Buffer.from(pub, "hex").toString("base64")) || a.delegateKeys.length) return console.log("keeper already added?", a.delegateKeys.length);
  const o = await execSteward(buildAddDelegateTx({ stewards: STEWARDS, memoryAccountId: acct, key: Uint8Array.from(Buffer.from(pub, "hex")), label: "eranos-keeper" }));
  if (!o.success) throw new Error(o.error);
  evidence("add keeper delegate key (steward multisig)", o.digest, { keeperPublicKey: pub });
  console.log("keeper added", o.digest);
}
async function circle() {
  if (process.env.DEMO_CIRCLE_ID) return console.log("circle exists", process.env.DEMO_CIRCLE_ID);
  const o = await execSteward(buildCreateCircleTx({ eranosPkg: PKG, stewards: STEWARDS, memoryAccountId: process.env.DEMO_MEMORY_ACCOUNT_ID!, name: "Eranos demo circle", contribution: 100000n, roundMs: 20n * 60_000n }));
  if (!o.success) throw new Error(o.error);
  const id = created(o, "::circle::Circle")!;
  setEnv("DEMO_CIRCLE_ID", id);
  evidence("create Circle<USDC>, 0.1 USDC per round, 20 minute rounds", o.digest, { circle: id });
  console.log("circle", id, o.digest);
}
const keyFor = (m: Ed25519Keypair) => deriveMemberKey(async (b) => ({ signature: (await m.signPersonalMessage(b)).signature }), process.env.DEMO_CIRCLE_ID!);
async function join() {
  const acct = process.env.DEMO_MEMORY_ACCOUNT_ID!, circleId = process.env.DEMO_CIRCLE_ID!;
  const circleJson = (await T.getCircle(circleId)).json as { members?: string[] };
  for (const [i, m] of members.entries()) {
    const addr = m.toSuiAddress();
    if ((circleJson.members ?? []).includes(addr)) { console.log("member", i + 1, "already joined"); continue; }
    const k = await keyFor(m);
    const o = await execSteward(buildJoinTx({ eranosPkg: PKG, stewards: STEWARDS, circleId, memoryAccountId: acct, member: addr, memberKey: k.publicKey, label: `member-${i + 1}` }));
    if (!o.success) throw new Error(o.error);
    const a = await T.getMemWalAccount(acct);
    evidence(`join member ${i + 1}: add_delegate_key + circle::admit in one PTB`, o.digest, { member: addr, memberKey: k.publicKeyHex, commands: 2, gas: o.tx.effects?.gasUsed, accessCounter: a.accessCounterVersion });
    console.log("joined", i + 1, o.digest);
  }
}
/** P2: admit without add_delegate_key. Executed without simulation so the failure is recorded on chain. */
async function p2() {
  const acct = process.env.DEMO_MEMORY_ACCOUNT_ID!, circleId = process.env.DEMO_CIRCLE_ID!;
  const stranger = Ed25519Keypair.generate();
  const o = await execSteward(buildJoinTx({ eranosPkg: PKG, stewards: STEWARDS, circleId, memoryAccountId: acct, member: stranger.toSuiAddress(), memberKey: stranger.getPublicKey().toRawBytes(), label: "p2", skipMemory: true }), { skipSim: true });
  console.log("P2 success?", o.success, o.error);
  evidence("P2 refused admit without memory key", o.digest, { success: o.success, error: o.error, expectedAbort: "EMemoryNotGranted (12)" });
}
(async () => {
  const step = process.argv[2] ?? "all";
  if (step === "account" || step === "all") await account();
  if (step === "keeper" || step === "all") await keeperKey();
  if (step === "circle" || step === "all") await circle();
  if (step === "join" || step === "all") await join();
  if (step === "p2") await p2();
})().catch((e) => { console.error(String(e?.message ?? e).slice(0, 900)); process.exit(1); });
