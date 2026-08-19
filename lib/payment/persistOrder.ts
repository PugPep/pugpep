import type { SupabaseClient } from "@supabase/supabase-js";
import type { PricingResult } from "../pricing/types";
import type {
  PendingOrder,
  PaymentMethod,
} from "./types";

export async function persistOrder({
  supabase,
  order,
  pricing,
  paymentMethod,
  lifetimeSpendBefore,
}: {
  supabase: SupabaseClient;
  order: PendingOrder;
  pricing: PricingResult;
  paymentMethod: PaymentMethod;
  lifetimeSpendBefore: number;
}) {
  const accounting =
    pricing.accounting;

  const discounts =
    pricing.discounts;

  const tax =
    pricing.tax;

  const snapshot =
    pricing.snapshot;

  const orderInsert = {
    id: order.id,
    user_id:
      order.userId,
    order_number:
      order.orderNumber,

    customer_organization:
      order.customer.organization,
    organization:
      order.customer.organization,
    customer_name:
      order.customer.name,
    customer_email:
      order.customer.email,
    customer_phone:
      order.customer.phone,

    shipping_address:
      order.customer.address,
    city:
      order.customer.city,
    state:
      order.customer.state,
    zip:
      order.customer.zip,

    subtotal:
      accounting
        .regularMerchandiseValue,

    shipping:
      pricing.shipping
        .shippingCollected,

    shipping_method:
      pricing.shipping
        .shippingMethod,

    shipping_method_label:
      pricing.shipping
        .shippingMethodLabel,

    total:
      accounting.customerTotal,

    promo_code:
      pricing.promo
        .appliedPromoCode,

    promo_discount:
      discounts.generalPromoDiscount +
      discounts.salesRepDiscount,

    promo_discount_type:
      pricing.promo
        .validation
        ?.discountType ||
      null,

    promo_discount_value:
      Number(
        pricing.promo
          .validation
          ?.discountValue ||
        0
      ),

    reward_points_used:
      pricing.rewards.pointsUsed,

    reward_discount:
      discounts.rewardsDiscount,

    rewards_points_earned:
      pricing.rewards.pointsEarned,

    total_discount:
      discounts.totalDiscount,

    hero_account_at_purchase:
      pricing.hero.isHeroAccount,

    hero_discount_percent:
      pricing.hero.heroDiscountPercent,

    hero_discount:
      discounts.heroDiscount,

    bundle_discount:
      discounts.bundleDiscount,

    product_cost_total:
      accounting.productCostTotal,

    estimated_shipping_cost:
      accounting.shippingCost,

    estimated_packaging_cost:
      accounting.packagingCost,

    estimated_profit:
      accounting.profitAfterCommission,

    gross_revenue:
      accounting.grossRevenue,

    net_revenue:
      accounting.netRevenue,

    profit_margin_percent:
      accounting.profitMarginPercent,

    payment_method:
      paymentMethod,

    vip_tier_at_purchase:
      pricing.vip.vipTier,

    lifetime_spend_before:
      lifetimeSpendBefore,

    lifetime_spend_after:
      lifetimeSpendBefore,

    rewards_applied:
      false,

    snapshot_version:
      snapshot.snapshotVersion,

    pricing_engine_version:
      snapshot.pricingEngineVersion,

    pricing_snapshotted_at:
      snapshot.createdAt,

    order_confirmed:
      true,

    status: "pending",

    has_lifetime_free_shipping:
      pricing.shipping
        .hasLifetimeFreeShipping,

    regular_merchandise_value:
      accounting
        .regularMerchandiseValue,

    sale_discount:
      discounts.saleDiscount,

    referral_discount:
      discounts.referralDiscount,

    sales_rep_discount:
      discounts.salesRepDiscount,

    vip_discount:
      discounts.vipDiscount,

    manual_discount:
      discounts.manualDiscount,

    merchandise_revenue_after_discounts:
      accounting
        .merchandiseRevenueAfterDiscounts,

    shipping_collected:
      accounting.shippingCollected,

    shipping_discount_amount:
      pricing.shipping
        .shippingDiscountAmount,

    shipping_discount_reason:
      pricing.shipping
        .shippingDiscountReason,

    actual_shipping_cost:
      accounting.shippingCost,

    actual_packaging_cost:
      accounting.packagingCost,

    other_direct_cost:
      accounting.otherDirectCost,

    profit_at_purchase:
      accounting.profitAfterCommission,

    margin_at_purchase:
      accounting.profitMarginPercent,

    financial_snapshot_locked:
      false,

    primary_sale_campaign_id:
      pricing.campaign
        .primaryCampaignId,

    primary_sale_campaign_name:
      pricing.campaign
        .primaryCampaignName,

    sales_rep_id:
      pricing.commission
        .salesRepId,

    sales_rep_name:
      pricing.commission
        .salesRepName,

    sales_rep_attribution_code:
      pricing.promo
        .appliedPromoSource ===
      "sales_rep"
        ? pricing.promo
            .appliedPromoCode
        : null,

    commission_rate:
      pricing.commission
        .commissionRate,

    commission_basis:
      pricing.commission
        .commissionBasis,

    commissionable_profit:
      pricing.commission
        .commissionBasis,

    commission_amount:
      pricing.commission
        .commissionAmount,

    commission_status:
      pricing.commission
        .commissionStatus,

    taxable_subtotal:
      tax.taxableSubtotal,

    sales_tax_rate:
      tax.salesTaxRate,

    sales_tax_amount:
      tax.salesTaxAmount,

    sales_tax_state:
      tax.salesTaxState,

    sales_tax_county:
      tax.salesTaxCounty,

    sales_tax_city:
      tax.salesTaxCity,

    sales_tax_postal_code:
      tax.salesTaxPostalCode,

    sales_tax_jurisdiction:
      tax.salesTaxJurisdiction,

    tax_provider:
      tax.provider,

    tax_calculation_id:
      tax.taxCalculationId,

    tax_exempt:
      tax.taxExempt,

    tax_exemption_reason:
      tax.taxExemptionReason,

    tax_snapshot: {
      ...tax,

      pricingSnapshotVersion:
        snapshot.snapshotVersion,

      pricingEngineVersion:
        snapshot.pricingEngineVersion,

      steps:
        snapshot.steps,

      warnings:
        snapshot.warnings,
    },
  };

  const { error } =
    await supabase
      .from("orders")
      .insert(orderInsert);

  if (error) {
    throw error;
  }
}