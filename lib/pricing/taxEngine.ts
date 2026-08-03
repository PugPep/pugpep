import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  CampaignPricingResult,
  PricingAddress,
  PricingWarning,
  PromoPricingResult,
  ShippingPricingResult,
  TaxCalculationMode,
  TaxPricingResult,
  TaxProvider,
  TaxRateResult,
} from "./types";

import {
  calculateMerchantTaxOffset,
  createWarning,
  nonNegative,
  roundCurrency,
  uniqueWarnings,
} from "./utils";

type TaxEngineInput = {
  supabase: SupabaseClient;
  customerId: string;

  campaign: CampaignPricingResult;
  promo: PromoPricingResult;
  shipping: ShippingPricingResult;

  shippingAddress: PricingAddress;

  /*
   * Merchandise revenue after campaign, promo, referral,
   * VIP, rewards, manual, and other merchandise discounts,
   * but before merchant-funded tax offset.
   */
  merchandiseRevenueAfterDiscounts: number;
};

type SalesTaxSettingsRow = {
  tax_enabled: boolean;
  calculation_mode: string;
  tax_provider: string;
  prices_include_tax: boolean;
  tax_shipping: boolean;
};

type CustomerTaxRow = {
  is_tax_exempt: boolean;
  tax_exemption_type: string | null;
  tax_exemption_number: string | null;
  tax_exemption_expires_at: string | null;
};

type ManualTaxRpcResponse = {
  enabled?: boolean;
  rate?: number;
  tax_shipping?: boolean;
  jurisdiction?: string | null;
  rate_id?: string | null;

  country_code?: string | null;
  state_code?: string | null;
  county_name?: string | null;
  city_name?: string | null;
  postal_code?: string | null;
  product_tax_code?: string | null;
};

function normalizeCalculationMode(
  value: unknown
): TaxCalculationMode {
  return value === "automatic"
    ? "automatic"
    : "manual";
}

function normalizeTaxProvider(
  value: unknown
): TaxProvider {
  if (
    value === "stripe_tax" ||
    value === "taxjar" ||
    value === "avalara" ||
    value === "other"
  ) {
    return value;
  }

  return "manual";
}

function normalizeTaxRate(
  data: ManualTaxRpcResponse
): TaxRateResult {
  return {
    enabled:
      Boolean(data.enabled),

    rate:
      Math.min(
        1,
        Math.max(
          0,
          Number(
            data.rate || 0
          )
        )
      ),

    taxShipping:
      Boolean(
        data.tax_shipping
      ),

    jurisdiction:
      typeof data.jurisdiction === "string" &&
      data.jurisdiction.trim()
        ? data.jurisdiction.trim()
        : null,

    rateId:
      typeof data.rate_id === "string" &&
      data.rate_id.trim()
        ? data.rate_id
        : null,

    countryCode:
      typeof data.country_code === "string" &&
      data.country_code.trim()
        ? data.country_code.trim().toUpperCase()
        : null,

    stateCode:
      typeof data.state_code === "string" &&
      data.state_code.trim()
        ? data.state_code.trim().toUpperCase()
        : null,

    countyName:
      typeof data.county_name === "string" &&
      data.county_name.trim()
        ? data.county_name.trim()
        : null,

    cityName:
      typeof data.city_name === "string" &&
      data.city_name.trim()
        ? data.city_name.trim()
        : null,

    postalCode:
      typeof data.postal_code === "string" &&
      data.postal_code.trim()
        ? data.postal_code.trim()
        : null,

    productTaxCode:
      typeof data.product_tax_code === "string" &&
      data.product_tax_code.trim()
        ? data.product_tax_code.trim()
        : null,
  };
}

async function loadTaxSettings(
  supabase: SupabaseClient
) {
  const {
    data,
    error,
  } = await supabase
    .from("sales_tax_settings")
    .select(
      [
        "tax_enabled",
        "calculation_mode",
        "tax_provider",
        "prices_include_tax",
        "tax_shipping",
      ].join(",")
    )
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
    return {
      tax_enabled: false,
      calculation_mode: "manual",
      tax_provider: "manual",
      prices_include_tax: false,
      tax_shipping: false,
    } satisfies SalesTaxSettingsRow;
  }

  return data as unknown as SalesTaxSettingsRow;
}

async function loadCustomerTaxStatus({
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
      "Customer tax profile could not be found."
    );
  }

  return data as unknown as CustomerTaxRow;
}

