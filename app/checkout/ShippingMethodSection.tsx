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
            USPS Priority Mail®
          </span>
        </button>
      </div>
    </section>
  );
}