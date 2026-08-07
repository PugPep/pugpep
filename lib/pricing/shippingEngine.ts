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

const PRIORITY_LABEL = "Priority Shipping";
const PRIORITY_DELIVERY = "Priority Delivery";
const PRIORITY_PRICE = 12;

function normalizeShippingMethod(
  _value: unknown
): ShippingMethod {
  return "standard";
}

function shippingReason(
  value:
    | "none"
    | "lifetime_free_shipping"
    | "order_over_250"
    | "promotion"
    | "admin"
    | "other"
): ShippingPricingResult["shippingDiscountReason"] {
  return value as ShippingPricingResult["shippingDiscountReason"];
}

export function calculateShippingPricing({
  campaign: _campaign,
  marketingRules,

  merchandiseRevenueAfterDiscounts,
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

  const priorityShippingPrice =
    PRIORITY_PRICE;

  const standardShippingPrice =
    priorityShippingPrice;

  const expressShippingPrice =
    priorityShippingPrice;

  const selectedShippingPrice =
    priorityShippingPrice;

  const shippingMethodLabel =
    PRIORITY_LABEL;

  const estimatedDelivery =
    PRIORITY_DELIVERY;

  const lifetimeFreeShippingApplies =
    Boolean(
      marketingRules.lifetime_free_shipping_enabled &&
        hasLifetimeFreeShipping
    );

  const thresholdFreeShippingApplies =
    freeShippingThreshold > 0 &&
    merchandiseRevenue >=
      freeShippingThreshold;

  const promotionFreeShippingApplies =
    Boolean(
      freeStandardShippingOverride
    );

  const freePriorityShippingApplies =
    lifetimeFreeShippingApplies ||
    thresholdFreeShippingApplies ||
    promotionFreeShippingApplies;

  let shippingCollected =
    selectedShippingPrice;

  let shippingDiscountAmount =
    0;

  let merchantPaidShippingAmount =
    0;

  let shippingDiscountReason:
    ShippingPricingResult["shippingDiscountReason"] =
      shippingReason("none");

  if (
    freePriorityShippingApplies
  ) {
    shippingCollected = 0;
    shippingDiscountAmount =
      priorityShippingPrice;
    merchantPaidShippingAmount =
      priorityShippingPrice;

    if (
      lifetimeFreeShippingApplies
    ) {
      shippingDiscountReason =
        shippingReason(
          "lifetime_free_shipping"
        );
    } else if (
      thresholdFreeShippingApplies
    ) {
      shippingDiscountReason =
        shippingReason(
          "order_over_250"
        );
    } else {
      shippingDiscountReason =
        shippingReason(
          "promotion"
        );
    }
  }

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

    shippingDiscountReason =
      shippingDiscountAmount > 0
        ? shippingReason("admin")
        : shippingReason("none");
  }

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

    freeShippingThreshold,

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