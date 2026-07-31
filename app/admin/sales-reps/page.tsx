"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabaseClient";

type CustomerAccount = {
  id: string;
  full_name: string | null;
  email: string | null;
  is_sales_rep: boolean;
};

type SalesRep = {
  id: string;
  display_name: string;
  email: string | null;
  commission_percent: number;
  customer_count: number;
  paid_order_count: number;
  paid_revenue: number;
  paid_profit: number;
  unpaid_commission: number;
  paid_commission: number;
  is_active: boolean;
};

export default function SalesRepsPage() {
  const [accounts, setAccounts] = useState<CustomerAccount[]>([]);
  const [reps, setReps] = useState<SalesRep[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({
    userId: "",
    displayName: "",
    commissionPercent: "20",
    promoCode: "",
    discountType: "percent",
    discountValue: "10",
  });
  const supabase = createClient();
  async function loadPage() {
    setLoading(true);

    const [accountsResult, repsResult] = await Promise.all([
      supabase.rpc("admin_get_customer_account_options"),
      supabase.rpc("admin_get_sales_reps"),
    ]);

    if (accountsResult.error) {
      alert(accountsResult.error.message);
    } else {
      setAccounts(accountsResult.data || []);
    }

    if (repsResult.error) {
      alert(repsResult.error.message);
    } else {
      setReps(repsResult.data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadPage();
  }, []);

  async function createRep() {
    if (!form.userId) {
      alert("Please select a customer account.");
      return;
    }

    if (!form.displayName.trim()) {
      alert("Please enter a display name.");
      return;
    }

    setCreating(true);

    const { data, error } = await supabase.rpc(
      "admin_create_sales_rep",
      {
        p_user_id: form.userId,
        p_display_name: form.displayName.trim(),
        p_commission_percent: Number(form.commissionPercent),
        p_promo_code: form.promoCode.trim().toUpperCase() || null,
        p_discount_type: form.discountType,
        p_discount_value: Number(form.discountValue || 0),
      }
    );

    setCreating(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Sales representative created.");

    if (data) {
      window.location.href = `/admin/sales-reps/${data}`;
      return;
    }

    await loadPage();
  }

  return (
    <main style={styles.page}>
      <h1 style={styles.title}>Sales Representatives</h1>

      <section style={styles.section}>
        <h2 style={styles.heading}>
          Make an Existing Account a Sales Representative
        </h2>

        <div style={styles.formGrid}>
          <label style={styles.label}>
            Customer account
            <select
              style={styles.input}
              value={form.userId}
              onChange={(event) => {
                const selectedAccount = accounts.find(
                  (account) => account.id === event.target.value
                );

                setForm((current) => ({
                  ...current,
                  userId: event.target.value,
                  displayName:
                    selectedAccount?.full_name ||
                    selectedAccount?.email ||
                    "",
                }));
              }}
            >
              <option value="">Select an account</option>

              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.full_name || account.email || account.id}
                  {account.is_sales_rep ? " — Existing Rep" : ""}
                </option>
              ))}
            </select>
          </label>

          <label style={styles.label}>
            Display name
            <input
              style={styles.input}
              value={form.displayName}
              placeholder="Scoob"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  displayName: event.target.value,
                }))
              }
            />
          </label>

          <label style={styles.label}>
            Commission percentage
            <input
              style={styles.input}
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.commissionPercent}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  commissionPercent: event.target.value,
                }))
              }
            />
          </label>

          <label style={styles.label}>
            Promo code
            <input
              style={styles.input}
              value={form.promoCode}
              placeholder="SCOOB"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  promoCode: event.target.value.toUpperCase(),
                }))
              }
            />
          </label>

          <label style={styles.label}>
            Discount type
            <select
              style={styles.input}
              value={form.discountType}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  discountType: event.target.value,
                }))
              }
            >
              <option value="percent">Percent discount</option>
              <option value="fixed">Fixed-dollar discount</option>
            </select>
          </label>

          <label style={styles.label}>
            Customer discount
            <input
              style={styles.input}
              type="number"
              min="0"
              step="0.01"
              value={form.discountValue}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  discountValue: event.target.value,
                }))
              }
            />
          </label>
        </div>

        <button
          type="button"
          style={styles.button}
          disabled={creating}
          onClick={createRep}
        >
          {creating ? "Creating..." : "Create Sales Representative"}
        </button>
      </section>

      <section style={styles.section}>
        <h2 style={styles.heading}>Current Sales Representatives</h2>

        {loading ? (
          <p>Loading representatives...</p>
        ) : reps.length === 0 ? (
          <p>No sales representatives have been created yet.</p>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Representative</th>
                  <th style={styles.th}>Rate</th>
                  <th style={styles.th}>Customers</th>
                  <th style={styles.th}>Paid Orders</th>
                  <th style={styles.th}>Revenue</th>
                  <th style={styles.th}>Profit</th>
                  <th style={styles.th}>Unpaid Commission</th>
                  <th style={styles.th}>Paid Commission</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>

              <tbody>
                {reps.map((rep) => (
                  <tr key={rep.id} style={styles.row}>
                    <td style={styles.td}>
                      <Link
                        href={`/admin/sales-reps/${rep.id}`}
                        style={styles.link}
                      >
                        {rep.display_name}
                      </Link>

                      <div style={styles.email}>
                        {rep.email || "No email"}
                      </div>
                    </td>

                    <td style={styles.td}>
                      {Number(rep.commission_percent || 0).toFixed(2)}%
                    </td>

                    <td style={styles.td}>
                      {Number(rep.customer_count || 0)}
                    </td>

                    <td style={styles.td}>
                      {Number(rep.paid_order_count || 0)}
                    </td>

                    <td style={styles.td}>
                      ${Number(rep.paid_revenue || 0).toFixed(2)}
                    </td>

                    <td style={styles.td}>
                      ${Number(rep.paid_profit || 0).toFixed(2)}
                    </td>

                    <td style={styles.td}>
                      ${Number(rep.unpaid_commission || 0).toFixed(2)}
                    </td>

                    <td style={styles.td}>
                      ${Number(rep.paid_commission || 0).toFixed(2)}
                    </td>

                    <td style={styles.td}>
                      {rep.is_active ? "Active" : "Inactive"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#000000",
    color: "#ffffff",
    padding: "30px",
  },
  title: {
    color: "#ff45d8",
    marginBottom: "20px",
  },
  section: {
    marginTop: "24px",
    padding: "20px",
    border: "1px solid #333333",
    borderRadius: "14px",
    background: "#111111",
  },
  heading: {
    color: "#00d9ff",
    marginTop: 0,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: "12px",
    marginBottom: "16px",
  },
  label: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "6px",
    fontSize: "14px",
  },
  input: {
    width: "100%",
    boxSizing: "border-box" as const,
    padding: "12px",
    background: "#050505",
    color: "#ffffff",
    border: "1px solid #444444",
    borderRadius: "8px",
  },
  button: {
    padding: "12px 18px",
    borderRadius: "10px",
    border: "1px solid #00d9ff",
    background: "#001b22",
    color: "#00d9ff",
    fontWeight: "bold",
    cursor: "pointer",
  },
  tableWrapper: {
    overflowX: "auto" as const,
  },
  table: {
    width: "100%",
    minWidth: "1050px",
    borderCollapse: "collapse" as const,
  },
  th: {
    textAlign: "left" as const,
    padding: "10px",
    color: "#00d9ff",
    borderBottom: "1px solid #444444",
  },
  row: {
    borderBottom: "1px solid #333333",
  },
  td: {
    padding: "10px",
  },
  link: {
    color: "#ff45d8",
    fontWeight: "bold",
  },
  email: {
    color: "#888888",
    fontSize: "12px",
    marginTop: "4px",
  },
};