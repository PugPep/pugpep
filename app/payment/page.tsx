"use client";

import emailjs from "emailjs-com";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "../cartContext";
import { createClient } from "../../lib/supabaseClient";
import { trackEvent } from "../../lib/trackEvent";

type PaymentMethod =
  | "cashapp"
  | "venmo"
  | "applecash"
  | "crypto";

type PromoValidation = {
  valid: boolean;
  source: "general" | "sales_rep" | null;
  code: string | null;
  discount_type?: string | null;
  discount_value?: number | null;
  sales_rep_id?: string | null;
  sales_rep_name?: string | null;
  first_order_only?: boolean;
  discount_allowed: boolean;
  message: string;
};

type PendingOrder = {
  id: string;
  userId: string | null;
  orderNumber: string;

  customer: {
    organization: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  };

  items: {
    slug: string;
    name: string;
    dosage: string;
    purchaseType: "single" | "kit";
    price: number;
    regularPrice?: number;
    salePrice?: number;
    wasOnSale?: boolean;
    salePercent?: number;
    cost?: number;
    quantity?: number;
    status?: string;
    maxAvailable?: number;
    image?: string;
  }[];

  subtotal: number;
  shipping: number;

  rewardPointsUsed?: number;
  rewardDiscount?: number;

  promoCode?: string | null;
  promoSource?: string | null;
  promoDiscountAllowed?: boolean;
  promoDiscountType?: string | null;
  promoDiscountValue?: number;
  promoDiscount?: number;

  totalDiscount?: number;
  total: number;

  hasLifetimeFreeShipping?: boolean;
  createdAt: string;
  confirmed?: boolean;
};

const contactLinks = [
  {
    label: "Join Discord",
    href: "https://discord.gg/yas8DetFz",
  },
  {
    label: "Telegram",
    href: "https://t.me/PugPeps",
  },
  {
    label: "Email Us",
    href: "mailto:support@pugpep.com",
  },
];

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

function calculatePromoDiscount(
  subtotal: number,
  validation: PromoValidation | null
) {
  if (!validation?.valid) return 0;
  if (!validation.discount_allowed) return 0;

  const discountValue = Number(
    validation.discount_value || 0
  );

  let discount = 0;

  if (validation.discount_type === "percent") {
    discount = subtotal * (discountValue / 100);
  }

  if (validation.discount_type === "fixed") {
    discount = discountValue;
  }

  return Math.min(
    Math.max(discount, 0),
    subtotal
  );
}

