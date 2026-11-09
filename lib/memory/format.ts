// Typed memory lines: one readable line per memory, parseable back. Pure functions.
export type MemType = "fact" | "agreement" | "outcome" | "payout" | "reminder" | "retract" | "heard";
export const MEM_TYPES: MemType[] = ["fact", "agreement", "outcome", "payout", "reminder", "retract", "heard"];

export interface MemLine {
  type: MemType;
  date: string; // YYYY-MM-DD
  attrs: Record<string, string>;
  text: string;
}
export interface StoredMemory extends MemLine {
  id: string; // memory / blob id from the relayer
}

const HEADER = /^\[(\w+)\]\s+(\d{4}-\d{2}-\d{2})((?:\s+[\w#-]+:\S*)*)\s*\|\s*(.*)$/s;

export function formatLine(l: MemLine): string {
  if (!MEM_TYPES.includes(l.type)) throw new Error(`unknown memory type ${l.type}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(l.date)) throw new Error("date must be YYYY-MM-DD");
  const attrs = Object.entries(l.attrs)
    .map(([k, v]) => {
      if (!/^[\w#-]+$/.test(k) || /\s/.test(v)) throw new Error(`bad attr ${k}:${v}`);
      return `${k}:${v}`;
    })
    .join(" ");
  const text = l.text.replace(/\s+/g, " ").trim();
  if (!text) throw new Error("memory text is empty");
  return `[${l.type}] ${l.date}${attrs ? " " + attrs : ""} | ${text}`;
}

export function parseLine(raw: string): MemLine | null {
  const m = HEADER.exec(raw.trim());
  if (!m) return null;
  const type = m[1] as MemType;
  if (!MEM_TYPES.includes(type)) return null;
  const attrs: Record<string, string> = {};
  for (const part of m[3].trim().split(/\s+/).filter(Boolean)) {
    const i = part.indexOf(":");
    attrs[part.slice(0, i)] = part.slice(i + 1);
  }
  return { type, date: m[2], attrs, text: m[4].trim() };
}

export function parseStored(id: string, raw: string): StoredMemory | null {
  const l = parseLine(raw);
  return l ? { ...l, id } : null;
}

/** Hide retracted memories. A retract line carries ref:<memory id>. Walrus blobs are append-only: this hides, it does not erase. */
export function applyTombstones(items: StoredMemory[]): StoredMemory[] {
  const refs = new Set(items.filter((i) => i.type === "retract").map((i) => i.attrs.ref).filter(Boolean));
  return items.filter((i) => i.type !== "retract" && !refs.has(i.id));
}

/** A retract is only honoured when written by the member the fact is about. */
export function validRetractions(items: StoredMemory[]): StoredMemory[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  return items.filter((r) => {
    if (r.type !== "retract") return true;
    const target = byId.get(r.attrs.ref ?? "");
    return !target || target.attrs.about === undefined || target.attrs.about === r.attrs.by;
  });
}

export function visibleKnown(items: StoredMemory[]): StoredMemory[] {
  return applyTombstones(validRetractions(items));
}
