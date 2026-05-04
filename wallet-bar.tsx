"use client";
/**
 * wallet-bar.tsx — zero npm deps, robust AIP-62 + legacy Petra detection
 *
 * Detection strategy (in order):
 *  1. window.aptos_wallets Set (AIP-62 standard)
 *  2. window.aptos (legacy Petra — still present in many installs)
 *  3. "aptos:wallet-registered" DOM event (for late-registering wallets)
 *  4. Short polling loop (100ms × 10) to catch wallets that inject
 *     slightly after DOMContentLoaded
 *
 * Solana: window.solana (Phantom standard, unchanged)
 */
import { useState, useEffect, useCallback, useRef } from "react";

interface AptosWalletAccount {
  address: Uint8Array | string;
  publicKey?: Uint8Array;
}
interface AptosWallet {
  name:     string;
  icon:     string;
  version?: string;
  chains?:  string[];
  features: Record<string, {
    connect?:    () => Promise<{ accounts: AptosWalletAccount[] }>;
    disconnect?: () => Promise<void>;
  }>;
  accounts: AptosWalletAccount[];
}

// Legacy Petra (window.aptos) interface
interface LegacyAptos {
  connect:      () => Promise<{ address: string; publicKey?: string }>;
  disconnect:   () => Promise<void>;
  isConnected:  () => Promise<boolean>;
  account:      () => Promise<{ address: string }>;
  network?:     () => Promise<string>;
}

declare global {
  interface Window {
    aptos?:         LegacyAptos;
    aptos_wallets?: Set<AptosWallet>;
    solana?: {
      connect:    (o?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString: () => string } }>;
      disconnect: () => Promise<void>;
      publicKey?: { toString: () => string };
      isPhantom?: boolean;
    };
  }
}

function uint8ToHex(b: Uint8Array | string): string {
  if (typeof b === "string") return b.startsWith("0x") ? b : `0x${b}`;
  return "0x" + Array.from(b).map(x => x.toString(16).padStart(2,"0")).join("");
}
function shortAddr(a: string) {
  const s = a.startsWith("0x") ? a : `0x${a}`;
  return `${s.slice(0,6)}…${s.slice(-4)}`;
}

/** Wrap window.aptos (legacy) as an AptosWallet-shaped object */
function makeLegacyWallet(legacy: LegacyAptos): AptosWallet {
  return {
    name: "Petra",
    icon: "https://petra.app/favicon.ico",
    features: {
      "aptos:connect": {
        connect: async () => {
          const res = await legacy.connect();
          return { accounts: [{ address: res.address }] };
        },
      },
      "aptos:disconnect": {
        disconnect: () => legacy.disconnect(),
      },
    },
    accounts: [],
  };
}

