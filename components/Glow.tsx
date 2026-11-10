"use client";
import type { HTMLAttributes } from "react";
export function Glow({ children, className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={`card ${className}`}
      onPointerMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`); e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`); }}>
      {children}
    </div>
  );
}
