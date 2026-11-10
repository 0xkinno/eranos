"use client";
import { useEffect } from "react";
// Lenis smooth scroll on wide screens only, after idle, never under reduced motion. No scroll-jacking.
export function Smooth() {
  useEffect(() => {
    if (window.innerWidth < 900 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0; let lenis: { raf: (t: number) => void; destroy: () => void } | null = null;
    const start = async () => { const { default: Lenis } = await import("lenis"); lenis = new Lenis({ lerp: 0.1 }); const loop = (t: number) => { lenis!.raf(t); raf = requestAnimationFrame(loop); }; raf = requestAnimationFrame(loop); };
    const h = (window as unknown as { requestIdleCallback?: (f: () => void) => number }).requestIdleCallback ?? ((f: () => void) => window.setTimeout(f, 800));
    h(start);
    return () => { cancelAnimationFrame(raf); lenis?.destroy(); };
  }, []);
  return null;
}
