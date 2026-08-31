"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

export type AnalyticsEventInput = {
  event_type:
    | "product_view"
    | "add_to_cart"
    | "checkout_started"
    | "payment_method_selected"
    | "order_created"
    | "order_confirmed";
  page_path?: string | null;
  product_slug?: string | null;
  order_number?: string | null;
  promo_code?: string | null;
  payment_method?: string | null;
  metadata?: Record<string, unknown> | null;
};

export async function trackAnalyticsEvent(
  supabase: SupabaseClient,
  event: AnalyticsEventInput
) {
  try {
    const { error } = await supabase
      .from("analytics_events")
      .insert({
        event_type: event.event_type,
        page_path: event.page_path ?? null,
        product_slug: event.product_slug ?? null,
        order_number: event.order_number ?? null,
        promo_code: event.promo_code ?? null,
        payment_method: event.payment_method ?? null,
        metadata: event.metadata ?? null,
      });

    if (error) {
      console.warn(
        `[analytics] ${event.event_type} was not recorded:`,
        error.message
      );
    }
  } catch (error) {
    console.warn(
      `[analytics] ${event.event_type} tracking failed:`,
      error
    );
  }
}
