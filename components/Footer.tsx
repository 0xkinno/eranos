import Link from "next/link";
export function Footer() {
  return (
    <footer className="footer"><div className="wrap">
      <div className="cols">
        <div><div className="row" style={{ gap: 10 }}><img src="/art/mark.svg" alt="" width={34} height={34} /><strong style={{ fontFamily: "var(--display)", fontSize: "1.5rem", color: "#fff" }}>eranos</strong></div>
          <p style={{ marginTop: 14, maxWidth: "38ch" }}>A savings circle with no collector. Built on Walrus Memory and Tatum, on Sui mainnet, for Total Recall.</p></div>
        <div><h4>Product</h4><ul><li><Link href="/app">My circles</Link></li><li><Link href="/judge">For judges</Link></li><li><Link href="/proof">Proof</Link></li><li><Link href="/?tour=1">Guided tour</Link></li></ul></div>
        <div><h4>Build</h4><ul><li><a href="https://github.com/0xkinno/eranos">GitHub</a></li><li><a href="https://github.com/0xkinno/eranos#readme">README</a></li><li><a href="/api/status">Live status</a></li><li><a href="https://github.com/0xkinno/eranos/blob/main/docs/FINDINGS.md">Findings</a></li></ul></div>
        <div><h4>Built with</h4><ul><li><a href="https://docs.wal.app/walrus-memory">Walrus Memory</a></li><li><a href="https://docs.tatum.io/reference/rpc-sui">Tatum Sui gateway</a></li><li><a href="https://sui.io">Sui</a></li></ul></div>
      </div>
      <p className="mono" style={{ marginTop: 36, opacity: .8 }}>Lucía is a fictional composite. Demo members are the builder's own wallets. The demo circle runs 20-minute rounds on capped funds; a real circle runs monthly. MIT licence.</p>
    </div></footer>
  );
}
