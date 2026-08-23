import emailjs from "emailjs-com";

import type { PricingResult } from "../pricing/types";
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

  /*
   * EMAIL
   *
   * Email and SMS are intentionally isolated from one another.
   * A failure in one notification channel must never prevent
   * the other notification from being attempted.
   */
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
   * The SMS API now loads the authoritative phone number,
   * total, and sms_consent value directly from the saved order.
   *
   * Only the order number is sent from this layer.
   */
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