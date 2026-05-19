"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "../lib/supabaseClient";

const ADMIN_EMAIL = "pugpep99@gmail.com";

export default function AdminMenu() {
  const supabase = createClient();
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    async function checkAdmin() {
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email;

      setIsAdmin(email?.toLowerCase() === ADMIN_EMAIL.toLowerCase());
    }

    checkAdmin();
  }, []);

  if (!isAdmin) return null;

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)} style={adminButton}>
        Admin ▾
      </button>

      {open && (
        <div style={dropdown}>
  <Link
    href="/admin"
    style={item}
    onClick={() => setOpen(false)}
  >
    Orders
  </Link>

  <Link
    href="/admin/inventory"
    style={item}
    onClick={() => setOpen(false)}
  >
    Products / Inventory
  </Link>

  <Link
    href="/admin/promos"
    style={item}
    onClick={() => setOpen(false)}
  >
    Promo Codes
  </Link>

  <Link
    href="/admin/customers"
    style={item}
    onClick={() => setOpen(false)}
  >
    Customers
  </Link>
</div>
      )}
    </div>
  );
}

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
  minWidth: 180,
  background: "#080808",
  border: "1px solid #333",
  borderRadius: 10,
  boxShadow: "0 0 25px rgba(0,217,255,.25)",
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