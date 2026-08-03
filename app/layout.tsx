"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";

import { CartProvider, useCart } from "./cartContext";
import CartIcon from "./CartIcon";
import AuthNav from "./AuthNav";
import AdminMenu from "./AdminMenu";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [
    menuOpen,
    setMenuOpen,
  ] = useState(false);

  const [
    desktopHeaderOpen,
    setDesktopHeaderOpen,
  ] = useState(false);

  useEffect(() => {
    function handleEscape(
      event: KeyboardEvent
    ) {
      if (
        event.key ===
        "Escape"
      ) {
        setMenuOpen(false);
        setDesktopHeaderOpen(false);
      }
    }

    window.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, []);

  return (
    <html lang="en">
      <body style={bodyStyle}>
        <style>{`
          @keyframes tickerScroll {
            0% {
              transform: translateX(0);
            }

            100% {
              transform: translateX(-50%);
            }
          }

          .siteHeaderShell {
            transform: translateY(-100%);
            transition:
              transform 220ms ease,
              box-shadow 220ms ease;
          }

          .siteHeaderShell.open {
            transform: translateY(0);
          }

          .topActivationStrip {
            display: block;
          }

          .mobileMenuButton {
            display: none;
          }

          .mobileDropdown {
            display: none;
          }

          .desktopHeaderCart {
            display: block;
          }

          .mobileCart {
            display: none;
          }

          .floatingDesktopCart {
            display: grid;
          }

          @media (max-width: 800px) {
            .topActivationStrip {
              display: none !important;
            }

            .siteHeaderShell {
              position: sticky !important;
              transform: none !important;
              transition: none !important;
            }

            .desktopNav {
              display: none !important;
            }

            .mobileMenuButton {
              display: block !important;
            }

            .desktopHeaderCart {
              display: none !important;
            }

            .mobileCart {
              display: block !important;
            }

            .floatingDesktopCart {
              display: none !important;
            }

            .mobileDropdown {
              display: grid !important;
            }

            .siteNav {
              padding: 12px 14px !important;
            }

            .tickerTrack {
              animation-duration: 28s !important;
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .siteHeaderShell {
              transition: none !important;
            }

            .tickerTrack {
              animation: none !important;
            }
          }
        `}</style>

        <CartProvider>
          <div
            className="topActivationStrip"
            style={activationStrip}
            onMouseEnter={() =>
              setDesktopHeaderOpen(
                true
              )
            }
            aria-hidden="true"
          >
            <span style={activationGlow} />
          </div>

          <header
            className={`siteHeaderShell${
              desktopHeaderOpen
                ? " open"
                : ""
            }`}
            style={headerShell}
            onMouseEnter={() =>
              setDesktopHeaderOpen(
                true
              )
            }
            onMouseLeave={() =>
              setDesktopHeaderOpen(
                false
              )
            }
          >
            <div style={topTicker}>
              <div
                className="tickerTrack"
                style={tickerTrack}
              >
                <span>
                  FREE U.S. SHIPPING ON
                  ORDERS OVER $250
                </span>

                <span>
                  3rd-PARTY TESTED
                </span>

                <span>
                  MULTIPLE PAYMENT OPTIONS
                </span>

                <span>
                  We support our active duty
                  military, veterans & first
                  responders
                </span>

                <span>
                  FREE U.S. SHIPPING ON
                  ORDERS OVER $250
                </span>

                <span>
                  3rd-PARTY TESTED
                </span>

                <span>
                  MULTIPLE PAYMENT OPTIONS
                </span>

                <span>
                  We support our active duty
                  military, veterans & first
                  responders
                </span>
              </div>
            </div>

            <nav
              className="siteNav"
              style={navStyle}
              aria-label="Primary navigation"
            >
              <div style={logoArea}>
                <Link
                  href="/"
                  style={logoText}
                  onClick={() => {
                    setMenuOpen(false);
                    setDesktopHeaderOpen(
                      false
                    );
                  }}
                >
                  <span
                    style={logoGradient}
                  >
                    PUGPEP
                  </span>
                </Link>

                <div
                  id="nav-user-email"
                  style={emailText}
                />
              </div>

              <div
                className="desktopNav"
                style={navLinks}
              >
                <NavLink
                  href="/"
                  label="HOME"
                  closeHeader={() =>
                    setDesktopHeaderOpen(
                      false
                    )
                  }
                />

                <NavLink
                  href="/about"
                  label="ABOUT"
                  closeHeader={() =>
                    setDesktopHeaderOpen(
                      false
                    )
                  }
                />

                <NavLink
                  href="/quality"
                  label="QUALITY"
                  closeHeader={() =>
                    setDesktopHeaderOpen(
                      false
                    )
                  }
                />

                <NavLink
                  href="/contact"
                  label="CONTACT"
                  closeHeader={() =>
                    setDesktopHeaderOpen(
                      false
                    )
                  }
                />

                <NavLink
                  href="/account"
                  label="MY ACCOUNT"
                  closeHeader={() =>
                    setDesktopHeaderOpen(
                      false
                    )
                  }
                />
              </div>

              <div style={rightNav}>
                <AdminMenu />
                <AuthNav />

                <div className="desktopHeaderCart">
                  <CartIcon />
                </div>

                <div className="mobileCart">
                  <CartIcon />
                </div>

                <button
                  type="button"
                  className="mobileMenuButton"
                  onClick={() =>
                    setMenuOpen(
                      (
                        current
                      ) =>
                        !current
                    )
                  }
                  style={mobileMenuButton}
                  aria-expanded={menuOpen}
                  aria-controls="mobile-site-menu"
                  aria-label={
                    menuOpen
                      ? "Close navigation menu"
                      : "Open navigation menu"
                  }
                >
                  {menuOpen
                    ? "×"
                    : "☰"}
                </button>
              </div>
            </nav>

            {menuOpen && (
              <div
                id="mobile-site-menu"
                className="mobileDropdown"
                style={mobileDropdown}
              >
                <MobileNavLink
                  href="/"
                  label="HOME"
                  setMenuOpen={
                    setMenuOpen
                  }
                />

                <MobileNavLink
                  href="/about"
                  label="ABOUT US"
                  setMenuOpen={
                    setMenuOpen
                  }
                />

                <MobileNavLink
                  href="/quality"
                  label="QUALITY"
                  setMenuOpen={
                    setMenuOpen
                  }
                />

                <MobileNavLink
                  href="/contact"
                  label="CONTACT"
                  setMenuOpen={
                    setMenuOpen
                  }
                />

                <MobileNavLink
                  href="/account"
                  label="MY ACCOUNT"
                  setMenuOpen={
                    setMenuOpen
                  }
                />
              </div>
            )}
          </header>

          <FloatingCart
            headerOpen={desktopHeaderOpen}
          />

          {children}
        </CartProvider>
      </body>
    </html>
  );
}

