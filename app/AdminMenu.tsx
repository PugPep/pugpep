"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "../lib/supabaseClient";

const ADMIN_EMAIL =
  "pugpep99@gmail.com";

export default function AdminMenu() {
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [isAdmin, setIsAdmin] =
    useState(false);

  const [open, setOpen] =
    useState(false);

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

      const email =
        session?.user?.email;

      setIsAdmin(
        Boolean(
          email &&
            email.toLowerCase() ===
              ADMIN_EMAIL.toLowerCase()
        )
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

          const email =
            session?.user?.email;

          setIsAdmin(
            Boolean(
              email &&
                email.toLowerCase() ===
                  ADMIN_EMAIL.toLowerCase()
            )
          );

          if (!session) {
            setOpen(false);
          }
        }
      );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  if (!isAdmin) {
    return null;
  }

  function closeMenu() {
    setOpen(false);
  }

  return (
    <div
      style={container}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={closeMenu}
    >
      <button
        type="button"
        onClick={() =>
          setOpen((current) => !current)
        }
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
        <div role="menu" style={dropdown}>
          <div style={menuHeader}>
            <span style={menuEyebrow}>
              CONTROL CENTER
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

          <Link
            href="/admin/customers"
            style={item}
            onClick={closeMenu}
            role="menuitem"
          >
            Customers
          </Link>

          <Link
            href="/admin/inventory"
            style={item}
            onClick={closeMenu}
            role="menuitem"
          >
            Products / Inventory
          </Link>

          <div style={sectionLabel}>
            Promotions
          </div>

          <Link
            href="/admin/promotions"
            style={highlightedItem}
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
      )}
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
  padding: "8px 12px",
  border: "1px solid #00d9ff",
  borderRadius: 8,
  background: "#111111",
  color: "#00d9ff",
  cursor: "pointer",
  fontWeight: 900,
  boxShadow:
    "0 0 14px rgba(0,217,255,.10)",
};

const chevron = {
  display: "inline-block",
  transition: "transform 160ms ease",
};

const dropdown = {
  position: "absolute" as const,
  zIndex: 9999,
  top: "100%",
  right: 0,
  minWidth: 240,
  maxHeight: "75vh",
  marginTop: 0,
  overflowY: "auto" as const,
  overflowX: "hidden" as const,
  border: "1px solid #333333",
  borderRadius: 10,
  background: "#080808",
  boxShadow:
    "0 0 25px rgba(0,217,255,.25)",
};

const menuHeader = {
  padding: "12px 14px",
  display: "grid",
  gap: 3,
  borderBottom: "1px solid #222222",
  background:
    "linear-gradient(90deg, rgba(0,217,255,.08), rgba(255,69,216,.06))",
};

const menuEyebrow = {
  color: "#00d9ff",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: ".12em",
};

const menuTitle = {
  color: "#ffffff",
  fontSize: 14,
};

const item = {
  display: "block",
  padding: "12px 14px",
  color: "#ffffff",
  textDecoration: "none",
  borderBottom: "1px solid #222222",
  background: "transparent",
};

const highlightedItem = {
  ...item,
  color: "#ff45d8",
  fontWeight: 900,
  background: "rgba(255,69,216,.08)",
};

const lastItem = {
  ...item,
  borderBottom: "none",
};

const sectionLabel = {
  padding: "9px 14px",
  borderBottom: "1px solid #222222",
  background: "#050505",
  color: "#777777",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: 1,
  textTransform: "uppercase" as const,
};