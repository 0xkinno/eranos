// Runs the current cycle of the demo circle in real time: members pay their rounds, the keeper tick verifies, writes memory and pays out.
import { execSync } from "node:child_process";
import { T } from "./chain";
const CIRCLE = process.env.DEMO_CIRCLE_ID!, PKG = process.env.ERANOS_PKG!;
const ALL = [1, 2, 3, 4, 5].map((i) => process.env[`MEMBER_${i}_ADDRESS`]!);
const run = (c: string) => { try { return execSync(c, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 280_000 }); } catch (e) { return "ERR " + String((e as { stdout?: string }).stdout ?? e).slice(-300); } };
(async () => {
  const circ = (await T.getCircle(CIRCLE)).json as { cycle: string; cycle_start_ms: string; round_ms: string; members: string[] };
  const cycle = circ.cycle, start = Number(circ.cycle_start_ms), rms = Number(circ.round_ms), n = circ.members.length;
  const idx = circ.members.map((a) => ALL.indexOf(a) + 1); // original member numbers (key slots)
  console.log("driving cycle", cycle, "members", idx.join(","));
  for (;;) {
    const now = Date.now();
    const done = new Set((await T.queryEvents(`${PKG}::circle::Contributed`, 343633600)).filter((e) => e.json.cycle === cycle).map((e) => `${e.json.round}:${ALL.indexOf(e.json.member) + 1}`));
    let acted = false;
    for (let r = 0; r < n; r++) {
      const open = start + r * rms;
      for (const [k, m] of idx.entries()) {
        if (done.has(`${r}:${m}`)) continue;
        if (now >= open + 30_000 + k * 8_000) { let out = ""; for (let t = 0; t < 3 && !/pay true/.test(out); t++) out = run(`npx tsx scripts/cycle.ts pay ${m} ${r}`); console.log(new Date().toISOString(), "pay", m, r, out.trim().split("\n").pop()); acted = true; }
      }
    }
    if (acted || Math.floor(now / 45_000) % 3 === 0) { console.log(new Date().toISOString(), "keeper tick"); console.log(run("npx tsx scripts/keeper.ts").split("\n").filter((l) => /verified|payouts|refused|ERR/.test(l)).join(" ").slice(0, 200)); }
    const st = (await T.getCircle(CIRCLE)).json as { paid_out: boolean[] };
    if (st.paid_out.length === n && st.paid_out.every(Boolean)) { run("npx tsx scripts/keeper.ts"); console.log("cycle complete"); break; }
    await new Promise((r) => setTimeout(r, 45_000));
  }
})();
