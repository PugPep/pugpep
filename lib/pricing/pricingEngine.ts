import type { SupabaseClient } from "@supabase/supabase-js";

import { calculateAccounting } from "./accountingEngine";
import { calculateCampaignPricing } from "./campaignPricing";
import { calculateCommission } from "./commissionEngine";
import { calculateHeroPricing } from "./heroEngine";
import { calculatePromoPricing } from "./promoEngine";
import { calculateReferralPricing } from "./referralEngine";
import { calculateRewardsPricing } from "./rewardsEngine";
import { calculateShippingPricing } from "./shippingEngine";
import { createPricingSnapshot } from "./snapshotEngine";
import { calculateTaxPricing } from "./taxEngine";
import { calculateVipPricing } from "./vipEngine";

import type {
  CustomerPricingProfile,
  MarketingRulesRecord,
  PricingInput,
  PricingResult,
  PricingWarning,
} from "./types";

import {
  createWarning,
  getMarginWarnings,
  nonNegative,
  roundCurrency,
  uniqueWarnings,
} from "./utils";

const ADMIN_EMAIL = "pugpep99@gmail.com";

type MarketingRulesRow =
  MarketingRulesRecord & {
    id: string;
    is_active: boolean;
  };

type CustomerProfileRow = {
  id: string;
  reward_points: number | null;
  lifetime_spend: number | null;
  vip_tier: string | null;
  has_lifetime_free_shipping: boolean | null;
  is_hero_account: boolean | null;
  hero_discount_percent: number | null;
  qualified_referral_count: number | null;
  referral_lifetime_discount_percent: number | null;

  is_tax_exempt: boolean | null;
  tax_exemption_type: string | null;
  tax_exemption_number: string | null;
  tax_exemption_expires_at: string | null;
};

async function requireMatchingCustomer({
  supabase,
  customerId,
}: {
  supabase: SupabaseClient;
  customerId: string;
}) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user) {
    throw new Error(
      "You must be signed in to calculate checkout pricing."
    );
  }

  const isAdmin =
    user.email?.toLowerCase() ===
    ADMIN_EMAIL.toLowerCase();

  if (
    user.id !== customerId &&
    !isAdmin
  ) {
    throw new Error(
      "The pricing customer does not match the signed-in account."
    );
  }

  return {
    user,
    isAdmin,
  };
}

async function loadMarketingRules(
  supabase: SupabaseClient
): Promise<MarketingRulesRecord> {
  const {
    data,
    error,
  } = await supabase
    .from("marketing_rules")
    .select("*")
    .eq("is_active", true)
    .order("created_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      "No active marketing rules were found."
    );
  }

  const row =
    data as unknown as MarketingRulesRow;

  return {
    rewards_enabled:
      Boolean(row.rewards_enabled),

    allow_rewards_on_sale_items:
      Boolean(
        row.allow_rewards_on_sale_items
      ),

    earn_rewards_on_sale_orders:
      Boolean(
        row.earn_rewards_on_sale_orders
      ),

    general_promos_enabled:
      Boolean(
        row.general_promos_enabled
      ),

    allow_general_promos_on_sale_items:
      Boolean(
        row.allow_general_promos_on_sale_items
      ),

    sales_rep_codes_enabled:
      Boolean(
        row.sales_rep_codes_enabled
      ),

    sales_rep_discount_first_order_only:
      Boolean(
        row.sales_rep_discount_first_order_only
      ),

    allow_sales_rep_discount_on_sale_items:
      Boolean(
        row.allow_sales_rep_discount_on_sale_items
      ),

    preserve_sales_rep_attribution_when_discount_blocked:
      Boolean(
        row.preserve_sales_rep_attribution_when_discount_blocked
      ),

    default_sales_rep_commission_percent:
      nonNegative(
        row.default_sales_rep_commission_percent
      ),

    referral_program_enabled:
      Boolean(
        row.referral_program_enabled
      ),

    allow_referral_discount_on_sale_items:
      Boolean(
        row.allow_referral_discount_on_sale_items
      ),

    maximum_referral_discount_percent:
      nonNegative(
        row.maximum_referral_discount_percent
      ),

    free_shipping_threshold:
      nonNegative(
        row.free_shipping_threshold
      ),

    lifetime_free_shipping_enabled:
      Boolean(
        row.lifetime_free_shipping_enabled
      ),

    default_shipping_cost:
  nonNegative(
    row.default_shipping_cost
  ),

default_express_shipping_cost:
  nonNegative(
    row.default_express_shipping_cost
  ),

default_packaging_cost:
  nonNegative(
    row.default_packaging_cost
  ),

    minimum_margin_warning_percent:
      nonNegative(
        row.minimum_margin_warning_percent
      ),

    critical_margin_percent:
      nonNegative(
        row.critical_margin_percent
      ),
  };
}

