import emailjs from "emailjs-com";

import type { PricingResult } from "../pricing/types";
import type { PendingOrder } from "./types";
import { money } from "./utils";

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

    if (!smsResponse.ok) {
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
}