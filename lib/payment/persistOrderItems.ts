import type { SupabaseClient } from "@supabase/supabase-js";
import type { PricingResult } from "../pricing/types";
import type {
  InsertedOrderItem,
  PendingOrder,
} from "./types";

export async function persistOrderItems({
  supabase,
  order,
  pricing,
}: {
  supabase: SupabaseClient;
  order: PendingOrder;
  pricing: PricingResult;
}): Promise<InsertedOrderItem[]> {
  const tax =
    pricing.tax;

  const snapshot =
    pricing.snapshot;

  const orderItems =
    pricing.campaign.items.map(
      (item) => {
        const pendingItem =
          order.items.find(
            (cartItem) =>
              cartItem.productOptionId ===
              item.productOptionId
          );

        const allocatedTax =
          pricing.tax.taxableSubtotal >
          0
            ? Number(
                (
                  pricing.tax
                    .salesTaxAmount *
                  (item.campaignLineRevenue /
                    Math.max(
                      1,
                      pricing.campaign
                        .campaignMerchandiseRevenue
                    ))
                ).toFixed(2)
              )
            : 0;

        const taxableAmount =
          item.isTaxable
            ? Number(
                (
                  pricing.tax
                    .taxableSubtotal *
                  (item.campaignLineRevenue /
                    Math.max(
                      1,
                      pricing.campaign
                        .campaignMerchandiseRevenue
                    ))
                ).toFixed(2)
              )
            : 0;

        return {
          order_id:
            order.id,

          product_option_id:
            item.productOptionId,

          product_slug:
            item.productSlug,

          product_name:
            item.productName,

          dosage:
            item.dosage,

          purchase_type:
            item.purchaseType,

          price:
            item.campaignLineRevenue,

          quantity:
            item.quantity,

          cost:
            item.unitCost,

          was_on_sale:
            item.hasCampaign,

          sale_percent:
            item.regularLineValue >
            0
              ? Number(
                  (
                    (item.saleDiscountAmount /
                      item.regularLineValue) *
                    100
                  ).toFixed(2)
                )
              : 0,

          regular_unit_price:
            item.regularUnitPrice,

          sale_unit_price:
            item.actualUnitPrice,

          actual_unit_price:
            item.actualUnitPrice,

          line_revenue:
            item.campaignLineRevenue,

          line_cost:
            item.lineCost,

          line_profit:
            item.lineProfitBeforeOrderCosts,

          line_margin_percent:
            item.lineMarginBeforeOrderCosts,

          inventory_status:
            pendingItem?.status ||
            null,

          was_pre_sale:
            pendingItem?.status ===
            "pre-sale",

          snapshot_created_at:
            snapshot.createdAt,

          sale_campaign_id:
            item.saleCampaignId,

          sale_campaign_name:
            item.saleCampaignName,

          sale_campaign_type:
            item.saleCampaignType,

          sale_discount_amount:
            item.saleDiscountAmount,

          bundle_discount_amount:
            item.bundleDiscountAmount,

          bundle_discount_percent:
            item.bundleDiscountPercent,

          bundle_tier_quantity:
            item.bundleTierQuantity,

          referral_discount_amount:
            0,

          promo_discount_amount:
            0,

          rewards_discount_amount:
            0,

          free_quantity:
            item.freeQuantity,

          paid_quantity:
            item.paidQuantity,

          pricing_snapshot_locked:
            true,

          taxable_amount:
            taxableAmount,

          sales_tax_rate:
            tax.salesTaxRate,

          sales_tax_amount:
            allocatedTax,

          tax_code:
            item.taxCode,

          is_taxable:
            item.isTaxable,
        };
      }
    );

  if (orderItems.length === 0) {
    throw new Error(
      "Order confirmation stopped because no order items were generated."
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from("order_items")
    .insert(orderItems)
    .select(
      "id,product_option_id"
    );

  if (error) {
    throw error;
  }

  if (
    !data ||
    data.length !==
      orderItems.length
  ) {
    throw new Error(
      `Order item verification failed. Expected ${orderItems.length} item row(s) but saved ${data?.length ?? 0}.`
    );
  }

  return data as InsertedOrderItem[];
}