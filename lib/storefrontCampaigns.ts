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
};

type ProductOptionRow = {
  id: string;
  product_slug: string;
  sale_active: boolean | null;
  sale_percent: number | null;
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
    .select("id,product_slug,sale_active,sale_percent");

  if (error) throw error;

  const options = (data || []) as unknown as ProductOptionRow[];
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

        const row = campaignData as CampaignRpcRow;

        if (!row.has_campaign) {
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
        };

        return candidate;
      } catch (error) {
        console.error("Storefront campaign lookup failed:", error);
        return null;
      }
    })
  );

  campaignResults.forEach((candidate) => {
    if (!candidate) return;

    sales[candidate.productSlug] = chooseBetterSale(
      sales[candidate.productSlug],
      candidate
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
    });
  });

  return (
    Array.from(groups.values()).sort(
      (a, b) => b.productCount - a.productCount
    )[0] || null
  );
}