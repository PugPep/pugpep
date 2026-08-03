"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../lib/supabaseClient";
import { Html5QrcodeScanner } from "html5-qrcode";

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
  tracking_number?: string | null;
  created_at: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
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
  const [restoringOrderId, setRestoringOrderId] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [deliveryOrderId, setDeliveryOrderId] =
    useState<string | null>(null);

  const [deliveryStatus, setDeliveryStatus] =
    useState("not shipped");

  const [trackingNumber, setTrackingNumber] =
    useState("");

  const [savingDelivery, setSavingDelivery] =
    useState(false);

  const [scannerOpen, setScannerOpen] =
    useState(false);

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
    const order = orders.find((item) => item.id === id);
    const label = order?.order_number || id;
    if (!window.confirm(`Move order ${label} to Recently Deleted?\n\nIt can be restored later.`)) return;
    setDeletingOrderId(id);
    setNotice("");
    try {
      const { error } = await supabase.rpc("admin_soft_delete_order", { target_order_id: id });
      if (error) { setNotice(`Order could not be deleted: ${error.message}`); return; }
      setNotice(`Order ${label} moved to Recently Deleted.`);
      await loadOrders();
    } finally { setDeletingOrderId(null); }
  }

  async function restoreOrder(id: string) {
    if (restoringOrderId) return;
    setRestoringOrderId(id); setNotice("");
    try {
      const { error } = await supabase.rpc("admin_restore_order", { target_order_id: id });
      if (error) { setNotice(`Order could not be restored: ${error.message}`); return; }
      setNotice("Order restored."); await loadOrders();
    } finally { setRestoringOrderId(null); }
  }

  async function cancelOrder(id: string) {
    if (cancellingOrderId) return;
    const order = orders.find((item) => item.id === id);
    const label = order?.order_number || id;
    if (!window.confirm(`Cancel unpaid order ${label}?`)) return;
    setCancellingOrderId(id); setNotice("");
    try {
      const { error } = await supabase.rpc("admin_cancel_order", {
        target_order_id: id,
        reason: "Cancelled by administrator",
      });
      if (error) { setNotice(`Order could not be cancelled: ${error.message}`); return; }
      setNotice(`Order ${label} cancelled.`); await loadOrders();
    } finally { setCancellingOrderId(null); }
  }

  async function reopenCancelledOrder(id: string) {
    if (cancellingOrderId) return;
    setCancellingOrderId(id); setNotice("");
    try {
      const { error } = await supabase.rpc("admin_reopen_cancelled_order", { target_order_id: id });
      if (error) { setNotice(`Order could not be reopened: ${error.message}`); return; }
      setNotice("Cancelled order reopened as pending."); await loadOrders();
    } finally { setCancellingOrderId(null); }
  }

  useEffect(() => {
    if (
      !scannerOpen ||
      !deliveryOrderId
    ) {
      return;
    }

    const scannerId =
      `tracking-scanner-${deliveryOrderId}`;

    const scanner =
      new Html5QrcodeScanner(
        scannerId,
        {
          fps: 10,
          qrbox: {
            width: 280,
            height: 120,
          },
          rememberLastUsedCamera:
            true,
        },
        false
      );

    scanner.render(
      (
        decodedText
      ) => {
        const captured =
          decodedText.trim();

        if (!captured) {
          return;
        }

        setTrackingNumber(
          captured
        );

        setDeliveryStatus(
          "shipped"
        );

        void saveDeliveryUpdate(
          deliveryOrderId,
          "shipped",
          captured
        );

        setScannerOpen(
          false
        );

        void scanner
          .clear()
          .catch(() => {});
      },
      () => {
        // Normal scan misses are ignored while the camera is active.
      }
    );

    return () => {
      void scanner
        .clear()
        .catch(() => {});
    };
  }, [
    scannerOpen,
    deliveryOrderId,
  ]);

  function openDeliveryPanel(
    order: Order
  ) {
    if (
      deliveryOrderId ===
      order.id
    ) {
      setDeliveryOrderId(
        null
      );

      setScannerOpen(
        false
      );

      return;
    }

    setDeliveryOrderId(
      order.id
    );

    setDeliveryStatus(
      order.shipping_status ||
        "not shipped"
    );

    setTrackingNumber(
      order.tracking_number ||
        ""
    );

    setScannerOpen(
      false
    );

    setNotice("");
  }

  async function saveDeliveryUpdate(
    orderId = deliveryOrderId,
    status = deliveryStatus,
    tracking = trackingNumber
  ) {
    if (
      !orderId ||
      savingDelivery
    ) {
      return;
    }

    const cleanedTracking =
      tracking.trim();

    if (
      status ===
        "shipped" &&
      !cleanedTracking
    ) {
      setNotice(
        "Enter or scan a tracking number before marking an order shipped."
      );

      return;
    }

    setSavingDelivery(
      true
    );

    setNotice("");

    try {
      const {
        error,
      } =
        await supabase
          .from("orders")
          .update({
            shipping_status:
              status,
            tracking_number:
              cleanedTracking ||
              null,
          })
          .eq(
            "id",
            orderId
          );

      if (error) {
        setNotice(
          `Delivery information could not be saved: ${error.message}`
        );

        return;
      }

      setNotice(
        status ===
        "shipped"
          ? `Tracking ${cleanedTracking} saved and order marked shipped.`
          : `Delivery status updated to ${status}.`
      );

      setDeliveryStatus(
        status
      );

      setTrackingNumber(
        cleanedTracking
      );

      await loadOrders();
    } finally {
      setSavingDelivery(
        false
      );
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

  const activeOrders = orders.filter((order) => !order.deleted_at);
  const deletedOrders = orders.filter((order) => Boolean(order.deleted_at));
  const pendingCount = activeOrders.filter((order) => order.status === "pending").length;
  const paidCount = activeOrders.filter((order) => order.status === "paid" && order.shipping_status !== "shipped" && order.shipping_status !== "delivered").length;
  const shippedCount = activeOrders.filter((order) => order.shipping_status === "shipped").length;
  const deliveredCount = activeOrders.filter((order) => order.shipping_status === "delivered").length;
  const cancelledCount = activeOrders.filter((order) => order.status === "cancelled").length;

  const filteredOrders = orders.filter((order) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || order.order_number?.toLowerCase().includes(query) || order.customer_name?.toLowerCase().includes(query) || order.customer_email?.toLowerCase().includes(query) || order.promo_code?.toLowerCase().includes(query) || order.payment_method?.toLowerCase().includes(query) ||
      order.tracking_number?.toLowerCase().includes(query);
    if (!matchesSearch) return false;
    if (filter === "deleted") return Boolean(order.deleted_at);
    if (order.deleted_at) return false;
    if (filter === "all") return true;
    if (filter === "pending") return order.status === "pending";
    if (filter === "paid") return order.status === "paid" && order.shipping_status !== "shipped" && order.shipping_status !== "delivered";
    if (filter === "shipped") return order.shipping_status === "shipped";
    if (filter === "delivered") return order.shipping_status === "delivered";
    if (filter === "cancelled") return order.status === "cancelled";
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

          <StatCard label="Cancelled" value={String(cancelledCount)} accent="#ff6f6f" />
          <StatCard label="Recently Deleted" value={String(deletedOrders.length)} accent="#b8bcc4" />
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
              placeholder="Order number, customer, email, promo, payment, or tracking number..."
              style={searchInput}
            />
          </div>

          <div style={filterRow}>
            {[
              { key: "all", label: `All (${activeOrders.length})` },
              { key: "pending", label: `Pending (${pendingCount})` },
              { key: "paid", label: `Ready (${paidCount})` },
              { key: "shipped", label: `Shipped (${shippedCount})` },
              { key: "delivered", label: `Delivered (${deliveredCount})` },
              { key: "cancelled", label: `Cancelled (${cancelledCount})` },
              { key: "deleted", label: `Recently Deleted (${deletedOrders.length})` },
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
                        label="Shipping"
                        value={
                          order.shipping_status ||
                          "not shipped"
                        }
                        accent={
                          order.shipping_status ===
                          "delivered"
                            ? "#00ff99"
                            : order.shipping_status ===
                              "shipped"
                            ? "#00d9ff"
                            : undefined
                        }
                      />

                      <MetaItem
                        label="Tracking"
                        value={
                          order.tracking_number ||
                          "Not added"
                        }
                        accent={
                          order.tracking_number
                            ? "#7df9ff"
                            : undefined
                        }
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

                    <div className="order-action-row" style={actionRow}>
                      {!order.deleted_at && <Link href={`/admin/orders/${order.id}`} style={viewButton}>Open</Link>}

                      {order.deleted_at ? (
                        <button type="button" onClick={() => void restoreOrder(order.id)} disabled={Boolean(restoringOrderId)} style={restoreButton}>
                          {restoringOrderId === order.id ? "Restoring..." : "Restore Order"}
                        </button>
                      ) : order.status === "cancelled" ? (
                        <button type="button" onClick={() => void reopenCancelledOrder(order.id)} disabled={Boolean(cancellingOrderId)} style={paidButton}>
                          {cancellingOrderId === order.id ? "Reopening..." : "Reopen as Pending"}
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              void markPaid(
                                order.id
                              )
                            }
                            disabled={
                              isPaid ||
                              isMarkingPaid ||
                              Boolean(
                                markingPaidOrderId
                              ) ||
                              Boolean(
                                deletingOrderId
                              ) ||
                              Boolean(
                                cancellingOrderId
                              )
                            }
                            style={{
                              ...paidButton,
                              opacity:
                                isPaid ||
                                isMarkingPaid ||
                                Boolean(
                                  markingPaidOrderId
                                ) ||
                                Boolean(
                                  deletingOrderId
                                ) ||
                                Boolean(
                                  cancellingOrderId
                                )
                                  ? 0.45
                                  : 1,
                            }}
                          >
                            {isMarkingPaid
                              ? "Saving..."
                              : isPaid
                              ? "Paid"
                              : "Paid"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              openDeliveryPanel(
                                order
                              )
                            }
                            style={deliveryButton}
                          >
                            {deliveryOrderId ===
                            order.id
                              ? "Close"
                              : "Delivery"}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void cancelOrder(
                                order.id
                              )
                            }
                            disabled={Boolean(
                              cancellingOrderId
                            )}
                            style={{
                              ...cancelButton,
                              opacity:
                                cancellingOrderId
                                  ? 0.55
                                  : 1,
                            }}
                          >
                            {cancellingOrderId ===
                            order.id
                              ? "Cancelling..."
                              : "Cancel"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              void deleteOrder(
                                order.id
                              )
                            }
                            disabled={
                              isDeleting ||
                              Boolean(
                                deletingOrderId
                              ) ||
                              Boolean(
                                markingPaidOrderId
                              ) ||
                              Boolean(
                                cancellingOrderId
                              )
                            }
                            style={deleteButton}
                          >
                            {isDeleting
                              ? "Moving..."
                              : "Delete"}
                          </button>
                        </>
                      )}
                    </div>

                    {deliveryOrderId ===
                      order.id && (
                      <div style={deliveryPanel}>
                        <div style={deliveryPanelHeader}>
                          <div>
                            <span style={deliveryEyebrow}>
                              QUICK DELIVERY UPDATE
                            </span>

                            <strong style={deliveryTitle}>
                              {order.order_number}
                            </strong>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setDeliveryOrderId(
                                null
                              );

                              setScannerOpen(
                                false
                              );
                            }}
                            style={deliveryCloseButton}
                          >
                            ×
                          </button>
                        </div>

                        <div className="quick-delivery-grid" style={deliveryGrid}>
                          <label style={deliveryField}>
                            <span style={deliveryLabel}>
                              Shipping Status
                            </span>

                            <select
                              value={deliveryStatus}
                              onChange={(event) =>
                                setDeliveryStatus(
                                  event.target.value
                                )
                              }
                              style={deliveryInput}
                            >
                              <option value="not shipped">
                                Not Shipped
                              </option>

                              <option value="processing">
                                Processing
                              </option>

                              <option value="shipped">
                                Shipped
                              </option>

                              <option value="delivered">
                                Delivered
                              </option>
                            </select>
                          </label>

                          <label style={deliveryField}>
                            <span style={deliveryLabel}>
                              Tracking Number
                            </span>

                            <input
                              value={trackingNumber}
                              onChange={(event) =>
                                setTrackingNumber(
                                  event.target.value
                                )
                              }
                              placeholder="Scan or enter tracking"
                              style={deliveryInput}
                            />
                          </label>
                        </div>

                        <div className="delivery-action-row" style={deliveryActions}>
                          <button
                            type="button"
                            onClick={() =>
                              void saveDeliveryUpdate()
                            }
                            disabled={savingDelivery}
                            style={{
                              ...saveDeliveryButton,
                              opacity:
                                savingDelivery
                                  ? 0.6
                                  : 1,
                            }}
                          >
                            {savingDelivery
                              ? "Saving..."
                              : "Save Delivery"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setScannerOpen(
                                (
                                  current
                                ) =>
                                  !current
                              )
                            }
                            style={scanButton}
                          >
                            {scannerOpen
                              ? "Close Scanner"
                              : "Scan Tracking Code"}
                          </button>
                        </div>

                        {scannerOpen && (
                          <div style={scannerPanel}>
                            <p style={scannerInstructions}>
                              Point the camera at the tracking barcode. A successful scan saves the tracking number and marks the order shipped automatically.
                            </p>

                            <div
                              id={`tracking-scanner-${order.id}`}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
        <style jsx>{`
          @media (max-width: 680px) {
            .quick-delivery-grid {
              grid-template-columns: minmax(0, 1fr) !important;
            }

            .order-action-row {
              grid-template-columns:
                repeat(2, minmax(0, 1fr)) !important;
            }

            .delivery-action-row {
              grid-template-columns:
                minmax(0, 1fr) !important;
            }
          }
        `}</style>
      </div>
    </main>
  );
}

function getStatusLabel(order: Order) {
  if (order.deleted_at) return "DELETED";
  if (order.status === "cancelled") return "CANCELLED";
  if (order.shipping_status === "delivered") return "DELIVERED";
  if (order.shipping_status === "shipped") return "SHIPPED";
  if (order.status === "paid") return "PAID";
  return "PENDING";
}

function getStatusBadgeStyle(order: Order) {
  const deleted = Boolean(order.deleted_at);
  const cancelled = order.status === "cancelled";
  return {
    padding: "7px 11px", borderRadius: 999, fontWeight: 900, fontSize: 12,
    background: deleted ? "rgba(184,188,196,.10)" : cancelled ? "rgba(255,111,111,.10)" : order.shipping_status === "delivered" ? "rgba(0,255,153,.12)" : order.shipping_status === "shipped" ? "rgba(0,217,255,.12)" : order.status === "paid" ? "rgba(255,191,0,.12)" : "rgba(255,77,77,.12)",
    color: deleted ? "#b8bcc4" : cancelled ? "#ff7f7f" : order.shipping_status === "delivered" ? "#00ff99" : order.shipping_status === "shipped" ? "#00d9ff" : order.status === "paid" ? "#ffcc00" : "#ff4d4d",
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
  display: "grid",
  gridTemplateColumns:
    "repeat(5, minmax(0, 1fr))",
  gap: 7,
  alignItems: "stretch",
};





const deliveryPanel = {
  padding: 16,
  display: "grid",
  gap: 14,
  border: "1px solid rgba(0,217,255,.32)",
  borderRadius: 13,
  background:
    "linear-gradient(145deg, rgba(0,217,255,.055), rgba(255,69,216,.045))",
};

const deliveryPanelHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
};

const deliveryEyebrow = {
  display: "block",
  color: "#00d9ff",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: ".12em",
};

const deliveryTitle = {
  display: "block",
  marginTop: 4,
  color: "#ffffff",
  fontSize: 18,
};

const deliveryCloseButton = {
  width: 42,
  height: 42,
  border: "1px solid rgba(255,255,255,.16)",
  borderRadius: 9,
  background: "rgba(255,255,255,.04)",
  color: "#ffffff",
  fontSize: 22,
  cursor: "pointer",
};

const deliveryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 12,
};

const deliveryField = {
  minWidth: 0,
  display: "grid",
  gap: 6,
};

const deliveryLabel = {
  color: "#cfcfd6",
  fontSize: 13,
  fontWeight: 900,
};

const deliveryInput = {
  width: "100%",
  minWidth: 0,
  minHeight: 48,
  boxSizing: "border-box" as const,
  padding: "12px 13px",
  border: "1px solid rgba(255,255,255,.16)",
  borderRadius: 9,
  background: "#050507",
  color: "#ffffff",
  fontSize: 15,
};

const deliveryActions = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",
  gap: 10,
  alignItems: "stretch",
};



const scannerPanel = {
  padding: 14,
  border: "1px solid rgba(255,69,216,.28)",
  borderRadius: 12,
  background: "rgba(0,0,0,.38)",
};

const scannerInstructions = {
  margin: "0 0 12px",
  color: "#b7b7bf",
  fontSize: 13,
  lineHeight: 1.6,
};


const actionButtonBase = {
  minHeight: 40,
  minWidth: 0,
  width: "100%",
  padding: "7px 8px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
  boxSizing: "border-box" as const,
  borderRadius: 9,
  fontSize: 12,
  fontWeight: 900,
  lineHeight: 1.15,
  whiteSpace: "nowrap" as const,
  textAlign: "center" as const,
  textDecoration: "none",
  cursor: "pointer",
  transition:
    "transform .16s ease, border-color .16s ease, background .16s ease, opacity .16s ease",
};

const viewButton = {
  ...actionButtonBase,
  border: "1px solid rgba(0,217,255,.52)",
  background:
    "linear-gradient(180deg, rgba(0,217,255,.13), rgba(0,217,255,.06))",
  color: "#7df9ff",
};

const paidButton = {
  ...actionButtonBase,
  border: "1px solid rgba(0,255,153,.52)",
  background:
    "linear-gradient(180deg, rgba(0,255,153,.14), rgba(0,255,153,.06))",
  color: "#00ff99",
};

const deliveryButton = {
  ...actionButtonBase,
  border: "1px solid rgba(0,217,255,.52)",
  background:
    "linear-gradient(180deg, rgba(0,217,255,.13), rgba(0,217,255,.06))",
  color: "#7df9ff",
};

const restoreButton = {
  ...actionButtonBase,
  border: "1px solid rgba(0,255,153,.52)",
  background:
    "linear-gradient(180deg, rgba(0,255,153,.14), rgba(0,255,153,.06))",
  color: "#00ff99",
};

const cancelButton = {
  ...actionButtonBase,
  border: "1px solid rgba(255,204,0,.54)",
  background:
    "linear-gradient(180deg, rgba(255,204,0,.14), rgba(255,204,0,.06))",
  color: "#ffcc00",
};

const deleteButton = {
  ...actionButtonBase,
  border: "1px solid rgba(255,93,93,.56)",
  background:
    "linear-gradient(180deg, rgba(255,93,93,.14), rgba(255,93,93,.06))",
  color: "#ff8585",
};

const saveDeliveryButton = {
  ...actionButtonBase,
  border: "1px solid rgba(0,255,153,.52)",
  background:
    "linear-gradient(180deg, rgba(0,255,153,.14), rgba(0,255,153,.06))",
  color: "#00ff99",
};

const scanButton = {
  ...actionButtonBase,
  border: "1px solid rgba(255,69,216,.52)",
  background:
    "linear-gradient(180deg, rgba(255,69,216,.14), rgba(255,69,216,.06))",
  color: "#ff75df",
};