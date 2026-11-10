"use client";
import { motion, useInView, useMotionValue, animate, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

export function Reveal({ children, delay = 0, y = 18, className, as = "div" }: { children: ReactNode; delay?: number; y?: number; className?: string; as?: "div" | "section" | "li" }) {
  const reduce = useReducedMotion();
  const M = motion[as];
  return <M className={className} initial={reduce ? false : { opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "0px" }} transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}>{children}</M>;
}
export function Stagger({ children, className, gap = 0.08 }: { children: ReactNode; className?: string; gap?: number }) {
  const reduce = useReducedMotion();
  return <motion.div className={className} initial={reduce ? false : "h"} whileInView="s" viewport={{ once: true, margin: "0px" }} variants={{ h: {}, s: { transition: { staggerChildren: gap } } }}>{children}</motion.div>;
}
export const Item = ({ children, className }: { children: ReactNode; className?: string }) => (
  <motion.div className={className} variants={{ h: { opacity: 0, y: 20 }, s: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } } }}>{children}</motion.div>
);
export function CountUp({ to, decimals = 0, suffix = "" }: { to: number; decimals?: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null); const inView = useInView(ref, { once: true }); const reduce = useReducedMotion();
  const v = useMotionValue(0); const [txt, setTxt] = useState(reduce ? to.toFixed(decimals) : (0).toFixed(decimals));
  useEffect(() => { if (!inView) return; if (reduce) { setTxt(to.toFixed(decimals)); return; } const c = animate(v, to, { duration: 1.4, ease: "easeOut", onUpdate: (x) => setTxt(x.toFixed(decimals)) }); return () => c.stop(); }, [inView, to, decimals, reduce, v]);
  return <span ref={ref}>{txt}{suffix}</span>;
}
export const Float = ({ children, d = 6, t = 5, className }: { children: ReactNode; d?: number; t?: number; className?: string }) => {
  const reduce = useReducedMotion();
  return <motion.div className={className} animate={reduce ? {} : { y: [0, -d, 0] }} transition={{ duration: t, repeat: Infinity, ease: "easeInOut" }}>{children}</motion.div>;
};
