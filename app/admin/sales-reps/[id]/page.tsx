"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "../../../../lib/supabaseClient";

type CustomerAccount = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type PromoCode = {
  id: string;
  promo_code: string;
  discount_type: string;
  discount_value: number;
  is_active: boolean;
};

type Customer = {
  customer_id: string;
  customer_name: string;
  order_count: number;
  revenue: number;
  profit: number;
  commission: number;
};

type Order = {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  commission_amount: number;
  commission_status: string;
};

type DashboardData = {
  rep: {
    display_name: string;
    commission_percent: number;
    is_active: boolean;
  };
  promo_codes: PromoCode[];
  customers: Customer[];
  orders: Order[];
};

export default function SalesRepDetailPage() {
  const params = useParams();
  const id = String(params.id || "");

  const supabase = useMemo(() => createClient(), []);

  const [data, setData] = useState<DashboardData | null>(null);
  const [accounts, setAccounts] = useState<CustomerAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const [edit, setEdit] = useState({
    displayName: "",
    commissionPercent: "20",
    isActive: true,
  });

  const [promo, setPromo] = useState({
    code: "",
    type: "percent",
    value: "10",
  });

  const [customerId, setCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");

  const sortedAccounts = useMemo(() => {
    return [...accounts].sort((a, b) => {
      const emailA = (a.email || "").trim();
      const emailB = (b.email || "").trim();

      return emailA.localeCompare(emailB, undefined, {
        sensitivity: "base",
      });
    });
  }, [accounts]);

  const matchingAccounts = useMemo(() => {
    const search = customerSearch.trim().toLowerCase();

    if (!search) {
      return sortedAccounts.slice(0, 100);
    }

    return sortedAccounts
      .filter((account) => {
        const name = (account.full_name || "").toLowerCase();
        const email = (account.email || "").toLowerCase();

        return name.includes(search) || email.includes(search);
      })
      .slice(0, 100);
  }, [sortedAccounts, customerSearch]);

  const selectedAccount = useMemo(() => {
    return accounts.find((account) => account.id === customerId) || null;
  }, [accounts, customerId]);

  const loadPage = useCallback(async () => {
    if (!id) return;

    setLoading(true);

    const [dashboardResult, accountsResult] = await Promise.all([
      supabase.rpc("admin_get_sales_rep_dashboard", {
        p_sales_rep_id: id,
      }),
      supabase.rpc("admin_get_customer_account_options"),
    ]);

    if (dashboardResult.error) {
      alert(dashboardResult.error.message);
      setLoading(false);
      return;
    }

    if (accountsResult.error) {
      alert(accountsResult.error.message);
    }

    const dashboard = dashboardResult.data as DashboardData;

    setData(dashboard);
    setAccounts(
      Array.isArray(accountsResult.data)
        ? (accountsResult.data as CustomerAccount[])
        : []
    );

    setEdit({
      displayName: dashboard.rep.display_name || "",
      commissionPercent: String(
        dashboard.rep.commission_percent ?? 0
      ),
      isActive: Boolean(dashboard.rep.is_active),
    });

    setLoading(false);
  }, [id, supabase]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  async function saveRepresentative() {
    const displayName = edit.displayName.trim();
    const commissionPercent = Number(edit.commissionPercent);

    if (!displayName) {
      alert("Enter a representative display name.");
      return;
    }

    if (
      !Number.isFinite(commissionPercent) ||
      commissionPercent < 0 ||
      commissionPercent > 100
    ) {
      alert("Commission percentage must be between 0 and 100.");
      return;
    }

    const { error } = await supabase.rpc("admin_update_sales_rep", {
      p_sales_rep_id: id,
      p_display_name: displayName,
      p_commission_percent: commissionPercent,
      p_is_active: edit.isActive,
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert("Sales representative updated.");
    await loadPage();
  }

  async function addPromoCode() {
    const promoCode = promo.code.trim().toUpperCase();
    const discountValue = Number(promo.value);

    if (!promoCode) {
      alert("Enter a promo code.");
      return;
    }

    if (!Number.isFinite(discountValue) || discountValue < 0) {
      alert("Enter a valid discount value.");
      return;
    }

    if (promo.type === "percent" && discountValue > 100) {
      alert("A percentage discount cannot be greater than 100.");
      return;
    }

    const { error } = await supabase.rpc("admin_add_sales_rep_promo", {
      p_sales_rep_id: id,
      p_promo_code: promoCode,
      p_discount_type: promo.type,
      p_discount_value: discountValue,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setPromo({
      code: "",
      type: "percent",
      value: "10",
    });

    alert("Promo code added.");
    await loadPage();
  }

  async function assignCustomer() {
    if (!customerId) {
      alert("Search for and select a customer.");
      return;
    }

    const selectedName =
      selectedAccount?.email ||
      selectedAccount?.full_name ||
      "this customer";

    const confirmed = window.confirm(
      `Assign ${selectedName} to ${data?.rep.display_name || "this representative"}?`
    );

    if (!confirmed) return;

    const { error } = await supabase.rpc(
      "admin_assign_customer_to_sales_rep",
      {
        p_customer_id: customerId,
        p_sales_rep_id: id,
        p_attribution_code: null,
      }
    );

    if (error) {
      alert(error.message);
      return;
    }

    setCustomerId("");
    setCustomerSearch("");

    alert("Customer assigned.");
    await loadPage();
  }

  async function recalculateCommissions() {
    const confirmed = window.confirm(
      "Recalculate all unpaid commissions using the representative's current rate?"
    );

    if (!confirmed) return;

    const { data: updatedCount, error } = await supabase.rpc(
      "admin_recalculate_unpaid_commissions",
      {
        p_sales_rep_id: id,
      }
    );

    if (error) {
      alert(error.message);
      return;
    }

    alert(`${Number(updatedCount || 0)} commission records recalculated.`);
    await loadPage();
  }

  if (loading) {
    return <main style={styles.page}>Loading representative...</main>;
  }

  if (!data) {
    return <main style={styles.page}>Representative not found.</main>;
  }

  return (
    <main style={styles.page}>
      <Link href="/admin/sales-reps" style={styles.link}>
        ← Back to Sales Representatives
      </Link>

      <h1 style={styles.title}>{data.rep.display_name}</h1>

      <section style={styles.section}>
        <h2 style={styles.heading}>Representative Settings</h2>

        <div style={styles.grid}>
          <label style={styles.label}>
            Display name
            <input
              style={styles.input}
              value={edit.displayName}
              onChange={(event) =>
                setEdit((current) => ({
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
              value={edit.commissionPercent}
              onChange={(event) =>
                setEdit((current) => ({
                  ...current,
                  commissionPercent: event.target.value,
                }))
              }
            />
          </label>

          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={edit.isActive}
              onChange={(event) =>
                setEdit((current) => ({
                  ...current,
                  isActive: event.target.checked,
                }))
              }
            />
            Active representative
          </label>
        </div>

        <div style={styles.buttonRow}>
          <button
            type="button"
            style={styles.button}
            onClick={saveRepresentative}
          >
            Save Representative
          </button>

          <button
            type="button"
            style={styles.warningButton}
            onClick={recalculateCommissions}
          >
            Recalculate Unpaid Commissions
          </button>
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.heading}>Promo Codes</h2>

        <p style={styles.helpText}>
          Representative promo codes provide a one-time introductory discount
          per customer account. The customer remains assigned to the
          representative on future orders.
        </p>

        <div style={styles.grid}>
          <label style={styles.label}>
            Promo code
            <input
              style={styles.input}
              placeholder="SCOOB"
              value={promo.code}
              onChange={(event) =>
                setPromo((current) => ({
                  ...current,
                  code: event.target.value.toUpperCase(),
                }))
              }
            />
          </label>

          <label style={styles.label}>
            Discount type
            <select
              style={styles.input}
              value={promo.type}
              onChange={(event) =>
                setPromo((current) => ({
                  ...current,
                  type: event.target.value,
                }))
              }
            >
              <option value="percent">Percent</option>
              <option value="fixed">Fixed dollar amount</option>
            </select>
          </label>

          <label style={styles.label}>
            Introductory discount value
            <input
              style={styles.input}
              type="number"
              min="0"
              step="0.01"
              value={promo.value}
              onChange={(event) =>
                setPromo((current) => ({
                  ...current,
                  value: event.target.value,
                }))
              }
            />
          </label>
        </div>

        <button type="button" style={styles.button} onClick={addPromoCode}>
          Add Promo Code
        </button>

        <div style={styles.list}>
          {data.promo_codes.length === 0 ? (
            <p>No promo codes assigned.</p>
          ) : (
            data.promo_codes.map((code) => (
              <div key={code.id} style={styles.row}>
                <strong>{code.promo_code}</strong>

                <span>
                  {code.discount_type === "percent"
                    ? `${Number(code.discount_value).toFixed(2)}%`
                    : `$${Number(code.discount_value).toFixed(2)}`}
                </span>

                <span>One-time customer discount</span>

                <span>{code.is_active ? "Active" : "Inactive"}</span>
              </div>
            ))
          )}
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.heading}>Assign or Reassign a Customer</h2>

        <p style={styles.helpText}>
          Search by the customer&apos;s name or email address. Accounts are
          listed alphabetically by email.
        </p>

        <div style={styles.customerAssignment}>
          <label style={styles.label}>
            Search customers
            <input
              style={styles.input}
              type="search"
              autoComplete="off"
              placeholder="Type a full name or email address"
              value={customerSearch}
              onChange={(event) => {
                setCustomerSearch(event.target.value);
                setCustomerId("");
              }}
            />
          </label>

          <div style={styles.customerResultsList}>
            {matchingAccounts.length === 0 ? (
              <div style={styles.noResults}>
                No matching customer account found.
              </div>
            ) : (
              matchingAccounts.map((account) => {
                const selected = customerId === account.id;

                return (
                  <button
                    key={account.id}
                    type="button"
                    style={{
                      ...styles.customerResultButton,
                      border: selected
                        ? "2px solid #00d9ff"
                        : "1px solid #333333",
                      background: selected ? "#00232b" : "#080808",
                    }}
                    onClick={() => {
                      setCustomerId(account.id);
                    }}
                  >
                    <strong>{account.email || "No email address"}</strong>

                    <span style={styles.searchResultEmail}>
                      {account.full_name || "No customer name"}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div style={styles.customerFooter}>
            <span style={styles.resultCount}>
              Showing {matchingAccounts.length} of {sortedAccounts.length}{" "}
              customer accounts
            </span>

            <button
              type="button"
              style={{
                ...styles.button,
                opacity: customerId ? 1 : 0.55,
                cursor: customerId ? "pointer" : "not-allowed",
              }}
              disabled={!customerId}
              onClick={assignCustomer}
            >
              Assign Selected Customer
            </button>
          </div>
        </div>

        {selectedAccount && (
          <div style={styles.selectedCustomer}>
            <strong>Selected:</strong>{" "}
            {selectedAccount.email ||
              selectedAccount.full_name ||
              selectedAccount.id}
          </div>
        )}
      </section>

      <section style={styles.section}>
        <h2 style={styles.heading}>Customers</h2>

        {data.customers.length === 0 ? (
          <p>No customers have been assigned yet.</p>
        ) : (
          data.customers.map((customer) => (
            <Link
              key={customer.customer_id}
              href={`/admin/sales-reps/${id}/customers/${customer.customer_id}`}
              style={styles.card}
            >
              <strong>{customer.customer_name}</strong>

              <span>{customer.order_count} orders</span>

              <span>
                ${Number(customer.revenue || 0).toFixed(2)} revenue
              </span>

              <span>${Number(customer.profit || 0).toFixed(2)} profit</span>

              <span>
                ${Number(customer.commission || 0).toFixed(2)} commission
              </span>
            </Link>
          ))
        )}
      </section>

      <section style={styles.section}>
        <h2 style={styles.heading}>Orders</h2>

        {data.orders.length === 0 ? (
          <p>No attributed orders yet.</p>
        ) : (
          data.orders.map((order) => (
            <div key={order.id} style={styles.row}>
              <Link
                style={styles.link}
                href={`/admin/sales-reps/${id}/customers/${order.customer_id}/orders/${order.id}`}
              >
                {order.order_number}
              </Link>

              <span>{order.customer_name}</span>

              <span>
                ${Number(order.commission_amount || 0).toFixed(2)}
              </span>

              <span>{order.commission_status || "pending"}</span>
            </div>
          ))
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
    marginTop: "20px",
  },

  section: {
    marginTop: "22px",
    padding: "20px",
    border: "1px solid #333333",
    borderRadius: "14px",
    background: "#111111",
  },

  heading: {
    color: "#00d9ff",
    marginTop: 0,
  },

  helpText: {
    color: "#aaaaaa",
    lineHeight: 1.5,
    marginTop: "-4px",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "12px",
    marginBottom: "14px",
  },

  label: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "6px",
  },

  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
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

  buttonRow: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "10px",
  },

  button: {
    padding: "11px 16px",
    borderRadius: "9px",
    border: "1px solid #00d9ff",
    background: "#001b22",
    color: "#00d9ff",
    fontWeight: "bold",
    cursor: "pointer",
  },

  warningButton: {
    padding: "11px 16px",
    borderRadius: "9px",
    border: "1px solid #ffcc00",
    background: "#221d00",
    color: "#ffcc00",
    fontWeight: "bold",
    cursor: "pointer",
  },

  customerAssignment: {
    width: "100%",
    maxWidth: "900px",
  },

  customerResultsList: {
    display: "grid",
    gap: "8px",
    maxHeight: "420px",
    overflowY: "auto" as const,
    marginTop: "12px",
    padding: "8px",
    background: "#050505",
    border: "1px solid #333333",
    borderRadius: "10px",
  },

  customerResultButton: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "flex-start",
    width: "100%",
    gap: "4px",
    padding: "12px",
    color: "#ffffff",
    borderRadius: "8px",
    cursor: "pointer",
    textAlign: "left" as const,
  },

  customerFooter: {
    display: "flex",
    flexWrap: "wrap" as const,
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    marginTop: "14px",
  },

  resultCount: {
    color: "#999999",
    fontSize: "13px",
  },

  searchResultEmail: {
    color: "#999999",
    fontSize: "13px",
  },

  noResults: {
    padding: "14px",
    color: "#999999",
  },

  selectedCustomer: {
    marginTop: "12px",
    padding: "12px",
    color: "#65ff8a",
    background: "#07170c",
    border: "1px solid #1f6033",
    borderRadius: "8px",
    fontSize: "14px",
  },

  list: {
    marginTop: "16px",
  },

  row: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
    gap: "10px",
    padding: "12px",
    borderBottom: "1px solid #333333",
  },

  card: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
    gap: "10px",
    padding: "14px",
    color: "#ffffff",
    textDecoration: "none",
    border: "1px solid #333333",
    borderRadius: "10px",
    marginBottom: "10px",
  },

  link: {
    color: "#00d9ff",
    textDecoration: "none",
  },
};