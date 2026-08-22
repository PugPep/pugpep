import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  CampaignPricingResult,
  MarketingRulesRecord,
  PromoPricingResult,
  PromoSource,
  PromoValidationResult,
  PricingWarning,
  TaxOffsetMode,
} from "./types";

import {
  calculateFixedDiscount,
  calculatePercentAmount,
  createWarning,
  nonNegative,
  normalizeCode,
  roundCurrency,
  uniqueWarnings,
} from "./utils";

type PromoEngineInput = {
  supabase: SupabaseClient;
  customerId: string;
  campaign: CampaignPricingResult;
  promoCode?: string | null;
  marketingRules: MarketingRulesRecord;
};

type PromoRpcResponse = {
  valid?: boolean;
  source?: string | null;
  code?: string | null;
  discount_type?: string | null;
  discount_value?: number | null;
  minimum_spend?: number | null;
  exclude_sale_items?: boolean | null;
  sales_rep_id?: string | null;
  sales_rep_name?: string | null;
  first_order_only?: boolean;
  discount_allowed?: boolean;
  message?: string | null;

  tax_offset_mode?: string | null;
  tax_offset_reason?: string | null;
};

function normalizePromoSource(
  value: unknown
): PromoSource {
  if (value === "general") {
    return "general";
  }

  if (value === "sales_rep") {
    return "sales_rep";
  }

  return null;
}

function normalizeDiscountType(
  value: unknown
): "percent" | "fixed" | null {
  if (value === "percent") {
    return "percent";
  }

  if (value === "fixed") {
    return "fixed";
  }

  return null;
}

function normalizeTaxOffsetMode(
  value: unknown
): TaxOffsetMode {
  return value === "merchant_funded"
    ? "merchant_funded"
    : "none";
}

function normalizePromoValidation(
  data: PromoRpcResponse
): PromoValidationResult {
  return {
    valid: Boolean(data.valid),

    source:
      normalizePromoSource(
        data.source
      ),

    code:
      typeof data.code === "string" &&
      data.code.trim()
        ? data.code
            .trim()
            .toUpperCase()
        : null,

    discountType:
      normalizeDiscountType(
        data.discount_type
      ),

    discountValue:
      nonNegative(
        data.discount_value
      ),

    minimumSpend:
      nonNegative(
        data.minimum_spend
      ),

    excludeSaleItems:
      Boolean(
        data.exclude_sale_items
      ),

    salesRepId:
      typeof data.sales_rep_id === "string" &&
      data.sales_rep_id.trim()
        ? data.sales_rep_id
        : null,

    salesRepName:
      typeof data.sales_rep_name === "string" &&
      data.sales_rep_name.trim()
        ? data.sales_rep_name.trim()
        : null,

    firstOrderOnly:
      Boolean(
        data.first_order_only
      ),

    discountAllowed:
      Boolean(
        data.discount_allowed
      ),

    message:
      typeof data.message === "string" &&
      data.message.trim()
        ? data.message.trim()
        : "",

    taxOffsetMode:
      normalizeTaxOffsetMode(
        data.tax_offset_mode
      ),

    taxOffsetReason:
      typeof data.tax_offset_reason ===
        "string" &&
      data.tax_offset_reason.trim()
        ? data.tax_offset_reason.trim()
        : null,
  };
}

async function validatePromoCode({
  supabase,
  customerId,
  promoCode,
}: {
  supabase: SupabaseClient;
  customerId: string;
  promoCode: string;
}) {
  const {
    data,
    error,
  } = await supabase.rpc(
    "validate_checkout_promo",
    {
      p_code: promoCode,
      p_customer_id:
        customerId,
    }
  );

  if (error) {
    throw error;
  }

  if (
    !data ||
    typeof data !== "object"
  ) {
    throw new Error(
      "No promo validation result was returned."
    );
  }

  return normalizePromoValidation(
    data as PromoRpcResponse
  );
}

function isDiscountedLine(
  line:
    CampaignPricingResult["items"][number]
) {
  return Boolean(
    line.hasCampaign ||
    line.hasManualSale ||
    line.bundleDiscountApplied ||
    Number(
      line.saleDiscountAmount ||
        0
    ) > 0 ||
    Number(
      line.bundleDiscountAmount ||
        0
    ) > 0
  );
}

/*
 * Highest-discount architecture:
 *
 * Promo pricing is calculated as a CANDIDATE against the regular
 * merchandise value. The pricing engine will compare this candidate
 * against the existing campaign/manual/bundle sale savings and keep
 * the option that saves the customer the most money.
 *
 * This means "allow promo on sale items" no longer causes stacking.
 * Instead, the promo may REPLACE a smaller sale.
 *
 * An individual promo with exclude_sale_items=true remains respected.
 */
