import type { Metadata } from "next";
import "./globals.css";
import { Providers }  from "@/components/providers";
import { NavBar }     from "@/components/nav-bar";

export const metadata: Metadata = {
  title:       "Shelby Bridge — Cross-Chain Hot Storage",
  description: "Store once on Shelby. Serve everywhere — Aptos · Solana · NEAR · Ethereum. Paid reads, cryptographic proofs, sub-second latency.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
            <NavBar />
            <main style={{ flex: 1, maxWidth: 1200, margin: "0 auto", width: "100%", padding: "2rem" }}>
              {children}
            </main>
            <footer style={{
              borderTop: "1px solid var(--border)",
              padding: "1rem 2rem",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              maxWidth: 1200, margin: "0 auto", width: "100%",
            }}>
              <span style={{ fontSize: 11, color: "var(--text-4)", fontFamily: "var(--font-mono)" }}>
                SHELBY BRIDGE · BUILT ON SHELBY PROTOCOL · SHELBYNET
              </span>
              <div style={{ display: "flex", gap: "1.5rem" }}>
                {[
                  ["Explorer", "https://explorer.shelby.xyz/shelbynet"],
                  ["Docs",     "https://docs.shelby.xyz"],
                  ["Discord",  "https://discord.com/invite/shelbyserves"],
                ].map(([label, href]) => (
                  <a key={label} href={href} target="_blank" rel="noreferrer"
                     style={{ fontSize: 11, color: "var(--text-3)", textDecoration: "none" }}>
                    {label} ↗
                  </a>
                ))}
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
