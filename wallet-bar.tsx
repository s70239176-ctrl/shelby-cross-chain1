"use client";
import { useState, useEffect, useCallback } from "react";

declare global {
  interface Window {
    aptos?:  { connect: () => Promise<{ address: string }>; disconnect: () => Promise<void>; isConnected: () => Promise<boolean>; account: () => Promise<{ address: string }> };
    solana?: { connect: (o?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString: () => string } }>; disconnect: () => Promise<void>; publicKey?: { toString: () => string } };
  }
}

function short(a: string) { return a.length > 12 ? `${a.slice(0,6)}…${a.slice(-4)}` : a; }

export function WalletBar() {
  const [aptosAddr,  setAptosAddr]  = useState<string|null>(null);
  const [solanaAddr, setSolanaAddr] = useState<string|null>(null);
  const [hasPetra,   setHasPetra]   = useState(false);
  const [hasPhantom, setHasPhantom] = useState(false);
  const [busy, setBusy] = useState(false);

  // All window access inside useEffect — never runs on the server
  useEffect(() => {
    setHasPetra(typeof window !== "undefined" && !!window.aptos);
    setHasPhantom(typeof window !== "undefined" && !!window.solana);

    (async () => {
      try {
        if (window.aptos && await window.aptos.isConnected()) {
          const acc = await window.aptos.account();
          setAptosAddr(acc.address);
        }
      } catch { /* not connected */ }
      try {
        if (window.solana?.publicKey) setSolanaAddr(window.solana.publicKey.toString());
      } catch { /* not connected */ }
    })();
  }, []);

  const connectAptos = useCallback(async () => {
    if (!window.aptos) { window.open("https://petra.app","_blank"); return; }
    setBusy(true);
    try {
      const { address } = await window.aptos.connect();
      setAptosAddr(address);
      sessionStorage.setItem("aptos_address", address);
    } catch(e) { console.warn(e); }
    finally { setBusy(false); }
  }, []);

  const disconnectAptos = useCallback(async () => {
    try { await window.aptos?.disconnect(); } catch { /* ignore */ }
    setAptosAddr(null);
    sessionStorage.removeItem("aptos_address");
  }, []);

  const connectSolana = useCallback(async () => {
    if (!window.solana) { window.open("https://phantom.app","_blank"); return; }
    setBusy(true);
    try {
      const r = await window.solana.connect();
      const addr = r.publicKey.toString();
      setSolanaAddr(addr);
      sessionStorage.setItem("solana_address", addr);
    } catch(e) { console.warn(e); }
    finally { setBusy(false); }
  }, []);

  const disconnectSolana = useCallback(async () => {
    try { await window.solana?.disconnect(); } catch { /* ignore */ }
    setSolanaAddr(null);
    sessionStorage.removeItem("solana_address");
  }, []);

  return (
    <div style={{ display:"flex", gap:"0.5rem", alignItems:"center" }}>
      {aptosAddr ? (
        <button className="wallet-pill connected" onClick={disconnectAptos}>
          <span style={{ width:6,height:6,borderRadius:"50%",background:"var(--green)",display:"inline-block" }} />
          APT · {short(aptosAddr)}
        </button>
      ) : (
        <button className="wallet-pill" onClick={connectAptos} disabled={busy}>
          {hasPetra ? "Connect Petra" : "Install Petra"}
        </button>
      )}
      {solanaAddr ? (
        <button className="wallet-pill connected" onClick={disconnectSolana}>
          <span style={{ width:6,height:6,borderRadius:"50%",background:"var(--purple)",display:"inline-block" }} />
          SOL · {short(solanaAddr)}
        </button>
      ) : (
        <button className="wallet-pill" onClick={connectSolana} disabled={busy}>
          {hasPhantom ? "Connect Phantom" : "Install Phantom"}
        </button>
      )}
    </div>
  );
}
