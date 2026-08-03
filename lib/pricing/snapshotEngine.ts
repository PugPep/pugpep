import type {
  AccountingResult,
  CampaignPricingResult,
  CommissionResult,
  DiscountBreakdown,
  PricingSnapshot,
  PricingStep,
  PricingWarning,
  PromoPricingResult,
  ReferralPricingResult,
  RewardsPricingResult,
  ShippingPricingResult,
  TaxPricingResult,
  VipPricingResult,
} from "./types";

import {
  currentIsoDate,
  formatCurrency,
  formatPercent,
  PRICING_ENGINE_VERSION,
  PRICING_SNAPSHOT_VERSION,
  uniqueWarnings,
} from "./utils";

type SnapshotEngineInput = {
  customerId: string;

  campaign: CampaignPricingResult;
  promo: PromoPricingResult;
  referral: ReferralPricingResult;
  rewards: RewardsPricingResult;
  vip: VipPricingResult;
  shipping: ShippingPricingResult;
  tax: TaxPricingResult;
  discounts: DiscountBreakdown;
  accounting: AccountingResult;
  commission: CommissionResult;

  warnings?: PricingWarning[];
};

function buildPricingSteps({
  campaign,
  promo,
  referral,
  rewards,
  vip,
  shipping,
  tax,
  discounts,
  accounting,
  commission,
}: Omit<
  SnapshotEngineInput,
  "customerId" | "warnings"
>): PricingStep[] {
  const steps: PricingStep[] = [];

  steps.push({
    label: "Regular merchandise value",
    amount:
      campaign.regularMerchandiseValue,
    message:
      `Regular merchandise value: ${formatCurrency(
        campaign.regularMerchandiseValue
      )}`,
    category: "revenue",
  });

  if (
    discounts.saleDiscount > 0
  ) {
    steps.push({
      label:
        campaign.primaryCampaignName ||
        "Campaign discount",
      amount:
        -discounts.saleDiscount,
      message:
        `${campaign.primaryCampaignName || "Campaign discount"}: -${formatCurrency(
          discounts.saleDiscount
        )}`,
      category: "discount",
    });
  }

  if (
    discounts.generalPromoDiscount >
    0
  ) {
    steps.push({
      label: "General promo discount",
      amount:
        -discounts.generalPromoDiscount,
      message:
        `General promo discount${promo.appliedPromoCode ? ` (${promo.appliedPromoCode})` : ""}: -${formatCurrency(
          discounts.generalPromoDiscount
        )}`,
      category: "discount",
    });
  } else if (
    promo.validation &&
    promo.appliedPromoSource ===
      "general"
  ) {
    steps.push({
      label: "General promo rule",
      message:
        promo.validation.message ||
        "General promo code did not apply.",
      category: "rule",
    });
  }

  if (
    discounts.salesRepDiscount > 0
  ) {
    steps.push({
      label: "Sales-rep discount",
      amount:
        -discounts.salesRepDiscount,
      message:
        `Sales-rep discount${promo.salesRepName ? ` (${promo.salesRepName})` : ""}: -${formatCurrency(
          discounts.salesRepDiscount
        )}`,
      category: "discount",
    });
  } else if (
    promo.validation &&
    promo.appliedPromoSource ===
      "sales_rep"
  ) {
    steps.push({
      label: "Sales-rep rule",
      message:
        promo.validation.message ||
        "Sales-rep discount did not apply.",
      category: "rule",
    });
  }

  if (
    discounts.referralDiscount > 0
  ) {
    steps.push({
      label:
        "Lifetime referral discount",
      amount:
        -discounts.referralDiscount,
      message:
        `Lifetime referral discount (${formatPercent(
          referral.referralDiscountPercent
        )}): -${formatCurrency(
          discounts.referralDiscount
        )}`,
      category: "discount",
    });
  } else if (
    referral.referralDiscountPercent >
    0
  ) {
    steps.push({
      label:
        "Lifetime referral rule",
      message:
        "Lifetime referral discount was not applied to this order.",
      category: "rule",
    });
  }

  if (
    discounts.vipDiscount > 0
  ) {
    steps.push({
      label: "VIP discount",
      amount:
        -discounts.vipDiscount,
      message:
        `${vip.vipTier} VIP discount (${formatPercent(
          vip.vipDiscountPercent
        )}): -${formatCurrency(
          discounts.vipDiscount
        )}`,
      category: "discount",
    });
  } else {
    steps.push({
      label: "VIP tier",
      message:
        `VIP tier at purchase: ${vip.vipTier}`,
      category: "rule",
    });
  }

  if (
    discounts.rewardsDiscount > 0
  ) {
    steps.push({
      label: "Rewards discount",
      amount:
        -discounts.rewardsDiscount,
      message:
        `Rewards used (${rewards.pointsUsed} points): -${formatCurrency(
          discounts.rewardsDiscount
        )}`,
      category: "discount",
    });
  } else if (
    rewards.requestedPoints > 0
  ) {
    steps.push({
      label: "Rewards rule",
      message:
        "Requested reward points were not applied.",
      category: "rule",
    });
  }

  if (
    discounts.manualDiscount > 0
  ) {
    steps.push({
      label: "Manual discount",
      amount:
        -discounts.manualDiscount,
      message:
        `Manual discount: -${formatCurrency(
          discounts.manualDiscount
        )}`,
      category: "discount",
    });
  }

  if (
    discounts.merchantTaxOffsetDiscount >
    0
  ) {
    steps.push({
      label:
        "Merchant-funded checkout credit",
      amount:
        -discounts.merchantTaxOffsetDiscount,
      message:
        `Merchant-funded checkout credit: -${formatCurrency(
          discounts.merchantTaxOffsetDiscount
        )}`,
      category: "discount",
    });
  }

  steps.push({
    label:
      shipping.shippingMethodLabel,

    amount:
      shipping.shippingCollected,

    message:
      shipping.shippingCollected > 0
        ? `${shipping.shippingMethodLabel} (${shipping.estimatedDelivery}): ${formatCurrency(
            shipping.shippingCollected
          )}`
        : `${shipping.shippingMethodLabel}: Free (${shipping.shippingDiscountReason})`,

    category: "shipping",
  });

  if (
    shipping.merchantPaidShippingAmount >
    0
  ) {
    steps.push({
      label:
        "Merchant-paid shipping",

      amount:
        -shipping.merchantPaidShippingAmount,

      message:
        `Merchant-paid shipping: -${formatCurrency(
          shipping.merchantPaidShippingAmount
        )}`,

      category: "shipping",
    });
  }

  if (tax.taxExempt) {
    steps.push({
      label: "Sales tax",
      amount: 0,
      message:
        `Sales tax: $0.00 (${tax.taxExemptionReason || "tax exempt"})`,
      category: "tax",
    });
  } else if (tax.enabled) {
    steps.push({
      label: "Sales tax",
      amount:
        tax.salesTaxAmount,
      message:
        `Sales tax (${formatPercent(
          tax.salesTaxRate * 100
        )}${tax.salesTaxJurisdiction ? `, ${tax.salesTaxJurisdiction}` : ""}): ${formatCurrency(
          tax.salesTaxAmount
        )}`,
      category: "tax",
    });
  } else {
    steps.push({
      label: "Sales tax",
      amount: 0,
      message:
        "Sales tax: Disabled",
      category: "tax",
    });
  }

  steps.push({
    label: "Product cost",
    amount:
      -accounting.productCostTotal,
    message:
      `Product cost: -${formatCurrency(
        accounting.productCostTotal
      )}`,
    category: "cost",
  });

  steps.push({
    label: "Shipping cost",
    amount:
      -accounting.shippingCost,
    message:
      `Estimated shipping cost: -${formatCurrency(
        accounting.shippingCost
      )}`,
    category: "cost",
  });

  steps.push({
    label: "Packaging cost",
    amount:
      -accounting.packagingCost,
    message:
      `Estimated packaging cost: -${formatCurrency(
        accounting.packagingCost
      )}`,
    category: "cost",
  });

  if (
    accounting.otherDirectCost > 0
  ) {
    steps.push({
      label: "Other direct cost",
      amount:
        -accounting.otherDirectCost,
      message:
        `Other direct cost: -${formatCurrency(
          accounting.otherDirectCost
        )}`,
      category: "cost",
    });
  }

  if (
    commission.commissionAmount >
    0
  ) {
    steps.push({
      label:
        "Sales-rep commission",
      amount:
        -commission.commissionAmount,
      message:
        `Sales-rep commission${commission.salesRepName ? ` (${commission.salesRepName})` : ""}: -${formatCurrency(
          commission.commissionAmount
        )}`,
      category: "commission",
    });
  }

  steps.push({
    label: "Final profit",
    amount:
      accounting.profitAfterCommission,
    message:
      `Final profit: ${formatCurrency(
        accounting.profitAfterCommission
      )}`,
    category: "profit",
  });

  steps.push({
    label: "Final margin",
    message:
      `Final margin: ${formatPercent(
        accounting.profitMarginPercent
      )}`,
    category: "profit",
  });

  steps.push({
    label: "Customer total",
    amount:
      accounting.customerTotal,
    message:
      `Customer total: ${formatCurrency(
        accounting.customerTotal
      )}`,
    category: "revenue",
  });

  return steps;
}

