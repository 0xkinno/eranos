// House style gate: no em/en dashes, no emoji, no hype words in tracked text files.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
const files = execSync("git ls-files -co --exclude-standard", { encoding: "utf8" }).split("\n").filter(Boolean)
  .filter((f) => /\.(md|mdx|tsx?|jsx?|mjs|json|svg|html|css|move|yml|yaml|txt)$/.test(f))
  .filter((f) => !/^(package-lock|pnpm-lock)/.test(f) && !f.startsWith("scripts/check-copy.mjs") && !f.startsWith("move/eranos/build"));
const EM = "—", EN = "–";
const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}\u{2B50}\u{2B55}\u{FE0F}]/u;
const hype = /\b(revolutionary|seamless(ly)?|cutting-edge|world-class|game-changing|paradigm|military-grade|trustless)\b/i;
let bad = 0;
for (const f of files) {
  let t; try { t = readFileSync(f, "utf8"); } catch { continue; }
  t.split("\n").forEach((line, i) => {
    const why = line.includes(EM) ? "em dash" : line.includes(EN) ? "en dash" : emoji.test(line) ? "emoji" : hype.test(line) && !/^\s*(-|\*)?\s*(No hype|hype)/i.test(line) && !f.endsWith("check-copy.mjs") ? "hype word" : null;
    if (why) { console.error(`${f}:${i + 1}: ${why}`); bad++; }
  });
}
if (bad) { console.error(`check-copy failed: ${bad} problem(s)`); process.exit(1); }
console.log(`check-copy ok (${files.length} files)`);
