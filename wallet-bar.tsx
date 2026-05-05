"use client";
import { useState, useEffect, useCallback } from "react";

interface AptosAccount {
  address: { toString: () => string } | string;
}
interface AptosWallet {
  name:     string;
  icon:     string;
  accounts: AptosAccount[];
  features: Record<string, unknown>;
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

function extractAddress(raw: unknown): string | null {
  if (!raw) return null;
  if (typeof raw === "string") return raw;
  // AccountAddress object from ts-sdk
  if (typeof (raw as { toString?: () => string }).toString === "function") {
    return (raw as { toString: () => string }).toString();
  }
  // Uint8Array fallback
  if (raw instanceof Uint8Array) {
    return "0x" + Array.from(raw).map(b => b.toString(16).padStart(2,"0")).join("");
  }
  return String(raw);
}

export function WalletBar() {
  const [wallets,         setWallets]         = useState<AptosWallet[]>([]);
  const [connectedWallet, setConnectedWallet] = useState<AptosWallet | null>(null);
  const [aptosAddr,       setAptosAddr]       = useState<string | null>(null);
  const [solanaAddr,      setSolanaAddr]       = useState<string | null>(null);
  const [hasPhantom,      setHasPhantom]      = useState(false);
  const [showPicker,      setShowPicker]      = useState(false);
  const [busy,            setBusy]            = useState(false);

  useEffect(() => {
    import("@aptos-labs/wallet-standard")
      .then(({ getAptosWallets }) => {
        const refresh = () => {
          const { aptosWallets } = getAptosWallets();
          setWallets([...aptosWallets] as AptosWallet[]);
        };
        const { on } = getAptosWallets();
        refresh();
        const offR = on("register",   refresh);
        const offU = on("unregister", refresh);
        return () => { offR(); offU(); };
      })
      .catch(console.error);

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
      const features = wallet.features as Record<string, { connect?: () => Promise<unknown> }>;
      const connectFn = features["aptos:connect"]?.connect;
      if (!connectFn) throw new Error(`${wallet.name} does not expose aptos:connect`);

      // Log the raw response so we can see exactly what Petra returns
      const raw = await connectFn();
      console.log("[wallet] connect raw response:", JSON.stringify(raw, null, 2));

      // Try every known response shape
      const r = raw as Record<string, unknown>;
      let addr: string | null = null;

      // Shape 1: { accounts: [{ address }] }
      if (Array.isArray(r.accounts) && r.accounts.length > 0) {
        addr = extractAddress((r.accounts[0] as Record<string, unknown>).address);
      }
      // Shape 2: { address } directly
      if (!addr && r.address) {
        addr = extractAddress(r.address);
      }
      // Shape 3: wallet.accounts populated after connect
      if (!addr && wallet.accounts?.length > 0) {
        addr = extractAddress(wallet.accounts[0].address);
      }
      // Shape 4: string response
      if (!addr && typeof raw === "string") {
        addr = raw;
      }

      if (!addr) {
        console.error("[wallet] Could not extract address from:", raw);
        throw new Error(`Could not read address from ${wallet.name}. Check console for raw response.`);
      }

      setAptosAddr(addr);
      setConnectedWallet(wallet);
      sessionStorage.setItem("aptos_address", addr);
    } catch (e: unknown) {
      const err = e as { code?: number; message?: string };
      if (err?.code !== 4001) {
        console.error("[wallet] connect error:", e);
        alert(`Connect failed: ${err?.message ?? String(e)}`);
      }
    } finally {
      setBusy(false);
    }
  }, []);

  const disconnectAptos = useCallback(async () => {
    try {
      const features = connectedWallet?.features as Record<string, { disconnect?: () => Promise<void> }> | undefined;
      await features?.["aptos:disconnect"]?.disconnect?.();
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
    } catch (e: unknown) {
      const err = e as { code?: number };
      if (err?.code !== 4001) console.error("[wallet] solana:", e);
    } finally { setBusy(false); }
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
          <span style={{ width:6,height:6,borderRadius:"50%",background:"var(--green)",display:"inline-block" }}/>
          {connectedWallet?.name ?? "Aptos"} · {shortAddr(aptosAddr)}
        </button>
      ) : wallets.length === 1 ? (
        <button className="wallet-pill" disabled={busy} onClick={() => connectAptos(wallets[0])}>
          Connect {wallets[0].name}
        </button>
      ) : wallets.length > 1 ? (
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
              {wallets.map(w => (
                <button key={w.name} onClick={() => connectAptos(w)} style={{
                  display:"flex", alignItems:"center", gap:10, width:"100%",
                  padding:"0.5rem 0.75rem", background:"none", border:"none",
                  cursor:"pointer", color:"var(--text-1)", fontSize:13,
                  fontFamily:"var(--font-sans)", borderRadius:6, textAlign:"left",
                }}>
                  {w.icon && <img src={w.icon} alt="" width={20} height={20} style={{ borderRadius:4 }}/>}
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
          <span style={{ width:6,height:6,borderRadius:"50%",background:"var(--purple)",display:"inline-block" }}/>
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