async function loadCustomerProfile({
  supabase,
  customerId,
}: {
  supabase: SupabaseClient;
  customerId: string;
}): Promise<CustomerPricingProfile> {
  const {
    data,
    error,
  } = await supabase
    .from("customer_profiles")
    .select(
      [
        "id",
        "reward_points",
        "lifetime_spend",
        "vip_tier",
        "has_lifetime_free_shipping",
        "is_hero_account",
        "hero_discount_percent",
        "qualified_referral_count",
        "referral_lifetime_discount_percent",
        "is_tax_exempt",
        "tax_exemption_type",
        "tax_exemption_number",
        "tax_exemption_expires_at",
      ].join(",")
    )
    .eq("id", customerId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      "Customer pricing profile could not be found."
    );
  }

  const row =
    data as unknown as CustomerProfileRow;

  return {
    id: row.id,

    rewardPoints:
      Math.max(
        0,
        Math.floor(
          Number(
            row.reward_points || 0
          )
        )
      ),

    lifetimeSpend:
      nonNegative(
        row.lifetime_spend
      ),

    vipTier:
      row.vip_tier ||
      "Stone",

    hasLifetimeFreeShipping:
      Boolean(
        row.has_lifetime_free_shipping
      ),

    isHeroAccount:
      Boolean(
        row.is_hero_account
      ),

    heroDiscountPercent:
      Math.min(
        100,
        nonNegative(
          row.hero_discount_percent ?? 5
        )
      ),

    qualifiedReferralCount:
      Math.max(
        0,
        Math.floor(
          Number(
            row.qualified_referral_count ||
              0
          )
        )
      ),

    referralLifetimeDiscountPercent:
      nonNegative(
        row.referral_lifetime_discount_percent
      ),

    isTaxExempt:
      Boolean(
        row.is_tax_exempt
      ),

    taxExemptionType:
      row.tax_exemption_type ||
      null,

    taxExemptionNumber:
      row.tax_exemption_number ||
      null,

    taxExemptionExpiresAt:
      row.tax_exemption_expires_at ||
      null,
  };
}

function validatePricingInput(
  input: PricingInput
) {
  if (!input.customerId) {
    throw new Error(
      "Customer ID is required."
    );
  }

  if (
    !Array.isArray(input.items) ||
    input.items.length === 0
  ) {
    throw new Error(
      "At least one cart item is required."
    );
  }

  if (
    !input.shippingAddress?.stateCode ||
    !input.shippingAddress?.postalCode
  ) {
    throw new Error(
      "A shipping state and postal code are required."
    );
  }
}

function calculateRemainingMerchandise({
  campaignRevenue,
  generalPromoDiscount,
  salesRepDiscount,
  referralDiscount,
  vipDiscount,
  heroDiscount,
  rewardsDiscount,
  manualDiscount,
}: {
  campaignRevenue: number;
  generalPromoDiscount: number;
  salesRepDiscount: number;
  referralDiscount: number;
  vipDiscount: number;
  heroDiscount: number;
  rewardsDiscount: number;
  manualDiscount: number;
}) {
  return roundCurrency(
    Math.max(
      0,
      campaignRevenue -
        generalPromoDiscount -
        salesRepDiscount -
        referralDiscount -
        vipDiscount -
        heroDiscount -
        rewardsDiscount -
        manualDiscount
    )
  );
}

