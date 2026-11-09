import { describe, it, expect } from "vitest";
import type { StoredMemory } from "@/lib/memory/format";
import { planMember, ewmaLateness, MAX_REMINDERS_PER_ROUND } from "@/lib/planner/reminders";
import { proposeOrder } from "@/lib/planner/order";
import { isQuiet } from "@/lib/planner/time";

const L = "0xlucia", M = "0xmarco";
const mem = (id: string, type: StoredMemory["type"], attrs: Record<string, string>, text = "t", date = "2026-11-01"): StoredMemory => ({ id, type, attrs, text, date });
const fact = (id: string, who: string, extra: Record<string, string> = {}) => mem(id, "fact", { by: who, about: who, confirmed: "sig#aa", ...extra }, "fact text");
const round = { openMs: Date.UTC(2026, 10, 1, 0, 0), deadlineMs: Date.UTC(2026, 10, 30, 0, 0) }; // Nov 1 to Nov 30 UTC

describe("reminders", () => {
  it("memory off: round open and 24h before deadline", () => {
    const p = planMember({ member: L, round, memories: [fact("m1", L, { payday: "28" })], memoryOn: false, tz: "UTC" });
    expect(p.memoryUsed).toBe(false);
    // both defaults fall in quiet hours (00:00 UTC) so each shifts to 08:00
    expect(p.reminders.map((r) => r.atMs)).toEqual([Date.UTC(2026, 10, 1, 8, 0), Date.UTC(2026, 10, 29, 8, 0)]);
  });
  it("memory on: first reminder on payday morning, cites the fact", () => {
    const p = planMember({ member: L, round, memories: [fact("m1", L, { payday: "28" })], memoryOn: true, tz: "UTC" });
    expect(p.memoryUsed).toBe(true);
    expect(p.reminders[0].atMs).toBe(Date.UTC(2026, 10, 28, 9, 0));
    expect(p.reminders[0].cited).toEqual(["m1"]);
  });
  it("budget of 2 and sent count respected", () => {
    const p = planMember({ member: L, round, memories: [], memoryOn: true, tz: "UTC", sentThisRound: 1 });
    expect(p.reminders.length).toBe(MAX_REMINDERS_PER_ROUND - 1);
    expect(planMember({ member: L, round, memories: [], memoryOn: true, tz: "UTC", sentThisRound: 2 }).reminders).toEqual([]);
  });
  it("never inside quiet hours 21:00 to 08:00 local", () => {
    for (const tz of ["UTC", "America/Chicago", "Africa/Lagos", "Asia/Kolkata"]) {
      const p = planMember({ member: L, round, memories: [fact("m1", L, { payday: "28" })], memoryOn: true, tz });
      for (const r of p.reminders) expect(isQuiet(r.atMs, tz)).toBe(false);
    }
  });
  it("heard facts and unconfirmed facts never change the plan (P9)", () => {
    const heard = mem("h1", "heard", { about: L, payday: "5" }, "can only pay after the 5th");
    const unconfirmed = mem("u1", "fact", { by: L, about: L, payday: "5" });
    const base = planMember({ member: L, round, memories: [], memoryOn: true, tz: "UTC" });
    expect(planMember({ member: L, round, memories: [heard, unconfirmed], memoryOn: true, tz: "UTC" })).toEqual(base);
    const confirmed = planMember({ member: L, round, memories: [fact("c1", L, { payday: "5" })], memoryOn: true, tz: "UTC" });
    expect(confirmed).not.toEqual(base);
  });
  it("pays_at fraction works for short demo rounds", () => {
    const r = { openMs: 0, deadlineMs: 20 * 60e3 };
    const p = planMember({ member: L, round: r, memories: [fact("m1", L, { pays_at: "0.6" })], memoryOn: true, enforceQuiet: false });
    expect(p.reminders[0].atMs).toBe(12 * 60e3);
  });
  it("ewma lateness weights recent rounds", () => {
    const o = (id: string, h: string, rd: string) => mem(id, "outcome", { member: L, late_h: h, cycle: "1", round: rd });
    expect(ewmaLateness([o("a", "10", "1"), o("b", "0", "2")])).toBe(5);
    expect(ewmaLateness([])).toBe(0);
  });
  it("late history moves the second reminder earlier", () => {
    const outs = [mem("o1", "outcome", { member: L, late_h: "30", cycle: "1", round: "1" }), mem("o2", "outcome", { member: L, late_h: "30", cycle: "1", round: "2" })];
    const on = planMember({ member: L, round, memories: outs, memoryOn: true, tz: "UTC" });
    const off = planMember({ member: L, round, memories: outs, memoryOn: false, tz: "UTC" });
    expect(on.reminders[1].atMs).toBeLessThan(off.reminders[1].atMs);
    expect(on.reminders[1].cited).toContain("o1");
  });
});

describe("order", () => {
  const members = [{ member: L, joinedAt: "2026-01-01" }, { member: M, joinedAt: "2026-01-02" }, { member: "0xama", joinedAt: "2026-01-03" }];
  it("memory off is join order", () => {
    expect(proposeOrder({ members, memories: [], memoryOn: false }).map((e) => e.member)).toEqual([L, M, "0xama"]);
  });
  it("late payers draw later, with cited reasons", () => {
    const memories = [mem("o1", "outcome", { member: L, late_h: "40", cycle: "1", round: "1" })];
    const o = proposeOrder({ members, memories, memoryOn: true });
    expect(o.map((e) => e.member)).toEqual([M, "0xama", L]);
    expect(o[2].cited).toEqual(["o1"]);
  });
  it("a confirmed dated need pins a round; unconfirmed does not", () => {
    const need = fact("n1", "0xama", { needs_round: "0" });
    expect(proposeOrder({ members, memories: [need], memoryOn: true })[0].member).toBe("0xama");
    const unconf = mem("n2", "fact", { about: "0xama", needs_round: "0" });
    expect(proposeOrder({ members, memories: [unconf], memoryOn: true })[0].member).toBe(L);
  });
  it("output is a permutation of members", () => {
    const o = proposeOrder({ members, memories: [fact("n1", M, { needs_round: "2" })], memoryOn: true });
    expect(new Set(o.map((e) => e.member)).size).toBe(3);
    expect(o.map((e) => e.round)).toEqual([0, 1, 2]);
  });
});
