import "./globals.css";
import type { ReactNode } from "react";
export const metadata = { title: "Eranos", description: "A savings circle with no collector: the money goes only to whoever's turn it is, and the circle owns its own memory." };
export default function RootLayout({ children }: { children: ReactNode }) {
  return (<html lang="en"><body>{children}</body></html>);
}
