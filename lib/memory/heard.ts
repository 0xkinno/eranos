// Scribe helpers: turn extracted facts into typed `heard` lines. Structured attrs are parsed deterministically from the text, never by a model.
import { formatLine, type MemLine } from "./format";
const ORD = /\b(\d{1,2})(?:st|nd|rd|th)\b/i;
const PCT = /\b(\d{1,3})\s*(?:%|percent)/i;
export function heardLine(p: { text: string; about: string; date: string; from?: string }): MemLine {
  const attrs: Record<string, string> = { from: p.from ?? "chat", about: p.about };
  const d = ORD.exec(p.text); if (d && +d[1] >= 1 && +d[1] <= 31) attrs.payday = d[1];
  const pc = PCT.exec(p.text); if (pc && +pc[1] <= 100) attrs.pays_at = (+pc[1] / 100).toFixed(2);
  return { type: "heard", date: p.date, attrs, text: p.text.replace(/\s+/g, " ").trim().slice(0, 240) };
}
export const heardText = (l: MemLine) => formatLine(l);
