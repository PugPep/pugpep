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
        alert("This order is already marked paid.");
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

      alert(`Order ${deletedRows[0].order_number || orderLabel} was deleted.`);
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

  return (
    <main style={pageStyle}>
      <h1 style={{ color: "#ff45d8" }}>Orders</h1>

      <div style={navigationRow}>
        <Link href="/admin/promos" style={promoLink}>
          Promo Codes
        </Link>

        <Link href="/admin/analytics" style={analyticsLink}>
          Analytics
        </Link>
      </div>

      <div style={filterRow}>
        {[
          { key: "all", label: `ALL (${orders.length})` },
          { key: "pending", label: `PENDING (${pendingCount})` },
          { key: "paid", label: `PAID (${paidCount})` },
          { key: "shipped", label: `SHIPPED (${shippedCount})` },
          { key: "delivered", label: `DELIVERED (${deliveredCount})` },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key)}
            style={{
              ...filterButton,
              border:
                filter === item.key
                  ? "1px solid #00ff99"
                  : "1px solid #333",
              background:
                filter === item.key ? "rgba(0,255,153,.12)" : "#111",
              color: filter === item.key ? "#00ff99" : "#ccc",
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div style={summaryGrid}>
        <div style={summaryCard}>
          <span style={summaryLabel}>Visible Order Revenue</span>
          <strong style={summaryValue}>${visibleRevenue.toFixed(2)}</strong>
        </div>

        <div style={summaryCard}>
          <span style={summaryLabel}>Visible Profit</span>
          <strong
            style={{
              ...summaryValue,
              color: visibleProfit >= 0 ? "#00ff99" : "#ff4d4d",
            }}
          >
            ${visibleProfit.toFixed(2)}
          </strong>
        </div>

        <div style={summaryCard}>
          <span style={summaryLabel}>Visible Discounts</span>
          <strong style={summaryValue}>${visibleDiscounts.toFixed(2)}</strong>
        </div>
      </div>

      {orders.length === 0 ? (
        <p>No orders found.</p>
      ) : filteredOrders.length === 0 ? (
        <p>No orders match this filter.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={th}>Order #</th>
                <th style={th}>Name</th>
                <th style={th}>Email</th>
                <th style={th}>Date</th>
                <th style={th}>Revenue</th>
                <th style={th}>Cost</th>
                <th style={th}>Profit</th>
                <th style={th}>Margin</th>
                <th style={th}>Payment</th>
                <th style={th}>Promo Code</th>
                <th style={th}>Status</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredOrders.map((order) => {
                const isDeleting = deletingOrderId === order.id;
                const isMarkingPaid = markingPaidOrderId === order.id;
                const isPaid = order.status === "paid";

                return (
                  <tr
                    key={order.id}
                    onClick={() => {
                      if (!isDeleting && !isMarkingPaid) {
                        window.location.href = `/admin/orders/${order.id}`;
                      }
                    }}
                    style={{
                      borderBottom: "1px solid #333",
                      cursor:
                        isDeleting || isMarkingPaid ? "default" : "pointer",
                      opacity: isDeleting ? 0.55 : 1,
                    }}
                  >
                    <td style={td}>{order.order_number}</td>
                    <td style={td}>{order.customer_name}</td>
                    <td style={td}>{order.customer_email}</td>
                    <td style={td}>
                      {new Date(order.created_at).toLocaleString()}
                    </td>
                    <td style={td}>${getOrderRevenue(order).toFixed(2)}</td>
                    <td style={td}>${getOrderCost(order).toFixed(2)}</td>
                    <td
                      style={{
                        ...td,
                        color:
                          getOrderProfit(order) >= 0 ? "#00ff99" : "#ff4d4d",
                        fontWeight: "bold",
                      }}
                    >
                      ${getOrderProfit(order).toFixed(2)}
                    </td>
                    <td style={td}>{getOrderMargin(order).toFixed(1)}%</td>
                    <td style={td}>{order.payment_method || "-"}</td>
                    <td style={td}>
                      {order.promo_code ? (
                        <span style={promoBadge}>{order.promo_code}</span>
                      ) : (
                        <span style={{ color: "#777" }}>None</span>
                      )}
                    </td>

                    <td style={td}>
                      <span style={getStatusBadgeStyle(order)}>
                        {getStatusLabel(order)}
                      </span>
                    </td>

                    <td style={td}>
                      <div style={actionsWrapper}>
                        <Link
                          href={`/admin/orders/${order.id}`}
                          onClick={(event) => event.stopPropagation()}
                          style={{ color: "#00d9ff" }}
                        >
                          View
                        </Link>

                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            markPaid(order.id);
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
                          onClick={(event) => {
                            event.stopPropagation();
                            deleteOrder(order.id);
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
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
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

const pageStyle = {
  padding: 30,
  color: "#fff",
  background: "#000",
  minHeight: "100vh",
};

const navigationRow = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap" as const,
  marginBottom: 20,
};

const promoLink = {
  padding: "10px 16px",
  borderRadius: 10,
  border: "1px solid #00d9ff",
  background: "#111",
  color: "#00d9ff",
  textDecoration: "none",
  fontWeight: "bold",
};

const analyticsLink = {
  padding: "10px 16px",
  borderRadius: 10,
  border: "1px solid #00ff99",
  background: "#111",
  color: "#00ff99",
  textDecoration: "none",
  fontWeight: "bold",
};

const filterRow = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap" as const,
  marginBottom: 25,
};

const filterButton = {
  padding: "10px 16px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
};

const tableStyle = {
  width: "100%",
  minWidth: 1280,
  borderCollapse: "collapse" as const,
};

const th = {
  textAlign: "left" as const,
  padding: 10,
  color: "#00d9ff",
};

const td = {
  padding: 10,
};

const actionsWrapper = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap" as const,
};

const paidButton = {
  padding: "6px 10px",
  background: "#003300",
  color: "#00ff99",
  border: "1px solid #00ff99",
  borderRadius: 6,
};

const deleteButton = {
  padding: "6px 10px",
  background: "#220000",
  color: "#ff4d4d",
  border: "1px solid #ff4d4d",
  borderRadius: 6,
};

const promoBadge = {
  display: "inline-block",
  padding: "5px 9px",
  borderRadius: 999,
  border: "1px solid #00ff99",
  background: "rgba(0,255,153,.10)",
  color: "#00ff99",
  fontWeight: "bold",
  fontSize: 12,
};

const summaryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 14,
  marginBottom: 24,
};

const summaryCard = {
  padding: 16,
  border: "1px solid #333",
  borderRadius: 12,
  background: "#111",
  display: "grid",
  gap: 8,
};

const summaryLabel = {
  color: "#aaa",
  fontSize: 13,
  textTransform: "uppercase" as const,
  letterSpacing: 0.6,
};

const summaryValue = {
  color: "#00d9ff",
  fontSize: 24,
};