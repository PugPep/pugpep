"use client";

import type {
  PricingResult,
  ShippingMethod,
} from "../../lib/pricing/types";
import { money, styles } from "./checkoutTheme";

export function ShippingMethodSection({
  shippingMethod,
  setShippingMethod,
  pricing,
}: {
  shippingMethod: ShippingMethod;
  setShippingMethod: (value: ShippingMethod) => void;
  pricing: PricingResult | null;
}) {
  return (
    <section style={styles.card}>
      <div style={styles.headingRow}>
        <span style={styles.stepBadge}>2</span>

        <h2 style={styles.sectionTitle}>
          Delivery Method
        </h2>
      </div>

      <div
        className="checkout-shipping-grid"
        style={styles.shippingGrid}
      >
        <Choice
          selected={shippingMethod === "standard"}
          accent="#00d9ff"
          title="Standard Shipping"
          price="$10"
          delivery="3–5 business days"
          note="Eligible for lifetime and threshold free delivery."
          onClick={() => setShippingMethod("standard")}
        />

        <Choice
          selected={shippingMethod === "express"}
          accent="#ff45d8"
          title="Express Shipping"
          price="$45"
          delivery="1–2 business days"
          note="Fastest delivery option."
          onClick={() => setShippingMethod("express")}
        />
      </div>

      {pricing && (
        <div
          style={{
            marginTop: 13,
            padding: 12,
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            border: "1px solid rgba(0,255,153,.55)",
            borderRadius: 10,
            background:
              "linear-gradient(90deg,rgba(0,255,153,.08),rgba(0,217,255,.06))",
          }}
        >
          <span>
            Selected Delivery:{" "}
            <strong>
              {pricing.shipping.shippingMethodLabel}
            </strong>
          </span>

          <strong style={{ color: "#00ff99" }}>
            {pricing.shipping.shippingCollected === 0
              ? "FREE"
              : money(pricing.shipping.shippingCollected)}
          </strong>
        </div>
      )}
    </section>
  );
}

function Choice({
  selected,
  accent,
  title,
  price,
  delivery,
  note,
  onClick,
}: {
  selected: boolean;
  accent: string;
  title: string;
  price: string;
  delivery: string;
  note: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...styles.shippingButton,
        borderColor: selected ? accent : "#333",
        background: selected
          ? `linear-gradient(145deg, ${accent}22, rgba(0,0,0,.75))`
          : "#080808",
        boxShadow: selected
          ? `0 0 18px ${accent}33`
          : "none",
      }}
    >
      <span
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
        }}
      >
        <strong style={{ fontSize: 17 }}>
          {title}
        </strong>

        <strong
          style={{
            color: "#00ff99",
            fontSize: 19,
          }}
        >
          {price}
        </strong>
      </span>

      <span style={{ color: "#ddd", fontWeight: 700 }}>
        {delivery}
      </span>

      <span style={{ color: "#888", fontSize: 12, lineHeight: 1.5 }}>
        {note}
      </span>
    </button>
  );
}