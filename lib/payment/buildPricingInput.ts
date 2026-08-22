import type { SupabaseClient } from "@supabase/supabase-js";

import type { PricingInput } from "../pricing/types";
import type { PendingOrder } from "./types";

export function buildPricingInput(
  order: PendingOrder,
  supabase: SupabaseClient
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

  /*
   * Prefer the promo code captured in the authoritative
   * checkout pricing input.
   *
   * Fall back to the legacy order-level promoCode field
   * for older pending orders.
   */
  const rawPromoCode =
    order.pricingInput
      ?.promoCode ??
    order.promoCode ??
    null;

  const promoCode =
    typeof rawPromoCode ===
      "string" &&
    rawPromoCode.trim()
      ? rawPromoCode
          .trim()
          .toUpperCase()
      : null;

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
            Math.max(
              1,
              Math.floor(
                Number(
                  item.quantity ||
                    1
                )
              )
            ),
        })
      ),

    /*
     * This code is sent back through calculatePricing()
     * during final confirmation.
     *
     * That means the pricing engine re-evaluates the
     * sale-vs-promo comparison immediately before the
     * order is written to the database.
     */
    promoCode,

    rewardPointsRequested:
      Math.max(
        0,
        Math.floor(
          Number(
            order.pricingInput
              ?.rewardPointsRequested ??
            order.rewardPointsUsed ??
            0
          )
        )
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
        countryCode:
          "US",

        stateCode:
          order.customer.state
            .trim()
            .toUpperCase(),

        postalCode:
          order.customer.zip.trim(),

        city:
          order.customer.city.trim(),
      },
  };
}