export default function PaymentPage() {
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const { clearCart } = useCart();

  const [method, setMethod] =
    useState<PaymentMethod>("venmo");

  const [order, setOrder] =
    useState<PendingOrder | null>(null);

  const [confirming, setConfirming] =
    useState(false);

  useEffect(() => {
    try {
      const savedOrder =
        localStorage.getItem("pugpep_order");

      if (savedOrder) {
        setOrder(JSON.parse(savedOrder));
      }
    } catch (error) {
      console.error(
        "Unable to load pending order:",
        error
      );
    }
  }, []);

  async function confirmOrder() {
    if (!order || confirming) return;

    if (order.confirmed) {
      alert(
        "This order has already been confirmed."
      );

      return;
    }

    setConfirming(true);

    let orderInserted = false;

    try {
      /*
       * Confirm that the customer is still signed
       * into the same account used at checkout.
       */
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (
        !user ||
        !order.userId ||
        user.id !== order.userId
      ) {
        throw new Error(
          "You must be signed in to the same account used at checkout."
        );
      }

      /*
       * Prevent the same local order from being
       * submitted twice.
       */
      const {
        data: existingOrder,
        error: existingOrderError,
      } = await supabase
        .from("orders")
        .select("id")
        .eq("id", order.id)
        .maybeSingle();

      if (existingOrderError) {
        throw existingOrderError;
      }

      if (existingOrder) {
        const confirmedOrder = {
          ...order,
          confirmed: true,
        };

        localStorage.setItem(
          "pugpep_order",
          JSON.stringify(confirmedOrder)
        );

        setOrder(confirmedOrder);
        clearCart();

        alert(
          "This order has already been confirmed."
        );

        return;
      }

      /*
       * Validate the promo again directly before
       * writing the order.
       *
       * This prevents the browser's saved discount
       * values from being trusted.
       */
      let verifiedPromo:
        | PromoValidation
        | null = null;

      if (order.promoCode) {
        const {
          data: promoResult,
          error: promoError,
        } = await supabase.rpc(
          "validate_checkout_promo",
          {
            p_code: order.promoCode,
            p_customer_id: order.userId,
          }
        );

        if (promoError) {
          throw promoError;
        }

        verifiedPromo =
          promoResult as PromoValidation;

        if (!verifiedPromo?.valid) {
          throw new Error(
            verifiedPromo?.message ||
              "The promo code is no longer valid."
          );
        }
      }

      /*
       * Load the current reward point and VIP
       * values from Supabase.
       */
      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("customer_profiles")
        .select(
          "lifetime_spend, reward_points, vip_tier"
        )
        .eq("id", order.userId)
        .single();

      if (profileError) {
        throw profileError;
      }

      const lifetimeSpendBefore = Number(
        profile?.lifetime_spend || 0
      );

      const rewardPointsBefore = Number(
        profile?.reward_points || 0
      );

      const vipTierBefore = String(
        profile?.vip_tier ||
          getVipTier(lifetimeSpendBefore)
      );

      /*
       * Recalculate the reward redemption using
       * the customer's current available points.
       */
      const requestedRewardPoints = Number(
        order.rewardPointsUsed || 0
      );

      const rewardPointsUsed = Math.max(
        0,
        Math.min(
          Math.floor(requestedRewardPoints),
          rewardPointsBefore
        )
      );

      const rewardDiscount =
        rewardPointsUsed / 100;

      /*
       * Recalculate the promo discount from the
       * verified database response.
       */
      const promoDiscount =
        calculatePromoDiscount(
          Number(order.subtotal || 0),
          verifiedPromo
        );

      const totalDiscount =
        promoDiscount + rewardDiscount;

      const authoritativeTotal = Math.max(
        0,
        Number(order.subtotal || 0) -
          promoDiscount -
          rewardDiscount +
          Number(order.shipping || 0)
      );

      /*
       * Points earned, lifetime spend, and VIP
       * progression remain pending until the
       * order is marked paid.
       */
      const rewardsPointsEarned = Math.floor(
        authoritativeTotal
      );

      const lifetimeSpendAfter =
        lifetimeSpendBefore;

      const vipTierAtPurchase =
        vipTierBefore;

      /*
       * Calculate the permanent accounting
       * snapshots for this order.
       */
      const productCostTotal =
        order.items.reduce(
          (sum, item) => {
            const quantity = Number(
              item.quantity || 1
            );

            const unitCost = Number(
              item.cost || 0
            );

            return (
              sum + unitCost * quantity
            );
          },
          0
        );

      /*
       * Existing business expense rules:
       *
       * Charged shipping order:
       * $10 estimated shipping expense
       *
       * Free shipping order:
       * $0 estimated shipping expense
       *
       * Packaging:
       * $3
       */
      const estimatedShippingCost =
        Number(order.shipping || 0) > 0
          ? 10
          : 0;

      const estimatedPackagingCost = 3;

      const grossRevenue =
        Number(order.subtotal || 0) +
        Number(order.shipping || 0);

      const netRevenue =
        authoritativeTotal;

      const estimatedProfit =
        netRevenue -
        productCostTotal -
        estimatedShippingCost -
        estimatedPackagingCost;

      const profitMarginPercent =
        netRevenue > 0
          ? (estimatedProfit / netRevenue) *
            100
          : 0;

      /*
       * Create the pending order.
       */
      const { error: orderError } =
        await supabase
          .from("orders")
          .insert({
            id: order.id,

            user_id: order.userId,

            order_number:
              order.orderNumber,

            customer_organization:
              order.customer.organization,

            customer_name:
              order.customer.name,

            customer_email:
              order.customer.email,

            customer_phone:
              order.customer.phone,

            shipping_address:
              order.customer.address,

            city: order.customer.city,

            state: order.customer.state,

            zip: order.customer.zip,

            subtotal: Number(
              order.subtotal || 0
            ),

            shipping: Number(
              order.shipping || 0
            ),

            total: authoritativeTotal,

            reward_points_used:
              rewardPointsUsed,

            reward_discount:
              rewardDiscount,

            rewards_points_earned:
              rewardsPointsEarned,

            promo_code:
              verifiedPromo?.code || null,

            promo_discount_type:
              verifiedPromo?.discount_type ||
              null,

            promo_discount_value:
              Number(
                verifiedPromo?.discount_value ||
                  0
              ),

            promo_discount:
              promoDiscount,

            total_discount:
              totalDiscount,

            product_cost_total:
              productCostTotal,

            estimated_shipping_cost:
              estimatedShippingCost,

            estimated_packaging_cost:
              estimatedPackagingCost,

            estimated_profit:
              estimatedProfit,

            profit_margin_percent:
              profitMarginPercent,

            gross_revenue:
              grossRevenue,

            net_revenue:
              netRevenue,

            payment_method: method,

            vip_tier_at_purchase:
              vipTierAtPurchase,

            lifetime_spend_before:
              lifetimeSpendBefore,

            lifetime_spend_after:
              lifetimeSpendAfter,

            has_lifetime_free_shipping:
              Boolean(
                order.hasLifetimeFreeShipping
              ),

            rewards_applied: false,

            snapshot_version: 1,

            pricing_snapshotted_at:
              new Date().toISOString(),

            status: "pending",
          });

      if (orderError) {
        throw orderError;
      }

      orderInserted = true;

      /*
       * Snapshot every product line.
       */
      const orderItems = order.items.map(
        (item) => {
          const quantity = Number(
            item.quantity || 1
          );

          const regularUnitPrice = Number(
            item.regularPrice ??
              item.price ??
              0
          );

          const saleUnitPrice = Number(
            item.salePrice ??
              item.price ??
              0
          );

          const wasOnSale = Boolean(
            item.wasOnSale
          );

          const salePercent = wasOnSale
            ? Number(
                item.salePercent || 0
              )
            : 0;

          const unitPrice = Number(
            item.price || saleUnitPrice
          );

          const unitCost = Number(
            item.cost || 0
          );

          const lineRevenue =
            unitPrice * quantity;

          const lineCost =
            unitCost * quantity;

          return {
            order_id: order.id,

            product_slug: item.slug,

            product_name: item.name,

            dosage: item.dosage,

            purchase_type:
              item.purchaseType,

            price: lineRevenue,

            cost: unitCost,

            quantity,

            was_on_sale: wasOnSale,

            sale_percent:
              salePercent,

            regular_unit_price:
              regularUnitPrice,

            sale_unit_price:
              saleUnitPrice,

            actual_unit_price:
              unitPrice,

            snapshot_created_at:
              new Date().toISOString(),

            line_revenue:
              lineRevenue,

            line_cost:
              lineCost,

            line_profit:
              lineRevenue - lineCost,

            inventory_status:
              item.status || null,

            was_pre_sale:
              item.status === "pre-sale",
          };
        }
      );

      const { error: itemsError } =
        await supabase
          .from("order_items")
          .insert(orderItems);

      if (itemsError) {
        throw itemsError;
      }

      /*
       * Permanently assign the customer when a
       * rep code was first used.
       *
       * This also records the one-time redemption
       * and snapshots the representative's
       * commission.
       */
      const {
        error: attributionError,
      } = await supabase.rpc(
        "finalize_sales_rep_order_attribution",
        {
          p_order_id: order.id,

          p_customer_id:
            order.userId,

          p_promo_code:
            verifiedPromo?.code || null,

          p_discount_amount:
            promoDiscount,

          p_commissionable_profit:
            estimatedProfit,
        }
      );

      if (attributionError) {
        throw attributionError;
      }

      /*
       * Reserve redeemed reward points now.
       *
       * Earned points are still only awarded when
       * the order is marked paid.
       */
      if (rewardPointsUsed > 0) {
        const remainingRewardPoints =
          Math.max(
            0,
            rewardPointsBefore -
              rewardPointsUsed
          );

        const {
          error: rewardUpdateError,
        } = await supabase
          .from("customer_profiles")
          .update({
            reward_points:
              remainingRewardPoints,
          })
          .eq("id", order.userId);

        if (rewardUpdateError) {
          console.error(
            "Order saved, but redeemed reward points could not be deducted:",
            rewardUpdateError
          );
        }
      }

      /*
       * Send the confirmation email.
       */
      try {
        await emailjs.send(
          "service_quxnkin",
          "template_xz4gtk9",
          {
            organization:
              order.customer.organization,

            name: order.customer.name,

            email: order.customer.email,

            admin_email:
              "Support@PugPep.com",

            order_number:
              order.orderNumber,

            items: order.items.map(
              (item) => ({
                name: `${item.name} (${item.dosage})`,

                quantity:
                  item.quantity || 1,

                price: `$${(
                  Number(item.price) *
                  Number(
                    item.quantity || 1
                  )
                ).toFixed(2)}`,
              })
            ),

            shipping: Number(
              order.shipping
            ).toFixed(2),

            tax: "0.00",

            promo_code:
              verifiedPromo?.code || "",

            promo_discount:
              promoDiscount.toFixed(2),

            reward_discount:
              rewardDiscount.toFixed(2),

            total:
              authoritativeTotal.toFixed(2),
          },

          "yc_0cE0Mcl3tfzc11"
        );
      } catch (emailError) {
        console.error(
          "Order created, but confirmation email failed:",
          emailError
        );
      }

      /*
       * Send the confirmation text message.
       */
      try {
        const smsResponse = await fetch(
          "/api/send-order-confirmation-sms",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              customerPhone:
                order.customer.phone,

              orderNumber:
                order.orderNumber,

              orderTotal:
                authoritativeTotal,
            }),
          }
        );

        if (!smsResponse.ok) {
          console.error(
            "Order created, but confirmation SMS failed."
          );
        }
      } catch (smsError) {
        console.error(
          "Order created, but confirmation SMS failed:",
          smsError
        );
      }

      await trackEvent({
        event_type: "order_created",

        order_number:
          order.orderNumber,

        metadata: {
          total: authoritativeTotal,

          itemCount:
            order.items.length,

          promoCode:
            verifiedPromo?.code || null,

          paymentMethod: method,
        },
      });

      await trackEvent({
        event_type: "order_confirmed",

        order_number:
          order.orderNumber,

        metadata: {
          total: authoritativeTotal,

          paymentMethod: method,
        },
      });

      /*
       * Store the corrected and confirmed values
       * in the browser.
       */
      const confirmedOrder = {
        ...order,

        total: authoritativeTotal,

        promoCode:
          verifiedPromo?.code || null,

        promoDiscount,

        rewardPointsUsed,

        rewardDiscount,

        totalDiscount,

        confirmed: true,
      };

      localStorage.setItem(
        "pugpep_order",
        JSON.stringify(confirmedOrder)
      );

      setOrder(confirmedOrder);

      clearCart();

      alert(
        "Order confirmed. Your order was submitted and your confirmation was sent."
      );
    } catch (error: any) {
      /*
       * If the order was inserted but a required
       * later step failed, remove the incomplete
       * order and order items.
       */
      if (orderInserted && order) {
        await supabase
          .from("order_items")
          .delete()
          .eq("order_id", order.id);

        await supabase
          .from("orders")
          .delete()
          .eq("id", order.id);
      }

      console.error(
        "Order confirmation error:",
        error
      );

      alert(
        error?.message ||
          "The order could not be confirmed. Your cart was not cleared."
      );
    } finally {
      setConfirming(false);
    }
  }

  if (!order) {
    return (
      <main style={page}>
        <h1 style={{ color: "#ff45d8" }}>
          Payment
        </h1>

        <p>
          No order found. Please return to
          checkout.
        </p>
      </main>
    );
  }

  return (
    <main style={page}>
      <h1 style={{ color: "#ff45d8" }}>
        Payment
      </h1>

      <div style={boxStyle}>
        <h2 style={{ color: "#00d9ff" }}>
          Order #{order.orderNumber}
        </h2>

        <p>
          <strong>Organization:</strong>{" "}
          {order.customer.organization}
        </p>

        <p>
          <strong>Name:</strong>{" "}
          {order.customer.name}
        </p>

        <p>
          <strong>Email:</strong>{" "}
          {order.customer.email}
        </p>

        <p>
          <strong>Ship To:</strong>{" "}
          {order.customer.address},{" "}
          {order.customer.city},{" "}
          {order.customer.state}{" "}
          {order.customer.zip}
        </p>

        <h3>
          Subtotal: $
          {Number(order.subtotal).toFixed(2)}
        </h3>

        {Number(
          order.promoDiscount || 0
        ) > 0 && (
          <h3 style={{ color: "#00ff99" }}>
            Promo Discount: -$
            {Number(
              order.promoDiscount
            ).toFixed(2)}
          </h3>
        )}

        {Number(
          order.rewardDiscount || 0
        ) > 0 && (
          <h3 style={{ color: "#00ff99" }}>
            Rewards Discount: -$
            {Number(
              order.rewardDiscount
            ).toFixed(2)}
          </h3>
        )}

        <h3>
          Shipping:{" "}
          {Number(order.shipping) === 0 ? (
            <span
              style={{ color: "#00ff99" }}
            >
              FREE
            </span>
          ) : (
            `$${Number(
              order.shipping
            ).toFixed(2)}`
          )}
        </h3>

        <h2 style={{ color: "#00d9ff" }}>
          Total: $
          {Number(order.total).toFixed(2)}
        </h2>

        <button
          type="button"
          onClick={confirmOrder}
          disabled={
            confirming ||
            Boolean(order.confirmed)
          }
          style={{
            ...confirmButton,

            background:
              order.confirmed
                ? "#333333"
                : confirmButton.background,

            cursor:
              confirming ||
              order.confirmed
                ? "not-allowed"
                : "pointer",

            opacity:
              confirming ||
              order.confirmed
                ? 0.7
                : 1,
          }}
        >
          {confirming
            ? "Confirming..."
            : order.confirmed
            ? "Order Confirmed"
            : "Confirm Order"}
        </button>
      </div>

      <section style={methodGrid}>
        {[
          ["cashapp", "Cash App"],
          ["venmo", "Venmo"],
          ["applecash", "Apple Cash"],
          ["crypto", "Crypto"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              const selectedMethod =
                value as PaymentMethod;

              setMethod(selectedMethod);

              trackEvent({
                event_type:
                  "payment_method_selected",

                payment_method:
                  selectedMethod,

                order_number:
                  order.orderNumber,
              });
            }}
            style={{
              ...methodButton,

              border:
                method === value
                  ? "2px solid #ff45d8"
                  : "1px solid #333333",

              background:
                method === value
                  ? "#1b0016"
                  : "#111111",
            }}
          >
            {label}
          </button>
        ))}
      </section>

      <div style={paymentBox}>
        {method === "cashapp" && (
          <PaymentInstructions
            title="Cash App"
            accent="#1eff00"
            amount={order.total}
            paymentInfo="$PugPep1111"
            message="Include ONLY YOUR NAME in the memo/note section. Message us on Discord, Telegram or Email for assistance."
          />
        )}

        {method === "venmo" && (
          <PaymentInstructions
            title="Venmo"
            accent="#00d9ff"
            amount={order.total}
            paymentInfo="@PugPep1111"
            message="Friends & Family preferred. Include ONLY YOUR NAME in the note section. Message us on Discord, Telegram or Email for assistance."
          />
        )}

        {method === "applecash" && (
          <PaymentInstructions
            title="Apple Cash"
            accent="#cfd3d8"
            amount={order.total}
            message="Message us on Discord, Telegram or Email to receive Apple Cash payment instructions."
          />
        )}

        {method === "crypto" && (
          <>
            <AurpayButton
              orderNumber={
                order.orderNumber
              }
              total={order.total}
            />

            <img
              src="/crypto-banner.png"
              alt="We Accept Crypto"
              style={cryptoBanner}
            />
          </>
        )}
      </div>
    </main>
  );
}

