"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabaseClient";

const ADMIN_EMAIL = "pugpep99@gmail.com";

export default function AdminCustomersPage() {
  const supabase = createClient();

  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  const [customers, setCustomers] = useState<any[]>([]);

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email;

      if (!email || email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
        setAuthorized(false);
        setLoading(false);
        return;
      }

      setAuthorized(true);
      await loadCustomers();
      setLoading(false);
    }

    init();
  }, []);

  async function loadCustomers() {
    const { data, error } = await supabase
      .from("customer_profiles")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      alert(error.message);
      return;
    }

    setCustomers(data || []);
  }

  async function toggleLifetimeShipping(id: string, current: boolean) {
    const { error } = await supabase
      .from("customer_profiles")
      .update({
        has_lifetime_free_shipping: !current,
      })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadCustomers();
  }

  if (loading) {
    return (
      <main style={page}>
        Loading customers...
      </main>
    );
  }

  if (!authorized) {
    return (
      <main style={page}>
        <h1 style={{ color: "#ff45d8" }}>Access Denied</h1>
      </main>
    );
  }

  const lifetimeCount = customers.filter(
    (c) => c.has_lifetime_free_shipping
  ).length;

  return (
    <main style={page}>
      <h1 style={{ color: "#ff45d8" }}>
        Customer Accounts
      </h1>

      <div style={summaryBox}>
        <h2 style={{ color: "#00d9ff", marginTop: 0 }}>
          Lifetime Free Shipping Customers
        </h2>

        <h1 style={{ color: "#00ff99" }}>
          {lifetimeCount} / 100
        </h1>
      </div>

      <section style={box}>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Email</th>
              <th style={th}>Created</th>
              <th style={th}>Lifetime Shipping</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {customers.map((customer) => (
              <tr
                key={customer.id}
                style={{ borderBottom: "1px solid #333" }}
              >
                <td style={td}>{customer.email}</td>

                <td style={td}>
                  {new Date(
                    customer.created_at
                  ).toLocaleDateString()}
                </td>

                <td style={td}>
                  <span
                    style={{
                      color: customer.has_lifetime_free_shipping
                        ? "#00ff99"
                        : "#888",
                      fontWeight: "bold",
                    }}
                  >
                    {customer.has_lifetime_free_shipping
                      ? "ACTIVE"
                      : "INACTIVE"}
                  </span>
                </td>

                <td style={td}>
                  <button
                    onClick={() =>
                      toggleLifetimeShipping(
                        customer.id,
                        customer.has_lifetime_free_shipping
                      )
                    }
                    style={
                      customer.has_lifetime_free_shipping
                        ? deactivateButton
                        : activateButton
                    }
                  >
                    {customer.has_lifetime_free_shipping
                      ? "Disable"
                      : "Enable"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

const page = {
  minHeight: "100vh",
  background: "#000",
  color: "#fff",
  padding: 35,
};

const summaryBox = {
  marginTop: 20,
  padding: 24,
  border: "1px solid #00d9ff",
  borderRadius: 16,
  background: "rgba(0,217,255,.08)",
};

const box = {
  marginTop: 25,
  padding: 22,
  border: "1px solid rgba(255,255,255,.18)",
  borderRadius: 16,
  background: "rgba(0,0,0,.58)",
};

const table = {
  width: "100%",
  borderCollapse: "collapse" as const,
};

const th = {
  textAlign: "left" as const,
  color: "#00d9ff",
  padding: 10,
};

const td = {
  padding: 10,
};

const activateButton = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #00ff99",
  background: "#002200",
  color: "#00ff99",
  cursor: "pointer",
};

const deactivateButton = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #ff4d4d",
  background: "#220000",
  color: "#ff4d4d",
  cursor: "pointer",
};