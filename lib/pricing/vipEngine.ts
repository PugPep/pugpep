import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  VipPricingResult,
} from "./types";

import {
  nonNegative,
  roundCurrency,
} from "./utils";

type VipEngineInput = {
  supabase: SupabaseClient;
  customerId: string;

  /*
   * Merchandise amount remaining before any future
   * VIP discount is applied.
   */
  eligibleMerchandiseAmount: number;
};

type CustomerVipRow = {
  lifetime_spend: number | null;
  vip_tier: string | null;
};

const VIP_TIERS = [
  {
    name: "Diamond",
    minimumLifetimeSpend: 50000,
    discountPercent: 0,
  },
  {
    name: "Ruby",
    minimumLifetimeSpend: 35000,
    discountPercent: 0,
  },
  {
    name: "Sapphire",
    minimumLifetimeSpend: 20000,
    discountPercent: 0,
  },
  {
    name: "Emerald",
    minimumLifetimeSpend: 10000,
    discountPercent: 0,
  },
  {
    name: "Platinum",
    minimumLifetimeSpend: 5000,
    discountPercent: 0,
  },
  {
    name: "Gold",
    minimumLifetimeSpend: 2500,
    discountPercent: 0,
  },
  {
    name: "Silver",
    minimumLifetimeSpend: 1000,
    discountPercent: 0,
  },
  {
    name: "Bronze",
    minimumLifetimeSpend: 500,
    discountPercent: 0,
  },
  {
    name: "Iron",
    minimumLifetimeSpend: 250,
    discountPercent: 0,
  },
  {
    name: "Stone",
    minimumLifetimeSpend: 0,
    discountPercent: 0,
  },
] as const;

async function loadCustomerVipData({
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
      "lifetime_spend,vip_tier"
    )
    .eq("id", customerId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      "Customer VIP profile could not be found."
    );
  }

  return data as unknown as CustomerVipRow;
}

function getCalculatedVipTier(
  lifetimeSpend: number
) {
  return (
    VIP_TIERS.find(
      (tier) =>
        lifetimeSpend >=
        tier.minimumLifetimeSpend
    ) || VIP_TIERS[VIP_TIERS.length - 1]
  );
}

function normalizeStoredTier(
  value: unknown
) {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return null;
  }

  const normalized =
    value.trim().toLowerCase();

  const match =
    VIP_TIERS.find(
      (tier) =>
        tier.name.toLowerCase() ===
        normalized
    );

  return match || null;
}

export async function calculateVipPricing({
  supabase,
  customerId,
  eligibleMerchandiseAmount,
}: VipEngineInput): Promise<VipPricingResult> {
  const customer =
    await loadCustomerVipData({
      supabase,
      customerId,
    });

  const lifetimeSpend =
    nonNegative(
      customer.lifetime_spend
    );

  const calculatedTier =
    getCalculatedVipTier(
      lifetimeSpend
    );

  const storedTier =
    normalizeStoredTier(
      customer.vip_tier
    );

  /*
   * Prefer the higher tier between the stored profile value
   * and the tier calculated from lifetime spend. This prevents
   * an older stored tier from accidentally downgrading a customer
   * during pricing.
   */
  const calculatedIndex =
    VIP_TIERS.findIndex(
      (tier) =>
        tier.name ===
        calculatedTier.name
    );

  const storedIndex =
    storedTier
      ? VIP_TIERS.findIndex(
          (tier) =>
            tier.name ===
            storedTier.name
        )
      : -1;

  const vipTier =
    storedTier &&
    storedIndex >= 0 &&
    storedIndex < calculatedIndex
      ? storedTier
      : calculatedTier;

  /*
   * No automatic VIP percentage discount has been configured
   * in the current database or business rules. All tiers therefore
   * return 0% until a future VIP pricing table or rule is added.
   */
  const vipDiscountPercent =
    nonNegative(
      vipTier.discountPercent
    );

  const vipDiscount =
    roundCurrency(
      Math.max(
        0,
        eligibleMerchandiseAmount
      ) *
        (vipDiscountPercent / 100)
    );

  return {
    vipTier:
      vipTier.name,

    vipDiscountPercent,

    vipDiscount,
  };
}