"use client";
// Hand-drawn SVG art. 1.5 px strokes, round caps. No icon library, no emoji.
import { motion, useReducedMotion } from "framer-motion";
import { useId } from "react";

const S = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
export const IconCoin = () => (<svg width="24" height="24" viewBox="0 0 24 24" {...S} aria-hidden><ellipse cx="12" cy="7" rx="7" ry="3" /><path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7" /><path d="M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" /></svg>);
export const IconMemory = () => (<svg width="24" height="24" viewBox="0 0 24 24" {...S} aria-hidden><rect x="4" y="4" width="16" height="16" rx="4" /><path d="M8 9h8M8 12h8M8 15h5" /></svg>);
export const IconShield = () => (<svg width="24" height="24" viewBox="0 0 24 24" {...S} aria-hidden><path d="M12 3l7 3v5c0 5-3.2 8.4-7 10-3.8-1.6-7-5-7-10V6z" /><path d="M9 12l2.2 2.2L15.5 10" /></svg>);
export const IconKey = () => (<svg width="24" height="24" viewBox="0 0 24 24" {...S} aria-hidden><circle cx="8" cy="15" r="4" /><path d="M11 12l9-9M16 7l3 3" /></svg>);
export const IconRing = () => (<svg width="24" height="24" viewBox="0 0 24 24" {...S} aria-hidden><ellipse cx="12" cy="12" rx="9" ry="5" /><circle cx="12" cy="7" r="1.4" /><circle cx="20" cy="12" r="1.4" /><circle cx="12" cy="17" r="1.4" /><circle cx="4" cy="12" r="1.4" /></svg>);
export const IconClock = () => (<svg width="24" height="24" viewBox="0 0 24 24" {...S} aria-hidden><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3 2" /></svg>);
export const IconAgent = () => (<svg width="24" height="24" viewBox="0 0 24 24" {...S} aria-hidden><rect x="5" y="8" width="14" height="10" rx="3" /><path d="M12 4v4M9 13h.01M15 13h.01M9 21h6" /></svg>);
export const IconSteward = () => (<svg width="24" height="24" viewBox="0 0 24 24" {...S} aria-hidden><circle cx="7" cy="8" r="2.5" /><circle cx="17" cy="8" r="2.5" /><circle cx="12" cy="16" r="2.5" /><path d="M9 9.5l2 4M15 9.5l-2 4M9.5 8h5" /></svg>);

/** The hero scene: a coin bowl seen from above. Beads spring in, the glow travels to the current turn, coins float. */
export function HeroScene({ n = 5, paid = [] as boolean[], turn = 0 }: { n?: number; paid?: boolean[]; turn?: number | null }) {
  const id = useId().replace(/:/g, ""); const reduce = useReducedMotion();
  const W = 640, H = 460, cx = 320, cy = 250, rx = 250, ry = 104;
  const pt = (i: number, k = 1) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / n; return { x: cx + rx * k * Math.cos(a), y: cy + ry * k * Math.sin(a) }; };
  const beads = Array.from({ length: n }, (_, i) => pt(i));
  const t = turn !== null ? beads[turn] : null;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="A ring of circle members seen in perspective. Paid members are filled blue and the member whose turn it is glows orange." style={{ width: "100%", height: "auto", display: "block", overflow: "visible" }} data-testid="hero-scene">
      <defs>
        <radialGradient id={`b${id}`} cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#4DA2FF" stopOpacity=".38" /><stop offset=".7" stopColor="#8CC8FF" stopOpacity=".14" /><stop offset="1" stopColor="#8CC8FF" stopOpacity="0" /></radialGradient>
        <linearGradient id={`c${id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#CFE6FF" /><stop offset="1" stopColor="#4DA2FF" /></linearGradient>
        <linearGradient id={`d${id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#4DA2FF" /><stop offset="1" stopColor="#1B66CC" /></linearGradient>
        <filter id={`g${id}`} x="-300%" y="-300%" width="700%" height="700%"><feGaussianBlur stdDeviation="14" /></filter>
        <filter id={`s${id}`} x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#0B2A5B" floodOpacity=".25" /></filter>
      </defs>
      <ellipse cx={cx} cy={cy + 34} rx={rx + 70} ry={ry + 70} fill={`url(#b${id})`} />
      {/* perspective floor: concentric ellipses and radial guides */}
      {[1.35, 1.12, 0.9, 0.62, 0.34].map((k, i) => <ellipse key={k} cx={cx} cy={cy} rx={rx * k} ry={ry * k} fill="none" stroke="#4DA2FF" strokeOpacity={0.12 + i * 0.05} strokeWidth="1.2" strokeDasharray={i % 2 ? "2 6" : undefined} />)}
      {beads.map((_, i) => { const p = pt(i, 1.35); return <line key={`r${i}`} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#4DA2FF" strokeOpacity=".08" />; })}
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke="#1B66CC" strokeOpacity=".55" strokeWidth="1.5" />
      {/* the pot */}
      <motion.g initial={reduce ? false : { scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 120, damping: 14, delay: 0.2 }} style={{ transformOrigin: `${cx}px ${cy}px` }}>
        <ellipse cx={cx} cy={cy + 12} rx="46" ry="16" fill="#1B66CC" fillOpacity=".25" />
        <ellipse cx={cx} cy={cy + 4} rx="46" ry="16" fill={`url(#d${id})`} filter={`url(#s${id})`} />
        <ellipse cx={cx} cy={cy - 4} rx="46" ry="16" fill={`url(#c${id})`} stroke="#fff" strokeOpacity=".8" />
        <ellipse cx={cx} cy={cy - 12} rx="36" ry="12" fill={`url(#c${id})`} stroke="#fff" strokeOpacity=".8" />
        <text x={cx} y={cy - 8} textAnchor="middle" fontSize="13" fontFamily="var(--mono)" fill="#0B2A5B" fontWeight="500">POT</text>
      </motion.g>
      {/* threads */}
      {beads.map((p, i) => paid[i] && i !== turn ? <motion.line key={`t${i}`} x1={p.x} y1={p.y} x2={cx} y2={cy - 2} stroke="#4DA2FF" strokeOpacity=".6" strokeWidth="1" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, delay: 0.6 + i * 0.08 }} /> : null)}
      {t ? <motion.line x1={cx} y1={cy - 2} x2={t.x} y2={t.y} stroke="#FF8A3D" strokeWidth="2" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, delay: 1.1 }} /> : null}
      {/* beads */}
      {beads.map((p, i) => (
        <motion.g key={i} initial={reduce ? false : { opacity: 0, scale: 0.3 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 160, damping: 13, delay: 0.35 + i * 0.09 }} style={{ transformOrigin: `${p.x}px ${p.y}px` }}>
          {i === turn ? <circle className="bead-turn" cx={p.x} cy={p.y} r="30" fill="#FF8A3D" filter={`url(#g${id})`} /> : null}
          <circle cx={p.x} cy={p.y + 3} r="17" fill="#0B2A5B" fillOpacity=".18" />
          <circle cx={p.x} cy={p.y} r="17" fill={i === turn ? "#FF8A3D" : paid[i] ? `url(#d${id})` : "#fff"} stroke={i === turn ? "#FF8A3D" : "#1B66CC"} strokeWidth="1.5" />
          <text x={p.x} y={p.y + 4.5} textAnchor="middle" fontSize="13" fontFamily="var(--mono)" fontWeight="500" fill={i === turn || paid[i] ? "#fff" : "#0B2A5B"}>{i + 1}</text>
        </motion.g>
      ))}
      {/* floating coins */}
      {[[96, 120, 0], [548, 96, 1.2], [560, 360, 2.1], [70, 340, 0.6]].map(([x, y, d], i) => (
        <motion.g key={i} animate={reduce ? {} : { y: [0, -10, 0] }} transition={{ duration: 5 + i, repeat: Infinity, ease: "easeInOut", delay: d as number }}>
          <ellipse cx={x} cy={(y as number) + 5} rx="15" ry="5.5" fill="#0B2A5B" fillOpacity=".12" />
          <ellipse cx={x} cy={y as number} rx="15" ry="6" fill={`url(#c${id})`} stroke="#fff" strokeWidth="1" />
          <path d={`M${(x as number) - 15} ${y} v5 a15 6 0 0 0 30 0 v-5`} fill={`url(#d${id})`} />
          <ellipse cx={x} cy={y as number} rx="9" ry="3.5" fill="none" stroke="#fff" strokeOpacity=".8" />
        </motion.g>
      ))}
    </svg>
  );
}

/** The membership diagram: stewards own the account, members hold keys, the contract reads both. */
export function MembershipDiagram({ n = 5 }: { n?: number }) {
  const x0 = 214 - (n - 1) * 34;
  return (
    <svg viewBox="0 0 560 330" role="img" aria-label="Three stewards own the circle's memory account. Each member holds one delegate key. The contract checks both rolls." style={{ width: "100%", height: "auto" }} data-testid="membership-diagram">
      <defs><linearGradient id="md" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8CC8FF" /><stop offset="1" stopColor="#1B66CC" /></linearGradient></defs>
      {[0, 1, 2].map((i) => (<g key={i}><circle cx={70 + i * 70} cy="48" r="22" fill="rgba(255,255,255,.1)" stroke="#8CC8FF" /><text x={70 + i * 70} y="53" textAnchor="middle" fill="#fff" fontFamily="var(--mono)" fontSize="13">S{i + 1}</text><path d={`M${70 + i * 70} 70 L ${140 + (i - 1) * 6} 112`} stroke="#8CC8FF" strokeOpacity=".6" strokeDasharray="3 4" /></g>))}
      <text x="140" y="16" textAnchor="middle" fill="#B6CFF0" fontFamily="var(--mono)" fontSize="11" letterSpacing="1.2">2 OF 3 STEWARDS</text>
      <rect x="62" y="112" width="156" height="58" rx="14" fill="url(#md)" /><text x="140" y="137" textAnchor="middle" fill="#fff" fontFamily="var(--display)" fontWeight="800" fontSize="15">Memory account</text><text x="140" y="156" textAnchor="middle" fill="#E6F2FF" fontFamily="var(--mono)" fontSize="10.5">owned by the stewards</text>
      <rect x="342" y="112" width="156" height="58" rx="14" fill="rgba(255,255,255,.1)" stroke="#8CC8FF" /><text x="420" y="137" textAnchor="middle" fill="#fff" fontFamily="var(--display)" fontWeight="800" fontSize="15">Circle contract</text><text x="420" y="156" textAnchor="middle" fill="#B6CFF0" fontFamily="var(--mono)" fontSize="10.5">eranos::circle on Sui</text>
      <path d="M218 141 H342" stroke="#FF8A3D" strokeWidth="2" /><path d="M334 135 l8 6 -8 6" stroke="#FF8A3D" strokeWidth="2" fill="none" />
      <text x="280" y="131" textAnchor="middle" fill="#FFB98A" fontFamily="var(--mono)" fontSize="10.5">is_delegate?</text>
      {Array.from({ length: n }, (_, i) => i).map((i) => (<g key={i}><path d={`M${x0 + i * 68} 262 L ${140 + (i - (n - 1) / 2) * 14} 170`} stroke="#8CC8FF" strokeOpacity=".55" /><circle cx={x0 + i * 68} cy="276" r="19" fill="#fff" stroke="#4DA2FF" strokeWidth="1.5" /><g stroke="#1B66CC" fill="none" strokeWidth="1.5" strokeLinecap="round"><circle cx={x0 - 5 + i * 68} cy="272" r="4.5" /><path d={`M${x0 - 1.5 + i * 68} 275.5 L ${x0 + 8 + i * 68} 285 M${x0 + 5 + i * 68} 282 l3 -3`} /></g></g>))}
      <text x="214" y="318" textAnchor="middle" fill="#B6CFF0" fontFamily="var(--mono)" fontSize="11" letterSpacing="1.2">ONE KEY PER MEMBER, DERIVED FROM THEIR WALLET</text>
    </svg>
  );
}

/** Page header ornament: a small ring with threads. */
export function Ornament({ n = 6 }: { n?: number }) {
  const pts = Array.from({ length: n }, (_, i) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / n; return [100 + 78 * Math.cos(a), 70 + 34 * Math.sin(a)]; });
  return (
    <svg className="orn" viewBox="0 0 200 140" aria-hidden>
      <ellipse cx="100" cy="76" rx="92" ry="48" fill="rgba(77,162,255,.12)" />
      <ellipse cx="100" cy="70" rx="78" ry="34" fill="none" stroke="#1B66CC" strokeOpacity=".5" />
      <ellipse cx="100" cy="70" rx="38" ry="16" fill="none" stroke="#4DA2FF" strokeOpacity=".3" strokeDasharray="2 5" />
      {pts.map(([x, y], i) => (<g key={i}><line x1="100" y1="70" x2={x} y2={y} stroke="#4DA2FF" strokeOpacity=".3" /><circle cx={x} cy={y} r="8" fill={i === 1 ? "#FF8A3D" : i % 2 ? "#fff" : "#4DA2FF"} stroke={i === 1 ? "#FF8A3D" : "#1B66CC"} strokeWidth="1.5" /></g>))}
      <ellipse cx="100" cy="68" rx="14" ry="6" fill="#D3E8FF" stroke="#1B66CC" />
    </svg>
  );
}
