import type { PricingResult } from "../../lib/pricing/types";
import type { PendingOrder } from "../../lib/payment/types";
import { money } from "../../lib/payment/utils";

import {
  confirmButton,
  confirmNotice,
  detailsCard,
  detailsSummary,
  grandTotalRow,
  heroTotal,
  stepList,
  stepRow,
  summaryCard,
  summaryEyebrow,
  summaryHeader,
  summaryRow,
  summaryRows,
  summaryTitle,
  trustCard,
  trustIcon,
  trustItem,
} from "./paymentTheme";

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
      <span>{label}</span>

      <strong
        style={{
          color: positive
            ? "#00ff99"
            : "#ffffff",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function DiscountRow({
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
    <div style={summaryRow}>
      <span>{label}</span>

      <strong style={{ color: "#00ff99" }}>
        -{money(value)}
      </strong>
    </div>
  );
}

export function OrderSummary({
  order,
  displayPricing,
  displayTotal,
  taxEnabled,
  confirming,
  confirmOrder,
}: {
  order: PendingOrder;
  displayPricing:
    PricingResult | undefined;
  displayTotal: number;
  taxEnabled: boolean;
  confirming: boolean;
  confirmOrder: () => void;
}) {
  return (
    <>
      <div style={summaryCard}>
        <div style={summaryHeader}>
          <div>
            <p style={summaryEyebrow}>
              ORDER REVIEW
            </p>

            <h2 style={summaryTitle}>
              Your Total
            </h2>
          </div>

          <strong style={heroTotal}>
            {money(displayTotal)}
          </strong>
        </div>

        {displayPricing ? (
          <div style={summaryRows}>
            <SummaryRow
              label="Items"
              value={money(
                displayPricing
                  .accounting
                  .regularMerchandiseValue
              )}
            />

            <DiscountRow
              label="Sale Savings"
              value={
                displayPricing
                  .discounts
                  .saleDiscount
              }
            />

            <DiscountRow
              label="Bundle Savings"
              value={
                displayPricing
                  .discounts
                  .bundleDiscount
              }
            />

            <DiscountRow
              label="Promo Savings"
              value={
                displayPricing
                  .discounts
                  .generalPromoDiscount
              }
            />

            <DiscountRow
              label="Partner Savings"
              value={
                displayPricing
                  .discounts
                  .salesRepDiscount
              }
            />

            <DiscountRow
              label="Referral Savings"
              value={
                displayPricing
                  .discounts
                  .referralDiscount
              }
            />

            <DiscountRow
              label="Hero Appreciation"
              value={
                displayPricing
                  .discounts
                  .heroDiscount
              }
            />

            <DiscountRow
              label="PugPoints Applied"
              value={
                displayPricing
                  .discounts
                  .rewardsDiscount
              }
            />

            <DiscountRow
              label="VIP Savings"
              value={
                displayPricing
                  .discounts
                  .vipDiscount
              }
            />

            <DiscountRow
              label="PugPep Credit"
              value={
                displayPricing
                  .discounts
                  .merchantTaxOffsetDiscount
              }
            />

            <SummaryRow
              label="After Savings"
              value={money(
                displayPricing
                  .accounting
                  .merchandiseRevenueAfterDiscounts
              )}
            />

            <SummaryRow
              label={
                displayPricing
                  .shipping
                  .shippingMethodLabel
              }
              value={
                displayPricing
                  .shipping
                  .shippingCollected ===
                0
                  ? "FREE"
                  : money(
                      displayPricing
                        .shipping
                        .shippingCollected
                    )
              }
              positive={
                displayPricing
                  .shipping
                  .shippingCollected ===
                0
              }
            />

            {taxEnabled && (
              <SummaryRow
                label="Sales Tax"
                value={money(
                  displayPricing
                    .tax
                    .salesTaxAmount
                )}
              />
            )}
          </div>
        ) : (
          <div style={summaryRows}>
            <SummaryRow
              label="Items"
              value={money(
                Number(
                  order.subtotal ||
                  0
                )
              )}
            />

            <DiscountRow
              label="Savings"
              value={Number(
                order.totalDiscount ||
                0
              )}
            />

            <SummaryRow
              label={
                order.shippingMethodLabel ||
                "Delivery"
              }
              value={
                Number(
                  order.shipping ||
                  0
                ) === 0
                  ? "FREE"
                  : money(
                      Number(
                        order.shipping ||
                        0
                      )
                    )
              }
              positive={
                Number(
                  order.shipping ||
                  0
                ) === 0
              }
            />
          </div>
        )}

        <div style={grandTotalRow}>
          <span>
            Amount Due
          </span>

          <strong>
            {money(displayTotal)}
          </strong>
        </div>
      </div>

      {displayPricing && (
        <details style={detailsCard}>
          <summary style={detailsSummary}>
            Order Breakdown
          </summary>

          <div style={stepList}>
            {displayPricing
              .snapshot
              .steps
              .filter(
                (step) => {
                  if (
                    step.category ===
                      "cost" ||
                    step.category ===
                      "commission" ||
                    step.category ===
                      "profit"
                  ) {
                    return false;
                  }

                  if (
                    !taxEnabled &&
                    step.category ===
                      "tax"
                  ) {
                    return false;
                  }

                  return true;
                }
              )
              .map(
                (
                  step,
                  index
                ) => (
                  <div
                    key={`${step.label}-${index}`}
                    style={stepRow}
                  >
                    {step.message}
                  </div>
                )
              )}
          </div>
        </details>
      )}

      <div style={trustCard}>
        <div style={trustItem}>
          <span style={trustIcon}>
            ✓
          </span>
          Secure checkout
        </div>

        <div style={trustItem}>
          <span style={trustIcon}>
            ✓
          </span>
          Delivery details confirmed
        </div>

        <div style={trustItem}>
          <span style={trustIcon}>
            ✓
          </span>
          Pricing verified before submission
        </div>
      </div>

      <button
        type="button"
        onClick={confirmOrder}
        disabled={
          confirming ||
          Boolean(order.confirmed)
        }
        style={{
          ...confirmButton,

          opacity:
            confirming ||
            order.confirmed
              ? 0.65
              : 1,

          cursor:
            confirming ||
            order.confirmed
              ? "not-allowed"
              : "pointer",
        }}
      >
        {confirming
          ? "Confirming Order..."
          : order.confirmed
          ? "Order Confirmed"
          : "Confirm Order →"}
      </button>

      <p style={confirmNotice}>
        After sending payment with the selected method, click Confirm Order.
      </p>
    </>
  );
}