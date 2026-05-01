"use client";
import { useState, useEffect } from "react";

export function WalletBar() {
  const [addr, setAddr]   = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setAddr(sessionStorage.getItem("wallet_address") ?? "");
  }, []);

  const save = () => {
    if (!addr.trim()) return;
    sessionStorage.setItem("wallet_address", addr.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
      <input
        className="input"
        style={{ width: 220, fontSize: 11 }}
        placeholder="Paste your Aptos/Solana address…"
        value={addr}
        onChange={(e) => setAddr(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && save()}
      />
      <button className="btn-ghost" onClick={save}>
        {saved ? "✓ Saved" : "Connect"}
      </button>
    </div>
  );
}
