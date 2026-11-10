"use client";
// Guided tour: 7 steps across the real screens. Space and arrows move, Esc closes. ?tour=1&render=1 autoplays for screen recording.
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

const CIRCLE = process.env.NEXT_PUBLIC_DEMO_CIRCLE_ID ?? "";
const STEPS = [
  { path: "/", sel: ".hero .art", title: "The ring", text: "Each bead is a member. Violet beads have paid. The ember bead is whose turn it is." },
  { path: `/c/${CIRCLE}`, sel: "[data-testid=ring-card]", title: "Pay a round", text: "A member signs one payment from their own wallet. The circle covers the network fee." },
  { path: `/c/${CIRCLE}`, sel: "[data-testid=roll-card]", title: "The verified outcome", text: "The keeper checks every payment on chain through Tatum before it writes a memory line." },
  { path: "/", sel: "#memory", title: "Memory on and off", text: "Switch memory off and the reminder falls back to a fixed schedule. On, it arrives when the member said money is available." },
  { path: `/c/${CIRCLE}/memory`, sel: "[data-testid=mem-list]", title: "Heard to known", text: "Facts a model extracted wait here. Only the member they are about can confirm them." },
  { path: "/#security", sel: "#security", title: "Leave proof", text: "Leaving removes the member's memory key in the same transaction that removes them from the money roll." },
  { path: "/proof", sel: "[data-testid=evidence-table]", title: "Proof", text: "Every row is a mainnet transaction or a Walrus blob. Check it yourself." },
];

export function Tour() {
  const router = useRouter(); const path = usePathname(); const q = useSearchParams();
  const [i, setI] = useState<number | null>(q.get("tour") === "1" ? 0 : null);
  const render = q.get("render") === "1";
  const go = useCallback((n: number) => { if (n < 0 || n >= STEPS.length) { setI(null); return; } setI(n); const s = STEPS[n]; if (s.path.split("#")[0] !== path) router.push(s.path + (q.get("render") ? "?tour=1&render=1" : "")); }, [router, path, q]);
  useEffect(() => {
    if (i === null) return;
    const t = setTimeout(() => { document.querySelectorAll(".tour-hl").forEach((e) => e.classList.remove("tour-hl")); const el = document.querySelector(STEPS[i].sel); el?.classList.add("tour-hl"); el?.scrollIntoView({ block: "center", behavior: "smooth" }); }, 600);
    return () => clearTimeout(t);
  }, [i, path]);
  useEffect(() => { if (i === null) document.querySelectorAll(".tour-hl").forEach((e) => e.classList.remove("tour-hl")); }, [i]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (i === null) return; if (e.key === "Escape") setI(null); if (e.key === " " || e.key === "ArrowRight") { e.preventDefault(); go(i + 1); } if (e.key === "ArrowLeft") go(i - 1); };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [i, go]);
  useEffect(() => { if (!render || i === null) return; const t = setTimeout(() => go(i + 1), 6000); return () => clearTimeout(t); }, [render, i, go]);
  if (i === null) return <button className="btn ghost" style={{ position: "fixed", right: 16, bottom: 16, zIndex: 40, background: "#fff" }} onClick={() => go(0)} data-testid="tour-start">Guided tour</button>;
  const s = STEPS[i];
  return (
    <>
      <div className="tour-dim" aria-hidden onClick={() => setI(null)} style={{ pointerEvents: "none", background: "rgba(22,17,43,.35)" }} />
      <div className="tour-card" role="dialog" aria-label="Guided tour" data-testid="tour-card">
        <p className="eyebrow">Step {i + 1} of {STEPS.length}</p><h3 style={{ marginTop: 4 }}>{s.title}</h3><p className="muted" style={{ marginTop: 6 }}>{s.text}</p>
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn ghost" onClick={() => go(i - 1)} disabled={i === 0}>Back</button>
          <button className="btn" onClick={() => go(i + 1)}>{i === STEPS.length - 1 ? "Finish" : "Next"}</button>
          <button className="btn ghost" onClick={() => setI(null)}>Close</button>
        </div>
      </div>
    </>
  );
}
