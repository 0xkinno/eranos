import "./globals.css";
import type { ReactNode } from "react";
import { Providers } from "@/components/Providers";
import { Nav } from "@/components/Nav";
import { Tour } from "@/components/Tour";
import { Suspense } from "react";
import { Footer } from "@/components/Footer";
import { Smooth } from "@/components/Smooth";

export const metadata = {
  title: "Eranos: a savings circle with no collector",
  description: "The money goes only to whoever's turn it is, and the circle owns its own memory. Sui mainnet, Walrus Memory, Tatum.",
  openGraph: { title: "Eranos", description: "A savings circle with no collector.", images: ["/art/og.png"] },
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en"><body>
      <a href="#main" style={{ position: "absolute", left: -999 }}>Skip to content</a>
      <Providers><Nav /><Smooth /><main id="main">{children}</main><Footer /><Suspense fallback={null}><Tour /></Suspense></Providers>
    </body></html>
  );
}
