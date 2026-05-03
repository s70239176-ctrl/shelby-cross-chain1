"use client";
import { useEffect, useState } from "react";

interface Stats { totalBlobs:number; totalReads:number; totalEarnedApt:string; cacheHitRate:number; activeBlobs:number; networks:string[]; }
interface BlobStat { blobId:string; blobName:string; totalReads:number; cacheHits:number; totalEarnedOctas:string; lastReadAt:string|null; expiresAt:string|null; sizeBytes:number; }
interface Day { date:string; reads:number; }

const MOCK_STATS:Stats = { totalBlobs:24, totalReads:24083, totalEarnedApt:"12.4430", cacheHitRate:87, activeBlobs:19, networks:["aptos","solana","near","base"] };
const MOCK_BLOBS:BlobStat[] = [
  { blobId:"0xabc", blobName:"oracle/eth-usd-feed.json",          totalReads:15320, cacheHits:14200, totalEarnedOctas:"153200000", lastReadAt:new Date(Date.now()-120000).toISOString(),   expiresAt:new Date(Date.now()+86400000*0.4).toISOString(), sizeBytes:4200 },
  { blobId:"0xdef", blobName:"nft/collection-alpha/metadata.json", totalReads:8421,  cacheHits:7100,  totalEarnedOctas:"0",         lastReadAt:new Date(Date.now()-30000).toISOString(),    expiresAt:new Date(Date.now()+86400000*25).toISOString(),  sizeBytes:245000 },
  { blobId:"0x789", blobName:"models/mistral-7b-q4.gguf",          totalReads:142,   cacheHits:121,   totalEarnedOctas:"710000000", lastReadAt:new Date(Date.now()-3600000).toISOString(),  expiresAt:new Date(Date.now()+86400000*6).toISOString(),   sizeBytes:4200000000 },
];
const MOCK_SERIES:Day[] = Array.from({length:28},(_,i)=>({ date:new Date(Date.now()-(27-i)*86400000).toISOString().slice(0,10), reads:Math.floor(Math.random()*1200+400) }));

function MiniBar({ data }:{ data:Day[] }) {
  const max = Math.max(...data.map(d=>d.reads),1);
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:2, height:52 }}>
      {data.slice(-28).map((d,i) => (
        <div key={i} title={`${d.date}: ${d.reads}`} style={{ flex:1, background:"var(--pink)", opacity:0.7, height:`${Math.max(3,(d.reads/max)*48)}px`, borderRadius:"2px 2px 0 0", transition:"height 0.3s" }} />
      ))}
    </div>
  );
}

function fmt(b:number) { return b>1e9?`${(b/1e9).toFixed(2)}GB`:b>1e6?`${(b/1e6).toFixed(2)}MB`:b>1e3?`${(b/1e3).toFixed(1)}KB`:`${b}B`; }
function timeAgo(iso:string|null) {
  if (!iso) return "—";
  const d = Date.now()-new Date(iso).getTime();
  return d<60000?"just now":d<3600000?`${Math.floor(d/60000)}m ago`:d<86400000?`${Math.floor(d/3600000)}h ago`:`${Math.floor(d/86400000)}d ago`;
}

export default function AnalyticsPage() {
  const [stats,  setStats]  = useState<Stats>(MOCK_STATS);
  const [blobs,  setBlobs]  = useState<BlobStat[]>(MOCK_BLOBS);
  const [series, setSeries] = useState<Day[]>(MOCK_SERIES);

  useEffect(() => {
    fetch("/api/analytics").then(r=>r.json()).then(d=>{
      if (d.stats) setStats(d.stats);
      if (d.blobs?.length) setBlobs(d.blobs);
      if (d.timeSeries?.length) setSeries(d.timeSeries);
    }).catch(()=>{});
  }, []);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1.5rem" }}>
      <div className="animate-in">
        <h1 style={{ fontSize:"1.75rem", fontWeight:700, letterSpacing:"-0.02em", marginBottom:4 }}>Analytics</h1>
        <p style={{ color:"var(--text-2)", fontSize:14 }}>Read volume, earnings, and cache performance from shelbynet</p>
      </div>

      {/* Stats */}
      <div className="animate-in delay-1" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:"0.75rem" }}>
        {[
          { label:"Total reads",   value:stats.totalReads.toLocaleString() },
          { label:"APT earned",    value:stats.totalEarnedApt,             unit:" APT" },
          { label:"Cache hit",     value:`${stats.cacheHitRate}%` },
          { label:"Active blobs",  value:`${stats.activeBlobs}/${stats.totalBlobs}` },
          { label:"Networks",      value:stats.networks.length.toString() },
        ].map(({ label, value, unit="" }) => (
          <div key={label} className="stat-card">
            <div className="stat-value" style={{ fontSize:"1.5rem" }}>
              {value}<span style={{ fontSize:"1rem", color:"var(--pink)" }}>{unit}</span>
            </div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="animate-in delay-2 card">
        <div className="section-title">Read volume — last 28 days</div>
        <MiniBar data={series} />
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"var(--text-4)", marginTop:4 }}>
          <span>{series[0]?.date ?? ""}</span>
          <span>{series[series.length-1]?.date ?? ""}</span>
        </div>
      </div>

      {/* Per-blob table */}
      <div className="animate-in delay-3 card" style={{ padding:0, overflow:"hidden" }}>
        <div style={{ padding:"1rem 1.25rem", borderBottom:"1px solid var(--border)" }}>
          <div className="section-title" style={{ marginBottom:0 }}>Per-blob performance</div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Blob</th>
              <th>Reads</th>
              <th>Cache hit</th>
              <th>Earned</th>
              <th>Size</th>
              <th>Last read</th>
            </tr>
          </thead>
          <tbody>
            {blobs.map(b => {
              const hitPct = b.totalReads ? Math.round((b.cacheHits/b.totalReads)*100) : 0;
              return (
                <tr key={b.blobId}>
                  <td>
                    <div style={{ fontWeight:500, color:"var(--text-1)" }}>{b.blobName.split("/").pop()}</div>
                    <div className="mono" style={{ fontSize:10 }}>{b.blobName.split("/").slice(0,-1).join("/")}</div>
                  </td>
                  <td style={{ fontFamily:"var(--font-mono)", fontWeight:600 }}>{b.totalReads.toLocaleString()}</td>
                  <td>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <div style={{ width:48, height:3, background:"var(--border)", borderRadius:2, overflow:"hidden" }}>
                        <div style={{ width:`${hitPct}%`, height:"100%", background:hitPct>80?"var(--green)":"var(--pink)", borderRadius:2 }} />
                      </div>
                      <span style={{ fontSize:11, color:hitPct>80?"var(--green)":"var(--text-2)" }}>{hitPct}%</span>
                    </div>
                  </td>
                  <td style={{ color:Number(b.totalEarnedOctas)>0?"var(--pink)":"var(--text-3)", fontWeight:500 }}>
                    {Number(b.totalEarnedOctas)>0 ? `${(Number(b.totalEarnedOctas)/1e8).toFixed(4)} APT` : "—"}
                  </td>
                  <td style={{ fontSize:12 }}>{fmt(b.sizeBytes)}</td>
                  <td style={{ fontSize:12, color:"var(--text-3)" }}>{timeAgo(b.lastReadAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
