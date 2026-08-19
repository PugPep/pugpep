import type { SupabaseClient } from "@supabase/supabase-js";
import type { PricingResult } from "../pricing/types";
import type { PendingOrder, InsertedOrderItem } from "./types";

export async function addLedgerEntry({
  supabase,
  orderId,
  orderItemId = null,
  entryType,
  entryCategory,
  label,
  amount,
  quantity = null,
  unitAmount = null,
  sourceType = null,
  sourceId = null,
  sourceCode = null,
  metadata = {},
}: {
  supabase: SupabaseClient;
  orderId: string;
  orderItemId?: string | null;
  entryType: string;
  entryCategory: string;
  label: string;
  amount: number;
  quantity?: number | null;
  unitAmount?: number | null;
  sourceType?: string | null;
  sourceId?: string | null;
  sourceCode?: string | null;
  metadata?: Record<string, unknown>;
}) {
  if (Number(amount || 0) === 0) {
    return;
  }

  const { error } = await supabase.rpc(
    "add_order_ledger_entry",
    {
      p_order_id: orderId,
      p_order_item_id: orderItemId,
      p_entry_type: entryType,
      p_entry_category: entryCategory,
      p_label: label,
      p_amount: amount,
      p_quantity: quantity,
      p_unit_amount: unitAmount,
      p_source_type: sourceType,
      p_source_id: sourceId,
      p_source_code: sourceCode,
      p_metadata: metadata,
    }
  );

  if (error) {
    throw error;
  }
}

