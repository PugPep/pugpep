import type {
  AccountingResult,
  CampaignPricingResult,
  DiscountBreakdown,
  ShippingPricingResult,
  TaxPricingResult,
} from "./types";

import {
  calculateMarginPercent,
  nonNegative,
  roundCurrency,
  sumCurrency,
} from "./utils";

type AccountingEngineInput = {
  campaign: CampaignPricingResult;
  shipping: ShippingPricingResult;
  tax: TaxPricingResult;

  generalPromoDiscount?: number;
  salesRepDiscount?: number;
  referralDiscount?: number;
  rewardsDiscount?: number;
  vipDiscount?: number;
  manualDiscount?: number;

  otherDirectCost?: number;

  /*
   * Commission is optional because commission is calculated
   * after profit before commission is known. The orchestrator
   * can call this module once with 0, calculate commission,
   * then call it again with the final commission amount.
   */
  commissionAmount?: number;
};

export type AccountingEngineResult = {
  discounts: DiscountBreakdown;
  accounting: AccountingResult;
};

export function calculateAccounting({
  campaign,
  shipping,
  tax,

  generalPromoDiscount = 0,
  salesRepDiscount = 0,
  referralDiscount = 0,
  rewardsDiscount = 0,
  vipDiscount = 0,
  manualDiscount = 0,

  otherDirectCost = 0,
  commissionAmount = 0,
}: AccountingEngineInput): AccountingEngineResult {
  const saleDiscount =
    roundCurrency(
      nonNegative(
        campaign.saleDiscount
      )
    );

  const safeGeneralPromoDiscount =
    roundCurrency(
      nonNegative(
        generalPromoDiscount
      )
    );

  const safeSalesRepDiscount =
    roundCurrency(
      nonNegative(
        salesRepDiscount
      )
    );

  const safeReferralDiscount =
    roundCurrency(
      nonNegative(
        referralDiscount
      )
    );

  const safeRewardsDiscount =
    roundCurrency(
      nonNegative(
        rewardsDiscount
      )
    );

  const safeVipDiscount =
    roundCurrency(
      nonNegative(
        vipDiscount
      )
    );

  const safeManualDiscount =
    roundCurrency(
      nonNegative(
        manualDiscount
      )
    );

  const merchantTaxOffsetDiscount =
    roundCurrency(
      nonNegative(
        tax.merchantTaxOffsetDiscount
      )
    );

  const totalDiscount =
    sumCurrency([
      saleDiscount,
      safeGeneralPromoDiscount,
      safeSalesRepDiscount,
      safeReferralDiscount,
      safeRewardsDiscount,
      safeVipDiscount,
      safeManualDiscount,
      merchantTaxOffsetDiscount,
    ]);

  const discounts: DiscountBreakdown = {
    saleDiscount,

    generalPromoDiscount:
      safeGeneralPromoDiscount,

    salesRepDiscount:
      safeSalesRepDiscount,

    referralDiscount:
      safeReferralDiscount,

    rewardsDiscount:
      safeRewardsDiscount,

    vipDiscount:
      safeVipDiscount,

    manualDiscount:
      safeManualDiscount,

    merchantTaxOffsetDiscount,

    totalDiscount,
  };

  /*
   * Campaign revenue already includes the campaign-sale discount.
   * Only discounts applied after campaign pricing are deducted here.
   */
  const postCampaignDiscounts =
    sumCurrency([
      safeGeneralPromoDiscount,
      safeSalesRepDiscount,
      safeReferralDiscount,
      safeRewardsDiscount,
      safeVipDiscount,
      safeManualDiscount,
      merchantTaxOffsetDiscount,
    ]);

  const merchandiseRevenueAfterDiscounts =
    roundCurrency(
      Math.max(
        0,
        campaign.campaignMerchandiseRevenue -
          postCampaignDiscounts
      )
    );

  const shippingCollected =
    roundCurrency(
      nonNegative(
        shipping.shippingCollected
      )
    );

  const salesTaxCollected =
    roundCurrency(
      nonNegative(
        tax.salesTaxAmount
      )
    );

  /*
   * Customer total includes sales tax.
   */
  const customerTotal =
    sumCurrency([
      merchandiseRevenueAfterDiscounts,
      shippingCollected,
      salesTaxCollected,
    ]);

  /*
   * Gross revenue is the merchandise and shipping value before
   * non-campaign discounts. Sales tax is excluded because it is
   * a liability rather than merchant revenue.
   */
  const grossRevenue =
    sumCurrency([
      campaign.campaignMerchandiseRevenue,
      shippingCollected,
    ]);

  /*
   * Net revenue is merchant revenue after all discounts.
   * Sales tax remains excluded.
   */
  const netRevenue =
    sumCurrency([
      merchandiseRevenueAfterDiscounts,
      shippingCollected,
    ]);

  const productCostTotal =
    sumCurrency(
      campaign.items.map(
        (item) =>
          item.lineCost
      )
    );

  const shippingCost =
    roundCurrency(
      nonNegative(
        shipping.estimatedShippingCost
      )
    );

  const packagingCost =
    roundCurrency(
      nonNegative(
        shipping.estimatedPackagingCost
      )
    );

  const safeOtherDirectCost =
    roundCurrency(
      nonNegative(
        otherDirectCost
      )
    );

  const profitBeforeCommission =
    roundCurrency(
      netRevenue -
        productCostTotal -
        shippingCost -
        packagingCost -
        safeOtherDirectCost
    );

  const safeCommissionAmount =
    roundCurrency(
      nonNegative(
        commissionAmount
      )
    );

  const profitAfterCommission =
    roundCurrency(
      profitBeforeCommission -
        safeCommissionAmount
    );

  const profitMarginPercent =
    calculateMarginPercent(
      netRevenue,
      profitAfterCommission
    );

  const accounting: AccountingResult = {
    regularMerchandiseValue:
      roundCurrency(
        campaign.regularMerchandiseValue
      ),

    merchandiseRevenueAfterDiscounts,

    shippingCollected,

    salesTaxCollected,

    customerTotal,

    grossRevenue,

    netRevenue,

    productCostTotal,

    shippingCost,

    packagingCost,

    otherDirectCost:
      safeOtherDirectCost,

    profitBeforeCommission,

    profitAfterCommission,

    profitMarginPercent,
  };

  return {
    discounts,
    accounting,
  };
}