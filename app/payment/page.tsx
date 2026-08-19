"use client";

import emailjs from "emailjs-com";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useCart } from "../cartContext";
import { createClient } from "../../lib/supabaseClient";
import { trackEvent } from "../../lib/trackEvent";
import { calculatePricing } from "../../lib/pricing/pricingEngine";

import type {
  PricingInput,
  PricingResult,
  PricingSnapshot,
  ShippingMethod,
} from "../../lib/pricing/types";

type PaymentMethod =
  | "cashapp"
  | "venmo"
  | "zelle"
  | "crypto";

type PendingCustomer = {
  organization: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
};

type PendingCartItem = {
  productOptionId?: string;
  slug: string;
  name: string;
  dosage: string;
  purchaseType: "single" | "kit";
  price: number;
  regularPrice?: number;
  salePrice?: number;
  wasOnSale?: boolean;
  salePercent?: number;
  cost?: number;
  quantity?: number;
  status?: string;
  maxAvailable?: number;
  image?: string;
};

type PendingOrder = {
  id: string;
  userId: string | null;
  orderNumber: string;
  customer: PendingCustomer;
  items: PendingCartItem[];

  pricingInput?: {
    items: {
      productOptionId?: string;
      quantity: number;
    }[];

    promoCode?: string | null;
    rewardPointsRequested?: number;
    shippingMethod?: ShippingMethod;

    shippingAddress: {
      countryCode: string;
      stateCode: string;
      postalCode: string;
      city?: string;
      county?: string;
    };
  };

  pricing?: PricingResult;
  pricingSnapshot?: PricingSnapshot;

  shippingMethod?: ShippingMethod;
  shippingMethodLabel?: string;
  paymentMethod?: PaymentMethod;

  subtotal: number;
  shipping: number;
  salesTax?: number;
  rewardPointsUsed?: number;
  rewardDiscount?: number;
  promoCode?: string | null;
  promoSource?: string | null;
  promoDiscountAllowed?: boolean;
  promoDiscountType?: string | null;
  promoDiscountValue?: number;
  promoDiscount?: number;
  totalDiscount?: number;
  total: number;
  hasLifetimeFreeShipping?: boolean;
  createdAt: string;
  confirmed?: boolean;
};

type CustomerProfileRow = {
  reward_points: number | null;
  lifetime_spend: number | null;
};

type SupabaseErrorDetails = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
};

const contactLinks = [
  {
    label: "Join Discord",
    href: "https://discord.gg/yas8DetFz",
  },
  {
    label: "Telegram",
    href: "https://t.me/PugPeps",
  },
  {
    label: "Email Us",
    href: "mailto:support@pugpep.com",
  },
];

function getErrorMessage(
  error: unknown,
  fallback = "An unexpected error occurred."
) {
  if (
    error instanceof Error &&
    error.message
  ) {
    return error.message;
  }

  if (
    typeof error === "string" &&
    error.trim()
  ) {
    return error;
  }

  if (
    error &&
    typeof error === "object"
  ) {
    const databaseError =
      error as SupabaseErrorDetails;

    const parts = [
      databaseError.message,
      databaseError.details,
      databaseError.hint,
      databaseError.code
        ? `Error code: ${databaseError.code}`
        : null,
    ].filter(
      (
        value
      ): value is string =>
        typeof value === "string" &&
        value.trim().length > 0
    );

    if (parts.length > 0) {
      return parts.join(" | ");
    }
  }

  return fallback;
}