function getEligibleBase({
  campaign,
  source,
  excludeSaleItems = false,
}: {
  campaign:
    CampaignPricingResult;

  source:
    Exclude<
      PromoSource,
      null
    >;

  excludeSaleItems?:
    boolean;
}) {
  const eligibleLines =
    campaign.items.filter(
      (line) => {
        const discounted =
          isDiscountedLine(
            line
          );

        /*
         * An explicit promo-level exclusion still means
         * discounted merchandise is not eligible.
         */
        if (
          excludeSaleItems &&
          discounted
        ) {
          return false;
        }

        /*
         * If the line already has a campaign/manual sale,
         * the promo is being evaluated as an alternative to
         * that sale rather than stacked on top of it.
         *
         * Therefore campaign stacking flags must not prevent
         * the candidate comparison.
         */
        if (
          line.hasCampaign ||
          line.hasManualSale ||
          Number(
            line.saleDiscountAmount ||
              0
          ) > 0
        ) {
          return true;
        }

        /*
         * Bundle pricing is a separate benefit in the current
         * pricing model. Promo codes may continue through the
         * bundle path, but their percentage/fixed calculation
         * must use the already bundle-adjusted line revenue.
         *
         * This prevents a promo from being calculated against
         * the pre-bundle regular value and accidentally giving
         * a larger-than-configured effective discount.
         */
        if (
          line.bundleDiscountApplied ||
          Number(
            line.bundleDiscountAmount ||
              0
          ) > 0
        ) {
          return true;
        }

        /*
         * Full-price merchandise continues to honor its normal
         * promo eligibility flags.
         */
        if (
          source ===
          "general"
        ) {
          return Boolean(
            line.allowGeneralPromos
          );
        }

        return Boolean(
          line.allowSalesRepDiscount
        );
      }
    );

  return roundCurrency(
    eligibleLines.reduce(
      (
        sum,
        line
      ) => {
        const hasSaleCandidate =
          line.hasCampaign ||
          line.hasManualSale ||
          Number(
            line.saleDiscountAmount ||
              0
          ) > 0;

        const hasBundle =
          line.bundleDiscountApplied ||
          Number(
            line.bundleDiscountAmount ||
              0
          ) > 0;

        /*
         * Sale/manual-sale lines use regular value so the promo
         * candidate can be compared fairly against the sale.
         *
         * Bundle-only lines use their bundle-adjusted revenue
         * because bundle savings remain separate and are not
         * removed when a promo wins.
         */
        const lineBase =
          hasSaleCandidate
            ? line.regularLineValue
            : hasBundle
            ? line.campaignLineRevenue
            : line.regularLineValue;

        return (
          sum +
          nonNegative(
            lineBase
          )
        );
      },
      0
    )
  );
}

function calculateDiscount({
  baseAmount,
  validation,
}: {
  baseAmount: number;
  validation:
    PromoValidationResult;
}) {
  if (
    !validation.valid ||
    !validation.discountAllowed ||
    !validation.discountType ||
    baseAmount <= 0
  ) {
    return 0;
  }

  if (
    validation.discountType ===
    "percent"
  ) {
    return calculatePercentAmount(
      baseAmount,
      validation.discountValue
    );
  }

  return calculateFixedDiscount(
    baseAmount,
    validation.discountValue
  );
}

