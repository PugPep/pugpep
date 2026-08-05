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
  const prioritySelected =
    shippingMethod === "standard";

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
        style={{
          ...styles.shippingGrid,
          gridTemplateColumns:
            "minmax(0, 1fr)",
        }}
      >
        <button
          type="button"
          onClick={() =>
            setShippingMethod("standard")
          }
          style={{
            ...styles.shippingButton,
            borderColor: prioritySelected
              ? "#00d9ff"
              : "#333",
            background: prioritySelected
              ? "linear-gradient(145deg, rgba(0,217,255,.14), rgba(0,0,0,.75))"
              : "#080808",
            boxShadow: prioritySelected
              ? "0 0 18px rgba(0,217,255,.22)"
              : "none",
            cursor: "default",
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
            <strong
              style={{
                fontSize: 18,
                color: "#ffffff",
              }}
            >
              Priority Shipping
            </strong>

            <strong
              style={{
                color: "#00ff99",
                fontSize: 20,
              }}
            >
              $12
            </strong>
          </span>

          <span
            style={{
              color: "#dddddd",
              fontWeight: 700,
            }}
          >
            Priority delivery service
          </span>
        </button>
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