function money(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function buildPricingInput(
  order: PendingOrder,
  supabase: ReturnType<
    typeof createClient
  >
): PricingInput {
  const sourceItems =
    order.pricingInput?.items ||
    order.items.map(
      (item) => ({
        productOptionId:
          item.productOptionId,

        quantity:
          Number(
            item.quantity || 1
          ),
      })
    );

  const missingItem =
    sourceItems.find(
      (item) =>
        !item.productOptionId
    );

  if (missingItem) {
    throw new Error(
      "One or more cart items are missing their product option ID. Return to checkout, remove them, and add them again."
    );
  }

  return {
    supabase,

    customerId:
      order.userId || "",

    items:
      sourceItems.map(
        (item) => ({
          productOptionId:
            item.productOptionId as string,

          quantity:
            Number(
              item.quantity || 1
            ),
        })
      ),

    promoCode:
      order.pricingInput
        ?.promoCode ??
      order.promoCode ??
      null,

    rewardPointsRequested:
      Number(
        order.pricingInput
          ?.rewardPointsRequested ??
          order.rewardPointsUsed ??
          0
      ),

    shippingMethod:
      order.pricingInput
        ?.shippingMethod ??
      order.shippingMethod ??
      order.pricing
        ?.shipping
        .shippingMethod ??
      "standard",

    shippingAddress:
      order.pricingInput
        ?.shippingAddress || {
        countryCode: "US",

        stateCode:
          order.customer.state,

        postalCode:
          order.customer.zip,

        city:
          order.customer.city,
      },
  };
}

async function addLedgerEntry({
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
  supabase: ReturnType<
    typeof createClient
  >;
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
  metadata?: Record<
    string,
    unknown
  >;
}) {
  if (Number(amount || 0) === 0) {
    return;
  }

  const {
    error,
  } = await supabase.rpc(
    "add_order_ledger_entry",
    {
      p_order_id: orderId,
      p_order_item_id:
        orderItemId,
      p_entry_type:
        entryType,
      p_entry_category:
        entryCategory,
      p_label: label,
      p_amount: amount,
      p_quantity: quantity,
      p_unit_amount:
        unitAmount,
      p_source_type:
        sourceType,
      p_source_id:
        sourceId,
      p_source_code:
        sourceCode,
      p_metadata:
        metadata,
    }
  );

  if (error) {
    throw error;
  }
}

export default function PaymentPage() {
  const router = useRouter();

  const supabase = useMemo(
    () => createClient(),
    []
  );

  const { clearCart } =
    useCart();

  const [method, setMethod] =
    useState<PaymentMethod>(
      "venmo"
    );

  const [order, setOrder] =
    useState<PendingOrder | null>(
      null
    );

  const [confirming, setConfirming] =
    useState(false);

  const [loadingOrder, setLoadingOrder] =
    useState(true);

  useEffect(() => {
    try {
      const savedOrder =
        localStorage.getItem(
          "pugpep_order"
        );

      if (savedOrder) {
        setOrder(
          JSON.parse(
            savedOrder
          ) as PendingOrder
        );
      }
    } catch (error) {
      console.error(
        "Unable to load pending order:",
        error
      );
    } finally {
      setLoadingOrder(false);
    }
  }, []);

  async function rollbackOrder(
    orderId: string
  ) {
    try {
      await supabase
        .from(
          "order_financial_ledger"
        )
        .delete()
        .eq(
          "order_id",
          orderId
        );

      await supabase
        .from("order_items")
        .delete()
        .eq(
          "order_id",
          orderId
        );

      await supabase
        .from("orders")
        .delete()
        .eq("id", orderId);
    } catch (rollbackError) {
      console.error(
        "Unable to fully roll back incomplete order:",
        rollbackError
      );
    }
  }

  async function confirmOrder() {
    if (
      !order ||
      confirming
    ) {
      return;
    }

    if (order.confirmed) {
      router.replace(
        `/order-confirmed?order=${encodeURIComponent(
          order.orderNumber
        )}`
      );
      return;
    }

    setConfirming(true);

    let orderInserted = false;
    let rewardsDeducted = false;
    let deductedRewardPoints = 0;

    try {
      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (
        !user ||
        !order.userId ||
        user.id !== order.userId
      ) {
        throw new Error(
          "You must be signed in to the same account used at checkout."
        );
      }

      const {
        data: existingOrder,
        error:
          existingOrderError,
      } = await supabase
        .from("orders")
        .select("id")
        .eq("id", order.id)
        .maybeSingle();

      if (
        existingOrderError
      ) {
        throw existingOrderError;
      }

      if (existingOrder) {
        const {
          count: existingItemCount,
          error: existingItemsError,
        } = await supabase
          .from("order_items")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("order_id", order.id);

        if (existingItemsError) {
          throw existingItemsError;
        }

        if (!existingItemCount || existingItemCount <= 0) {
          throw new Error(
            "This order record exists, but its product items are missing. The order was not confirmed. Please contact support before retrying."
          );
        }

        const confirmedOrder = {
          ...order,
          confirmed: true,
        };

        localStorage.setItem(
          "pugpep_order",
          JSON.stringify(
            confirmedOrder
          )
        );

        setOrder(
          confirmedOrder
        );

        clearCart();

        router.replace(
          `/order-confirmed?order=${encodeURIComponent(
            order.orderNumber
          )}`
        );

        return;
      }

      /*
       * Re-run the entire pricing engine immediately before
       * creating the order. The browser snapshot is display-only.
       */
      const authoritativePricing =
        await calculatePricing(
          buildPricingInput(
            order,
            supabase
          )
        );

      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from(
          "customer_profiles"
        )
        .select(
          "reward_points,lifetime_spend"
        )
        .eq("id", order.userId)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      if (!profileData) {
        throw new Error(
          "Customer profile could not be found."
        );
      }

      const profile =
        profileData as unknown as CustomerProfileRow;

      const rewardPointsBefore =
        Math.max(
          0,
          Number(
            profile.reward_points ||
              0
          )
        );

      const lifetimeSpendBefore =
        Math.max(
          0,
          Number(
            profile.lifetime_spend ||
              0
          )
        );

      const pricing =
        authoritativePricing;

      if (
        !pricing.campaign.items ||
        pricing.campaign.items.length === 0
      ) {
        throw new Error(
          "Order confirmation stopped because no priced items were generated. Your cart has not been cleared."
        );
      }

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
          order.customer
            .organization,

        organization:
          order.customer
            .organization,

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
          discounts
            .generalPromoDiscount +
          discounts
            .salesRepDiscount,

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
          pricing.rewards
            .pointsUsed,

        reward_discount:
          discounts
            .rewardsDiscount,

        rewards_points_earned:
          pricing.rewards
            .pointsEarned,

        total_discount:
          discounts
            .totalDiscount,

        hero_account_at_purchase:
          pricing.hero.isHeroAccount,

        hero_discount_percent:
          pricing.hero.heroDiscountPercent,

        hero_discount:
          discounts.heroDiscount,

        bundle_discount:
          discounts.bundleDiscount,

        product_cost_total:
          accounting
            .productCostTotal,

        estimated_shipping_cost:
          accounting
            .shippingCost,

        estimated_packaging_cost:
          accounting
            .packagingCost,

        estimated_profit:
          accounting
            .profitAfterCommission,

        gross_revenue:
          accounting
            .grossRevenue,

        net_revenue:
          accounting
            .netRevenue,

        profit_margin_percent:
          accounting
            .profitMarginPercent,

        payment_method:
          method,

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
          discounts
            .referralDiscount,

        sales_rep_discount:
          discounts
            .salesRepDiscount,

        vip_discount:
          discounts.vipDiscount,

        manual_discount:
          discounts
            .manualDiscount,

        merchandise_revenue_after_discounts:
          accounting
            .merchandiseRevenueAfterDiscounts,

        shipping_collected:
          accounting
            .shippingCollected,

        shipping_discount_amount:
          pricing.shipping
            .shippingDiscountAmount,

        shipping_discount_reason:
          pricing.shipping
            .shippingDiscountReason,

        actual_shipping_cost:
          accounting
            .shippingCost,

        actual_packaging_cost:
          accounting
            .packagingCost,

        other_direct_cost:
          accounting
            .otherDirectCost,

        profit_at_purchase:
          accounting
            .profitAfterCommission,

        margin_at_purchase:
          accounting
            .profitMarginPercent,

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

      const {
        error: orderError,
      } = await supabase
        .from("orders")
        .insert(
          orderInsert
        );

      if (orderError) {
        throw orderError;
      }

      orderInserted = true;

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
        data: insertedItems,
        error: itemsError,
      } = await supabase
        .from("order_items")
        .insert(orderItems)
        .select(
          "id,product_option_id"
        );

      if (itemsError) {
        throw itemsError;
      }

      if (
        !insertedItems ||
        insertedItems.length !== orderItems.length
      ) {
        throw new Error(
          `Order item verification failed. Expected ${orderItems.length} item row(s) but saved ${insertedItems?.length ?? 0}.`
        );
      }

      const insertedItemMap =
        new Map(
          (
            insertedItems || []
          ).map(
            (item) => [
              item.product_option_id,
              item.id,
            ]
          )
        );

      /*
       * Order-level ledger.
       */
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
          label:
            "Campaign discount",
          amount:
            discounts.saleDiscount,
          category:
            "sale_discount",
          sourceType:
            "campaign",
          sourceId:
            pricing.campaign
              .primaryCampaignId,
          sourceCode:
            pricing.campaign
              .primaryCampaignName,
        },
        {
          label:
            "Bundle discount",
          amount:
            discounts.bundleDiscount,
          category:
            "bundle_discount",
          sourceType:
            "bundle",
          sourceId: null,
          sourceCode: null,
        },
        {
          label:
            "Hero Appreciation discount",
          amount:
            discounts.heroDiscount,
          category:
            "hero_discount",
          sourceType:
            "hero",
          sourceId:
            order.userId,
          sourceCode:
            pricing.hero.isHeroAccount
              ? "HERO_ACCOUNT"
              : null,
        },
        {
          label:
            "General promo discount",
          amount:
            discounts
              .generalPromoDiscount,
          category:
            "promo_discount",
          sourceType:
            "promo_code",
          sourceId: null,
          sourceCode:
            pricing.promo
              .appliedPromoCode,
        },
        {
          label:
            "Sales-rep discount",
          amount:
            discounts
              .salesRepDiscount,
          category:
            "sales_rep_discount",
          sourceType:
            "sales_rep",
          sourceId:
            pricing.commission
              .salesRepId,
          sourceCode:
            pricing.promo
              .appliedPromoCode,
        },
        {
          label:
            "Referral discount",
          amount:
            discounts
              .referralDiscount,
          category:
            "referral_discount",
          sourceType:
            "referral",
          sourceId: null,
          sourceCode: null,
        },
        {
          label:
            "Rewards discount",
          amount:
            discounts
              .rewardsDiscount,
          category:
            "rewards_discount",
          sourceType:
            "rewards",
          sourceId: null,
          sourceCode: null,
        },
        {
          label:
            "VIP discount",
          amount:
            discounts.vipDiscount,
          category:
            "vip_discount",
          sourceType:
            "vip",
          sourceId: null,
          sourceCode:
            pricing.vip.vipTier,
        },
        {
          label:
            "Manual discount",
          amount:
            discounts
              .manualDiscount,
          category:
            "manual_discount",
          sourceType:
            "manual",
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

      for (
        const entry
        of discountEntries
      ) {
        if (entry.amount <= 0) {
          continue;
        }

        await addLedgerEntry({
          supabase,
          orderId:
            order.id,
          entryType:
            "debit",
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
        label:
          "Shipping collected",
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
        label:
          "Sales tax collected",
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
          entryType:
            "debit",
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
          -accounting
            .shippingCost,
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
          -accounting
            .packagingCost,
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
          -accounting
            .otherDirectCost,
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

      const {
        error:
          attributionError,
      } = await supabase.rpc(
        "finalize_sales_rep_order_attribution",
        {
          p_order_id:
            order.id,

          p_customer_id:
            order.userId,

          p_promo_code:
            pricing.promo
              .appliedPromoCode,

          p_discount_amount:
            discounts
              .salesRepDiscount,

          p_commissionable_profit:
            pricing.commission
              .commissionBasis,
        }
      );

      if (
        attributionError
      ) {
        throw attributionError;
      }

      if (
        pricing.rewards
          .pointsUsed > 0
      ) {
        const remainingPoints =
          Math.max(
            0,
            rewardPointsBefore -
              pricing.rewards
                .pointsUsed
          );

        const {
          error:
            rewardUpdateError,
        } = await supabase
          .from(
            "customer_profiles"
          )
          .update({
            reward_points:
              remainingPoints,
          })
          .eq(
            "id",
            order.userId
          );

        if (
          rewardUpdateError
        ) {
          throw rewardUpdateError;
        }

        rewardsDeducted =
          true;

        deductedRewardPoints =
          pricing.rewards
            .pointsUsed;
      }

      const {
        error: lockError,
      } = await supabase.rpc(
        "lock_order_financial_snapshot",
        {
          p_order_id:
            order.id,
        }
      );

      if (lockError) {
        throw lockError;
      }

      try {
        await emailjs.send(
          "service_quxnkin",
          "template_xz4gtk9",
          {
            organization:
              order.customer
                .organization,

            name:
              order.customer.name,

            email:
              order.customer.email,

            admin_email:
              "Support@PugPep.com",

            order_number:
              order.orderNumber,

            items:
              pricing.campaign.items.map(
                (item) => ({
                  name:
                    `${item.productName} (${item.dosage})`,

                  quantity:
                    item.quantity,

                  price:
                    money(
                      item.campaignLineRevenue
                    ),
                })
              ),

            shipping:
              accounting
                .shippingCollected.toFixed(
                  2
                ),

            tax:
              accounting
                .salesTaxCollected.toFixed(
                  2
                ),

            promo_code:
              pricing.promo
                .appliedPromoCode ||
              "",

            promo_discount:
              (
                discounts
                  .generalPromoDiscount +
                discounts
                  .salesRepDiscount
              ).toFixed(2),

            reward_discount:
              discounts
                .rewardsDiscount.toFixed(
                  2
                ),

            total:
              accounting
                .customerTotal.toFixed(
                  2
                ),
          },

          "yc_0cE0Mcl3tfzc11"
        );
      } catch (emailError) {
        console.error(
          "Order created, but confirmation email failed:",
          emailError
        );
      }

      try {
        const smsResponse =
          await fetch(
            "/api/send-order-confirmation-sms",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  customerPhone:
                    order.customer
                      .phone,

                  orderNumber:
                    order.orderNumber,

                  orderTotal:
                    accounting
                      .customerTotal,
                }),
            }
          );

        if (
          !smsResponse.ok
        ) {
          console.error(
            "Order created, but confirmation SMS failed."
          );
        }
      } catch (smsError) {
        console.error(
          "Order created, but confirmation SMS failed:",
          smsError
        );
      }

      await trackEvent({
        event_type:
          "order_created",

        order_number:
          order.orderNumber,

        metadata: {
          total:
            accounting
              .customerTotal,

          itemCount:
            pricing.campaign
              .items.length,

          promoCode:
            pricing.promo
              .appliedPromoCode,

          paymentMethod:
            method,

          salesTax:
            accounting
              .salesTaxCollected,

          profit:
            accounting
              .profitAfterCommission,
        },
      });

      await trackEvent({
        event_type:
          "order_confirmed",

        order_number:
          order.orderNumber,

        metadata: {
          total:
            accounting
              .customerTotal,

          paymentMethod:
            method,
        },
      });

      const confirmedOrder: PendingOrder =
        {
          ...order,

          paymentMethod:
            method,

          pricing,

          pricingSnapshot:
            snapshot,

          subtotal:
            accounting
              .regularMerchandiseValue,

          shipping:
            accounting
              .shippingCollected,

          shippingMethod:
            pricing.shipping
              .shippingMethod,

          shippingMethodLabel:
            pricing.shipping
              .shippingMethodLabel,

          salesTax:
            accounting
              .salesTaxCollected,

          rewardPointsUsed:
            pricing.rewards
              .pointsUsed,

          rewardDiscount:
            discounts
              .rewardsDiscount,

          promoCode:
            pricing.promo
              .appliedPromoCode,

          promoSource:
            pricing.promo
              .appliedPromoSource,

          promoDiscount:
            discounts
              .generalPromoDiscount +
            discounts
              .salesRepDiscount,

          totalDiscount:
            discounts
              .totalDiscount,

          total:
            accounting
              .customerTotal,

          hasLifetimeFreeShipping:
            pricing.shipping
              .hasLifetimeFreeShipping,

          confirmed: true,
        };

      localStorage.setItem(
        "pugpep_order",
        JSON.stringify(
          confirmedOrder
        )
      );

      setOrder(
        confirmedOrder
      );

      clearCart();

      router.replace(
        `/order-confirmed?order=${encodeURIComponent(
          order.orderNumber
        )}`
      );
    } catch (error: unknown) {
      if (
        rewardsDeducted &&
        order.userId &&
        deductedRewardPoints >
          0
      ) {
        try {
          const {
            data,
          } = await supabase
            .from(
              "customer_profiles"
            )
            .select(
              "reward_points"
            )
            .eq(
              "id",
              order.userId
            )
            .maybeSingle();

          if (data) {
            await supabase
              .from(
                "customer_profiles"
              )
              .update({
                reward_points:
                  Number(
                    data.reward_points ||
                      0
                  ) +
                  deductedRewardPoints,
              })
              .eq(
                "id",
                order.userId
              );
          }
        } catch (rewardRollbackError) {
          console.error(
            "Unable to restore reward points after failure:",
            rewardRollbackError
          );
        }
      }

      if (
        orderInserted
      ) {
        await rollbackOrder(
          order.id
        );
      }

      const message =
        getErrorMessage(
          error,
          "The order could not be confirmed. Your cart was not cleared."
        );

      console.error(
        "Order confirmation error:",
        error
      );

      alert(message);
    } finally {
      setConfirming(false);
    }
  }

  useEffect(() => {
    function handlePaymentEnter(
      event: KeyboardEvent
    ) {
      if (
        event.key !== "Enter" ||
        event.defaultPrevented ||
        confirming ||
        !order ||
        Boolean(order.confirmed)
      ) {
        return;
      }

      const target =
        event.target as HTMLElement | null;

      /*
       * If focus is already on a real interactive control,
       * let the browser activate that control normally.
       *
       * This means Enter on Cash App, Venmo, Zelle,
       * Crypto, Aurpay, links, etc. does not accidentally
       * confirm the order.
       */
      if (
        target?.closest(
          "button, a, input, select, textarea, [role='button']"
        )
      ) {
        return;
      }

      event.preventDefault();

      void confirmOrder();
    }

    window.addEventListener(
      "keydown",
      handlePaymentEnter
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handlePaymentEnter
      );
    };
  }, [
    confirming,
    order,
  ]);


  if (loadingOrder) {
    return (
      <main style={page}>
        <div style={container}>
          <div style={loadingCard}>
            <div style={loadingOrb} />

            <h1 style={title}>
              Secure Payment
            </h1>

            <p style={muted}>
              Preparing your order...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main style={page}>
        <div style={container}>
          <div style={emptyState}>
            <div style={emptyIcon}>
              🧪
            </div>

            <h1 style={title}>
              No Order Found
            </h1>

            <p style={muted}>
              Return to checkout to prepare your order.
            </p>

            <a
              href="/checkout"
              style={returnButton}
            >
              Return to Checkout
            </a>
          </div>
        </div>
      </main>
    );
  }

  const displayPricing =
    order.pricing;

  const displayTotal =
    displayPricing?.accounting
      .customerTotal ??
    Number(order.total || 0);

  const deliveryLabel =
    displayPricing
      ?.shipping
      .shippingMethodLabel ||
    order.shippingMethodLabel ||
    "Delivery";

  const deliveryAmount =
    displayPricing
      ?.shipping
      .shippingCollected ??
    Number(order.shipping || 0);

  const taxEnabled =
    Boolean(
      displayPricing?.tax.enabled
    );

  return (
    <main style={page}>
      <div style={container}>
        <header style={header}>
          <div>
            <p style={eyebrow}>
              SECURE CHECKOUT
            </p>

            <h1 style={title}>
              Complete Your Order
            </h1>

            <p style={subtitle}>
              Choose your payment method, review the details, and submit when everything looks right.
            </p>
          </div>

          <div style={orderBadge}>
            <span style={orderBadgeLabel}>
              ORDER
            </span>

            <strong>
              {order.orderNumber}
            </strong>
          </div>
        </header>

        <div style={progressBar}>
          <ProgressStep
            number="1"
            label="Checkout"
            complete
          />

          <div style={progressLine} />

          <ProgressStep
            number="2"
            label="Payment"
            active
          />

          <div style={progressLine} />

          <ProgressStep
            number="3"
            label="Submitted"
          />
        </div>

        <div
          className="payment-layout"
          style={layout}
        >
          <section style={stack}>
            <div style={card}>
              <div style={sectionHeading}>
                <span style={sectionNumber}>
                  1
                </span>

                <div>
                  <h2 style={sectionTitle}>
                    Delivery Details
                  </h2>

                  <p style={sectionHelper}>
                    Confirm where your order is going.
                  </p>
                </div>
              </div>

              <InfoRow
                label="Organization"
                value={
                  order.customer
                    .organization
                }
              />

              <InfoRow
                label="Name"
                value={
                  order.customer.name
                }
              />

              <InfoRow
                label="Email"
                value={
                  order.customer.email
                }
              />

              <InfoRow
                label="Delivery Address"
                value={`${order.customer.address}, ${order.customer.city}, ${order.customer.state} ${order.customer.zip}`}
              />

              <InfoRow
                label="Delivery Method"
                value={
                  deliveryAmount === 0
                    ? `${deliveryLabel} — Free`
                    : `${deliveryLabel} — ${money(deliveryAmount)}`
                }
              />
            </div>

            <div style={card}>
              <div style={sectionHeading}>
                <span style={sectionNumber}>
                  2
                </span>

                <div>
                  <h2 style={sectionTitle}>
                    Payment Method
                  </h2>

                  <p style={sectionHelper}>
                    Select the option you plan to use.
                  </p>
                </div>
              </div>

              <div
                className="payment-method-grid"
                style={methodGrid}
              >
                {[
                  ["cashapp", "Cash App", "$"],
                  ["venmo", "Venmo", "V"],
                  ["zelle", "Zelle", "Z"],
                  ["crypto", "Crypto", "₿"],
                ].map(
                  ([
                    value,
                    label,
                    icon,
                  ]) => {
                    const selected =
                      method === value;

                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          const selectedMethod =
                            value as PaymentMethod;

                          setMethod(
                            selectedMethod
                          );

                          void trackEvent({
                            event_type:
                              "payment_method_selected",

                            payment_method:
                              selectedMethod,

                            order_number:
                              order.orderNumber,
                          });
                        }}
                        style={{
                          ...methodButton,

                          borderColor:
                            selected
                              ? "#ff45d8"
                              : "rgba(0,217,255,.28)",

                          background:
                            selected
                              ? "linear-gradient(145deg, rgba(255,47,208,.18), rgba(0,217,255,.11))"
                              : "linear-gradient(145deg, rgba(8,8,12,.96), rgba(14,8,17,.94))",

                          boxShadow:
                            selected
                              ? "0 0 18px rgba(255,47,208,.22)"
                              : "none",
                        }}
                      >
                        <span
                          style={{
                            ...methodIcon,

                            color:
                              selected
                                ? "#ff75df"
                                : "#7df9ff",

                            borderColor:
                              selected
                                ? "#ff45d8"
                                : "#00d9ff",
                          }}
                        >
                          {icon}
                        </span>

                        <span>
                          {label}
                        </span>

                        <span
                          style={{
                            ...selectedDot,

                            background:
                              selected
                                ? "#00ff99"
                                : "transparent",

                            borderColor:
                              selected
                                ? "#00ff99"
                                : "#555",
                          }}
                        />
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            <div style={paymentCard}>
              {method ===
                "cashapp" && (
                <PaymentInstructions
                  title="Cash App"
                  accent="#31d86f"
                  amount={
                    displayTotal
                  }
                  paymentInfo="$PugPep1111"
                  message="Include only your name in the memo or note section."
                />
              )}

              {method ===
                "venmo" && (
                <PaymentInstructions
                  title="Venmo"
                  accent="#00d9ff"
                  amount={
                    displayTotal
                  }
                  paymentInfo="@PugPep1111"
                  message="Friends & Family preferred. Include only your name in the note section."
                />
              )}

              {method ===
                "zelle" && (
                <ZellePayment
                  amount={
                    displayTotal
                  }
                />
              )}

              {method ===
                "crypto" && (
                <>
                  <AurpayButton
                    orderNumber={
                      order.orderNumber
                    }
                    total={
                      displayTotal
                    }
                  />

                  <img
                    src="/crypto-banner.png"
                    alt="We Accept Crypto"
                    style={cryptoBanner}
                  />
                </>
              )}
            </div>
          </section>

          <aside
            className="payment-review"
            style={reviewColumn}
          >
            <div style={summaryCard}>
              <div style={summaryHeader}>
                <div>
                  <p style={summaryEyebrow}>
                    ORDER REVIEW
                  </p>

                  <h2 style={summaryTitle}>
                    Your Total
                  </h2>
                </div>

                <strong style={heroTotal}>
                  {money(
                    displayTotal
                  )}
                </strong>
              </div>

              {displayPricing ? (
                <div style={summaryRows}>
                  <SummaryRow
                    label="Items"
                    value={money(
                      displayPricing
                        .accounting
                        .regularMerchandiseValue
                    )}
                  />

                  <DiscountRow
                    label="Sale Savings"
                    value={
                      displayPricing
                        .discounts
                        .saleDiscount
                    }
                  />

                  <DiscountRow
                    label="Promo Savings"
                    value={
                      displayPricing
                        .discounts
                        .generalPromoDiscount
                    }
                  />

                  <DiscountRow
                    label="Partner Savings"
                    value={
                      displayPricing
                        .discounts
                        .salesRepDiscount
                    }
                  />

                  <DiscountRow
                    label="Referral Savings"
                    value={
                      displayPricing
                        .discounts
                        .referralDiscount
                    }
                  />

                  <DiscountRow
                    label="PugPoints Applied"
                    value={
                      displayPricing
                        .discounts
                        .rewardsDiscount
                    }
                  />

                  <DiscountRow
                    label="VIP Savings"
                    value={
                      displayPricing
                        .discounts
                        .vipDiscount
                    }
                  />

                  <DiscountRow
                    label="PugPep Credit"
                    value={
                      displayPricing
                        .discounts
                        .merchantTaxOffsetDiscount
                    }
                  />

                  <SummaryRow
                    label="After Savings"
                    value={money(
                      displayPricing
                        .accounting
                        .merchandiseRevenueAfterDiscounts
                    )}
                  />

                  <SummaryRow
                    label={
                      displayPricing
                        .shipping
                        .shippingMethodLabel
                    }
                    value={
                      displayPricing
                        .shipping
                        .shippingCollected ===
                      0
                        ? "FREE"
                        : money(
                            displayPricing
                              .shipping
                              .shippingCollected
                          )
                    }
                    positive={
                      displayPricing
                        .shipping
                        .shippingCollected ===
                      0
                    }
                  />

                  {taxEnabled && (
                    <SummaryRow
                      label="Sales Tax"
                      value={money(
                        displayPricing
                          .tax
                          .salesTaxAmount
                      )}
                    />
                  )}
                </div>
              ) : (
                <div style={summaryRows}>
                  <SummaryRow
                    label="Items"
                    value={money(
                      Number(
                        order.subtotal ||
                          0
                      )
                    )}
                  />

                  <DiscountRow
                    label="Savings"
                    value={Number(
                      order.totalDiscount ||
                        0
                    )}
                  />

                  <SummaryRow
                    label={
                      order.shippingMethodLabel ||
                      "Delivery"
                    }
                    value={
                      Number(
                        order.shipping ||
                          0
                      ) === 0
                        ? "FREE"
                        : money(
                            Number(
                              order.shipping ||
                                0
                            )
                          )
                    }
                    positive={
                      Number(
                        order.shipping ||
                          0
                      ) === 0
                    }
                  />
                </div>
              )}

              <div style={grandTotalRow}>
                <span>
                  Amount Due
                </span>

                <strong>
                  {money(
                    displayTotal
                  )}
                </strong>
              </div>
            </div>

            {displayPricing && (
              <details style={detailsCard}>
                <summary style={detailsSummary}>
                  Order Breakdown
                </summary>

                <div style={stepList}>
                  {displayPricing
                    .snapshot
                    .steps
                    .filter(
                      (step) => {
                        if (
                          step.category ===
                            "cost" ||
                          step.category ===
                            "commission" ||
                          step.category ===
                            "profit"
                        ) {
                          return false;
                        }

                        if (
                          !taxEnabled &&
                          step.category ===
                            "tax"
                        ) {
                          return false;
                        }

                        return true;
                      }
                    )
                    .map(
                      (
                        step,
                        index
                      ) => (
                        <div
                          key={`${step.label}-${index}`}
                          style={stepRow}
                        >
                          {step.message}
                        </div>
                      )
                    )}
                </div>
              </details>
            )}

            <div style={trustCard}>
              <div style={trustItem}>
                <span style={trustIcon}>
                  ✓
                </span>

                Secure checkout
              </div>

              <div style={trustItem}>
                <span style={trustIcon}>
                  ✓
                </span>

                Delivery details confirmed
              </div>

              <div style={trustItem}>
                <span style={trustIcon}>
                  ✓
                </span>

                Pricing verified before submission
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                void confirmOrder();
              }}
              disabled={
                confirming ||
                Boolean(
                  order.confirmed
                )
              }
              style={{
                ...confirmButton,

                opacity:
                  confirming ||
                  order.confirmed
                    ? 0.65
                    : 1,

                cursor:
                  confirming ||
                  order.confirmed
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {confirming
                ? "Confirming Order..."
                : order.confirmed
                ? "Order Confirmed"
                : "Confirm Order →"}
            </button>

            <p style={confirmNotice}>
              After sending payment with the selected method, click Confirm Order.
            </p>
          </aside>
        </div>

        <style jsx>{`
          @media (min-width: 941px) {
            .payment-review {
              position: sticky;
              top: 18px;
              align-self: start;
            }
          }

          @media (max-width: 940px) {
            .payment-layout {
              grid-template-columns: minmax(0, 1fr) !important;
            }
          }

          @media (max-width: 640px) {
            .payment-method-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            }
          }

          @media (max-width: 430px) {
            .payment-method-grid {
              grid-template-columns: minmax(0, 1fr) !important;
            }
          }
        `}</style>
      </div>
    </main>
  );
}


