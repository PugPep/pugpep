"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../lib/supabaseClient";

const ADMIN_EMAIL = "pugpep99@gmail.com";

type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  total: number;
  net_revenue?: number;
  product_cost_total?: number;
  estimated_shipping_cost?: number;
  estimated_packaging_cost?: number;
  estimated_profit?: number;
  profit_margin_percent?: number;
  promo_code?: string | null;
  promo_discount?: number;
  reward_discount?: number;
  reward_points_used?: number;
  rewards_points_earned?: number;
  rewards_applied?: boolean;
  user_id?: string | null;
  total_discount?: number;
  payment_method?: string;
  status: string;
  shipping_status?: string;
  created_at: string;
};

function getOrderRevenue(order: Order) {
  // Historical snapshot only. Never query or recalculate from current product prices.
  return order.net_revenue == null
    ? Number(order.total || 0)
    : Number(order.net_revenue);
}

function getOrderCost(order: Order) {
  // These are the costs saved on the order when it was created.
  return (
    Number(order.product_cost_total || 0) +
    Number(order.estimated_shipping_cost || 0) +
    Number(order.estimated_packaging_cost || 0)
  );
}

function getOrderProfit(order: Order) {
  return order.estimated_profit == null
    ? getOrderRevenue(order) - getOrderCost(order)
    : Number(order.estimated_profit);
}

function getOrderMargin(order: Order) {
  if (order.profit_margin_percent != null) {
    return Number(order.profit_margin_percent);
  }

  const revenue = getOrderRevenue(order);
  if (revenue <= 0) return 0;

  return (getOrderProfit(order) / revenue) * 100;
}