export function WalletBar() {
  const [aptosWallets,    setAptosWallets]    = useState<AptosWallet[]>([]);
  const [connectedWallet, setConnectedWallet] = useState<AptosWallet | null>(null);
  const [aptosAddr,       setAptosAddr]       = useState<string | null>(null);
  const [solanaAddr,      setSolanaAddr]       = useState<string | null>(null);
  const [hasPhantom,      setHasPhantom]      = useState(false);
  const [showPicker,      setShowPicker]      = useState(false);
  const [busy,            setBusy]            = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const discoverWallets = useCallback(() => {
    const found: AptosWallet[] = [];

    // 1. AIP-62 standard set
    if (window.aptos_wallets?.size) {
      found.push(...window.aptos_wallets);
    }

    // 2. Legacy window.aptos (Petra fallback — still present in many versions)
    if (window.aptos && !found.find(w => w.name === "Petra")) {
      found.push(makeLegacyWallet(window.aptos));
    }

    if (found.length > 0) {
      setAptosWallets(found);
      // Stop polling once we've found something
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    }
    return found.length;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Initial check
    discoverWallets();

    // AIP-62 event listener
    const onRegister = () => discoverWallets();
    window.addEventListener("aptos:wallet-registered", onRegister);

    // Poll for 2 seconds (20 × 100ms) — catches wallets that inject after DOMContentLoaded
    let attempts = 0;
    pollRef.current = setInterval(() => {
      attempts++;
      const found = discoverWallets();
      if (found > 0 || attempts >= 20) {
        clearInterval(pollRef.current!);
        pollRef.current = null;
      }
    }, 100);

    // Solana
    setHasPhantom(!!window.solana);
    if (window.solana?.publicKey) setSolanaAddr(window.solana.publicKey.toString());

    return () => {
      window.removeEventListener("aptos:wallet-registered", onRegister);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [discoverWallets]);

  // Close picker on outside click
  useEffect(() => {
    if (!showPicker) return;
    const close = () => setShowPicker(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [showPicker]);

  const connectAptos = useCallback(async (wallet: AptosWallet) => {
    setShowPicker(false);
    setBusy(true);
    try {
      const feature = wallet.features["aptos:connect"];
      if (!feature?.connect) throw new Error(`${wallet.name} missing aptos:connect`);
      const result  = await feature.connect();
      const account = result?.accounts?.[0];
      if (!account) throw new Error("No account returned");
      const addr = uint8ToHex(account.address);
      setAptosAddr(addr);
      setConnectedWallet(wallet);
      sessionStorage.setItem("aptos_address", addr);
    } catch (e) {
      console.error("[wallet]", e);
      alert(`Connect failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally { setBusy(false); }
  }, []);

  const disconnectAptos = useCallback(async () => {
    try {
      const f = connectedWallet?.features["aptos:disconnect"];
      if (f?.disconnect) await f.disconnect();
    } catch { /* ignore */ }
    setAptosAddr(null);
    setConnectedWallet(null);
    sessionStorage.removeItem("aptos_address");
  }, [connectedWallet]);

  const connectSolana = useCallback(async () => {
    if (!window.solana) { window.open("https://phantom.app","_blank"); return; }
    setBusy(true);
    try {
      const { publicKey } = await window.solana.connect();
      const addr = publicKey.toString();
      setSolanaAddr(addr);
      sessionStorage.setItem("solana_address", addr);
    } catch (e) { console.error("[wallet]", e); }
    finally { setBusy(false); }
  }, []);

  const disconnectSolana = useCallback(async () => {
    try { await window.solana?.disconnect(); } catch { /* ignore */ }
    setSolanaAddr(null);
    sessionStorage.removeItem("solana_address");
  }, []);

  return (
    <div style={{ display:"flex", gap:"0.5rem", alignItems:"center" }}>

      {/* ── Aptos ────────────────────────────────────────────────────────── */}
      {aptosAddr ? (
        <button className="wallet-pill connected" onClick={disconnectAptos}>
          <span style={{ width:6,height:6,borderRadius:"50%",background:"var(--green)",display:"inline-block" }} />
          {connectedWallet?.name ?? "Aptos"} · {shortAddr(aptosAddr)}
        </button>
      ) : aptosWallets.length === 1 ? (
        /* Single wallet — connect directly, no picker needed */
        <button className="wallet-pill" disabled={busy} onClick={() => connectAptos(aptosWallets[0])}>
          Connect {aptosWallets[0].name}
        </button>
      ) : aptosWallets.length > 1 ? (
        /* Multiple wallets — show picker */
        <div style={{ position:"relative" }}>
          <button className="wallet-pill" disabled={busy}
            onClick={e => { e.stopPropagation(); setShowPicker(v => !v); }}>
            Connect Aptos ▾
          </button>
          {showPicker && (
            <div onClick={e => e.stopPropagation()} style={{
              position:"absolute", top:"calc(100% + 6px)", right:0,
              background:"var(--bg-raised)", border:"1px solid var(--border-bright)",
              borderRadius:10, padding:"0.35rem", zIndex:200, minWidth:180,
              boxShadow:"0 8px 32px rgba(0,0,0,0.6)",
            }}>
              {aptosWallets.map(w => (
                <button key={w.name} onClick={() => connectAptos(w)} style={{
                  display:"flex", alignItems:"center", gap:10, width:"100%",
                  padding:"0.5rem 0.75rem", background:"none", border:"none",
                  cursor:"pointer", color:"var(--text-1)", fontSize:13,
                  fontFamily:"var(--font-sans)", borderRadius:6, textAlign:"left",
                }}>
                  {w.icon && <img src={w.icon} alt="" width={20} height={20} style={{ borderRadius:4 }} />}
                  {w.name}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Nothing detected yet — offer install */
        <button className="wallet-pill" onClick={() => window.open("https://petra.app","_blank")}>
          Install Petra
        </button>
      )}

      {/* ── Solana ───────────────────────────────────────────────────────── */}
      {solanaAddr ? (
        <button className="wallet-pill connected" onClick={disconnectSolana}>
          <span style={{ width:6,height:6,borderRadius:"50%",background:"var(--purple)",display:"inline-block" }} />
          Phantom · {solanaAddr.slice(0,4)}…{solanaAddr.slice(-4)}
        </button>
      ) : (
        <button className="wallet-pill" onClick={connectSolana} disabled={busy}>
          {hasPhantom ? "Connect Phantom" : "Install Phantom"}
        </button>
      )}
    </div>
  );
}
