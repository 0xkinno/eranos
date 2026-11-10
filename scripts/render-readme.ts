// Renders README.md from README.src.md. {{facts.a.b}} reads docs/FACTS.json. {{tx:prefix}} links the first evidence row whose label starts with prefix.
// `--check` fails when the committed README differs from the render (used in CI).
import { readFileSync, writeFileSync } from "node:fs";
const facts = JSON.parse(readFileSync("docs/FACTS.json", "utf8"));
const ev = readFileSync("docs/evidence.jsonl", "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) as { label: string; digest: string | null }[];
const get = (p: string) => p.split(".").reduce((o: any, k) => o?.[k], facts);
const link = (d: string) => `[${d.slice(0, 8)}…](https://suiscan.xyz/mainnet/tx/${d})`;
const out = readFileSync("README.src.md", "utf8")
  .replace(/\{\{facts\.([\w.]+)\}\}/g, (_, p) => { const v = get(p); if (v === undefined) throw new Error(`missing fact ${p}`); return String(v); })
  .replace(/\{\{tx:([^}]+)\}\}/g, (_, prefix) => { const e = ev.find((x) => x.label.startsWith(prefix) && x.digest && /^[1-9A-HJ-NP-Za-km-z]{43,44}$/.test(x.digest)); return e ? link(e.digest!) : "not yet recorded"; })
  .replace(/\{\{txs:([^}]+)\}\}/g, (_, prefix) => ev.filter((x) => x.label.startsWith(prefix) && x.digest && /^[1-9A-HJ-NP-Za-km-z]{43,44}$/.test(x.digest!)).map((e) => link(e.digest!)).join(", ") || "none yet");
if (process.argv.includes("--check")) { if (readFileSync("README.md", "utf8") !== out) { console.error("README.md is out of date with FACTS.json. Run: npx tsx scripts/render-readme.ts"); process.exit(1); } console.log("README matches FACTS"); }
else { writeFileSync("README.md", out); console.log("README.md rendered"); }
