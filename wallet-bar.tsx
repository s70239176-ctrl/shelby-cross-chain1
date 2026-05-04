"use client";
/**
 * wallet-bar.tsx
 *
 * Aptos: uses AIP-62 standard via getAptosWallets() from @aptos-labs/wallet-standard.
 *   - window.aptos is REMOVED in modern Petra — getAptosWallets() is the correct API.
 *   - Wallets register themselves via a custom DOM event; we listen for late registrations.
 *   - Connect by calling wallet.features["aptos:connect"].connect()
 *   - Address from wallet.accounts[0].address (Uint8Array → hex string)
 *
 * Solana: Phantom still uses window.solana (unchanged API).
 *   - connect() returns { publicKey: { toString() } }
 */
import { useState, useEffect, useCallback } from "react";
import { getAptosWallets } from "@aptos-labs/wallet-standard";
import type { AptosWallet } from "@aptos-labs/wallet-standard";

// Solana window type
declare global {
  interface Window {
    solana?: {
      connect: (o?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString: () => string } }>;
      disconnect: () => Promise<void>;
      publicKey?: { toString: () => string };
      isPhantom?: boolean;
    };
  }
}

function short(a: string) {
  const s = a.startsWith("0x") ? a : `0x${a}`;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

function uint8ToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

export function WalletBar() {
  const [aptosWallets,  setAptosWallets]  = useState<AptosWallet[]>([]);
  const [connectedWallet, setConnectedWallet] = useState<AptosWallet | null>(null);
  const [aptosAddr,    setAptosAddr]    = useState<string | null>(null);
  const [solanaAddr,   setSolanaAddr]   = useState<string | null>(null);
  const [hasPhantom,   setHasPhantom]   = useState(false);
  const [showPicker,   setShowPicker]   = useState(false);
  const [busy,         setBusy]         = useState(false);

  // Discover AIP-62 wallets on mount + listen for new registrations
  useEffect(() => {
    if (typeof window === "undefined") return;

    const { aptosWallets: initial, on } = getAptosWallets();
    setAptosWallets([...initial]);

    // Listen for wallets that register after page load (extension loads after dapp)
    const offRegister = on("register", () => {
      const { aptosWallets: updated } = getAptosWallets();
      setAptosWallets([...updated]);
    });
    const offUnregister = on("unregister", () => {
      const { aptosWallets: updated } = getAptosWallets();
      setAptosWallets([...updated]);
    });

    // Check Phantom
    setHasPhantom(!!window.solana?.isPhantom || !!window.solana);

    // Restore Solana session
    if (window.solana?.publicKey) {
      setSolanaAddr(window.solana.publicKey.toString());
    }

    return () => { offRegister(); offUnregister(); };
  }, []);

  // Connect Aptos wallet (AIP-62)
  const connectAptos = useCallback(async (wallet: AptosWallet) => {
    setShowPicker(false);
    setBusy(true);
    try {
      const connectFeature = wallet.features["aptos:connect"];
      if (!connectFeature) throw new Error("Wallet does not support aptos:connect");

      const result = await connectFeature.connect();

      // result.accounts is AptosWalletAccount[]
      // address is Uint8Array in AIP-62
      const account = result.accounts?.[0] ?? wallet.accounts?.[0];
      if (!account) throw new Error("No account returned");

      const addrBytes = account.address;
      const addrHex   = addrBytes instanceof Uint8Array
        ? uint8ToHex(addrBytes)
        : String(addrBytes);

      setAptosAddr(addrHex);
      setConnectedWallet(wallet);
      sessionStorage.setItem("aptos_address", addrHex);
      sessionStorage.setItem("aptos_wallet",  wallet.name);
    } catch (e) {
      console.error("Aptos connect failed:", e);
    } finally {
      setBusy(false);
    }
  }, []);

  // Disconnect Aptos
  const disconnectAptos = useCallback(async () => {
    try {
      const disconnectFeature = connectedWallet?.features["aptos:disconnect"];
      if (disconnectFeature) await disconnectFeature.disconnect();
    } catch { /* ignore */ }
    setAptosAddr(null);
    setConnectedWallet(null);
    sessionStorage.removeItem("aptos_address");
    sessionStorage.removeItem("aptos_wallet");
  }, [connectedWallet]);

  // Connect Solana (Phantom still uses window.solana)
  const connectSolana = useCallback(async () => {
    if (!window.solana) { window.open("https://phantom.app", "_blank"); return; }
    setBusy(true);
    try {
      const { publicKey } = await window.solana.connect();
      const addr = publicKey.toString();
      setSolanaAddr(addr);
      sessionStorage.setItem("solana_address", addr);
    } catch (e) { console.error("Solana connect:", e); }
    finally { setBusy(false); }
  }, []);

  const disconnectSolana = useCallback(async () => {
    try { await window.solana?.disconnect(); } catch { /* ignore */ }
    setSolanaAddr(null);
    sessionStorage.removeItem("solana_address");
  }, []);

  return (
    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", position: "relative" }}>

      {/* ── Aptos ── */}
      {aptosAddr ? (
        <button className="wallet-pill connected" onClick={disconnectAptos}>
          <span style={{ width:6,height:6,borderRadius:"50%",background:"var(--green)",display:"inline-block" }} />
          {connectedWallet?.name ?? "Aptos"} · {short(aptosAddr)}
        </button>
      ) : aptosWallets.length > 0 ? (
        <div style={{ position: "relative" }}>
          <button
            className="wallet-pill"
            onClick={() => setShowPicker(v => !v)}
            disabled={busy}
          >
            Connect Aptos ▾
          </button>
          {showPicker && (
            <div style={{
              position: "absolute", top: "calc(100% + 6px)", right: 0,
              background: "var(--bg-raised)", border: "1px solid var(--border-bright)",
              borderRadius: 10, padding: "0.35rem", zIndex: 100, minWidth: 180,
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            }}>
              {aptosWallets.map(w => (
                <button key={w.name} onClick={() => connectAptos(w)} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%", padding: "0.5rem 0.75rem",
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--text-1)", fontSize: 13, fontFamily: "var(--font-sans)",
                  borderRadius: 6, transition: "background 0.1s", textAlign: "left",
                }}>
                  {w.icon && (
                    <img src={typeof w.icon === "string" ? w.icon : ""} alt="" width={20} height={20} style={{ borderRadius: 4 }} />
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

      {/* ── Solana ── */}
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