export async function persistOrderLedger({
  supabase,
  order,
  pricing,
  insertedItems,
}: {
  supabase: SupabaseClient;
  order: PendingOrder;
  pricing: PricingResult;
  insertedItems: InsertedOrderItem[];
}) {
  const accounting =
    pricing.accounting;

  const discounts =
    pricing.discounts;

  const tax =
    pricing.tax;

  const snapshot =
    pricing.snapshot;

  const insertedItemMap =
    new Map(
      insertedItems.map(
        (item) => [
          item.product_option_id,
          item.id,
        ]
      )
    );

  await addLedgerEntry({
    supabase,
    orderId: order.id,
    entryType: "credit",
    entryCategory:
      "merchandise_revenue",
    label:
      "Regular merchandise value",
    amount:
      accounting
        .regularMerchandiseValue,
    metadata: {
      snapshotVersion:
        snapshot.snapshotVersion,
    },
  });

  const discountEntries = [
    {
      label: "Campaign discount",
      amount: discounts.saleDiscount,
      category: "sale_discount",
      sourceType: "campaign",
      sourceId:
        pricing.campaign
          .primaryCampaignId,
      sourceCode:
        pricing.campaign
          .primaryCampaignName,
    },
    {
      label: "Bundle discount",
      amount: discounts.bundleDiscount,
      category: "bundle_discount",
      sourceType: "bundle",
      sourceId: null,
      sourceCode: null,
    },
    {
      label: "Hero Appreciation discount",
      amount: discounts.heroDiscount,
      category: "hero_discount",
      sourceType: "hero",
      sourceId: order.userId,
      sourceCode:
        pricing.hero.isHeroAccount
          ? "HERO_ACCOUNT"
          : null,
    },
    {
      label: "General promo discount",
      amount:
        discounts
          .generalPromoDiscount,
      category: "promo_discount",
      sourceType: "promo_code",
      sourceId: null,
      sourceCode:
        pricing.promo
          .appliedPromoCode,
    },
    {
      label: "Sales-rep discount",
      amount:
        discounts
          .salesRepDiscount,
      category:
        "sales_rep_discount",
      sourceType: "sales_rep",
      sourceId:
        pricing.commission
          .salesRepId,
      sourceCode:
        pricing.promo
          .appliedPromoCode,
    },
    {
      label: "Referral discount",
      amount:
        discounts
          .referralDiscount,
      category:
        "referral_discount",
      sourceType: "referral",
      sourceId: null,
      sourceCode: null,
    },
    {
      label: "Rewards discount",
      amount:
        discounts
          .rewardsDiscount,
      category:
        "rewards_discount",
      sourceType: "rewards",
      sourceId: null,
      sourceCode: null,
    },
    {
      label: "VIP discount",
      amount: discounts.vipDiscount,
      category: "vip_discount",
      sourceType: "vip",
      sourceId: null,
      sourceCode:
        pricing.vip.vipTier,
    },
    {
      label: "Manual discount",
      amount:
        discounts
          .manualDiscount,
      category: "manual_discount",
      sourceType: "manual",
      sourceId: null,
      sourceCode: null,
    },
    {
      label:
        "Merchant-funded checkout credit",
      amount:
        discounts
          .merchantTaxOffsetDiscount,
      category:
        "merchant_tax_offset",
      sourceType:
        tax.merchantTaxOffsetSourceType,
      sourceId:
        tax.merchantTaxOffsetSourceId,
      sourceCode:
        tax.merchantTaxOffsetSourceCode,
    },
  ];

  for (const entry of discountEntries) {
    if (entry.amount <= 0) {
      continue;
    }

    await addLedgerEntry({
      supabase,
      orderId: order.id,
      entryType: "debit",
      entryCategory:
        entry.category,
      label:
        entry.label,
      amount:
        -entry.amount,
      sourceType:
        entry.sourceType,
      sourceId:
        entry.sourceId,
      sourceCode:
        entry.sourceCode,
    });
  }

  await addLedgerEntry({
    supabase,
    orderId: order.id,
    entryType: "credit",
    entryCategory:
      "shipping_revenue",
    label: "Shipping collected",
    amount:
      accounting
        .shippingCollected,
  });

  await addLedgerEntry({
    supabase,
    orderId: order.id,
    entryType: "liability",
    entryCategory:
      "sales_tax_liability",
    label: "Sales tax collected",
    amount:
      accounting
        .salesTaxCollected,
    metadata: {
      rate:
        tax.salesTaxRate,
      jurisdiction:
        tax.salesTaxJurisdiction,
    },
  });

  for (
    const item
    of pricing.campaign.items
  ) {
    await addLedgerEntry({
      supabase,
      orderId:
        order.id,
      orderItemId:
        insertedItemMap.get(
          item.productOptionId
        ) || null,
      entryType: "debit",
      entryCategory:
        "product_cost",
      label:
        `${item.productName} product cost`,
      amount:
        -item.lineCost,
      quantity:
        item.quantity,
      unitAmount:
        item.unitCost,
      sourceType:
        "product_option",
      sourceId:
        item.productOptionId,
      sourceCode:
        item.productSlug,
    });
  }

  await addLedgerEntry({
    supabase,
    orderId: order.id,
    entryType: "debit",
    entryCategory:
      "shipping_expense",
    label:
      "Estimated shipping expense",
    amount:
      -accounting.shippingCost,
  });

  await addLedgerEntry({
    supabase,
    orderId: order.id,
    entryType: "debit",
    entryCategory:
      "packaging_expense",
    label:
      "Estimated packaging expense",
    amount:
      -accounting.packagingCost,
  });

  await addLedgerEntry({
    supabase,
    orderId: order.id,
    entryType: "debit",
    entryCategory:
      "other_direct_cost",
    label:
      "Other direct cost",
    amount:
      -accounting.otherDirectCost,
  });

  await addLedgerEntry({
    supabase,
    orderId: order.id,
    entryType: "liability",
    entryCategory:
      "sales_rep_commission",
    label:
      "Sales-rep commission",
    amount:
      -pricing.commission
        .commissionAmount,
    sourceType:
      "sales_rep",
    sourceId:
      pricing.commission
        .salesRepId,
    sourceCode:
      pricing.commission
        .salesRepName,
  });
}