export async function calculatePromoPricing({
  supabase,
  customerId,
  campaign,
  promoCode,
  marketingRules,
}: PromoEngineInput): Promise<PromoPricingResult> {
  const warnings:
    PricingWarning[] = [];

  const normalizedCode =
    normalizeCode(
      promoCode
    );

  if (!normalizedCode) {
    return {
      validation: null,

      generalPromoDiscount:
        0,

      salesRepDiscount:
        0,

      appliedPromoCode:
        null,

      appliedPromoSource:
        null,

      salesRepId:
        null,

      salesRepName:
        null,

      taxOffsetMode:
        "none",

      taxOffsetSourceType:
        null,

      taxOffsetSourceId:
        null,

      taxOffsetSourceCode:
        null,

      taxOffsetReason:
        null,

      warnings,
    };
  }

  const validation =
    await validatePromoCode({
      supabase,
      customerId,

      promoCode:
        normalizedCode,
    });

  if (
    !validation.valid
  ) {
    warnings.push(
      createWarning({
        code:
          "PROMO_BLOCKED",

        message:
          validation.message ||
          "The promo code is invalid or inactive.",

        severity:
          "warning",
      })
    );

    return {
      validation,

      generalPromoDiscount:
        0,

      salesRepDiscount:
        0,

      appliedPromoCode:
        validation.code,

      appliedPromoSource:
        validation.source,

      salesRepId:
        validation.salesRepId,

      salesRepName:
        validation.salesRepName,

      taxOffsetMode:
        "none",

      taxOffsetSourceType:
        null,

      taxOffsetSourceId:
        null,

      taxOffsetSourceCode:
        null,

      taxOffsetReason:
        null,

      warnings:
        uniqueWarnings(
          warnings
        ),
    };
  }

  if (
    validation.source ===
      "general" &&
    !marketingRules
      .general_promos_enabled
  ) {
    warnings.push(
      createWarning({
        code:
          "PROMO_BLOCKED",

        message:
          "General promo codes are currently disabled.",

        severity:
          "warning",
      })
    );

    validation.discountAllowed =
      false;
  }

  if (
    validation.source ===
      "sales_rep" &&
    !marketingRules
      .sales_rep_codes_enabled
  ) {
    warnings.push(
      createWarning({
        code:
          "SALES_REP_DISCOUNT_BLOCKED",

        message:
          "Sales-rep codes are currently disabled.",

        severity:
          "warning",
      })
    );

    validation.discountAllowed =
      false;
  }

  /*
   * Preserve the current minimum-spend behavior:
   *
   * Minimum spend is evaluated against merchandise after
   * campaign/manual-sale/bundle pricing but before this promo.
   * Shipping and tax never count toward the threshold.
   */
  if (
    validation.source ===
      "general" &&
    validation.discountAllowed &&
    validation.minimumSpend >
      0 &&
    campaign
      .campaignMerchandiseRevenue <
      validation.minimumSpend
  ) {
    validation.discountAllowed =
      false;

    validation.message =
      `This promo requires a minimum merchandise spend of $${validation.minimumSpend.toFixed(
        2
      )}.`;

    warnings.push(
      createWarning({
        code:
          "PROMO_BLOCKED",

        message:
          validation.message,

        severity:
          "warning",
      })
    );
  }

  /*
   * Explicit promo setting:
   *
   * excludeSaleItems belongs to the individual general promo
   * and continues to be honored.
   *
   * The global "allow_general_promos_on_sale_items" flag was
   * previously a stacking switch. Since promos and sales now
   * compete instead of stacking, that global flag does NOT
   * prevent a promo from replacing a smaller sale.
   */
  if (
    validation.source ===
      "general" &&
    validation.discountAllowed &&
    validation.excludeSaleItems
  ) {
    const eligibleBase =
      getEligibleBase({
        campaign,
        source:
          "general",

        excludeSaleItems:
          true,
      });

    if (
      eligibleBase <=
      0
    ) {
      validation.discountAllowed =
        false;

      validation.message =
        "This promo applies only to full-price items, and there are no eligible full-price items in your cart.";

      warnings.push(
        createWarning({
          code:
            "PROMO_BLOCKED",

          message:
            validation.message,

          severity:
            "warning",
        })
      );
    }
  }

  /*
   * Sales-rep promo discounts also become candidates against
   * an active sale rather than stacking with the sale.
   *
   * Rep attribution remains present in the PromoPricingResult
   * even if pricingEngine.ts ultimately decides the sale gives
   * the customer the larger discount.
   */
  if (
    !validation.discountAllowed
  ) {
    if (
      validation.source ===
      "sales_rep"
    ) {
      warnings.push(
        createWarning({
          code:
            "SALES_REP_DISCOUNT_BLOCKED",

          message:
            validation.message ||
            "The sales-rep discount was not applied.",

          severity:
            "warning",
        })
      );
    } else {
      warnings.push(
        createWarning({
          code:
            "PROMO_BLOCKED",

          message:
            validation.message ||
            "The promo discount was not applied.",

          severity:
            "warning",
        })
      );
    }
  }

  let generalPromoDiscount =
    0;

  let salesRepDiscount =
    0;

  /*
   * Calculate GENERAL PROMO as an independent candidate.
   *
   * This is intentionally calculated from regular merchandise
   * value so pricingEngine.ts can make an apples-to-apples
   * comparison:
   *
   * Current sale savings
   *      VS
   * Promo savings from regular price
   *
   * Only one of those promotional savings will survive.
   */
  if (
    validation.discountAllowed &&
    validation.source ===
      "general"
  ) {
    const eligibleBase =
      getEligibleBase({
        campaign,

        source:
          "general",

        excludeSaleItems:
          validation
            .excludeSaleItems,
      });

    generalPromoDiscount =
      calculateDiscount({
        baseAmount:
          eligibleBase,

        validation,
      });
  }

  /*
   * Calculate SALES-REP PROMO as its own candidate.
   */
  if (
    validation.discountAllowed &&
    validation.source ===
      "sales_rep"
  ) {
    const eligibleBase =
      getEligibleBase({
        campaign,

        source:
          "sales_rep",

        excludeSaleItems:
          false,
      });

    salesRepDiscount =
      calculateDiscount({
        baseAmount:
          eligibleBase,

        validation,
      });
  }

  const taxOffsetMode =
    validation.taxOffsetMode;

  return {
    validation,

    generalPromoDiscount:
      roundCurrency(
        generalPromoDiscount
      ),

    salesRepDiscount:
      roundCurrency(
        salesRepDiscount
      ),

    appliedPromoCode:
      validation.code,

    appliedPromoSource:
      validation.source,

    salesRepId:
      validation.salesRepId,

    salesRepName:
      validation.salesRepName,

    taxOffsetMode,

    taxOffsetSourceType:
      taxOffsetMode ===
      "merchant_funded"
        ? "promo_code"
        : null,

    taxOffsetSourceId:
      null,

    taxOffsetSourceCode:
      taxOffsetMode ===
      "merchant_funded"
        ? validation.code
        : null,

    taxOffsetReason:
      taxOffsetMode ===
      "merchant_funded"
        ? validation
            .taxOffsetReason
        : null,

    warnings:
      uniqueWarnings(
        warnings
      ),
  };
}