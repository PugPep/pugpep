import emailjs from "emailjs-com";

import type { PricingResult } from "../pricing/types";
import { createClient } from "../supabaseClient";
import type { PendingOrder } from "./types";
import { money } from "./utils";

type SmsApiResponse = {
  success?: boolean;
  skipped?: boolean;
  error?: string;
  code?: number | null;
  twilioStatus?: number | null;
  moreInfo?: string | null;
  sid?: string;
  status?: string;
  to?: string;
};

type SavedOrderItem = {
  product_name: string | null;
  dosage: string | null;
  quantity: number | null;
  line_revenue: number | null;
  price: number | null;
  lot_number: string | null;
};

export async function sendOrderNotifications({
  order,
  pricing,
}: {
  order: PendingOrder;
  pricing: PricingResult;
}) {
  const accounting =
    pricing.accounting;

  const discounts =
    pricing.discounts;

  const supabase =
    createClient();

  /*
   * EMAIL
   *
   * Load the order-item snapshots AFTER the order has been saved.
   * This lets the confirmation email use the exact historical lot
   * number stored on each order item instead of whatever lot becomes
   * current later.
   *
   * Email and SMS remain isolated from one another. A failure in one
   * notification channel must never prevent the other notification
   * from being attempted.
   */
  try {
    const {
      data: savedItems,
      error: savedItemsError,
    } =
      await supabase
        .from("order_items")
        .select(
          "product_name,dosage,quantity,line_revenue,price,lot_number"
        )
        .eq(
          "order_id",
          order.id
        )
        .order(
          "id",
          {
            ascending: true,
          }
        );

    if (savedItemsError) {
      throw savedItemsError;
    }

    const emailItems =
      (
        savedItems ||
        []
      ).map(
        (
          item: SavedOrderItem
        ) => {
          const productName =
            String(
              item.product_name ||
              "Product"
            );

          const dosage =
            String(
              item.dosage ||
              ""
            );

          const lotNumber =
            String(
              item.lot_number ||
              ""
            ).trim();

          const displayName =
            dosage
              ? `${productName} (${dosage})`
              : productName;

          return {
            /*
             * Keeping the lot inside "name" means your existing
             * EmailJS template will show it even before you add a
             * dedicated {{lot_number}} field to the template.
             */
            name:
              lotNumber
                ? `${displayName} — Lot ${lotNumber}`
                : displayName,

            dosage,

            lot_number:
              lotNumber ||
              "Not captured",

            quantity:
              Math.max(
                1,
                Number(
                  item.quantity ||
                  1
                )
              ),

            price:
              money(
                item.line_revenue ??
                  item.price ??
                  0
              ),
          };
        }
      );

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
          emailItems,

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

  /*
   * SMS
   *
   * Only an explicit checkout opt-in allows SMS.
   * Older pending orders without smsConsent are treated as
   * not consented.
   */
  if (
    order.smsConsent !==
    true
  ) {
    console.log(
      "Order confirmation SMS skipped because customer did not opt in.",
      {
        orderNumber:
          order.orderNumber,
      }
    );

    return;
  }

  /*
   * The SMS API loads the authoritative phone number,
   * total, sms_consent value, and order owner directly
   * from the saved order.
   *
   * The current authenticated customer's Supabase access
   * token is included so the API can verify that the caller
   * owns this order before sending the message.
   */
  try {
    const {
      data: {
        session,
      },
      error:
        sessionError,
    } =
      await supabase.auth.getSession();

    if (
      sessionError ||
      !session?.access_token
    ) {
      console.error(
        "Order created, but confirmation SMS could not authenticate:",
        {
          orderNumber:
            order.orderNumber,

          error:
            sessionError?.message ||
            "No active Supabase session was available.",
        }
      );

      return;
    }

    const smsResponse =
      await fetch(
        "/api/send-order-confirmation-sms",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${session.access_token}`,
          },

          body:
            JSON.stringify({
              orderNumber:
                order.orderNumber,
            }),
        }
      );

    let smsResult:
      SmsApiResponse | null =
      null;

    try {
      smsResult =
        (await smsResponse.json()) as SmsApiResponse;
    } catch {
      smsResult =
        null;
    }

    if (
      smsResult?.skipped
    ) {
      console.log(
        "Order confirmation SMS skipped by server-side consent check.",
        {
          orderNumber:
            order.orderNumber,
        }
      );

      return;
    }

    if (
      !smsResponse.ok ||
      !smsResult?.success
    ) {
      console.error(
        "Order created, but confirmation SMS failed:",
        {
          orderNumber:
            order.orderNumber,

          httpStatus:
            smsResponse.status,

          error:
            smsResult?.error ||
            "SMS API returned an unsuccessful response.",

          code:
            smsResult?.code ||
            null,

          twilioStatus:
            smsResult?.twilioStatus ||
            null,

          moreInfo:
            smsResult?.moreInfo ||
            null,
        }
      );

      return;
    }

    console.log(
      "Order confirmation SMS accepted:",
      {
        orderNumber:
          order.orderNumber,

        sid:
          smsResult.sid,

        status:
          smsResult.status,

        to:
          smsResult.to,
      }
    );
  } catch (smsError) {
    console.error(
      "Order created, but confirmation SMS request failed:",
      {
        orderNumber:
          order.orderNumber,

        error:
          smsError instanceof Error
            ? smsError.message
            : smsError,
      }
    );
  }
}