export default function AdminPage() {
  const supabase = useMemo(() => createClient(), []);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");

  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [markingPaidOrderId, setMarkingPaidOrderId] = useState<string | null>(null);

  async function loadOrders() {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

    setOrders(data || []);
  }

  useEffect(() => {
    async function loadAdmin() {
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError) {
        alert(userError.message);
        setAuthorized(false);
        setLoading(false);
        return;
      }

      const email = userData.user?.email;

      if (!email || email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
        setAuthorized(false);
        setLoading(false);
        return;
      }

      setAuthorized(true);
      setNotice("Order marked paid and inventory updated.");
      await loadOrders();
      setLoading(false);
    }

    loadAdmin();
  }, [supabase]);

  async function markPaid(id: string) {
    if (markingPaidOrderId) return;

    setMarkingPaidOrderId(id);

    try {
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .single();

      if (orderError || !orderData) {
        alert(orderError?.message || "Order not found.");
        return;
      }

      if (orderData.status === "paid") {
        setNotice("This order is already marked paid.");
        return;
      }

      const { data: items, error: itemsError } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", id);

      if (itemsError) {
        alert(itemsError.message);
        return;
      }

      if (!orderData.inventory_deducted) {
        for (const item of items || []) {
          const deductAmount =
            item.purchase_type === "kit"
              ? Number(item.quantity || 1) * 10
              : Number(item.quantity || 1);

          const productSlug =
            item.product_slug ||
            item.product_name?.toLowerCase().replaceAll(" ", "-");

          const { data: inventoryRow, error: inventoryError } = await supabase
            .from("inventory")
            .select("*")
            .eq("product_slug", productSlug)
            .eq("dosage", item.dosage)
            .eq("purchase_type", "single")
            .maybeSingle();

          if (inventoryError || !inventoryRow) {
            alert(
              `Inventory item not found for ${item.product_name} ${item.dosage}. Check product slug and dosage match inventory.`
            );
            return;
          }

          const newQuantity = Math.max(
            0,
            Number(inventoryRow.quantity || 0) - deductAmount
          );

          const singleStatus = newQuantity > 0 ? "in stock" : "out of stock";
          const kitStatus = newQuantity >= 10 ? "in stock" : "pre-sale";

          const { error: updateInventoryError } = await supabase
            .from("inventory")
            .update({
              quantity: newQuantity,
              status: singleStatus,
              updated_at: new Date().toISOString(),
            })
            .eq("id", inventoryRow.id);

          if (updateInventoryError) {
            alert(updateInventoryError.message);
            return;
          }

          const { error: updateSingleOptionError } = await supabase
            .from("product_options")
            .update({ status: singleStatus })
            .eq("product_slug", productSlug)
            .eq("dosage", item.dosage)
            .eq("purchase_type", "single");

          if (updateSingleOptionError) {
            alert(updateSingleOptionError.message);
            return;
          }

          const { error: updateKitOptionError } = await supabase
            .from("product_options")
            .update({ status: kitStatus })
            .eq("product_slug", productSlug)
            .eq("dosage", item.dosage)
            .eq("purchase_type", "kit");

          if (updateKitOptionError) {
            alert(updateKitOptionError.message);
            return;
          }
        }
      }

      const { error: markPaidError } = await supabase.rpc("mark_order_paid", {
        target_order_id: id,
      });

      if (markPaidError) {
        alert(markPaidError.message);
        return;
      }

      await loadOrders();
    } finally {
      setMarkingPaidOrderId(null);
    }
  }

  async function deleteOrder(id: string) {
    if (deletingOrderId) return;

    const orderToDelete = orders.find((order) => order.id === id);
    const orderLabel = orderToDelete?.order_number || id;

    const confirmDelete = window.confirm(
      `Are you sure you want to delete order ${orderLabel}?\n\nThis permanently deletes the order and its related order items and sales-rep redemption. This cannot be undone.`
    );

    if (!confirmDelete) return;

    setDeletingOrderId(id);

    try {
      // order_items and sales_rep_promo_redemptions both use ON DELETE CASCADE,
      // so deleting the parent order removes those related rows automatically.
      const { data: deletedRows, error: deleteError } = await supabase
        .from("orders")
        .delete()
        .eq("id", id)
        .select("id, order_number");

      if (deleteError) {
        alert(`Order could not be deleted: ${deleteError.message}`);
        return;
      }

      if (!deletedRows || deletedRows.length === 0) {
        alert(
          "No order was deleted. The order may already be gone, or your current session may not have permission to delete it. Refresh the page and try again."
        );
        await loadOrders();
        return;
      }

      setOrders((currentOrders) =>
        currentOrders.filter((order) => order.id !== id)
      );

      setNotice(`Order ${deletedRows[0].order_number || orderLabel} was deleted.`);
    } catch (error) {
      console.error("Unexpected order deletion error:", error);
      alert("An unexpected error occurred while deleting the order.");
    } finally {
      setDeletingOrderId(null);
    }
  }

  if (loading) {
    return (
      <main style={pageStyle}>
        <h1>Loading admin...</h1>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main style={pageStyle}>
        <h1 style={{ color: "#ff45d8" }}>Access Denied</h1>
        <p>You must be logged in as admin.</p>
        <Link href="/login" style={{ color: "#00d9ff" }}>
          Go to Login
        </Link>
      </main>
    );
  }

  const pendingCount = orders.filter((order) => order.status === "pending").length;

  const paidCount = orders.filter(
    (order) =>
      order.status === "paid" &&
      order.shipping_status !== "shipped" &&
      order.shipping_status !== "delivered"
  ).length;

  const shippedCount = orders.filter(
    (order) => order.shipping_status === "shipped"
  ).length;

  const deliveredCount = orders.filter(
    (order) => order.shipping_status === "delivered"
  ).length;

  const filteredOrders = orders.filter((order) => {
    const query = search.trim().toLowerCase();

    const matchesSearch =
      !query ||
      order.order_number?.toLowerCase().includes(query) ||
      order.customer_name?.toLowerCase().includes(query) ||
      order.customer_email?.toLowerCase().includes(query) ||
      order.promo_code?.toLowerCase().includes(query) ||
      order.payment_method?.toLowerCase().includes(query);

    if (!matchesSearch) {
      return false;
    }

    if (filter === "all") return true;

    if (filter === "pending") {
      return order.status === "pending";
    }

    if (filter === "paid") {
      return (
        order.status === "paid" &&
        order.shipping_status !== "shipped" &&
        order.shipping_status !== "delivered"
      );
    }

    if (filter === "shipped") {
      return order.shipping_status === "shipped";
    }

    if (filter === "delivered") {
      return order.shipping_status === "delivered";
    }

    return true;
  });

  const visibleRevenue = filteredOrders.reduce(
    (sum, order) => sum + getOrderRevenue(order),
    0
  );

  const visibleProfit = filteredOrders.reduce(
    (sum, order) => sum + getOrderProfit(order),
    0
  );

  const visibleDiscounts = filteredOrders.reduce(
    (sum, order) => sum + Number(order.total_discount || 0),
    0
  );

  const visibleCosts = filteredOrders.reduce(
    (sum, order) => sum + getOrderCost(order),
    0
  );

  const visibleMargin =
    visibleRevenue > 0
      ? (visibleProfit / visibleRevenue) * 100
      : 0;

  const averageOrderValue =
    filteredOrders.length > 0
      ? visibleRevenue / filteredOrders.length
      : 0;

  const now = new Date();

  const todayOrders = orders.filter((order) => {
    const created = new Date(order.created_at);

    return (
      created.getDate() === now.getDate() &&
      created.getMonth() === now.getMonth() &&
      created.getFullYear() === now.getFullYear()
    );
  });

  const todayRevenue = todayOrders.reduce(
    (sum, order) => sum + getOrderRevenue(order),
    0
  );

  const todayProfit = todayOrders.reduce(
    (sum, order) => sum + getOrderProfit(order),
    0
  );

  return (
    <main style={pageStyle}>
      <div style={container}>
        <header style={pageHeader}>
          <div>
            <p style={eyebrow}>CONTROL CENTER</p>

            <h1 style={pageTitle}>
              Operations Center
            </h1>

            <p style={subtitle}>
              Manage payments, fulfillment, revenue, profit, and order activity from one place.
            </p>
          </div>

          <div style={headerLinks}>
            <Link href="/admin/promos" style={secondaryLink}>
              Promo Codes
            </Link>

            <Link href="/admin/analytics" style={primaryLink}>
              Analytics
            </Link>
          </div>
        </header>

        {notice && (
          <div style={noticeBanner}>
            <span>{notice}</span>

            <button
              type="button"
              onClick={() => setNotice("")}
              style={noticeClose}
            >
              ×
            </button>
          </div>
        )}

        <section style={statsGrid}>
          <StatCard
            label="Revenue Today"
            value={`$${todayRevenue.toFixed(2)}`}
            accent="#00d9ff"
          />

          <StatCard
            label="Profit Today"
            value={`$${todayProfit.toFixed(2)}`}
            accent={todayProfit >= 0 ? "#00ff99" : "#ff6f6f"}
          />

          <StatCard
            label="Pending Payment"
            value={String(pendingCount)}
            accent="#ff6f6f"
          />

          <StatCard
            label="Ready to Ship"
            value={String(paidCount)}
            accent="#ffcc00"
          />

          <StatCard
            label="Shipped"
            value={String(shippedCount)}
            accent="#00d9ff"
          />

          <StatCard
            label="Delivered"
            value={String(deliveredCount)}
            accent="#00ff99"
          />
        </section>

        <section style={toolbarPanel}>
          <div style={searchGroup}>
            <label htmlFor="order-search" style={searchLabel}>
              Search Orders
            </label>

            <input
              id="order-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Order number, customer, email, promo code, or payment method..."
              style={searchInput}
            />
          </div>

          <div style={filterRow}>
            {[
              { key: "all", label: `All (${orders.length})` },
              { key: "pending", label: `Pending (${pendingCount})` },
              { key: "paid", label: `Ready (${paidCount})` },
              { key: "shipped", label: `Shipped (${shippedCount})` },
              { key: "delivered", label: `Delivered (${deliveredCount})` },
            ].map((item) => {
              const active = filter === item.key;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilter(item.key)}
                  style={{
                    ...filterButton,
                    borderColor: active
                      ? "#00ff99"
                      : "rgba(255,255,255,.14)",
                    background: active
                      ? "rgba(0,255,153,.10)"
                      : "rgba(255,255,255,.035)",
                    color: active
                      ? "#00ff99"
                      : "#d0d0d6",
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </section>

        <section style={financialGrid}>
          <FinancialCard
            label="Visible Revenue"
            value={`$${visibleRevenue.toFixed(2)}`}
            accent="#00d9ff"
          />

          <FinancialCard
            label="Visible Costs"
            value={`$${visibleCosts.toFixed(2)}`}
            accent="#ffcc66"
          />

          <FinancialCard
            label="Visible Profit"
            value={`$${visibleProfit.toFixed(2)}`}
            accent={visibleProfit >= 0 ? "#00ff99" : "#ff6f6f"}
          />

          <FinancialCard
            label="Margin"
            value={`${visibleMargin.toFixed(1)}%`}
            accent={visibleMargin >= 15 ? "#00ff99" : "#ffcc00"}
          />

          <FinancialCard
            label="Discounts"
            value={`$${visibleDiscounts.toFixed(2)}`}
            accent="#ff75df"
          />

          <FinancialCard
            label="Average Order"
            value={`$${averageOrderValue.toFixed(2)}`}
            accent="#7df9ff"
          />
        </section>

        <section style={ordersPanel}>
          <div style={ordersHeader}>
            <div>
              <p style={sectionEyebrow}>ORDER QUEUE</p>

              <h2 style={sectionTitle}>
                {filteredOrders.length} Visible Order
                {filteredOrders.length === 1 ? "" : "s"}
              </h2>
            </div>

            {(search || filter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setFilter("all");
                }}
                style={clearButton}
              >
                Reset View
              </button>
            )}
          </div>

          {orders.length === 0 ? (
            <div style={emptyState}>
              <p style={muted}>No orders found.</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div style={emptyState}>
              <p style={muted}>No orders match this search or filter.</p>
            </div>
          ) : (
            <div style={orderGrid}>
              {filteredOrders.map((order) => {
                const isDeleting = deletingOrderId === order.id;
                const isMarkingPaid = markingPaidOrderId === order.id;
                const isPaid = order.status === "paid";
                const revenue = getOrderRevenue(order);
                const cost = getOrderCost(order);
                const profit = getOrderProfit(order);
                const margin = getOrderMargin(order);

                return (
                  <article
                    key={order.id}
                    style={{
                      ...orderCard,
                      opacity: isDeleting ? 0.55 : 1,
                    }}
                  >
                    <div style={orderCardHeader}>
                      <div>
                        <Link
                          href={`/admin/orders/${order.id}`}
                          style={orderNumber}
                        >
                          {order.order_number}
                        </Link>

                        <p style={orderDate}>
                          {new Date(order.created_at).toLocaleString()}
                        </p>
                      </div>

                      <span style={getStatusBadgeStyle(order)}>
                        {getStatusLabel(order)}
                      </span>
                    </div>

                    <div style={customerBlock}>
                      <strong style={customerName}>
                        {order.customer_name}
                      </strong>

                      <span style={customerEmail}>
                        {order.customer_email}
                      </span>
                    </div>

                    <div style={orderMetrics}>
                      <OrderMetric
                        label="Revenue"
                        value={`$${revenue.toFixed(2)}`}
                        accent="#00d9ff"
                      />

                      <OrderMetric
                        label="Cost"
                        value={`$${cost.toFixed(2)}`}
                        accent="#ffcc66"
                      />

                      <OrderMetric
                        label="Profit"
                        value={`$${profit.toFixed(2)}`}
                        accent={profit >= 0 ? "#00ff99" : "#ff6f6f"}
                      />

                      <OrderMetric
                        label="Margin"
                        value={`${margin.toFixed(1)}%`}
                      />
                    </div>

                    <div style={orderMetaGrid}>
                      <MetaItem
                        label="Payment"
                        value={order.payment_method || "-"}
                      />

                      <MetaItem
                        label="Promo"
                        value={order.promo_code || "None"}
                        accent={order.promo_code ? "#00ff99" : undefined}
                      />

                      <MetaItem
                        label="Discount"
                        value={`$${Number(order.total_discount || 0).toFixed(2)}`}
                      />

                      <MetaItem
                        label="PugPoints"
                        value={String(Number(order.rewards_points_earned || 0))}
                      />
                    </div>

                    <div style={actionRow}>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        style={viewButton}
                      >
                        Open Order
                      </Link>

                      <button
                        type="button"
                        onClick={() => {
                          void markPaid(order.id);
                        }}
                        disabled={
                          isPaid ||
                          isMarkingPaid ||
                          Boolean(markingPaidOrderId) ||
                          Boolean(deletingOrderId)
                        }
                        style={{
                          ...paidButton,
                          opacity:
                            isPaid ||
                            isMarkingPaid ||
                            Boolean(markingPaidOrderId) ||
                            Boolean(deletingOrderId)
                              ? 0.45
                              : 1,
                          cursor:
                            isPaid ||
                            isMarkingPaid ||
                            Boolean(markingPaidOrderId) ||
                            Boolean(deletingOrderId)
                              ? "not-allowed"
                              : "pointer",
                        }}
                      >
                        {isMarkingPaid
                          ? "Marking..."
                          : isPaid
                            ? "Paid"
                            : "Mark Paid"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          void deleteOrder(order.id);
                        }}
                        disabled={
                          isDeleting ||
                          Boolean(deletingOrderId) ||
                          Boolean(markingPaidOrderId)
                        }
                        style={{
                          ...deleteButton,
                          opacity:
                            isDeleting ||
                            Boolean(deletingOrderId) ||
                            Boolean(markingPaidOrderId)
                              ? 0.45
                              : 1,
                          cursor:
                            isDeleting ||
                            Boolean(deletingOrderId) ||
                            Boolean(markingPaidOrderId)
                              ? "not-allowed"
                              : "pointer",
                        }}
                      >
                        {isDeleting ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function getStatusLabel(order: Order) {
  if (order.shipping_status === "delivered") return "DELIVERED";
  if (order.shipping_status === "shipped") return "SHIPPED";
  if (order.status === "paid") return "PAID";
  return "PENDING";
}

function getStatusBadgeStyle(order: Order) {
  return {
    padding: "6px 12px",
    borderRadius: 999,
    fontWeight: "bold",
    fontSize: 13,
    background:
      order.shipping_status === "delivered"
        ? "rgba(0,255,153,.12)"
        : order.shipping_status === "shipped"
        ? "rgba(0,217,255,.12)"
        : order.status === "paid"
        ? "rgba(255,191,0,.12)"
        : "rgba(255,77,77,.12)",
    color:
      order.shipping_status === "delivered"
        ? "#00ff99"
        : order.shipping_status === "shipped"
        ? "#00d9ff"
        : order.status === "paid"
        ? "#ffcc00"
        : "#ff4d4d",
  };
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div
      style={{
        ...statCard,
        borderColor: `${accent}55`,
        boxShadow: `0 0 18px ${accent}18`,
      }}
    >
      <span style={{ ...statLabel, color: accent }}>{label}</span>
      <strong style={statValue}>{value}</strong>
    </div>
  );
}

function FinancialCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div style={financialCard}>
      <span style={financialLabel}>{label}</span>
      <strong style={{ ...financialValue, color: accent }}>{value}</strong>
    </div>
  );
}

function OrderMetric({
  label,
  value,
  accent = "#ffffff",
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div style={orderMetric}>
      <span style={metricLabel}>{label}</span>
      <strong style={{ color: accent }}>{value}</strong>
    </div>
  );
}

function MetaItem({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div style={metaItem}>
      <span style={metaLabel}>{label}</span>
      <strong style={{ color: accent || "#ffffff" }}>{value}</strong>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  padding: "clamp(18px, 4vw, 34px)",
  background:
    "radial-gradient(circle at 12% 0%, rgba(255,47,208,.14), transparent 27%), radial-gradient(circle at 88% 4%, rgba(0,217,255,.14), transparent 30%), #000",
  color: "#ffffff",
  fontSize: 16,
};

const container = {
  width: "100%",
  maxWidth: 1480,
  margin: "0 auto",
};

const pageHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 20,
  flexWrap: "wrap" as const,
};

const eyebrow = {
  margin: 0,
  color: "#00d9ff",
  fontSize: 13,
  fontWeight: 900,
  letterSpacing: ".15em",
};

const pageTitle = {
  margin: "7px 0 0",
  color: "#ff45d8",
  fontSize: "clamp(44px, 7vw, 64px)",
  letterSpacing: "-.035em",
  textShadow: "0 0 18px rgba(255,69,216,.22)",
};

const subtitle = {
  maxWidth: 800,
  margin: "12px 0 0",
  color: "#c1c1c9",
  fontSize: 18,
  lineHeight: 1.7,
};

const headerLinks = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap" as const,
};

const primaryLink = {
  minHeight: 52,
  padding: "13px 18px",
  display: "grid",
  placeItems: "center",
  border: "1px solid #45d97a",
  borderRadius: 10,
  background: "linear-gradient(180deg, #2eea6f, #19b857)",
  color: "#ffffff",
  textDecoration: "none",
  fontSize: 16,
  fontWeight: 900,
};

const secondaryLink = {
  minHeight: 52,
  padding: "13px 18px",
  display: "grid",
  placeItems: "center",
  border: "1px solid rgba(0,217,255,.46)",
  borderRadius: 10,
  background: "rgba(0,217,255,.06)",
  color: "#7df9ff",
  textDecoration: "none",
  fontSize: 16,
  fontWeight: 900,
};

const noticeBanner = {
  marginTop: 18,
  padding: "14px 16px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  border: "1px solid rgba(0,255,153,.45)",
  borderRadius: 12,
  background: "rgba(0,255,153,.08)",
  color: "#00ff99",
  fontSize: 16,
  fontWeight: 800,
};

const noticeClose = {
  border: 0,
  background: "transparent",
  color: "#00ff99",
  fontSize: 22,
  cursor: "pointer",
};

const statsGrid = {
  marginTop: 22,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 15,
};

const statCard = {
  padding: 20,
  display: "grid",
  gap: 8,
  border: "1px solid",
  borderRadius: 16,
  background:
    "linear-gradient(145deg, rgba(12,12,17,.97), rgba(6,6,9,.98))",
};

const statLabel = {
  fontSize: 13,
  fontWeight: 900,
  letterSpacing: ".08em",
  textTransform: "uppercase" as const,
};

const statValue = {
  fontSize: 34,
};

const toolbarPanel = {
  marginTop: 22,
  padding: 20,
  display: "grid",
  gap: 16,
  border: "1px solid rgba(0,217,255,.32)",
  borderRadius: 16,
  background:
    "linear-gradient(145deg, rgba(8,8,12,.96), rgba(15,8,18,.94))",
};

const searchGroup = {
  display: "grid",
  gap: 7,
};

const searchLabel = {
  color: "#d1d1d7",
  fontSize: 14,
  fontWeight: 900,
};

const searchInput = {
  width: "100%",
  minHeight: 54,
  boxSizing: "border-box" as const,
  padding: "14px 16px",
  border: "1px solid rgba(255,255,255,.16)",
  borderRadius: 10,
  background: "#050507",
  color: "#ffffff",
  fontSize: 16,
};

const filterRow = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap" as const,
};

const filterButton = {
  minHeight: 46,
  padding: "11px 15px",
  border: "1px solid",
  borderRadius: 999,
  fontSize: 15,
  fontWeight: 900,
  cursor: "pointer",
};

const financialGrid = {
  marginTop: 18,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(185px, 1fr))",
  gap: 14,
};

const financialCard = {
  padding: 18,
  display: "grid",
  gap: 7,
  border: "1px solid rgba(255,255,255,.11)",
  borderRadius: 14,
  background: "rgba(255,255,255,.03)",
};

const financialLabel = {
  color: "#a7a7af",
  fontSize: 13,
  fontWeight: 900,
  textTransform: "uppercase" as const,
};

const financialValue = {
  fontSize: 28,
};

const ordersPanel = {
  marginTop: 22,
  padding: "clamp(18px, 3vw, 24px)",
  border: "1px solid rgba(0,217,255,.32)",
  borderRadius: 18,
  background:
    "linear-gradient(145deg, rgba(8,8,12,.96), rgba(15,8,18,.94))",
};

const ordersHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 14,
  flexWrap: "wrap" as const,
  marginBottom: 18,
};

const sectionEyebrow = {
  margin: 0,
  color: "#00d9ff",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: ".13em",
};

const sectionTitle = {
  margin: "5px 0 0",
  color: "#7df9ff",
  fontSize: 31,
};

const clearButton = {
  minHeight: 44,
  padding: "10px 14px",
  border: "1px solid rgba(255,69,216,.44)",
  borderRadius: 9,
  background: "rgba(255,69,216,.07)",
  color: "#ff75df",
  fontSize: 15,
  fontWeight: 900,
  cursor: "pointer",
};

const emptyState = {
  padding: 28,
  display: "grid",
  justifyItems: "center",
  border: "1px dashed rgba(0,217,255,.28)",
  borderRadius: 12,
};

const muted = {
  color: "#a7a7af",
  fontSize: 16,
  lineHeight: 1.6,
};

const orderGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))",
  gap: 16,
};

