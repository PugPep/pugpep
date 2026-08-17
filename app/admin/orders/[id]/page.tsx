"use client";

import emailjs from "emailjs-com";
import { Html5QrcodeScanner } from "html5-qrcode";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../../../lib/supabaseClient";

const EMAILJS_SERVICE_ID = "service_quxnkin";
const EMAILJS_PUBLIC_KEY = "yc_0cE0Mcl3tfzc11";
const SHIPPING_TEMPLATE_ID = "template_piq2u0f";


type EditableOrderItem = {
  id: string;
  product_option_id?: string | null;
  product_slug?: string | null;
  product_name: string;
  dosage: string;
  purchase_type: string;
  quantity: number;
  regular_unit_price: number;
  actual_unit_price: number;
  unit_cost: number;
  was_on_sale: boolean;
  sale_percent: number;
  is_new?: boolean;
};

type CatalogOption = {
  id: string;
  product_slug: string;
  product_name: string;
  dosage: string;
  purchase_type: string;
  price: number;
  cost: number;
  sale_active: boolean;
  sale_percent: number;
  status: string | null;
};

function safeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function money(value: unknown) {
  return `$${safeNumber(value).toFixed(2)}`;
}

function points(value: unknown) {
  return safeNumber(value).toFixed(2);
}

function getVipTier(lifetimeSpend: number) {
  if (lifetimeSpend >= 50000) return "Diamond";
  if (lifetimeSpend >= 35000) return "Ruby";
  if (lifetimeSpend >= 20000) return "Sapphire";
  if (lifetimeSpend >= 10000) return "Emerald";
  if (lifetimeSpend >= 5000) return "Platinum";
  if (lifetimeSpend >= 2500) return "Gold";
  if (lifetimeSpend >= 1000) return "Silver";
  if (lifetimeSpend >= 500) return "Bronze";
  if (lifetimeSpend >= 250) return "Iron";
  return "Stone";
}

function toEditableOrderItem(item: any): EditableOrderItem {
  const quantity = Math.max(1, Math.floor(safeNumber(item.quantity, 1)));

  const regular = Math.max(
    0,
    safeNumber(
      item.regular_unit_price ??
        item.sale_unit_price ??
        item.actual_unit_price ??
        0
    )
  );

  const actual = Math.max(
    0,
    safeNumber(
      item.actual_unit_price ??
        item.sale_unit_price ??
        regular
    )
  );

  return {
    id: String(item.id),
    product_option_id: item.product_option_id ? String(item.product_option_id) : null,
    product_slug: item.product_slug ? String(item.product_slug) : null,
    product_name: String(item.product_name || "Product"),
    dosage: String(item.dosage || ""),
    purchase_type: String(item.purchase_type || ""),
    quantity,
    regular_unit_price: regular,
    actual_unit_price: actual,
    unit_cost: Math.max(0, safeNumber(item.cost, 0)),
    was_on_sale: Boolean(item.was_on_sale),
    sale_percent: Math.min(
      100,
      Math.max(0, safeNumber(item.sale_percent, 0))
    ),
  };
}

function getErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return error instanceof Error
    ? error.message
    : "The order could not be updated.";
}

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


  const [editingOrder, setEditingOrder] = useState(false);
  const [draftItems, setDraftItems] = useState<EditableOrderItem[]>([]);
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [netRevenueOverride, setNetRevenueOverride] = useState("");
  const [savingAdjustment, setSavingAdjustment] = useState(false);
  const [adjustmentNotice, setAdjustmentNotice] = useState("");
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [customerProfile, setCustomerProfile] = useState<any>(null);
  const [catalogOptions, setCatalogOptions] = useState<CatalogOption[]>([]);
  const [selectedCatalogOptionId, setSelectedCatalogOptionId] = useState("");
  const [addQuantity, setAddQuantity] = useState(1);
  const [netRevenueManuallyEdited, setNetRevenueManuallyEdited] = useState(false);

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

    const { data: adjustmentData, error: adjustmentError } = await supabase
      .from("order_manual_adjustments")
      .select(
        "id,adjusted_at,adjusted_by_email,reason,merchandise_revenue_before,merchandise_revenue_after,customer_total_before,customer_total_after,profit_before,profit_after,reward_points_earned_before,reward_points_earned_after,reward_balance_adjustment,lifetime_spend_before_adjustment,lifetime_spend_after_adjustment,vip_tier_before,vip_tier_after"
      )
      .eq("order_id", orderData.id)
      .order("adjusted_at", { ascending: false })
      .limit(10);

    if (adjustmentError && adjustmentError.code !== "42P01") {
      console.error("Unable to load manual adjustment history:", adjustmentError);
    }

    let profileData: any = null;

    if (orderData.user_id) {
      const { data: loadedProfile, error: profileError } = await supabase
        .from("customer_profiles")
        .select("id,reward_points,lifetime_spend,vip_tier")
        .eq("id", orderData.user_id)
        .maybeSingle();

      if (profileError) {
        console.error("Unable to load customer rewards profile:", profileError);
      } else {
        profileData = loadedProfile;
      }
    }

    const { data: productRows, error: productError } = await supabase
      .from("products")
      .select("slug,name")
      .is("deleted_at", null);

    if (productError) {
      console.error("Unable to load product catalog:", productError);
    }

    const productNameBySlug = new Map(
      (productRows || []).map((product: any) => [
        String(product.slug),
        String(product.name || product.slug),
      ])
    );

    const { data: optionRows, error: optionError } = await supabase
      .from("product_options")
      .select("id,product_slug,dosage,purchase_type,price,cost,sale_active,sale_percent,status,is_active,archived_at")
      .eq("is_active", true)
      .is("archived_at", null)
      .order("product_slug", { ascending: true })
      .order("dosage", { ascending: true });

    if (optionError) {
      console.error("Unable to load product options:", optionError);
    } else {
      setCatalogOptions(
        (optionRows || []).map((option: any) => ({
          id: String(option.id),
          product_slug: String(option.product_slug || ""),
          product_name:
            productNameBySlug.get(String(option.product_slug || "")) ||
            String(option.product_slug || "Product"),
          dosage: String(option.dosage || ""),
          purchase_type: String(option.purchase_type || ""),
          price: Math.max(0, safeNumber(option.price)),
          cost: Math.max(0, safeNumber(option.cost)),
          sale_active: Boolean(option.sale_active),
          sale_percent: Math.min(100, Math.max(0, safeNumber(option.sale_percent))),
          status: option.status ? String(option.status) : null,
        }))
      );
    }

    setOrder(orderData);
    setItems(itemData || []);
    setAdjustments(adjustmentData || []);
    setCustomerProfile(profileData);

    if (!editingOrder) {
      setDraftItems((itemData || []).map(toEditableOrderItem));
    }

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
    const otherDirectCost = Number(order.other_direct_cost || 0);
    const commissionAmount = Number(order.commission_amount || 0);

    const estimatedProfit =
      netRevenue -
      productCostTotal -
      shippingCost -
      packagingCost -
      otherDirectCost -
      commissionAmount;

    const profitMarginPercent =
      netRevenue > 0 ? (estimatedProfit / netRevenue) * 100 : 0;

    const { error } = await supabase
      .from("orders")
      .update({
        estimated_shipping_cost: shippingCost,
        estimated_packaging_cost: packagingCost,
        actual_shipping_cost: shippingCost,
        actual_packaging_cost: packagingCost,
        estimated_profit: estimatedProfit,
        profit_margin_percent: profitMarginPercent,
      })
      .eq("id", id);

    setSavingCosts(false);
    if (error) return alert(error.message);
    alert("Costs and profit updated.");
    await loadOrder();
  }

  function startOrderEdit() {
    setDraftItems(items.map(toEditableOrderItem));
    setAdjustmentReason("");
    setNetRevenueOverride(
      Number(order?.net_revenue ?? order?.total ?? 0).toFixed(2)
    );
    setAdjustmentNotice("");
    setSelectedCatalogOptionId("");
    setAddQuantity(1);
    setNetRevenueManuallyEdited(false);
    setEditingOrder(true);
  }

  function cancelOrderEdit() {
    setDraftItems(items.map(toEditableOrderItem));
    setAdjustmentReason("");
    setNetRevenueOverride("");
    setAdjustmentNotice("");
    setSelectedCatalogOptionId("");
    setAddQuantity(1);
    setNetRevenueManuallyEdited(false);
    setEditingOrder(false);
  }

  function removeDraftItem(itemId: string) {
    setDraftItems((current) => current.filter((item) => item.id !== itemId));
  }

  function addSelectedProductToDraft() {
    const option = catalogOptions.find(
      (catalogOption) => catalogOption.id === selectedCatalogOptionId
    );

    if (!option) {
      setAdjustmentNotice("Select a product option to add.");
      return;
    }

    const quantity = Math.max(1, Math.floor(addQuantity || 1));
    const existing = draftItems.find(
      (item) => item.product_option_id === option.id
    );

    if (existing) {
      updateDraftItem(existing.id, {
        quantity: existing.quantity + quantity,
      });
      setAdjustmentNotice(
        `${option.product_name} ${option.dosage} was already on the order, so its quantity was increased.`
      );
      setSelectedCatalogOptionId("");
      setAddQuantity(1);
      return;
    }

    const manualSale =
      option.sale_active && option.sale_percent > 0;

    const actualPrice = manualSale
      ? Number(
          (
            option.price *
            (1 - option.sale_percent / 100)
          ).toFixed(2)
        )
      : option.price;

    const tempId = `new-${option.id}-${Date.now()}`;

    setDraftItems((current) => [
      ...current,
      {
        id: tempId,
        product_option_id: option.id,
        product_slug: option.product_slug,
        product_name: option.product_name,
        dosage: option.dosage,
        purchase_type: option.purchase_type,
        quantity,
        regular_unit_price: option.price,
        actual_unit_price: actualPrice,
        unit_cost: option.cost,
        was_on_sale: manualSale,
        sale_percent: manualSale ? option.sale_percent : 0,
        is_new: true,
      },
    ]);

    setSelectedCatalogOptionId("");
    setAddQuantity(1);
    setAdjustmentNotice(
      `${option.product_name} ${option.dosage} added to the draft. Review the price before saving.`
    );
  }

  function updateDraftItem(
    itemId: string,
    patch: Partial<EditableOrderItem>
  ) {
    setDraftItems((current) =>
      current.map((item) =>
        item.id === itemId ? { ...item, ...patch } : item
      )
    );
  }

  function applySalePercent(itemId: string, rawPercent: number) {
    setDraftItems((current) =>
      current.map((item) => {
        if (item.id !== itemId) return item;

        const percent = Math.min(100, Math.max(0, rawPercent));
        const actual =
          percent > 0
            ? Number(
                (
                  item.regular_unit_price *
                  (1 - percent / 100)
                ).toFixed(2)
              )
            : item.regular_unit_price;

        return {
          ...item,
          was_on_sale: percent > 0,
          sale_percent: percent,
          actual_unit_price: actual,
        };
      })
    );
  }

  async function saveManualCorrection() {
    if (!order || savingAdjustment) return;

    const reason = adjustmentReason.trim();

    if (!reason) {
      setAdjustmentNotice(
        "Enter a reason for this manual correction."
      );
      return;
    }

    if (draftItems.length === 0) {
      setAdjustmentNotice("An order must contain at least one product.");
      return;
    }

    for (const item of draftItems) {
      if (
        item.quantity < 1 ||
        item.regular_unit_price < 0 ||
        item.actual_unit_price < 0 ||
        item.unit_cost < 0
      ) {
        setAdjustmentNotice(
          "Quantity must be at least 1 and prices/costs cannot be negative."
        );
        return;
      }

      if (
        item.was_on_sale &&
        item.actual_unit_price > item.regular_unit_price
      ) {
        setAdjustmentNotice(
          `${item.product_name}: sale price cannot be higher than regular price.`
        );
        return;
      }
    }

    const confirmed = window.confirm(
      `Save this manual correction to order ${order.order_number}?\\n\\n` +
        "This will update the historical order-item pricing snapshot, " +
        "recalculate totals, profit, PugPoints, lifetime spend, VIP status, " +
        "and create an audit record."
    );

    if (!confirmed) return;

    setSavingAdjustment(true);
    setAdjustmentNotice("");

    try {
      const payload = draftItems.map((item) => ({
        id: item.is_new ? null : item.id,
        product_option_id: item.product_option_id || null,
        quantity: Math.max(1, Math.floor(item.quantity)),
        regular_unit_price: Math.max(0, item.regular_unit_price),
        actual_unit_price: Math.max(0, item.actual_unit_price),
        unit_cost: Math.max(0, item.unit_cost),
        was_on_sale: Boolean(item.was_on_sale),
        sale_percent: item.was_on_sale
          ? Math.min(100, Math.max(0, item.sale_percent))
          : 0,
      }));

      const { data, error } = await supabase.rpc(
        "admin_correct_order_pricing",
        {
          p_order_id: order.id,
          p_reason: reason,
          p_items: payload,
          p_net_revenue_override:
            netRevenueManuallyEdited && netRevenueOverride.trim() !== ""
              ? Math.max(0, safeNumber(netRevenueOverride))
              : null,
        }
      );

      if (error) throw error;

      const result =
        data && typeof data === "object"
          ? (data as Record<string, unknown>)
          : null;

      setAdjustmentNotice(
        result?.new_total != null
          ? `Order corrected. New total: ${money(
              result.new_total
            )} · New profit: ${money(
              result.new_profit
            )} · PugPoints earned: ${points(
              result.new_rewards_points_earned
            )}${
              safeNumber(result.reward_balance_adjustment) !== 0
                ? ` · Balance adjustment: ${
                    safeNumber(result.reward_balance_adjustment) > 0
                      ? "+"
                      : ""
                  }${points(result.reward_balance_adjustment)}`
                : ""
            }.`
          : "Order corrected successfully."
      );

      setAdjustmentReason("");
      setNetRevenueOverride("");
      setNetRevenueManuallyEdited(false);
      setEditingOrder(false);
      await loadOrder();
    } catch (error) {
      console.error("Manual order correction failed:", error);
      setAdjustmentNotice(getErrorMessage(error));
    } finally {
      setSavingAdjustment(false);
    }
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

            {Number(order.manual_adjustment_count || 0) > 0 && (
              <span style={adjustedBadge}>
                ADJUSTED ×{Number(order.manual_adjustment_count || 0)}
              </span>
            )}
          </div>
        </header>

        {order.manual_adjusted_at && (
          <div style={manualAdjustmentBanner}>
            <strong>Historical order correction recorded</strong>
            <p style={{ margin: "6px 0 0", color: "#d2d2d8", lineHeight: 1.55 }}>
              Last corrected {new Date(order.manual_adjusted_at).toLocaleString()}.
              {" "}Reason: {order.manual_adjustment_reason || "No reason recorded."}
            </p>
          </div>
        )}

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
                <Info
                  label="Current PugPoints Balance"
                  value={points(customerProfile?.reward_points || 0)}
                  accent="#ff75df"
                />
                <Info
                  label="Current Lifetime Spend"
                  value={money(customerProfile?.lifetime_spend || 0)}
                  accent="#7df9ff"
                />
                <Info
                  label="Current VIP Tier"
                  value={String(customerProfile?.vip_tier || "-")}
                  accent="#7df9ff"
                />
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
              <div style={contentsHeader}>
                <SectionHeader
                  eyebrow="CONTENTS"
                  title="Order Contents"
                />

                {!editingOrder ? (
                  <button
                    type="button"
                    onClick={startOrderEdit}
                    style={editOrderButton}
                  >
                    ✏️ Edit Order
                  </button>
                ) : (
                  <span style={editingBadge}>
                    EDITING HISTORICAL SNAPSHOT
                  </span>
                )}
              </div>

              {items.length === 0 ? (
                <p style={warningText}>
                  No order items found.
                </p>
              ) : editingOrder ? (
                <div style={itemList}>
                  {(() => {
                    const draftProductCost = draftItems.reduce(
                      (sum, item) =>
                        sum + item.unit_cost * item.quantity,
                      0
                    );

                    const originalMerchandise = items.reduce(
                      (sum, item) =>
                        sum +
                        Number(
                          item.line_revenue ??
                            item.price ??
                            0
                        ),
                      0
                    );

                    const draftMerchandise = draftItems.reduce(
                      (sum, item) =>
                        sum +
                        item.actual_unit_price *
                          item.quantity,
                      0
                    );

                    const automaticNetRevenue = Math.max(
                      0,
                      Number(order.net_revenue ?? order.total ?? 0) +
                        (draftMerchandise - originalMerchandise)
                    );

                    const overrideNetRevenue =
                      netRevenueManuallyEdited &&
                      netRevenueOverride.trim() !== ""
                        ? Math.max(0, safeNumber(netRevenueOverride))
                        : automaticNetRevenue;

                    const taxAmount = Number(order.sales_tax_amount || 0);
                    const shippingCollected = Number(
                      order.shipping_collected ??
                        order.shipping ??
                        0
                    );
                    const otherDirectCost = Number(
                      order.other_direct_cost || 0
                    );
                    const commissionAmount = Number(
                      order.commission_amount || 0
                    );

                    const projectedProfit =
                      overrideNetRevenue -
                      draftProductCost -
                      shippingCost -
                      packagingCost -
                      otherDirectCost -
                      commissionAmount;

                    const projectedMargin =
                      overrideNetRevenue > 0
                        ? (projectedProfit / overrideNetRevenue) * 100
                        : 0;

                    const projectedCustomerTotal =
                      overrideNetRevenue + taxAmount;

                    const projectedMerchandiseRevenue =
                      Math.max(
                        0,
                        overrideNetRevenue - shippingCollected
                      );

                    const oldRewardPointsEarned =
                      Number(order.rewards_points_earned || 0);

                    /*
                     * Exact rewards rule:
                     * $187.50 corrected Net Revenue = 187.50 PugPoints.
                     */
                    const projectedRewardPointsEarned =
                      overrideNetRevenue;

                    const projectedPointsDelta =
                      projectedRewardPointsEarned -
                      oldRewardPointsEarned;

                    const rewardsAlreadyApplied =
                      Boolean(order.rewards_applied);

                    const currentRewardBalance =
                      Number(customerProfile?.reward_points || 0);

                    const projectedRewardBalance =
                      rewardsAlreadyApplied
                        ? currentRewardBalance + projectedPointsDelta
                        : currentRewardBalance;

                    const oldOrderTotal =
                      Number(order.total || 0);

                    const totalDelta =
                      projectedCustomerTotal -
                      oldOrderTotal;

                    const currentLifetimeSpend =
                      Number(customerProfile?.lifetime_spend || 0);

                    const projectedLifetimeSpend =
                      rewardsAlreadyApplied
                        ? Math.max(
                            0,
                            currentLifetimeSpend + totalDelta
                          )
                        : currentLifetimeSpend;

                    const projectedVipTier =
                      getVipTier(projectedLifetimeSpend);

                    return (
                      <div style={netRevenueEditor}>
                        <div>
                          <span style={editLabel}>
                            Net Revenue Override
                          </span>

                          <p style={adjustmentHelp}>
                            This automatically follows products you add,
                            remove, or reprice. Type a different amount only
                            when you intentionally want to override the
                            calculated Net Revenue. Sales tax is excluded.
                          </p>
                        </div>

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={
                            netRevenueManuallyEdited
                              ? netRevenueOverride
                              : overrideNetRevenue.toFixed(2)
                          }
                          onChange={(event) => {
                            setNetRevenueManuallyEdited(true);
                            setNetRevenueOverride(event.target.value);
                          }}
                          style={input}
                        />

                        <div style={rewardsRuleNotice}>
                          <strong>Exact PugPoints calculation</strong>
                          <span>
                            Corrected Net Revenue of $187.50 earns exactly
                            187.50 PugPoints. No rounding to a whole point.
                          </span>
                        </div>

                        <div style={netRevenuePreviewGrid}>
                          <PreviewMetric
                            label="Merchandise After Discounts"
                            value={money(projectedMerchandiseRevenue)}
                          />

                          <PreviewMetric
                            label="Customer Total"
                            value={money(projectedCustomerTotal)}
                          />

                          <PreviewMetric
                            label="Projected Profit"
                            value={money(projectedProfit)}
                            accent={
                              projectedProfit >= 0
                                ? "#00ff99"
                                : "#ff6f6f"
                            }
                          />

                          <PreviewMetric
                            label="Projected Margin"
                            value={`${projectedMargin.toFixed(1)}%`}
                            accent={
                              projectedMargin >= 15
                                ? "#00ff99"
                                : "#ffcc66"
                            }
                          />

                          <PreviewMetric
                            label="PugPoints Earned"
                            value={`${points(
                              oldRewardPointsEarned
                            )} → ${points(
                              projectedRewardPointsEarned
                            )}`}
                            accent="#ff75df"
                          />

                          <PreviewMetric
                            label={
                              rewardsAlreadyApplied
                                ? "PugPoints Balance"
                                : "PugPoints Balance"
                            }
                            value={
                              rewardsAlreadyApplied
                                ? `${points(
                                    currentRewardBalance
                                  )} → ${points(
                                    projectedRewardBalance
                                  )}`
                                : `${points(
                                    currentRewardBalance
                                  )} (no change yet)`
                            }
                            accent={
                              projectedPointsDelta < 0
                                ? "#ffcc66"
                                : "#00ff99"
                            }
                          />

                          <PreviewMetric
                            label="Points Adjustment"
                            value={
                              rewardsAlreadyApplied
                                ? `${
                                    projectedPointsDelta > 0
                                      ? "+"
                                      : ""
                                  }${points(projectedPointsDelta)}`
                                : "Pending until paid"
                            }
                            accent={
                              projectedPointsDelta < 0
                                ? "#ffcc66"
                                : "#00ff99"
                            }
                          />

                          <PreviewMetric
                            label="Lifetime Spend"
                            value={
                              rewardsAlreadyApplied
                                ? `${money(
                                    currentLifetimeSpend
                                  )} → ${money(
                                    projectedLifetimeSpend
                                  )}`
                                : `${money(
                                    currentLifetimeSpend
                                  )} (no change yet)`
                            }
                            accent="#7df9ff"
                          />

                          <PreviewMetric
                            label="Projected VIP"
                            value={
                              rewardsAlreadyApplied
                                ? projectedVipTier
                                : String(
                                    customerProfile?.vip_tier ||
                                      order.vip_tier_at_purchase ||
                                      "Stone"
                                  )
                            }
                            accent="#7df9ff"
                          />
                        </div>
                      </div>
                    );
                  })()}
                  <div style={addProductPanel}>
                    <div>
                      <span style={editLabel}>Add Product to Existing Order</span>
                      <p style={adjustmentHelp}>
                        Current catalog pricing is prefilled. You can change the
                        historical unit price after adding it. Today&apos;s campaigns
                        are not automatically rerun against the old order.
                      </p>
                    </div>

                    <div style={addProductGrid}>
                      <label style={editFieldWrap}>
                        <span style={editLabel}>Product / Dosage / Type</span>
                        <select
                          value={selectedCatalogOptionId}
                          onChange={(event) =>
                            setSelectedCatalogOptionId(event.target.value)
                          }
                          style={input}
                        >
                          <option value="">Select a product...</option>
                          {catalogOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.product_name} · {option.dosage} ·{" "}
                              {option.purchase_type === "kit"
                                ? "Kit of 10"
                                : "Single"}{" "}
                              · {money(option.price)}
                            </option>
                          ))}
                        </select>
                      </label>

                      <EditNumberField
                        label="Quantity"
                        value={addQuantity}
                        min={1}
                        step={1}
                        onChange={(value) =>
                          setAddQuantity(Math.max(1, Math.floor(value)))
                        }
                      />

                      <button
                        type="button"
                        onClick={addSelectedProductToDraft}
                        style={addProductButton}
                      >
                        + Add to Order
                      </button>
                    </div>
                  </div>

                  {draftItems.map((item) => {
                    const lineRevenue =
                      item.actual_unit_price * item.quantity;
                    const lineCost =
                      item.unit_cost * item.quantity;
                    const lineProfit =
                      lineRevenue - lineCost;

                    return (
                      <article
                        key={item.id}
                        style={editableItemCard}
                      >
                        <div style={itemHeader}>
                          <div>
                            <strong style={itemTitle}>
                              {item.product_name}
                            </strong>

                            <p style={itemSubline}>
                              {item.dosage || "-"} ·{" "}
                              {item.purchase_type || "-"}
                            </p>
                          </div>

                          <div style={badgeRow}>
                            {item.is_new && (
                              <span style={newItemBadge}>NEW ITEM</span>
                            )}

                            {item.was_on_sale && (
                              <span style={saleBadge}>
                                SALE {Number(item.sale_percent || 0)}% OFF
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => removeDraftItem(item.id)}
                              style={removeItemButton}
                            >
                              Remove
                            </button>
                          </div>
                        </div>

                        <div style={editGrid}>
                          <EditNumberField
                            label="Quantity"
                            value={item.quantity}
                            min={1}
                            step={1}
                            onChange={(value) =>
                              updateDraftItem(item.id, {
                                quantity: Math.max(
                                  1,
                                  Math.floor(value)
                                ),
                              })
                            }
                          />

                          <EditNumberField
                            label="Regular Unit Price"
                            value={item.regular_unit_price}
                            onChange={(value) =>
                              updateDraftItem(item.id, {
                                regular_unit_price: Math.max(0, value),
                              })
                            }
                          />

                          <EditNumberField
                            label="Actual / Sale Unit Price"
                            value={item.actual_unit_price}
                            onChange={(value) =>
                              updateDraftItem(item.id, {
                                actual_unit_price: Math.max(0, value),
                              })
                            }
                          />

                          <EditNumberField
                            label="Unit Cost"
                            value={item.unit_cost}
                            onChange={(value) =>
                              updateDraftItem(item.id, {
                                unit_cost: Math.max(0, value),
                              })
                            }
                          />

                          <label style={editFieldWrap}>
                            <span style={editLabel}>Sale Applied</span>

                            <div style={checkboxRow}>
                              <input
                                type="checkbox"
                                checked={item.was_on_sale}
                                onChange={(event) => {
                                  const checked = event.target.checked;

                                  updateDraftItem(item.id, {
                                    was_on_sale: checked,
                                    sale_percent: checked
                                      ? item.sale_percent
                                      : 0,
                                    actual_unit_price: checked
                                      ? item.actual_unit_price
                                      : item.regular_unit_price,
                                  });
                                }}
                              />

                              <span>
                                This item was on sale
                              </span>
                            </div>
                          </label>

                          <EditNumberField
                            label="Sale Percent"
                            value={item.sale_percent}
                            min={0}
                            max={100}
                            step={0.01}
                            disabled={!item.was_on_sale}
                            onChange={(value) =>
                              applySalePercent(item.id, value)
                            }
                          />
                        </div>

                        <div style={calculatedStrip}>
                          <span>
                            Line Revenue{" "}
                            <strong>{money(lineRevenue)}</strong>
                          </span>

                          <span>
                            Line Cost{" "}
                            <strong>{money(lineCost)}</strong>
                          </span>

                          <span
                            style={{
                              color:
                                lineProfit >= 0
                                  ? "#00ff99"
                                  : "#ff6f6f",
                            }}
                          >
                            Line Profit{" "}
                            <strong>{money(lineProfit)}</strong>
                          </span>
                        </div>
                      </article>
                    );
                  })}

                  <div style={adjustmentPanel}>
                    <label style={label}>
                      Reason for Manual Correction *
                    </label>

                    <textarea
                      value={adjustmentReason}
                      onChange={(event) =>
                        setAdjustmentReason(event.target.value)
                      }
                      placeholder="Example: Correcting Tesamorelin 20mg sale price that was not applied during the campaign."
                      rows={4}
                      style={textarea}
                    />

                    <p style={adjustmentHelp}>
                      This changes only this historical order.
                      It does not change the current product price
                      or the product inventory record.
                    </p>

                    <div style={correctionActions}>
                      <button
                        type="button"
                        onClick={cancelOrderEdit}
                        disabled={savingAdjustment}
                        style={cancelButton}
                      >
                        Cancel Changes
                      </button>

                      <button
                        type="button"
                        onClick={() => void saveManualCorrection()}
                        disabled={savingAdjustment}
                        style={{
                          ...saveCorrectionButton,
                          opacity: savingAdjustment ? 0.65 : 1,
                        }}
                      >
                        {savingAdjustment
                          ? "Saving Correction..."
                          : "Save & Recalculate Order"}
                      </button>
                    </div>

                    {adjustmentNotice && (
                      <p style={adjustmentNoticeStyle}>
                        {adjustmentNotice}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div style={itemList}>
                  {items.map((item) => {
                    const quantity = Number(item.quantity || 1);
                    const regular = Number(
                      item.regular_unit_price ??
                        item.sale_unit_price ??
                        item.actual_unit_price ??
                        0
                    );
                    const sale = Number(
                      item.actual_unit_price ??
                        item.sale_unit_price ??
                        regular
                    );
                    const revenue = Number(
                      item.line_revenue ??
                        item.price ??
                        sale * quantity
                    );
                    const cost = Number(
                      item.line_cost ??
                        Number(item.cost || 0) * quantity
                    );
                    const profit = Number(
                      item.line_profit ?? revenue - cost
                    );

                    return (
                      <article key={item.id} style={itemCard}>
                        <div style={itemHeader}>
                          <div>
                            <strong style={itemTitle}>
                              {item.product_name || "Product"}
                            </strong>

                            <p style={itemSubline}>
                              {item.dosage || "-"} ·{" "}
                              {item.purchase_type || "-"} · Qty{" "}
                              {quantity}
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
                          <Info
                            label="Regular Unit"
                            value={money(regular)}
                          />
                          <Info
                            label="Actual / Sale Unit"
                            value={money(sale)}
                          />
                          <Info
                            label="Unit Cost"
                            value={money(item.cost || 0)}
                          />
                          <Info
                            label="Line Revenue"
                            value={money(revenue)}
                          />
                          <Info
                            label="Line Cost"
                            value={money(cost)}
                          />
                          <Info
                            label="Line Profit"
                            value={money(profit)}
                            accent={
                              profit >= 0
                                ? "#00ff99"
                                : "#ff6f6f"
                            }
                          />
                          <Info
                            label="Inventory Status"
                            value={item.inventory_status || "-"}
                          />
                        </InfoGrid>
                      </article>
                    );
                  })}

                  {adjustmentNotice && (
                    <p style={adjustmentNoticeStyle}>
                      {adjustmentNotice}
                    </p>
                  )}
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
                <Info label="Sale Savings" value={`-$${Number(order.sale_discount || 0).toFixed(2)}`} accent="#00ff99" />
                <Info label="Bundle Savings" value={`-$${Number(order.bundle_discount || 0).toFixed(2)}`} accent="#00ff99" />
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
                <Info label="Hero Appreciation" value={`-$${Number(order.hero_discount || 0).toFixed(2)}`} accent="#7df9ff" />
                <Info label="PugPoints Used" value={String(Number(order.reward_points_used || 0))} />
                <Info label="PugPoints Discount" value={`-$${Number(order.reward_discount || 0).toFixed(2)}`} accent="#00ff99" />
                <Info label="PugPoints Earned" value={points(order.rewards_points_earned || 0)} accent="#00ff99" />
                <Info label="Total Discount" value={`-$${Number(order.total_discount || 0).toFixed(2)}`} accent="#00ff99" />
                <Info label="Delivery Charged" value={`$${Number(order.shipping || 0).toFixed(2)}`} />
                <Info label="Sales Tax" value={`$${Number(order.sales_tax_amount || 0).toFixed(2)}`} />
                <Info label="Payment Method" value={order.payment_method || "Not recorded"} />
              </InfoGrid>

              <div style={grandTotal}>
                <span>Total Paid</span>
                <strong>${Number(order.total || 0).toFixed(2)}</strong>
              </div>
            </section>

            {adjustments.length > 0 && (
              <section style={card}>
                <SectionHeader
                  eyebrow="AUDIT"
                  title="Manual Adjustment History"
                />

                <div style={auditList}>
                  {adjustments.map((adjustment) => (
                    <article key={adjustment.id} style={auditCard}>
                      <div style={auditHeader}>
                        <strong style={{ color: "#ffcc66" }}>
                          {new Date(
                            adjustment.adjusted_at
                          ).toLocaleString()}
                        </strong>

                        <span style={{ color: "#888", fontSize: 12 }}>
                          {adjustment.adjusted_by_email || "Admin"}
                        </span>
                      </div>

                      <p style={auditReason}>
                        {adjustment.reason}
                      </p>

                      <div style={auditMetrics}>
                        <span>
                          Merchandise{" "}
                          {money(adjustment.merchandise_revenue_before)}
                          {" → "}
                          {money(adjustment.merchandise_revenue_after)}
                        </span>

                        <span>
                          Total{" "}
                          {money(adjustment.customer_total_before)}
                          {" → "}
                          {money(adjustment.customer_total_after)}
                        </span>

                        <span>
                          Profit{" "}
                          {money(adjustment.profit_before)}
                          {" → "}
                          {money(adjustment.profit_after)}
                        </span>

                        {adjustment.reward_points_earned_before != null && (
                          <span>
                            PugPoints{" "}
                            {points(
                              adjustment.reward_points_earned_before
                            )}
                            {" → "}
                            {points(
                              adjustment.reward_points_earned_after
                            )}
                          </span>
                        )}

                        {safeNumber(
                          adjustment.reward_balance_adjustment
                        ) !== 0 && (
                          <span
                            style={{
                              color:
                                safeNumber(
                                  adjustment.reward_balance_adjustment
                                ) < 0
                                  ? "#ffcc66"
                                  : "#00ff99",
                            }}
                          >
                            Balance{" "}
                            {safeNumber(
                              adjustment.reward_balance_adjustment
                            ) > 0
                              ? "+"
                              : ""}
                            {points(
                              adjustment.reward_balance_adjustment
                            )}
                          </span>
                        )}

                        {adjustment.lifetime_spend_before_adjustment != null && (
                          <span>
                            Lifetime Spend{" "}
                            {money(
                              adjustment.lifetime_spend_before_adjustment
                            )}
                            {" → "}
                            {money(
                              adjustment.lifetime_spend_after_adjustment
                            )}
                          </span>
                        )}

                        {adjustment.vip_tier_before && (
                          <span>
                            VIP{" "}
                            {adjustment.vip_tier_before}
                            {" → "}
                            {adjustment.vip_tier_after}
                          </span>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}
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
                  ${(netRevenue - productCostTotal - shippingCost - packagingCost - Number(order.other_direct_cost || 0) - Number(order.commission_amount || 0)).toFixed(2)}
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
                <Info
                  label="Rewards Applied"
                  value={order.rewards_applied ? "Yes" : "No"}
                  accent={order.rewards_applied ? "#00ff99" : "#ffcc66"}
                />
                <Info
                  label="Manual Adjustments"
                  value={String(Number(order.manual_adjustment_count || 0))}
                  accent={
                    Number(order.manual_adjustment_count || 0) > 0
                      ? "#ffcc66"
                      : undefined
                  }
                />
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

          @media (max-width: 720px) {
            select {
              max-width: 100%;
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

function PreviewMetric({
  label: previewLabel,
  value,
  accent = "#7df9ff",
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div style={previewMetric}>
      <span style={editLabel}>{previewLabel}</span>
      <strong style={{ color: accent, fontSize: 18 }}>
        {value}
      </strong>
    </div>
  );
}

function EditNumberField({
  label: fieldLabel,
  value,
  onChange,
  min = 0,
  max,
  step = 0.01,
  disabled = false,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}) {
  return (
    <label style={editFieldWrap}>
      <span style={editLabel}>
        {fieldLabel}
      </span>

      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(event) =>
          onChange(safeNumber(event.target.value))
        }
        style={{
          ...input,
          opacity: disabled ? 0.45 : 1,
        }}
      />
    </label>
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

const adjustedBadge = {
  padding: "7px 10px",
  border: "1px solid rgba(255,204,102,.65)",
  borderRadius: 999,
  background: "rgba(255,204,102,.08)",
  color: "#ffcc66",
  fontSize: 11,
  fontWeight: 900,
};

const manualAdjustmentBanner = {
  marginTop: 18,
  padding: "14px 16px",
  border: "1px solid rgba(255,204,102,.42)",
  borderRadius: 13,
  background: "rgba(255,204,102,.07)",
  color: "#ffcc66",
};

const contentsHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 14,
  flexWrap: "wrap" as const,
};

const editOrderButton = {
  minHeight: 42,
  padding: "0 14px",
  border: "1px solid rgba(255,204,102,.65)",
  borderRadius: 9,
  background: "rgba(255,204,102,.08)",
  color: "#ffcc66",
  fontWeight: 900,
  cursor: "pointer",
};

const editingBadge = {
  padding: "7px 10px",
  border: "1px solid rgba(255,204,102,.55)",
  borderRadius: 999,
  background: "rgba(255,204,102,.08)",
  color: "#ffcc66",
  fontSize: 10,
  fontWeight: 900,
};

const editableItemCard = {
  ...itemCard,
  border: "1px solid rgba(255,204,102,.34)",
  background:
    "linear-gradient(145deg, rgba(20,16,5,.65), rgba(0,0,0,.3))",
};

const editGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 11,
};

const editFieldWrap = {
  display: "grid",
  gap: 6,
};

const editLabel = {
  color: "#aaa",
  fontSize: 11,
  fontWeight: 900,
  textTransform: "uppercase" as const,
};

const checkboxRow = {
  minHeight: 45,
  padding: "0 11px",
  display: "flex",
  alignItems: "center",
  gap: 9,
  border: "1px solid rgba(0,217,255,.22)",
  borderRadius: 9,
  background: "#050505",
  color: "#ddd",
};

const calculatedStrip = {
  marginTop: 12,
  padding: "10px 12px",
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap" as const,
  border: "1px solid rgba(255,255,255,.10)",
  borderRadius: 9,
  background: "rgba(0,0,0,.35)",
  color: "#ccc",
  fontSize: 13,
};

const netRevenueEditor = {
  padding: 16,
  border: "1px solid rgba(125,249,255,.34)",
  borderRadius: 12,
  background:
    "linear-gradient(145deg, rgba(0,217,255,.07), rgba(0,0,0,.28))",
};

const rewardsRuleNotice = {
  marginTop: 10,
  padding: "10px 12px",
  display: "grid",
  gap: 4,
  border: "1px solid rgba(255,69,216,.30)",
  borderRadius: 9,
  background: "rgba(255,69,216,.055)",
  color: "#d6d6dc",
  fontSize: 12,
  lineHeight: 1.5,
};

const netRevenuePreviewGrid = {
  marginTop: 12,
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 9,
};

const previewMetric = {
  padding: 11,
  display: "grid",
  gap: 5,
  border: "1px solid rgba(255,255,255,.10)",
  borderRadius: 9,
  background: "rgba(0,0,0,.28)",
};

const addProductPanel = {
  padding: 16,
  border: "1px solid rgba(0,255,153,.34)",
  borderRadius: 12,
  background:
    "linear-gradient(145deg, rgba(0,255,153,.06), rgba(0,0,0,.28))",
};

const addProductGrid = {
  marginTop: 12,
  display: "grid",
  gridTemplateColumns: "minmax(260px, 1fr) 120px auto",
  gap: 10,
  alignItems: "end",
};

const addProductButton = {
  minHeight: 45,
  padding: "0 16px",
  border: "1px solid #45d97a",
  borderRadius: 9,
  background: "rgba(46,234,111,.10)",
  color: "#7dffa7",
  fontWeight: 900,
  cursor: "pointer",
};

const removeItemButton = {
  minHeight: 30,
  padding: "0 10px",
  border: "1px solid rgba(255,111,111,.48)",
  borderRadius: 999,
  background: "rgba(255,111,111,.08)",
  color: "#ff8c8c",
  fontSize: 10,
  fontWeight: 900,
  cursor: "pointer",
};

const newItemBadge = {
  padding: "5px 8px",
  borderRadius: 999,
  background: "rgba(0,217,255,.10)",
  color: "#7df9ff",
  border: "1px solid rgba(0,217,255,.42)",
  fontSize: 10,
  fontWeight: 900,
};

const adjustmentPanel = {
  marginTop: 4,
  padding: 16,
  border: "1px solid rgba(255,204,102,.42)",
  borderRadius: 12,
  background: "rgba(255,204,102,.055)",
};

const textarea = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: 12,
  background: "#050505",
  color: "#fff",
  border: "1px solid rgba(255,204,102,.32)",
  borderRadius: 9,
  resize: "vertical" as const,
};

const adjustmentHelp = {
  margin: "9px 0 0",
  color: "#999",
  fontSize: 12,
  lineHeight: 1.55,
};

const correctionActions = {
  marginTop: 14,
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  flexWrap: "wrap" as const,
};

const cancelButton = {
  minHeight: 44,
  padding: "0 15px",
  border: "1px solid rgba(255,255,255,.20)",
  borderRadius: 9,
  background: "rgba(255,255,255,.04)",
  color: "#ddd",
  fontWeight: 900,
  cursor: "pointer",
};

const saveCorrectionButton = {
  minHeight: 44,
  padding: "0 16px",
  border: "1px solid #ffcc66",
  borderRadius: 9,
  background: "linear-gradient(180deg, #e1a93e, #a66b11)",
  color: "#fff",
  fontWeight: 900,
  cursor: "pointer",
};

const adjustmentNoticeStyle = {
  margin: "12px 0 0",
  color: "#ffcc66",
  fontWeight: 800,
  lineHeight: 1.55,
};

const auditList = {
  display: "grid",
  gap: 10,
};

const auditCard = {
  padding: 13,
  border: "1px solid rgba(255,204,102,.20)",
  borderRadius: 10,
  background: "rgba(255,204,102,.035)",
};

const auditHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  flexWrap: "wrap" as const,
};

const auditReason = {
  margin: "8px 0 0",
  color: "#ddd",
  lineHeight: 1.55,
};

const auditMetrics = {
  marginTop: 9,
  display: "flex",
  gap: 14,
  flexWrap: "wrap" as const,
  color: "#999",
  fontSize: 12,
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