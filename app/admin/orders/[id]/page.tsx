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

  if (!order) {
    return (
      <main style={page}>
        <div style={loadingCard}>
          <div style={loadingRing} />
          <h1 style={pageTitle}>Loading Order</h1>
          <p style={muted}>Preparing the order workspace...</p>
        </div>
      </main>
    );
  }

  const netRevenue = Number(order.net_revenue ?? order.total ?? 0);
  const productCostTotal = Number(order.product_cost_total || 0);
  const estimatedProfit = Number(order.estimated_profit || 0);
  const profitMargin = Number(order.profit_margin_percent || 0);

  return (
    <main style={page}>
      <div style={container}>
        <header style={header}>
          <div>
            <button
              onClick={() => router.push("/admin")}
              style={backButton}
            >
              ← Back to Orders
            </button>

            <p style={eyebrow}>RESEARCH ORDER</p>

            <h1 style={pageTitle}>
              {order.order_number}
            </h1>

            <p style={subtitle}>
              {new Date(order.created_at).toLocaleString()}
            </p>
          </div>

          <div style={statusStack}>
            <span style={paymentBadge}>
              {(order.status || "pending").toUpperCase()}
            </span>

            <span style={deliveryBadge}>
              {(shippingStatus || "not shipped").toUpperCase()}
            </span>
          </div>
        </header>

        <div style={summaryGrid}>
          <Metric
            label="Net Revenue"
            value={`$${netRevenue.toFixed(2)}`}
            accent="#00d9ff"
          />

          <Metric
            label="Product Cost"
            value={`$${productCostTotal.toFixed(2)}`}
            accent="#ffcc66"
          />

          <Metric
            label="Estimated Profit"
            value={`$${estimatedProfit.toFixed(2)}`}
            accent={
              estimatedProfit >= 0
                ? "#00ff99"
                : "#ff6f6f"
            }
          />

          <Metric
            label="Profit Margin"
            value={`${profitMargin.toFixed(1)}%`}
            accent={
              profitMargin >= 15
                ? "#00ff99"
                : "#ffcc66"
            }
          />
        </div>

        <div className="order-layout" style={layout}>
          <section style={stack}>
            <section style={card}>
              <SectionHeader
                eyebrow="CUSTOMER"
                title="Customer Details"
              />

              <InfoGrid>
                <Info label="Organization" value={order.customer_organization || "-"} />
                <Info label="Name" value={order.customer_name || "-"} />
                <Info label="Email" value={order.customer_email || "-"} />
                <Info label="Phone" value={order.customer_phone || "Not provided"} />
                <Info label="VIP at Purchase" value={order.vip_tier_at_purchase || "-"} />
                <Info label="Lifetime Spend Before" value={`$${Number(order.lifetime_spend_before || 0).toFixed(2)}`} />
                <Info label="Lifetime Spend After" value={`$${Number(order.lifetime_spend_after || 0).toFixed(2)}`} />
              </InfoGrid>

              {order.has_lifetime_free_shipping && (
                <div style={successNotice}>
                  Lifetime Free Delivery Member
                </div>
              )}
            </section>

            <section style={card}>
              <SectionHeader
                eyebrow="DELIVERY"
                title="Delivery Address"
              />

              <p style={addressText}>
                {order.shipping_address}
                <br />
                {order.city}, {order.state} {order.zip}
              </p>
            </section>

            <section style={card}>
              <SectionHeader
                eyebrow="CONTENTS"
                title="Order Contents"
              />

              {items.length === 0 ? (
                <p style={warningText}>
                  No order items found.
                </p>
              ) : (
                <div style={itemList}>
                  {items.map((item) => {
                    const quantity = Number(item.quantity || 1);
                    const regular = Number(item.regular_unit_price ?? item.sale_unit_price ?? 0);
                    const sale = Number(item.sale_unit_price ?? regular);
                    const revenue = Number(item.line_revenue ?? item.price ?? 0);
                    const cost = Number(item.line_cost ?? Number(item.cost || 0) * quantity);
                    const profit = Number(item.line_profit ?? revenue - cost);

                    return (
                      <article key={item.id} style={itemCard}>
                        <div style={itemHeader}>
                          <div>
                            <strong style={itemTitle}>
                              {item.product_name || "Product"}
                            </strong>

                            <p style={itemSubline}>
                              {item.dosage || "-"} · {item.purchase_type || "-"} · Qty {quantity}
                            </p>
                          </div>

                          <div style={badgeRow}>
                            {item.was_on_sale && (
                              <span style={saleBadge}>
                                SALE {Number(item.sale_percent || 0)}% OFF
                              </span>
                            )}

                            {item.was_pre_sale && (
                              <span style={presaleBadge}>
                                PRE-SALE
                              </span>
                            )}
                          </div>
                        </div>

                        <InfoGrid>
                          <Info label="Regular Unit" value={`$${regular.toFixed(2)}`} />
                          <Info label="Sale Unit" value={`$${sale.toFixed(2)}`} />
                          <Info label="Unit Cost" value={`$${Number(item.cost || 0).toFixed(2)}`} />
                          <Info label="Line Revenue" value={`$${revenue.toFixed(2)}`} />
                          <Info label="Line Cost" value={`$${cost.toFixed(2)}`} />
                          <Info
                            label="Line Profit"
                            value={`$${profit.toFixed(2)}`}
                            accent={profit >= 0 ? "#00ff99" : "#ff6f6f"}
                          />
                          <Info label="Inventory Status" value={item.inventory_status || "-"} />
                        </InfoGrid>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section style={card}>
              <SectionHeader
                eyebrow="PRICING"
                title="Totals and Discounts"
              />

              <InfoGrid>
                <Info label="Subtotal" value={`$${Number(order.subtotal || 0).toFixed(2)}`} />
                <Info label="Gross Revenue" value={`$${Number(order.gross_revenue || 0).toFixed(2)}`} />
                <Info label="Promo Code" value={order.promo_code || "None"} accent="#00ff99" />
                <Info label="Promo Type" value={order.promo_discount_type || "-"} />
                <Info
                  label="Promo Value"
                  value={
                    order.promo_discount_type === "percent"
                      ? `${Number(order.promo_discount_value || 0)}%`
                      : `$${Number(order.promo_discount_value || 0).toFixed(2)}`
                  }
                />
                <Info label="Promo Discount" value={`-$${Number(order.promo_discount || 0).toFixed(2)}`} accent="#00ff99" />
                <Info label="PugPoints Used" value={String(Number(order.reward_points_used || 0))} />
                <Info label="PugPoints Discount" value={`-$${Number(order.reward_discount || 0).toFixed(2)}`} accent="#00ff99" />
                <Info label="PugPoints Earned" value={String(Number(order.rewards_points_earned || 0))} accent="#00ff99" />
                <Info label="Total Discount" value={`-$${Number(order.total_discount || 0).toFixed(2)}`} accent="#00ff99" />
                <Info label="Delivery Charged" value={`$${Number(order.shipping || 0).toFixed(2)}`} />
                <Info label="Payment Method" value={order.payment_method || "Not recorded"} />
              </InfoGrid>

              <div style={grandTotal}>
                <span>Total Paid</span>
                <strong>${Number(order.total || 0).toFixed(2)}</strong>
              </div>
            </section>
          </section>

          <aside className="order-actions" style={stack}>
            <section style={card}>
              <SectionHeader
                eyebrow="PROFIT"
                title="Operating Costs"
              />

              <label style={label}>Delivery Cost</label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={shippingCost}
                onChange={(event) =>
                  setShippingCost(
                    Math.max(0, Number(event.target.value))
                  )
                }
                style={input}
              />

              <label style={label}>Packaging Cost</label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={packagingCost}
                onChange={(event) =>
                  setPackagingCost(
                    Math.max(0, Number(event.target.value))
                  )
                }
                style={input}
              />

              <div style={projectedProfit}>
                <span>Projected Profit</span>
                <strong>
                  ${(netRevenue - productCostTotal - shippingCost - packagingCost).toFixed(2)}
                </strong>
              </div>

              <button
                onClick={saveOperatingCosts}
                disabled={savingCosts}
                style={primaryButton}
              >
                {savingCosts
                  ? "Saving..."
                  : "Save Costs & Recalculate"}
              </button>
            </section>

            <section style={card}>
              <SectionHeader
                eyebrow="DELIVERY"
                title="Delivery Status"
              />

              <label style={label}>Status</label>

              <select
                value={shippingStatus}
                onChange={(event) =>
                  setShippingStatus(event.target.value)
                }
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
                onChange={(event) =>
                  setTrackingNumber(event.target.value)
                }
                placeholder="Enter tracking number"
                style={input}
              />

              {!trackingNumber && (
                <p style={warningText}>
                  Scan or enter a tracking number before notifying the customer.
                </p>
              )}

              <div style={actionGrid}>
                <button
                  onClick={saveShippingInfo}
                  disabled={saving}
                  style={secondaryButton}
                >
                  {saving ? "Saving..." : "Save Delivery"}
                </button>

                <button
                  onClick={startScanner}
                  style={secondaryButton}
                >
                  Scan Label
                </button>

                <button
                  onClick={notifyCustomer}
                  disabled={!trackingNumber || sendingEmail}
                  style={{
                    ...notifyButton,
                    opacity:
                      !trackingNumber || sendingEmail
                        ? 0.5
                        : 1,
                    cursor:
                      !trackingNumber || sendingEmail
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  {sendingEmail
                    ? "Notifying..."
                    : "Notify & Mark Shipped"}
                </button>
              </div>

              {scannerOpen && (
                <div style={scannerBox}>
                  <h3 style={scannerTitle}>Scan Delivery Label</h3>
                  <div id="tracking-scanner" />
                </div>
              )}
            </section>

            <section style={card}>
              <SectionHeader
                eyebrow="SYSTEM"
                title="Order Record"
              />

              <InfoGrid>
                <Info label="Order Row ID" value={order.id} />
                <Info label="Payment Status" value={order.status || "-"} />
                <Info label="Delivery Status" value={shippingStatus} />
              </InfoGrid>
            </section>
          </aside>
        </div>

        <style jsx>{`
          @media (min-width: 981px) {
            .order-actions {
              position: sticky;
              top: 18px;
              align-self: start;
            }
          }

          @media (max-width: 980px) {
            .order-layout {
              grid-template-columns: minmax(0, 1fr) !important;
            }
          }
        `}</style>
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
  accent = "#00d9ff",
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div style={metricCard}>
      <span style={metricLabel}>{label}</span>
      <strong style={{ ...metricValue, color: accent }}>
        {value}
      </strong>
    </div>
  );
}

function SectionHeader({
  eyebrow: sectionEyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div style={sectionHeader}>
      <p style={sectionEyebrowStyle}>{sectionEyebrow}</p>
      <h2 style={sectionTitle}>{title}</h2>
    </div>
  );
}

function InfoGrid({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div style={infoGrid}>{children}</div>;
}

function Info({
  label: infoLabelText,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div style={infoCard}>
      <span style={infoLabel}>{infoLabelText}</span>
      <strong
        style={{
          ...infoValue,
          color: accent || "#ffffff",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

const page = {
  minHeight: "100vh",
  padding: "clamp(18px, 4vw, 34px)",
  background:
    "radial-gradient(circle at 12% 0%, rgba(255,47,208,.14), transparent 27%), radial-gradient(circle at 88% 4%, rgba(0,217,255,.14), transparent 30%), #000",
  color: "#ffffff",
};

const container = {
  width: "100%",
  maxWidth: 1320,
  margin: "0 auto",
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 18,
  flexWrap: "wrap" as const,
};

const backButton = {
  marginBottom: 16,
  padding: 0,
  border: 0,
  background: "transparent",
  color: "#7df9ff",
  cursor: "pointer",
  fontSize: 15,
  fontWeight: 800,
};

const eyebrow = {
  margin: 0,
  color: "#00d9ff",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: ".14em",
};

const pageTitle = {
  margin: "7px 0 0",
  color: "#ff45d8",
  fontSize: "clamp(34px, 6vw, 52px)",
  overflowWrap: "anywhere" as const,
};

const subtitle = {
  margin: "8px 0 0",
  color: "#9d9da6",
};

const statusStack = {
  display: "flex",
  gap: 9,
  flexWrap: "wrap" as const,
};

const paymentBadge = {
  padding: "7px 10px",
  border: "1px solid #ffcc00",
  borderRadius: 999,
  background: "rgba(255,204,0,.08)",
  color: "#ffcc00",
  fontSize: 11,
  fontWeight: 900,
};

const deliveryBadge = {
  padding: "7px 10px",
  border: "1px solid #00d9ff",
  borderRadius: 999,
  background: "rgba(0,217,255,.08)",
  color: "#7df9ff",
  fontSize: 11,
  fontWeight: 900,
};

const summaryGrid = {
  marginTop: 22,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 14,
};

const metricCard = {
  padding: 17,
  display: "grid",
  gap: 7,
  border: "1px solid rgba(255,255,255,.12)",
  borderRadius: 13,
  background: "linear-gradient(145deg, rgba(12,12,17,.97), rgba(6,6,9,.98))",
};

const metricLabel = {
  color: "#9b9ba4",
  fontSize: 12,
  fontWeight: 800,
  textTransform: "uppercase" as const,
};

const metricValue = {
  fontSize: 24,
};

const layout = {
  marginTop: 24,
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.2fr) minmax(350px, .8fr)",
  gap: 22,
  alignItems: "start",
};

const stack = {
  display: "grid",
  gap: 18,
};

const card = {
  padding: "clamp(18px, 3vw, 24px)",
  border: "1px solid rgba(0,217,255,.34)",
  borderRadius: 16,
  background:
    "linear-gradient(145deg, rgba(10,10,14,.97), rgba(16,8,17,.95))",
  boxShadow: "0 0 18px rgba(0,217,255,.07)",
};

const sectionHeader = {
  marginBottom: 16,
};

const sectionEyebrowStyle = {
  margin: 0,
  color: "#ff45d8",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: ".13em",
};

const sectionTitle = {
  margin: "5px 0 0",
  color: "#7df9ff",
  fontSize: 24,
};

const infoGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 10,
};

const infoCard = {
  minWidth: 0,
  padding: 12,
  display: "grid",
  gap: 5,
  border: "1px solid rgba(255,255,255,.10)",
  borderRadius: 10,
  background: "rgba(0,0,0,.24)",
};

const infoLabel = {
  color: "#8f8f98",
  fontSize: 10,
  fontWeight: 900,
  textTransform: "uppercase" as const,
};

const infoValue = {
  fontSize: 14,
  overflowWrap: "anywhere" as const,
};

const successNotice = {
  marginTop: 14,
  padding: "11px 13px",
  border: "1px solid rgba(0,255,153,.46)",
  borderRadius: 10,
  background: "rgba(0,255,153,.08)",
  color: "#00ff99",
  fontWeight: 900,
};

const addressText = {
  margin: 0,
  color: "#d0d0d6",
  lineHeight: 1.7,
};

const itemList = {
  display: "grid",
  gap: 12,
};

const itemCard = {
  padding: 15,
  border: "1px solid rgba(255,255,255,.11)",
  borderRadius: 12,
  background: "rgba(0,0,0,.25)",
};

const itemHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  flexWrap: "wrap" as const,
  marginBottom: 14,
};

const itemTitle = {
  color: "#ff75df",
  fontSize: 18,
};

const itemSubline = {
  margin: "5px 0 0",
  color: "#9e9ea7",
  fontSize: 13,
};

const badgeRow = {
  display: "flex",
  gap: 7,
  flexWrap: "wrap" as const,
};

const saleBadge = {
  padding: "5px 8px",
  borderRadius: 999,
  background: "rgba(0,255,153,.10)",
  color: "#00ff99",
  border: "1px solid rgba(0,255,153,.42)",
  fontSize: 10,
  fontWeight: 900,
};

const presaleBadge = {
  padding: "5px 8px",
  borderRadius: 999,
  background: "rgba(255,191,0,.10)",
  color: "#ffcc00",
  border: "1px solid rgba(255,191,0,.42)",
  fontSize: 10,
  fontWeight: 900,
};

const grandTotal = {
  minHeight: 68,
  marginTop: 15,
  padding: "0 15px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  border: "1px solid rgba(0,255,153,.45)",
  borderRadius: 12,
  background: "rgba(0,255,153,.07)",
  fontSize: 22,
};

const label = {
  display: "block",
  marginTop: 12,
  marginBottom: 6,
  color: "#c8c8cf",
  fontWeight: 800,
};

const input = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: 12,
  background: "#050505",
  color: "#fff",
  border: "1px solid rgba(0,217,255,.28)",
  borderRadius: 9,
};

const projectedProfit = {
  minHeight: 60,
  marginTop: 15,
  padding: "0 14px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  border: "1px solid rgba(0,255,153,.36)",
  borderRadius: 10,
  background: "rgba(0,255,153,.06)",
  color: "#00ff99",
};

const primaryButton = {
  width: "100%",
  minHeight: 48,
  marginTop: 14,
  border: "1px solid #45d97a",
  borderRadius: 10,
  background: "linear-gradient(180deg, #2eea6f, #19b857)",
  color: "#fff",
  fontWeight: 900,
  cursor: "pointer",
};

const secondaryButton = {
  minHeight: 44,
  border: "1px solid #00d9ff",
  borderRadius: 9,
  background: "rgba(0,217,255,.07)",
  color: "#7df9ff",
  fontWeight: 900,
  cursor: "pointer",
};

const notifyButton = {
  minHeight: 48,
  border: "1px solid #ff45d8",
  borderRadius: 9,
  background: "rgba(255,69,216,.08)",
  color: "#ff75df",
  fontWeight: 900,
};

const actionGrid = {
  marginTop: 16,
  display: "grid",
  gap: 9,
};

const scannerBox = {
  marginTop: 16,
  padding: 15,
  border: "1px solid rgba(0,217,255,.28)",
  borderRadius: 11,
  background: "#050505",
};

const scannerTitle = {
  marginTop: 0,
  color: "#00d9ff",
};

const warningText = {
  color: "#ffcc66",
  lineHeight: 1.55,
};

const muted = {
  color: "#999",
};

const loadingCard = {
  maxWidth: 520,
  margin: "12vh auto 0",
  padding: 32,
  display: "grid",
  justifyItems: "center",
  gap: 12,
  textAlign: "center" as const,
  border: "1px solid rgba(0,217,255,.35)",
  borderRadius: 16,
  background: "rgba(8,8,12,.92)",
};

const loadingRing = {
  width: 44,
  height: 44,
  border: "4px solid rgba(0,217,255,.18)",
  borderTopColor: "#ff45d8",
  borderRadius: 999,
};