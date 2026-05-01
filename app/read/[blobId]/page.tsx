"use client";
// apps/web/app/read/[blobId]/page.tsx
// Request a cross-chain blob read: verify access, pay, stream, show proof.
import { useState, useEffect } from "react";
import { useParams }           from "next/navigation";

type ConsumerChain = "solana" | "aptos" | "near" | "ethereum" | "base";
type ReadStage = "idle" | "verifying" | "paying" | "fetching" | "verifying-proof" | "done" | "error";

interface BlobMeta {
  blobName:          string;
  owner:             string;
  sizeBytes:         number;
  pricePerReadOctas: string;
  accessMode:        string;
  expirationMicros:  string;
  totalReads:        number;
  commitmentHash:    string;
}

interface ReadResult {
  dataUrl?:         string;
  dataText?:        string;
  sizeBytes:        number;
  latencyMs:        number;
  cacheHit:         boolean;
  deliveryProof: {
    blobId:           string;
    rpcNodePublicKey: string;
    signature:        string;
    timestampMicros:  string;
    settlementTxHash?:string;
  };
  verification: {
    valid:          boolean;
    summary:        string;
    layers: { structural: boolean; cryptographic: boolean; onChain: boolean | "skipped" };
  };
}

const CHAINS: { value: ConsumerChain; label: string }[] = [
  { value: "aptos",    label: "Aptos"     },
  { value: "solana",   label: "Solana"    },
  { value: "near",     label: "NEAR"      },
  { value: "ethereum", label: "Ethereum"  },
  { value: "base",     label: "Base"      },
];

function fmtBytes(b: number) {
  if (b > 1e9) return `${(b/1e9).toFixed(2)} GB`;
  if (b > 1e6) return `${(b/1e6).toFixed(2)} MB`;
  if (b > 1e3) return `${(b/1e3).toFixed(1)} KB`;
  return `${b} B`;
}

const STAGE_MSGS: Record<ReadStage, string> = {
  idle:             "",
  verifying:        "Checking access rules on Aptos…",
  paying:           "Settling payment on Aptos…",
  fetching:         "Fetching blob from Shelby RPC…",
  "verifying-proof":"Verifying cryptographic proof…",
  done:             "Blob delivered and verified",
  error:            "Read failed",
};

