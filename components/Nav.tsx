"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useDAppKit, useWallets, useWalletConnection } from "@mysten/dapp-kit-react";
import { Power, Wallet, Menu, Close } from "./icons";

const LINKS = [["How it works", "/#how"], ["Memory", "/#memory"], ["Proof", "/proof"], ["Judges", "/judge"], ["Docs", "https://github.com/0xkinno/eranos#readme"]] as const;
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export function useUsdc(address?: string) {
  const [v, setV] = useState<string | null>(null);
  useEffect(() => { if (!address) return; let ok = true; fetch(`/api/balance?address=${address}`).then((r) => r.json()).then((d) => ok && setV(d.usdc)).catch(() => {}); return () => { ok = false; }; }, [address]);
  return v;
}

function WalletButton() {
  const kit = useDAppKit();
  const wallets = useWallets();
  const conn = useWalletConnection();
  const [open, setOpen] = useState(false);
  const address = conn.account?.address;
  const usdc = useUsdc(address);
  if (conn.isConnected && address) {
    return (
      <div className="account" data-testid="account">
        <span className="ring" aria-hidden />
        <span className="mono" data-testid="account-address">{short(address)}</span>
        {usdc !== null ? <span className="mono muted" data-testid="account-usdc">{usdc} USDC</span> : null}
        <button className="iconbtn" aria-label="Disconnect wallet" data-testid="disconnect" onClick={() => kit.disconnectWallet()}><Power /></button>
      </div>
    );
  }
  return (
    <div style={{ position: "relative" }}>
      <button className="btn" data-testid="connect" onClick={() => setOpen((o) => !o)} aria-expanded={open}><Wallet /> Connect wallet</button>
      {open ? (
        <div className="popover" role="menu">
          {wallets.length === 0 ? <p className="muted" style={{ padding: 12 }}>No Sui wallet found in this browser. Install Slush or Suiet.</p> : null}
          {wallets.map((w) => (
            <button key={w.name} role="menuitem" data-testid={`wallet-${w.name}`} onClick={async () => { try { await kit.connectWallet({ wallet: w }); setOpen(false); } catch { /* user cancelled */ } }}>
              {w.icon ? <img src={w.icon} alt="" width={22} height={22} /> : null}{w.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function Nav() {
  const [sheet, setSheet] = useState(false);
  return (
    <>
      <nav className="nav" aria-label="Main">
        <Link href="/" className="brand"><img src="/art/mark.svg" alt="" width={30} height={30} /> eranos</Link>
        <div className="links">{LINKS.map(([l, h]) => <Link key={l} href={h}>{l}</Link>)}</div>
        <div className="row" style={{ gap: 8 }}>
          <div className="desktop-only"><WalletButton /></div>
          <button className="iconbtn menu-btn" aria-label={sheet ? "Close menu" : "Open menu"} onClick={() => setSheet((s) => !s)} style={{ width: 44, height: 44 }}>{sheet ? <Close /> : <Menu />}</button>
        </div>
      </nav>
      {sheet ? (
        <div className="sheet" role="dialog" aria-label="Menu">
          {LINKS.map(([l, h]) => <Link key={l} href={h} onClick={() => setSheet(false)}>{l}</Link>)}
          <Link href="/app" onClick={() => setSheet(false)}>My circles</Link>
          <div style={{ marginTop: "auto" }}><WalletButton /></div>
        </div>
      ) : null}
    </>
  );
}
