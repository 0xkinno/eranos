// Runs cycle 1 of the demo circle in real time: members pay their rounds, the keeper tick verifies, writes memory and pays out.
// Member 2 pays late (90 seconds after the deadline) in rounds 1 and 2 so the learning loop has real late history.
import { execSync } from "node:child_process";
import { T } from "./chain";
const CIRCLE = process.env.DEMO_CIRCLE_ID!, PKG = process.env.ERANOS_PKG!;
const run = (c: string) => { try { return execSync(c, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 280_000 }); } catch (e) { return String((e as { stdout?: string }).stdout ?? e).slice(-300); } };
const lateM2 = new Set([1, 2]);
// Member 5 round 3 is left for the Playwright wallet test to pay through the UI. The driver pays it itself if still unpaid 4 minutes before the deadline.
const heldForUi = (m: number, r: number, now: number, deadline: number) => m === 5 && r === 3 && now < deadline - 240_000;
(async () => {
  const circ = (await T.getCircle(CIRCLE)).json as { cycle_start_ms: string; round_ms: string; members: string[] };
  const start = Number(circ.cycle_start_ms), rms = Number(circ.round_ms), n = circ.members.length;
  const done = new Set<string>();
  for (;;) {
    const now = Date.now();
    const ev = await T.queryEvents(`${PKG}::circle::Contributed`, 343633600);
    for (const e of ev) done.add(`${e.json.round}:${circ.members.indexOf(e.json.member) + 1}`);
    let acted = false;
    for (let r = 0; r < n; r++) {
      const open = start + r * rms, deadline = open + rms;
      for (let m = 1; m <= n; m++) {
        if (done.has(`${r}:${m}`) || heldForUi(m, r, now, deadline)) continue;
        const at = m === 2 && lateM2.has(r) ? deadline + 90_000 : open + 30_000 + m * 8_000;
        if (now >= at) { console.log(new Date().toISOString(), "pay", m, r, run(`npx tsx scripts/cycle.ts pay ${m} ${r}`).trim().split("\n").pop()); done.add(`${r}:${m}`); acted = true; }
      }
    }
    if (acted || now % 3 === 0) { console.log(new Date().toISOString(), "keeper tick"); console.log(run("npx tsx scripts/keeper.ts").split("\n").filter((l) => /verified|payouts|refused/.test(l)).join(" ").slice(0, 200)); }
    if (done.size >= n * n && now > start + n * rms) { run("npx tsx scripts/keeper.ts"); console.log("cycle complete"); break; }
    await new Promise((r) => setTimeout(r, 45_000));
  }
})();