function AurpayButton({
  orderNumber,
  total,
}: {
  orderNumber: string;
  total: number;
}) {
  const [loading, setLoading] =
    useState(false);

  async function startAurpayPayment() {
    setLoading(true);

    try {
      const response = await fetch(
        "/api/aurpay/create-payment",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            orderNumber,
            total,
          }),
        }
      );

      const result =
        await response.json();

      if (
        !response.ok ||
        result.error
      ) {
        throw new Error(
          result.error ||
            "Payment generation failed."
        );
      }

      const checkoutUrl =
        result.data?.pay_url ||
        result.pay_url ||
        result.payUrl ||
        result.url;

      if (!checkoutUrl) {
        throw new Error(
          "Unable to find the AURPAY payment link."
        );
      }

      window.open(
        checkoutUrl,
        "_blank",
        "noopener,noreferrer"
      );
    } catch (error: any) {
      console.error(error);

      alert(
        error?.message ||
          "Unable to create AURPAY payment."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        textAlign: "center",
        marginBottom: 25,
      }}
    >
      <h2 style={{ color: "#ff45d8" }}>
        Crypto Payment
      </h2>

      <p
        style={{
          color: "#dddddd",
          lineHeight: 1.6,
        }}
      >
        Click below to open secure AURPAY
        checkout for this order total.
      </p>

      <button
        type="button"
        onClick={startAurpayPayment}
        disabled={loading}
        style={{
          ...contactButton,
          maxWidth: 320,
          margin: "0 auto",
          border: "none",
          width: "100%",
          cursor: loading
            ? "not-allowed"
            : "pointer",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading
          ? "Opening AURPAY..."
          : "Secure Crypto Checkout"}
      </button>
    </div>
  );
}

