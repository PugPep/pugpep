"use client";

import emailjs from "emailjs-com";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "../../../../lib/supabaseClient";
import { Html5QrcodeScanner } from "html5-qrcode";
const EMAILJS_SERVICE_ID = "service_quxnkin";
const EMAILJS_PUBLIC_KEY = "yc_0cE0Mcl3tfzc11";
const SHIPPING_TEMPLATE_ID = "template_piq2u0f";

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const supabase = createClient();

  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [shippingStatus, setShippingStatus] = useState("not shipped");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadOrder();
  }, [id]);

  async function loadOrder() {
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .single();

    if (orderError) {
      alert(orderError.message);
      return;
    }

    const { data: itemData, error: itemError } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", orderData.id);

    if (itemError) {
      alert(itemError.message);
      return;
    }

    setOrder(orderData);
    setItems(itemData || []);
    setShippingStatus(orderData.shipping_status || "not shipped");
    setTrackingNumber(orderData.tracking_number || "");
  }

  async function saveShippingInfo() {
    setSaving(true);

    const { error } = await supabase
      .from("orders")
      .update({
        shipping_status: shippingStatus,
        tracking_number: trackingNumber,
      })
      .eq("id", id);

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Shipping information saved.");
    await loadOrder();
  }
function formatPhoneNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  return phone;
}
 
  async function notifyCustomer() {
  if (!order) return;

  if (!trackingNumber) {
    alert("Please scan or enter a tracking number before notifying the customer.");
    return;
  }

  setSendingEmail(true);

try {
  // 1. Save tracking number and mark shipped first
  const { error } = await supabase
    .from("orders")
    .update({
      shipping_status: "shipped",
      tracking_number: trackingNumber,
    })
    .eq("id", id);

  if (error) {
    alert("Order update failed: " + error.message);
    setSendingEmail(false);
    return;
  }

  setShippingStatus("shipped");

  // 2. Then send email
  await emailjs.send(
      EMAILJS_SERVICE_ID,
      SHIPPING_TEMPLATE_ID,
      {
        name: order.customer_name,
        email: order.customer_email,
        order_number: order.order_number,
        shipping_status: "shipped",
        tracking_number: trackingNumber,
        shipping_address: `${order.shipping_address}, ${order.city}, ${order.state} ${order.zip}`,
        order_total: Number(order.total).toFixed(2),
        items: items.map((item) => ({
          name: item.product_name,
          dosage: item.dosage,
          purchase_type: item.purchase_type,
          price: Number(item.price).toFixed(2),
        })),
      },
      EMAILJS_PUBLIC_KEY
    );

    const smsRes = await fetch("/api/send-shipping-sms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
  customerPhone: formatPhoneNumber(order.customer_phone),
  orderNumber: order.order_number,
  shippingStatus: "shipped",
  trackingNumber,
}),
    });

    const smsData = await smsRes.json();

    if (!smsData.success) {
      alert("Email sent, but text failed: " + (smsData.error || "SMS failed."));
      return;
    }

    

    alert("Customer notified by email and text.");
    await loadOrder();
  } catch (error) {
    console.error(error);
    alert("Customer notification failed.");
  }

  setSendingEmail(false);
}