export async function calculatePricing(
  input: PricingInput
): Promise<PricingResult> {
  validatePricingInput(input);

  const {
    supabase,
    customerId,
  } = input;

  const {
    isAdmin,
  } = await requireMatchingCustomer({
    supabase,
    customerId,
  });

  const [
    marketingRules,
    customerProfile,
  ] = await Promise.all([
    loadMarketingRules(
      supabase
    ),

    loadCustomerProfile({
      supabase,
      customerId,
    }),
  ]);

  const campaign =
    await calculateCampaignPricing({
      supabase,
      items: input.items,
    });

  if (
    campaign.items.length === 0
  ) {
    throw new Error(
      "No valid cart items could be priced."
    );
  }

  const promo =
    await calculatePromoPricing({
      supabase,
      customerId,
      campaign,
      promoCode:
        input.promoCode,
      marketingRules,
    });

  const referral =
    await calculateReferralPricing({
      supabase,
      customerId,
      campaign,
      marketingRules,


      generalPromoDiscount:
        promo.generalPromoDiscount,

      salesRepDiscount:
        promo.salesRepDiscount,
    });

  const merchandiseBeforeVip =
    calculateRemainingMerchandise({
      campaignRevenue:
        campaign.campaignMerchandiseRevenue,


      generalPromoDiscount:
        promo.generalPromoDiscount,

      salesRepDiscount:
        promo.salesRepDiscount,

      referralDiscount:
        referral.referralDiscount,

      vipDiscount: 0,
      heroDiscount: 0,
      rewardsDiscount: 0,
      manualDiscount: 0,
    });

  const vip =
    await calculateVipPricing({
      supabase,
      customerId,

      eligibleMerchandiseAmount:
        merchandiseBeforeVip,
    });

  /*
   * Manual discounts are admin-only. A customer cannot submit
   * a manual discount from the browser and have it honored.
   */
  const requestedManualDiscount =
    isAdmin
      ? nonNegative(
          input.manualDiscount
        )
      : 0;

  const merchandiseBeforeRewards =
    calculateRemainingMerchandise({
      campaignRevenue:
        campaign.campaignMerchandiseRevenue,


      generalPromoDiscount:
        promo.generalPromoDiscount,

      salesRepDiscount:
        promo.salesRepDiscount,

      referralDiscount:
        referral.referralDiscount,

      vipDiscount:
        vip.vipDiscount,

      heroDiscount: 0,

      rewardsDiscount: 0,

      manualDiscount:
        requestedManualDiscount,
    });

  const cappedManualDiscount =
    roundCurrency(
      Math.min(
        requestedManualDiscount,
        Math.max(
          0,
          merchandiseBeforeRewards +
            requestedManualDiscount
        )
      )
    );

  const merchandiseBeforeHero =
    calculateRemainingMerchandise({
      campaignRevenue:
        campaign.campaignMerchandiseRevenue,


      generalPromoDiscount:
        promo.generalPromoDiscount,

      salesRepDiscount:
        promo.salesRepDiscount,

      referralDiscount:
        referral.referralDiscount,

      vipDiscount:
        vip.vipDiscount,

      heroDiscount: 0,
      rewardsDiscount: 0,

      manualDiscount:
        cappedManualDiscount,
    });

  const hero =
    calculateHeroPricing({
      isHeroAccount:
        customerProfile.isHeroAccount,
      heroDiscountPercent:
        customerProfile.heroDiscountPercent,
      eligibleMerchandiseAmount:
        merchandiseBeforeHero,
    });

  const rewards =
    await calculateRewardsPricing({
      supabase,
      customerId,
      campaign,
      marketingRules,

      rewardPointsRequested:
        input.rewardPointsRequested,


      generalPromoDiscount:
        promo.generalPromoDiscount,

      salesRepDiscount:
        promo.salesRepDiscount,

      referralDiscount:
        referral.referralDiscount,

      vipDiscount:
        vip.vipDiscount,

      heroDiscount:
        hero.heroDiscount,

      manualDiscount:
        cappedManualDiscount,
    });

  const merchandiseBeforeTaxOffset =
    calculateRemainingMerchandise({
      campaignRevenue:
        campaign.campaignMerchandiseRevenue,


      generalPromoDiscount:
        promo.generalPromoDiscount,

      salesRepDiscount:
        promo.salesRepDiscount,

      referralDiscount:
        referral.referralDiscount,

      vipDiscount:
        vip.vipDiscount,

      heroDiscount:
        hero.heroDiscount,

      rewardsDiscount:
        rewards.rewardDiscount,

      manualDiscount:
        cappedManualDiscount,
    });

  const shipping =
    calculateShippingPricing({
      campaign,
      marketingRules,

      merchandiseRevenueAfterDiscounts:
        merchandiseBeforeTaxOffset,

      hasLifetimeFreeShipping:
        customerProfile.hasLifetimeFreeShipping,
    });

  const tax =
    await calculateTaxPricing({
      supabase,
      customerId,
      campaign,
      promo,
      shipping,

      shippingAddress:
        input.shippingAddress,

      merchandiseRevenueAfterDiscounts:
        merchandiseBeforeTaxOffset,
    });

  /*
   * First accounting pass establishes profit before commission.
   */
  const provisionalAccounting =
    calculateAccounting({
      campaign,
      shipping,
      tax,

      bundleDiscount:
        campaign.bundleDiscount,


      generalPromoDiscount:
        promo.generalPromoDiscount,

      salesRepDiscount:
        promo.salesRepDiscount,

      referralDiscount:
        referral.referralDiscount,

      rewardsDiscount:
        rewards.rewardDiscount,

      vipDiscount:
        vip.vipDiscount,

      heroDiscount:
        hero.heroDiscount,

      manualDiscount:
        cappedManualDiscount,

      otherDirectCost:
        input.otherDirectCost,

      commissionAmount: 0,
    });

  const commission =
    await calculateCommission({
      supabase,
      customerId,
      promo,

      accounting:
        provisionalAccounting.accounting,

      marketingRules,
    });

  /*
   * Final accounting pass subtracts the calculated commission.
   */
  const {
    discounts,
    accounting,
  } = calculateAccounting({
    campaign,
    shipping,
    tax,

    generalPromoDiscount:
      promo.generalPromoDiscount,

    salesRepDiscount:
      promo.salesRepDiscount,

    referralDiscount:
      referral.referralDiscount,

    rewardsDiscount:
      rewards.rewardDiscount,

    vipDiscount:
      vip.vipDiscount,

    manualDiscount:
      cappedManualDiscount,

    otherDirectCost:
      input.otherDirectCost,

    commissionAmount:
      commission.commissionAmount,
  });

  const engineWarnings:
    PricingWarning[] = [];

  if (
    !isAdmin &&
    nonNegative(
      input.manualDiscount
    ) > 0
  ) {
    engineWarnings.push(
      createWarning({
        code:
          "PROMO_BLOCKED",
        message:
          "Manual discounts may only be applied by an administrator.",
        severity:
          "warning",
      })
    );
  }

  engineWarnings.push(
    ...getMarginWarnings({
      profit:
        accounting.profitAfterCommission,

      margin:
        accounting.profitMarginPercent,

      warningThreshold:
        marketingRules.minimum_margin_warning_percent,

      criticalThreshold:
        marketingRules.critical_margin_percent,
    })
  );

  const warnings =
    uniqueWarnings([
      ...campaign.warnings,
      ...promo.warnings,
      ...referral.warnings,
      ...rewards.warnings,
      ...tax.warnings,
      ...engineWarnings,
    ]);

  const snapshot =
    createPricingSnapshot({
      customerId,
      campaign,
      promo,
      referral,
      rewards,
      vip,
      hero,
      shipping,
      tax,
      discounts,
      accounting,
      commission,
      warnings,
    });

  return {
    campaign,
    promo,
    referral,
    rewards,
    vip,
    hero,
    shipping,
    tax,
    discounts,
    accounting,
    commission,
    snapshot,
    warnings,
  };
}