function ProgressStep({
  number,
  label,
  active = false,
  complete = false,
}: {
  number: string;
  label: string;
  active?: boolean;
  complete?: boolean;
}) {
  return (
    <div style={progressStep}>
      <span
        style={{
          ...progressCircle,

          borderColor:
            active || complete
              ? "#00d9ff"
              : "#444",

          background:
            complete
              ? "#00d9ff"
              : active
              ? "rgba(255,47,208,.18)"
              : "#0a0a0a",

          color:
            complete
              ? "#001016"
              : active
              ? "#ff75df"
              : "#777",

          boxShadow:
            active
              ? "0 0 16px rgba(255,47,208,.24)"
              : complete
              ? "0 0 14px rgba(0,217,255,.22)"
              : "none",
        }}
      >
        {complete ? "✓" : number}
      </span>

      <span
        style={{
          color:
            active || complete
              ? "#ffffff"
              : "#777",
          fontWeight:
            active || complete
              ? 800
              : 600,
        }}
      >
        {label}
      </span>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={infoRow}>
      <span style={infoLabel}>
        {label}
      </span>

      <strong style={infoValue}>
        {value}
      </strong>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  positive = false,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div style={summaryRow}>
      <span>{label}</span>

      <strong
        style={{
          color: positive
            ? "#00ff99"
            : "#ffffff",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function DiscountRow({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  if (value <= 0) {
    return null;
  }

  return (
    <div style={summaryRow}>
      <span>{label}</span>

      <strong style={{ color: "#00ff99" }}>
        -{money(value)}
      </strong>
    </div>
  );
}

function ZellePayment({
  amount,
}: {
  amount: number;
}) {
  return (
    <div style={zelleWrap}>
      <div style={zelleHeader}>
        <div>
          <p style={zelleEyebrow}>
            ZELLE PAYMENT
          </p>

          <h2 style={zelleTitle}>
            Scan to Pay PugPep
          </h2>

          <p style={paymentMessage}>
            Use your bank&apos;s Zelle feature to scan the QR code below.
            Verify that the recipient displays as PUGPEP LLC before sending.
          </p>
        </div>

        <div style={zelleAmountBox}>
          <span style={zelleAmountLabel}>
            AMOUNT DUE
          </span>

          <strong style={zelleAmount}>
            {money(amount)}
          </strong>
        </div>
      </div>

      <div style={zelleQrCard}>
        <img
          src="/zelle-pugpep-qr.png"
          alt="PugPep LLC Zelle payment QR code"
          style={zelleQrImage}
        />

        <div style={zelleTagBox}>
          <span style={zelleTagLabel}>
            ZELLE TAG
          </span>

          <strong style={zelleTag}>
            PugPep
          </strong>
        </div>
      </div>

      <div style={zelleNotice}>
        <strong style={{ color: "#ffffff" }}>
          Before sending:
        </strong>{" "}
        confirm the recipient name is{" "}
        <strong style={{ color: "#b86cff" }}>
          PUGPEP LLC
        </strong>{" "}
        and send exactly{" "}
        <strong style={{ color: "#00ff99" }}>
          {money(amount)}
        </strong>.
      </div>

      <p style={zelleMemoText}>
        If your bank provides a memo or note field, include only your first
        and last name. Do not include product names or order details.
      </p>

      <div style={contactGrid}>
        {contactLinks.map(
          (link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              style={contactButton}
            >
              {link.label}
            </a>
          )
        )}
      </div>
    </div>
  );
}

function AurpayButton({
  orderNumber,
  total,
}: {
  orderNumber: string;
  total: number;
}) {
  const [loading, setLoading] =
    useState(false);

  async function startAurpayPayment() {
    setLoading(true);

    try {
      const response =
        await fetch(
          "/api/aurpay/create-payment",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                orderNumber,
                total,
              }),
          }
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        result.error
      ) {
        throw new Error(
          result.error ||
            "Payment generation failed."
        );
      }

      const checkoutUrl =
        result.data?.pay_url ||
        result.pay_url ||
        result.payUrl ||
        result.url;

      if (!checkoutUrl) {
        throw new Error(
          "Unable to find the AURPAY payment link."
        );
      }

      window.open(
        checkoutUrl,
        "_blank",
        "noopener,noreferrer"
      );
    } catch (error: unknown) {
      alert(
        getErrorMessage(
          error,
          "Unable to create AURPAY payment."
        )
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={cryptoWrap}>
      <h2 style={{ color: "#ff45d8" }}>
        Crypto Payment
      </h2>

      <p style={paymentMessage}>
        Open secure AURPAY checkout for
        this order total.
      </p>

      <button
        type="button"
        onClick={() => {
          void startAurpayPayment();
        }}
        disabled={loading}
        style={{
          ...contactButton,

          width: "100%",

          border: "none",

          opacity:
            loading
              ? 0.65
              : 1,

          cursor:
            loading
              ? "not-allowed"
              : "pointer",
        }}
      >
        {loading
          ? "Opening AURPAY..."
          : "Secure Crypto Checkout"}
      </button>
    </div>
  );
}

function PaymentInstructions({
  title,
  accent,
  amount,
  message,
  paymentInfo,
}: {
  title: string;
  accent: string;
  amount: number;
  message: string;
  paymentInfo?: string;
}) {
  return (
    <>
      <h2 style={{ color: accent }}>
        {title}
      </h2>

      <p style={paymentMessage}>
        {message}
      </p>

      {paymentInfo && (
        <div
          style={{
            ...paymentInfoBox,
            border:
              `2px solid ${accent}`,
          }}
        >
          <div style={paymentInfoLabel}>
            SEND PAYMENT TO
          </div>

          <div
            style={{
              ...paymentInfoText,
              color: accent,
            }}
          >
            {paymentInfo}
          </div>
        </div>
      )}

      <p>
        Amount due:{" "}
        <strong
          style={{
            color: "#00d9ff",
          }}
        >
          {money(amount)}
        </strong>
      </p>

      <div style={contactGrid}>
        {contactLinks.map(
          (link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              style={contactButton}
            >
              {link.label}
            </a>
          )
        )}
      </div>
    </>
  );
}

const page = {
  minHeight: "100vh",
  overflowX: "hidden" as const,
  padding:
    "clamp(16px, 3vw, 32px)",
  background:
    "radial-gradient(circle at 12% 0%, rgba(255,47,208,.15), transparent 27%), radial-gradient(circle at 88% 4%, rgba(0,217,255,.15), transparent 30%), radial-gradient(circle at 50% 100%, rgba(0,255,153,.06), transparent 36%), #000",
  color: "#ffffff",
};

const container = {
  width: "100%",
  maxWidth: 1240,
  margin: "0 auto",
};

const header = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 18,
  flexWrap: "wrap" as const,
  marginBottom: 22,
};

const eyebrow = {
  margin: 0,
  color: "#7df9ff",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: "0.14em",
};

const title = {
  margin: "6px 0 0",
  color: "#ff45d8",
  fontSize:
    "clamp(34px, 7vw, 52px)",
  textShadow:
    "0 0 16px rgba(255,47,208,.28)",
};

const subtitle = {
  maxWidth: 660,
  margin: "8px 0 0",
  color: "#b8b8b8",
  lineHeight: 1.6,
};

const orderBadge = {
  minWidth: 160,
  padding: "11px 15px",
  display: "grid",
  gap: 3,
  border:
    "1px solid #00d9ff",
  borderRadius: 12,
  background:
    "linear-gradient(135deg, rgba(0,217,255,.12), rgba(255,47,208,.08))",
  color: "#ffffff",
  boxShadow:
    "0 0 17px rgba(0,217,255,.16)",
};

const orderBadgeLabel = {
  color: "#7df9ff",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: ".14em",
};

const progressBar = {
  marginBottom: 24,
  padding: "14px 18px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 12,
  border:
    "1px solid rgba(0,217,255,.28)",
  borderRadius: 14,
  background:
    "rgba(8,8,12,.82)",
};

const progressStep = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  whiteSpace: "nowrap" as const,
};

const progressCircle = {
  width: 29,
  height: 29,
  display: "grid",
  placeItems: "center",
  border: "1px solid",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 900,
};

const progressLine = {
  width: "clamp(22px, 6vw, 80px)",
  height: 1,
  background:
    "linear-gradient(90deg, rgba(0,217,255,.7), rgba(255,47,208,.5))",
};

const layout = {
  display: "grid",
  gridTemplateColumns:
    "minmax(0, 1.08fr) minmax(380px, .92fr)",
  gap: 24,
  alignItems: "start",
};

const stack = {
  display: "grid",
  gap: 18,
};

const reviewColumn = {
  display: "grid",
  gap: 18,
};

const card = {
  padding:
    "clamp(16px, 3vw, 22px)",
  border:
    "1px solid rgba(0,217,255,.42)",
  borderRadius: 16,
  background:
    "linear-gradient(145deg, rgba(8,8,12,.96), rgba(15,8,18,.94))",
  boxShadow:
    "0 0 18px rgba(0,217,255,.09), inset 0 0 18px rgba(255,47,208,.03)",
};

const sectionHeading = {
  display: "flex",
  alignItems: "flex-start",
  gap: 11,
  marginBottom: 15,
};

const sectionNumber = {
  width: 30,
  height: 30,
  display: "grid",
  placeItems: "center",
  flexShrink: 0,
  border:
    "1px solid #ff45d8",
  borderRadius: 999,
  background:
    "linear-gradient(135deg, rgba(255,47,208,.24), rgba(0,217,255,.16))",
  color: "#ffffff",
  fontSize: 13,
  fontWeight: 900,
};

const sectionTitle = {
  margin: 0,
  color: "#7df9ff",
  fontSize:
    "clamp(21px, 4vw, 27px)",
  textShadow:
    "0 0 10px rgba(0,217,255,.28)",
};

const sectionHelper = {
  margin: "4px 0 0",
  color: "#8e8e8e",
  fontSize: 13,
};

const infoRow = {
  display: "grid",
  gridTemplateColumns:
    "135px minmax(0, 1fr)",
  gap: 14,
  padding: "11px 0",
  borderBottom:
    "1px solid rgba(255,255,255,.09)",
};

const infoLabel = {
  color: "#8f8f8f",
  fontSize: 12,
  fontWeight: 900,
  textTransform:
    "uppercase" as const,
  letterSpacing: ".05em",
};

const infoValue = {
  color: "#eeeeee",
  overflowWrap:
    "anywhere" as const,
};

const methodGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",
  gap: 11,
};

const methodButton = {
  minHeight: 84,
  padding: "13px",
  display: "grid",
  gridTemplateColumns:
    "42px minmax(0, 1fr) 16px",
  alignItems: "center",
  gap: 10,
  border: "1px solid",
  borderRadius: 12,
  color: "#ffffff",
  fontWeight: 800,
  cursor: "pointer",
  textAlign: "left" as const,
};

const methodIcon = {
  width: 38,
  height: 38,
  display: "grid",
  placeItems: "center",
  border: "1px solid",
  borderRadius: 10,
  background:
    "rgba(0,0,0,.4)",
  fontSize: 19,
  fontWeight: 900,
};

const selectedDot = {
  width: 11,
  height: 11,
  border: "1px solid",
  borderRadius: 999,
};

const zelleWrap = {
  display: "grid",
  gap: 18,
};

const zelleHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 18,
  flexWrap: "wrap" as const,
};

