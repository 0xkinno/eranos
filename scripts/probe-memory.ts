import { members, evidence } from "./chain";
import { MemWal } from "@mysten-incubation/memwal";
import { deriveMemberKey } from "@/lib/memory/derive-key";
import { formatLine } from "@/lib/memory/format";
(async () => {
  const acct = process.env.DEMO_MEMORY_ACCOUNT_ID!, circle = process.env.DEMO_CIRCLE_ID!;
  const m = members[0];
  const k = await deriveMemberKey(async (b) => ({ signature: (await m.signPersonalMessage(b)).signature }), circle);
  const serverUrl = process.argv[2] ?? "https://relayer.memory.walrus.xyz";
  const member = MemWal.create({ key: k.privateKeyHex, accountId: acct, serverUrl, namespace: "known" });
  const keeper = MemWal.create({ key: process.env.KEEPER_MEMWAL_KEY!, accountId: acct, serverUrl: "https://relayer.memory.walrus.xyz", namespace: "known" });
  console.log("health", (await member.health()).status, "compat", (await member.compatibility()).apiVersion);
  const text = formatLine({ type: "fact", date: new Date().toISOString().slice(0, 10), attrs: { by: m.toSuiAddress(), about: m.toSuiAddress(), pays_at: "0.6", tz: "UTC", confirmed: "self" }, text: `Member 1 has money available about 60 percent into each round (probe ${Date.now()})` });
  const t0 = Date.now();
  const r = await member.rememberAndWait(text, "known");
  const tWrite = Date.now() - t0;
  console.log("write", tWrite, "ms", JSON.stringify(r));
  let seen = -1; const t1 = Date.now();
  for (let i = 0; i < 40; i++) {
    const res = await keeper.recall({ query: "member 1 money available", limit: 5, namespace: "known" } as never);
    if (res.results.some((x) => x.blob_id === r.blob_id)) { seen = Date.now() - t1; break; }
    await new Promise((x) => setTimeout(x, 500));
  }
  console.log("keeper recall of member write after", seen, "ms");
  evidence("member-signed remember to known (direct relayer)", r.blob_id, { memberKeyHex: k.publicKeyHex, writeMs: tWrite, keeperSeesAfterMs: seen, serverUrl });
})().catch((e) => { console.error(String(e?.message ?? e).slice(0, 900)); process.exit(1); });
