import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  CampaignPricingResult,
  MarketingRulesRecord,
  PricingWarning,
  RewardsPricingResult,
} from "./types";

import {
  createWarning,
  nonNegative,
  roundCurrency,
  safeQuantity,
  uniqueWarnings,
} from "./utils";

type RewardsEngineInput = {
  supabase: SupabaseClient;
  customerId: string;
  campaign: CampaignPricingResult;
  marketingRules: MarketingRulesRecord;

  rewardPointsRequested?: number;

  generalPromoDiscount?: number;
  salesRepDiscount?: number;
  referralDiscount?: number;
  vipDiscount?: number;
  heroDiscount?: number;
  manualDiscount?: number;
};

type CustomerRewardsRow = {
  reward_points: number | null;
};

async function loadAvailableRewardPoints({
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
    .select("reward_points")
    .eq("id", customerId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      "Customer rewards profile could not be found."
    );
  }

  const row =
    data as unknown as CustomerRewardsRow;

  return Math.max(
    0,
    Math.floor(
      Number(
        row.reward_points || 0
      )
    )
  );
}

function getRewardsEligibleBase({
  campaign,
  marketingRules,
}: {
  campaign: CampaignPricingResult;
  marketingRules: MarketingRulesRecord;
}) {
  if (
    campaign.hasSaleItems &&
    !marketingRules.allow_rewards_on_sale_items
  ) {
    return roundCurrency(
      campaign.items
        .filter(
          (line) =>
            !line.hasCampaign &&
            line.allowRewardPoints
        )
        .reduce(
          (sum, line) =>
            sum +
            line.campaignLineRevenue,
          0
        )
    );
  }

  return roundCurrency(
    campaign.items
      .filter(
        (line) =>
          line.allowRewardPoints
      )
      .reduce(
        (sum, line) =>
          sum +
          line.campaignLineRevenue,
        0
      )
  );
}

export async function calculateRewardsPricing({
  supabase,
  customerId,
  campaign,
  marketingRules,
  rewardPointsRequested = 0,
  generalPromoDiscount = 0,
  salesRepDiscount = 0,
  referralDiscount = 0,
  vipDiscount = 0,
  heroDiscount = 0,
  manualDiscount = 0,
}: RewardsEngineInput): Promise<RewardsPricingResult> {
  const warnings:
    PricingWarning[] = [];

  const availablePoints =
    await loadAvailableRewardPoints({
      supabase,
      customerId,
    });

  const requestedPoints =
    safeQuantity(
      rewardPointsRequested
    );

  if (
    !marketingRules.rewards_enabled
  ) {
    if (requestedPoints > 0) {
      warnings.push(
        createWarning({
          code:
            "REWARDS_BLOCKED",
          message:
            "Reward redemption is currently disabled.",
          severity:
            "warning",
        })
      );
    }

    return {
      rewardsEnabled: false,
      availablePoints,
      requestedPoints,
      pointsUsed: 0,
      rewardDiscount: 0,
      rewardsAllowed: false,
      pointsEarned: 0,
      warnings:
        uniqueWarnings(
          warnings
        ),
    };
  }

  const eligibleBase =
    getRewardsEligibleBase({
      campaign,
      marketingRules,
    });

  if (
    requestedPoints > 0 &&
    eligibleBase <= 0
  ) {
    warnings.push(
      createWarning({
        code:
          "REWARDS_BLOCKED",
        message:
          "Reward points cannot be used on the items in this cart.",
        severity:
          "warning",
      })
    );
  }

  const priorDiscounts =
    roundCurrency(
      nonNegative(
        generalPromoDiscount
      ) +
        nonNegative(
          salesRepDiscount
        ) +
        nonNegative(
          referralDiscount
        ) +
        nonNegative(
          vipDiscount
        ) +
        nonNegative(
          heroDiscount
        ) +
        nonNegative(
          manualDiscount
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

  const maxPointsByBalance =
    Math.min(
      requestedPoints,
      availablePoints
    );

  /*
   * 100 points = $1.00.
   * Limit the redemption so it cannot exceed the
   * remaining eligible merchandise amount.
   */
  const maxPointsByEligibleBase =
    Math.floor(
      remainingEligibleBase *
        100
    );

  const pointsUsed =
    Math.max(
      0,
      Math.min(
        maxPointsByBalance,
        maxPointsByEligibleBase
      )
    );

  const rewardDiscount =
    roundCurrency(
      pointsUsed / 100
    );

  if (
    requestedPoints >
    availablePoints
  ) {
    warnings.push(
      createWarning({
        code:
          "REWARDS_BLOCKED",
        message:
          "The requested reward points exceeded the customer’s available balance and were reduced.",
        severity:
          "info",
      })
    );
  }

  if (
    requestedPoints >
    maxPointsByEligibleBase
  ) {
    warnings.push(
      createWarning({
        code:
          "REWARDS_BLOCKED",
        message:
          "The requested reward redemption exceeded the eligible merchandise amount and was reduced.",
        severity:
          "info",
      })
    );
  }

  const merchandiseAfterDiscounts =
    roundCurrency(
      Math.max(
        0,
        campaign.campaignMerchandiseRevenue -
          priorDiscounts -
          rewardDiscount
      )
    );

  const saleOrder =
    campaign.hasSaleItems;

  const pointsEarned =
    saleOrder &&
    !marketingRules.earn_rewards_on_sale_orders
      ? 0
      : Math.floor(
          merchandiseAfterDiscounts
        );

  return {
    rewardsEnabled: true,

    availablePoints,

    requestedPoints,

    pointsUsed,

    rewardDiscount,

    rewardsAllowed:
      eligibleBase > 0,

    pointsEarned,

    warnings:
      uniqueWarnings(
        warnings
      ),
  };
}