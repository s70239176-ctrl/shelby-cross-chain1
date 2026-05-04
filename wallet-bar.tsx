"use client";
/**
 * wallet-bar.tsx — zero npm deps
 *
 * Petra:  window.petra.connect() → { address, publicKey }
 *   Docs: https://petra.app/docs/connect-to-petra
 *   Detection: 'aptos' in window (Petra injects window.aptos AND window.petra)
 *   The error "Direct usage of PetraApiClient through window.petra is deprecated"
 *   was triggered by our code calling window.aptos internal methods.
 *   The CORRECT call is: const wallet = window.aptos; wallet.connect()
 *   Per petra.app/docs: check 'aptos' in window, then call window.aptos.connect()
 *
 * Phantom: window.solana.connect() → { publicKey }
 *   Docs: https://docs.phantom.app/solana/establishing-a-connection
 */
import { useState, useEffect, useCallback } from "react";

declare global {
  interface Window {
    // Petra injects window.aptos — this IS the correct object per petra.app/docs
    aptos?: {
      connect:     () => Promise<{ address: string; publicKey: string }>;
      disconnect:  () => Promise<void>;
      isConnected: () => Promise<boolean>;
      account:     () => Promise<{ address: string; publicKey: string }>;
    };
    // Phantom
    solana?: {
      connect:     (o?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString: () => string } }>;
      disconnect:  () => Promise<void>;
      publicKey?:  { toString: () => string };
      isPhantom?:  boolean;
    };
  }
}

function shortAddr(a: string) {
  if (!a) return "";
  const s = a.startsWith("0x") ? a : `0x${a}`;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

export function WalletBar() {
  const [aptosAddr,  setAptosAddr]  = useState<string | null>(null);
  const [solanaAddr, setSolanaAddr] = useState<string | null>(null);
  const [hasPetra,   setHasPetra]   = useState(false);
  const [hasPhantom, setHasPhantom] = useState(false);
  const [busy,       setBusy]       = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Detect wallets — poll briefly to handle extension injection timing
    let attempts = 0;
    const poll = setInterval(() => {
      attempts++;
      const petra   = "aptos"  in window && !!window.aptos;
      const phantom = "solana" in window && !!window.solana;
      if (petra)   setHasPetra(true);
      if (phantom) setHasPhantom(true);
      if ((petra && phantom) || attempts >= 20) clearInterval(poll);
    }, 150);

    // Restore Solana session
    if (window.solana?.publicKey) {
      setSolanaAddr(window.solana.publicKey.toString());
    }

    // Restore Aptos session
    (async () => {
      try {
        if (window.aptos && await window.aptos.isConnected()) {
          const acc = await window.aptos.account();
          setAptosAddr(acc.address);
        }
      } catch { /* not connected */ }
    })();

    return () => clearInterval(poll);
  }, []);

  // ── Petra connect ─────────────────────────────────────────────────────────
  const connectPetra = useCallback(async () => {
    if (!window.aptos) {
      window.open("https://petra.app", "_blank");
      return;
    }
    setBusy(true);
    try {
      // This is the exact pattern from petra.app/docs/connect-to-petra
      const response = await window.aptos.connect();
      setAptosAddr(response.address);
      sessionStorage.setItem("aptos_address", response.address);
    } catch (e: unknown) {
      // Code 4001 = user rejected
      const err = e as { code?: number; message?: string };
      if (err?.code !== 4001) {
        alert(`Petra connect failed: ${err?.message ?? String(e)}`);
      }
    } finally {
      setBusy(false);
    }
  }, []);

  const disconnectPetra = useCallback(async () => {
    try { await window.aptos?.disconnect(); } catch { /* ignore */ }
    setAptosAddr(null);
    sessionStorage.removeItem("aptos_address");
  }, []);

  // ── Phantom connect ───────────────────────────────────────────────────────
  const connectPhantom = useCallback(async () => {
    if (!window.solana) {
      window.open("https://phantom.app", "_blank");
      return;
    }
    setBusy(true);
    try {
      const { publicKey } = await window.solana.connect();
      const addr = publicKey.toString();
      setSolanaAddr(addr);
      sessionStorage.setItem("solana_address", addr);
    } catch (e: unknown) {
      const err = e as { code?: number };
      if (err?.code !== 4001) console.error("Phantom connect:", e);
    } finally {
      setBusy(false);
    }
  }, []);

  const disconnectPhantom = useCallback(async () => {
    try { await window.solana?.disconnect(); } catch { /* ignore */ }
    setSolanaAddr(null);
    sessionStorage.removeItem("solana_address");
  }, []);

  return (
    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>

      {/* Petra */}
      {aptosAddr ? (
        <button className="wallet-pill connected" onClick={disconnectPetra}>
          <span style={{ width:6,height:6,borderRadius:"50%",background:"var(--green)",display:"inline-block" }} />
          Petra · {shortAddr(aptosAddr)}
        </button>
      ) : (
        <button
          className="wallet-pill"
          onClick={connectPetra}
          disabled={busy}
        >
          {hasPetra ? "Connect Petra" : "Install Petra"}
        </button>
      )}

      {/* Phantom */}
      {solanaAddr ? (
        <button className="wallet-pill connected" onClick={disconnectPhantom}>
          <span style={{ width:6,height:6,borderRadius:"50%",background:"var(--purple)",display:"inline-block" }} />
          Phantom · {solanaAddr.slice(0,4)}…{solanaAddr.slice(-4)}
        </button>
      ) : (
        <button
          className="wallet-pill"
          onClick={connectPhantom}
          disabled={busy}
        >
          {hasPhantom ? "Connect Phantom" : "Install Phantom"}
        </button>
      )}
    </div>
  );
}
