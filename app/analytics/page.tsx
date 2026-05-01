"use client";
// apps/web/app/analytics/page.tsx
// Analytics dashboard: reads, earnings, cache hit rate, per-blob stats
import { useEffect, useState } from "react";

interface BlobStat {
  blobId:            string;
  blobName:          string;
  totalReads:        number;
  cacheHits:         number;
  totalEarnedOctas:  string;
  lastReadAt:        string | null;
  expiresAt:         string | null;
  sizeBytes:         number;
}
interface AnalyticsData {
  stats: {
    totalBlobs:     number;
    totalReads:     number;
    totalEarnedApt: string;
    cacheHitRate:   number;
    activeBlobs:    number;
    networks:       string[];
  };
  blobs:     BlobStat[];
  timeSeries: { date: string; reads: number; earned: number }[];
}

// ── Tiny bar chart (no dep) ────────────────────────────────────────────────
function MiniBarChart({ data }: { data: { date: string; reads: number }[] }) {
  if (!data.length) return null;
  const max = Math.max(...data.map((d) => d.reads), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 48, padding: "0 0.25rem" }}>
      {data.slice(-28).map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <div
            title={`${d.date}: ${d.reads} reads`}
            style={{
              width: "100%", background: "var(--amber)",
              height: `${Math.max(2, (d.reads / max) * 40)}px`,
              borderRadius: "1px 1px 0 0", opacity: 0.75,
              transition: "height 0.3s ease",
            }}
          />
        </div>
      ))}
    </div>
  );
}

function fmtBytes(b: number) {
  if (b > 1e9) return `${(b/1e9).toFixed(2)} GB`;
  if (b > 1e6) return `${(b/1e6).toFixed(2)} MB`;
  if (b > 1e3) return `${(b/1e3).toFixed(1)} KB`;
  return `${b} B`;
}
function fmtApt(octas: string) {
  return (Number(octas) / 1e8).toFixed(4);
}
function timeAgo(iso: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000)    return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000)return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

// Mock data — replaced by real /api/analytics response
const MOCK: AnalyticsData = {
  stats: { totalBlobs: 24, totalReads: 24_083, totalEarnedApt: "12.4430", cacheHitRate: 87, activeBlobs: 19, networks: ["aptos","solana","near","base"] },
  blobs: [
    { blobId: "0xabc123", blobName: "oracle/eth-usd-feed.json",         totalReads: 15_320, cacheHits: 14_200, totalEarnedOctas: "153200000", lastReadAt: new Date(Date.now()-120_000).toISOString(), expiresAt: new Date(Date.now()+86_400_000*0.4).toISOString(), sizeBytes: 4_200 },
    { blobId: "0xdef456", blobName: "nft/collection-alpha/metadata.json",totalReads: 8_421,  cacheHits: 7_100,  totalEarnedOctas: "0",         lastReadAt: new Date(Date.now()-30_000).toISOString(),  expiresAt: new Date(Date.now()+86_400_000*25).toISOString(), sizeBytes: 245_000 },
    { blobId: "0x789abc", blobName: "models/mistral-7b-q4.gguf",        totalReads: 142,    cacheHits: 121,    totalEarnedOctas: "710000000", lastReadAt: new Date(Date.now()-3_600_000).toISOString(),expiresAt: new Date(Date.now()+86_400_000*6).toISOString(),  sizeBytes: 4_200_000_000 },
    { blobId: "0xfedcba", blobName: "game/assets/map-v3.bin",           totalReads: 290,    cacheHits: 244,    totalEarnedOctas: "0",         lastReadAt: new Date(Date.now()-7_200_000).toISOString(),expiresAt: new Date(Date.now()+86_400_000*60).toISOString(), sizeBytes: 92_000_000 },
    { blobId: "0x123fed", blobName: "depin/sensor-batch-2025-04.bin",   totalReads: 37,     cacheHits: 28,     totalEarnedOctas: "18500000",  lastReadAt: new Date(Date.now()-86_400_000).toISOString(),expiresAt: new Date(Date.now()+86_400_000*2).toISOString(),  sizeBytes: 18_500_000 },
  ],
  timeSeries: Array.from({ length: 28 }, (_, i) => ({
    date:   new Date(Date.now() - (27 - i) * 86_400_000).toISOString().slice(0, 10),
    reads:  Math.floor(Math.random() * 1200 + 400),
    earned: Math.random() * 0.8,
  })),
};

