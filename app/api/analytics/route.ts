import { NextResponse } from "next/server";

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ALLOWED_EVENT_TYPES = new Set([
  "product_view",
  "add_to_cart",
  "checkout_started",
  "payment_method_selected",
  "order_created",
  "order_confirmed",
]);

type AnalyticsRequestBody = {
  event_type?: unknown;
  page_path?: unknown;
  product_slug?: unknown;
  order_number?: unknown;
  promo_code?: unknown;
  payment_method?: unknown;
  metadata?: unknown;
};

function optionalString(
  value: unknown
) {
  return typeof value === "string" &&
    value.trim()
    ? value.trim()
    : null;
}

export async function POST(req: Request) {
  try {
    const body =
      (await req.json()) as AnalyticsRequestBody;

    const eventType =
      optionalString(
        body.event_type
      );

    if (
      !eventType ||
      !ALLOWED_EVENT_TYPES.has(
        eventType
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Unsupported analytics event type.",
        },
        {
          status: 400,
        }
      );
    }

    const metadata =
      body.metadata &&
      typeof body.metadata ===
        "object" &&
      !Array.isArray(
        body.metadata
      )
        ? body.metadata
        : null;

    const {
      error,
    } =
      await supabase
        .from(
          "analytics_events"
        )
        .insert({
          event_type:
            eventType,

          page_path:
            optionalString(
              body.page_path
            ),

          product_slug:
            optionalString(
              body.product_slug
            ),

          order_number:
            optionalString(
              body.order_number
            ),

          promo_code:
            optionalString(
              body.promo_code
            ),

          payment_method:
            optionalString(
              body.payment_method
            ),

          metadata,
        });

    if (error) {
      console.error(
        "Analytics insert error:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error:
            error.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Analytics route error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Analytics failed",
      },
      {
        status: 500,
      }
        );
  }
}
