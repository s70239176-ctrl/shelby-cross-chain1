"use client";
// apps/web/app/page.tsx — HotLink Cache dashboard home
import Link from "next/link";
import { useEffect, useState } from "react";

interface Stats {
  totalBlobs:   number;
  totalReads:   number;
  totalEarnedApt: string;
  cacheHitRate: number;
  activeBlobs:  number;
  networks:     string[];
}

const QUICK_ACTIONS = [
  { href: "/upload",    icon: "⬆", label: "UPLOAD BLOB",     desc: "Store data with TTL + access rules" },
  { href: "/browse",    icon: "◉", label: "BROWSE CACHE",    desc: "Explore stored blobs by chain / type" },
  { href: "/analytics", icon: "▦", label: "ANALYTICS",       desc: "Reads, earnings, cache performance" },
];

const FEATURE_ROWS = [
  { icon: "◈", label: "Clay Erasure Coding",    desc: "Reed–Solomon over 16 storage providers" },
  { icon: "◆", label: "Sub-second Reads",       desc: "Dedicated fiber backbone globally" },
  { icon: "▲", label: "Aptos Settlement",       desc: "All payments + proofs anchored on-chain" },
  { icon: "⬡", label: "Cross-chain Identity",   desc: "Solana keys → Aptos DAA storage accounts" },
  { icon: "⬟", label: "Programmable Cache",     desc: "TTL, price-per-read, NFT gates, allowlists" },
  { icon: "◇", label: "Cryptographic Receipts", desc: "Ed25519 proof-of-delivery per serve" },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then((d) => setStats(d.stats))
      .catch(() => {});
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem", paddingTop: "1.5rem" }}>

      {/* Hero header */}
      <div className="animate-in" style={{ borderBottom: "1px solid var(--border)", paddingBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", marginBottom: "0.5rem" }}>
          <h1 style={{
            fontFamily: "var(--font-mono)", fontSize: "2rem", fontWeight: 700,
            color: "var(--text-primary)", letterSpacing: "-0.02em", lineHeight: 1,
          }}>
            HOTLINK<span style={{ color: "var(--amber)" }}>/</span>CACHE
          </h1>
          <span className="badge badge-teal">
            <span className="dot-live" style={{ width: 5, height: 5 }} />
            LIVE ON SHELBYNET
          </span>
        </div>
        <p style={{ color: "var(--text-secondary)", fontSize: 13, maxWidth: 560, lineHeight: 1.6 }}>
          Decentralized hot-cache bridge. Upload once to Shelby, serve everywhere —
          Solana · Aptos · NEAR · Ethereum L2. Paid reads, cryptographic proofs, sub-second latency.
        </p>
      </div>

      {/* Live stats row */}
      <div className="animate-in delay-1" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.75rem" }}>
        {[
          { label: "TOTAL BLOBS",  value: stats?.totalBlobs   ?? "—",    unit: ""   },
          { label: "TOTAL READS",  value: stats?.totalReads   ?? "—",    unit: ""   },
          { label: "EARNED",       value: stats?.totalEarnedApt ?? "—",  unit: "APT"},
          { label: "CACHE HIT",    value: stats ? `${stats.cacheHitRate}%` : "—", unit: "" },
          { label: "ACTIVE BLOBS", value: stats?.activeBlobs  ?? "—",    unit: ""   },
        ].map(({ label, value, unit }) => (
          <div key={label} className="stat-card">
            <div className="stat-value">{value}<span style={{ fontSize: "0.9rem", color: "var(--amber)" }}>{unit}</span></div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Quick action tiles */}
      <div className="animate-in delay-2" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
        {QUICK_ACTIONS.map(({ href, icon, label, desc }) => (
          <Link key={href} href={href} style={{ textDecoration: "none" }}>
            <div style={{
              background:   "var(--bg-surface)",
              border:       "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding:      "1.5rem",
              cursor:       "pointer",
              transition:   "all 0.15s ease",
              display:      "flex", flexDirection: "column", gap: "0.75rem",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = "var(--amber-dim)";
              (e.currentTarget as HTMLDivElement).style.background  = "var(--bg-raised)";
              (e.currentTarget as HTMLDivElement).style.boxShadow   = "0 0 24px var(--amber-glow)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
              (e.currentTarget as HTMLDivElement).style.background  = "var(--bg-surface)";
              (e.currentTarget as HTMLDivElement).style.boxShadow   = "none";
            }}>
              <span style={{ fontSize: "1.5rem" }}>{icon}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 12, letterSpacing: "0.08em", color: "var(--text-primary)", marginBottom: 4 }}>
                  {label}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-tertiary)", lineHeight: 1.5 }}>{desc}</div>
              </div>
              <span style={{ color: "var(--amber)", fontSize: 12, marginTop: "auto" }}>→</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Protocol features grid */}
      <div className="animate-in delay-3">
        <div className="section-title">PROTOCOL CAPABILITIES</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
          {FEATURE_ROWS.map(({ icon, label, desc }) => (
            <div key={label} style={{
              display: "flex", gap: "0.75rem", alignItems: "flex-start",
              padding: "0.75rem 1rem",
              background: "var(--bg-surface)", border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
            }}>
              <span style={{ color: "var(--amber)", fontSize: 14, marginTop: 1 }}>{icon}</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "0.04em" }}>{label}</div>
                <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 2, lineHeight: 1.5 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Links */}
      <div className="animate-in delay-4" style={{ display: "flex", gap: "1rem", paddingTop: "0.5rem", borderTop: "1px solid var(--border)" }}>
        {[
          { href: "https://explorer.shelby.xyz/shelbynet", label: "SHELBY EXPLORER" },
          { href: "https://docs.shelby.xyz",               label: "SDK DOCS" },
          { href: "https://faucet.shelbynet.shelby.xyz",   label: "FAUCET" },
          { href: "https://discord.com/invite/shelbyserves", label: "DISCORD" },
        ].map(({ href, label }) => (
          <a key={href} href={href} target="_blank" rel="noreferrer" style={{
            fontSize: 10, letterSpacing: "0.1em", color: "var(--text-tertiary)",
            textDecoration: "none", display: "flex", alignItems: "center", gap: "0.3rem",
          }}>
            {label} <span style={{ color: "var(--amber)" }}>↗</span>
          </a>
        ))}
      </div>
    </div>
  );
}