const orderCard = {
  padding: 18,
  display: "grid",
  gap: 16,
  border: "1px solid rgba(255,255,255,.12)",
  borderRadius: 15,
  background: "rgba(0,0,0,.26)",
  boxShadow: "0 0 18px rgba(0,217,255,.05)",
};

const orderCardHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
};

const orderNumber = {
  color: "#ff75df",
  textDecoration: "none",
  fontSize: 21,
  fontWeight: 900,
  overflowWrap: "anywhere" as const,
};

const orderDate = {
  margin: "6px 0 0",
  color: "#8f8f98",
  fontSize: 13,
};

const customerBlock = {
  display: "grid",
  gap: 4,
};

const customerName = {
  fontSize: 19,
};

const customerEmail = {
  color: "#b1b1b8",
  overflowWrap: "anywhere" as const,
};

const orderMetrics = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10,
};

const orderMetric = {
  padding: 13,
  display: "grid",
  gap: 5,
  border: "1px solid rgba(255,255,255,.08)",
  borderRadius: 10,
  background: "rgba(255,255,255,.025)",
};

const metricLabel = {
  color: "#8f8f98",
  fontSize: 11,
  fontWeight: 900,
  textTransform: "uppercase" as const,
};

const orderMetaGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10,
};

const metaItem = {
  minWidth: 0,
  display: "grid",
  gap: 4,
};

const metaLabel = {
  color: "#8f8f98",
  fontSize: 11,
  fontWeight: 900,
  textTransform: "uppercase" as const,
};

const actionRow = {
  display: "flex",
  gap: 9,
  flexWrap: "wrap" as const,
};

const viewButton = {
  minHeight: 44,
  padding: "10px 14px",
  display: "grid",
  placeItems: "center",
  border: "1px solid rgba(0,217,255,.46)",
  borderRadius: 9,
  background: "rgba(0,217,255,.06)",
  color: "#7df9ff",
  textDecoration: "none",
  fontSize: 15,
  fontWeight: 900,
};

const paidButton = {
  minHeight: 44,
  padding: "10px 14px",
  border: "1px solid rgba(0,255,153,.5)",
  borderRadius: 9,
  background: "rgba(0,255,153,.07)",
  color: "#00ff99",
  fontSize: 15,
  fontWeight: 900,
};

const deleteButton = {
  minHeight: 44,
  padding: "10px 14px",
  border: "1px solid rgba(255,93,93,.56)",
  borderRadius: 9,
  background: "rgba(255,93,93,.07)",
  color: "#ff8585",
  fontSize: 15,
  fontWeight: 900,
};