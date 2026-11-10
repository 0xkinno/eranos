import { readFileSync, writeFileSync } from "node:fs";
const ev = readFileSync("docs/evidence.jsonl", "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const isD = (d: unknown) => typeof d === "string" && /^[1-9A-HJ-NP-Za-km-z]{43,44}$/.test(d);
const rows = ev.map((e) => `| ${e.at.slice(0, 16).replace("T", " ")} | ${e.label}${e.error ? ` (${String(e.error).slice(0, 90)})` : ""} | ${isD(e.digest) ? `[${e.digest}](https://suiscan.xyz/mainnet/tx/${e.digest})` : e.digest ? `Walrus blob \`${e.digest}\`` : "refused before execution"} |`);
writeFileSync("docs/EVIDENCE.md", `# EVIDENCE\n\nGenerated from docs/evidence.jsonl by scripts/gen-evidence.ts. Every row is a Sui mainnet transaction or a Walrus blob.\n\n| When (UTC) | What it proves | Digest or blob |\n|---|---|---|\n${rows.join("\n")}\n`);
console.log(ev.length, "rows");
