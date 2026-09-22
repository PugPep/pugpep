import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  CampaignMinimumSpendProgress,
  CampaignPricingResult,
  CampaignType,
  PricedCartLine,
  PricingCartItemInput,
  PricingWarning,
  ProductOptionCampaignPrice,
  TaxOffsetMode,
} from "./types";

import {
  calculateBuyXGetY,
  calculateMarginPercent,
  createWarning,
  nonNegative,
  roundCurrency,
  safePositiveQuantity,
  sumCurrency,
  toNumber,
  uniqueWarnings,
} from "./utils";

type CampaignPriceRpcResponse = {
  product_option_id?: string;
  product_slug?: string;
  dosage?: string;
  purchase_type?: string;

  has_campaign?: boolean;
  sale_campaign_id?: string | null;
  sale_campaign_name?: string | null;
  sale_campaign_type?: string | null;

  regular_unit_price?: number;
  sale_unit_price?: number;
  sale_discount_amount?: number;
  discount_value?: number;

  unit_cost?: number;
  profit_before_shipping?: number;
  margin_before_shipping?: number;

  buy_quantity?: number | null;
  get_quantity?: number | null;

  allow_reward_points?: boolean;
  allow_general_promos?: boolean;
  allow_sales_rep_discount?: boolean;
  allow_referral_discount?: boolean;

  tax_offset_mode?: string | null;
  tax_offset_reason?: string | null;
};

type ProductOptionMetadata = {
  id: string;
  product_slug: string;
  status: string;
  is_active: boolean | null;
  archived_at: string | null;
  sale_active: boolean | null;
  sale_percent: number | null;
  bundle_discount_enabled: boolean | null;
  bundle_qty_1: number | null;
  bundle_discount_1: number | null;
  bundle_qty_2: number | null;
  bundle_discount_2: number | null;
  bundle_qty_3: number | null;
  bundle_discount_3: number | null;
};

type ProductMetadata = {
  slug: string;
  name: string;
  is_active: boolean | null;
  is_taxable: boolean | null;
  tax_code: string | null;
};

type CampaignPricingInput = {
  supabase: SupabaseClient;
  items: PricingCartItemInput[];
};

function normalizeCampaignType(
  value: unknown
): CampaignType | null {
  if (
    value === "percent" ||
    value === "fixed" ||
    value === "buy_x_get_y"
  ) {
    return value;
  }

  return null;
}

function normalizePurchaseType(
  value: unknown
): "single" | "kit" {
  return value === "kit"
    ? "kit"
    : "single";
}

function normalizeTaxOffsetMode(
  value: unknown
): TaxOffsetMode {
  return value === "merchant_funded"
    ? "merchant_funded"
    : "none";
}

