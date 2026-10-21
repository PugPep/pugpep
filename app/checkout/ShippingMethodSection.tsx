"use client";

import type {
  PricingResult,
  ShippingMethod,
} from "../../lib/pricing/types";
import { styles } from "./checkoutTheme";

export function ShippingMethodSection({
  shippingMethod,
  setShippingMethod,
  pricing: _pricing,
}: {
  shippingMethod: ShippingMethod;
  setShippingMethod: (value: ShippingMethod) => void;
  pricing: PricingResult | null;
}) {
  const prioritySelected = shippingMethod === "standard";

  return (
    <section
      style={{
        ...styles.card,
        padding: 12,
      }}
    >
      <div
        style={{
          ...styles.headingRow,
          marginBottom: 9,
        }}
      >
        <span style={styles.stepBadge}>2</span>
        <h2 style={styles.sectionTitle}>Delivery Method</h2>
      </div>

      <div
        className="checkout-shipping-grid"
        style={{
          ...styles.shippingGrid,
          gridTemplateColumns: "minmax(0, 1fr)",
          gap: 0,
        }}
      >
        <button
          type="button"
          onClick={() => setShippingMethod("standard")}
          aria-pressed={prioritySelected}
          style={{
            ...styles.shippingButton,
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            width: "100%",
            minHeight: 48,
            padding: "9px 12px",
            boxSizing: "border-box",
            borderColor: prioritySelected ? "#00d9ff" : "#333",
            background: prioritySelected
              ? "linear-gradient(145deg, rgba(0,217,255,.14), rgba(0,0,0,.75))"
              : "#080808",
            boxShadow: prioritySelected
              ? "0 0 12px rgba(0,217,255,.15)"
              : "none",
            cursor: "default",
          }}
        >
          <span
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 2,
              minWidth: 0,
            }}
          >
            <strong style={{ color: "#fff", fontSize: 15, lineHeight: 1.2 }}>
              Priority Shipping
            </strong>
            <span style={{ color: "#c9c9c9", fontSize: 12, lineHeight: 1.2 }}>
              USPS Priority Mail®
            </span>
          </span>
          <strong style={{ color: "#00ff99", fontSize: 17, flexShrink: 0 }}>
            $12
          </strong>
        </button>
      </div>
    </section>
  );
}