export default function AnalyticsPage() {
  const [data,    setData]    = useState<AnalyticsData>(MOCK);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch("/api/analytics")
      .then((r) => r.json())
      .then((d) => { if (d.blobs?.length || d.stats) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const { stats, blobs, timeSeries } = data;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* Header */}
      <div className="animate-in" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 4 }}>
            Cache <span style={{ color: "var(--amber)" }}>Analytics</span>
          </h2>
          <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            On-chain read events, earnings, and cache performance from shelbynet
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {stats.networks.map((n) => (
            <span key={n} className={`chain-pill chain-${n}`}>{n}</span>
          ))}
        </div>
      </div>

      {/* Top stats */}
      <div className="animate-in delay-1" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.75rem" }}>
        {[
          { label: "TOTAL READS",  value: stats.totalReads.toLocaleString(),  delta: "+3.2%",  unit: "" },
          { label: "EARNED",       value: stats.totalEarnedApt,               delta: "+0.8 APT", unit: " APT" },
          { label: "CACHE HIT",    value: `${stats.cacheHitRate}%`,            delta: "↑ good",  unit: "" },
          { label: "ACTIVE BLOBS", value: `${stats.activeBlobs}`,             delta: `/ ${stats.totalBlobs} total`, unit: "" },
          { label: "NETWORKS",     value: stats.networks.length,              delta: "chains",  unit: "" },
        ].map(({ label, value, delta, unit }) => (
          <div key={label} className="stat-card">
            <div className="stat-value">{value}<span style={{ fontSize: "0.9rem", color: "var(--amber)" }}>{unit}</span></div>
            <div className="stat-label">{label}</div>
            <div className="stat-delta">{delta}</div>
          </div>
        ))}
      </div>

      {/* Read volume chart */}
      <div className="animate-in delay-2" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.25rem 1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <div className="section-title" style={{ marginBottom: 0 }}>READ VOLUME — LAST 28 DAYS</div>
          <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
            {timeSeries.reduce((s, d) => s + d.reads, 0).toLocaleString()} total reads
          </span>
        </div>
        <MiniBarChart data={timeSeries} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--text-muted)", marginTop: "0.35rem" }}>
          <span>{timeSeries[0]?.date ?? ""}</span>
          <span>{timeSeries[timeSeries.length - 1]?.date ?? ""}</span>
        </div>
      </div>

      {/* Per-blob analytics table */}
      <div className="animate-in delay-3" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        <div style={{ padding: "0.75rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
          <div className="section-title" style={{ marginBottom: 0 }}>PER-BLOB PERFORMANCE</div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>BLOB NAME</th>
              <th>READS</th>
              <th>CACHE HIT%</th>
              <th>EARNED</th>
              <th>SIZE</th>
              <th>LAST READ</th>
              <th>EXPIRES</th>
            </tr>
          </thead>
          <tbody>
            {blobs.map((b) => {
              const hitPct   = b.totalReads ? Math.round((b.cacheHits / b.totalReads) * 100) : 0;
              const earned   = fmtApt(b.totalEarnedOctas);
              const expires  = b.expiresAt ? new Date(b.expiresAt) : null;
              const expiredMs = expires ? expires.getTime() - Date.now() : null;
              const expClass  = expiredMs === null ? "badge-muted"
                : expiredMs < 0              ? "badge-coral"
                : expiredMs < 86_400_000     ? "badge-amber"
                : "badge-muted";
              const expLabel = expires
                ? expiredMs! < 0 ? "EXPIRED"
                : expiredMs! < 86_400_000 ? "< 1 DAY"
                : `${Math.floor(expiredMs! / 86_400_000)}d`
                : "—";

              return (
                <tr key={b.blobId}>
                  <td>
                    <div style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 500 }}>
                      {b.blobName.split("/").pop()}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{b.blobName.split("/").slice(0,-1).join("/")}</div>
                  </td>
                  <td>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                      {b.totalReads.toLocaleString()}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <div style={{ width: 48, height: 3, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ width: `${hitPct}%`, height: "100%", background: hitPct > 80 ? "var(--teal)" : "var(--amber)", borderRadius: 2 }} />
                      </div>
                      <span style={{ fontSize: 11, color: hitPct > 80 ? "var(--teal)" : "var(--text-secondary)" }}>{hitPct}%</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: Number(b.totalEarnedOctas) > 0 ? "var(--amber)" : "var(--text-tertiary)" }}>
                    {Number(b.totalEarnedOctas) > 0 ? `${earned} APT` : "—"}
                  </td>
                  <td style={{ fontSize: 11, color: "var(--text-secondary)" }}>{fmtBytes(b.sizeBytes)}</td>
                  <td style={{ fontSize: 11, color: "var(--text-secondary)" }}>{timeAgo(b.lastReadAt)}</td>
                  <td><span className={`badge ${expClass}`}>{expLabel}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Shelby stats */}
      <div className="animate-in delay-4" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
        {[
          { label: "STORAGE PROVIDERS", value: "16",          desc: "Clay-coded replicas" },
          { label: "AVG READ LATENCY",  value: "< 400ms",     desc: "Fiber backbone" },
          { label: "AUDIT COVERAGE",    value: "100%",        desc: "On-chain + internal" },
        ].map(({ label, value, desc }) => (
          <div key={label} style={{
            background: "var(--bg-surface)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)", padding: "1rem 1.25rem",
            display: "flex", flexDirection: "column", gap: "0.25rem",
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", letterSpacing: "0.1em" }}>{label}</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--amber)", lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
