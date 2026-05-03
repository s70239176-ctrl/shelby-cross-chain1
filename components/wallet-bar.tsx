"use client";
// Working wallet connect via direct browser extension injection.
// Petra (Aptos): window.aptos
// Phantom (Solana): window.solana
// No adapter packages needed — raw extension API calls.
import { useState, useEffect, useCallback } from "react";

declare global {
  interface Window {
    aptos?:  { connect: () => Promise<{ address: string }>; disconnect: () => Promise<void>; isConnected: () => Promise<boolean>; account: () => Promise<{ address: string }> };
    solana?: { connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString: () => string } }>; disconnect: () => Promise<void>; isPhantom?: boolean; publicKey?: { toString: () => string } };
  }
}

function short(addr: string) {
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

export function WalletBar() {
  const [aptosAddr,  setAptosAddr]  = useState<string | null>(null);
  const [solanaAddr, setSolanaAddr] = useState<string | null>(null);
  const [busy,       setBusy]       = useState(false);

  // Auto-reconnect on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
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
    if (!window.aptos) {
      window.open("https://petra.app", "_blank");
      return;
    }
    setBusy(true);
    try {
      const { address } = await window.aptos.connect();
      setAptosAddr(address);
      sessionStorage.setItem("aptos_address", address);
    } catch (e) { console.warn("Aptos connect", e); }
    finally { setBusy(false); }
  }, []);

  const disconnectAptos = useCallback(async () => {
    try { await window.aptos?.disconnect(); } catch { /* ignore */ }
    setAptosAddr(null);
    sessionStorage.removeItem("aptos_address");
  }, []);

  const connectSolana = useCallback(async () => {
    if (!window.solana) {
      window.open("https://phantom.app", "_blank");
      return;
    }
    setBusy(true);
    try {
      const resp = await window.solana.connect();
      const addr = resp.publicKey.toString();
      setSolanaAddr(addr);
      sessionStorage.setItem("solana_address", addr);
    } catch (e) { console.warn("Solana connect", e); }
    finally { setBusy(false); }
  }, []);

  const disconnectSolana = useCallback(async () => {
    try { await window.solana?.disconnect(); } catch { /* ignore */ }
    setSolanaAddr(null);
    sessionStorage.removeItem("solana_address");
  }, []);

  return (
    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
      {/* Aptos / Petra */}
      {aptosAddr ? (
        <button className={`wallet-pill connected`} onClick={disconnectAptos}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", display: "inline-block" }} />
          APT · {short(aptosAddr)}
        </button>
      ) : (
        <button className="wallet-pill" onClick={connectAptos} disabled={busy}>
          {window && !window.aptos ? "Install Petra" : "Connect Petra"}
        </button>
      )}

      {/* Solana / Phantom */}
      {solanaAddr ? (
        <button className={`wallet-pill connected`} onClick={disconnectSolana}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--purple)", display: "inline-block" }} />
          SOL · {short(solanaAddr)}
        </button>
      ) : (
        <button className="wallet-pill" onClick={connectSolana} disabled={busy}>
          {window && !window.solana ? "Install Phantom" : "Connect Phantom"}
        </button>
      )}
    </div>
  );
}
