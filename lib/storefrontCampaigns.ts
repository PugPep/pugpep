import type { SupabaseClient } from "@supabase/supabase-js";

export type StorefrontSale = {
  productSlug: string;
  isOnSale: boolean;
  source: "campaign" | "manual";
  campaignId: string | null;
  campaignName: string | null;
  campaignType: "percent" | "fixed" | "buy_x_get_y" | null;
  salePercent: number;
  fixedDiscount: number;
  buyQuantity: number | null;
  getQuantity: number | null;
  badgeText: string;
  bannerText: string;
  // Null means the campaign minimum could not be verified (or this is a manual sale).
  // Zero means the campaign explicitly has no minimum spend.
  minimumSpend: number | null;
};

type ProductOptionRow = {
  id: string;
  product_slug: string;
  sale_active: boolean | null;
  sale_percent: number | null;
  is_active: boolean | null;
  archived_at?: string | null;
};

type CampaignRpcRow = {
  has_campaign?: boolean;
  sale_campaign_id?: string | null;
  sale_campaign_name?: string | null;
  sale_campaign_type?: string | null;
  discount_value?: number;
  buy_quantity?: number | null;
  get_quantity?: number | null;
};

type CampaignMinimumRow = {
  id: string;
  minimum_spend: number | null;
};

