"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type {
  PricingResult,
  PricingSnapshot,
} from "../../lib/pricing/types";

type PaymentMethod =
  | "cashapp"
  | "venmo"
  | "applecash"
  | "crypto";

type PendingCustomer = {
  organization: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
};

type ConfirmedOrder = {
  id: string;
  userId: string | null;
  orderNumber: string;
  customer: PendingCustomer;

  paymentMethod?: PaymentMethod;

  pricing?: PricingResult;
  pricingSnapshot?: PricingSnapshot;

  shippingMethod?: "standard" | "express";
  shippingMethodLabel?: string;

  subtotal: number;
  shipping: number;
  salesTax?: number;

  rewardPointsUsed?: number;
  rewardDiscount?: number;

  promoCode?: string | null;
  promoDiscount?: number;
  totalDiscount?: number;

  total: number;

  createdAt: string;
  confirmed?: boolean;
};

function money(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function formatPaymentMethod(
  value?: PaymentMethod
) {
  switch (value) {
    case "cashapp":
      return "Cash App";

    case "venmo":
      return "Venmo";

    case "applecash":
      return "Apple Cash";

    case "crypto":
      return "Crypto";

    default:
      return "Selected Payment Method";
  }
}

function formatDate(value?: string) {
  if (!value) {
    return "Just now";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Just now";
  }

  return date.toLocaleString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  );
}

function getTierTheme(
  tier: string
) {
  const normalized =
    tier.trim().toLowerCase();

  const themes: Record<
    string,
    {
      color: string;
      glow: string;
      background: string;
      border: string;
    }
  > = {
    stone: {
      color: "#b8bcc4",
      glow:
        "rgba(184,188,196,.45)",
      background:
        "linear-gradient(135deg, rgba(184,188,196,.14), rgba(0,217,255,.07))",
      border: "#b8bcc4",
    },

    iron: {
      color: "#8f9aa8",
      glow:
        "rgba(143,154,168,.5)",
      background:
        "linear-gradient(135deg, rgba(143,154,168,.18), rgba(0,217,255,.07))",
      border: "#8f9aa8",
    },

    bronze: {
      color: "#cd7f32",
      glow:
        "rgba(205,127,50,.55)",
      background:
        "linear-gradient(135deg, rgba(205,127,50,.20), rgba(255,47,208,.08))",
      border: "#cd7f32",
    },

    silver: {
      color: "#d8dde6",
      glow:
        "rgba(216,221,230,.55)",
      background:
        "linear-gradient(135deg, rgba(216,221,230,.18), rgba(0,217,255,.09))",
      border: "#d8dde6",
    },

    gold: {
      color: "#ffd700",
      glow:
        "rgba(255,215,0,.6)",
      background:
        "linear-gradient(135deg, rgba(255,215,0,.22), rgba(255,47,208,.09))",
      border: "#ffd700",
    },

    platinum: {
      color: "#e5e4e2",
      glow:
        "rgba(229,228,226,.62)",
      background:
        "linear-gradient(135deg, rgba(229,228,226,.20), rgba(0,217,255,.10))",
      border: "#e5e4e2",
    },

    emerald: {
      color: "#00ff99",
      glow:
        "rgba(0,255,153,.6)",
      background:
        "linear-gradient(135deg, rgba(0,255,153,.20), rgba(0,217,255,.10))",
      border: "#00ff99",
    },

    sapphire: {
      color: "#2f80ff",
      glow:
        "rgba(47,128,255,.62)",
      background:
        "linear-gradient(135deg, rgba(47,128,255,.22), rgba(255,47,208,.09))",
      border: "#2f80ff",
    },

    ruby: {
      color: "#ff3b5c",
      glow:
        "rgba(255,59,92,.62)",
      background:
        "linear-gradient(135deg, rgba(255,59,92,.22), rgba(255,47,208,.10))",
      border: "#ff3b5c",
    },

    diamond: {
      color: "#7df9ff",
      glow:
        "rgba(125,249,255,.7)",
      background:
        "linear-gradient(135deg, rgba(125,249,255,.22), rgba(255,47,208,.12))",
      border: "#7df9ff",
    },
  };

  return (
    themes[normalized] || {
      color: "#ff45d8",
      glow:
        "rgba(255,69,216,.55)",
      background:
        "linear-gradient(135deg, rgba(255,69,216,.16), rgba(0,217,255,.10))",
      border: "#ff45d8",
    }
  );
}

