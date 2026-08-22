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
        ? data.code.trim().toUpperCase()
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
      p_customer_id: customerId,
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
  line: CampaignPricingResult["items"][number]
) {
  return Boolean(
    line.hasCampaign ||
    line.hasManualSale ||
    line.bundleDiscountApplied ||
    Number(
      line.saleDiscountAmount || 0
    ) > 0 ||
    Number(
      line.bundleDiscountAmount || 0
    ) > 0
  );
}

function getEligibleBase({
  campaign,
  source,
  excludeSaleItems = false,
}: {
  campaign: CampaignPricingResult;
  source: Exclude<PromoSource, null>;
  excludeSaleItems?: boolean;
}) {
  const eligibleLines =
    campaign.items.filter(
      (line) => {
        const sourceEligible =
          source === "general"
            ? line.allowGeneralPromos
            : line.allowSalesRepDiscount;

        if (!sourceEligible) {
          return false;
        }

        if (
          excludeSaleItems &&
          isDiscountedLine(line)
        ) {
          return false;
        }

        return true;
      }
    );

  return roundCurrency(
    eligibleLines.reduce(
      (sum, line) =>
        sum +
        line.campaignLineRevenue,
      0
    )
  );
}

function calculateDiscount({
  baseAmount,
  validation,
}: {
  baseAmount: number;
  validation: PromoValidationResult;
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

      generalPromoDiscount: 0,
      salesRepDiscount: 0,

      appliedPromoCode: null,
      appliedPromoSource: null,

      salesRepId: null,
      salesRepName: null,

      taxOffsetMode: "none",
      taxOffsetSourceType: null,
      taxOffsetSourceId: null,
      taxOffsetSourceCode: null,
      taxOffsetReason: null,

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

  if (!validation.valid) {
    warnings.push(
      createWarning({
        code: "PROMO_BLOCKED",
        message:
          validation.message ||
          "The promo code is invalid or inactive.",
        severity: "warning",
      })
    );

    return {
      validation,

      generalPromoDiscount: 0,
      salesRepDiscount: 0,

      appliedPromoCode:
        validation.code,
      appliedPromoSource:
        validation.source,

      salesRepId:
        validation.salesRepId,
      salesRepName:
        validation.salesRepName,

      taxOffsetMode: "none",
      taxOffsetSourceType: null,
      taxOffsetSourceId: null,
      taxOffsetSourceCode: null,
      taxOffsetReason: null,

      warnings:
        uniqueWarnings(
          warnings
        ),
    };
  }

  if (
    validation.source ===
      "general" &&
    !marketingRules.general_promos_enabled
  ) {
    warnings.push(
      createWarning({
        code: "PROMO_BLOCKED",
        message:
          "General promo codes are currently disabled.",
        severity: "warning",
      })
    );

    validation.discountAllowed =
      false;
  }

  if (
    validation.source ===
      "sales_rep" &&
    !marketingRules.sales_rep_codes_enabled
  ) {
    warnings.push(
      createWarning({
        code:
          "SALES_REP_DISCOUNT_BLOCKED",
        message:
          "Sales-rep codes are currently disabled.",
        severity: "warning",
      })
    );

    validation.discountAllowed =
      false;
  }

  /*
   * Minimum spend is evaluated against merchandise after campaign,
   * manual-sale, and bundle pricing, but before this promo is applied.
   * Shipping and tax never count toward the threshold.
   */
  if (
    validation.source ===
      "general" &&
    validation.discountAllowed &&
    validation.minimumSpend > 0 &&
    campaign.campaignMerchandiseRevenue <
      validation.minimumSpend
  ) {
    validation.discountAllowed =
      false;

    validation.message =
      `This promo requires a minimum merchandise spend of $${validation.minimumSpend.toFixed(2)}.`;

    warnings.push(
      createWarning({
        code: "PROMO_BLOCKED",
        message:
          validation.message,
        severity: "warning",
      })
    );
  }

  const hasSaleItems =
    campaign.hasSaleItems;

  /*
   * A promo can exclude discounted lines even when the global marketing
   * rule normally allows promos on sale items. The global rule still acts
   * as the broader safety switch.
   */
  const excludeSaleItemsForGeneralPromo =
    validation.source ===
      "general" &&
    (
      validation.excludeSaleItems ||
      (
        hasSaleItems &&
        !marketingRules.allow_general_promos_on_sale_items
      )
    );

  if (
    validation.source ===
      "general" &&
    validation.discountAllowed &&
    excludeSaleItemsForGeneralPromo
  ) {
    const eligibleBase =
      getEligibleBase({
        campaign,
        source: "general",
        excludeSaleItems: true,
      });

    if (eligibleBase <= 0) {
      validation.discountAllowed =
        false;

      validation.message =
        "This promo applies only to full-price items, and there are no eligible full-price items in your cart.";

      warnings.push(
        createWarning({
          code: "PROMO_BLOCKED",
          message:
            validation.message,
          severity: "warning",
        })
      );
    }
  }

  if (
    validation.source ===
      "sales_rep" &&
    hasSaleItems &&
    !marketingRules.allow_sales_rep_discount_on_sale_items
  ) {
    const eligibleBase =
      getEligibleBase({
        campaign,
        source: "sales_rep",
      });

    if (eligibleBase <= 0) {
      warnings.push(
        createWarning({
          code:
            "SALES_REP_DISCOUNT_BLOCKED",
          message:
            "The sales-rep discount cannot be used on the sale items in your cart.",
          severity: "warning",
        })
      );

      validation.discountAllowed =
        false;
    }
  }

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
          severity: "warning",
        })
      );
    } else {
      warnings.push(
        createWarning({
          code: "PROMO_BLOCKED",
          message:
            validation.message ||
            "The promo discount was not applied.",
          severity: "warning",
        })
      );
    }
  }

  let generalPromoDiscount = 0;
  let salesRepDiscount = 0;

  if (
    validation.discountAllowed &&
    validation.source ===
      "general"
  ) {
    const eligibleBase =
      getEligibleBase({
        campaign,
        source: "general",
        excludeSaleItems:
          validation.excludeSaleItems ||
          !marketingRules.allow_general_promos_on_sale_items,
      });

    generalPromoDiscount =
      calculateDiscount({
        baseAmount:
          eligibleBase,
        validation,
      });
  }

  if (
    validation.discountAllowed &&
    validation.source ===
      "sales_rep"
  ) {
    const eligibleBase =
      getEligibleBase({
        campaign,
        source: "sales_rep",
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
        ? validation.taxOffsetReason
        : null,

    warnings:
      uniqueWarnings(
        warnings
      ),
  };
}