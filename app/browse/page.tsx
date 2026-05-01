"use client";
// apps/web/app/browse/page.tsx
// Browse all cached blobs with cross-chain and type filters
import { useEffect, useState } from "react";
import Link from "next/link";

type AccessMode = "public" | "wallet-allowlist" | "nft-gated" | "token-gated";
type Chain      = "all" | "aptos" | "solana" | "near" | "eth" | "base";

interface BlobRecord {
  blobId:            string;
  blobName:          string;
  owner:             string;
  sizeBytes:         number;
  expirationMicros:  string;
  pricePerReadOctas: string;
  accessMode:        AccessMode;
  totalReads:        number;
  originChain:       string;
  commitmentHash:    string;
}

const CHAIN_FILTERS: { value: Chain; label: string }[] = [
  { value: "all",    label: "ALL CHAINS" },
  { value: "aptos",  label: "APTOS" },
  { value: "solana", label: "SOLANA" },
  { value: "near",   label: "NEAR" },
  { value: "eth",    label: "ETHEREUM" },
  { value: "base",   label: "BASE" },
];

const MODE_COLORS: Record<AccessMode, string> = {
  "public":           "badge-teal",
  "wallet-allowlist": "badge-purple",
  "nft-gated":        "badge-amber",
  "token-gated":      "badge-amber",
};

function fmtBytes(b: number) {
  if (b > 1e9) return `${(b/1e9).toFixed(2)} GB`;
  if (b > 1e6) return `${(b/1e6).toFixed(2)} MB`;
  if (b > 1e3) return `${(b/1e3).toFixed(1)} KB`;
  return `${b} B`;
}
function fmtExpiry(micros: string) {
  const ms = Number(BigInt(micros) / 1000n);
  const d  = new Date(ms);
  const now = Date.now();
  if (ms < now)  return { label: "EXPIRED",  cls: "badge-coral" };
  const days = Math.floor((ms - now) / 86_400_000);
  if (days < 1)  return { label: "< 1 DAY",  cls: "badge-amber" };
  if (days < 7)  return { label: `${days}d`,  cls: "badge-amber" };
  return { label: `${days}d`, cls: "badge-muted" };
}
function fmtPrice(octas: string) {
  const n = Number(octas);
  if (n === 0) return "FREE";
  return `${(n / 1e8).toFixed(4)} APT`;
}

// Mock data for UI development (replaced by real API data in prod)
const MOCK_BLOBS: BlobRecord[] = [
  { blobId: "0xabc123def456", blobName: "models/mistral-7b-q4.gguf", owner: "0xCafe1234…", sizeBytes: 4_200_000_000, expirationMicros: String((Date.now() + 6 * 86_400_000) * 1000), pricePerReadOctas: "5000000", accessMode: "public",           totalReads: 142, originChain: "aptos" },
  { blobId: "0xdef789abc012", blobName: "nft/collection-alpha/metadata.json", owner: "0xSol789…", sizeBytes: 245_000, expirationMicros: String((Date.now() + 25 * 86_400_000) * 1000), pricePerReadOctas: "0", accessMode: "public",           totalReads: 8421, originChain: "solana" },
  { blobId: "0x123456789abc", blobName: "depin/sensor-batch-2025-04.bin", owner: "0xNear456…", sizeBytes: 18_500_000, expirationMicros: String((Date.now() + 2 * 86_400_000) * 1000), pricePerReadOctas: "500000", accessMode: "wallet-allowlist", totalReads: 37, originChain: "near" },
  { blobId: "0x987654321fed", blobName: "game/assets/map-v3.bin", owner: "0xSol321…", sizeBytes: 92_000_000, expirationMicros: String((Date.now() + 60 * 86_400_000) * 1000), pricePerReadOctas: "0", accessMode: "nft-gated",        totalReads: 290, originChain: "solana" },
  { blobId: "0xfedcba987654", blobName: "oracle/price-feed-eth-usd.json", owner: "0xBase888…", sizeBytes: 4_200, expirationMicros: String((Date.now() + 0.5 * 86_400_000) * 1000), pricePerReadOctas: "100000", accessMode: "public",           totalReads: 15_320, originChain: "base" },
];