const zelleEyebrow = {
  margin: 0,
  color: "#b86cff",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: ".14em",
};

const zelleTitle = {
  margin: "5px 0 0",
  color: "#ffffff",
  fontSize: 26,
};

const zelleAmountBox = {
  minWidth: 150,
  padding: "12px 15px",
  border: "1px solid rgba(0,255,153,.42)",
  borderRadius: 12,
  background: "rgba(0,255,153,.06)",
  display: "grid",
  gap: 4,
  textAlign: "right" as const,
};

const zelleAmountLabel = {
  color: "#8e8e8e",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: ".1em",
};

const zelleAmount = {
  color: "#00ff99",
  fontSize: 25,
};

const zelleQrCard = {
  width: "100%",
  maxWidth: 430,
  margin: "0 auto",
  padding: "clamp(16px, 3vw, 24px)",
  border: "1px solid rgba(184,108,255,.48)",
  borderRadius: 18,
  background:
    "linear-gradient(145deg, rgba(255,255,255,.98), rgba(247,243,255,.98))",
  boxShadow:
    "0 0 28px rgba(123,44,255,.15)",
  display: "grid",
  justifyItems: "center",
  gap: 14,
};

const zelleQrImage = {
  display: "block",
  width: "100%",
  maxWidth: 320,
  height: "auto",
  borderRadius: 12,
};

