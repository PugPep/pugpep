"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "../../../../../../../../lib/supabaseClient";

type OrderItem = {
  id?: string | null;
  product_slug?: string | null;
  product_name: string | null;
  dosage?: string | null;
  purchase_type?: string | null;
  quantity: number | null;

  price?: number | null;
  regular_unit_price: number | null;
  sale_unit_price: number | null;
  actual_unit_price: number | null;

  cost: number | null;
  line_revenue: number | null;
  line_cost: number | null;
  line_profit: number | null;

  was_on_sale?: boolean | null;
  sale_percent?: number | null;
  inventory_status?: string | null;
  was_pre_sale?: boolean | null;
};

type Order = {
  id: string;
  order_number: string | null;

  customer_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_organization: string | null;

  shipping_address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;

  created_at: string | null;
  status: string | null;
  payment_status?: string | null;
  payment_method: string | null;

  subtotal: number | null;
  shipping: number | null;
  promo_code: string | null;
  promo_discount: number | null;
  reward_discount: number | null;
  total_discount: number | null;
  total: number | null;

  gross_revenue: number | null;
  net_revenue: number | null;
  product_cost_total: number | null;
  estimated_shipping_cost: number | null;
  estimated_packaging_cost: number | null;
  estimated_profit: number | null;
  profit_margin_percent: number | null;

  sales_rep_id: string | null;
  sales_rep_name: string | null;
  sales_rep_attribution_code: string | null;

  commission_rate: number | null;
  commission_basis: number | null;
  commissionable_profit: number | null;
  commission_amount: number | null;
  commission_status: string | null;

  commission_earned_at?: string | null;
  commission_paid_at?: string | null;
};

type OrderData = {
  order: Order;
  items: OrderItem[];
};

function getRouteParam(
  value: string | string[] | undefined
): string {
  if (Array.isArray(value)) {
    return value[0] || "";
  }

  return value || "";
}

function formatMoney(
  value: number | string | null | undefined
): string {
  return `$${Number(value || 0).toFixed(2)}`;
}

function formatDate(
  value: string | null | undefined
): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString();
}

