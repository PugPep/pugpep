"use client";

import type { PricingResult } from "../../lib/pricing/types";
import { money, styles } from "./checkoutTheme";

export function RewardsSection({
  rewardPoints,
  pointsToUse,
  setPointsToUse,
  pricing,
}: {
  rewardPoints: number;
  pointsToUse: number;
  setPointsToUse: (value: number) => void;
  pricing: PricingResult | null;
}) {
  return (
    <section style={styles.card}>
      <div style={styles.headingRow}>
        <span style={styles.stepBadge}>3</span>

        <h2 style={styles.sectionTitle}>
          Research Rewards
        </h2>
      </div>

      <p style={{ color: "#ddd", fontSize: 16 }}>
        <strong>PugPoints Available:</strong>{" "}
        <strong style={{ color: "#00ff99" }}>
          {rewardPoints.toLocaleString()}
        </strong>
      </p>

      <label style={styles.label}>
        PugPoints to Redeem

        <input
          type="number"
          min="0"
          max={rewardPoints}
          step="1"
          value={pointsToUse}
          onChange={(event) => {
            const requested = Math.floor(
              Number(event.target.value || 0)
            );

            setPointsToUse(
              Math.max(
                0,
                Math.min(requested, rewardPoints)
              )
            );
          }}
          style={styles.input}
        />
      </label>

      <p
        style={{
          color: "#999",
          fontSize: 14,
          lineHeight: 1.6,
        }}
      >
        <strong>100 PugPoints = $1.00</strong>
        <br />
        Rewards are automatically applied by the pricing engine.
        Certain products or promotions may not be eligible for
        PugPoint redemption.
      </p>

      {pricing && (
        <div
          style={{
            marginTop: 14,
            padding: 14,
            borderRadius: 10,
            background: "rgba(0,255,153,.08)",
            border: "1px solid rgba(0,255,153,.20)",
          }}
        >
          <div
            style={{
              color: "#00ff99",
              fontWeight: 800,
              fontSize: 16,
            }}
          >
            Rewards Applied
          </div>

          <div
            style={{
              color: "#fff",
              marginTop: 6,
            }}
          >
            {pricing.rewards.pointsUsed.toLocaleString()} PugPoints
            redeemed
          </div>

          <div
            style={{
              color: "#00ff99",
              fontWeight: 700,
              marginTop: 4,
            }}
          >
            Savings: {money(pricing.discounts.rewardsDiscount)}
          </div>
        </div>
      )}
    </section>
  );
}

export function PromoSection({
  promoInput,
  setPromoInput,
  appliedPromoCode,
  promoLoading,
  pricingLoading,
  pricing,
  applyPromoCode,
  removePromoCode,
}: {
  promoInput: string;
  setPromoInput: (value: string) => void;
  appliedPromoCode: string | null;
  promoLoading: boolean;
  pricingLoading: boolean;
  pricing: PricingResult | null;
  applyPromoCode: () => void;
  removePromoCode: () => void;
}) {
  return (
    <section style={styles.card}>
      <div style={styles.headingRow}>
        <span style={styles.stepBadge}>4</span>

        <h2 style={styles.sectionTitle}>
          Lab Access Code
        </h2>
      </div>

      <div
        className="checkout-promo-row"
        style={styles.promoRow}
      >
        <input
          placeholder="Enter promo code"
          value={promoInput}
          disabled={promoLoading || pricingLoading}
          onChange={(event) =>
            setPromoInput(
              event.target.value.toUpperCase()
            )
          }
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              applyPromoCode();
            }
          }}
          style={styles.input}
        />

        <button
          type="button"
          disabled={
            promoLoading ||
            pricingLoading ||
            !promoInput.trim()
          }
          onClick={applyPromoCode}
          style={{
            ...styles.secondaryButton,
            opacity:
              promoLoading ||
              pricingLoading ||
              !promoInput.trim()
                ? 0.6
                : 1,
          }}
        >
          {promoLoading ? "Applying..." : "Apply"}
        </button>
      </div>

      {appliedPromoCode && (
        <div
          style={{
            marginTop: 12,
            padding: 11,
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            borderRadius: 10,
            background: "rgba(0,255,153,.08)",
            color: "#00ff99",
          }}
        >
          <span>
            Applied: <strong>{appliedPromoCode}</strong>
          </span>

          <button
            type="button"
            onClick={removePromoCode}
            style={styles.textButton}
          >
            Remove
          </button>
        </div>
      )}

      {pricing?.promo.validation && (
        <p
          style={{
            color:
              pricing.promo.validation.discountAllowed
                ? "#00ff99"
                : "#ffcc66",
            lineHeight: 1.5,
          }}
        >
          {pricing.promo.validation.message}
        </p>
      )}
    </section>
  );
}