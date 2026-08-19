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