import type { ReactNode } from "react";
import { Ornament } from "./art";
export function PageHero({ eyebrow, title, children }: { eyebrow: string; title: ReactNode; children?: ReactNode }) {
  return (
    <header className="pagehero">
      <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{children ? <div style={{ marginTop: 14 }}>{children}</div> : null}</div>
      <Ornament />
    </header>
  );
}