export default function BrowsePage() {
  const [blobs,       setBlobs]       = useState<BlobRecord[]>(MOCK_BLOBS);
  const [filtered,    setFiltered]    = useState<BlobRecord[]>(MOCK_BLOBS);
  const [chain,       setChain]       = useState<Chain>("all");
  const [search,      setSearch]      = useState("");
  const [sortBy,      setSortBy]      = useState<"reads" | "size" | "expiry">("reads");
  const [loading,     setLoading]     = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch("/api/blobs")
      .then((r) => r.json())
      .then((d) => { if (d.blobs?.length) setBlobs(d.blobs); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let out = [...blobs];
    if (chain !== "all") out = out.filter((b) => b.originChain === chain);
    if (search.trim())   out = out.filter((b) =>
      b.blobName.toLowerCase().includes(search.toLowerCase()) ||
      b.blobId.includes(search) ||
      b.owner.toLowerCase().includes(search.toLowerCase())
    );
    if (sortBy === "reads")  out.sort((a, b) => b.totalReads - a.totalReads);
    if (sortBy === "size")   out.sort((a, b) => b.sizeBytes  - a.sizeBytes);
    if (sortBy === "expiry") out.sort((a, b) =>
      Number(BigInt(a.expirationMicros) - BigInt(b.expirationMicros))
    );
    setFiltered(out);
  }, [blobs, chain, search, sortBy]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

      {/* Header */}
      <div className="animate-in" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 4 }}>
            Hot Cache <span style={{ color: "var(--amber)" }}>Browse</span>
          </h2>
          <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            {filtered.length} blob{filtered.length !== 1 ? "s" : ""} in shelbynet hot storage
          </p>
        </div>
        <Link href="/upload" className="btn-primary">⬆ UPLOAD NEW</Link>
      </div>

      {/* Filters bar */}
      <div className="animate-in delay-1" style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
        {/* Search */}
        <input className="input" placeholder="Search by name, blob ID, or owner…" value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: "1 1 240px", minWidth: 200 }} />

        {/* Chain filter */}
        <div style={{ display: "flex", gap: "0.25rem", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "3px" }}>
          {CHAIN_FILTERS.map(({ value, label }) => (
            <button key={value} onClick={() => setChain(value)} style={{
              padding:        "0.25rem 0.6rem",
              borderRadius:   "var(--radius-sm)",
              fontSize:       9, letterSpacing: "0.1em",
              fontWeight:     600, fontFamily: "var(--font-mono)",
              cursor:         "pointer", border: "none",
              background:     chain === value ? "var(--amber-subtle)" : "transparent",
              color:          chain === value ? "var(--amber)"       : "var(--text-tertiary)",
              transition:     "all 0.12s",
            }}>
              {label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <select className="select" value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
          <option value="reads">Sort: Most Reads</option>
          <option value="size">Sort: Largest</option>
          <option value="expiry">Sort: Expiring Soon</option>
        </select>
      </div>

      {/* Table */}
      <div className="animate-in delay-2" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>BLOB NAME</th>
              <th>CHAIN</th>
              <th>SIZE</th>
              <th>ACCESS</th>
              <th>PRICE/READ</th>
              <th>READS</th>
              <th>EXPIRES</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} style={{ textAlign: "center", color: "var(--text-tertiary)", padding: "2rem" }}>
                <span className="dot-live" style={{ marginRight: "0.5rem" }} />Loading from shelbynet…
              </td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: "center", color: "var(--text-tertiary)", padding: "2rem" }}>
                No blobs match your filters
              </td></tr>
            )}
            {filtered.map((blob) => {
              const expiry = fmtExpiry(blob.expirationMicros);
              return (
                <tr key={blob.blobId}>
                  <td>
                    <div style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 500, marginBottom: 2 }}>
                      {blob.blobName.split("/").pop()}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
                      {blob.blobName.split("/").slice(0, -1).join("/")}
                    </div>
                    <div className="hash" style={{ fontSize: 10, marginTop: 2 }}>
                      {blob.blobId.slice(0, 18)}…
                    </div>
                  </td>
                  <td>
                    <span className={`chain-pill chain-${blob.originChain}`}>
                      {blob.originChain}
                    </span>
                  </td>
                  <td style={{ fontSize: 12 }}>{fmtBytes(blob.sizeBytes)}</td>
                  <td>
                    <span className={`badge ${MODE_COLORS[blob.accessMode]}`}>
                      {blob.accessMode.replace("-", " ")}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: blob.pricePerReadOctas === "0" ? "var(--teal)" : "var(--text-primary)" }}>
                    {fmtPrice(blob.pricePerReadOctas)}
                  </td>
                  <td style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 500 }}>
                    {blob.totalReads.toLocaleString()}
                  </td>
                  <td>
                    <span className={`badge ${expiry.cls}`}>{expiry.label}</span>
                  </td>
                  <td>
                    <Link href={`/read/${blob.blobId}`} className="btn-ghost" style={{ fontSize: 10, padding: "0.3rem 0.6rem", textDecoration: "none" }}>
                      READ →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