function normalizeCampaignPrice(
  data: CampaignPriceRpcResponse
): ProductOptionCampaignPrice {
  return {
    productOptionId:
      String(
        data.product_option_id || ""
      ),

    productSlug:
      String(
        data.product_slug || ""
      ),

    dosage:
      String(
        data.dosage || ""
      ),

    purchaseType:
      normalizePurchaseType(
        data.purchase_type
      ),

    hasCampaign:
      Boolean(
        data.has_campaign
      ),

    saleCampaignId:
      data.sale_campaign_id || null,

    saleCampaignName:
      data.sale_campaign_name || null,

    saleCampaignType:
      normalizeCampaignType(
        data.sale_campaign_type
      ),

    regularUnitPrice:
      roundCurrency(
        nonNegative(
          data.regular_unit_price
        )
      ),

    saleUnitPrice:
      roundCurrency(
        nonNegative(
          data.sale_unit_price
        )
      ),

    saleDiscountAmount:
      roundCurrency(
        nonNegative(
          data.sale_discount_amount
        )
      ),

    discountValue:
      roundCurrency(
        nonNegative(
          data.discount_value
        )
      ),

    unitCost:
      roundCurrency(
        nonNegative(
          data.unit_cost
        )
      ),

    profitBeforeShipping:
      roundCurrency(
        toNumber(
          data.profit_before_shipping
        )
      ),

    marginBeforeShipping:
      toNumber(
        data.margin_before_shipping
      ),

    buyQuantity:
      data.buy_quantity == null
        ? null
        : Math.max(
            1,
            Math.floor(
              toNumber(
                data.buy_quantity,
                1
              )
            )
          ),

    getQuantity:
      data.get_quantity == null
        ? null
        : Math.max(
            1,
            Math.floor(
              toNumber(
                data.get_quantity,
                1
              )
            )
          ),

    allowRewardPoints:
      data.allow_reward_points !== false,

    allowGeneralPromos:
      data.allow_general_promos !== false,

    allowSalesRepDiscount:
      data.allow_sales_rep_discount !== false,

    allowReferralDiscount:
      data.allow_referral_discount !== false,

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

async function loadProductMetadata(
  supabase: SupabaseClient,
  optionIds: string[]
) {
  const metadata =
    new Map<
      string,
      {
        option: ProductOptionMetadata;
        product: ProductMetadata | null;
      }
    >();

  if (optionIds.length === 0) {
    return metadata;
  }

  const {
    data: optionRows,
    error: optionError,
  } = await supabase
    .from("product_options")
    .select(
      [
        "id",
        "product_slug",
        "status",
        "is_active",
        "archived_at",
        "sale_active",
        "sale_percent",
        "bundle_discount_enabled",
        "bundle_qty_1",
        "bundle_discount_1",
        "bundle_qty_2",
        "bundle_discount_2",
        "bundle_qty_3",
        "bundle_discount_3",
      ].join(",")
    )
    .in("id", optionIds);

  if (optionError) {
    throw optionError;
  }

  const options =
    (optionRows || []) as unknown as ProductOptionMetadata[];

  const slugs = Array.from(
    new Set(
      options.map(
        (option) =>
          option.product_slug
      )
    )
  );

  let products:
    ProductMetadata[] = [];

  if (slugs.length > 0) {
    const {
      data: productRows,
      error: productError,
    } = await supabase
      .from("products")
      .select(
        "slug,name,is_active,is_taxable,tax_code"
      )
      .in("slug", slugs);

    if (productError) {
      throw productError;
    }

    products =
      (productRows || []) as unknown as ProductMetadata[];
  }

  const productBySlug =
    new Map(
      products.map(
        (product) => [
          product.slug,
          product,
        ]
      )
    );

  options.forEach(
    (option) => {
      metadata.set(
        option.id,
        {
          option,
          product:
            productBySlug.get(
              option.product_slug
            ) || null,
        }
      );
    }
  );

  return metadata;
}

async function loadCampaignPrice(
  supabase: SupabaseClient,
  productOptionId: string
) {
  const {
    data,
    error,
  } = await supabase.rpc(
    "get_product_option_campaign_price",
    {
      p_product_option_id:
        productOptionId,
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
      `No campaign pricing was returned for product option ${productOptionId}.`
    );
  }

  return normalizeCampaignPrice(
    data as CampaignPriceRpcResponse
  );
}

function buildPricedLine({
  input,
  campaignPrice,
  productName,
  optionMetadata,
  isTaxable,
  taxCode,
}: {
  input: PricingCartItemInput;
  campaignPrice: ProductOptionCampaignPrice;
  productName: string;
  optionMetadata: ProductOptionMetadata;
  isTaxable: boolean;
  taxCode: string | null;
}): PricedCartLine {
  const quantity =
    safePositiveQuantity(
      input.quantity
    );

  const regularUnitPrice =
    roundCurrency(
      campaignPrice.regularUnitPrice
    );

  const unitCost =
    roundCurrency(
      campaignPrice.unitCost
    );

  /*
   * ----------------------------------------------------------
   * MANUAL SALE CANDIDATE
   * ----------------------------------------------------------
   *
   * A manual product-option sale is now evaluated even when
   * the option is also assigned to an active campaign.
   *
   * Manual and campaign discounts NEVER stack with each other.
   * We calculate both possible prices and use whichever gives
   * the customer the lower merchandise price.
   */
  const manualSaleAvailable =
    Boolean(
      optionMetadata.sale_active
    ) &&
    nonNegative(
      optionMetadata.sale_percent
    ) > 0;

  const configuredManualSalePercent =
    manualSaleAvailable
      ? Math.min(
          100,
          nonNegative(
            optionMetadata.sale_percent
          )
        )
      : 0;

  const manualSaleLineRevenue =
    manualSaleAvailable
      ? roundCurrency(
          regularUnitPrice *
            (1 -
              configuredManualSalePercent /
                100) *
            quantity
        )
      : null;

  /*
   * ----------------------------------------------------------
   * CAMPAIGN CANDIDATE
   * ----------------------------------------------------------
   */
  let campaignCandidateRevenue =
    roundCurrency(
      campaignPrice.hasCampaign
        ? campaignPrice.saleUnitPrice *
            quantity
        : regularUnitPrice *
            quantity
    );

  let campaignPaidQuantity =
    quantity;

  let campaignFreeQuantity = 0;

  /*
   * Buy-X-Get-Y needs to be calculated from quantities rather
   * than sale_unit_price so it can be compared fairly against
   * an active manual percentage sale.
   */
  if (
    campaignPrice.hasCampaign &&
    campaignPrice.saleCampaignType ===
      "buy_x_get_y"
  ) {
    const bogo =
      calculateBuyXGetY({
        quantity,
        buyQuantity:
          campaignPrice.buyQuantity ||
          1,
        getQuantity:
          campaignPrice.getQuantity ||
          1,
      });

    campaignPaidQuantity =
      bogo.paidQuantity;

    campaignFreeQuantity =
      bogo.freeQuantity;

    campaignCandidateRevenue =
      roundCurrency(
        regularUnitPrice *
          campaignPaidQuantity
      );
  }

  /*
   * ----------------------------------------------------------
   * CHOOSE THE BETTER SALE
   * ----------------------------------------------------------
   *
   * Examples:
   *
   * Manual 20% vs Campaign 15% -> Manual wins
   * Manual 10% vs Campaign 20% -> Campaign wins
   * Manual 20% vs Campaign 20% -> Campaign wins tie,
   *                                but discount applies once
   *
   * Using a strict "<" for the manual comparison means an
   * exact tie keeps the campaign metadata attached to the line.
   */
  const manualSaleWins =
    manualSaleLineRevenue !== null &&
    (
      !campaignPrice.hasCampaign ||
      manualSaleLineRevenue <
        campaignCandidateRevenue
    );

  const effectiveCampaignUsed =
    campaignPrice.hasCampaign &&
    !manualSaleWins;

  const hasManualSale =
    manualSaleWins;

  const manualSalePercent =
    hasManualSale
      ? configuredManualSalePercent
      : 0;

  let paidQuantity =
    effectiveCampaignUsed
      ? campaignPaidQuantity
      : quantity;

  let freeQuantity =
    effectiveCampaignUsed
      ? campaignFreeQuantity
      : 0;

  let campaignLineRevenue =
    roundCurrency(
      hasManualSale &&
      manualSaleLineRevenue !== null
        ? manualSaleLineRevenue
        : effectiveCampaignUsed
        ? campaignCandidateRevenue
        : regularUnitPrice *
          quantity
    );

  let actualUnitPrice =
    quantity > 0
      ? roundCurrency(
          campaignLineRevenue /
            quantity
        )
      : 0;

  /*
   * ----------------------------------------------------------
   * BUNDLE SAVINGS
   * ----------------------------------------------------------
   *
   * Bundle savings remain mutually exclusive with sales.
   *
   * We intentionally check the raw campaign assignment here,
   * not only effectiveCampaignUsed. If an option is currently
   * assigned to a campaign, bundle pricing stays paused.
   *
   * Manual sale configured + active also pauses bundle pricing.
   */
  let bundleDiscountApplied = false;
  let bundleDiscountPercent = 0;
  let bundleDiscountAmount = 0;
  let bundleTierQuantity:
    number | null = null;

  if (
    campaignPrice.purchaseType === "single" &&
    quantity < 10 &&
    !campaignPrice.hasCampaign &&
    !manualSaleAvailable &&
    optionMetadata.bundle_discount_enabled !==
      false
  ) {
    const tiers = [
      {
        quantity: Math.max(
          1,
          Math.floor(
            nonNegative(
              optionMetadata.bundle_qty_1
            ) || 1
          )
        ),
        percent: Math.min(
          100,
          nonNegative(
            optionMetadata.bundle_discount_1
          )
        ),
      },
      {
        quantity: Math.max(
          1,
          Math.floor(
            nonNegative(
              optionMetadata.bundle_qty_2
            ) || 1
          )
        ),
        percent: Math.min(
          100,
          nonNegative(
            optionMetadata.bundle_discount_2
          )
        ),
      },
      {
        quantity: Math.max(
          1,
          Math.floor(
            nonNegative(
              optionMetadata.bundle_qty_3
            ) || 1
          )
        ),
        percent: Math.min(
          100,
          nonNegative(
            optionMetadata.bundle_discount_3
          )
        ),
      },
    ]
      .filter(
        (tier) =>
          tier.percent > 0 &&
          quantity >=
            tier.quantity
      )
      .sort(
        (a, b) =>
          b.quantity -
          a.quantity
      );

    const bestTier =
      tiers[0];

    if (bestTier) {
      bundleDiscountApplied =
        true;

      bundleDiscountPercent =
        bestTier.percent;

      bundleTierQuantity =
        bestTier.quantity;

      const preBundleRevenue =
        campaignLineRevenue;

      campaignLineRevenue =
        roundCurrency(
          preBundleRevenue *
            (1 -
              bundleDiscountPercent /
                100)
        );

      bundleDiscountAmount =
        roundCurrency(
          Math.max(
            0,
            preBundleRevenue -
              campaignLineRevenue
          )
        );

      actualUnitPrice =
        quantity > 0
          ? roundCurrency(
              campaignLineRevenue /
                quantity
            )
          : 0;
    }
  }

  const regularLineValue =
    roundCurrency(
      regularUnitPrice *
        quantity
    );

  /*
   * campaignLineRevenue already contains the final line revenue.
   *
   * bundleDiscountAmount is subtracted here so saleDiscountAmount
   * contains ONLY campaign/manual-sale savings. Bundle savings are
   * reported separately in campaign.bundleDiscount and therefore
   * are not double-counted by the accounting engine.
   */
  const saleDiscountAmount =
    roundCurrency(
      Math.max(
        0,
        regularLineValue -
          campaignLineRevenue -
          bundleDiscountAmount
      )
    );

  const lineCost =
    roundCurrency(
      unitCost *
        quantity
    );

  const lineProfitBeforeOrderCosts =
    roundCurrency(
      campaignLineRevenue -
        lineCost
    );

  const lineMarginBeforeOrderCosts =
    calculateMarginPercent(
      campaignLineRevenue,
      lineProfitBeforeOrderCosts
    );

  return {
    productOptionId:
      campaignPrice.productOptionId,

    productSlug:
      campaignPrice.productSlug,

    productName,

    dosage:
      campaignPrice.dosage,

    purchaseType:
      campaignPrice.purchaseType,

    quantity,

    regularUnitPrice,

    actualUnitPrice,

    unitCost,

    regularLineValue,

    campaignLineRevenue,

    saleDiscountAmount,

    hasManualSale,
    manualSalePercent,

    bundleDiscountApplied,
    bundleDiscountPercent,
    bundleDiscountAmount,
    bundleTierQuantity,

    paidQuantity,

    freeQuantity,

    /*
     * Only mark the campaign as the active sale source when its
     * price actually won the comparison. This prevents the UI,
     * snapshots, and campaign reporting from claiming a campaign
     * produced a price that actually came from the manual sale.
     */
    hasCampaign:
      effectiveCampaignUsed,

    saleCampaignId:
      effectiveCampaignUsed
        ? campaignPrice.saleCampaignId
        : null,

    saleCampaignName:
      effectiveCampaignUsed
        ? campaignPrice.saleCampaignName
        : null,

    saleCampaignType:
      effectiveCampaignUsed
        ? campaignPrice.saleCampaignType
        : null,

    /*
     * When the manual sale wins, treat it like a normal manual
     * product sale instead of inheriting stacking restrictions
     * from a campaign whose price was not used.
     */
    allowRewardPoints:
      effectiveCampaignUsed
        ? campaignPrice.allowRewardPoints
        : true,

    allowGeneralPromos:
      effectiveCampaignUsed
        ? campaignPrice.allowGeneralPromos
        : true,

    allowSalesRepDiscount:
      effectiveCampaignUsed
        ? campaignPrice.allowSalesRepDiscount
        : true,

    allowReferralDiscount:
      effectiveCampaignUsed
        ? campaignPrice.allowReferralDiscount
        : true,

    isTaxable,

    taxCode,

    lineCost,

    lineProfitBeforeOrderCosts,

    lineMarginBeforeOrderCosts,
  };
}

type CampaignMinimumSpendRow = {
  id: string;
  minimum_spend: number | null;
};

function removeCampaignForMinimumSpend(
  campaignPrice: ProductOptionCampaignPrice
): ProductOptionCampaignPrice {
  return {
    ...campaignPrice,
    hasCampaign: false,
    saleCampaignId: null,
    saleCampaignName: null,
    saleCampaignType: null,
    saleUnitPrice: campaignPrice.regularUnitPrice,
    saleDiscountAmount: 0,
    discountValue: 0,
    buyQuantity: null,
    getQuantity: null,
    allowRewardPoints: true,
    allowGeneralPromos: true,
    allowSalesRepDiscount: true,
    allowReferralDiscount: true,
    taxOffsetMode: "none",
    taxOffsetReason: null,
  };
}

export async function calculateCampaignPricing({
  supabase,
  items,
}: CampaignPricingInput): Promise<CampaignPricingResult> {
  const warnings: PricingWarning[] = [];

  const validInputs = items.filter((item) => {
    if (!item.productOptionId) {
      warnings.push(
        createWarning({
          code: "MISSING_PRODUCT_OPTION_ID",
          message: "A cart item is missing its product option ID.",
          severity: "critical",
        })
      );

      return false;
    }

    if (safePositiveQuantity(item.quantity) <= 0) {
      warnings.push(
        createWarning({
          code: "INVALID_QUANTITY",
          message: "A cart item has an invalid quantity.",
          severity: "critical",
          productOptionId: item.productOptionId,
        })
      );

      return false;
    }

    return true;
  });

  const optionIds = Array.from(
    new Set(validInputs.map((item) => item.productOptionId))
  );

  const metadata = await loadProductMetadata(supabase, optionIds);

  /*
   * Load the campaign candidate for each product option before we build
   * any priced lines. This lets us calculate each campaign's qualifying
   * merchandise subtotal across the entire cart before deciding whether
   * that campaign is allowed to apply.
   */
  const campaignPriceByOption = new Map<
    string,
    ProductOptionCampaignPrice
  >();

  await Promise.all(
    optionIds.map(async (productOptionId) => {
      const campaignPrice = await loadCampaignPrice(
        supabase,
        productOptionId
      );

      campaignPriceByOption.set(
        productOptionId,
        campaignPrice
      );
    })
  );

  const campaignIds = Array.from(
    new Set(
      Array.from(campaignPriceByOption.values())
        .filter(
          (campaignPrice) =>
            campaignPrice.hasCampaign &&
            Boolean(campaignPrice.saleCampaignId)
        )
        .map(
          (campaignPrice) =>
            campaignPrice.saleCampaignId as string
        )
    )
  );

  const minimumSpendByCampaign = new Map<string, number>();

  if (campaignIds.length > 0) {
    const { data, error } = await supabase
      .from("sale_campaigns")
      .select("id,minimum_spend")
      .in("id", campaignIds);

    if (error) {
      throw error;
    }

    const rows =
      (data || []) as unknown as CampaignMinimumSpendRow[];

    rows.forEach((row) => {
      minimumSpendByCampaign.set(
        row.id,
        roundCurrency(nonNegative(row.minimum_spend))
      );
    });
  }

  /*
   * Minimum spend is based only on merchandise that is actually eligible
   * for that campaign, using regular pre-discount merchandise value.
   *
   * Example:
   *   Campaign minimum: $100
   *   Eligible campaign products: $80
   *   Other products: $60
   *
   * The campaign does NOT activate because the qualifying subtotal is $80,
   * not the full $140 cart subtotal. Shipping and later discounts are never
   * counted toward the minimum.
   */
  const qualifyingSpendByCampaign = new Map<string, number>();

  validInputs.forEach((input) => {
    const campaignPrice = campaignPriceByOption.get(
      input.productOptionId
    );

    if (
      !campaignPrice?.hasCampaign ||
      !campaignPrice.saleCampaignId
    ) {
      return;
    }

    const quantity = safePositiveQuantity(input.quantity);

    const regularLineValue = roundCurrency(
      nonNegative(campaignPrice.regularUnitPrice) * quantity
    );

    const current = qualifyingSpendByCampaign.get(
      campaignPrice.saleCampaignId
    ) || 0;

    qualifyingSpendByCampaign.set(
      campaignPrice.saleCampaignId,
      roundCurrency(current + regularLineValue)
    );
  });

  const campaignsBelowMinimum = new Set<string>();

  campaignIds.forEach((campaignId) => {
    const minimumSpend = minimumSpendByCampaign.get(campaignId) || 0;
    const qualifyingSpend =
      qualifyingSpendByCampaign.get(campaignId) || 0;

    if (
      minimumSpend > 0 &&
      qualifyingSpend < minimumSpend
    ) {
      campaignsBelowMinimum.add(campaignId);
    }
  });

  const minimumSpendProgress: CampaignMinimumSpendProgress[] =
    campaignIds
      .map((campaignId) => {
        const minimumSpend =
          minimumSpendByCampaign.get(campaignId) || 0;

        if (minimumSpend <= 0) {
          return null;
        }

        const qualifyingSpend =
          qualifyingSpendByCampaign.get(campaignId) || 0;

        const campaignName =
          Array.from(campaignPriceByOption.values()).find(
            (campaignPrice) =>
              campaignPrice.saleCampaignId === campaignId
          )?.saleCampaignName || "Current Sale";

        const amountRemaining = roundCurrency(
          Math.max(0, minimumSpend - qualifyingSpend)
        );

        return {
          campaignId,
          campaignName,
          minimumSpend,
          qualifyingSpend,
          amountRemaining,
          isMet: amountRemaining <= 0,
        };
      })
      .filter(
        (
          progress
        ): progress is CampaignMinimumSpendProgress =>
          progress !== null
      )
      .sort(
        (a, b) =>
          a.amountRemaining - b.amountRemaining
      );

  const lines: PricedCartLine[] = [];

  for (const input of validInputs) {
    const itemMetadata = metadata.get(input.productOptionId);

    if (!itemMetadata) {
      warnings.push(
        createWarning({
          code: "PRODUCT_OPTION_NOT_FOUND",
          message: "A product option in the cart no longer exists.",
          severity: "critical",
          productOptionId: input.productOptionId,
        })
      );

      continue;
    }

    const product = itemMetadata.product;

    if (!product) {
      warnings.push(
        createWarning({
          code: "PRODUCT_OPTION_NOT_FOUND",
          message: "The product linked to a cart option could not be found.",
          severity: "critical",
          productOptionId: input.productOptionId,
        })
      );

      continue;
    }

    if (product.is_active === false) {
      warnings.push(
        createWarning({
          code: "PRODUCT_INACTIVE",
          message: `${product.name} is no longer active.`,
          severity: "critical",
          productOptionId: input.productOptionId,
        })
      );

      continue;
    }

    if (
      itemMetadata.option.is_active === false ||
      itemMetadata.option.archived_at
    ) {
      warnings.push(
        createWarning({
          code: "PRODUCT_INACTIVE",
          message: `${product.name} ${itemMetadata.option.product_slug} is no longer available.`,
          severity: "critical",
          productOptionId: input.productOptionId,
        })
      );

      continue;
    }

    if (itemMetadata.option.status === "out of stock") {
      warnings.push(
        createWarning({
          code: "OUT_OF_STOCK",
          message: `${product.name} ${itemMetadata.option.product_slug} is marked out of stock.`,
          severity: "critical",
          productOptionId: input.productOptionId,
        })
      );
    }

    const rawCampaignPrice = campaignPriceByOption.get(
      input.productOptionId
    );

    if (!rawCampaignPrice) {
      throw new Error(
        `No campaign pricing was returned for product option ${input.productOptionId}.`
      );
    }

    /*
     * If this campaign has a minimum and the cart has not reached it,
     * remove the campaign candidate BEFORE buildPricedLine(). This is
     * important because it lets normal manual-sale / bundle logic run as
     * though the campaign were not active.
     */
    const campaignPrice =
      rawCampaignPrice.saleCampaignId &&
      campaignsBelowMinimum.has(
        rawCampaignPrice.saleCampaignId
      )
        ? removeCampaignForMinimumSpend(rawCampaignPrice)
        : rawCampaignPrice;

    lines.push(
      buildPricedLine({
        input,
        campaignPrice,
        productName: product.name,
        optionMetadata: itemMetadata.option,
        isTaxable: product.is_taxable !== false,
        taxCode: product.tax_code || null,
      })
    );
  }

  const regularMerchandiseValue = sumCurrency(
    lines.map((line) => line.regularLineValue)
  );

  const campaignMerchandiseRevenue = sumCurrency(
    lines.map((line) => line.campaignLineRevenue)
  );

  const saleDiscount = sumCurrency(
    lines.map((line) => line.saleDiscountAmount)
  );

  const bundleDiscount = sumCurrency(
    lines.map((line) => line.bundleDiscountAmount)
  );

  const campaignGroups = new Map<
    string,
    {
      id: string;
      name: string;
      type: CampaignType;
      revenue: number;
    }
  >();

  lines.forEach((line) => {
    if (
      !line.saleCampaignId ||
      !line.saleCampaignName ||
      !line.saleCampaignType
    ) {
      return;
    }

    const current = campaignGroups.get(
      line.saleCampaignId
    ) || {
      id: line.saleCampaignId,
      name: line.saleCampaignName,
      type: line.saleCampaignType,
      revenue: 0,
    };

    current.revenue = roundCurrency(
      current.revenue + line.campaignLineRevenue
    );

    campaignGroups.set(line.saleCampaignId, current);
  });

  const primaryCampaign =
    Array.from(campaignGroups.values()).sort(
      (a, b) => b.revenue - a.revenue
    )[0] || null;

  /*
   * Tax-offset campaign fields are prepared here. The existing
   * campaign pricing RPC currently returns no offset metadata,
   * so these remain "none" until the campaign schema and RPC are
   * updated in the tax-engine phase.
   */
  const taxOffsetLine = lines.find(
    (line) => line.hasCampaign && false
  );

  return {
    items: lines,

    regularMerchandiseValue,

    campaignMerchandiseRevenue,

    saleDiscount,
    bundleDiscount,

    primaryCampaignId: primaryCampaign?.id || null,

    primaryCampaignName: primaryCampaign?.name || null,

    primaryCampaignType: primaryCampaign?.type || null,

    minimumSpendProgress,

    hasSaleItems: lines.some(
      (line) => line.hasCampaign || line.hasManualSale
    ),

    taxOffsetMode: taxOffsetLine
      ? "merchant_funded"
      : "none",

    taxOffsetSourceType: taxOffsetLine
      ? "campaign"
      : null,

    taxOffsetSourceId:
      taxOffsetLine?.saleCampaignId || null,

    taxOffsetSourceCode: null,

    taxOffsetReason: null,

    warnings: uniqueWarnings(warnings),
  };
}