function PaymentInstructions({
  title,
  accent,
  amount,
  message,
  paymentInfo,
}: {
  title: string;
  accent: string;
  amount: number;
  message: string;
  paymentInfo?: string;
}) {
  return (
    <>
      <h2 style={{ color: accent }}>
        {title}
      </h2>

      <p
        style={{
          color: "#dddddd",
          lineHeight: 1.6,
        }}
      >
        {message}
      </p>

      {paymentInfo && (
        <div
          style={{
            ...paymentInfoBox,
            border: `2px solid ${accent}`,
          }}
        >
          <div style={paymentInfoLabel}>
            SEND PAYMENT TO
          </div>

          <div
            style={{
              ...paymentInfoText,
              color: accent,
            }}
          >
            {paymentInfo}
          </div>
        </div>
      )}

      <p>
        Amount due:{" "}
        <strong
          style={{ color: "#00d9ff" }}
        >
          ${Number(amount).toFixed(2)}
        </strong>
      </p>

      <div style={contactGrid}>
        {contactLinks.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            style={contactButton}
          >
            {link.label}
          </a>
        ))}
      </div>
    </>
  );
}

const page = {
  padding: 30,
  color: "#ffffff",
  background: "#000000",
  minHeight: "100vh",
};

const boxStyle = {
  padding: 20,
  border: "1px solid #333333",
  borderRadius: 12,
  background: "#111111",
  marginBottom: 25,
  maxWidth: 800,
};