const zelleTagBox = {
  minWidth: 190,
  padding: "10px 16px",
  border: "1px solid rgba(102,34,255,.28)",
  borderRadius: 12,
  background: "#ffffff",
  textAlign: "center" as const,
};

const zelleTagLabel = {
  display: "block",
  color: "#6f6f78",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: ".12em",
};

const zelleTag = {
  display: "block",
  marginTop: 3,
  color: "#6d24e8",
  fontSize: 24,
};

const zelleNotice = {
  padding: "13px 15px",
  border: "1px solid rgba(184,108,255,.32)",
  borderRadius: 12,
  background: "rgba(184,108,255,.07)",
  color: "#c9c9c9",
  lineHeight: 1.6,
};

const zelleMemoText = {
  margin: 0,
  color: "#9f9f9f",
  fontSize: 13,
  lineHeight: 1.6,
  textAlign: "center" as const,
};

const paymentCard = {
  ...card,
  border:
    "1px solid rgba(255,47,208,.48)",
  boxShadow:
    "0 0 20px rgba(255,47,208,.1)",
};

const summaryCard = {
  padding:
    "clamp(18px, 3vw, 24px)",
  border:
    "1px solid rgba(255,47,208,.55)",
  borderRadius: 17,
  background:
    "linear-gradient(145deg, rgba(16,7,18,.96), rgba(5,12,16,.96))",
  boxShadow:
    "0 0 24px rgba(255,47,208,.12)",
};

