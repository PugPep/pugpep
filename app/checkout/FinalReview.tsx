"use client";

import type { PricingResult } from "../../lib/pricing/types";
import { money, styles } from "./checkoutTheme";

export function FinalReview({
  pricing,
  proceeding,
  pricingLoading,
  cartIsEmpty,
  hasMissingOptionIds,
  proceedToPayment,
}: {
  pricing: PricingResult | null;
  proceeding: boolean;
  pricingLoading: boolean;
  cartIsEmpty: boolean;
  hasMissingOptionIds: boolean;
  proceedToPayment: () => void;
}) {
  return (
    <section style={styles.finalCard}>
      <div style={styles.finalHeader}>
        <div>
          <p style={styles.eyebrow}>
            RESEARCH READY
          </p>

          <h2
            style={{
              margin: "5px 0 0",
              color: "#fff",
              fontSize: "clamp(26px,5vw,36px)",
            }}
          >
            Everything Checks Out
          </h2>

          <p style={{ margin: "7px 0 0", color: "#bbb" }}>
            Your savings, rewards, shipping choice, and total are ready.
          </p>
        </div>

        {pricing && (
          <div
            className="checkout-final-total"
            style={styles.totalBadge}
          >
            <span>Your Total</span>

            <strong style={{ fontSize: 26 }}>
              {money(pricing.accounting.customerTotal)}
            </strong>
          </div>
        )}
      </div>

      <div
        className="final-summary-grid"
        style={styles.finalGrid}
      >
        <div>
          {pricing && (
            <>
              <Row
                label="Items"
                value={money(
                  pricing.accounting.regularMerchandiseValue
                )}
              />

              <Discount
                label="Sale Savings"
                value={pricing.discounts.saleDiscount}
              />

              <Discount
                label="Promo Savings"
                value={pricing.discounts.generalPromoDiscount}
              />

              <Discount
                label="Partner Savings"
                value={pricing.discounts.salesRepDiscount}
              />

              <Discount
                label="Referral Savings"
                value={pricing.discounts.referralDiscount}
              />

              <Discount
                label="VIP Savings"
                value={pricing.discounts.vipDiscount}
              />

              <Discount
                label="Rewards Applied"
                value={pricing.discounts.rewardsDiscount}
              />

              <Discount
                label="PugPep Credit"
                value={
                  pricing.discounts.merchantTaxOffsetDiscount
                }
              />

              <Row
                label="After Savings"
                value={money(
                  pricing.accounting
                    .merchandiseRevenueAfterDiscounts
                )}
              />

              <Row
                label={pricing.shipping.shippingMethodLabel}
                value={
                  pricing.shipping.shippingCollected === 0
                    ? "FREE"
                    : money(pricing.shipping.shippingCollected)
                }
                positive={
                  pricing.shipping.shippingCollected === 0
                }
              />

              {pricing.tax.enabled && (
                <Row
                  label="Sales Tax"
                  value={money(pricing.tax.salesTaxAmount)}
                />
              )}
            </>
          )}
        </div>

        <div
          className="checkout-final-action"
          style={styles.actionPanel}
        >
          <button
            type="button"
            disabled={
              proceeding ||
              pricingLoading ||
              cartIsEmpty ||
              hasMissingOptionIds ||
              !pricing
            }
            onClick={proceedToPayment}
            style={{
              ...styles.primaryButton,
              background: "linear-gradient(180deg,#2eea6f,#19b857)",
              border: "2px solid #45d97a",
              boxShadow: "0 0 18px rgba(46,234,111,.32), 0 0 36px rgba(46,234,111,.14)",
              minHeight: 66,
              fontSize: 20,
              opacity:
                proceeding ||
                pricingLoading ||
                cartIsEmpty ||
                hasMissingOptionIds ||
                !pricing
                  ? 0.65
                  : 1,
            }}
          >
            {proceeding
              ? "Preparing the Lab..."
              : pricingLoading
              ? "Verifying Your Research..."
              : "Enter the Lab →"}
          </button>

          <p
            style={{
              margin: "10px 0 0",
              color: "#888",
              fontSize: 12,
              textAlign: "center",
            }}
          >
            Secure checkout · Pricing verified before payment
          </p>
        </div>
      </div>
    </section>
  );
}

function Row({
  label,
  value,
  positive = false,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div style={styles.summaryRow}>
      <span>{label}</span>

      <strong
        style={{
          color: positive ? "#00ff99" : "#fff",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function Discount({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  if (value <= 0) {
    return null;
  }

  return (
    <div style={styles.summaryRow}>
      <span>{label}</span>

      <strong style={{ color: "#00ff99" }}>
        -{money(value)}
      </strong>
    </div>
  );
}