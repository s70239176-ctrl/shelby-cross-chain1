"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletBar } from "./wallet-bar";

const NAV = [
  { href: "/",          label: "Overview"  },
  { href: "/upload",    label: "Store"     },
  { href: "/browse",    label: "Browse"    },
  { href: "/analytics", label: "Analytics" },
];

export function NavBar() {
  const path = usePathname();
  return (
    <header style={{
      borderBottom: "1px solid var(--border)",
      background: "rgba(7,8,12,0.85)",
      backdropFilter: "blur(12px)",
      position: "sticky", top: 0, zIndex: 50,
    }}>
      <div style={{
        maxWidth: 1200, margin: "0 auto", padding: "0 2rem",
        height: 56, display: "flex", alignItems: "center", gap: "2rem",
      }}>
        {/* Logo */}
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.6rem", flexShrink: 0 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: "linear-gradient(135deg, var(--pink), var(--purple))",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 700, color: "#fff",
          }}>S</div>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 15, fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.01em" }}>
            Shelby <span style={{ color: "var(--pink)" }}>Bridge</span>
          </span>
        </Link>

        {/* Nav */}
        <nav style={{ display: "flex", gap: "0.15rem" }}>
          {NAV.map(({ href, label }) => {
            const active = href === "/" ? path === "/" : path.startsWith(href);
            return (
              <Link key={href} href={href} style={{
                padding: "0.35rem 0.85rem", borderRadius: 6, fontSize: 13, fontWeight: 500,
                textDecoration: "none",
                color: active ? "var(--text-1)" : "var(--text-3)",
                background: active ? "var(--bg-raised)" : "transparent",
                border: `1px solid ${active ? "var(--border-bright)" : "transparent"}`,
                transition: "all 0.15s",
              }}>
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Status + wallet */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-3)" }}>
            <span className="dot-live" />
            shelbynet
          </div>
          <WalletBar />
        </div>
      </div>
    </header>
  );
}
