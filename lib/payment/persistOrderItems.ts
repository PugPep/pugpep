import type { SupabaseClient } from "@supabase/supabase-js";
import type { PricingResult } from "../pricing/types";
import { paymentLineKey } from "./buildPricingInput";
import type { InsertedOrderItem, PendingOrder } from "./types";

type PricedInputItem = {
  productOptionId: string;
  quantity: number;
  customKitGroupId?: string;
};

function lotKey(slug: unknown, dosage: unknown) {
  return `${String(slug || "").trim()}|${String(dosage || "").trim().toLowerCase().replace(/\s+/g, "")}`;
}

export async function persistOrderItems({
  supabase,
  order,
  pricing,
  pricedInputItems = [],
}: {
  supabase: SupabaseClient;
  order: PendingOrder;
  pricing: PricingResult;
  pricedInputItems?: readonly PricedInputItem[];
}): Promise<InsertedOrderItem[]> {
  const { tax, snapshot } = pricing;
  const lines = pricing.campaign.items;
  const hasCustomKit = pricedInputItems.some((item) => item.customKitGroupId);
  if (lines.length === 0) {
    throw new Error("Order confirmation stopped because no order items were generated.");
  }
  if (hasCustomKit && (
    lines.length !== pricedInputItems.length ||
    lines.some((line, index) =>
      line.productOptionId !== pricedInputItems[index].productOptionId ||
      line.quantity !== pricedInputItems[index].quantity ||
      (pricedInputItems[index].customKitGroupId && line.purchaseType !== "single")
    )
  )) {
    throw new Error("The priced custom-kit lines no longer match your cart.");
  }

  const productSlugs = Array.from(new Set(lines.map((item) =>
    String(item.productSlug || "").trim()).filter(Boolean)));
  const lotByProductAndDosage = new Map<string, string>();
  if (productSlugs.length > 0) {
    const { data: currentCoas, error: currentCoaError } = await supabase
      .from("current_product_coas")
      .select("product_slug,dosage,lot_number")
      .in("product_slug", productSlugs);

    if (currentCoaError) {
      throw new Error(
        `Order confirmation could not verify current lot numbers: ${currentCoaError.message}`
      );
    }

    for (const coa of currentCoas || []) {
      const lot = String(coa.lot_number || "").trim();
      if (String(coa.product_slug || "").trim() && String(coa.dosage || "").trim() && lot) {
        lotByProductAndDosage.set(lotKey(coa.product_slug, coa.dosage), lot);
      }
    }
  }

  const orderItems = lines.map((item, index) => {
    const groupId = hasCustomKit ? pricedInputItems[index].customKitGroupId ?? null : null;
    const pendingItem = order.items.find((cartItem) =>
      cartItem.productOptionId === item.productOptionId &&
      (!hasCustomKit || (
        ("customKitGroupId" in cartItem && typeof cartItem.customKitGroupId === "string"
          ? cartItem.customKitGroupId.toLowerCase()
          : null) === groupId
      ))
    );
    const revenueFraction = item.campaignLineRevenue /
      Math.max(1, pricing.campaign.campaignMerchandiseRevenue);
    const allocatedTax = tax.taxableSubtotal > 0
      ? Number((tax.salesTaxAmount * revenueFraction).toFixed(2))
      : 0;
    const taxableAmount = item.isTaxable
      ? Number((tax.taxableSubtotal * revenueFraction).toFixed(2))
      : 0;

    return {
      order_id: order.id,
      product_option_id: item.productOptionId,
      product_slug: item.productSlug,
      product_name: item.productName,
      dosage: item.dosage,
      lot_number: lotByProductAndDosage.get(lotKey(item.productSlug, item.dosage)) || null,
      purchase_type: item.purchaseType,
      price: item.campaignLineRevenue,
      quantity: item.quantity,
      cost: item.unitCost,
      was_on_sale: item.hasCampaign,
      sale_percent: item.regularLineValue > 0
        ? Number(((item.saleDiscountAmount / item.regularLineValue) * 100).toFixed(2))
        : 0,
      regular_unit_price: item.regularUnitPrice,
      sale_unit_price: item.actualUnitPrice,
      actual_unit_price: item.actualUnitPrice,
      line_revenue: item.campaignLineRevenue,
      line_cost: item.lineCost,
      line_profit: item.lineProfitBeforeOrderCosts,
      line_margin_percent: item.lineMarginBeforeOrderCosts,
      inventory_status: pendingItem?.status || null,
      was_pre_sale: pendingItem?.status === "pre-sale",
      snapshot_created_at: snapshot.createdAt,
      sale_campaign_id: item.saleCampaignId,
      sale_campaign_name: item.saleCampaignName,
      sale_campaign_type: item.saleCampaignType,
      sale_discount_amount: item.saleDiscountAmount,
      bundle_discount_amount: item.bundleDiscountAmount,
      bundle_discount_percent: item.bundleDiscountPercent,
      bundle_tier_quantity: item.bundleTierQuantity,
      referral_discount_amount: 0,
      promo_discount_amount: 0,
      rewards_discount_amount: 0,
      free_quantity: item.freeQuantity,
      paid_quantity: item.paidQuantity,
      pricing_snapshot_locked: true,
      taxable_amount: taxableAmount,
      sales_tax_rate: tax.salesTaxRate,
      sales_tax_amount: allocatedTax,
      tax_code: item.taxCode,
      is_taxable: item.isTaxable,
      ...(hasCustomKit ? { custom_kit_group_id: groupId } : {}),
    };
  });

  const { data, error } = await supabase
    .from("order_items")
    .insert(orderItems)
    .select(hasCustomKit ? "id,product_option_id,custom_kit_group_id" : "id,product_option_id");

  if (error) throw error;
  if (!data || data.length !== orderItems.length) {
    throw new Error(
      `Order item verification failed. Expected ${orderItems.length} item row(s) but saved ${data?.length ?? 0}.`
    );
  }

  if (!hasCustomKit) return data as unknown as InsertedOrderItem[];

  // Match returned rows by option and group so a loose vial and a kit vial
  // with the same option ID keep separate order-item IDs in the ledger.
  const inserted = data as unknown as Array<InsertedOrderItem & {
    custom_kit_group_id: string | null;
  }>;
  const insertedByLine = new Map(inserted.map((item) => [
    paymentLineKey(item.product_option_id, item.custom_kit_group_id),
    item,
  ]));
  return pricedInputItems.map((item) => {
    const saved = insertedByLine.get(paymentLineKey(item.productOptionId, item.customKitGroupId));
    if (!saved) throw new Error("A saved custom-kit line could not be verified.");
    return saved;
  });
}