function FloatingCart({
  headerOpen,
}: {
  headerOpen: boolean;
}) {
  const {
    cart,
  } = useCart();

  if (
    headerOpen ||
    cart.length === 0
  ) {
    return null;
  }

  return (
    <div
      className="floatingDesktopCart"
      style={floatingCart}
    >
      <CartIcon />
    </div>
  );
}

function NavLink({
  href,
  label,
  closeHeader,
}: {
  href: string;
  label: string;
  closeHeader: () => void;
}) {
  return (
    <Link
      href={href}
      style={navLink}
      onClick={closeHeader}
    >
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
  setMenuOpen: (
    open: boolean
  ) => void;
}) {
  return (
    <Link
      href={href}
      style={mobileNavLink}
      onClick={() =>
        setMenuOpen(false)
      }
    >
      {label}
    </Link>
  );
}

const bodyStyle = {
  margin: 0,
  minHeight: "100vh",
  background: "#000000",
  color: "#ffffff",
};

const activationStrip = {
  position: "fixed" as const,
  zIndex: 100000,
  top: 0,
  left: 0,
  width: "100%",
  height: 14,
  cursor: "default",
  background:
    "linear-gradient(180deg, rgba(0,217,255,.20), rgba(0,0,0,0))",
};

const activationGlow = {
  position: "absolute" as const,
  top: 0,
  left: "50%",
  width: 180,
  height: 3,
  transform:
    "translateX(-50%)",
  borderRadius: 999,
  background:
    "linear-gradient(90deg, transparent, #00d9ff, #ff45d8, transparent)",
  boxShadow:
    "0 0 12px rgba(0,217,255,.55)",
};

