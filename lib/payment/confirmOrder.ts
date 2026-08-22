import type { SupabaseClient } from "@supabase/supabase-js";

import { calculatePricing } from "../pricing/pricingEngine";
import { trackEvent } from "../trackEvent";

import { buildPricingInput } from "./buildPricingInput";
import { persistOrder } from "./persistOrder";
import { persistOrderItems } from "./persistOrderItems";
import { persistOrderLedger } from "./orderLedger";
import {
  deductRewardPoints,
  restoreRewardPoints,
} from "./rewards";
import { rollbackOrder } from "./rollbackOrder";
import { sendOrderNotifications } from "./notifications";

import type {
  CustomerProfileRow,
  PaymentMethod,
  PendingOrder,
} from "./types";

export type ConfirmOrderResult = {
  confirmedOrder: PendingOrder;
  alreadyExisted: boolean;
};

export async function confirmOrderTransaction({
  supabase,
  order,
  method,
}: {
  supabase: SupabaseClient;
  order: PendingOrder;
  method: PaymentMethod;
}): Promise<ConfirmOrderResult> {
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

    if (existingOrderError) {
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
        .eq(
          "order_id",
          order.id
        );

      if (existingItemsError) {
        throw existingItemsError;
      }

      if (
        !existingItemCount ||
        existingItemCount <= 0
      ) {
        throw new Error(
          "This order record exists, but its product items are missing. The order was not confirmed. Please contact support before retrying."
        );
      }

      return {
        alreadyExisted: true,

        confirmedOrder: {
          ...order,

          paymentMethod:
            order.paymentMethod ||
            method,

          confirmed: true,
        },
      };
    }

    /*
     * Re-run the entire pricing engine immediately before
     * creating the order.
     *
     * The pricing engine is authoritative and now resolves:
     *
     * - active sale pricing
     * - general promo pricing
     * - sales-rep promo pricing
     *
     * using the highest-promotional-discount-wins rule.
     *
     * Browser pricing remains display-only.
     */
    const pricing =
      await calculatePricing(
        buildPricingInput(
          order,
          supabase
        )
      );

    if (
      !pricing.campaign.items ||
      pricing.campaign.items.length ===
        0
    ) {
      throw new Error(
        "Order confirmation stopped because no priced items were generated. Your cart has not been cleared."
      );
    }

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
      .eq(
        "id",
        order.userId
      )
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

    await persistOrder({
      supabase,
      order,
      pricing,

      paymentMethod:
        method,

      lifetimeSpendBefore,
    });

    orderInserted = true;

    const insertedItems =
      await persistOrderItems({
        supabase,
        order,
        pricing,
      });

    await persistOrderLedger({
      supabase,
      order,
      pricing,
      insertedItems,
    });

    /*
     * Always run sales-rep attribution finalization.
     *
     * A sales-rep code may legitimately have a $0 customer
     * discount when a larger sale wins.
     *
     * Passing the resolved salesRepDiscount allows the
     * database function to preserve attribution without
     * pretending the customer received a sales-rep discount
     * that did not actually win.
     */
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
          pricing.discounts
            .salesRepDiscount,

        p_commissionable_profit:
          pricing.commission
            .commissionBasis,
      }
    );

    if (attributionError) {
      throw attributionError;
    }

    /*
     * GENERAL PROMO REDEMPTION
     *
     * A general promo is consumed only when it actually
     * produced a customer discount on this order.
     *
     * Example:
     *
     * Store sale = 20%
     * QR promo    = 15%
     *
     * The store sale wins.
     * generalPromoDiscount becomes $0.
     * The QR promo is NOT redeemed or consumed.
     *
     * Example:
     *
     * Store sale = 10%
     * QR promo    = 15%
     *
     * The promo wins.
     * generalPromoDiscount is greater than $0.
     * The promo redemption is recorded.
     *
     * The database RPC performs its own usage-rule check
     * under a row lock to protect against duplicate use.
     */
    if (
      pricing.promo
        .appliedPromoSource ===
        "general" &&
      pricing.promo
        .appliedPromoCode &&
      pricing.discounts
        .generalPromoDiscount >
        0
    ) {
      const {
        error:
          promoRedemptionError,
      } = await supabase.rpc(
        "redeem_general_promo_for_order",
        {
          p_order_id:
            order.id,

          p_customer_id:
            order.userId,

          p_code:
            pricing.promo
              .appliedPromoCode,

          p_discount_amount:
            pricing.discounts
              .generalPromoDiscount,
        }
      );

      if (
        promoRedemptionError
      ) {
        throw promoRedemptionError;
      }
    }

    deductedRewardPoints =
      await deductRewardPoints({
        supabase,

        customerId:
          order.userId,

        rewardPointsBefore,

        pointsUsed:
          pricing.rewards
            .pointsUsed,
      });

    rewardsDeducted =
      deductedRewardPoints >
      0;

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

    await sendOrderNotifications({
      order,
      pricing,
    });

    await trackEvent({
      event_type:
        "order_created",

      order_number:
        order.orderNumber,

      metadata: {
        total:
          pricing.accounting
            .customerTotal,

        itemCount:
          pricing.campaign
            .items.length,

        promoCode:
          pricing.promo
            .appliedPromoCode,

        promoSource:
          pricing.promo
            .appliedPromoSource,

        generalPromoDiscount:
          pricing.discounts
            .generalPromoDiscount,

        salesRepDiscount:
          pricing.discounts
            .salesRepDiscount,

        saleDiscount:
          pricing.discounts
            .saleDiscount,

        paymentMethod:
          method,

        salesTax:
          pricing.accounting
            .salesTaxCollected,

        profit:
          pricing.accounting
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
          pricing.accounting
            .customerTotal,

        paymentMethod:
          method,

        promoCode:
          pricing.promo
            .appliedPromoCode,

        promoDiscount:
          pricing.discounts
            .generalPromoDiscount +
          pricing.discounts
            .salesRepDiscount,

        saleDiscount:
          pricing.discounts
            .saleDiscount,
      },
    });

    const confirmedOrder:
      PendingOrder = {
        ...order,

        paymentMethod:
          method,

        pricing,

        pricingSnapshot:
          pricing.snapshot,

        subtotal:
          pricing.accounting
            .regularMerchandiseValue,

        shipping:
          pricing.accounting
            .shippingCollected,

        shippingMethod:
          pricing.shipping
            .shippingMethod,

        shippingMethodLabel:
          pricing.shipping
            .shippingMethodLabel,

        salesTax:
          pricing.accounting
            .salesTaxCollected,

        rewardPointsUsed:
          pricing.rewards
            .pointsUsed,

        rewardDiscount:
          pricing.discounts
            .rewardsDiscount,

        promoCode:
          pricing.promo
            .appliedPromoCode,

        promoSource:
          pricing.promo
            .appliedPromoSource,

        promoDiscount:
          pricing.discounts
            .generalPromoDiscount +
          pricing.discounts
            .salesRepDiscount,

        totalDiscount:
          pricing.discounts
            .totalDiscount,

        total:
          pricing.accounting
            .customerTotal,

        hasLifetimeFreeShipping:
          pricing.shipping
            .hasLifetimeFreeShipping,

        confirmed: true,
      };

    return {
      alreadyExisted:
        false,

      confirmedOrder,
    };
  } catch (error) {
    if (
      rewardsDeducted &&
      order.userId &&
      deductedRewardPoints >
        0
    ) {
      try {
        await restoreRewardPoints({
          supabase,

          customerId:
            order.userId,

          points:
            deductedRewardPoints,
        });
      } catch (
        rewardRollbackError
      ) {
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
        supabase,
        order.id
      );
    }

    throw error;
  }
}