"use client";
/**
 * wallet-bar.tsx — AIP-62 via dynamic import, zero build-time bundling issues.
 *
 * @aptos-labs/wallet-standard is imported dynamically inside useEffect,
 * so webpack never statically bundles it (avoiding the got/Node.js dep issue).
 * The dynamic import runs only in the browser where got is not needed
 * (the ESM browser build of wallet-standard doesn't use got).
 *
 * Solana / Phantom: window.solana — unchanged.
 */
import { useState, useEffect, useCallback } from "react";

interface AptosWalletAccount {
  address: { toString: () => string } | string;
}
interface ConnectFeature {
  connect: () => Promise<{ accounts: AptosWalletAccount[] }>;
}
interface DisconnectFeature {
  disconnect: () => Promise<void>;
}
interface AptosWallet {
  name:     string;
  icon:     string | { toString: () => string };
  features: {
    "aptos:connect"?:    ConnectFeature;
    "aptos:disconnect"?: DisconnectFeature;
    [key: string]: unknown;
  };
  accounts: AptosWalletAccount[];
}

declare global {
  interface Window {
    solana?: {
      connect:    (o?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString: () => string } }>;
      disconnect: () => Promise<void>;
      publicKey?: { toString: () => string };
    };
  }
}

function shortAddr(a: string) {
  if (!a || a.length <= 12) return a;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function WalletBar() {
  const [aptosWallets,    setAptosWallets]    = useState<AptosWallet[]>([]);
  const [connectedWallet, setConnectedWallet] = useState<AptosWallet | null>(null);
  const [aptosAddr,       setAptosAddr]       = useState<string | null>(null);
  const [solanaAddr,      setSolanaAddr]       = useState<string | null>(null);
  const [hasPhantom,      setHasPhantom]      = useState(false);
  const [showPicker,      setShowPicker]      = useState(false);
  const [busy,            setBusy]            = useState(false);

  useEffect(() => {
    // Dynamic import — runs browser-only, webpack does NOT statically analyse this.
    // The browser ESM build of @aptos-labs/wallet-standard does not use 'got'.
    import("@aptos-labs/wallet-standard").then(({ getAptosWallets }) => {
      const { aptosWallets: initial, on } = getAptosWallets();
      setAptosWallets([...initial]);

      const offReg   = on("register",   () => { const { aptosWallets: u } = getAptosWallets(); setAptosWallets([...u]); });
      const offUnreg = on("unregister", () => { const { aptosWallets: u } = getAptosWallets(); setAptosWallets([...u]); });

      return () => { offReg(); offUnreg(); };
    }).catch(console.error);

    // Solana
    if (window.solana) {
      setHasPhantom(true);
      if (window.solana.publicKey) setSolanaAddr(window.solana.publicKey.toString());
    }
  }, []);

  useEffect(() => {
    if (!showPicker) return;
    const close = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-picker]")) setShowPicker(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [showPicker]);

  const connectAptos = useCallback(async (wallet: AptosWallet) => {
    setShowPicker(false);
    setBusy(true);
    try {
      const feature = wallet.features["aptos:connect"];
      if (!feature) throw new Error(`${wallet.name} missing aptos:connect`);
      const result  = await feature.connect();
      const account = result.accounts[0];
      if (!account) throw new Error("No account returned");
      const addr = typeof account.address === "string"
        ? account.address
        : account.address.toString();
      setAptosAddr(addr);
      setConnectedWallet(wallet);
      sessionStorage.setItem("aptos_address", addr);
    } catch (e: unknown) {
      const err = e as { code?: number; message?: string };
      if (err?.code !== 4001) alert(`Connect failed: ${err?.message ?? String(e)}`);
    } finally { setBusy(false); }
  }, []);

  const disconnectAptos = useCallback(async () => {
    try { await connectedWallet?.features["aptos:disconnect"]?.disconnect?.(); } catch { /* ignore */ }
    setAptosAddr(null); setConnectedWallet(null);
    sessionStorage.removeItem("aptos_address");
  }, [connectedWallet]);

  const connectSolana = useCallback(async () => {
    if (!window.solana) { window.open("https://phantom.app", "_blank"); return; }
    setBusy(true);
    try {
      const { publicKey } = await window.solana.connect();
      const addr = publicKey.toString();
      setSolanaAddr(addr);
      sessionStorage.setItem("solana_address", addr);
    } catch (e: unknown) {
      const err = e as { code?: number };
      if (err?.code !== 4001) console.error(e);
    } finally { setBusy(false); }
  }, []);

  const disconnectSolana = useCallback(async () => {
    try { await window.solana?.disconnect(); } catch { /* ignore */ }
    setSolanaAddr(null);
    sessionStorage.removeItem("solana_address");
  }, []);

  const iconSrc = (icon: AptosWallet["icon"]) =>
    typeof icon === "string" ? icon : icon.toString();

  return (
    <div style={{ display:"flex", gap:"0.5rem", alignItems:"center" }}>

      {/* Aptos */}
      {aptosAddr ? (
        <button className="wallet-pill connected" onClick={disconnectAptos}>
          <span style={{ width:6,height:6,borderRadius:"50%",background:"var(--green)",display:"inline-block" }} />
          {connectedWallet?.name ?? "Aptos"} · {shortAddr(aptosAddr)}
        </button>
      ) : aptosWallets.length === 1 ? (
        <button className="wallet-pill" disabled={busy} onClick={() => connectAptos(aptosWallets[0])}>
          Connect {aptosWallets[0].name}
        </button>
      ) : aptosWallets.length > 1 ? (
        <div data-picker style={{ position:"relative" }}>
          <button className="wallet-pill" disabled={busy}
            onClick={e => { e.stopPropagation(); setShowPicker(v => !v); }}>
            Connect Aptos ▾
          </button>
          {showPicker && (
            <div style={{
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
                  {w.icon && <img src={iconSrc(w.icon)} alt="" width={20} height={20} style={{ borderRadius:4 }} />}
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
