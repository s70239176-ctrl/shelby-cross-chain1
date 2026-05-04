"use client";
/**
 * wallet-bar.tsx
 *
 * Aptos (Petra + any AIP-62 wallet):
 *   Uses getAptosWallets() from @aptos-labs/wallet-standard exactly as
 *   documented at aptos.dev/build/sdks/wallet-adapter/wallet-standards:
 *     const { aptosWallets, on } = getAptosWallets();
 *   Connect: wallet.features["aptos:connect"].connect()
 *   Returns: { accounts: [{ address: AccountAddress }] }
 *
 * Solana (Phantom): window.solana.connect() — unchanged standard.
 */
import { useState, useEffect, useCallback } from "react";
import { getAptosWallets } from "@aptos-labs/wallet-standard";
import type { AptosWallet } from "@aptos-labs/wallet-standard";

declare global {
  interface Window {
    solana?: {
      connect:    (o?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString: () => string } }>;
      disconnect: () => Promise<void>;
      publicKey?: { toString: () => string };
      isPhantom?: boolean;
    };
  }
}

function shortAddr(a: string) {
  const s = String(a);
  if (s.length <= 12) return s;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
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
    if (typeof window === "undefined") return;

    // getAptosWallets() returns currently registered wallets + an event emitter.
    // on("register", cb) fires whenever a new wallet registers — handles the race
    // where the extension injects after React mounts.
    const { aptosWallets: initial, on } = getAptosWallets();
    setAptosWallets([...initial]);

    const offRegister   = on("register",   () => {
      const { aptosWallets: updated } = getAptosWallets();
      setAptosWallets([...updated]);
    });
    const offUnregister = on("unregister", () => {
      const { aptosWallets: updated } = getAptosWallets();
      setAptosWallets([...updated]);
    });

    // Solana
    setHasPhantom(!!window.solana);
    if (window.solana?.publicKey) setSolanaAddr(window.solana.publicKey.toString());

    return () => { offRegister(); offUnregister(); };
  }, []);

  // Close picker when clicking outside
  useEffect(() => {
    if (!showPicker) return;
    const close = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-wallet-picker]")) setShowPicker(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [showPicker]);

  const connectAptos = useCallback(async (wallet: AptosWallet) => {
    setShowPicker(false);
    setBusy(true);
    try {
      const connectFeature = wallet.features["aptos:connect"];
      if (!connectFeature) throw new Error(`${wallet.name} missing aptos:connect feature`);

      const result  = await connectFeature.connect();
      const account = result.accounts[0];
      if (!account) throw new Error("No account returned");

      // address is an AccountAddress object in ts-sdk v6 — call toString()
      const addr = account.address.toString();
      setAptosAddr(addr);
      setConnectedWallet(wallet);
      sessionStorage.setItem("aptos_address", addr);
      sessionStorage.setItem("aptos_wallet",  wallet.name);
    } catch (e: unknown) {
      const err = e as { code?: number; message?: string };
      if (err?.code !== 4001) {
        console.error("[wallet] Aptos connect failed:", e);
        alert(`Connect failed: ${err?.message ?? String(e)}`);
      }
    } finally {
      setBusy(false);
    }
  }, []);

  const disconnectAptos = useCallback(async () => {
    try {
      const f = connectedWallet?.features["aptos:disconnect"];
      if (f) await f.disconnect();
    } catch { /* ignore */ }
    setAptosAddr(null);
    setConnectedWallet(null);
    sessionStorage.removeItem("aptos_address");
    sessionStorage.removeItem("aptos_wallet");
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
      if (err?.code !== 4001) console.error("[wallet] Solana connect:", e);
    } finally {
      setBusy(false);
    }
  }, []);

  const disconnectSolana = useCallback(async () => {
    try { await window.solana?.disconnect(); } catch { /* ignore */ }
    setSolanaAddr(null);
    sessionStorage.removeItem("solana_address");
  }, []);

  return (
    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>

      {/* ── Aptos ─────────────────────────────────────────────────────── */}
      {aptosAddr ? (
        <button className="wallet-pill connected" onClick={disconnectAptos}>
          <span style={{ width:6, height:6, borderRadius:"50%", background:"var(--green)", display:"inline-block" }} />
          {connectedWallet?.name ?? "Aptos"} · {shortAddr(aptosAddr)}
        </button>
      ) : aptosWallets.length === 1 ? (
        <button className="wallet-pill" disabled={busy} onClick={() => connectAptos(aptosWallets[0])}>
          Connect {aptosWallets[0].name}
        </button>
      ) : aptosWallets.length > 1 ? (
        <div data-wallet-picker style={{ position: "relative" }}>
          <button
            className="wallet-pill"
            disabled={busy}
            onClick={e => { e.stopPropagation(); setShowPicker(v => !v); }}
          >
            Connect Aptos ▾
          </button>
          {showPicker && (
            <div style={{
              position: "absolute", top: "calc(100% + 6px)", right: 0,
              background: "var(--bg-raised)", border: "1px solid var(--border-bright)",
              borderRadius: 10, padding: "0.35rem", zIndex: 200, minWidth: 180,
              boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
            }}>
              {aptosWallets.map(w => (
                <button key={w.name} onClick={() => connectAptos(w)} style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%",
                  padding: "0.5rem 0.75rem", background: "none", border: "none",
                  cursor: "pointer", color: "var(--text-1)", fontSize: 13,
                  fontFamily: "var(--font-sans)", borderRadius: 6, textAlign: "left",
                }}>
                  {typeof w.icon === "string" && (
                    <img src={w.icon} alt="" width={20} height={20} style={{ borderRadius: 4 }} />
                  )}
                  {w.name}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <button className="wallet-pill" onClick={() => window.open("https://petra.app", "_blank")}>
          Install Petra
        </button>
      )}

      {/* ── Solana ────────────────────────────────────────────────────── */}
      {solanaAddr ? (
        <button className="wallet-pill connected" onClick={disconnectSolana}>
          <span style={{ width:6, height:6, borderRadius:"50%", background:"var(--purple)", display:"inline-block" }} />
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