export default function ReadPage() {
  const { blobId }           = useParams<{ blobId: string }>();
  const [meta,       setMeta]       = useState<BlobMeta | null>(null);
  const [metaErr,    setMetaErr]    = useState("");
  const [chain,      setChain]      = useState<ConsumerChain>("aptos");
  const [address,    setAddress]    = useState("");
  const [stage,      setStage]      = useState<ReadStage>("idle");
  const [result,     setResult]     = useState<ReadResult | null>(null);
  const [error,      setError]      = useState("");
  const [showRaw,    setShowRaw]    = useState(false);

  useEffect(() => {
    if (!blobId) return;
    fetch(`/api/blobs?blobId=${encodeURIComponent(blobId)}`)
      .then((r) => r.json())
      .then((d) => setMeta(d.blob ?? null))
      .catch((e) => setMetaErr(String(e)));
  }, [blobId]);

  const priceApt = meta ? (Number(meta.pricePerReadOctas) / 1e8).toFixed(4) : "0";

  const handleRead = async () => {
    if (!address.trim()) { setError("Enter your wallet address"); return; }
    setError(""); setResult(null);

    const stagesSequence: ReadStage[] = ["verifying", "paying", "fetching", "verifying-proof", "done"];
    for (const s of stagesSequence) {
      setStage(s);
      if (s === "done") break;
      // Simulate real async steps — actual work is in the API route
      await new Promise<void>((res) => setTimeout(res, s === "fetching" ? 400 : 200));
    }

    try {
      setStage("fetching");
      const res = await fetch("/api/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blobId,
          consumerChain:      chain,
          consumerAddress:    address.trim(),
          paymentAmountOctas: meta?.pricePerReadOctas ?? "0",
        }),
      });

      setStage("verifying-proof");
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error ?? "Read failed");
      }

      const data: ReadResult = await res.json();
      setResult(data);
      setStage("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStage("error");
    }
  };

  const stageColor = (s: ReadStage) =>
    s === "done" ? "var(--teal)" : s === "error" ? "var(--coral)" : "var(--amber)";

  const layerIcon = (v: boolean | "skipped") =>
    v === true ? "✓" : v === "skipped" ? "—" : "✗";
  const layerColor = (v: boolean | "skipped") =>
    v === true ? "var(--teal)" : v === "skipped" ? "var(--text-tertiary)" : "var(--coral)";

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* Header */}
      <div className="animate-in">
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 4 }}>
          Cross-Chain <span style={{ color: "var(--amber)" }}>Read</span>
        </h2>
        <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          Verify access · settle payment · fetch blob · receive cryptographic proof
        </p>
      </div>

      {/* Blob metadata panel */}
      <div className="animate-in delay-1" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div className="section-title">BLOB METADATA</div>
        {metaErr && <div style={{ fontSize: 11, color: "var(--coral)" }}>{metaErr}</div>}
        {!meta && !metaErr && <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}><span className="dot-live" style={{ marginRight: 6 }} />Loading metadata from Aptos…</div>}
        {meta && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem 1.5rem" }}>
            {[
              { k: "Blob ID",      v: blobId },
              { k: "Name",         v: meta.blobName },
              { k: "Size",         v: fmtBytes(meta.sizeBytes) },
              { k: "Owner",        v: meta.owner },
              { k: "Access Mode",  v: meta.accessMode.replace(/-/g, " ") },
              { k: "Price/Read",   v: `${priceApt} APT (${Number(meta.pricePerReadOctas).toLocaleString()} octas)` },
              { k: "Total Reads",  v: meta.totalReads.toLocaleString() },
              { k: "Commitment",   v: meta.commitmentHash.slice(0, 20) + "…" },
            ].map(({ k, v }) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, gap: "0.5rem" }}>
                <span style={{ color: "var(--text-tertiary)", flexShrink: 0 }}>{k}</span>
                <span className="hash" style={{ textAlign: "right", wordBreak: "break-all", maxWidth: 260 }}>{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Consumer identity form */}
      <div className="animate-in delay-2" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div className="section-title">CONSUMER IDENTITY</div>
        <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: "0.75rem", alignItems: "end" }}>
          <div>
            <label className="label">Your Chain</label>
            <select className="select" style={{ width: "100%" }} value={chain} onChange={(e) => setChain(e.target.value as ConsumerChain)}>
              {CHAINS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Your Wallet Address</label>
            <input className="input" placeholder={chain === "solana" ? "BobXyz…" : "0x…"} value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
        </div>

        {/* Payment summary */}
        {meta && Number(meta.pricePerReadOctas) > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.6rem 0.85rem", background: "var(--amber-subtle)", border: "1px solid var(--amber-dim)", borderRadius: "var(--radius)", fontSize: 12 }}>
            <span style={{ color: "var(--amber)" }}>◈</span>
            <span style={{ color: "var(--text-secondary)" }}>
              Reading this blob costs <strong style={{ color: "var(--amber)" }}>{priceApt} APT</strong>
              {" "}({Number(meta.pricePerReadOctas).toLocaleString()} octas) settled on Aptos shelbynet
            </span>
          </div>
        )}

        {/* CTA */}
        <button className="btn-primary" onClick={handleRead}
          disabled={stage !== "idle" && stage !== "done" && stage !== "error"}
          style={{ width: "100%", padding: "0.8rem" }}>
          {stage === "idle" || stage === "done" || stage === "error"
            ? `◉  REQUEST CROSS-CHAIN READ  ${Number(meta?.pricePerReadOctas ?? 0) > 0 ? `· ${priceApt} APT` : ""}`
            : `${STAGE_MSGS[stage]} …`}
        </button>

        {error && (
          <div style={{ background: "var(--coral-glow)", border: "1px solid var(--coral-dim)", borderRadius: "var(--radius)", padding: "0.75rem 1rem", fontSize: 12, color: "var(--coral)" }}>
            ✗ {error}
          </div>
        )}

        {/* Stage progress */}
        {stage !== "idle" && (
          <div>
            <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.5rem" }}>
              {(["verifying","paying","fetching","verifying-proof","done"] as ReadStage[]).map((s, i) => {
                const stageOrder = ["verifying","paying","fetching","verifying-proof","done"] as ReadStage[];
                const done = stageOrder.indexOf(stage) > i || stage === "done";
                const active = stage === s;
                return (
                  <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: done || active ? "var(--amber)" : "var(--border)", opacity: active ? 0.9 : done ? 0.5 : 0.2, transition: "all 0.3s" }} />
                );
              })}
            </div>
            <div style={{ fontSize: 11, color: stageColor(stage), display: "flex", alignItems: "center", gap: "0.4rem" }}>
              {stage !== "done" && stage !== "error" && <span className="dot-live dot-amber" />}
              {STAGE_MSGS[stage]}
            </div>
          </div>
        )}
      </div>

      {/* Result */}
      {result && (
        <div className="animate-in" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* Data preview */}
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--teal-dim)", borderRadius: "var(--radius-lg)", padding: "1.25rem 1.5rem" }}>
            <div className="section-title">DELIVERED DATA</div>
            <div style={{ display: "flex", gap: "0.75rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
              {[
                { label: `${fmtBytes(result.sizeBytes)} received`, cls: "badge-teal" },
                { label: `${result.latencyMs}ms latency`, cls: result.latencyMs < 200 ? "badge-teal" : "badge-amber" },
                { label: result.cacheHit ? "CACHE HIT" : "CACHE MISS", cls: result.cacheHit ? "badge-teal" : "badge-muted" },
              ].map(({ label, cls }) => (
                <span key={label} className={`badge ${cls}`}>{label}</span>
              ))}
            </div>
            {result.dataUrl && (
              <img src={result.dataUrl} alt="blob" style={{ maxWidth: "100%", borderRadius: "var(--radius)", border: "1px solid var(--border)" }} />
            )}
            {result.dataText && (
              <div style={{ position: "relative" }}>
                <pre style={{ background: "var(--bg-overlay)", borderRadius: "var(--radius)", padding: "0.75rem", fontSize: 11, color: "var(--text-secondary)", overflow: "auto", maxHeight: 240, lineHeight: 1.6 }}>
                  {showRaw ? result.dataText : result.dataText.slice(0, 800) + (result.dataText.length > 800 ? "\n…" : "")}
                </pre>
                {result.dataText.length > 800 && (
                  <button className="btn-ghost" style={{ fontSize: 10, marginTop: "0.4rem" }} onClick={() => setShowRaw((v) => !v)}>
                    {showRaw ? "Show less" : "Show all"}
                  </button>
                )}
              </div>
            )}
            {!result.dataUrl && !result.dataText && (
              <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Binary data — <a href="#" style={{ color: "var(--amber)" }}>download</a></div>
            )}
          </div>

          {/* Proof panel */}
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.25rem 1.5rem" }}>
            <div className="section-title">PROOF OF DELIVERY</div>
            <div style={{ display: "grid", gap: "0.5rem" }}>
              {/* Verification layers */}
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                {Object.entries(result.verification.layers).map(([layer, v]) => (
                  <span key={layer} style={{ fontSize: 10, padding: "2px 8px", borderRadius: "var(--radius-sm)", background: "var(--bg-overlay)", color: layerColor(v), border: `1px solid ${layerColor(v)}44` }}>
                    {layerIcon(v)} {layer.toUpperCase()}
                  </span>
                ))}
                <span className={`badge ${result.verification.valid ? "badge-teal" : "badge-coral"}`}>
                  {result.verification.valid ? "✓ PROOF VALID" : "✗ PROOF INVALID"}
                </span>
              </div>

              {/* Proof fields */}
              {[
                { k: "Blob ID",          v: result.deliveryProof.blobId },
                { k: "RPC Node Key",     v: result.deliveryProof.rpcNodePublicKey },
                { k: "Signature",        v: result.deliveryProof.signature || "(shelbynet devnet — omitted)" },
                { k: "Timestamp",        v: new Date(Number(BigInt(result.deliveryProof.timestampMicros) / 1000n)).toISOString() },
                { k: "Settlement TX",    v: result.deliveryProof.settlementTxHash ?? "—" },
              ].map(({ k, v }) => (
                <div key={k} style={{ display: "flex", gap: "0.75rem", fontSize: 11 }}>
                  <span style={{ color: "var(--text-tertiary)", minWidth: 110, flexShrink: 0 }}>{k}</span>
                  <span className="hash" style={{ wordBreak: "break-all" }}>{v}</span>
                </div>
              ))}

              <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: "0.25rem", lineHeight: 1.5, fontStyle: "italic" }}>
                {result.verification.summary}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
