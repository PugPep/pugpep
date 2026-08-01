"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "../lib/supabaseClient";

const ADMIN_EMAIL = "pugpep99@gmail.com";

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
      } = await supabase.auth.getSession();

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
    } = supabase.auth.onAuthStateChange(
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
    <div style={container}>
      <button
        type="button"
        onClick={() =>
          setOpen((current) => !current)
        }
        style={adminButton}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        Admin ▾
      </button>

      {open && (
        <div style={dropdown}>
          <Link
            href="/admin/dashboard"
            style={item}
            onClick={closeMenu}
          >
            Dashboard
          </Link>

          <Link
            href="/admin/analytics"
            style={item}
            onClick={closeMenu}
          >
            Analytics
          </Link>

          <Link
            href="/admin"
            style={item}
            onClick={closeMenu}
          >
            Orders
          </Link>

          <Link
            href="/admin/inventory"
            style={item}
            onClick={closeMenu}
          >
            Products / Inventory
          </Link>

          <Link
            href="/admin/customers"
            style={item}
            onClick={closeMenu}
          >
            Customers
          </Link>

          <Link
            href="/admin/promos"
            style={item}
            onClick={closeMenu}
          >
            Promo Codes
          </Link>

          <Link
            href="/admin/sales-reps"
            style={{
              ...item,
              borderBottom: "none",
            }}
            onClick={closeMenu}
          >
            Sales Reps
          </Link>
        </div>
      )}
    </div>
  );
}

const container = {
  position: "relative" as const,
};

const adminButton = {
  background: "#111",
  color: "#00d9ff",
  border: "1px solid #00d9ff",
  borderRadius: 8,
  padding: "8px 12px",
  cursor: "pointer",
  fontWeight: "bold",
};

const dropdown = {
  position: "absolute" as const,
  right: 0,
  top: "42px",
  minWidth: 200,
  background: "#080808",
  border: "1px solid #333",
  borderRadius: 10,
  boxShadow:
    "0 0 25px rgba(0,217,255,.25)",
  zIndex: 9999,
  overflow: "hidden",
};

const item = {
  display: "block",
  padding: "12px 14px",
  color: "#fff",
  textDecoration: "none",
  borderBottom: "1px solid #222",
};