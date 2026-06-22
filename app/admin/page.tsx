"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabaseClient";

const ADMIN_EMAIL = "pugpep99@gmail.com";

type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  total: number;
  status: string;
  shipping_status?: string;
  created_at: string;
};

export default function AdminPage() {
  const supabase = createClient();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [filter, setFilter] = useState("all");

  async function loadOrders() {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
    } else {
      setOrders(data || []);
    }
  }

  useEffect(() => {
    async function loadAdmin() {
      const { data: userData } = await supabase.auth.getUser();
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
  }, []);

async function togglePaid(id: string, currentStatus: string) {
  const newStatus = currentStatus === "paid" ? "pending" : "paid";

  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .single();

  if (orderError || !orderData) {
    alert(orderError?.message || "Order not found.");
    return;
  }

  if (newStatus === "paid" && !orderData.inventory_deducted) {
    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", id);

    if (itemsError) {
      alert(itemsError.message);
      return;
    }

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

      const singleStatus =
  newQuantity > 0 ? "in stock" : "out of stock";

const kitStatus =
  newQuantity >= 10 ? "in stock" : "pre-sale";

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
  .update({
    status: singleStatus,
  })
  .eq("product_slug", productSlug)
  .eq("dosage", item.dosage)
  .eq("purchase_type", "single");

if (updateSingleOptionError) {
  alert(updateSingleOptionError.message);
  return;
}

const { error: updateKitOptionError } = await supabase
  .from("product_options")
  .update({
    status: kitStatus,
  })
  .eq("product_slug", productSlug)
  .eq("dosage", item.dosage)
  .eq("purchase_type", "kit");

if (updateKitOptionError) {
  alert(updateKitOptionError.message);
  return;
}
    }
    const { error: paidError } = await supabase
      .from("orders")
      .update({
        status: "paid",
        inventory_deducted: true,
      })
      .eq("id", id);

    if (paidError) {
      alert(paidError.message);
      return;
    }
  } else {
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }
  }

  await loadOrders();
}
async function deleteOrder(id: string) {
  const confirmDelete = window.confirm(
    "Are you sure you want to delete this order? This cannot be undone."
  );

  if (!confirmDelete) return;

  await supabase.from("order_items").delete().eq("order_id", id);

  const { error } = await supabase
    .from("orders")
    .delete()
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  alert("Order deleted.");
  await loadOrders();
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
  const pendingCount = orders.filter(
  (o) => o.status === "pending"
).length;

const paidCount = orders.filter(
  (o) =>
    o.status === "paid" &&
    o.shipping_status !== "shipped"
).length;

const shippedCount = orders.filter(
  (o) => o.shipping_status === "shipped"
).length;

const deliveredCount = orders.filter(
  (o) => o.shipping_status === "delivered"
).length;
const filteredOrders = orders.filter((order) => {
  if (filter === "all") return true;

  if (filter === "pending") {
    return order.status === "pending";
  }

  if (filter === "paid") {
    return (
      order.status === "paid" &&
      order.shipping_status !== "shipped"
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
  return (
    <main style={pageStyle}>
      <h1 style={{ color: "#ff45d8" }}>Orders</h1>
      <div
  style={{
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 20,
  }}
>
  <Link
    href="/admin/promos"
    style={{
      padding: "10px 16px",
      borderRadius: 10,
      border: "1px solid #00d9ff",
      background: "#111",
      color: "#00d9ff",
      textDecoration: "none",
      fontWeight: "bold",
    }}
  >
    Promo Codes
  </Link>

  <Link
    href="/admin/analytics"
    style={{
      padding: "10px 16px",
      borderRadius: 10,
      border: "1px solid #00ff99",
      background: "#111",
      color: "#00ff99",
      textDecoration: "none",
      fontWeight: "bold",
    }}
  >
    Analytics
  </Link>
</div>
<div
  style={{
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 25,
  }}
>
  {[
  {
    key: "all",
    label: `ALL (${orders.length})`,
  },
  {
    key: "pending",
    label: `PENDING (${pendingCount})`,
  },
  {
    key: "paid",
    label: `PAID (${paidCount})`,
  },
  {
    key: "shipped",
    label: `SHIPPED (${shippedCount})`,
  },
  {
    key: "delivered",
    label: `DELIVERED (${deliveredCount})`,
  },
].map((item) => (
  <button
    key={item.key}
    onClick={() => setFilter(item.key)}
    style={{
      padding: "10px 16px",
      borderRadius: 10,
      border:
        filter === item.key
          ? "1px solid #00ff99"
          : "1px solid #333",

      background:
        filter === item.key
          ? "rgba(0,255,153,.12)"
          : "#111",

      color:
        filter === item.key
          ? "#00ff99"
          : "#ccc",

      cursor: "pointer",
      fontWeight: "bold",
    }}
  >
    {item.label}
  </button>
))}
</div>
      {orders.length === 0 ? (
        <p>No orders found.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
  <table style={{ width: "100%", minWidth: 850, borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Order #</th>
              <th style={th}>Name</th>
              <th style={th}>Email</th>
              <th style={th}>Date</th>
              <th style={th}>Total</th>
              <th style={th}>Status</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredOrders.map((order) => (
              <tr key={order.id}
  onClick={() => (window.location.href = `/admin/orders/${order.id}`)}
  style={{
    borderBottom: "1px solid #333",
    cursor: "pointer",
  }}
>
                <td style={td}>{order.order_number}</td>
                <td style={td}>{order.customer_name}</td>
                <td style={td}>{order.customer_email}</td>
                <td style={td}>
  {new Date(order.created_at).toLocaleString()}
</td>
                <td style={td}>${Number(order.total).toFixed(2)}</td>

                <td style={td}>
                  <span
  style={{
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
  }}
>
  {order.shipping_status === "delivered"
    ? "DELIVERED"
    : order.shipping_status === "shipped"
    ? "SHIPPED"
    : order.status === "paid"
    ? "PAID"
    : "PENDING"}
</span>
                </td>

                <td style={td}>
                  <Link
                    href={`/admin/orders/${order.id}`}
                    style={{ color: "#00d9ff", marginRight: 12 }}
                  >
                    View
                  </Link>

                  <button
  onClick={(e) => {
    e.stopPropagation();
    togglePaid(order.id, order.status);
  }}
  style={order.status === "paid" ? unpaidButton : paidButton}
>
  {order.status === "paid" ? "Mark Unpaid" : "Mark Paid"}
</button>
<button
  onClick={(e) => {
    e.stopPropagation();
    deleteOrder(order.id);
  }}
  style={deleteButton}
>
  Delete
</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </main>
  );
}

const pageStyle = {
  padding: 30,
  color: "#fff",
  background: "#000",
  minHeight: "100vh",
};

const th = {
  textAlign: "left" as const,
  padding: 10,
  color: "#00d9ff",
};

const td = {
  padding: 10,
};

const paidButton = {
  padding: "6px 10px",
  background: "#003300",
  color: "#00ff99",
  border: "1px solid #00ff99",
  borderRadius: 6,
  cursor: "pointer",
};

const unpaidButton = {
  padding: "6px 10px",
  background: "#330000",
  color: "#ff4d4d",
  border: "1px solid #ff4d4d",
  borderRadius: 6,
  cursor: "pointer",
};
const deleteButton = {
  padding: "6px 10px",
  marginLeft: 8,
  background: "#220000",
  color: "#ff4d4d",
  border: "1px solid #ff4d4d",
  borderRadius: 6,
  cursor: "pointer",
};