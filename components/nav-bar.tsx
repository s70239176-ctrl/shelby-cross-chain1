"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletBar } from "./wallet-bar";

const NAV = [
  { href: "/",          label: "DASH" },
  { href: "/upload",    label: "UPLOAD" },
  { href: "/browse",    label: "BROWSE" },
  { href: "/analytics", label: "ANALYTICS" },
];

export function NavBar() {
  const path = usePathname();
  return (
    <header style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-base)", position: "sticky", top: 0, zIndex: 50 }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 2rem", height: 48, display: "flex", alignItems: "center", gap: "2rem" }}>
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <polygon points="9,1 17,5 17,13 9,17 1,13 1,5" stroke="var(--amber)" strokeWidth="1.5" fill="var(--amber-subtle)"/>
            <polygon points="9,5 13,7 13,11 9,13 5,11 5,7" fill="var(--amber)" opacity="0.6"/>
          </svg>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "0.04em" }}>
            HOTLINK<span style={{ color: "var(--amber)" }}>/</span>CACHE
          </span>
        </Link>
        <nav style={{ display: "flex", gap: "0.25rem" }}>
          {NAV.map(({ href, label }) => {
            const active = href === "/" ? path === "/" : path.startsWith(href);
            return (
              <Link key={href} href={href} style={{ padding: "0.3rem 0.75rem", borderRadius: "var(--radius-sm)", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textDecoration: "none", color: active ? "var(--amber)" : "var(--text-tertiary)", background: active ? "var(--amber-subtle)" : "transparent", border: `1px solid ${active ? "var(--amber-dim)" : "transparent"}`, transition: "all 0.15s" }}>
                {label}
              </Link>
            );
          })}
        </nav>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span className="dot-live" />
          <span style={{ fontSize: 10, color: "var(--text-tertiary)", letterSpacing: "0.08em" }}>SHELBYNET</span>
        </div>
        <WalletBar />
      </div>
    </header>
  );
}
