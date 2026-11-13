import type { SupabaseClient } from "@supabase/supabase-js";

import type { PricingInput } from "../pricing/types";
import type { PendingOrder } from "./types";

type PendingPricingLine = {
  productOptionId?: string | null;
  quantity?: number | null;
  customKitGroupId?: unknown;
};

type PaymentPricingLine = PricingInput["items"][number] & {
  customKitGroupId?: string;
};

type PaymentPricingInput = Omit<PricingInput, "items"> & {
  items: PaymentPricingLine[];
};

export function paymentLineKey(optionId: string | null, groupId?: string | null) {
  return JSON.stringify([optionId, groupId ?? null]);
}

function normalizePricingLine(item: PendingPricingLine): PaymentPricingLine {
  if (!item.productOptionId) {
    throw new Error(
      "One or more cart items are missing their product option ID. Return to checkout, remove them, and add them again."
    );
  }

  const groupId = item.customKitGroupId;
  if (groupId != null && (
    typeof groupId !== "string" ||
    !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(groupId) ||
    !Number.isSafeInteger(item.quantity) || Number(item.quantity) <= 0
  )) {
    throw new Error("A custom-kit line is invalid. Return to checkout and review your kit.");
  }

  return {
    productOptionId: item.productOptionId,
    quantity: Math.max(1, Math.floor(Number(item.quantity || 1))),
    customKitGroupId: typeof groupId === "string" ? groupId.toLowerCase() : undefined,
  };
}

export function buildPricingInput(
  order: PendingOrder,
  supabase: SupabaseClient
): PaymentPricingInput {
  const cartItems: readonly PendingPricingLine[] = order.items;
  const quoteItems: readonly PendingPricingLine[] | undefined = order.pricingInput?.items;
  const items = (quoteItems || cartItems).map(normalizePricingLine);

  if (items.some((item) => item.customKitGroupId) ||
      cartItems.some((item) => item.customKitGroupId != null)) {
    const cartByLine = new Map<string, number>();
    for (const item of cartItems.map(normalizePricingLine)) {
      const key = paymentLineKey(item.productOptionId, item.customKitGroupId);
      if (cartByLine.has(key)) {
        throw new Error("A custom-kit order has duplicate lines. Return to checkout and review your kit.");
      }
      cartByLine.set(key, item.quantity);
    }

    for (const item of items) {
      const key = paymentLineKey(item.productOptionId, item.customKitGroupId);
      if (cartByLine.get(key) !== item.quantity) {
        throw new Error("The cart and checkout quote differ. Return to checkout and review your order.");
      }
      cartByLine.delete(key);
    }
    if (cartByLine.size) {
      throw new Error("The cart and checkout quote differ. Return to checkout and review your order.");
    }
  }

  const rawPromoCode = order.pricingInput?.promoCode ?? order.promoCode ?? null;
  const promoCode = typeof rawPromoCode === "string" && rawPromoCode.trim()
    ? rawPromoCode.trim().toUpperCase()
    : null;

  return {
    supabase,
    customerId: order.userId || "",
    items,
    promoCode,
    rewardPointsRequested: Math.max(
      0,
      Math.floor(Number(order.pricingInput?.rewardPointsRequested ?? order.rewardPointsUsed ?? 0))
    ),
    shippingMethod:
      order.pricingInput?.shippingMethod ??
      order.shippingMethod ??
      order.pricing?.shipping.shippingMethod ??
      "standard",
    shippingAddress: order.pricingInput?.shippingAddress || {
      countryCode: "US",
      stateCode: order.customer.state.trim().toUpperCase(),
      postalCode: order.customer.zip.trim(),
      city: order.customer.city.trim(),
    },
  };
}