const summaryHeader = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 15,
  flexWrap: "wrap" as const,
  paddingBottom: 16,
  borderBottom:
    "1px solid rgba(255,255,255,.1)",
};

const summaryEyebrow = {
  margin: 0,
  color: "#00d9ff",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: ".13em",
};

const summaryTitle = {
  margin: "5px 0 0",
  color: "#ffffff",
  fontSize: 26,
};

const heroTotal = {
  color: "#00ff99",
  fontSize:
    "clamp(28px, 5vw, 38px)",
  textShadow:
    "0 0 16px rgba(0,255,153,.24)",
};

const summaryRows = {
  marginTop: 10,
};

const summaryRow = {
  minHeight: 46,
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 16,
  borderBottom:
    "1px solid rgba(255,255,255,.08)",
};

const grandTotalRow = {
  minHeight: 70,
  marginTop: 14,
  padding: "0 15px",
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 16,
  border:
    "1px solid rgba(0,255,153,.48)",
  borderRadius: 12,
  background:
    "linear-gradient(90deg, rgba(0,255,153,.11), rgba(0,217,255,.08))",
  color: "#ffffff",
  fontSize:
    "clamp(21px, 4vw, 27px)",
  boxShadow:
    "0 0 18px rgba(0,255,153,.1)",
};

