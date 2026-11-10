import { describe, it, expect } from "vitest";
import { selectDue } from "@/lib/keeper/reminders";

const H = 3_600_000, noon = Date.UTC(2026, 10, 10, 12, 0);
const plan = (tz = "UTC") => [{ member: "0xa", tz, reminders: [{ atMs: noon - H, reason: "first", cited: ["m1"] }, { atMs: noon - 2 * H, reason: "second", cited: [] }, { atMs: noon - 3 * H, reason: "third", cited: [] }] }];
const base = { now: noon, cycle: 2, round: 1, paid: new Set<string>(), sentKeys: new Set<string>() };

describe("reminder delivery", () => {
  it("sends due reminders but never more than 2 per member per round", () => {
    expect(selectDue({ ...base, plan: plan() }).length).toBe(2);
  });
  it("counts reminders already sent against the budget", () => {
    const sent = new Set(["rem:2:1:0xa:0"]);
    expect(selectDue({ ...base, plan: plan(), sentKeys: sent }).length).toBe(1);
    expect(selectDue({ ...base, plan: plan(), sentKeys: new Set(["rem:2:1:0xa:0", "rem:2:1:0xa:1"]) }).length).toBe(0);
  });
  it("sends nothing to a member who has already paid", () => {
    expect(selectDue({ ...base, plan: plan(), paid: new Set(["0xa"]) })).toEqual([]);
  });
  it("sends nothing between 21:00 and 08:00 in the member's timezone", () => {
    expect(selectDue({ ...base, now: Date.UTC(2026, 10, 10, 23, 0), plan: plan() })).toEqual([]);
    expect(selectDue({ ...base, now: Date.UTC(2026, 10, 10, 6, 0), plan: plan() })).toEqual([]);
    // 12:00 UTC is 06:00 in Chicago, quiet there
    expect(selectDue({ ...base, plan: plan("America/Chicago") })).toEqual([]);
  });
  it("does not send a reminder before it is due", () => {
    expect(selectDue({ ...base, now: noon - 4 * H, plan: plan() })).toEqual([]);
  });
  it("is idempotent: the same keys are never selected twice", () => {
    const first = selectDue({ ...base, plan: plan() });
    expect(selectDue({ ...base, plan: plan(), sentKeys: new Set(first.map((d) => d.key)) })).toEqual([]);
  });
});