export default function OrderConfirmedPage() {
  const [
    order,
    setOrder,
  ] =
    useState<ConfirmedOrder | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    queryOrderNumber,
    setQueryOrderNumber,
  ] =
    useState<string | null>(
      null
    );

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search
      );

    setQueryOrderNumber(
      params.get("order")
    );

    try {
      const savedOrder =
        localStorage.getItem(
          "pugpep_order"
        );

      if (savedOrder) {
        setOrder(
          JSON.parse(
            savedOrder
          ) as ConfirmedOrder
        );
      }
    } catch (error) {
      console.error(
        "Unable to load confirmed order:",
        error
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const displayOrderNumber =
    queryOrderNumber ||
    order?.orderNumber ||
    "Confirmed";

  const pricing =
    order?.pricing;

  const total =
    pricing?.accounting
      .customerTotal ??
    Number(
      order?.total || 0
    );

  const pointsEarned =
    pricing?.rewards
      .pointsEarned ??
    0;

  const tier =
    pricing?.vip
      .vipTier ||
    "Stone";

  const tierTheme =
    useMemo(
      () =>
        getTierTheme(
          tier
        ),
      [tier]
    );

  const deliveryLabel =
    pricing?.shipping
      .shippingMethodLabel ||
    order?.shippingMethodLabel ||
    "Delivery";

  const deliveryAmount =
    pricing?.shipping
      .shippingCollected ??
    Number(
      order?.shipping || 0
    );

  const taxEnabled =
    Boolean(
      pricing?.tax.enabled
    );

  if (loading) {
    return (
      <main style={page}>
        <div style={container}>
          <div style={loadingCard}>
            <div style={loadingRing} />

            <h1 style={title}>
              Loading Confirmation
            </h1>

            <p style={muted}>
              Preparing your order details...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main style={page}>
        <div style={container}>
          <div style={emptyCard}>
            <div style={emptyIcon}>
              🧪
            </div>

            <h1 style={title}>
              Order Confirmed
            </h1>

            <p style={muted}>
              Your order was submitted, but the local confirmation details are no longer available.
            </p>

            <div style={actionGrid}>
              <Link
                href="/account"
                style={primaryButton}
              >
                View My Lab
              </Link>

              <Link
                href="/"
                style={secondaryButton}
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={page}>
      <div style={container}>
        <section style={heroCard}>
          <div style={successIcon}>
            ✓
          </div>

          <p style={eyebrow}>
            ORDER CONFIRMED
          </p>

          <h1 style={title}>
            Everything Is Set
          </h1>

          <p style={heroText}>
            Your order has been received. A confirmation email has been sent, and we’ll notify you again when delivery information is available.
          </p>

          <div style={orderNumberBox}>
            <span style={orderNumberLabel}>
              ORDER NUMBER
            </span>

            <strong style={orderNumberValue}>
              {displayOrderNumber}
            </strong>
          </div>
        </section>

        <div
          className="confirmed-grid"
          style={mainGrid}
        >
          <section style={stack}>
            <div style={card}>
              <div style={sectionHeader}>
                <div>
                  <p style={sectionEyebrow}>
                    ORDER DETAILS
                  </p>

                  <h2 style={sectionTitle}>
                    Confirmation Summary
                  </h2>
                </div>

                <span style={confirmedBadge}>
                  CONFIRMED
                </span>
              </div>

              <InfoRow
                label="Order Number"
                value={
                  displayOrderNumber
                }
              />

              <InfoRow
                label="Confirmed"
                value={formatDate(
                  order.createdAt
                )}
              />

              <InfoRow
                label="Payment Method"
                value={formatPaymentMethod(
                  order.paymentMethod
                )}
              />

              <InfoRow
                label="Delivery Method"
                value={
                  deliveryAmount === 0
                    ? `${deliveryLabel} — Free`
                    : `${deliveryLabel} — ${money(
                        deliveryAmount
                      )}`
                }
              />

              <InfoRow
                label="Delivery Address"
                value={`${order.customer.address}, ${order.customer.city}, ${order.customer.state} ${order.customer.zip}`}
              />
            </div>

            <div style={card}>
              <p style={sectionEyebrow}>
                WHAT HAPPENS NEXT
              </p>

              <h2 style={sectionTitle}>
                We’ll Keep You Updated
              </h2>

              <div style={timeline}>
                <TimelineStep
                  title="Order Confirmed"
                  description="Your order has been received."
                  complete
                />

                <TimelineStep
                  title="Payment Verification"
                  description="Our team will verify the selected payment method."
                />

                <TimelineStep
                  title="Preparing Your Package"
                  description="Your order will be prepared for delivery."
                />

                <TimelineStep
                  title="Released for Delivery"
                  description="Tracking information will be sent when available."
                />
              </div>
            </div>
          </section>

          <aside style={stack}>
            <div style={summaryCard}>
              <p style={summaryEyebrow}>
                ORDER TOTAL
              </p>

              <strong style={totalValue}>
                {money(total)}
              </strong>

              <div style={summaryRows}>
                <SummaryRow
                  label="Items"
                  value={money(
                    pricing?.accounting
                      .regularMerchandiseValue ??
                    order.subtotal
                  )}
                />

                {pricing &&
                  pricing.discounts
                    .totalDiscount >
                    0 && (
                    <SummaryRow
                      label="Savings"
                      value={`-${money(
                        pricing
                          .discounts
                          .totalDiscount
                      )}`}
                      positive
                    />
                  )}

                <SummaryRow
                  label={deliveryLabel}
                  value={
                    deliveryAmount === 0
                      ? "FREE"
                      : money(
                          deliveryAmount
                        )
                  }
                  positive={
                    deliveryAmount === 0
                  }
                />

                {taxEnabled && (
                  <SummaryRow
                    label="Sales Tax"
                    value={money(
                      pricing?.tax
                        .salesTaxAmount ||
                        0
                    )}
                  />
                )}
              </div>

              <div style={amountDueRow}>
                <span>
                  Confirmed Total
                </span>

                <strong>
                  {money(total)}
                </strong>
              </div>
            </div>

            <div
              style={{
                ...tierCard,

                borderColor:
                  tierTheme.border,

                background:
                  tierTheme.background,

                boxShadow:
                  `0 0 22px ${tierTheme.glow}`,
              }}
            >
              <p
                style={{
                  ...sectionEyebrow,
                  color:
                    tierTheme.color,
                }}
              >
                LAB STATUS
              </p>

              <h2
                style={{
                  ...tierTitle,
                  color:
                    tierTheme.color,

                  textShadow:
                    `0 0 13px ${tierTheme.glow}`,
                }}
              >
                {tier}
              </h2>

              <div style={tierStats}>
                <StatBox
                  label="PugPoints Earned"
                  value={`+${pointsEarned}`}
                />

                <StatBox
                  label="Delivery"
                  value={
                    deliveryAmount === 0
                      ? "Free"
                      : deliveryLabel
                  }
                />
              </div>
            </div>

            <div style={actionCard}>
              <Link
                href="/account"
                style={primaryButton}
              >
                View My Lab
              </Link>

              <Link
                href="/"
                style={secondaryButton}
              >
                Continue Shopping
              </Link>
            </div>
          </aside>
        </div>

        <style jsx>{`
          @media (max-width: 900px) {
            .confirmed-grid {
              grid-template-columns:
                minmax(0, 1fr) !important;
            }
          }
        `}</style>
      </div>
    </main>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={infoRow}>
      <span style={infoLabel}>
        {label}
      </span>

      <strong style={infoValue}>
        {value}
      </strong>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  positive = false,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div style={summaryRow}>
      <span>
        {label}
      </span>

      <strong
        style={{
          color:
            positive
              ? "#00ff99"
              : "#ffffff",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function TimelineStep({
  title,
  description,
  complete = false,
}: {
  title: string;
  description: string;
  complete?: boolean;
}) {
  return (
    <div style={timelineRow}>
      <div
        style={{
          ...timelineDot,

          borderColor:
            complete
              ? "#00ff99"
              : "#00d9ff",

          background:
            complete
              ? "rgba(0,255,153,.16)"
              : "rgba(0,217,255,.10)",

          color:
            complete
              ? "#00ff99"
              : "#00d9ff",
        }}
      >
        {complete ? "✓" : "•"}
      </div>

      <div>
        <strong style={timelineTitle}>
          {title}
        </strong>

        <p style={timelineText}>
          {description}
        </p>
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={statBox}>
      <span style={statLabel}>
        {label}
      </span>

      <strong style={statValue}>
        {value}
      </strong>
    </div>
  );
}

const page = {
  minHeight: "100vh",
  overflowX: "hidden" as const,
  padding:
    "clamp(16px, 3vw, 32px)",
  background:
    "radial-gradient(circle at 12% 0%, rgba(255,47,208,.15), transparent 27%), radial-gradient(circle at 88% 4%, rgba(0,217,255,.15), transparent 30%), radial-gradient(circle at 50% 100%, rgba(0,255,153,.06), transparent 36%), #000",
  color: "#ffffff",
};

const container = {
  width: "100%",
  maxWidth: 1200,
  margin: "0 auto",
};

const heroCard = {
  padding:
    "clamp(24px, 5vw, 42px)",
  display: "grid",
  justifyItems: "center",
  textAlign: "center" as const,
  border:
    "1px solid rgba(0,255,153,.45)",
  borderRadius: 20,
  background:
    "linear-gradient(135deg, rgba(0,255,153,.10), rgba(0,217,255,.08), rgba(255,47,208,.07))",
  boxShadow:
    "0 0 30px rgba(0,255,153,.10)",
};

const successIcon = {
  width: 68,
  height: 68,
  display: "grid",
  placeItems: "center",
  border:
    "2px solid #00ff99",
  borderRadius: 999,
  background:
    "rgba(0,255,153,.12)",
  color: "#00ff99",
  fontSize: 34,
  fontWeight: 900,
  boxShadow:
    "0 0 24px rgba(0,255,153,.26)",
};

const eyebrow = {
  margin:
    "16px 0 0",
  color: "#00ff99",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: ".15em",
};

const title = {
  margin: "7px 0 0",
  color: "#ff45d8",
  fontSize:
    "clamp(34px, 7vw, 52px)",
  textShadow:
    "0 0 16px rgba(255,47,208,.28)",
};

const heroText = {
  maxWidth: 700,
  margin: "12px 0 0",
  color: "#c9c9c9",
  lineHeight: 1.65,
  fontSize: 16,
};

const orderNumberBox = {
  marginTop: 20,
  padding: "12px 17px",
  display: "grid",
  gap: 4,
  border:
    "1px solid rgba(0,217,255,.5)",
  borderRadius: 12,
  background:
    "rgba(0,217,255,.07)",
};

const orderNumberLabel = {
  color: "#7df9ff",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: ".14em",
};

const orderNumberValue = {
  fontSize: 18,
  overflowWrap:
    "anywhere" as const,
};

const mainGrid = {
  marginTop: 24,
  display: "grid",
  gridTemplateColumns:
    "minmax(0, 1.08fr) minmax(360px, .92fr)",
  gap: 24,
  alignItems: "start",
};

const stack = {
  display: "grid",
  gap: 18,
};

const card = {
  padding:
    "clamp(18px, 3vw, 24px)",
  border:
    "1px solid rgba(0,217,255,.42)",
  borderRadius: 16,
  background:
    "linear-gradient(145deg, rgba(8,8,12,.96), rgba(15,8,18,.94))",
  boxShadow:
    "0 0 18px rgba(0,217,255,.08)",
};

const sectionHeader = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 14,
  flexWrap: "wrap" as const,
  marginBottom: 12,
};

const sectionEyebrow = {
  margin: 0,
  color: "#00d9ff",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: ".13em",
};

const sectionTitle = {
  margin: "5px 0 0",
  color: "#7df9ff",
  fontSize:
    "clamp(22px, 4vw, 29px)",
};

const confirmedBadge = {
  padding: "7px 10px",
  border:
    "1px solid #00ff99",
  borderRadius: 999,
  background:
    "rgba(0,255,153,.08)",
  color: "#00ff99",
  fontSize: 11,
  fontWeight: 900,
};

const infoRow = {
  minHeight: 48,
  display: "grid",
  gridTemplateColumns:
    "145px minmax(0, 1fr)",
  gap: 14,
  alignItems: "center",
  borderBottom:
    "1px solid rgba(255,255,255,.08)",
};

const infoLabel = {
  color: "#8f8f8f",
  fontSize: 12,
  fontWeight: 900,
  textTransform:
    "uppercase" as const,
  letterSpacing: ".05em",
};

const infoValue = {
  color: "#eeeeee",
  overflowWrap:
    "anywhere" as const,
};

const timeline = {
  marginTop: 18,
  display: "grid",
  gap: 16,
};

const timelineRow = {
  display: "grid",
  gridTemplateColumns:
    "34px minmax(0, 1fr)",
  gap: 12,
  alignItems: "start",
};

const timelineDot = {
  width: 30,
  height: 30,
  display: "grid",
  placeItems: "center",
  border: "1px solid",
  borderRadius: 999,
  fontWeight: 900,
};

const timelineTitle = {
  color: "#ffffff",
};

const timelineText = {
  margin: "4px 0 0",
  color: "#999999",
  lineHeight: 1.5,
  fontSize: 13,
};

const summaryCard = {
  padding:
    "clamp(18px, 3vw, 24px)",
  border:
    "1px solid rgba(255,47,208,.52)",
  borderRadius: 17,
  background:
    "linear-gradient(145deg, rgba(16,7,18,.96), rgba(5,12,16,.96))",
  boxShadow:
    "0 0 22px rgba(255,47,208,.11)",
};

const summaryEyebrow = {
  margin: 0,
  color: "#00d9ff",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: ".13em",
};

const totalValue = {
  display: "block",
  marginTop: 6,
  color: "#00ff99",
  fontSize:
    "clamp(32px, 6vw, 44px)",
  textShadow:
    "0 0 16px rgba(0,255,153,.22)",
};

const summaryRows = {
  marginTop: 15,
};

const summaryRow = {
  minHeight: 46,
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 16,
  borderBottom:
    "1px solid rgba(255,255,255,.08)",
};

const amountDueRow = {
  minHeight: 70,
  marginTop: 14,
  padding: "0 15px",
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 16,
  border:
    "1px solid rgba(0,255,153,.42)",
  borderRadius: 12,
  background:
    "linear-gradient(90deg, rgba(0,255,153,.10), rgba(0,217,255,.07))",
  fontSize:
    "clamp(20px, 4vw, 26px)",
};

const tierCard = {
  padding:
    "clamp(18px, 3vw, 24px)",
  border: "1px solid",
  borderRadius: 17,
};

const tierTitle = {
  margin: "7px 0 0",
  fontSize:
    "clamp(28px, 5vw, 38px)",
};

const tierStats = {
  marginTop: 16,
  display: "grid",
  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",
  gap: 10,
};

const statBox = {
  padding: 12,
  display: "grid",
  gap: 5,
  border:
    "1px solid rgba(255,255,255,.16)",
  borderRadius: 11,
  background:
    "rgba(0,0,0,.30)",
};

const statLabel = {
  color: "#9b9b9b",
  fontSize: 11,
  fontWeight: 800,
  textTransform:
    "uppercase" as const,
};

const statValue = {
  color: "#ffffff",
  fontSize: 18,
};

const actionCard = {
  padding: 17,
  display: "grid",
  gap: 11,
  border:
    "1px solid rgba(0,217,255,.35)",
  borderRadius: 15,
  background:
    "rgba(8,8,12,.86)",
};

const primaryButton = {
  minHeight: 54,
  display: "grid",
  placeItems: "center",
  padding: "13px 18px",
  border:
    "2px solid #45d97a",
  borderRadius: 12,
  background:
    "linear-gradient(180deg, #2eea6f, #19b857)",
  color: "#ffffff",
  textDecoration: "none",
  fontSize: 17,
  fontWeight: 900,
  boxShadow:
    "0 0 17px rgba(46,234,111,.24)",
};

const secondaryButton = {
  minHeight: 50,
  display: "grid",
  placeItems: "center",
  padding: "12px 17px",
  border:
    "1px solid #00d9ff",
  borderRadius: 11,
  background:
    "rgba(0,217,255,.07)",
  color: "#7df9ff",
  textDecoration: "none",
  fontWeight: 900,
};

const loadingCard = {
  maxWidth: 520,
  margin: "12vh auto 0",
  padding: 32,
  display: "grid",
  justifyItems: "center",
  textAlign: "center" as const,
  border:
    "1px solid rgba(0,217,255,.38)",
  borderRadius: 17,
  background:
    "rgba(8,8,12,.9)",
};

const loadingRing = {
  width: 46,
  height: 46,
  border:
    "4px solid rgba(0,217,255,.18)",
  borderTopColor:
    "#ff45d8",
  borderRadius: 999,
};

const emptyCard = {
  maxWidth: 620,
  margin: "9vh auto 0",
  padding: 34,
  display: "grid",
  justifyItems: "center",
  gap: 12,
  textAlign: "center" as const,
  border:
    "1px solid rgba(0,217,255,.38)",
  borderRadius: 18,
  background:
    "rgba(8,8,12,.92)",
};

const emptyIcon = {
  fontSize: 44,
};

const actionGrid = {
  width: "100%",
  maxWidth: 430,
  marginTop: 8,
  display: "grid",
  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",
  gap: 11,
};

const muted = {
  color: "#999999",
  lineHeight: 1.6,
};