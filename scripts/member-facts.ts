// Each demo member states a fact about themselves with their OWN derived delegate key, through the /api/mw proxy.
import { members, evidence } from "./chain";
import { MemWal } from "@mysten-incubation/memwal";
import { deriveMemberKey } from "@/lib/memory/derive-key";
import { formatLine } from "@/lib/memory/format";
const FACTS: Record<number, { pays_at: string; text: string; tz: string }> = {
  2: { pays_at: "0.8", tz: "America/Chicago", text: "Member 2 gets paid late in each round, about 80 percent through" },
  3: { pays_at: "0.3", tz: "Africa/Lagos", text: "Member 3 has money available early, about 30 percent into each round" },
  4: { pays_at: "0.5", tz: "Africa/Accra", text: "Member 4 gets paid mid round, about 50 percent through" },
  5: { pays_at: "0.9", tz: "Europe/London", text: "Member 5 gets paid at the end of each round, about 90 percent through" },
};
(async () => {
  const base = process.argv[2] ?? "http://localhost:3111/api/mw";
  for (const [i, f] of Object.entries(FACTS)) {
    const m = members[Number(i) - 1];
    const k = await deriveMemberKey(async (b) => ({ signature: (await m.signPersonalMessage(b)).signature }), process.env.DEMO_CIRCLE_ID!);
    const mem = MemWal.create({ key: k.privateKeyHex, accountId: process.env.DEMO_MEMORY_ACCOUNT_ID!, serverUrl: base, namespace: "known" });
    const text = formatLine({ type: "fact", date: new Date().toISOString().slice(0, 10), attrs: { by: m.toSuiAddress(), about: m.toSuiAddress(), pays_at: f.pays_at, tz: f.tz, confirmed: "own-key" }, text: f.text });
    const r = await mem.rememberAndWait(text, { namespace: "known", idempotencyKey: `fact:payday:${m.toSuiAddress()}` } as never);
    console.log("member", i, r.blob_id);
    evidence(`member ${i} states a payday fact with their own delegate key via /api/mw`, r.blob_id, { memberKey: k.publicKeyHex });
  }
})().catch((e) => { console.error(String(e?.message ?? e).slice(0, 600)); process.exit(1); });
