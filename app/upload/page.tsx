"use client";
// apps/web/app/upload/page.tsx
// Upload a blob to Shelby with programmable cache policy.
// Uses the /api/blobs POST route (server-side SDK call) so the API key
// is never exposed in the browser.
import { useState, useRef, useCallback } from "react";

type AccessMode = "public" | "wallet-allowlist" | "nft-gated" | "token-gated";
type Stage = "idle" | "validating" | "encoding" | "uploading" | "committing" | "registering" | "done" | "error";

interface ProgressState { stage: Stage; pct: number; message: string; }
interface UploadResult { blobId: string; explorerUrl: string; aptosTransactionHash: string; sizeBytes: number; expirationMicros: string; }

const TTL_OPTIONS = [
  { label: "1 hour",   seconds: 3_600 },
  { label: "24 hours", seconds: 86_400 },
  { label: "7 days",   seconds: 604_800 },
  { label: "30 days",  seconds: 2_592_000 },
  { label: "1 year",   seconds: 31_536_000 },
];

const ACCESS_MODES: { value: AccessMode; label: string; desc: string }[] = [
  { value: "public",           label: "Public",       desc: "Anyone can read — no gate" },
  { value: "wallet-allowlist", label: "Allowlist",    desc: "Only listed wallet addresses" },
  { value: "nft-gated",        label: "NFT Gate",     desc: "Must hold an NFT from a collection" },
  { value: "token-gated",      label: "Token Gate",   desc: "Must hold a minimum token balance" },
];

