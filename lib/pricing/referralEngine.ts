import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  CampaignPricingResult,
  MarketingRulesRecord,
  PricingWarning,
  ReferralPricingResult,
} from "./types";

import {
  calculatePercentAmount,
  createWarning,
  nonNegative,
  roundCurrency,
  uniqueWarnings,
} from "./utils";

type ReferralEngineInput = {
  supabase: SupabaseClient;
  customerId: string;
  campaign: CampaignPricingResult;
  marketingRules: MarketingRulesRecord;

  /*
   * Discounts already applied before referrals.
   * The referral discount is calculated on the
   * remaining eligible merchandise amount.
   */
  generalPromoDiscount?: number;
  salesRepDiscount?: number;
};

type CustomerReferralRow = {
  qualified_referral_count: number | null;
  referral_lifetime_discount_percent: number | null;
};

async function loadCustomerReferralData({
  supabase,
  customerId,
}: {
  supabase: SupabaseClient;
  customerId: string;
}) {
  const {
    data,
    error,
  } = await supabase
    .from("customer_profiles")
    .select(
      [
        "qualified_referral_count",
        "referral_lifetime_discount_percent",
      ].join(",")
    )
    .eq("id", customerId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      "Customer referral profile could not be found."
    );
  }

  return data as unknown as CustomerReferralRow;
}

async function getReferralPercentFromRpc({
  supabase,
  qualifiedReferralCount,
}: {
  supabase: SupabaseClient;
  qualifiedReferralCount: number;
}) {
  const {
    data,
    error,
  } = await supabase.rpc(
    "get_referral_discount_percent",
    {
      p_qualified_referral_count:
        qualifiedReferralCount,
    }
  );

  if (error) {
    throw error;
  }

  return nonNegative(data);
}

function getEligibleReferralBase(
  campaign: CampaignPricingResult
) {
  return roundCurrency(
    campaign.items
      .filter(
        (line) =>
          line.allowReferralDiscount
      )
      .reduce(
        (sum, line) =>
          sum +
          line.campaignLineRevenue,
        0
      )
  );
}

export async function calculateReferralPricing({
  supabase,
  customerId,
  campaign,
  marketingRules,
  generalPromoDiscount = 0,
  salesRepDiscount = 0,
}: ReferralEngineInput): Promise<ReferralPricingResult> {
  const warnings:
    PricingWarning[] = [];

  if (
    !marketingRules.referral_program_enabled
  ) {
    return {
      qualifiedReferralCount: 0,
      referralDiscountPercent: 0,
      referralDiscount: 0,
      referralDiscountAllowed: false,
      warnings,
    };
  }

  const customer =
    await loadCustomerReferralData({
      supabase,
      customerId,
    });

  const qualifiedReferralCount =
    Math.max(
      0,
      Math.floor(
        Number(
          customer.qualified_referral_count ||
            0
        )
      )
    );

  const rpcPercent =
    await getReferralPercentFromRpc({
      supabase,
      qualifiedReferralCount,
    });

  const storedPercent =
    nonNegative(
      customer.referral_lifetime_discount_percent
    );

  /*
   * The RPC is the policy source of truth.
   * The stored customer field is retained as a
   * fallback while existing accounts are refreshed.
   */
  const referralDiscountPercent =
    Math.min(
      nonNegative(
        marketingRules.maximum_referral_discount_percent
      ),
      rpcPercent > 0
        ? rpcPercent
        : storedPercent
    );

  if (
    referralDiscountPercent <= 0
  ) {
    return {
      qualifiedReferralCount,
      referralDiscountPercent: 0,
      referralDiscount: 0,
      referralDiscountAllowed: false,
      warnings,
    };
  }

  let eligibleBase =
    getEligibleReferralBase(
      campaign
    );

  if (
    campaign.hasSaleItems &&
    !marketingRules.allow_referral_discount_on_sale_items
  ) {
    /*
     * Only non-sale lines remain eligible when
     * referral discounts are blocked on sale items.
     */
    eligibleBase =
      roundCurrency(
        campaign.items
          .filter(
            (line) =>
              !line.hasCampaign &&
              line.allowReferralDiscount
          )
          .reduce(
            (sum, line) =>
              sum +
              line.campaignLineRevenue,
            0
          )
      );

    if (eligibleBase <= 0) {
      warnings.push(
        createWarning({
          code:
            "REFERRAL_BLOCKED",
          message:
            "Your lifetime referral discount cannot be used on the sale items in this cart.",
          severity:
            "warning",
        })
      );

      return {
        qualifiedReferralCount,
        referralDiscountPercent,
        referralDiscount: 0,
        referralDiscountAllowed: false,
        warnings:
          uniqueWarnings(
            warnings
          ),
      };
    }
  }

  /*
   * General promo and sales-rep discounts are applied
   * before the referral discount. They reduce the
   * remaining referral-eligible base without allowing
   * the base to fall below zero.
   */
  const priorDiscounts =
    roundCurrency(
      nonNegative(
        generalPromoDiscount
      ) +
        nonNegative(
          salesRepDiscount
        )
    );

  const remainingEligibleBase =
    roundCurrency(
      Math.max(
        0,
        eligibleBase -
          Math.min(
            eligibleBase,
            priorDiscounts
          )
      )
    );

  const referralDiscount =
    calculatePercentAmount(
      remainingEligibleBase,
      referralDiscountPercent
    );

  return {
    qualifiedReferralCount,

    referralDiscountPercent,

    referralDiscount:
      roundCurrency(
        referralDiscount
      ),

    referralDiscountAllowed:
      referralDiscount > 0,

    warnings:
      uniqueWarnings(
        warnings
      ),
  };
}