function startScanner() {
  setScannerOpen(true);

  setTimeout(() => {
    const scanner = new Html5QrcodeScanner(
      "tracking-scanner",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      },
      false
    );

    scanner.render(
      (decodedText) => {
  setTrackingNumber(decodedText);
  setShippingStatus("shipped");
  scanner.clear();
  setScannerOpen(false);
},
      () => {}
    );
  }, 100);
}
  if (!order) {
    return <main style={page}>Loading order...</main>;
  }

  return (
    <main style={page}>
      <button onClick={() => router.push("/admin")} style={backButton}>
        ← Back to Orders
      </button>

      <h1 style={{ color: "#ff45d8" }}>Order {order.order_number}</h1>
      <p style={{ color: "#ccc" }}>
  <strong>Order Date:</strong>{" "}
  {new Date(order.created_at).toLocaleString()}
</p>
<p style={{ color: "#888" }}>
  Page ID: {id}
</p>

<p style={{ color: "#888" }}>
  Order Row ID: {order.id}
</p>
      <section style={box}>
        <h2 style={{ color: "#00d9ff" }}>Customer</h2>
        <p><strong>Name:</strong> {order.customer_name}</p>
        <p><strong>Email:</strong> {order.customer_email}</p>
        {order.has_lifetime_free_shipping && (
  <p
    style={{
      color: "#00ff99",
      fontWeight: "bold",
      marginTop: 10,
    }}
  >
    🚚 Lifetime Free Shipping Member
  </p>
)}
        <p><strong>Phone:</strong> {order.customer_phone || "Not provided"}</p>
      </section>

      <section style={box}>
        <h2 style={{ color: "#00d9ff" }}>Shipping Address</h2>
        <p>{order.shipping_address}</p>
        <p>{order.city}, {order.state} {order.zip}</p>
      </section>

      <section style={box}>
        <h2 style={{ color: "#00d9ff" }}>Order Contents</h2>

        {items.length === 0 ? (
          <p style={{ color: "#ffcc00" }}>
            No order items found for this order.
          </p>
        ) : (
          items.map((item) => (
            <div key={item.id} style={itemRow}>
              <strong>{item.product_name || "Product"}</strong>
              <span>{item.dosage || "-"}</span>
              <span>{item.purchase_type || "-"}</span>
              <span>Qty: {item.quantity || 1}</span>
              <span>${Number(item.price || 0).toFixed(2)}</span>
            </div>
          ))
        )}
      </section>

      <section style={box}>
  <h2 style={{ color: "#00d9ff" }}>Totals</h2>

  <p>Subtotal: ${Number(order.subtotal || 0).toFixed(2)}</p>

  {(order.promo_code || Number(order.promo_discount || 0) > 0) && (
    <div
      style={{
        margin: "8px 0",
        padding: 10,
        border: "1px solid #00ff99",
        borderRadius: 8,
        background: "rgba(0,255,153,.08)",
      }}
    >
      {order.promo_code && (
        <p style={{ margin: 0 }}>
          Promo Code:{" "}
          <strong style={{ color: "#00ff99" }}>
            {order.promo_code}
          </strong>
        </p>
      )}

      {Number(order.promo_discount || 0) > 0 && (
        <p style={{ margin: "6px 0 0", color: "#00ff99" }}>
          Promo Discount: -${Number(order.promo_discount).toFixed(2)}
        </p>
      )}
    </div>
  )}

  <p>Shipping: ${Number(order.shipping || 0).toFixed(2)}</p>

  <h2>Total: ${Number(order.total || 0).toFixed(2)}</h2>

  <p>
    <strong>Payment Status:</strong> {order.status}
  </p>
</section>

      <section style={box}>
        <h2 style={{ color: "#00d9ff" }}>Shipping Status</h2>

        <label style={label}>Shipping Status</label>
        <select
          value={shippingStatus}
          onChange={(e) => setShippingStatus(e.target.value)}
          style={input}
        >
          <option value="not shipped">not shipped</option>
          <option value="processing">processing</option>
          <option value="shipped">shipped</option>
          <option value="delivered">delivered</option>
        </select>

        <label style={label}>Tracking Number</label>
        <input
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
          placeholder="Enter tracking number"
          style={input}
        />
{!trackingNumber && (
  <p style={{ color: "#ffcc00", marginTop: 8 }}>
    Scan or enter a tracking number before notifying the customer.
  </p>
)}
        <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
  <button onClick={saveShippingInfo} style={button}>
    {saving ? "Saving..." : "Save Shipping"}
  </button>

 <button onClick={startScanner} style={button}>
  Scan Label
</button>

<button
  onClick={notifyCustomer}
  disabled={!trackingNumber || sendingEmail}
  style={{
    ...emailButton,
    opacity: !trackingNumber || sendingEmail ? 0.5 : 1,
    cursor: !trackingNumber || sendingEmail ? "not-allowed" : "pointer",
  }}
>
 {sendingEmail ? "Notifying..." : "Notify & Mark Shipped"}
</button>
</div>
        {scannerOpen && (
  <div
    style={{
      marginTop: 20,
      padding: 20,
      border: "1px solid #333",
      borderRadius: 12,
      background: "#050505",
    }}
  >
    <h3 style={{ color: "#00d9ff" }}>
      Scan Shipping Label
    </h3>

    <div id="tracking-scanner" />
  </div>
)}
      </section>
    </main>
  );
}

const page = {
  padding: 30,
  color: "#fff",
  background: "#000",
  minHeight: "100vh",
};

const box = {
  marginTop: 20,
  padding: 20,
  border: "1px solid #333",
  borderRadius: 12,
  background: "#111",
};

const itemRow = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr 1fr 1fr",
  gap: 12,
  borderBottom: "1px solid #333",
  padding: "12px 0",
};

const label = {
  display: "block",
  marginTop: 12,
  marginBottom: 6,
  color: "#ccc",
};

const input = {
  width: "100%",
  padding: 12,
  background: "#050505",
  color: "#fff",
  border: "1px solid #333",
  borderRadius: 8,
};

const button = {
  padding: "12px 18px",
  borderRadius: 10,
  border: "1px solid #00d9ff",
  background: "#001b22",
  color: "#00d9ff",
  fontWeight: "bold",
  cursor: "pointer",
};

const emailButton = {
  padding: "12px 18px",
  borderRadius: 10,
  border: "1px solid #ff45d8",
  background: "#22001a",
  color: "#ff45d8",
  fontWeight: "bold",
  cursor: "pointer",
};

const backButton = {
  background: "none",
  border: "none",
  color: "#00d9ff",
  cursor: "pointer",
  fontSize: 16,
  padding: 0,
  marginBottom: 20,
};