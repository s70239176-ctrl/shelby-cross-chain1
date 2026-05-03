"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

const STATS_DEFAULT = { totalBlobs: 0, totalReads: 0, totalEarnedApt: "0.0000", cacheHitRate: 0, activeBlobs: 0 };

const FEATURES = [
  { icon: "⚡", label: "Sub-second reads",     desc: "Dedicated fiber backbone connecting RPC nodes and storage providers globally" },
  { icon: "🔗", label: "Cross-chain native",   desc: "Aptos · Solana · NEAR · Ethereum — one upload, read from anywhere" },
  { icon: "🔒", label: "Cryptographic proofs", desc: "Ed25519 proof-of-delivery per serve, anchored on Aptos" },
  { icon: "💰", label: "Paid reads",           desc: "Set your price per read. Earn APT on every cross-chain fetch" },
  { icon: "🧊", label: "Clay erasure coding",  desc: "Data sharded across 16 storage providers — survive any single failure" },
  { icon: "📋", label: "On-chain audit",       desc: "Every commitment and payment recorded on Aptos shelbynet" },
];

const CHAINS = ["Aptos", "Solana", "NEAR", "Ethereum", "Base"];

export default function HomePage() {
  const [stats, setStats] = useState(STATS_DEFAULT);
  useEffect(() => {
    fetch("/api/analytics").then(r => r.json()).then(d => { if (d.stats) setStats(d.stats); }).catch(() => {});
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4rem", paddingTop: "1rem" }}>

      {/* Hero */}
      <section className="animate-in" style={{ textAlign: "center", paddingTop: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
          <span className="badge badge-pink">
            <span className="dot-live" style={{ width: 5, height: 5 }} />
            Live on Shelbynet
          </span>
        </div>
        <h1 style={{
          fontSize: "clamp(2.5rem, 6vw, 4.5rem)", fontWeight: 700,
          lineHeight: 1.05, letterSpacing: "-0.03em",
          color: "var(--text-1)", marginBottom: "1.25rem",
        }}>
          Hot storage for<br />
          <span style={{ background: "linear-gradient(90deg, var(--pink), var(--purple))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            every chain
          </span>
        </h1>
        <p style={{ fontSize: 17, color: "var(--text-2)", maxWidth: 520, margin: "0 auto 2.5rem", lineHeight: 1.65 }}>
          Upload once to Shelby. Serve to{" "}
          {CHAINS.map((c, i) => (
            <span key={c}>
              <span style={{ color: "var(--text-1)", fontWeight: 500 }}>{c}</span>
              {i < CHAINS.length - 1 ? " · " : ""}
            </span>
          ))}
          {" "}with cryptographic proofs and paid reads.
        </p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/upload" className="btn btn-primary" style={{ fontSize: 15, padding: "0.8rem 2rem", textDecoration: "none" }}>
            Store a blob →
          </Link>
          <Link href="/browse" className="btn btn-secondary" style={{ fontSize: 15, padding: "0.8rem 2rem", textDecoration: "none" }}>
            Browse cache
          </Link>
        </div>
      </section>

      {/* Live stats */}
      <section className="animate-in delay-1" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem" }}>
        {[
          { label: "Blobs stored",   value: stats.totalBlobs.toLocaleString() },
          { label: "Total reads",    value: stats.totalReads.toLocaleString() },
          { label: "APT earned",     value: stats.totalEarnedApt },
          { label: "Cache hit rate", value: `${stats.cacheHitRate}%` },
          { label: "Active blobs",   value: stats.activeBlobs.toLocaleString() },
        ].map(({ label, value }) => (
          <div key={label} className="stat-card">
            <div className="stat-value" style={{ fontSize: "1.75rem" }}>{value}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </section>

      {/* Features */}
      <section className="animate-in delay-2">
        <div className="section-title">Protocol capabilities</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
          {FEATURES.map(({ icon, label, desc }) => (
            <div key={label} className="card" style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              <span style={{ fontSize: "1.5rem", flexShrink: 0 }}>{icon}</span>
              <div>
                <div style={{ fontWeight: 600, color: "var(--text-1)", marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.6 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="animate-in delay-3" style={{ textAlign: "center", padding: "2rem 0 3rem" }}>
        <div className="card-glow" style={{ display: "inline-block", padding: "3rem 4rem" }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.75rem", letterSpacing: "-0.02em" }}>
            Ready to bridge?
          </h2>
          <p style={{ color: "var(--text-2)", marginBottom: "1.75rem", fontSize: 14 }}>
            Connect Petra or Phantom above, then store your first blob.
          </p>
          <Link href="/upload" className="btn btn-primary" style={{ textDecoration: "none", fontSize: 14 }}>
            Start storing →
          </Link>
        </div>
      </section>
    </div>
  );
}
