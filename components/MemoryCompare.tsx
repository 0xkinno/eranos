"use client";
// Memory off vs on for one member, with the memory lines that changed it.
import { useEffect, useState } from "react";
import { Glow } from "./Glow";

interface Rem { atMs: number; reason: string; cited: string[] }
interface Plan { round: { openMs: number; deadlineMs: number }; reminders: { off: { member: string; reminders: Rem[] }[]; on: { member: string; reminders: Rem[]; memoryUsed: boolean }[] }; order: { off: { member: string; round: number; reason: string; cited: string[] }[]; on: { member: string; round: number; reason: string; cited: string[] }[] }; memories: { id: string; type: string; text: string; date: string }[] }
const t = (ms: number) => new Date(ms).toISOString().slice(11, 16) + " UTC";
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export function MemoryCompare({ members }: { members: string[] }) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [err, setErr] = useState("");
  const [idx, setIdx] = useState(1);
  const [on, setOn] = useState(true);
  useEffect(() => { fetch("/api/planner").then((r) => r.json()).then((d) => (d.error ? setErr(d.error) : setPlan(d))).catch((e) => setErr(String(e))); }, []);
  if (err) return <div className="notice warn">The planner could not read the circle's memory right now: {err}</div>;
  if (!plan) return <div className="notice" aria-busy="true">Reading the circle's memory from Walrus and the chain through Tatum…</div>;
  const m = members[idx] ?? members[0];
  const pick = (on ? plan.reminders.on : plan.reminders.off).find((x) => x.member === m)!;
  const cited = new Set(pick.reminders.flatMap((r) => r.cited));
  const lines = plan.memories.filter((x) => cited.has(x.id));
  return (
    <Glow data-testid="memory-compare">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="row" role="group" aria-label="Choose member">
          {members.map((x, i) => <button key={x} className="pill" style={{ minHeight: 44, cursor: "pointer", background: i === idx ? "#5B3DF5" : "#fff", color: i === idx ? "#fff" : undefined }} onClick={() => setIdx(i)} aria-pressed={i === idx}>Member {i + 1}</button>)}
        </div>
        <button className="btn ghost" role="switch" aria-checked={on} data-testid="memory-switch" onClick={() => setOn(!on)}>Memory {on ? "on" : "off"}</button>
      </div>
      <div className="spacer" />
      <p className="eyebrow">Reminders for {short(m)}, this round</p>
      <div className="row" style={{ marginTop: 8 }} data-testid="reminder-times">
        {pick.reminders.map((r, i) => <span key={i} className="pill verified">{t(r.atMs)}<span className="muted"> · {r.reason}</span></span>)}
      </div>
      <p className="muted" style={{ marginTop: 10 }}>{on ? (("memoryUsed" in pick && pick.memoryUsed) ? "Times come from what this member told the circle." : "No confirmed fact for this member yet, so the default applies.") : "Default: when the round opens, and 24 hours before the deadline."}</p>
      {on && lines.length ? (<><div className="spacer" /><p className="eyebrow">Memory lines that changed it · stored on Walrus</p>
        <div style={{ display: "grid", gap: 8, marginTop: 8 }}>{lines.map((l) => <div key={l.id} className="memline"><span className="t">[{l.type}]</span> {l.text}<div className="muted">blob {l.id.slice(0, 14)}…</div></div>)}</div></>) : null}
    </Glow>
  );
}
