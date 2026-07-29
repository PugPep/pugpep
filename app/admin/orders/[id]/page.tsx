"use client";

import emailjs from "emailjs-com";
import { Html5QrcodeScanner } from "html5-qrcode";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../../../lib/supabaseClient";

const EMAILJS_SERVICE_ID = "service_quxnkin";
const EMAILJS_PUBLIC_KEY = "yc_0cE0Mcl3tfzc11";
const SHIPPING_TEMPLATE_ID = "template_piq2u0f";

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const supabase = useMemo(() => createClient(), []);

  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [shippingStatus, setShippingStatus] = useState("not shipped");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [shippingCost, setShippingCost] = useState(0);
  const [packagingCost, setPackagingCost] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savingCosts, setSavingCosts] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  useEffect(() => {
    if (id) loadOrder();
  }, [id]);

  async function loadOrder() {
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .single();

    if (orderError) return alert(orderError.message);

    const { data: itemData, error: itemError } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", orderData.id)
      .order("id", { ascending: true });

    if (itemError) return alert(itemError.message);

    setOrder(orderData);
    setItems(itemData || []);
    setShippingStatus(orderData.shipping_status || "not shipped");
    setTrackingNumber(orderData.tracking_number || "");
    setShippingCost(Number(orderData.estimated_shipping_cost || 0));
    setPackagingCost(Number(orderData.estimated_packaging_cost || 0));
  }

  async function saveShippingInfo() {
    setSaving(true);
    const { error } = await supabase
      .from("orders")
      .update({ shipping_status: shippingStatus, tracking_number: trackingNumber })
      .eq("id", id);
    setSaving(false);
    if (error) return alert(error.message);
    alert("Shipping information saved.");
    await loadOrder();
  }

  async function saveOperatingCosts() {
    if (!order) return;
    setSavingCosts(true);

    const productCostTotal = Number(order.product_cost_total || 0);
    const netRevenue = Number(order.net_revenue ?? order.total ?? 0);
    const estimatedProfit = netRevenue - productCostTotal - shippingCost - packagingCost;
    const profitMarginPercent = netRevenue > 0 ? (estimatedProfit / netRevenue) * 100 : 0;

    const { error } = await supabase
      .from("orders")
      .update({
        estimated_shipping_cost: shippingCost,
        estimated_packaging_cost: packagingCost,
        estimated_profit: estimatedProfit,
        profit_margin_percent: profitMarginPercent,
      })
      .eq("id", id);

    setSavingCosts(false);
    if (error) return alert(error.message);
    alert("Costs and profit updated.");
    await loadOrder();
  }

  function formatPhoneNumber(phone: string) {
    const digits = String(phone || "").replace(/\D/g, "");
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
    return phone;
  }

  async function notifyCustomer() {
    if (!order) return;
    if (!trackingNumber) return alert("Please scan or enter a tracking number before notifying the customer.");

    setSendingEmail(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ shipping_status: "shipped", tracking_number: trackingNumber })
        .eq("id", id);

      if (error) throw error;
      setShippingStatus("shipped");

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
            price: Number(item.line_revenue ?? item.price ?? 0).toFixed(2),
          })),
        },
        EMAILJS_PUBLIC_KEY
      );

      const smsRes = await fetch("/api/send-shipping-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerPhone: formatPhoneNumber(order.customer_phone),
          orderNumber: order.order_number,
          shippingStatus: "shipped",
          trackingNumber,
        }),
      });

      const smsData = await smsRes.json();
      if (!smsData.success) return alert("Email sent, but text failed: " + (smsData.error || "SMS failed."));

      alert("Customer notified by email and text.");
      await loadOrder();
    } catch (error) {
      console.error(error);
      alert("Customer notification failed.");
    } finally {
      setSendingEmail(false);
    }
  }

  function startScanner() {
    setScannerOpen(true);
    setTimeout(() => {
      const scanner = new Html5QrcodeScanner(
        "tracking-scanner",
        { fps: 10, qrbox: { width: 250, height: 250 } },
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

  if (!order) return <main style={page}>Loading order...</main>;

  const netRevenue = Number(order.net_revenue ?? order.total ?? 0);
  const productCostTotal = Number(order.product_cost_total || 0);
  const estimatedProfit = Number(order.estimated_profit || 0);
  const profitMargin = Number(order.profit_margin_percent || 0);

  return (
    <main style={page}>
      <button onClick={() => router.push("/admin")} style={backButton}>← Back to Orders</button>
      <h1 style={{ color: "#ff45d8" }}>Order {order.order_number}</h1>
      <p style={{ color: "#ccc" }}><strong>Order Date:</strong> {new Date(order.created_at).toLocaleString()}</p>
      <p style={{ color: "#888" }}>Order Row ID: {order.id}</p>

      <div style={summaryGrid}>
        <Metric label="Net Revenue" value={`$${netRevenue.toFixed(2)}`} />
        <Metric label="Product Cost" value={`$${productCostTotal.toFixed(2)}`} />
        <Metric label="Profit" value={`$${estimatedProfit.toFixed(2)}`} accent={estimatedProfit >= 0 ? "#00ff99" : "#ff4d4d"} />
        <Metric label="Margin" value={`${profitMargin.toFixed(1)}%`} />
      </div>

      <section style={box}>
        <h2 style={heading}>Customer</h2>
        <p><strong>Organization:</strong> {order.customer_organization || "-"}</p>
        <p><strong>Name:</strong> {order.customer_name}</p>
        <p><strong>Email:</strong> {order.customer_email}</p>
        <p><strong>Phone:</strong> {order.customer_phone || "Not provided"}</p>
        <p><strong>VIP at Purchase:</strong> {order.vip_tier_at_purchase || "-"}</p>
        <p><strong>Lifetime Spend Before:</strong> ${Number(order.lifetime_spend_before || 0).toFixed(2)}</p>
        <p><strong>Lifetime Spend After:</strong> ${Number(order.lifetime_spend_after || 0).toFixed(2)}</p>
        {order.has_lifetime_free_shipping && <p style={{ color: "#00ff99", fontWeight: "bold" }}>🚚 Lifetime Free Shipping Member</p>}
      </section>

      <section style={box}>
        <h2 style={heading}>Shipping Address</h2>
        <p>{order.shipping_address}</p>
        <p>{order.city}, {order.state} {order.zip}</p>
      </section>

      <section style={box}>
        <h2 style={heading}>Order Contents</h2>
        {items.length === 0 ? <p style={{ color: "#ffcc00" }}>No order items found.</p> : items.map((item) => {
          const quantity = Number(item.quantity || 1);
          const regular = Number(item.regular_unit_price ?? item.sale_unit_price ?? 0);
          const sale = Number(item.sale_unit_price ?? regular);
          const revenue = Number(item.line_revenue ?? item.price ?? 0);
          const cost = Number(item.line_cost ?? Number(item.cost || 0) * quantity);
          const profit = Number(item.line_profit ?? revenue - cost);

          return (
            <div key={item.id} style={itemCard}>
              <div style={itemHeader}>
                <strong style={{ color: "#ff45d8", fontSize: 18 }}>{item.product_name || "Product"}</strong>
                {item.was_on_sale && <span style={saleBadge}>SALE {Number(item.sale_percent || 0)}% OFF</span>}
                {item.was_pre_sale && <span style={presaleBadge}>PRE-SALE</span>}
              </div>
              <div style={itemGrid}>
                <span><strong>Dosage:</strong> {item.dosage || "-"}</span>
                <span><strong>Type:</strong> {item.purchase_type || "-"}</span>
                <span><strong>Quantity:</strong> {quantity}</span>
                <span><strong>Regular Unit:</strong> ${regular.toFixed(2)}</span>
                <span><strong>Sale Unit:</strong> ${sale.toFixed(2)}</span>
                <span><strong>Unit Cost:</strong> ${Number(item.cost || 0).toFixed(2)}</span>
                <span><strong>Line Revenue:</strong> ${revenue.toFixed(2)}</span>
                <span><strong>Line Cost:</strong> ${cost.toFixed(2)}</span>
                <span style={{ color: profit >= 0 ? "#00ff99" : "#ff4d4d" }}><strong>Line Profit:</strong> ${profit.toFixed(2)}</span>
                <span><strong>Status at Purchase:</strong> {item.inventory_status || "-"}</span>
              </div>
            </div>
          );
        })}
      </section>

      <section style={box}>
        <h2 style={heading}>Totals and Discounts</h2>
        <p>Subtotal: ${Number(order.subtotal || 0).toFixed(2)}</p>
        <p>Gross Revenue: ${Number(order.gross_revenue || 0).toFixed(2)}</p>
        <p>Promo Code: <strong style={{ color: "#00ff99" }}>{order.promo_code || "None"}</strong></p>
        <p>Promo Type: {order.promo_discount_type || "-"}</p>
        <p>Promo Value: {order.promo_discount_type === "percent" ? `${Number(order.promo_discount_value || 0)}%` : `$${Number(order.promo_discount_value || 0).toFixed(2)}`}</p>
        <p>Promo Discount: -${Number(order.promo_discount || 0).toFixed(2)}</p>
        <p>Rewards Points Used: {Number(order.reward_points_used || 0)}</p>
        <p>Rewards Discount: -${Number(order.reward_discount || 0).toFixed(2)}</p>
        <p>Rewards Points Earned: {Number(order.rewards_points_earned || 0)}</p>
        <p>Total Discount: -${Number(order.total_discount || 0).toFixed(2)}</p>
        <p>Shipping Charged: ${Number(order.shipping || 0).toFixed(2)}</p>
        <h2>Total Paid: ${Number(order.total || 0).toFixed(2)}</h2>
        <p><strong>Payment Method:</strong> {order.payment_method || "Not recorded"}</p>
        <p><strong>Payment Status:</strong> {order.status}</p>
      </section>

      <section style={box}>
        <h2 style={heading}>Operating Costs and Profit</h2>
        <label style={label}>Actual / Estimated Shipping Cost</label>
        <input type="number" min="0" step="0.01" value={shippingCost} onChange={(e) => setShippingCost(Math.max(0, Number(e.target.value)))} style={input} />
        <label style={label}>Packaging Cost</label>
        <input type="number" min="0" step="0.01" value={packagingCost} onChange={(e) => setPackagingCost(Math.max(0, Number(e.target.value)))} style={input} />
        <p style={{ color: "#ccc" }}>New projected profit: ${(netRevenue - productCostTotal - shippingCost - packagingCost).toFixed(2)}</p>
        <button onClick={saveOperatingCosts} style={button}>{savingCosts ? "Saving..." : "Save Costs & Recalculate Profit"}</button>
      </section>

      <section style={box}>
        <h2 style={heading}>Shipping Status</h2>
        <label style={label}>Shipping Status</label>
        <select value={shippingStatus} onChange={(e) => setShippingStatus(e.target.value)} style={input}>
          <option value="not shipped">not shipped</option>
          <option value="processing">processing</option>
          <option value="shipped">shipped</option>
          <option value="delivered">delivered</option>
        </select>
        <label style={label}>Tracking Number</label>
        <input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="Enter tracking number" style={input} />
        {!trackingNumber && <p style={{ color: "#ffcc00" }}>Scan or enter a tracking number before notifying the customer.</p>}
        <div style={actionRow}>
          <button onClick={saveShippingInfo} style={button}>{saving ? "Saving..." : "Save Shipping"}</button>
          <button onClick={startScanner} style={button}>Scan Label</button>
          <button onClick={notifyCustomer} disabled={!trackingNumber || sendingEmail} style={{ ...emailButton, opacity: !trackingNumber || sendingEmail ? 0.5 : 1, cursor: !trackingNumber || sendingEmail ? "not-allowed" : "pointer" }}>{sendingEmail ? "Notifying..." : "Notify & Mark Shipped"}</button>
        </div>
        {scannerOpen && <div style={scannerBox}><h3 style={{ color: "#00d9ff" }}>Scan Shipping Label</h3><div id="tracking-scanner" /></div>}
      </section>
    </main>
  );
}

function Metric({ label: metricLabel, value, accent = "#00d9ff" }: { label: string; value: string; accent?: string }) {
  return <div style={metricCard}><span style={{ color: "#aaa", fontSize: 13 }}>{metricLabel}</span><strong style={{ color: accent, fontSize: 23 }}>{value}</strong></div>;
}

const page = { padding: 30, color: "#fff", background: "#000", minHeight: "100vh" };
const heading = { color: "#00d9ff" };
const box = { marginTop: 20, padding: 20, border: "1px solid #333", borderRadius: 12, background: "#111" };
const summaryGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14, marginTop: 20 };
const metricCard = { padding: 16, border: "1px solid #333", borderRadius: 12, background: "#111", display: "grid", gap: 7 };
const itemCard = { padding: 16, marginBottom: 14, border: "1px solid #333", borderRadius: 10, background: "#080808" };
const itemHeader = { display: "flex", gap: 10, flexWrap: "wrap" as const, alignItems: "center", marginBottom: 14 };
const itemGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 };
const saleBadge = { padding: "4px 8px", borderRadius: 999, background: "rgba(0,255,153,.12)", color: "#00ff99", fontSize: 12, fontWeight: "bold" };
const presaleBadge = { padding: "4px 8px", borderRadius: 999, background: "rgba(255,191,0,.12)", color: "#ffcc00", fontSize: 12, fontWeight: "bold" };
const label = { display: "block", marginTop: 12, marginBottom: 6, color: "#ccc" };
const input = { width: "100%", boxSizing: "border-box" as const, padding: 12, background: "#050505", color: "#fff", border: "1px solid #333", borderRadius: 8 };
const actionRow = { display: "flex", gap: 12, marginTop: 18, flexWrap: "wrap" as const };
const button = { padding: "12px 18px", borderRadius: 10, border: "1px solid #00d9ff", background: "#001b22", color: "#00d9ff", fontWeight: "bold", cursor: "pointer" };
const emailButton = { padding: "12px 18px", borderRadius: 10, border: "1px solid #ff45d8", background: "#22001a", color: "#ff45d8", fontWeight: "bold" };
const backButton = { background: "none", border: "none", color: "#00d9ff", cursor: "pointer", fontSize: 16, padding: 0, marginBottom: 20 };
const scannerBox = { marginTop: 20, padding: 20, border: "1px solid #333", borderRadius: 12, background: "#050505" };