// Loads .env.local into process.env for scripts (Next loads it itself for the app).
import { readFileSync, existsSync } from "node:fs";
if (existsSync(".env.local")) for (const l of readFileSync(".env.local", "utf8").split("\n")) { const m = /^([A-Z0-9_]+)=(.*)$/.exec(l); if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2]; }
