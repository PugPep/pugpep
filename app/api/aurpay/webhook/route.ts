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

    const normalizedStatus = String(status || "").toLowerCase();

    const newStatus = paidStatuses.includes(normalizedStatus)
      ? "paid"
      : normalizedStatus || "pending";

    const { error } = await supabase
      .from("orders")
      .update({
        status: newStatus,
        payment_method: "crypto",
      })
      .eq("order_number", orderNumber);

    if (error) {
      console.error("Supabase update error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      received: true,
      orderNumber,
      status: newStatus,
    });
  } catch (error: any) {
    console.error("AURPAY webhook error:", error);

    return NextResponse.json(
      { error: error.message || "Webhook error." },
      { status: 500 }
    );
  }
}