import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    console.log("AURPAY WEBHOOK:", body);

    const orderNumber =
      body.order_id ||
      body.id ||
      body.orderNumber ||
      body.merchant_order_id;

    const status =
      body.status ||
      body.payment_status ||
      body.order_status;

    if (!orderNumber) {
      return NextResponse.json(
        { error: "Missing order number." },
        { status: 400 }
      );
    }

    const paidStatuses = [
      "paid",
      "success",
      "completed",
      "confirmed",
      "finished",
    ];

    const normalizedStatus = String(status || "")
      .trim()
      .toLowerCase();

    const newStatus = paidStatuses.includes(normalizedStatus)
      ? "paid"
      : normalizedStatus || "pending";

    /*
     * Find the PugPep order first.
     *
     * We need the UUID because mark_order_paid()
     * accepts the order UUID, not the order number.
     */
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, order_number, status, rewards_applied")
      .eq("order_number", orderNumber)
      .single();

    if (orderError || !order) {
      console.error("Aurpay order lookup error:", orderError);

      return NextResponse.json(
        {
          error: orderError?.message || "Order not found.",
        },
        { status: 404 }
      );
    }

    /*
     * Always record the payment method as crypto
     * for an Aurpay callback.
     */
    const { error: paymentMethodError } = await supabase
      .from("orders")
      .update({
        payment_method: "crypto",
      })
      .eq("id", order.id);

    if (paymentMethodError) {
      console.error(
        "Aurpay payment method update error:",
        paymentMethodError
      );

      return NextResponse.json(
        {
          error: paymentMethodError.message,
        },
        { status: 500 }
      );
    }

    /*
     * IMPORTANT:
     *
     * Do not directly set status = "paid" here.
     *
     * mark_order_paid() is responsible for:
     *
     * - marking the order paid
     * - awarding PugPoints
     * - updating lifetime spend
     * - updating VIP tier
     * - writing lifetime-spend snapshots
     * - setting rewards_applied
     * - handling commission status
     *
     * It also prevents an already-processed paid order
     * from receiving rewards twice.
     */
    if (newStatus === "paid") {
      const { error: paidError } = await supabase.rpc(
        "mark_order_paid",
        {
          target_order_id: order.id,
        }
      );

      if (paidError) {
        console.error(
          "Aurpay mark_order_paid error:",
          paidError
        );

        return NextResponse.json(
          {
            error: paidError.message,
          },
          { status: 500 }
        );
      }
    } else {
      /*
       * Non-paid Aurpay statuses may still be written
       * directly because they should not trigger rewards.
       */
      const { error: statusError } = await supabase
        .from("orders")
        .update({
          status: newStatus,
        })
        .eq("id", order.id);

      if (statusError) {
        console.error(
          "Aurpay order status update error:",
          statusError
        );

        return NextResponse.json(
          {
            error: statusError.message,
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      received: true,
      orderNumber,
      status: newStatus,
    });
  } catch (error: unknown) {
    console.error("AURPAY webhook error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Webhook error.";

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 }
    );
  }
}