const confirmButton = {
  marginTop: 20,
  padding: "14px 22px",
  width: "100%",
  background:
    "linear-gradient(90deg, #00b7ff, #ff2fd0)",
  color: "#ffffff",
  border: "none",
  borderRadius: 10,
  fontWeight: "bold",
  fontSize: 18,
};

const methodGrid = {
  display: "grid",
  gap: 12,
  maxWidth: 700,
  gridTemplateColumns:
    "repeat(auto-fit, minmax(140px, 1fr))",
};

const methodButton = {
  padding: 14,
  borderRadius: 10,
  color: "#ffffff",
  cursor: "pointer",
  textAlign: "left" as const,
  fontSize: 16,
  fontWeight: "bold",
};

const paymentBox = {
  marginTop: 30,
  padding: 25,
  border: "1px solid #7d2cff",
  borderRadius: 12,
  background: "#080808",
  maxWidth: 700,
};

const cryptoBanner = {
  width: "100%",
  borderRadius: 14,
  border: "1px solid #7d2cff",
  boxShadow:
    "0 0 25px rgba(255,45,210,.35)",
  marginTop: 20,
  marginBottom: 20,
};

const paymentInfoBox = {
  marginTop: 20,
  padding: 18,
  borderRadius: 12,
  background:
    "rgba(255,255,255,.05)",
  textAlign: "center" as const,
};

const paymentInfoLabel = {
  fontSize: 14,
  color: "#aaaaaa",
  marginBottom: 8,
};

const paymentInfoText = {
  fontSize: 28,
  fontWeight: "bold",
  wordBreak: "break-all" as const,
};

const contactGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 12,
  marginTop: 20,
};

const contactButton = {
  display: "block",
  padding: "13px 14px",
  background:
    "linear-gradient(90deg, #00b7ff, #ff2fd0)",
  color: "#ffffff",
  borderRadius: 10,
  textDecoration: "none",
  fontWeight: "bold",
  textAlign: "center" as const,
};