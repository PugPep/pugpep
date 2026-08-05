import type {
  CampaignPricingResult,
  MarketingRulesRecord,
  ShippingMethod,
  ShippingPricingResult,
} from "./types";

import {
  nonNegative,
  roundCurrency,
} from "./utils";

type ShippingEngineInput = {
  campaign: CampaignPricingResult;
  marketingRules: MarketingRulesRecord;

  merchandiseRevenueAfterDiscounts: number;
  hasLifetimeFreeShipping: boolean;

  shippingMethod?: ShippingMethod;

  freeStandardShippingOverride?: boolean;
  freeExpressShippingOverride?: boolean;
  expressUpgradeOverride?: boolean;

  shippingCollectedOverride?: number;
  estimatedShippingCostOverride?: number;
  estimatedPackagingCostOverride?: number;
};

const PRIORITY_LABEL =
  "Priority Shipping";

const PRIORITY_DELIVERY =
  "Priority Delivery";

const PRIORITY_PRICE =
  12;

function normalizeShippingMethod(
  _value: unknown
): ShippingMethod {
  return "standard";
}

export function calculateShippingPricing({
  campaign: _campaign,
  marketingRules,

  merchandiseRevenueAfterDiscounts:
    _merchandiseRevenueAfterDiscounts,

  hasLifetimeFreeShipping,

  shippingMethod = "standard",

  freeStandardShippingOverride = false,

  shippingCollectedOverride,
  estimatedShippingCostOverride,
  estimatedPackagingCostOverride,
}: ShippingEngineInput): ShippingPricingResult {
  const selectedMethod =
    normalizeShippingMethod(
      shippingMethod
    );

  const priorityShippingPrice =
    PRIORITY_PRICE;

  const standardShippingPrice =
    priorityShippingPrice;

  /*
   * Retained only for compatibility with the existing result type.
   * Express shipping is no longer offered.
   */
  const expressShippingPrice =
    priorityShippingPrice;

  const selectedShippingPrice =
    priorityShippingPrice;

  const shippingMethodLabel =
    PRIORITY_LABEL;

  const estimatedDelivery =
    PRIORITY_DELIVERY;

  /*
   * Only accounts explicitly flagged for lifetime free shipping
   * receive free Priority Shipping.
   *
   * Order-total threshold shipping has been removed.
   */
  const lifetimeFreeShippingApplies =
    Boolean(
      marketingRules.lifetime_free_shipping_enabled &&
        hasLifetimeFreeShipping
    );

  const freePriorityShippingApplies =
    lifetimeFreeShippingApplies ||
    freeStandardShippingOverride;

  let shippingCollected =
    selectedShippingPrice;

  let shippingDiscountAmount =
    0;

  let merchantPaidShippingAmount =
    0;

  let shippingDiscountReason:
    ShippingPricingResult["shippingDiscountReason"] =
      "none";

  if (
    freePriorityShippingApplies
  ) {
    shippingCollected =
      0;

    shippingDiscountAmount =
      priorityShippingPrice;

    merchantPaidShippingAmount =
      priorityShippingPrice;

    shippingDiscountReason =
      lifetimeFreeShippingApplies
        ? "lifetime"
        : "manual";
  }

  /*
   * Explicit administrator override is applied last.
   */
  if (
    shippingCollectedOverride != null
  ) {
    shippingCollected =
      roundCurrency(
        nonNegative(
          shippingCollectedOverride
        )
      );

    shippingDiscountAmount =
      roundCurrency(
        Math.max(
          0,
          selectedShippingPrice -
            shippingCollected
        )
      );

    merchantPaidShippingAmount =
      shippingDiscountAmount;

    if (
      shippingDiscountAmount > 0 &&
      shippingDiscountReason ===
        "none"
    ) {
      shippingDiscountReason =
        "manual";
    }
  }

  /*
   * The business always carries the $12 Priority Shipping cost
   * unless an actual carrier-cost override is supplied.
   *
   * Lifetime members pay $0, but profit still subtracts $12.
   */
  const estimatedShippingCost =
    estimatedShippingCostOverride == null
      ? priorityShippingPrice
      : roundCurrency(
          nonNegative(
            estimatedShippingCostOverride
          )
        );

  const estimatedPackagingCost =
    estimatedPackagingCostOverride == null
      ? roundCurrency(
          nonNegative(
            marketingRules.default_packaging_cost
          )
        )
      : roundCurrency(
          nonNegative(
            estimatedPackagingCostOverride
          )
        );

  return {
    shippingMethod:
      selectedMethod,

    shippingMethodLabel,

    estimatedDelivery,

    standardShippingPrice,

    expressShippingPrice,

    selectedShippingPrice,

    shippingCollected:
      roundCurrency(
        shippingCollected
      ),

    shippingDiscountAmount:
      roundCurrency(
        shippingDiscountAmount
      ),

    shippingDiscountReason,

    estimatedShippingCost,

    estimatedPackagingCost,

    hasLifetimeFreeShipping:
      lifetimeFreeShippingApplies,

    /*
     * Threshold-based free shipping is disabled.
     */
    freeShippingThreshold:
      0,

    merchantPaidShippingAmount:
      roundCurrency(
        merchantPaidShippingAmount
      ),

    freeStandardShippingApplied:
      freePriorityShippingApplies,

    expressUpgradeApplied:
      false,
  };
}