const detailsCard = {
  padding: 17,
  border:
    "1px solid rgba(0,217,255,.38)",
  borderRadius: 14,
  background:
    "linear-gradient(145deg, rgba(8,8,12,.96), rgba(13,8,16,.94))",
};

const detailsSummary = {
  color: "#7df9ff",
  fontWeight: 900,
  cursor: "pointer",
};

const stepList = {
  display: "grid",
  gap: 8,
  marginTop: 15,
};

const stepRow = {
  padding: "9px 0",
  borderBottom:
    "1px solid rgba(255,255,255,.09)",
  color: "#cccccc",
  lineHeight: 1.55,
};

const trustCard = {
  padding: "14px 16px",
  display: "grid",
  gap: 9,
  border:
    "1px solid rgba(0,255,153,.27)",
  borderRadius: 13,
  background:
    "rgba(0,255,153,.035)",
};

const trustItem = {
  display: "flex",
  alignItems: "center",
  gap: 9,
  color: "#cfcfcf",
  fontSize: 13,
};

const trustIcon = {
  width: 20,
  height: 20,
  display: "grid",
  placeItems: "center",
  borderRadius: 999,
  background:
    "rgba(0,255,153,.14)",
  color: "#00ff99",
  fontWeight: 900,
};

const confirmButton = {
  minHeight: 66,
  width: "100%",
  padding: "16px 22px",
  border:
    "2px solid #45d97a",
  borderRadius: 14,
  background:
    "linear-gradient(180deg, #2eea6f, #19b857)",
  color: "#ffffff",
  fontSize: 20,
  fontWeight: 900,
  letterSpacing: ".02em",
  boxShadow:
    "0 0 18px rgba(46,234,111,.28), 0 0 36px rgba(46,234,111,.1)",
};