function isTaxExemptionActive(
  customer: CustomerTaxRow
) {
  if (!customer.is_tax_exempt) {
    return false;
  }

  if (
    !customer.tax_exemption_expires_at
  ) {
    return true;
  }

  const expiresAt =
    new Date(
      customer.tax_exemption_expires_at
    );

  if (
    Number.isNaN(
      expiresAt.getTime()
    )
  ) {
    return false;
  }

  return expiresAt >= new Date();
}

async function getManualTaxRate({
  supabase,
  address,
  productTaxCode,
}: {
  supabase: SupabaseClient;
  address: PricingAddress;
  productTaxCode?: string | null;
}) {
  const {
    data,
    error,
  } = await supabase.rpc(
    "get_manual_sales_tax_rate",
    {
      p_country_code:
        address.countryCode || "US",

      p_state_code:
        address.stateCode,

      p_postal_code:
        address.postalCode || null,

      p_city_name:
        address.city || null,

      p_county_name:
        address.county || null,

      p_product_tax_code:
        productTaxCode || null,
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
      "No sales-tax result was returned."
    );
  }

  return normalizeTaxRate(
    data as ManualTaxRpcResponse
  );
}

function getTaxableProductGroups(
  campaign: CampaignPricingResult
) {
  const groups =
    new Map<
      string,
      {
        taxCode: string | null;
        amount: number;
      }
    >();

  campaign.items.forEach(
    (line) => {
      if (!line.isTaxable) {
        return;
      }

      const key =
        line.taxCode || "__default__";

      const current =
        groups.get(key) || {
          taxCode:
            line.taxCode || null,
          amount: 0,
        };

      current.amount =
        roundCurrency(
          current.amount +
            line.campaignLineRevenue
        );

      groups.set(
        key,
        current
      );
    }
  );

  return Array.from(
    groups.values()
  );
}

function chooseTaxOffsetSource({
  campaign,
  promo,
}: {
  campaign: CampaignPricingResult;
  promo: PromoPricingResult;
}) {
  if (
    promo.taxOffsetMode ===
      "merchant_funded"
  ) {
    return {
      mode:
        "merchant_funded" as const,

      sourceType:
        promo.taxOffsetSourceType,

      sourceId:
        promo.taxOffsetSourceId,

      sourceCode:
        promo.taxOffsetSourceCode,

      reason:
        promo.taxOffsetReason,
    };
  }

  if (
    campaign.taxOffsetMode ===
      "merchant_funded"
  ) {
    return {
      mode:
        "merchant_funded" as const,

      sourceType:
        campaign.taxOffsetSourceType,

      sourceId:
        campaign.taxOffsetSourceId,

      sourceCode:
        campaign.taxOffsetSourceCode,

      reason:
        campaign.taxOffsetReason,
    };
  }

  return {
    mode:
      "none" as const,
    sourceType: null,
    sourceId: null,
    sourceCode: null,
    reason: null,
  };
}

