"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "../../../../../../lib/supabaseClient";

type Customer = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type Order = {
  id: string;
  order_number: string;
  created_at: string;
  net_revenue: number;
  estimated_profit: number;
  commission_amount: number;
  commission_status: string;
};

type CustomerData = {
  customer: Customer;
  orders: Order[];
};

export default function SalesRepCustomerPage() {
  const supabase = createClient();
  const params = useParams();

  const salesRepId = params.id as string;
  const customerId = params.customerId as string;

  const [data, setData] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCustomer() {
      if (!salesRepId || !customerId) {
        return;
      }

      setLoading(true);

      const { data: customerData, error } = await supabase.rpc(
        "admin_get_sales_rep_customer",
        {
          p_sales_rep_id: salesRepId,
          p_customer_id: customerId,
        }
      );

      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }

      setData(customerData as CustomerData);
      setLoading(false);
    }

    loadCustomer();
  }, [salesRepId, customerId]);

  if (loading) {
    return <main style={styles.page}>Loading customer...</main>;
  }

  if (!data) {
    return <main style={styles.page}>Customer not found.</main>;
  }

  const orders = data.orders || [];

  const totalRevenue = orders.reduce(
    (total, order) => total + Number(order.net_revenue || 0),
    0
  );

  const totalProfit = orders.reduce(
    (total, order) => total + Number(order.estimated_profit || 0),
    0
  );

  const totalCommission = orders.reduce(
    (total, order) => total + Number(order.commission_amount || 0),
    0
  );

  const customerName =
    data.customer?.full_name ||
    data.customer?.email ||
    "Customer";

  return (
    <main style={styles.page}>
      <Link
        href={`/admin/sales-reps/${salesRepId}`}
        style={styles.backLink}
      >
        ← Back to Representative
      </Link>

      <h1 style={styles.title}>{customerName}</h1>

      {data.customer?.email && (
        <p style={styles.email}>{data.customer.email}</p>
      )}

      <section style={styles.metricsGrid}>
        <MetricCard
          label="Orders"
          value={String(orders.length)}
        />

        <MetricCard
          label="Revenue"
          value={`$${totalRevenue.toFixed(2)}`}
        />

        <MetricCard
          label="Profit"
          value={`$${totalProfit.toFixed(2)}`}
        />

        <MetricCard
          label="Commission"
          value={`$${totalCommission.toFixed(2)}`}
        />
      </section>

      <section style={styles.section}>
        <h2 style={styles.heading}>Orders</h2>

        {orders.length === 0 ? (
          <p>This customer does not have any attributed orders yet.</p>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Order</th>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Revenue</th>
                  <th style={styles.th}>Profit</th>
                  <th style={styles.th}>Commission</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>

              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} style={styles.row}>
                    <td style={styles.td}>
                      <Link
                        href={`/admin/sales-reps/${salesRepId}/customers/${customerId}/orders/${order.id}`}
                        style={styles.orderLink}
                      >
                        {order.order_number || order.id}
                      </Link>
                    </td>

                    <td style={styles.td}>
                      {order.created_at
                        ? new Date(order.created_at).toLocaleString()
                        : "—"}
                    </td>

                    <td style={styles.td}>
                      ${Number(order.net_revenue || 0).toFixed(2)}
                    </td>

                    <td style={styles.td}>
                      ${Number(order.estimated_profit || 0).toFixed(2)}
                    </td>

                    <td style={styles.td}>
                      ${Number(order.commission_amount || 0).toFixed(2)}
                    </td>

                    <td style={styles.td}>
                      {order.commission_status || "pending"}
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

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={styles.metricCard}>
      <span style={styles.metricLabel}>{label}</span>
      <strong style={styles.metricValue}>{value}</strong>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#000000",
    color: "#ffffff",
    padding: "30px",
  },
  backLink: {
    color: "#00d9ff",
    textDecoration: "none",
  },
  title: {
    color: "#ff45d8",
    marginTop: "20px",
    marginBottom: "5px",
  },
  email: {
    color: "#999999",
    marginTop: 0,
  },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "12px",
    marginTop: "20px",
  },
  metricCard: {
    padding: "16px",
    border: "1px solid #333333",
    borderRadius: "12px",
    background: "#111111",
    display: "grid",
    gap: "8px",
  },
  metricLabel: {
    color: "#999999",
  },
  metricValue: {
    color: "#00d9ff",
    fontSize: "22px",
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
  tableWrapper: {
    overflowX: "auto" as const,
  },
  table: {
    width: "100%",
    minWidth: "850px",
    borderCollapse: "collapse" as const,
  },
  th: {
    textAlign: "left" as const,
    padding: "12px",
    color: "#00d9ff",
    borderBottom: "1px solid #444444",
  },
  row: {
    borderBottom: "1px solid #333333",
  },
  td: {
    padding: "12px",
  },
  orderLink: {
    color: "#ff45d8",
    fontWeight: "bold",
    textDecoration: "none",
  },
};