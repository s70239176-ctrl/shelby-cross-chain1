"use client";
import { useState, useRef, useCallback } from "react";

type Stage = "idle"|"uploading"|"done"|"error";

export default function UploadPage() {
  const [file,     setFile]     = useState<File|null>(null);
  const [name,     setName]     = useState("");
  const [ttl,      setTtl]      = useState(604800);
  const [price,    setPrice]    = useState("0");
  const [stage,    setStage]    = useState<Stage>("idle");
  const [pct,      setPct]      = useState(0);
  const [result,   setResult]   = useState<Record<string,string>|null>(null);
  const [error,    setError]    = useState("");
  const dropRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fmt = (b: number) => b > 1e9 ? `${(b/1e9).toFixed(2)} GB` : b > 1e6 ? `${(b/1e6).toFixed(2)} MB` : b > 1e3 ? `${(b/1e3).toFixed(1)} KB` : `${b} B`;

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); dropRef.current?.classList.remove("active");
    const f = e.dataTransfer.files[0];
    if (f) { setFile(f); if (!name) setName(f.name); }
  }, [name]);

  const upload = async () => {
    if (!file) return;
    setError(""); setResult(null); setStage("uploading"); setPct(10);
    const body = new FormData();
    body.append("file", file);
    body.append("blobName", name || file.name);
    body.append("ttlSeconds", String(ttl));
    body.append("pricePerReadOctas", String(Math.round(parseFloat(price||"0")*1e8)));
    try {
      setPct(40);
      const res = await fetch("/api/blobs", { method: "POST", body });
      setPct(80);
      if (!res.ok) throw new Error((await res.json()).error ?? res.statusText);
      const data = await res.json();
      setResult(data); setStage("done"); setPct(100);
    } catch(e) { setError(String(e)); setStage("error"); setPct(0); }
  };

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="animate-in">
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 6 }}>
          Store a blob
        </h1>
        <p style={{ color: "var(--text-2)", fontSize: 14 }}>
          Upload to Shelby hot storage. Set your cache policy and price per cross-chain read.
        </p>
      </div>

      {/* Drop zone */}
      <div className="drop-zone animate-in delay-1" ref={dropRef}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); dropRef.current?.classList.add("active"); }}
        onDragLeave={() => dropRef.current?.classList.remove("active")}
        onDrop={onDrop}
        style={{ padding: "3rem", textAlign: "center", minHeight: 180, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.75rem" }}>
        <input ref={inputRef} type="file" style={{ display:"none" }} onChange={e => { const f=e.target.files?.[0]; if(f){setFile(f);if(!name)setName(f.name);} }} />
        {file ? (
          <>
            <div style={{ fontSize: "2rem" }}>📦</div>
            <div style={{ fontWeight: 600, color: "var(--text-1)" }}>{file.name}</div>
            <div style={{ display:"flex", gap:"0.5rem" }}>
              <span className="badge badge-dim">{fmt(file.size)}</span>
              <span className="badge badge-dim">{file.type||"binary"}</span>
            </div>
            <button className="btn btn-ghost" style={{ fontSize:11 }} onClick={e=>{e.stopPropagation();setFile(null);}}>Remove</button>
          </>
        ) : (
          <>
            <div style={{ fontSize:"2rem", color:"var(--pink)", opacity:0.5 }}>↑</div>
            <div style={{ color:"var(--text-2)" }}>Drop a file or <span style={{ color:"var(--pink)" }}>browse</span></div>
            <div style={{ fontSize:11, color:"var(--text-3)" }}>Any format · Max 5 GiB</div>
          </>
        )}
      </div>

      {/* Config */}
      <div className="animate-in delay-2" style={{ display:"grid", gap:"1rem" }}>
        <div><label className="label">Blob name / key</label>
          <input className="input" placeholder="e.g. models/llama-3b.gguf" value={name} onChange={e=>setName(e.target.value)} />
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
          <div><label className="label">TTL</label>
            <select className="select" style={{width:"100%"}} value={ttl} onChange={e=>setTtl(Number(e.target.value))}>
              <option value={3600}>1 hour</option>
              <option value={86400}>24 hours</option>
              <option value={604800}>7 days</option>
              <option value={2592000}>30 days</option>
              <option value={31536000}>1 year</option>
            </select>
          </div>
          <div><label className="label">Price per read (APT)</label>
            <input className="input" type="number" min="0" step="0.001" placeholder="0.00" value={price} onChange={e=>setPrice(e.target.value)} />
            <div style={{ fontSize:11, color:"var(--text-3)", marginTop:3 }}>
              {parseFloat(price||"0")>0 ? `${Math.round(parseFloat(price)*1e8).toLocaleString()} octas` : "Free reads"}
            </div>
          </div>
        </div>
      </div>

      {/* Upload button */}
      <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem" }}>
        <button className="btn btn-primary" style={{ width:"100%", padding:"0.9rem", fontSize:14 }}
          onClick={upload} disabled={!file || stage==="uploading"}>
          {stage==="uploading" ? `Uploading… ${pct}%` : "Upload to Shelby →"}
        </button>
        {stage==="uploading" && (
          <div><div className="progress-track"><div className="progress-fill" style={{ width:`${pct}%` }} /></div></div>
        )}
        {error && (
          <div style={{ background:"rgba(255,60,60,0.08)", border:"1px solid rgba(255,60,60,0.25)", borderRadius:8, padding:"0.75rem 1rem", fontSize:13, color:"#ff5050" }}>✗ {error}</div>
        )}
      </div>

      {/* Result */}
      {result && (
        <div className="card-glow animate-in" style={{ display:"flex", flexDirection:"column", gap:"0.75rem" }}>
          <div style={{ fontWeight:600, color:"var(--green)", marginBottom:4 }}>✓ Stored on Shelby</div>
          {[
            ["Blob ID",  result.blobId],
            ["Tx hash",  result.transactionHash],
            ["Size",     fmt(Number(result.sizeBytes))],
          ].map(([k,v]) => v && (
            <div key={k} style={{ display:"flex", justifyContent:"space-between", fontSize:12, gap:"1rem" }}>
              <span style={{ color:"var(--text-3)" }}>{k}</span>
              <span className="mono" style={{ textAlign:"right" }}>{v}</span>
            </div>
          ))}
          {result.explorerUrl && (
            <a href={result.explorerUrl} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ textDecoration:"none", textAlign:"center", marginTop:4 }}>
              View on Shelby Explorer ↗
            </a>
          )}
        </div>
      )}
    </div>
  );
}