const headerShell = {
  position: "fixed" as const,
  zIndex: 99999,
  top: 0,
  left: 0,
  width: "100%",
  boxSizing:
    "border-box" as const,
  boxShadow:
    "0 18px 40px rgba(0,0,0,.34)",
};

const navStyle = {
  width: "100%",
  minHeight: 72,
  display: "flex",
  alignItems: "center",
  justifyContent:
    "space-between",
  gap: 20,
  padding: "14px 24px",
  boxSizing:
    "border-box" as const,
  borderBottom:
    "1px solid rgba(255,255,255,.09)",
  background:
    "rgba(0,0,0,.90)",
  backdropFilter:
    "blur(12px)",
};

const logoText = {
  textDecoration: "none",
  fontSize: 28,
  fontWeight: 900,
  letterSpacing: 2,
};

const logoGradient = {
  background:
    "linear-gradient(90deg, #00d9ff, #ff45d8, #7cff00)",
  WebkitBackgroundClip:
    "text",
  color: "transparent",
  fontWeight: 900,
  letterSpacing: 2,
  textShadow:
    "0 0 18px rgba(255,45,210,.35)",
};

const navLinks = {
  display: "flex",
  gap: 22,
  alignItems: "center",
  justifyContent: "center",
};

const navLink = {
  minHeight: 42,
  display: "grid",
  placeItems: "center",
  color: "#ffffff",
  textDecoration: "none",
  fontWeight: 900,
  fontSize: 15,
  letterSpacing: 1,
};

const rightNav = {
  display: "flex",
  gap: 14,
  alignItems: "center",
};

const floatingCart = {
  position: "fixed" as const,
  zIndex: 100001,
  top: 18,
  right: 18,
  minWidth: 48,
  minHeight: 48,
  placeItems: "center",
  padding: 6,
  border:
    "1px solid rgba(0,217,255,.46)",
  borderRadius: 12,
  background:
    "rgba(0,0,0,.86)",
  boxShadow:
    "0 0 20px rgba(0,217,255,.18)",
  backdropFilter:
    "blur(10px)",
};

const mobileMenuButton = {
  background: "#111111",
  color: "#00d9ff",
  border:
    "1px solid #00d9ff",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 22,
  lineHeight: 1,
  cursor: "pointer",
};

const mobileDropdown = {
  gap: 0,
  borderBottom:
    "1px solid rgba(255,45,210,.35)",
  background:
    "rgba(0,0,0,.98)",
  boxShadow:
    "0 12px 24px rgba(0,217,255,.14)",
};

const mobileNavLink = {
  color: "#ffffff",
  textDecoration: "none",
  fontWeight: 900,
  fontSize: 16,
  letterSpacing: 1,
  padding: "16px 20px",
  borderBottom:
    "1px solid #222222",
};

const topTicker = {
  width: "100%",
  overflow: "hidden",
  borderBottom:
    "1px solid rgba(255,255,255,.25)",
  background:
    "linear-gradient(90deg, #ff2fd0, #00d9ff, #7cff00, #ff2fd0)",
  color: "#000000",
  fontWeight: 900,
  fontSize: 13,
  letterSpacing: 1,
  whiteSpace:
    "nowrap" as const,
};

const tickerTrack = {
  display: "inline-flex",
  gap: 50,
  padding: "8px 0",
  animation:
    "tickerScroll 20s linear infinite",
  willChange: "transform",
};

const logoArea = {
  display: "flex",
  flexDirection:
    "column" as const,
  alignItems: "flex-start",
  gap: 2,
};

const emailText = {
  maxWidth: 180,
  color: "#00d9ff",
  fontSize: 11,
  opacity: 0.85,
  wordBreak:
    "break-all" as const,
};