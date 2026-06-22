import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { error } = await supabase.from("analytics_events").insert({
      event_type: body.event_type,
      page_path: body.page_path || null,
      product_slug: body.product_slug || null,
      order_number: body.order_number || null,
      promo_code: body.promo_code || null,
      payment_method: body.payment_method || null,
      metadata: body.metadata || null,
    });

    if (error) {
      console.error("Analytics insert error:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Analytics route error:", error);
    return NextResponse.json(
      { success: false, error: "Analytics failed" },
      { status: 500 }
    );
  }
}