export default function SalesRepOrderPage() {
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const params = useParams();

  const salesRepId = getRouteParam(
    params.id as string | string[] | undefined
  );

  const customerId = getRouteParam(
    params.customerId as
      | string
      | string[]
      | undefined
  );

  const orderId = getRouteParam(
    params.orderId as
      | string
      | string[]
      | undefined
  );

  const [data, setData] =
    useState<OrderData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [markingPaid, setMarkingPaid] =
    useState(false);

  const loadOrder = useCallback(async () => {
    if (
      !salesRepId ||
      !customerId ||
      !orderId
    ) {
      setErrorMessage(
        "The sales representative, customer, or order ID is missing."
      );

      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const {
      data: orderData,
      error,
    } = await supabase.rpc(
      "admin_get_sales_rep_order",
      {
        p_sales_rep_id: salesRepId,
        p_customer_id: customerId,
        p_order_id: orderId,
      }
    );

    if (error) {
      console.error(
        "Unable to load sales representative order:",
        error
      );

      setErrorMessage(error.message);
      setData(null);
      setLoading(false);
      return;
    }

    const result =
      orderData as OrderData | null;

    if (!result?.order) {
      setErrorMessage(
        "The order could not be found."
      );

      setData(null);
      setLoading(false);
      return;
    }

    setData({
      order: result.order,
      items: Array.isArray(result.items)
        ? result.items
        : [],
    });

    setLoading(false);
  }, [
    supabase,
    salesRepId,
    customerId,
    orderId,
  ]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  async function markCommissionPaid() {
    if (!data?.order || markingPaid) {
      return;
    }

    const commissionAmount = Number(
      data.order.commission_amount || 0
    );

    const confirmed = window.confirm(
      `Mark the ${formatMoney(
        commissionAmount
      )} commission as paid?`
    );

    if (!confirmed) return;

    setMarkingPaid(true);

    try {
      const { error } = await supabase.rpc(
        "admin_mark_commission_paid",
        {
          p_order_id: orderId,
        }
      );

      if (error) {
        throw error;
      }

      alert(
        "Commission marked as paid."
      );

      await loadOrder();
    } catch (error: any) {
      console.error(
        "Unable to mark commission paid:",
        error
      );

      alert(
        error?.message ||
          "The commission could not be marked as paid."
      );
    } finally {
      setMarkingPaid(false);
    }
  }

  if (loading) {
    return (
      <main style={styles.page}>
        Loading order...
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main style={styles.page}>
        <Link
          href={`/admin/sales-reps/${salesRepId}/customers/${customerId}`}
          style={styles.backLink}
        >
          ← Back to Customer
        </Link>

        <section style={styles.errorBox}>
          <h1 style={styles.errorTitle}>
            Unable to Load Order
          </h1>

          <p>{errorMessage}</p>

          <button
            type="button"
            style={styles.retryButton}
            onClick={() => {
              void loadOrder();
            }}
          >
            Try Again
          </button>
        </section>
      </main>
    );
  }

  if (!data?.order) {
    return (
      <main style={styles.page}>
        Order not found.
      </main>
    );
  }

  const { order, items } = data;

  const customerName =
    order.customer_name?.trim() ||
    order.customer_email?.trim() ||
    "Customer";

  const customerEmail =
    order.customer_email?.trim() ||
    "No email available";

  const customerPhone =
    order.customer_phone?.trim() ||
    "No phone available";

  const organization =
    order.customer_organization?.trim() ||
    "No organization listed";

  /*
   * commission_rate is stored as a decimal.
   * Example: 0.20 means 20%.
   */
  const commissionPercent =
    Number(order.commission_rate || 0) *
    100;

  const canMarkPaid =
    Number(
      order.commission_amount || 0
    ) > 0 &&
    order.commission_status !== "paid";

  const shippingAddress = [
    order.shipping_address,
    order.city,
    order.state,
    order.zip,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <main style={styles.page}>
      <Link
        href={`/admin/sales-reps/${salesRepId}/customers/${customerId}`}
        style={styles.backLink}
      >
        ← Back to Customer
      </Link>

      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            Order{" "}
            {order.order_number ||
              order.id}
          </h1>

          <p style={styles.subtext}>
            Customer: {customerName}
          </p>

          <p style={styles.subtext}>
            Email: {customerEmail}
          </p>

          <p style={styles.subtext}>
            Created:{" "}
            {formatDate(
              order.created_at
            )}
          </p>
        </div>

        {canMarkPaid && (
          <button
            type="button"
            style={{
              ...styles.paidButton,
              opacity: markingPaid
                ? 0.7
                : 1,
              cursor: markingPaid
                ? "not-allowed"
                : "pointer",
            }}
            disabled={markingPaid}
            onClick={
              markCommissionPaid
            }
          >
            {markingPaid
              ? "Marking Paid..."
              : "Mark Commission Paid"}
          </button>
        )}
      </div>

      <section style={styles.section}>
        <h2 style={styles.heading}>
          Customer Information
        </h2>

        <div style={styles.infoGrid}>
          <InfoRow
            label="Customer Name"
            value={customerName}
          />

          <InfoRow
            label="Email"
            value={customerEmail}
          />

          <InfoRow
            label="Phone"
            value={customerPhone}
          />

          <InfoRow
            label="Organization"
            value={organization}
          />

          <InfoRow
            label="Shipping Address"
            value={
              shippingAddress ||
              "No shipping address available"
            }
          />

          <InfoRow
            label="Customer ID"
            value={
              order.customer_id ||
              customerId
            }
          />
        </div>
      </section>

      <section style={styles.metricsGrid}>
        <MetricCard
          label="Gross Revenue"
          value={formatMoney(
            order.gross_revenue
          )}
        />

        <MetricCard
          label="Net Revenue"
          value={formatMoney(
            order.net_revenue
          )}
        />

        <MetricCard
          label="Product Cost"
          value={formatMoney(
            order.product_cost_total
          )}
        />

        <MetricCard
          label="Shipping Cost"
          value={formatMoney(
            order.estimated_shipping_cost
          )}
        />

        <MetricCard
          label="Packaging Cost"
          value={formatMoney(
            order.estimated_packaging_cost
          )}
        />

        <MetricCard
          label="Estimated Profit"
          value={formatMoney(
            order.estimated_profit
          )}
        />
      </section>

      <section style={styles.section}>
        <h2 style={styles.heading}>
          Representative Commission
        </h2>

        <div style={styles.infoGrid}>
          <InfoRow
            label="Representative"
            value={
              order.sales_rep_name ||
              "—"
            }
          />

          <InfoRow
            label="Attribution Code"
            value={
              order.sales_rep_attribution_code ||
              "—"
            }
          />

          <InfoRow
            label="Commission Rate"
            value={`${commissionPercent.toFixed(
              2
            )}%`}
          />

          <InfoRow
            label="Commission Basis"
            value={formatMoney(
              order.commission_basis
            )}
          />

          <InfoRow
            label="Commissionable Profit"
            value={formatMoney(
              order.commissionable_profit
            )}
          />

          <InfoRow
            label="Commission Amount"
            value={formatMoney(
              order.commission_amount
            )}
          />

          <InfoRow
            label="Commission Status"
            value={
              order.commission_status ||
              "pending"
            }
          />

          <InfoRow
            label="Earned At"
            value={formatDate(
              order.commission_earned_at
            )}
          />

          <InfoRow
            label="Paid At"
            value={formatDate(
              order.commission_paid_at
            )}
          />
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.heading}>
          Order Information
        </h2>

        <div style={styles.infoGrid}>
          <InfoRow
            label="Order Status"
            value={
              order.status || "—"
            }
          />

          <InfoRow
            label="Payment Status"
            value={
              order.payment_status ||
              "—"
            }
          />

          <InfoRow
            label="Payment Method"
            value={
              order.payment_method ||
              "—"
            }
          />

          <InfoRow
            label="Subtotal"
            value={formatMoney(
              order.subtotal
            )}
          />

          <InfoRow
            label="Shipping Charged"
            value={formatMoney(
              order.shipping
            )}
          />

          <InfoRow
            label="Promo Code"
            value={
              order.promo_code || "—"
            }
          />

          <InfoRow
            label="Promo Discount"
            value={formatMoney(
              order.promo_discount
            )}
          />

          <InfoRow
            label="Rewards Discount"
            value={formatMoney(
              order.reward_discount
            )}
          />

          <InfoRow
            label="Total Discount"
            value={formatMoney(
              order.total_discount
            )}
          />

          <InfoRow
            label="Order Total"
            value={formatMoney(
              order.total
            )}
          />

          <InfoRow
            label="Profit Margin"
            value={`${Number(
              order.profit_margin_percent ||
                0
            ).toFixed(2)}%`}
          />
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.heading}>
          Item Accounting
        </h2>

        {items.length === 0 ? (
          <p>No order items found.</p>
        ) : (
          <div
            style={
              styles.tableWrapper
            }
          >
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>
                    Product
                  </th>

                  <th style={styles.th}>
                    Dosage
                  </th>

                  <th style={styles.th}>
                    Type
                  </th>

                  <th style={styles.th}>
                    Qty
                  </th>

                  <th style={styles.th}>
                    Regular Price
                  </th>

                  <th style={styles.th}>
                    Sale Price
                  </th>

                  <th style={styles.th}>
                    Actual Price
                  </th>

                  <th style={styles.th}>
                    Unit Cost
                  </th>

                  <th style={styles.th}>
                    Revenue
                  </th>

                  <th style={styles.th}>
                    Cost
                  </th>

                  <th style={styles.th}>
                    Profit
                  </th>
                </tr>
              </thead>

              <tbody>
                {items.map(
                  (item, index) => (
                    <tr
                      key={
                        item.id ||
                        `${item.product_name}-${index}`
                      }
                      style={styles.row}
                    >
                      <td
                        style={styles.td}
                      >
                        {item.product_name ||
                          "Product"}
                      </td>

                      <td
                        style={styles.td}
                      >
                        {item.dosage ||
                          "—"}
                      </td>

                      <td
                        style={styles.td}
                      >
                        {item.purchase_type ||
                          "—"}
                      </td>

                      <td
                        style={styles.td}
                      >
                        {Number(
                          item.quantity ||
                            0
                        )}
                      </td>

                      <td
                        style={styles.td}
                      >
                        {formatMoney(
                          item.regular_unit_price
                        )}
                      </td>

                      <td
                        style={styles.td}
                      >
                        {formatMoney(
                          item.sale_unit_price
                        )}
                      </td>

                      <td
                        style={styles.td}
                      >
                        {formatMoney(
                          item.actual_unit_price
                        )}
                      </td>

                      <td
                        style={styles.td}
                      >
                        {formatMoney(
                          item.cost
                        )}
                      </td>

                      <td
                        style={styles.td}
                      >
                        {formatMoney(
                          item.line_revenue
                        )}
                      </td>

                      <td
                        style={styles.td}
                      >
                        {formatMoney(
                          item.line_cost
                        )}
                      </td>

                      <td
                        style={styles.td}
                      >
                        {formatMoney(
                          item.line_profit
                        )}
                      </td>
                    </tr>
                  )
                )}
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
      <span style={styles.metricLabel}>
        {label}
      </span>

      <strong style={styles.metricValue}>
        {value}
      </strong>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={styles.infoRow}>
      <span style={styles.infoLabel}>
        {label}
      </span>

      <strong
        style={styles.infoValue}
      >
        {value}
      </strong>
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

  header: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap" as const,
    gap: "16px",
    marginTop: "20px",
  },

  title: {
    color: "#ff45d8",
    margin: 0,
  },

  subtext: {
    color: "#b8b8b8",
    margin: "5px 0",
  },

  paidButton: {
    padding: "12px 18px",
    borderRadius: "10px",
    border:
      "1px solid #65ff8a",
    background: "#08220f",
    color: "#65ff8a",
    fontWeight: "bold",
  },

  metricsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(170px, 1fr))",
    gap: "12px",
    marginTop: "22px",
  },

  metricCard: {
    padding: "16px",
    border:
      "1px solid #333333",
    borderRadius: "12px",
    background: "#111111",
    display: "grid",
    gap: "8px",
  },

  metricLabel: {
    color: "#b8b8b8",
  },

  metricValue: {
    color: "#00d9ff",
    fontSize: "22px",
  },

  section: {
    marginTop: "22px",
    padding: "20px",
    border:
      "1px solid #333333",
    borderRadius: "14px",
    background: "#111111",
  },

  heading: {
    color: "#00d9ff",
    marginTop: 0,
  },

  infoGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "12px",
  },

  infoRow: {
    padding: "12px",
    border:
      "1px solid #333333",
    borderRadius: "9px",
    display: "grid",
    gap: "5px",
    minWidth: 0,
  },

  infoLabel: {
    color: "#999999",
    fontSize: "13px",
  },

  infoValue: {
    overflowWrap:
      "anywhere" as const,
  },

  tableWrapper: {
    overflowX: "auto" as const,
  },

  table: {
    width: "100%",
    minWidth: "1350px",
    borderCollapse:
      "collapse" as const,
  },

  th: {
    textAlign: "left" as const,
    padding: "12px",
    color: "#00d9ff",
    borderBottom:
      "1px solid #444444",
    whiteSpace: "nowrap" as const,
  },

  row: {
    borderBottom:
      "1px solid #333333",
  },

  td: {
    padding: "12px",
    whiteSpace: "nowrap" as const,
  },

  errorBox: {
    marginTop: "25px",
    maxWidth: "700px",
    padding: "20px",
    border:
      "1px solid #ff4566",
    borderRadius: "12px",
    background: "#1b080d",
  },

  errorTitle: {
    color: "#ff4566",
    marginTop: 0,
  },

  retryButton: {
    marginTop: "12px",
    padding: "11px 18px",
    border: "none",
    borderRadius: "9px",
    background:
      "linear-gradient(90deg, #00b7ff, #ff2fd0)",
    color: "#ffffff",
    fontWeight: "bold",
    cursor: "pointer",
  },
};