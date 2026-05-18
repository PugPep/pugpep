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
  created_at: string;
};

export default function AdminPage() {
  const supabase = createClient();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

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

 async function togglePaid(id: string, currentStatus: string)
 
 
 {
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

      const { error: updateInventoryError } = await supabase
        .from("inventory")
        .update({
          quantity: newQuantity,
          status: newQuantity > 0 ? "in stock" : "out of stock",
          updated_at: new Date().toISOString(),
        })
        .eq("id", inventoryRow.id);

      if (updateInventoryError) {
        alert(updateInventoryError.message);
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

  return (
    <main style={pageStyle}>
      <h1 style={{ color: "#ff45d8" }}>Admin Dashboard</h1>

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
              <th style={th}>Total</th>
              <th style={th}>Status</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {orders.map((order) => (
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
                <td style={td}>${Number(order.total).toFixed(2)}</td>

                <td style={td}>
                  <span
                    style={{
                      color: order.status === "paid" ? "#00ff99" : "#ffcc00",
                      fontWeight: "bold",
                    }}
                  >
                    {order.status}
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