function nonNegative(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function normalizeCampaignType(
  value: unknown
): "percent" | "fixed" | "buy_x_get_y" | null {
  return value === "percent" || value === "fixed" || value === "buy_x_get_y"
    ? value
    : null;
}

function buildCampaignDisplay(row: CampaignRpcRow) {
  const type = normalizeCampaignType(row.sale_campaign_type);
  const discountValue = nonNegative(row.discount_value);

  if (type === "percent") {
    return {
      salePercent: discountValue,
      fixedDiscount: 0,
      buyQuantity: null,
      getQuantity: null,
      badgeText: `${discountValue}% OFF`,
      bannerText: `${discountValue}% OFF SELECTED PRODUCTS`,
    };
  }

  if (type === "fixed") {
    return {
      salePercent: 0,
      fixedDiscount: discountValue,
      buyQuantity: null,
      getQuantity: null,
      badgeText: `$${discountValue.toFixed(2)} OFF`,
      bannerText: `$${discountValue.toFixed(2)} OFF SELECTED PRODUCTS`,
    };
  }

  if (type === "buy_x_get_y") {
    const buyQuantity = Math.max(
      1,
      Math.floor(nonNegative(row.buy_quantity) || 1)
    );

    const getQuantity = Math.max(
      1,
      Math.floor(nonNegative(row.get_quantity) || 1)
    );

    return {
      salePercent: 0,
      fixedDiscount: 0,
      buyQuantity,
      getQuantity,
      badgeText: `BUY ${buyQuantity} GET ${getQuantity} FREE`,
      bannerText: `BUY ${buyQuantity} GET ${getQuantity} FREE ON SELECTED PRODUCTS`,
    };
  }

  return {
    salePercent: 0,
    fixedDiscount: 0,
    buyQuantity: null,
    getQuantity: null,
    badgeText: "CAMPAIGN SALE",
    bannerText: "ACTIVE PROMOTION ON SELECTED PRODUCTS",
  };
}

function chooseBetterSale(
  current: StorefrontSale | undefined,
  candidate: StorefrontSale
) {
  if (!current) return candidate;

  if (candidate.source === "campaign" && current.source !== "campaign") {
    return candidate;
  }

  if (current.source === "campaign" && candidate.source !== "campaign") {
    return current;
  }

  if (candidate.salePercent > current.salePercent) return candidate;
  if (candidate.fixedDiscount > current.fixedDiscount) return candidate;

  return current;
}

export async function loadStorefrontSales(
  supabase: SupabaseClient
): Promise<Record<string, StorefrontSale>> {
  const { data, error } = await supabase
    .from("product_options")
    .select("id,product_slug,sale_active,sale_percent,is_active,archived_at");

  if (error) throw error;

  const allOptions = (data || []) as unknown as ProductOptionRow[];

  const options = allOptions.filter(
    (option) =>
      option.is_active !== false &&
      !option.archived_at
  );

  const sales: Record<string, StorefrontSale> = {};

  options.forEach((option) => {
    if (!option.sale_active) return;

    const salePercent = nonNegative(option.sale_percent);
    if (salePercent <= 0) return;

    const candidate: StorefrontSale = {
      productSlug: option.product_slug,
      isOnSale: true,
      source: "manual",
      campaignId: null,
      campaignName: null,
      campaignType: "percent",
      salePercent,
      fixedDiscount: 0,
      buyQuantity: null,
      getQuantity: null,
      badgeText: `SALE ${salePercent}% OFF`,
      bannerText: `${salePercent}% OFF SELECTED PRODUCTS`,
      minimumSpend: null,
    };

    sales[option.product_slug] = chooseBetterSale(
      sales[option.product_slug],
      candidate
    );
  });

  const campaignResults = await Promise.all(
    options.map(async (option) => {
      try {
        const { data: campaignData, error: campaignError } = await supabase.rpc(
          "get_product_option_campaign_price",
          {
            p_product_option_id: option.id,
          }
        );

        if (
          campaignError ||
          !campaignData ||
          typeof campaignData !== "object"
        ) {
          return null;
        }

        const row = (Array.isArray(campaignData) ? campaignData[0] : campaignData) as CampaignRpcRow | undefined;

        if (!row?.has_campaign) {
          return null;
        }

        const display = buildCampaignDisplay(row);

        const candidate: StorefrontSale = {
          productSlug: option.product_slug,
          isOnSale: true,
          source: "campaign",
          campaignId: row.sale_campaign_id || null,
          campaignName: row.sale_campaign_name || "Active Campaign",
          campaignType: normalizeCampaignType(row.sale_campaign_type),
          salePercent: display.salePercent,
          fixedDiscount: display.fixedDiscount,
          buyQuantity: display.buyQuantity,
          getQuantity: display.getQuantity,
          badgeText: display.badgeText,
          bannerText: display.bannerText,
          minimumSpend: null,
        };

        return candidate;
      } catch (error) {
        console.error("Storefront campaign lookup failed:", error);
        return null;
      }
    })
  );

  const campaignIds = Array.from(
    new Set(
      campaignResults
        .filter((candidate): candidate is StorefrontSale => candidate !== null)
        .map((candidate) => candidate.campaignId)
        .filter((id): id is string => Boolean(id))
    )
  );

  const minimumByCampaign = new Map<string, number>();

  if (campaignIds.length > 0) {
    const { data: minimumRows, error: minimumError } = await supabase
      .from("sale_campaigns")
      .select("id,minimum_spend")
      .in("id", campaignIds);

    if (minimumError) {
      // Do not show an incorrect minimum (including a misleading $0) on the storefront.
      console.error("Unable to load campaign minimum spends:", minimumError);
    } else {
      for (const row of (minimumRows || []) as CampaignMinimumRow[]) {
        minimumByCampaign.set(row.id, Math.round(nonNegative(row.minimum_spend) * 100) / 100);
      }
    }
  }

  campaignResults.forEach((candidate) => {
    if (!candidate) return;

    const enriched: StorefrontSale = {
      ...candidate,
      minimumSpend: candidate.campaignId && minimumByCampaign.has(candidate.campaignId)
        ? minimumByCampaign.get(candidate.campaignId)!
        : null,
    };

    sales[enriched.productSlug] = chooseBetterSale(
      sales[enriched.productSlug],
      enriched
    );
  });

  return sales;
}

export function getPrimaryStorefrontCampaign(
  sales: Record<string, StorefrontSale>
) {
  const campaignSales = Object.values(sales).filter(
    (sale) => sale.source === "campaign" && Boolean(sale.campaignId)
  );

  if (campaignSales.length === 0) return null;

  const groups = new Map<
    string,
    {
      campaignId: string;
      campaignName: string;
      bannerText: string;
      productCount: number;
      minimumSpend: number | null;
    }
  >();

  campaignSales.forEach((sale) => {
    const campaignId = sale.campaignId!;
    const existing = groups.get(campaignId);

    if (existing) {
      existing.productCount += 1;
      return;
    }

    groups.set(campaignId, {
      campaignId,
      campaignName: sale.campaignName || "Active Campaign",
      bannerText: sale.bannerText,
      productCount: 1,
      minimumSpend: sale.minimumSpend,
    });
  });

  return (
    Array.from(groups.values()).sort(
      (a, b) => b.productCount - a.productCount
    )[0] || null
  );
}
