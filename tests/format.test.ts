import { describe, it, expect } from "vitest";
import { formatLine, parseLine, applyTombstones, visibleKnown, type StoredMemory } from "@/lib/memory/format";

describe("memory format", () => {
  const fact = { type: "fact" as const, date: "2026-11-10", attrs: { by: "0x7a", about: "0x7a", payday: "28" }, text: "Lucia gets paid on the 28th of each month" };
  it("round trips", () => {
    const s = formatLine(fact);
    expect(s).toBe("[fact] 2026-11-10 by:0x7a about:0x7a payday:28 | Lucia gets paid on the 28th of each month");
    expect(parseLine(s)).toEqual(fact);
  });
  it("parses attr-less lines and rejects junk", () => {
    expect(parseLine("[heard] 2026-11-10 | hello")?.attrs).toEqual({});
    expect(parseLine("nonsense")).toBeNull();
    expect(parseLine("[bogus] 2026-11-10 | x")).toBeNull();
  });
  it("rejects bad input", () => {
    expect(() => formatLine({ ...fact, attrs: { a: "has space" } })).toThrow();
    expect(() => formatLine({ ...fact, text: "  " })).toThrow();
    expect(() => formatLine({ ...fact, date: "10/11/2026" })).toThrow();
  });
  it("tombstones hide retracted facts, only by the subject", () => {
    const a: StoredMemory = { ...fact, id: "m1" };
    const r1: StoredMemory = { type: "retract", date: "2026-11-11", attrs: { ref: "m1", by: "0x7a" }, text: "withdrawn", id: "m2" };
    const r2: StoredMemory = { type: "retract", date: "2026-11-11", attrs: { ref: "m1", by: "0xbad" }, text: "withdrawn", id: "m3" };
    expect(applyTombstones([a, r1]).length).toBe(0);
    expect(visibleKnown([a, r2]).map((x) => x.id)).toEqual(["m1"]);
    expect(visibleKnown([a, r1]).length).toBe(0);
  });
});

import { heardLine } from "@/lib/memory/heard";
describe("scribe line parsing", () => {
  it("parses payday, percent and round deterministically", () => {
    expect(heardLine({ text: "She is paid after the 5th", about: "0xa", date: "2026-11-10" }).attrs.payday).toBe("5");
    expect(heardLine({ text: "money is there about 70 percent in", about: "0xa", date: "2026-11-10" }).attrs.pays_at).toBe("0.70");
    expect(heardLine({ text: "needs the pot early, in round 1", about: "0xa", date: "2026-11-10" }).attrs.needs_round).toBe("0");
    expect(heardLine({ text: "likes tea", about: "0xa", date: "2026-11-10" }).attrs).toEqual({ from: "chat", about: "0xa" });
  });
});