const confirmNotice = {
  margin: 0,
  color: "#8f8f8f",
  fontSize: 12,
  lineHeight: 1.55,
  textAlign: "center" as const,
};

const paymentMessage = {
  color: "#d0d0d0",
  lineHeight: 1.6,
};

const paymentInfoBox = {
  marginTop: 18,
  padding: 19,
  borderRadius: 13,
  background:
    "linear-gradient(145deg, rgba(255,255,255,.055), rgba(0,0,0,.24))",
  textAlign: "center" as const,
};

const paymentInfoLabel = {
  color: "#9e9e9e",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: ".1em",
  marginBottom: 8,
};

const paymentInfoText = {
  fontSize: 28,
  fontWeight: 900,
  wordBreak:
    "break-all" as const,
};

const contactGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(145px, 1fr))",
  gap: 10,
  marginTop: 18,
};

const contactButton = {
  display: "block",
  padding: "13px 14px",
  borderRadius: 10,
  background:
    "linear-gradient(90deg, #00a8db, #c927aa)",
  color: "#ffffff",
  textDecoration: "none",
  textAlign: "center" as const,
  fontWeight: 800,
};

const cryptoWrap = {
  maxWidth: 380,
  margin: "0 auto",
  textAlign: "center" as const,
};

const cryptoBanner = {
  width: "100%",
  marginTop: 20,
  border:
    "1px solid rgba(255,47,208,.5)",
  borderRadius: 14,
  boxShadow:
    "0 0 22px rgba(255,45,210,.2)",
};

const notice = {
  padding: 16,
  border:
    "1px solid #ffcc66",
  borderRadius: 11,
  background:
    "rgba(255,204,102,.08)",
  color: "#ffdd99",
};

const muted = {
  color: "#999999",
};

const loadingCard = {
  maxWidth: 520,
  margin: "12vh auto 0",
  padding: 32,
  display: "grid",
  justifyItems: "center",
  textAlign: "center" as const,
  border:
    "1px solid rgba(0,217,255,.38)",
  borderRadius: 17,
  background:
    "rgba(8,8,12,.9)",
};

const loadingOrb = {
  width: 46,
  height: 46,
  border:
    "4px solid rgba(0,217,255,.18)",
  borderTopColor:
    "#ff45d8",
  borderRadius: 999,
};

const emptyState = {
  maxWidth: 580,
  margin: "9vh auto 0",
  padding: 32,
  display: "grid",
  justifyItems: "center",
  gap: 12,
  textAlign: "center" as const,
  border:
    "1px solid rgba(0,217,255,.38)",
  borderRadius: 17,
  background:
    "rgba(8,8,12,.92)",
};

const emptyIcon = {
  fontSize: 42,
};

const returnButton = {
  marginTop: 6,
  padding: "12px 17px",
  border:
    "1px solid #00d9ff",
  borderRadius: 10,
  background:
    "rgba(0,217,255,.09)",
  color: "#7df9ff",
  textDecoration: "none",
  fontWeight: 900,
};