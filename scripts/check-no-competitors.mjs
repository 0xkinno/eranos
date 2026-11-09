// Fails if any competitor name from reference/BANNED_NAMES.txt (or env BANNED_NAMES, comma separated) appears in the tracked tree.
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
let names = [];
if (existsSync("reference/BANNED_NAMES.txt")) names = readFileSync("reference/BANNED_NAMES.txt", "utf8").split("\n");
else if (process.env.BANNED_NAMES) names = process.env.BANNED_NAMES.split(",");
names = names.map((s) => s.trim()).filter(Boolean);
if (!names.length) { console.log("check-no-competitors: no list available, skipped"); process.exit(0); }
const files = execSync("git ls-files -co --exclude-standard", { encoding: "utf8" }).split("\n").filter(Boolean)
  .filter((f) => !f.startsWith("reference/") && !f.endsWith("package-lock.json") && !f.endsWith("pnpm-lock.yaml"));
let bad = 0;
for (const f of files) {
  let t; try { t = readFileSync(f, "utf8"); } catch { continue; }
  for (const n of names) if (new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(t)) { console.error(`${f}: contains banned name "${n}"`); bad++; }
}
if (bad) process.exit(1);
console.log(`check-no-competitors ok (${files.length} files, ${names.length} names)`);