export async function calculateTaxPricing({
  supabase,
  customerId,
  campaign,
  promo,
  shipping,
  shippingAddress,
  merchandiseRevenueAfterDiscounts,
}: TaxEngineInput): Promise<TaxPricingResult> {
  const warnings:
    PricingWarning[] = [];

  const settings =
    await loadTaxSettings(
      supabase
    );

  const calculationMode =
    normalizeCalculationMode(
      settings.calculation_mode
    );

  const provider =
    normalizeTaxProvider(
      settings.tax_provider
    );

  const customer =
    await loadCustomerTaxStatus({
      supabase,
      customerId,
    });

  const customerTaxExempt =
    isTaxExemptionActive(
      customer
    );

  const baseResult = {
    calculationMode,
    provider,

    salesTaxState:
      shippingAddress.stateCode ||
      null,

    salesTaxCounty:
      shippingAddress.county ||
      null,

    salesTaxCity:
      shippingAddress.city ||
      null,

    salesTaxPostalCode:
      shippingAddress.postalCode ||
      null,

    taxCalculationId:
      null as string | null,

    merchantTaxOffsetDiscount: 0,

    merchantTaxOffsetMode:
      "none" as const,

    merchantTaxOffsetSourceType:
      null,

    merchantTaxOffsetSourceId:
      null,

    merchantTaxOffsetSourceCode:
      null,

    merchantTaxOffsetReason:
      null,
  };

  if (!settings.tax_enabled) {
    return {
      enabled: false,

      ...baseResult,

      taxableSubtotal: 0,
      salesTaxRate: 0,
      salesTaxAmount: 0,

      salesTaxJurisdiction: null,

      taxExempt: false,
      taxExemptionReason: null,

      warnings,
    };
  }

  if (customerTaxExempt) {
    return {
      enabled: true,

      ...baseResult,

      taxableSubtotal: 0,
      salesTaxRate: 0,
      salesTaxAmount: 0,

      salesTaxJurisdiction:
        shippingAddress.stateCode ||
        null,

      taxExempt: true,

      taxExemptionReason:
        customer.tax_exemption_type ||
        "Customer tax exemption",

      warnings,
    };
  }

  if (
    calculationMode !== "manual"
  ) {
    throw new Error(
      `Automatic tax provider "${provider}" is configured but is not connected yet.`
    );
  }

  const taxableGroups =
    getTaxableProductGroups(
      campaign
    );

  /*
   * Campaign-line revenue is used to determine the proportional
   * taxable share. Discounts applied after campaign pricing are
   * allocated across taxable and non-taxable merchandise by ratio.
   */
  const campaignRevenue =
    roundCurrency(
      campaign.campaignMerchandiseRevenue
    );

  const taxableCampaignRevenue =
    roundCurrency(
      taxableGroups.reduce(
        (sum, group) =>
          sum + group.amount,
        0
      )
    );

  const taxableRatio =
    campaignRevenue > 0
      ? Math.min(
          1,
          Math.max(
            0,
            taxableCampaignRevenue /
              campaignRevenue
          )
        )
      : 0;

  const taxableMerchandiseAfterDiscounts =
    roundCurrency(
      nonNegative(
        merchandiseRevenueAfterDiscounts
      ) *
        taxableRatio
    );

  const defaultRate =
    await getManualTaxRate({
      supabase,
      address:
        shippingAddress,
      productTaxCode: null,
    });

  if (
    defaultRate.enabled &&
    defaultRate.rateId === null &&
    defaultRate.rate <= 0
  ) {
    warnings.push(
      createWarning({
        code:
          "TAX_RATE_NOT_FOUND",
        message:
          `Tax is enabled, but no matching tax rate was found for ${shippingAddress.stateCode || "the shipping address"}.`,
        severity:
          "warning",
      })
    );
  }

  const taxableShipping =
    defaultRate.taxShipping ||
    settings.tax_shipping
      ? shipping.shippingCollected
      : 0;

  const preOffsetTaxableSubtotal =
    roundCurrency(
      taxableMerchandiseAfterDiscounts +
        taxableShipping
    );

  const offsetSource =
    chooseTaxOffsetSource({
      campaign,
      promo,
    });

  let taxableSubtotal =
    preOffsetTaxableSubtotal;

  let salesTaxAmount =
    roundCurrency(
      taxableSubtotal *
        defaultRate.rate
    );

  let merchantTaxOffsetDiscount = 0;

  if (
    offsetSource.mode ===
      "merchant_funded" &&
    defaultRate.rate > 0 &&
    taxableSubtotal > 0
  ) {
    const offset =
      calculateMerchantTaxOffset({
        taxableAmountBeforeOffset:
          taxableSubtotal,
        taxRate:
          defaultRate.rate,
      });

    taxableSubtotal =
      offset.taxableSubtotalAfterOffset;

    salesTaxAmount =
      offset.salesTaxAmount;

    merchantTaxOffsetDiscount =
      offset.merchantTaxOffsetDiscount;
  }

  return {
    enabled:
      defaultRate.enabled,

    calculationMode,

    provider,

    taxableSubtotal:
      roundCurrency(
        taxableSubtotal
      ),

    salesTaxRate:
      defaultRate.rate,

    salesTaxAmount:
      roundCurrency(
        salesTaxAmount
      ),

    salesTaxState:
      defaultRate.stateCode ||
      shippingAddress.stateCode ||
      null,

    salesTaxCounty:
      defaultRate.countyName ||
      shippingAddress.county ||
      null,

    salesTaxCity:
      defaultRate.cityName ||
      shippingAddress.city ||
      null,

    salesTaxPostalCode:
      defaultRate.postalCode ||
      shippingAddress.postalCode ||
      null,

    salesTaxJurisdiction:
      defaultRate.jurisdiction,

    taxCalculationId:
      defaultRate.rateId,

    taxExempt: false,

    taxExemptionReason: null,

    merchantTaxOffsetDiscount:
      roundCurrency(
        merchantTaxOffsetDiscount
      ),

    merchantTaxOffsetMode:
      offsetSource.mode,

    merchantTaxOffsetSourceType:
      offsetSource.sourceType,

    merchantTaxOffsetSourceId:
      offsetSource.sourceId,

    merchantTaxOffsetSourceCode:
      offsetSource.sourceCode,

    merchantTaxOffsetReason:
      offsetSource.reason,

    warnings:
      uniqueWarnings(
        warnings
      ),
  };
}