export default function UploadPage() {
  const [file,        setFile]        = useState<File | null>(null);
  const [blobName,    setBlobName]    = useState("");
  const [ttl,         setTtl]         = useState(604_800);
  const [priceApt,    setPriceApt]    = useState("0");
  const [accessMode,  setAccessMode]  = useState<AccessMode>("public");
  const [allowlist,   setAllowlist]   = useState("");
  const [gateAddress, setGateAddress] = useState("");
  const [progress,    setProgress]    = useState<ProgressState>({ stage: "idle", pct: 0, message: "" });
  const [result,      setResult]      = useState<UploadResult | null>(null);
  const [error,       setError]       = useState("");
  const dropRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fmtBytes = (b: number) =>
    b > 1e9 ? `${(b/1e9).toFixed(2)} GB`
    : b > 1e6 ? `${(b/1e6).toFixed(2)} MB`
    : b > 1e3 ? `${(b/1e3).toFixed(1)} KB`
    : `${b} B`;

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dropRef.current?.classList.remove("active");
    const f = e.dataTransfer.files[0];
    if (f) { setFile(f); if (!blobName) setBlobName(f.name); }
  }, [blobName]);

  const handleUpload = async () => {
    if (!file) return;
    setError(""); setResult(null);
    setProgress({ stage: "validating", pct: 5, message: "Validating file…" });

    const body = new FormData();
    body.append("file",       file);
    body.append("blobName",   blobName || file.name);
    body.append("ttlSeconds", String(ttl));
    body.append("pricePerReadOctas", String(Math.round(parseFloat(priceApt || "0") * 1e8)));
    body.append("accessMode", accessMode);
    if (accessMode === "wallet-allowlist") body.append("walletAllowlist", allowlist);
    if (accessMode === "nft-gated" || accessMode === "token-gated") body.append("gateAddress", gateAddress);

    // Stream progress from the API via SSE or poll
    try {
      setProgress({ stage: "uploading", pct: 20, message: "Sending to Shelby RPC…" });
      const res = await fetch("/api/blobs", { method: "POST", body });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error ?? "Upload failed");
      }
      setProgress({ stage: "committing", pct: 80, message: "Anchoring on Aptos…" });
      const data = await res.json();
      setProgress({ stage: "done", pct: 100, message: "Upload complete!" });
      setResult(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setProgress({ stage: "error", pct: 0, message: msg });
    }
  };

  const stageColor = (s: Stage) =>
    s === "done" ? "var(--teal)" : s === "error" ? "var(--coral)" : "var(--amber)";

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* Page header */}
      <div className="animate-in">
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 4 }}>
          Upload to <span style={{ color: "var(--amber)" }}>Shelby Hot Storage</span>
        </h2>
        <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          Set TTL, price-per-read, and access rules. Data is Clay-coded and committed to Aptos.
        </p>
      </div>

      {/* Drop zone */}
      <div className="animate-in delay-1 drop-zone"
        ref={dropRef}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); dropRef.current?.classList.add("active"); }}
        onDragLeave={() => dropRef.current?.classList.remove("active")}
        onDrop={onDrop}
        style={{ padding: "2.5rem", textAlign: "center", minHeight: 160, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.75rem" }}
      >
        <input ref={inputRef} type="file" style={{ display: "none" }} onChange={(e) => {
          const f = e.target.files?.[0]; if (f) { setFile(f); if (!blobName) setBlobName(f.name); }
        }} />
        {file ? (
          <>
            <span style={{ fontSize: "1.5rem" }}>📦</span>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{file.name}</div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <span className="badge badge-muted">{fmtBytes(file.size)}</span>
              <span className="badge badge-muted">{file.type || "application/octet-stream"}</span>
            </div>
            <button className="btn-ghost" style={{ fontSize: 10 }} onClick={(e) => { e.stopPropagation(); setFile(null); }}>
              Remove
            </button>
          </>
        ) : (
          <>
            <span style={{ fontSize: "1.75rem", color: "var(--amber)", opacity: 0.5 }}>⬆</span>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              Drop a file here or <span style={{ color: "var(--amber)" }}>browse</span>
            </div>
            <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>Images · Video · JSON · Model weights · Sensor data · Any binary · Max 5 GiB</div>
          </>
        )}
      </div>

      {/* Blob name */}
      <div className="animate-in delay-2" style={{ display: "grid", gap: "0.4rem" }}>
        <label className="label">Blob Name / Key</label>
        <input className="input" placeholder="e.g. models/llama-3b-q4.gguf" value={blobName}
          onChange={(e) => setBlobName(e.target.value)} />
        <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>Stored in Shelby's global namespace — must be unique per account</span>
      </div>

      {/* Cache policy row */}
      <div className="animate-in delay-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div>
          <label className="label">Hot-Cache TTL</label>
          <select className="select" style={{ width: "100%" }} value={ttl} onChange={(e) => setTtl(Number(e.target.value))}>
            {TTL_OPTIONS.map(({ label, seconds }) => (
              <option key={seconds} value={seconds}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Price per Read (APT)</label>
          <input className="input" type="number" min="0" step="0.001" placeholder="0.00"
            value={priceApt} onChange={(e) => setPriceApt(e.target.value)} />
          <span style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 3, display: "block" }}>
            {parseFloat(priceApt || "0") > 0
              ? `${Math.round(parseFloat(priceApt) * 1e8).toLocaleString()} octas`
              : "Free reads"}
          </span>
        </div>
      </div>

      {/* Access mode */}
      <div className="animate-in delay-2">
        <label className="label">Access Control</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem" }}>
          {ACCESS_MODES.map(({ value, label, desc }) => (
            <div key={value}
              onClick={() => setAccessMode(value)}
              style={{
                padding: "0.75rem", borderRadius: "var(--radius)",
                border: `1px solid ${accessMode === value ? "var(--amber-dim)" : "var(--border)"}`,
                background: accessMode === value ? "var(--amber-subtle)" : "var(--bg-surface)",
                cursor: "pointer", transition: "all 0.15s",
              }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: accessMode === value ? "var(--amber)" : "var(--text-primary)", marginBottom: 2 }}>
                {label}
              </div>
              <div style={{ fontSize: 10, color: "var(--text-tertiary)", lineHeight: 1.4 }}>{desc}</div>
            </div>
          ))}
        </div>

        {/* Conditional fields */}
        {accessMode === "wallet-allowlist" && (
          <div style={{ marginTop: "0.75rem" }}>
            <label className="label">Wallet Addresses (one per line)</label>
            <textarea className="input" rows={4} placeholder="0xAddr1...\n0xAddr2...\nSolWallet..."
              value={allowlist} onChange={(e) => setAllowlist(e.target.value)}
              style={{ resize: "vertical", lineHeight: 1.6 }} />
          </div>
        )}
        {(accessMode === "nft-gated" || accessMode === "token-gated") && (
          <div style={{ marginTop: "0.75rem" }}>
            <label className="label">{accessMode === "nft-gated" ? "NFT Collection Address" : "Token Mint Address"}</label>
            <input className="input" placeholder="0x…" value={gateAddress} onChange={(e) => setGateAddress(e.target.value)} />
          </div>
        )}
      </div>

      {/* Upload button + progress */}
      <div className="animate-in delay-3" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <button className="btn-primary" onClick={handleUpload}
          disabled={!file || progress.stage !== "idle" && progress.stage !== "done" && progress.stage !== "error"}
          style={{ width: "100%", padding: "0.8rem" }}>
          {progress.stage === "idle" || progress.stage === "done" || progress.stage === "error"
            ? "⬆  UPLOAD TO SHELBY"
            : `${progress.stage.toUpperCase()}… ${progress.pct}%`}
        </button>

        {progress.stage !== "idle" && (
          <div>
            <div className="progress-track" style={{ marginBottom: 6 }}>
              <div className="progress-fill" style={{ width: `${progress.pct}%`, background: stageColor(progress.stage) }} />
            </div>
            <div style={{ fontSize: 11, color: stageColor(progress.stage), display: "flex", alignItems: "center", gap: "0.4rem" }}>
              {progress.stage !== "done" && progress.stage !== "error" && <span className="dot-live dot-amber" />}
              {progress.message}
            </div>
          </div>
        )}

        {error && (
          <div style={{ background: "var(--coral-glow)", border: "1px solid var(--coral-dim)", borderRadius: "var(--radius)", padding: "0.75rem 1rem", fontSize: 12, color: "var(--coral)" }}>
            ✗ {error}
          </div>
        )}
      </div>

      {/* Result card */}
      {result && (
        <div className="animate-in" style={{ background: "var(--teal-glow)", border: "1px solid var(--teal-dim)", borderRadius: "var(--radius-lg)", padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: 12, fontWeight: 600, color: "var(--teal)" }}>
            ✓ BLOB STORED IN SHELBY HOT STORAGE
          </div>
          {[
            { label: "Blob ID",  value: result.blobId,               mono: true },
            { label: "Aptos TX", value: result.aptosTransactionHash,  mono: true },
            { label: "Size",     value: fmtBytes(result.sizeBytes),   mono: false },
            { label: "Expires",  value: new Date(Number(BigInt(result.expirationMicros) / 1000n)).toLocaleString(), mono: false },
          ].map(({ label, value, mono }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 11, gap: "1rem" }}>
              <span style={{ color: "var(--text-tertiary)", flexShrink: 0 }}>{label}</span>
              <span className={mono ? "hash" : ""} style={{ color: "var(--text-primary)", textAlign: "right", wordBreak: "break-all" }}>{value}</span>
            </div>
          ))}
          <a href={result.explorerUrl} target="_blank" rel="noreferrer" className="btn-ghost" style={{ marginTop: "0.25rem", textAlign: "center", textDecoration: "none" }}>
            View on Shelby Explorer ↗
          </a>
        </div>
      )}
    </div>
  );
}
