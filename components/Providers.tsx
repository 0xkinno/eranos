"use client";
import { useState, type ReactNode } from "react";
import { createDAppKit, DAppKitProvider } from "@mysten/dapp-kit-react";
import { SuiGraphQLClient } from "@mysten/sui/graphql";

function make() {
  return createDAppKit({
    networks: ["mainnet"], defaultNetwork: "mainnet", autoConnect: true,
    // chain reads from the browser go through our server, which calls Tatum with the key
    createClient: () => new SuiGraphQLClient({ url: `${window.location.origin}/api/sui`, network: "mainnet" }),
    slushWalletConfig: null,
  });
}
export function Providers({ children }: { children: ReactNode }) {
  const [kit] = useState(() => (typeof window === "undefined" ? null : make()));
  if (!kit) return <>{children}</>;
  return <DAppKitProvider dAppKit={kit as never}>{children}</DAppKitProvider>;
}
