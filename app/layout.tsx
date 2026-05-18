"use client";

import Link from "next/link";
import { useState } from "react";
import { CartProvider } from "./cartContext";
import CartIcon from "./CartIcon";
import AuthNav from "./AuthNav";
import AdminMenu from "./AdminMenu";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <html>
      <body style={{ margin: 0, background: "#000", color: "#fff" }}>
        <style>{`
          @keyframes tickerScroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }

          @media (max-width: 800px) {
            .desktopNav {
              display: none !important;
            }

            .mobileMenuButton {
              display: block !important;
            }
          }

          @media (min-width: 801px) {
            .mobileDropdown {
              display: none !important;
            }
          }
        `}</style>

        <CartProvider>
          <div style={topTicker}>
            <div style={tickerTrack}>
              <span>FREE U.S. SHIPPING ON ORDERS OVER $250</span>
              <span>3rd-PARTY TESTED</span>
              <span>MULTIPLE PAYMENT OPTIONS</span>
              <span>CRYPTO FRIENDLY</span>
              <span>
                WE SUPPORT OUR ACTIVE DUTY MILITARY, VETERANS & FIRST RESPONDERS
              </span>

              <span>FREE U.S. SHIPPING ON ORDERS OVER $250</span>
              <span>3rd-PARTY TESTED</span>
              <span>MULTIPLE PAYMENT OPTIONS</span>
              <span>CRYPTO FRIENDLY</span>
              <span>
                WE SUPPORT OUR ACTIVE DUTY MILITARY, VETERANS & FIRST RESPONDERS
              </span>
            </div>
          </div>

          <nav style={navStyle}>
            <div style={logoArea}>
  <Link href="/" style={logoText}>
    <span style={logoGradient}>PUGPEP</span>
  </Link>

  <div id="nav-user-email" style={emailText}></div>
</div>

            <div className="desktopNav" style={navLinks}>
              <NavLink href="/" label="HOME" />
              <NavLink href="/about" label="ABOUT" />
              <NavLink href="/quality" label="QUALITY" />
              <NavLink href="/contact" label="CONTACT" />
              <NavLink href="/account" label="MY ACCOUNT" />
            </div>

            <div style={rightNav}>
              <AdminMenu />
              <AuthNav />
              <CartIcon />

              <button
                className="mobileMenuButton"
                onClick={() => setMenuOpen(!menuOpen)}
                style={mobileMenuButton}
              >
                ☰
              </button>
            </div>
          </nav>

          {menuOpen && (
            <div className="mobileDropdown" style={mobileDropdown}>
              <MobileNavLink href="/" label="HOME" setMenuOpen={setMenuOpen} />
              <MobileNavLink
                href="/about"
                label="ABOUT US"
                setMenuOpen={setMenuOpen}
              />
              <MobileNavLink
                href="/quality"
                label="QUALITY"
                setMenuOpen={setMenuOpen}
              />
              <MobileNavLink
                href="/contact"
                label="CONTACT"
                setMenuOpen={setMenuOpen}
              />
              <MobileNavLink
                href="/account"
                label="MY ACCOUNT"
                setMenuOpen={setMenuOpen}
              />
            </div>
          )}

          {children}
        </CartProvider>
      </body>
    </html>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} style={navLink}>
      {label}
    </Link>
  );
}

function MobileNavLink({
  href,
  label,
  setMenuOpen,
}: {
  href: string;
  label: string;
  setMenuOpen: (open: boolean) => void;
}) {
  return (
    <Link href={href} style={mobileNavLink} onClick={() => setMenuOpen(false)}>
      {label}
    </Link>
  );
}

const navStyle = {
  position: "fixed" as const,
  top: 0,
  left: 0,
  width: "100vw",
  zIndex: 99999,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "16px 24px",
  background: "rgba(0,0,0,.82)",
  backdropFilter: "blur(10px)",
  boxSizing: "border-box" as const,
};

const logoText = {
  textDecoration: "none",
  fontSize: 28,
  fontWeight: "bold",
  letterSpacing: 2,
};

const logoGradient = {
  background: "linear-gradient(90deg, #00d9ff, #ff45d8, #7cff00)",
  WebkitBackgroundClip: "text",
  color: "transparent",
  fontWeight: "900",
  letterSpacing: 2,
  textShadow: "0 0 18px rgba(255,45,210,.35)",
};

const navLinks = {
  display: "flex",
  gap: 18,
  alignItems: "center",
  justifyContent: "center",
};

const navLink = {
  color: "#fff",
  textDecoration: "none",
  fontWeight: "bold",
  fontSize: 14,
  letterSpacing: 1,
};

const rightNav = {
  display: "flex",
  gap: 14,
  alignItems: "center",
};

const mobileMenuButton = {
  display: "none",
  background: "#111",
  color: "#00d9ff",
  border: "1px solid #00d9ff",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 20,
  cursor: "pointer",
};

const mobileDropdown = {
  position: "sticky" as const,
  top: 0,
  zIndex: 999,
  display: "grid",
  gap: 0,
  background: "rgba(0,0,0,.96)",
  borderBottom: "1px solid rgba(255,45,210,.35)",
  boxShadow: "0 0 20px rgba(0,217,255,.18)",
};

const mobileNavLink = {
  color: "#fff",
  textDecoration: "none",
  fontWeight: "bold",
  fontSize: 15,
  letterSpacing: 1,
  padding: "15px 24px",
  borderBottom: "1px solid #222",
};

const topTicker = {
  width: "100%",
  overflow: "hidden",
  background: "linear-gradient(90deg, #ff2fd0, #00d9ff, #7cff00, #ff2fd0)",
  color: "#000",
  fontWeight: "900",
  fontSize: 13,
  letterSpacing: 1,
  whiteSpace: "nowrap" as const,
  borderBottom: "1px solid rgba(255,255,255,.25)",
};

const tickerTrack = {
  display: "inline-flex",
  gap: 50,
  padding: "8px 0",
  animation: "tickerScroll 20s linear infinite",
};
const logoArea = {
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "flex-start",
  gap: 2,
};

const emailText = {
  fontSize: 11,
  color: "#00d9ff",
  opacity: 0.85,
  wordBreak: "break-all" as const,
  maxWidth: 180,
};