"use client";
/**
 * wallet-bar.tsx — zero npm dependencies
 *
 * AIP-62 wallets (Petra, Nightly, etc.) register themselves by dispatching a
 * custom "aptos:wallet-registered" event on window and writing to
 * window.aptos_wallets (a Set of wallet objects). We listen for that event
 * and also check the Set on mount — exactly what @aptos-labs/wallet-standard
 * does internally, without requiring the package.
 *
 * Each AIP-62 wallet object has:
 *   wallet.name          — string
 *   wallet.icon          — string (data URI)
 *   wallet.features      — object keyed by feature name
 *   wallet.accounts      — AptosWalletAccount[]
 *
 * Connect:    wallet.features["aptos:connect"].connect()
 *             returns { accounts: [{ address: Uint8Array, ... }] }
 * Disconnect: wallet.features["aptos:disconnect"].disconnect()
 *
 * Solana / Phantom still uses window.solana (unchanged standard).
 */
import { useState, useEffect, useCallback } from "react";

// ── Raw AIP-62 types (no import needed) ──────────────────────────────────────
interface AptosWalletAccount {
  address: Uint8Array | string;
  publicKey: Uint8Array;
}
interface AptosWallet {
  name:     string;
  icon:     string;
  version:  string;
  chains:   string[];
  features: Record<string, { connect?: () => Promise<{ accounts: AptosWalletAccount[] }>; disconnect?: () => Promise<void> }>;
  accounts: AptosWalletAccount[];
}

declare global {
  interface Window {
    aptos_wallets?: Set<AptosWallet>;
    solana?: {
      connect:    (o?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString: () => string } }>;
      disconnect: () => Promise<void>;
      publicKey?: { toString: () => string };
      isPhantom?: boolean;
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function uint8ToHex(b: Uint8Array | string): string {
  if (typeof b === "string") return b.startsWith("0x") ? b : `0x${b}`;
  return "0x" + Array.from(b).map(x => x.toString(16).padStart(2,"0")).join("");
}
function shortAddr(a: string) {
  const s = a.startsWith("0x") ? a : `0x${a}`;
  return `${s.slice(0,6)}…${s.slice(-4)}`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function WalletBar() {
  const [aptosWallets,    setAptosWallets]    = useState<AptosWallet[]>([]);
  const [connectedWallet, setConnectedWallet] = useState<AptosWallet | null>(null);
  const [aptosAddr,       setAptosAddr]       = useState<string | null>(null);
  const [solanaAddr,      setSolanaAddr]       = useState<string | null>(null);
  const [hasPhantom,      setHasPhantom]      = useState(false);
  const [showPicker,      setShowPicker]      = useState(false);
  const [busy,            setBusy]            = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Read wallets already registered before this component mounted
    const readWallets = () => {
      const set = window.aptos_wallets;
      if (set) setAptosWallets([...set]);
    };
    readWallets();

    // Listen for wallets that register after mount
    const onRegister = () => readWallets();
    window.addEventListener("aptos:wallet-registered", onRegister);

    // Solana
    setHasPhantom(!!window.solana);
    if (window.solana?.publicKey) setSolanaAddr(window.solana.publicKey.toString());

    return () => window.removeEventListener("aptos:wallet-registered", onRegister);
  }, []);

  // Close picker on outside click
  useEffect(() => {
    if (!showPicker) return;
    const close = () => setShowPicker(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [showPicker]);

  // ── Aptos connect ──────────────────────────────────────────────────────────
  const connectAptos = useCallback(async (wallet: AptosWallet) => {
    setShowPicker(false);
    setBusy(true);
    try {
      const feature = wallet.features["aptos:connect"];
      if (!feature?.connect) throw new Error(`${wallet.name} missing aptos:connect feature`);

      const result = await feature.connect();
      const account = result?.accounts?.[0] ?? wallet.accounts?.[0];
      if (!account) throw new Error("No account returned from wallet");

      const addr = uint8ToHex(account.address);
      setAptosAddr(addr);
      setConnectedWallet(wallet);
      sessionStorage.setItem("aptos_address", addr);
    } catch (e) {
      console.error("[wallet-bar] Aptos connect:", e);
      alert(`Could not connect to ${wallet.name}: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }, []);

  const disconnectAptos = useCallback(async () => {
    try {
      const feature = connectedWallet?.features["aptos:disconnect"];
      if (feature?.disconnect) await feature.disconnect();
    } catch { /* ignore */ }
    setAptosAddr(null);
    setConnectedWallet(null);
    sessionStorage.removeItem("aptos_address");
  }, [connectedWallet]);

  // ── Solana connect ─────────────────────────────────────────────────────────
  const connectSolana = useCallback(async () => {
    if (!window.solana) { window.open("https://phantom.app","_blank"); return; }
    setBusy(true);
    try {
      const { publicKey } = await window.solana.connect();
      const addr = publicKey.toString();
      setSolanaAddr(addr);
      sessionStorage.setItem("solana_address", addr);
    } catch (e) { console.error("[wallet-bar] Solana connect:", e); }
    finally { setBusy(false); }
  }, []);

  const disconnectSolana = useCallback(async () => {
    try { await window.solana?.disconnect(); } catch { /* ignore */ }
    setSolanaAddr(null);
    sessionStorage.removeItem("solana_address");
  }, []);

  return (
    <div style={{ display:"flex", gap:"0.5rem", alignItems:"center" }}>

      {/* Aptos */}
      {aptosAddr ? (
        <button className="wallet-pill connected" onClick={disconnectAptos}>
          <span style={{ width:6,height:6,borderRadius:"50%",background:"var(--green)",display:"inline-block" }} />
          {connectedWallet?.name ?? "Aptos"} · {shortAddr(aptosAddr)}
        </button>
      ) : aptosWallets.length > 0 ? (
        <div style={{ position:"relative" }}>
          <button
            className="wallet-pill"
            disabled={busy}
            onClick={e => { e.stopPropagation(); setShowPicker(v => !v); }}
          >
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
        <button className="wallet-pill" onClick={() => window.open("https://petra.app","_blank")}>
          Install Petra
        </button>
      )}

      {/* Solana */}
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
