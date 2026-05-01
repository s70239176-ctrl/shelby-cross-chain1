import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { NavBar }    from "@/components/nav-bar";

export const metadata: Metadata = {
  title:       "HotLink Cache — Shelby Cross-Chain Bridge",
  description: "Decentralized hot-cache layer for cross-chain data with paid reads and provenance proofs",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
            <NavBar />
            <main style={{ flex: 1, padding: "1.5rem 2rem", maxWidth: 1280, margin: "0 auto", width: "100%" }}>
              {children}
            </main>
            <footer style={{
              borderTop: "1px solid var(--border)",
              padding: "0.75rem 2rem",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              fontSize: 10, letterSpacing: "0.08em", color: "var(--text-tertiary)",
            }}>
              <span>HOTLINK CACHE v0.1.0 · SHELBY PROTOCOL · SHELBYNET</span>
              <span style={{ display: "flex", gap: "1rem" }}>
                <a href="https://explorer.shelby.xyz/shelbynet" target="_blank" rel="noreferrer"
                   style={{ color: "var(--text-tertiary)", textDecoration: "none" }}>EXPLORER ↗</a>
                <a href="https://docs.shelby.xyz" target="_blank" rel="noreferrer"
                   style={{ color: "var(--text-tertiary)", textDecoration: "none" }}>DOCS ↗</a>
              </span>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