export function createPricingSnapshot({
  customerId,
  campaign,
  promo,
  referral,
  rewards,
  vip,
  shipping,
  tax,
  discounts,
  accounting,
  commission,
  warnings = [],
}: SnapshotEngineInput): PricingSnapshot {
  const combinedWarnings =
    uniqueWarnings([
      ...campaign.warnings,
      ...promo.warnings,
      ...referral.warnings,
      ...rewards.warnings,
      ...tax.warnings,
      ...warnings,
    ]);

  return {
    snapshotVersion:
      PRICING_SNAPSHOT_VERSION,

    pricingEngineVersion:
      PRICING_ENGINE_VERSION,

    createdAt:
      currentIsoDate(),

    customerId,

    primarySaleCampaignId:
      campaign.primaryCampaignId,

    primarySaleCampaignName:
      campaign.primaryCampaignName,

    appliedPromoCode:
      promo.appliedPromoCode,

    appliedPromoSource:
      promo.appliedPromoSource,

    vipTierAtPurchase:
      vip.vipTier,

    qualifiedReferralCount:
      referral.qualifiedReferralCount,

    referralDiscountPercent:
      referral.referralDiscountPercent,

    rewardPointsUsed:
      rewards.pointsUsed,

    rewardsPointsEarned:
      rewards.pointsEarned,

    shippingMethod:
      shipping.shippingMethod,

    shippingMethodLabel:
      shipping.shippingMethodLabel,

    shippingDiscountReason:
      shipping.shippingDiscountReason,

    merchantPaidShippingAmount:
      shipping.merchantPaidShippingAmount,

    taxableSubtotal:
      tax.taxableSubtotal,

    salesTaxRate:
      tax.salesTaxRate,

    salesTaxAmount:
      tax.salesTaxAmount,

    taxProvider:
      tax.provider,

    taxJurisdiction:
      tax.salesTaxJurisdiction,

    merchantTaxOffsetDiscount:
      tax.merchantTaxOffsetDiscount,

    merchantTaxOffsetMode:
      tax.merchantTaxOffsetMode,

    merchantTaxOffsetSourceType:
      tax.merchantTaxOffsetSourceType,

    merchantTaxOffsetSourceId:
      tax.merchantTaxOffsetSourceId,

    merchantTaxOffsetSourceCode:
      tax.merchantTaxOffsetSourceCode,

    merchantTaxOffsetReason:
      tax.merchantTaxOffsetReason,

    discounts,

    accounting,

    commission,

    steps:
      buildPricingSteps({
        campaign,
        promo,
        referral,
        rewards,
        vip,
        shipping,
        tax,
        discounts,
        accounting,
        commission,
      }),

    warnings:
      combinedWarnings,
  };
}