"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { createClient } from "../lib/supabaseClient";

export default function AdminMenu() {
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [isAdmin, setIsAdmin] =
    useState(false);

  const [isSuperAdmin, setIsSuperAdmin] =
    useState(false);

  const [open, setOpen] =
    useState(false);

  const buttonRef =
    useRef<HTMLButtonElement | null>(null);

  const [mobileDropdownTop, setMobileDropdownTop] =
    useState<number | null>(null);

  useEffect(() => {
    let mounted = true;

    async function checkAdmin() {
      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      if (!session?.user) {
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setOpen(false);
        return;
      }

      const [
        adminResult,
        superAdminResult,
      ] = await Promise.all([
        supabase.rpc("is_pugpep_admin"),
        supabase.rpc("is_pugpep_super_admin"),
      ]);

      if (!mounted) {
        return;
      }

      if (adminResult.error) {
        console.error(
          "Admin menu role check failed:",
          adminResult.error
        );

        setIsAdmin(false);
        setIsSuperAdmin(false);
        return;
      }

      if (superAdminResult.error) {
        console.error(
          "Super admin menu role check failed:",
          superAdminResult.error
        );
      }

      setIsAdmin(
        Boolean(adminResult.data)
      );

      setIsSuperAdmin(
        Boolean(superAdminResult.data)
      );
    }

    void checkAdmin();

    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (!mounted) {
            return;
          }

          if (!session) {
            setIsAdmin(false);
            setIsSuperAdmin(false);
            setOpen(false);
            return;
          }

          void checkAdmin();
        }
      );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  function updateMobileDropdownPosition() {
    if (
      typeof window === "undefined" ||
      !buttonRef.current
    ) {
      return;
    }

    if (window.innerWidth <= 640) {
      const rect =
        buttonRef.current.getBoundingClientRect();

      setMobileDropdownTop(
        Math.max(
          8,
          Math.round(rect.bottom + 8)
        )
      );
    } else {
      setMobileDropdownTop(null);
    }
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    updateMobileDropdownPosition();

    function handleViewportChange() {
      updateMobileDropdownPosition();
    }

    window.addEventListener(
      "resize",
      handleViewportChange
    );

    window.addEventListener(
      "scroll",
      handleViewportChange,
      true
    );

    return () => {
      window.removeEventListener(
        "resize",
        handleViewportChange
      );

      window.removeEventListener(
        "scroll",
        handleViewportChange,
        true
      );
    };
  }, [open]);

  if (!isAdmin) {
    return null;
  }

  function closeMenu() {
    setOpen(false);
  }

  return (
    <div
      style={container}
      onMouseEnter={() => {
        updateMobileDropdownPosition();
        setOpen(true);
      }}
      onMouseLeave={closeMenu}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          updateMobileDropdownPosition();

          setOpen(
            (current) => !current
          );
        }}
        style={adminButton}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        Admin

        <span
          aria-hidden="true"
          style={{
            ...chevron,
            transform: open
              ? "rotate(180deg)"
              : "rotate(0deg)",
          }}
        >
          ▾
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="pugpep-admin-dropdown"
          style={{
            ...dropdown,
            ...(mobileDropdownTop !== null
              ? {
                  position: "fixed",
                  top: mobileDropdownTop,
                  left: 12,
                  right: 12,
                  width: "auto",
                  maxWidth: "none",
                  maxHeight:
                    `calc(100vh - ${mobileDropdownTop + 12}px)`,
                }
              : {}),
          }}
        >
          <div
            style={backgroundLogo}
            aria-hidden="true"
          />

          <div
            style={neonTopLine}
            aria-hidden="true"
          />

          <div
            style={menuContent}
          >
            <div style={menuHeader}>
              <span style={menuEyebrow}>
                PUGPEP CONTROL CENTER
              </span>

              <strong style={menuTitle}>
                Admin Navigation
              </strong>
            </div>

            <Link
              href="/admin/dashboard"
              style={item}
              onClick={closeMenu}
              role="menuitem"
            >
              Dashboard
            </Link>

            <Link
              href="/admin"
              style={item}
              onClick={closeMenu}
              role="menuitem"
            >
              Orders
            </Link>

            {isSuperAdmin && (
              <Link
                href="/admin/users"
                style={item}
                onClick={closeMenu}
                role="menuitem"
              >
                Admin Users
              </Link>
            )}

            <Link
              href="/admin/customers"
              style={item}
              onClick={closeMenu}
              role="menuitem"
            >
              Customers
            </Link>

            <div style={sectionLabel}>
              Products
            </div>

            <Link
              href="/admin/inventory"
              style={item}
              onClick={closeMenu}
              role="menuitem"
            >
              Inventory Manager
            </Link>

            <Link
              href="/admin/product-manager"
              style={productManagerItem}
              onClick={closeMenu}
              role="menuitem"
            >
              Product Manager
            </Link>

            <div style={sectionLabel}>
              Promotions
            </div>

            <Link
              href="/admin/promotions"
              style={promotionItem}
              onClick={closeMenu}
              role="menuitem"
            >
              Promotion Center
            </Link>

            <Link
              href="/admin/promos"
              style={item}
              onClick={closeMenu}
              role="menuitem"
            >
              Promo Codes
            </Link>

            <Link
              href="/admin/sales-reps"
              style={item}
              onClick={closeMenu}
              role="menuitem"
            >
              Sales Representatives
            </Link>

            <div style={sectionLabel}>
              Reports
            </div>

            <Link
              href="/admin/analytics"
              style={lastItem}
              onClick={closeMenu}
              role="menuitem"
            >
              Analytics
            </Link>
          </div>
        </div>
      )}

      <style jsx>{`
        @media (max-width: 640px) {
          .pugpep-admin-dropdown {
            box-sizing: border-box !important;
            overscroll-behavior: contain;
          }
        }
      `}</style>
    </div>
  );
}

