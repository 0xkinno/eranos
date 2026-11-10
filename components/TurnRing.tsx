"use client";
// The circle is the vault: members as beads on a ring seen in perspective. Paid beads fill violet, the current turn glows ember.
import { useId } from "react";
export interface RingProps { n: number; paid?: boolean[]; turn?: number | null; labels?: string[]; dark?: boolean; className?: string; title?: string }
export function TurnRing({ n, paid = [], turn = null, labels, dark = false, className, title = "Ring of circle members" }: RingProps) {
  const id = useId().replace(/:/g, "");
  const W = 600, H = 320, cx = W / 2, cy = H / 2 + 6, rx = 250, ry = 105;
  const pts = Array.from({ length: n }, (_, i) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / n; return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) }; });
  const stroke = dark ? "#fff" : "#1B66CC";
  return (
    <svg viewBox={`0 30 ${W} ${H - 50}`} className={className} role="img" aria-label={title} style={{ width: "100%", height: "auto", display: "block" }}>
      <defs>
        <radialGradient id={`bowl${id}`} cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#4DA2FF" stopOpacity={0.3} /><stop offset="1" stopColor="#8CC8FF" stopOpacity="0" /></radialGradient>
        <radialGradient id={`bead${id}`} cx="35%" cy="30%" r="80%"><stop offset="0" stopColor="#fff" /><stop offset="1" stopColor="#CFE6FF" /></radialGradient>
        <filter id={`glow${id}`} x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="14" /></filter>
      </defs>
      <ellipse cx={cx} cy={cy + 10} rx={rx + 30} ry={ry + 26} fill={`url(#bowl${id})`} />
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke={stroke} strokeOpacity=".28" strokeWidth="1.5" />
      <ellipse cx={cx} cy={cy} rx={rx * 0.62} ry={ry * 0.62} fill="none" stroke={stroke} strokeOpacity=".14" strokeWidth="1" />
      {pts.map((p, i) => paid[i] && i !== turn ? <line key={`t${i}`} x1={p.x} y1={p.y} x2={cx} y2={cy} stroke="#CFE6FF" strokeOpacity=".5" strokeWidth=".75" /> : null)}
      {turn !== null && pts[turn] ? <line x1={cx} y1={cy} x2={pts[turn].x} y2={pts[turn].y} stroke="#FF8A3D" strokeOpacity=".9" strokeWidth="1.5" /> : null}
      <circle cx={cx} cy={cy} r="5" fill={dark ? "#fff" : "#1B66CC"} fillOpacity=".8" />
      {pts.map((p, i) => (
        <g key={i}>
          {i === turn ? <circle className="bead-turn" cx={p.x} cy={p.y} r="26" fill="#FF8A3D" filter={`url(#glow${id})`} /> : null}
          <circle cx={p.x} cy={p.y} r="17" fill={i === turn ? "#FF8A3D" : paid[i] ? "#1B66CC" : `url(#bead${id})`} stroke={i === turn ? "#FF8A3D" : stroke} strokeWidth="1.5" />
          {labels?.[i] ? <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="13" fontFamily="var(--mono)" fill={paid[i] || i === turn ? "#fff" : "#0B2A5B"}>{labels[i]}</text> : null}
        </g>
      ))}
    </svg>
  );
}
