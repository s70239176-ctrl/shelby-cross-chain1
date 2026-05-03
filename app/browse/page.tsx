"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Blob { blobId:string; blobName:string; owner:string; sizeBytes:number; pricePerReadOctas:string; accessMode:string; totalReads:number; expirationMicros:string; }
const MOCK:Blob[] = [
  { blobId:"0xabc123def456", blobName:"oracle/eth-usd-feed.json",         owner:"0xCafe…", sizeBytes:4200,          pricePerReadOctas:"100000", accessMode:"public", totalReads:15320, expirationMicros:String((Date.now()+86400000*0.4)*1000) },
  { blobId:"0xdef789abc012", blobName:"nft/collection-alpha/metadata.json",owner:"0xSol…",  sizeBytes:245000,        pricePerReadOctas:"0",      accessMode:"public", totalReads:8421,  expirationMicros:String((Date.now()+86400000*25)*1000) },
  { blobId:"0x123456789abc", blobName:"models/mistral-7b-q4.gguf",        owner:"0xApt…",  sizeBytes:4200000000,    pricePerReadOctas:"5000000",accessMode:"public", totalReads:142,   expirationMicros:String((Date.now()+86400000*6)*1000) },
  { blobId:"0x987654321fed", blobName:"game/assets/map-v3.bin",           owner:"0xSol…",  sizeBytes:92000000,      pricePerReadOctas:"0",      accessMode:"nft-gated",totalReads:290, expirationMicros:String((Date.now()+86400000*60)*1000) },
  { blobId:"0xfedcba987654", blobName:"depin/sensor-batch-2025-04.bin",   owner:"0xNear…", sizeBytes:18500000,      pricePerReadOctas:"500000", accessMode:"public", totalReads:37,    expirationMicros:String((Date.now()+86400000*2)*1000) },
];
const fmt=(b:number)=>b>1e9?`${(b/1e9).toFixed(2)} GB`:b>1e6?`${(b/1e6).toFixed(2)} MB`:b>1e3?`${(b/1e3).toFixed(1)} KB`:`${b} B`;
const fmtApt=(o:string)=>Number(o)===0?"FREE":`${(Number(o)/1e8).toFixed(4)} APT`;

export default function BrowsePage() {
  const [blobs, setBlobs] = useState<Blob[]>(MOCK);
  const [search, setSearch] = useState("");
  useEffect(() => {
    fetch("/api/blobs").then(r=>r.json()).then(d=>{ if(d.blobs?.length) setBlobs(d.blobs); }).catch(()=>{});
  }, []);
  const filtered = blobs.filter(b => !search || b.blobName.toLowerCase().includes(search.toLowerCase()) || b.blobId.includes(search));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.5rem" }}>
      <div className="animate-in" style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between" }}>
        <div>
          <h1 style={{ fontSize:"1.75rem", fontWeight:700, letterSpacing:"-0.02em", marginBottom:4 }}>Browse cache</h1>
          <p style={{ color:"var(--text-2)", fontSize:14 }}>{filtered.length} blob{filtered.length!==1?"s":""} in shelbynet hot storage</p>
        </div>
        <Link href="/upload" className="btn btn-primary" style={{ textDecoration:"none" }}>+ Store blob</Link>
      </div>

      <div className="animate-in delay-1">
        <input className="input" placeholder="Search by name or blob ID…" value={search} onChange={e=>setSearch(e.target.value)} />
      </div>

      <div className="animate-in delay-2 card" style={{ padding:0, overflow:"hidden" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Blob name</th>
              <th>Size</th>
              <th>Access</th>
              <th>Price / read</th>
              <th>Reads</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(b => (
              <tr key={b.blobId}>
                <td>
                  <div style={{ fontWeight:500, color:"var(--text-1)", marginBottom:2 }}>{b.blobName.split("/").pop()}</div>
                  <div className="mono" style={{ fontSize:10 }}>{b.blobId.slice(0,18)}…</div>
                </td>
                <td>{fmt(b.sizeBytes)}</td>
                <td>
                  <span className={`badge ${b.accessMode==="public"?"badge-green":"badge-purple"}`}>
                    {b.accessMode}
                  </span>
                </td>
                <td style={{ color: Number(b.pricePerReadOctas)===0?"var(--green)":"var(--text-1)", fontWeight:500 }}>
                  {fmtApt(b.pricePerReadOctas)}
                </td>
                <td style={{ fontFamily:"var(--font-mono)", fontSize:12 }}>{b.totalReads.toLocaleString()}</td>
                <td>
                  <Link href={`/read/${b.blobId}`} className="btn btn-ghost" style={{ textDecoration:"none" }}>Read →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
