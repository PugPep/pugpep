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

  /*
   * Future promotion and administrator controls.
   */
  freeStandardShippingOverride?: boolean;
  freeExpressShippingOverride?: boolean;
  expressUpgradeOverride?: boolean;

  shippingCollectedOverride?: number;
  estimatedShippingCostOverride?: number;
  estimatedPackagingCostOverride?: number;
};

const STANDARD_LABEL =
  "Standard Shipping";

const STANDARD_DELIVERY =
  "3–5 Business Days";

const EXPRESS_LABEL =
  "Express Shipping";

const EXPRESS_DELIVERY =
  "1–2 Business Days";

function normalizeShippingMethod(
  value: unknown
): ShippingMethod {
  return value === "express"
    ? "express"
    : "standard";
}

export function calculateShippingPricing({
  campaign,
  marketingRules,

  merchandiseRevenueAfterDiscounts,
  hasLifetimeFreeShipping,

  shippingMethod = "standard",

  freeStandardShippingOverride = false,
  freeExpressShippingOverride = false,
  expressUpgradeOverride = false,

  shippingCollectedOverride,
  estimatedShippingCostOverride,
  estimatedPackagingCostOverride,
}: ShippingEngineInput): ShippingPricingResult {
  const selectedMethod =
    normalizeShippingMethod(
      shippingMethod
    );

  const merchandiseRevenue =
    roundCurrency(
      nonNegative(
        merchandiseRevenueAfterDiscounts
      )
    );

  const freeShippingThreshold =
    roundCurrency(
      nonNegative(
        marketingRules.free_shipping_threshold
      )
    );

  const standardShippingPrice =
    roundCurrency(
      nonNegative(
        marketingRules.default_shipping_cost ||
          10
      )
    );

  const expressShippingPrice =
    roundCurrency(
      nonNegative(
        marketingRules.default_express_shipping_cost ||
          45
      )
    );

  const selectedShippingPrice =
    selectedMethod === "express"
      ? expressShippingPrice
      : standardShippingPrice;

  const shippingMethodLabel =
    selectedMethod === "express"
      ? EXPRESS_LABEL
      : STANDARD_LABEL;

  const estimatedDelivery =
    selectedMethod === "express"
      ? EXPRESS_DELIVERY
      : STANDARD_DELIVERY;

  const lifetimeFreeShippingApplies =
    Boolean(
      marketingRules.lifetime_free_shipping_enabled &&
        hasLifetimeFreeShipping
    );

  const thresholdFreeShippingApplies =
    freeShippingThreshold > 0 &&
    merchandiseRevenue >=
      freeShippingThreshold;

  const freeStandardShippingApplies =
    selectedMethod === "standard" &&
    (
      lifetimeFreeShippingApplies ||
      thresholdFreeShippingApplies ||
      freeStandardShippingOverride
    );

  const freeExpressShippingApplies =
    selectedMethod === "express" &&
    freeExpressShippingOverride;

  const expressUpgradeApplied =
    selectedMethod === "express" &&
    expressUpgradeOverride;

  let shippingCollected =
    selectedShippingPrice;

  let shippingDiscountAmount = 0;

  let merchantPaidShippingAmount = 0;

  let shippingDiscountReason:
    ShippingPricingResult["shippingDiscountReason"] =
      "none";

  if (
    freeExpressShippingApplies
  ) {
    shippingCollected = 0;

    shippingDiscountAmount =
      expressShippingPrice;

    merchantPaidShippingAmount =
      expressShippingPrice;

    shippingDiscountReason =
      "campaign";
  } else if (
    expressUpgradeApplied
  ) {
    /*
     * A free express upgrade charges the customer the
     * standard rate while the business absorbs the
     * difference between express and standard.
     */
    shippingCollected =
      standardShippingPrice;

    shippingDiscountAmount =
      roundCurrency(
        Math.max(
          0,
          expressShippingPrice -
            standardShippingPrice
        )
      );

    merchantPaidShippingAmount =
      shippingDiscountAmount;

    shippingDiscountReason =
      "express_upgrade";
  } else if (
    freeStandardShippingApplies
  ) {
    shippingCollected = 0;

    shippingDiscountAmount =
      standardShippingPrice;

    merchantPaidShippingAmount =
      standardShippingPrice;

    if (
      lifetimeFreeShippingApplies
    ) {
      shippingDiscountReason =
        "lifetime";
    } else if (
      thresholdFreeShippingApplies
    ) {
      shippingDiscountReason =
        "threshold";
    } else {
      shippingDiscountReason =
        campaign.hasSaleItems
          ? "campaign"
          : "promo";
    }
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
   * The current flat-rate model uses the selected method's
   * configured price as the estimated carrier expense unless
   * an actual estimate is supplied later.
   */
  const estimatedShippingCost =
    estimatedShippingCostOverride == null
      ? selectedShippingPrice
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

    freeShippingThreshold,

    merchantPaidShippingAmount:
      roundCurrency(
        merchantPaidShippingAmount
      ),

    freeStandardShippingApplied:
      freeStandardShippingApplies,

    expressUpgradeApplied,
  };
}