const container = {
  position: "relative" as const,
  display: "inline-block",
};

const adminButton = {
  minHeight: 38,

  display: "inline-flex",

  alignItems: "center",

  gap: 7,

  padding: "8px 13px",

  border:
    "1px solid rgba(0,217,255,.72)",

  borderRadius: 9,

  background:
    "linear-gradient(135deg, rgba(0,217,255,.08), rgba(255,69,216,.05))",

  backdropFilter:
    "blur(14px)",

  WebkitBackdropFilter:
    "blur(14px)",

  color: "#7df9ff",

  cursor: "pointer",

  fontWeight: 950,

  letterSpacing:
    ".02em",

  boxShadow:
    "0 0 18px rgba(0,217,255,.10), inset 0 0 12px rgba(0,217,255,.03)",
};

const chevron = {
  display: "inline-block",

  transition:
    "transform 160ms ease",
};

const dropdown = {
  position: "absolute" as const,

  zIndex: 9999,

  top: "100%",

  right: 0,

  width: "min(270px, calc(100vw - 24px))",

  maxWidth: "calc(100vw - 24px)",

  boxSizing: "border-box" as const,

  maxHeight: "78vh",

  overflowY: "auto" as const,

  overflowX: "hidden" as const,

  border:
    "1px solid rgba(0,217,255,.30)",

  borderRadius: 16,

  background:
    "linear-gradient(145deg, rgba(5,5,8,.88), rgba(9,9,12,.74))",

  backdropFilter:
    "blur(22px) saturate(135%)",

  WebkitBackdropFilter:
    "blur(22px) saturate(135%)",

  boxShadow:
    "0 18px 55px rgba(0,0,0,.55), 0 0 28px rgba(0,217,255,.10), 0 0 36px rgba(255,69,216,.05)",

  isolation:
    "isolate" as const,
};

const backgroundLogo = {
  position: "absolute" as const,

  inset: 0,

  zIndex: 0,

  backgroundImage:
    "url('/pugpep-logo.png')",

  backgroundRepeat:
    "no-repeat",

  backgroundPosition:
    "center 45%",

  backgroundSize:
    "78% auto",

  opacity: 0.08,

  filter:
    "saturate(1.15) contrast(1.05)",

  pointerEvents:
    "none" as const,
};

const neonTopLine = {
  position: "absolute" as const,

  top: 0,

  left: "10%",

  right: "10%",

  height: 1,

  zIndex: 2,

  background:
    "linear-gradient(90deg, transparent, #00d9ff, #ff45d8, #00ff99, transparent)",

  boxShadow:
    "0 0 16px rgba(0,217,255,.55)",
};

const menuContent = {
  position: "relative" as const,

  zIndex: 1,
};

const menuHeader = {
  padding:
    "14px 15px 13px",

  display: "grid",

  gap: 4,

  borderBottom:
    "1px solid rgba(255,255,255,.08)",

  background:
    "linear-gradient(90deg, rgba(0,217,255,.055), rgba(255,69,216,.045), rgba(0,255,153,.035))",
};

const menuEyebrow = {
  color: "#7df9ff",

  fontSize: 9,

  fontWeight: 950,

  letterSpacing:
    ".15em",
};

const menuTitle = {
  color: "#ffffff",

  fontSize: 15,

  textShadow:
    "0 0 14px rgba(255,255,255,.08)",
};

const item = {
  display: "block",

  padding:
    "11px 14px",

  color:
    "rgba(255,255,255,.92)",

  textDecoration: "none",

  borderBottom:
    "1px solid rgba(255,255,255,.065)",

  background:
    "rgba(0,0,0,.10)",

  backdropFilter:
    "blur(4px)",

  WebkitBackdropFilter:
    "blur(4px)",

  fontSize: 13,

  fontWeight: 750,

  transition:
    "all 150ms ease",
};

const productManagerItem = {
  ...item,

  color: "#00ff99",

  fontWeight: 950,

  background:
    "linear-gradient(90deg, rgba(0,255,153,.10), rgba(0,217,255,.045), transparent)",

  textShadow:
    "0 0 12px rgba(0,255,153,.25)",

  borderLeft:
    "2px solid rgba(0,255,153,.65)",
};

const promotionItem = {
  ...item,

  color: "#ff8ee7",

  fontWeight: 900,

  background:
    "linear-gradient(90deg, rgba(255,69,216,.09), rgba(255,69,216,.02), transparent)",

  textShadow:
    "0 0 12px rgba(255,69,216,.20)",

  borderLeft:
    "2px solid rgba(255,69,216,.55)",
};

const lastItem = {
  ...item,

  borderBottom: "none",
};

const sectionLabel = {
  padding:
    "8px 14px",

  borderBottom:
    "1px solid rgba(255,255,255,.06)",

  background:
    "rgba(0,0,0,.24)",

  backdropFilter:
    "blur(8px)",

  WebkitBackdropFilter:
    "blur(8px)",

  color:
    "rgba(255,255,255,.38)",

  fontSize: 9,

  fontWeight: 950,

  letterSpacing:
    ".14em",

  textTransform:
    "uppercase" as const,
};