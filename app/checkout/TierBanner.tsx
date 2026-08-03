"use client";

import type { PricingResult } from "../../lib/pricing/types";
import { getTierTheme, styles } from "./checkoutTheme";

export function TierBanner({
  pricing,
}: {
  pricing: PricingResult | null;
}) {
  const tier = pricing?.vip.vipTier || "Stone";
  const theme = getTierTheme(tier);

  return (
    <section
      className="checkout-status-band"
      style={{
        ...styles.statusBand,
        borderColor: theme.border,
        background: theme.background,
        boxShadow: `0 0 24px ${theme.glow}`,
      }}
    >
      <div>
        <p
          style={{
            ...styles.tierEyebrow,
            color: theme.color,
          }}
        >
          YOUR PUGPEP STATUS
        </p>

        <h2
          style={{
            ...styles.tierTitle,
            color: theme.color,
            textShadow: `0 0 14px ${theme.glow}`,
          }}
        >
          {tier} Tier
        </h2>

        <p style={styles.tierDescription}>
          Your tier benefits are automatically applied to this order.
        </p>
      </div>

      <div
        className="checkout-tier-benefits"
        style={styles.tierBenefits}
      >
        <Benefit
          label="Referral Savings"
          value={
            pricing
              ? `${pricing.referral.referralDiscountPercent.toFixed(1)}%`
              : "—"
          }
          theme={theme}
        />

        <Benefit
          label="Rewards Earned"
          value={
            pricing
              ? `${pricing.rewards.pointsEarned} points`
              : "—"
          }
          theme={theme}
        />

        <Benefit
          label="Shipping Status"
          value={
            pricing
              ? pricing.shipping.shippingCollected === 0
                ? "Free"
                : pricing.shipping.shippingMethodLabel
              : "—"
          }
          theme={theme}
        />
      </div>
    </section>
  );
}

function Benefit({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: ReturnType<typeof getTierTheme>;
}) {
  return (
    <span
      style={{
        ...styles.tierBenefit,
        borderColor: theme.border,
        boxShadow: `0 0 12px ${theme.glow}`,
      }}
    >
      {label}

      <strong style={styles.tierBenefitValue}>
        {value}
      </strong>
    </span>
  );
}