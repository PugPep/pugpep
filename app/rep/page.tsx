"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../lib/supabaseClient";

type Representative = {
  id: string;
  display_name: string;
  commission_percent: number;
};

type RepresentativeSummary = {
  customer_count: number;
  order_count: number;
  earned_commission: number;
  paid_commission: number;
  unpaid_commission: number;
};

type RepresentativeCustomer = {
  customer_id: string;
  customer_name: string;
  order_count: number;
  total_commission: number;
};

type RepresentativeOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  created_at: string;
  status: string | null;
  commission_amount: number;
  commission_status: string | null;
};

type RepresentativeDashboard = {
  rep: Representative;
  summary: RepresentativeSummary;
  customers: RepresentativeCustomer[];
  orders: RepresentativeOrder[];
};

function formatMoney(
  value: number | string | null | undefined
) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function formatDate(
  value: string | null | undefined
) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString();
}

function formatOrderStatus(
  status: string | null | undefined
) {
  if (!status) {
    return "Unknown";
  }

  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function formatCommissionStatus(
  status: string | null | undefined
) {
  if (!status) {
    return "Pending";
  }

  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

export default function RepresentativePortalPage() {
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [dashboard, setDashboard] =
    useState<RepresentativeDashboard | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    async function loadRepresentativeDashboard() {
      setLoading(true);
      setErrorMessage("");
      setDashboard(null);

      const {
        data: userData,
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error(
          "Representative authentication error:",
          {
            message: userError.message,
            name: userError.name,
            status: userError.status,
          }
        );

        setErrorMessage(
          "We could not verify your login."
        );

        setLoading(false);
        return;
      }

      if (!userData.user) {
        setErrorMessage(
          "You must be logged in to view the representative portal."
        );

        setLoading(false);
        return;
      }

      const {
        data,
        error,
      } = await supabase.rpc(
        "get_my_sales_rep_dashboard"
      );

      if (error) {
        console.error(
          "Representative dashboard loading error:",
          {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          }
        );

        setErrorMessage(
          error.message ||
            "The representative dashboard could not be loaded."
        );

        setLoading(false);
        return;
      }

      if (
        !data ||
        typeof data !== "object" ||
        Array.isArray(data)
      ) {
        setErrorMessage(
          "No representative dashboard was found for this account."
        );

        setLoading(false);
        return;
      }

      const result =
        data as RepresentativeDashboard;

      setDashboard({
        rep: {
          id: result.rep?.id || "",
          display_name:
            result.rep?.display_name ||
            "Sales Representative",

          commission_percent: Number(
            result.rep?.commission_percent || 0
          ),
        },

        summary: {
          customer_count: Number(
            result.summary?.customer_count || 0
          ),

          order_count: Number(
            result.summary?.order_count || 0
          ),

          earned_commission: Number(
            result.summary
              ?.earned_commission || 0
          ),

          paid_commission: Number(
            result.summary
              ?.paid_commission || 0
          ),

          unpaid_commission: Number(
            result.summary
              ?.unpaid_commission || 0
          ),
        },

        customers: Array.isArray(
          result.customers
        )
          ? result.customers
          : [],

        orders: Array.isArray(
          result.orders
        )
          ? result.orders
          : [],
      });

      setLoading(false);
    }

    void loadRepresentativeDashboard();
  }, [supabase]);

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.centerCard}>
          <h1 style={styles.title}>
            Sales Representative Portal
          </h1>

          <p style={styles.secondaryText}>
            Loading your representative
            dashboard...
          </p>
        </div>
      </main>
    );
  }

  if (!dashboard) {
    return (
      <main style={styles.page}>
        <Link
          href="/account"
          style={styles.backLink}
        >
          ← Back to My Account
        </Link>

        <div style={styles.centerCard}>
          <h1 style={styles.title}>
            Sales Representative Portal
          </h1>

          <p style={styles.errorText}>
            {errorMessage ||
              "Representative information was not found."}
          </p>

          <Link
            href="/login"
            style={styles.loginButton}
          >
            Go to Login
          </Link>
        </div>
      </main>
    );
  }

  const { rep, summary, customers, orders } =
    dashboard;

  return (
    <main style={styles.page}>
      <Link
        href="/account"
        style={styles.backLink}
      >
        ← Back to My Account
      </Link>

      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>
            Sales Representative Portal
          </p>

          <h1 style={styles.title}>
            {rep.display_name}
          </h1>

          <p style={styles.commissionRate}>
            Commission Rate:{" "}
            {Number(
              rep.commission_percent || 0
            ).toFixed(2)}
            %
          </p>
        </div>

        <div
          style={{
            ...styles.statusBadge,
            ...styles.activeBadge,
          }}
        >
          Active
        </div>
      </header>

      <section style={styles.metricsGrid}>
        <MetricCard
          label="Customers"
          value={String(
            summary.customer_count
          )}
        />

        <MetricCard
          label="Orders"
          value={String(
            summary.order_count
          )}
        />

        <MetricCard
          label="Earned Commission"
          value={formatMoney(
            summary.earned_commission
          )}
        />

        <MetricCard
          label="Unpaid Commission"
          value={formatMoney(
            summary.unpaid_commission
          )}
        />

        <MetricCard
          label="Paid Commission"
          value={formatMoney(
            summary.paid_commission
          )}
        />
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionHeading}>
          My Customers
        </h2>

        {customers.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyTitle}>
              No assigned customers yet
            </p>

            <p style={styles.emptyText}>
              Customers will appear here after
              they are assigned to your
              representative account.
            </p>
          </div>
        ) : (
          <div style={styles.customerGrid}>
            {customers.map((customer) => (
              <article
                key={customer.customer_id}
                style={styles.customerCard}
              >
                <div>
                  <p style={styles.customerLabel}>
                    Customer
                  </p>

                  <h3
                    style={styles.customerName}
                  >
                    {customer.customer_name ||
                      "Customer"}
                  </h3>
                </div>

                <div
                  style={
                    styles.customerStats
                  }
                >
                  <SmallMetric
                    label="Orders"
                    value={String(
                      Number(
                        customer.order_count ||
                          0
                      )
                    )}
                  />

                  <SmallMetric
                    label="Commission"
                    value={formatMoney(
                      customer.total_commission
                    )}
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionHeading}>
          Commission History
        </h2>

        {orders.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyTitle}>
              No commission orders yet
            </p>

            <p style={styles.emptyText}>
              Orders attributed to your
              representative account will appear
              here.
            </p>
          </div>
        ) : (
          <>
            <div style={styles.mobileOrderList}>
              {orders.map((order) => (
                <article
                  key={order.id}
                  style={styles.mobileOrderCard}
                >
                  <div
                    style={
                      styles.mobileOrderHeader
                    }
                  >
                    <strong
                      style={styles.orderNumber}
                    >
                      {order.order_number ||
                        order.id}
                    </strong>

                    <span
                      style={getCommissionBadge(
                        order.commission_status
                      )}
                    >
                      {formatCommissionStatus(
                        order.commission_status
                      )}
                    </span>
                  </div>

                  <p style={styles.orderDetail}>
                    <strong>Customer:</strong>{" "}
                    {order.customer_name ||
                      "Customer"}
                  </p>

                  <p style={styles.orderDetail}>
                    <strong>Date:</strong>{" "}
                    {formatDate(
                      order.created_at
                    )}
                  </p>

                  <p style={styles.orderDetail}>
                    <strong>
                      Order Status:
                    </strong>{" "}
                    {formatOrderStatus(
                      order.status
                    )}
                  </p>

                  <p style={styles.orderDetail}>
                    <strong>
                      Commission:
                    </strong>{" "}
                    <span
                      style={
                        styles.commissionAmount
                      }
                    >
                      {formatMoney(
                        order.commission_amount
                      )}
                    </span>
                  </p>
                </article>
              ))}
            </div>

            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>
                      Order
                    </th>

                    <th style={styles.th}>
                      Customer
                    </th>

                    <th style={styles.th}>
                      Date
                    </th>

                    <th style={styles.th}>
                      Order Status
                    </th>

                    <th style={styles.th}>
                      Commission
                    </th>

                    <th style={styles.th}>
                      Commission Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      style={styles.tableRow}
                    >
                      <td style={styles.td}>
                        <strong>
                          {order.order_number ||
                            order.id}
                        </strong>
                      </td>

                      <td style={styles.td}>
                        {order.customer_name ||
                          "Customer"}
                      </td>

                      <td style={styles.td}>
                        {formatDate(
                          order.created_at
                        )}
                      </td>

                      <td style={styles.td}>
                        {formatOrderStatus(
                          order.status
                        )}
                      </td>

                      <td style={styles.td}>
                        <strong
                          style={
                            styles.commissionAmount
                          }
                        >
                          {formatMoney(
                            order.commission_amount
                          )}
                        </strong>
                      </td>

                      <td style={styles.td}>
                        <span
                          style={getCommissionBadge(
                            order.commission_status
                          )}
                        >
                          {formatCommissionStatus(
                            order.commission_status
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <article style={styles.metricCard}>
      <span style={styles.metricLabel}>
        {label}
      </span>

      <strong style={styles.metricValue}>
        {value}
      </strong>
    </article>
  );
}

function SmallMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={styles.smallMetric}>
      <span style={styles.smallMetricLabel}>
        {label}
      </span>

      <strong style={styles.smallMetricValue}>
        {value}
      </strong>
    </div>
  );
}

function getCommissionBadge(
  status: string | null | undefined
) {
  const normalized = String(
    status || ""
  ).toLowerCase();

  if (normalized === "paid") {
    return {
      ...styles.commissionBadge,
      color: "#00ff99",
      border: "1px solid #00ff99",
      background: "rgba(0,255,153,.10)",
    };
  }

  if (normalized === "earned") {
    return {
      ...styles.commissionBadge,
      color: "#ffcc00",
      border: "1px solid #ffcc00",
      background: "rgba(255,204,0,.10)",
    };
  }

  return {
    ...styles.commissionBadge,
    color: "#aaaaaa",
    border: "1px solid #555555",
    background: "rgba(255,255,255,.06)",
  };
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#000000",
    color: "#ffffff",
    padding: "30px",
  },

  backLink: {
    display: "inline-block",
    marginBottom: "22px",
    color: "#00d9ff",
    textDecoration: "none",
    fontWeight: "bold",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap" as const,
    gap: "18px",
  },

  eyebrow: {
    margin: 0,
    color: "#00d9ff",
    fontSize: "12px",
    fontWeight: "bold",
    letterSpacing: "1px",
    textTransform: "uppercase" as const,
  },

  title: {
    marginTop: "8px",
    marginBottom: "8px",
    color: "#ff45d8",
    fontSize: "34px",
  },

  commissionRate: {
    margin: 0,
    color: "#dddddd",
  },

  statusBadge: {
    padding: "10px 17px",
    borderRadius: "999px",
    fontWeight: "bold",
  },

  activeBadge: {
    color: "#00ff99",
    border: "1px solid #00ff99",
    background: "rgba(0,255,153,.10)",
  },

  metricsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(190px, 1fr))",
    gap: "12px",
    marginTop: "30px",
  },

  metricCard: {
    minHeight: "90px",
    padding: "20px",
    border: "1px solid #333333",
    borderRadius: "14px",
    background: "#111111",
    display: "flex",
    flexDirection: "column" as const,
    justifyContent: "center",
    gap: "10px",
  },

  metricLabel: {
    color: "#cccccc",
    fontSize: "14px",
  },

  metricValue: {
    color: "#00d9ff",
    fontSize: "24px",
  },

  section: {
    marginTop: "24px",
    padding: "22px",
    border: "1px solid #333333",
    borderRadius: "14px",
    background: "#0d0d0d",
  },

  sectionHeading: {
    marginTop: 0,
    marginBottom: "20px",
    color: "#00d9ff",
  },

  customerGrid: {
    display: "grid",
    gap: "12px",
  },

  customerCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap" as const,
    gap: "18px",
    padding: "18px",
    border: "1px solid #333333",
    borderRadius: "12px",
    background: "#080808",
  },

  customerLabel: {
    margin: 0,
    color: "#999999",
    fontSize: "12px",
    textTransform: "uppercase" as const,
    letterSpacing: "1px",
  },

  customerName: {
    marginTop: "6px",
    marginBottom: 0,
    color: "#ffffff",
  },

  customerStats: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "10px",
  },

  smallMetric: {
    minWidth: "115px",
    padding: "10px 12px",
    border: "1px solid #333333",
    borderRadius: "9px",
    background: "#111111",
    display: "grid",
    gap: "5px",
  },

  smallMetricLabel: {
    color: "#999999",
    fontSize: "11px",
  },

  smallMetricValue: {
    color: "#00d9ff",
  },

  emptyState: {
    padding: "24px",
    border: "1px dashed #444444",
    borderRadius: "12px",
    background: "#080808",
    textAlign: "center" as const,
  },

  emptyTitle: {
    margin: 0,
    color: "#ffffff",
    fontWeight: "bold",
  },

  emptyText: {
    marginTop: "8px",
    marginBottom: 0,
    color: "#999999",
    lineHeight: 1.6,
  },

  tableWrapper: {
    overflowX: "auto" as const,
  },

  table: {
    width: "100%",
    minWidth: "850px",
    borderCollapse: "collapse" as const,
  },

  th: {
    padding: "13px",
    color: "#00d9ff",
    borderBottom: "1px solid #444444",
    textAlign: "left" as const,
    whiteSpace: "nowrap" as const,
  },

  tableRow: {
    borderBottom: "1px solid #2c2c2c",
  },

  td: {
    padding: "14px 13px",
    color: "#dddddd",
    whiteSpace: "nowrap" as const,
  },

  commissionAmount: {
    color: "#00d9ff",
  },

  commissionBadge: {
    display: "inline-block",
    padding: "5px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "bold",
  },

  mobileOrderList: {
    display: "none",
  },

  mobileOrderCard: {
    padding: "16px",
    border: "1px solid #333333",
    borderRadius: "12px",
    background: "#080808",
  },

  mobileOrderHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap" as const,
    gap: "10px",
  },

  orderNumber: {
    color: "#ff45d8",
  },

  orderDetail: {
    margin: "10px 0 0",
    color: "#cccccc",
  },

  centerCard: {
    maxWidth: "650px",
    margin: "80px auto",
    padding: "26px",
    border: "1px solid #333333",
    borderRadius: "14px",
    background: "#111111",
    textAlign: "center" as const,
  },

  secondaryText: {
    color: "#cccccc",
  },

  errorText: {
    color: "#ff6b6b",
    lineHeight: 1.6,
  },

  loginButton: {
    display: "inline-block",
    marginTop: "14px",
    padding: "12px 18px",
    borderRadius: "9px",
    color: "#ffffff",
    textDecoration: "none",
    fontWeight: "bold",
    background:
      "linear-gradient(90deg, #00b7ff, #ff2fd0)",
  },
};