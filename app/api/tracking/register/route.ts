/** PUGPEP | app/api/tracking/register/route.ts
 * Records the selected USPS/UPS carrier locally for an order.
 * No AfterShip, 17TRACK, external tracking registration, or automatic
 * shipping-status changes. The Operations Center controls status updates.
 */
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RegisterBody = {
  orderId?: string;
  trackingNumber?: string;
  carrier?: string | null;
};

async function verifyAdmin(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";
  if (!token) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;

  const { data: roleRow, error: roleError } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (roleError || !roleRow || !["admin", "super_admin"].includes(roleRow.role)) {
    return null;
  }
  return data.user;
}

export async function POST(request: Request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Administrator authorization required." },
        { status: 401 }
      );
    }

    let body: RegisterBody;
    try {
      body = (await request.json()) as RegisterBody;
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body." },
        { status: 400 }
      );
    }

    const orderId = String(body.orderId || "").trim();
    const trackingNumber = String(body.trackingNumber || "").trim();
    const carrier = String(body.carrier || "").trim().toLowerCase();

    if (!orderId || !trackingNumber) {
      return NextResponse.json(
        { success: false, error: "Order ID and tracking number are required." },
        { status: 400 }
      );
    }
    if (carrier !== "usps" && carrier !== "ups") {
      return NextResponse.json(
        { success: false, error: "Select USPS or UPS." },
        { status: 400 }
      );
    }

    const { data: order, error: lookupError } = await supabaseAdmin
      .from("orders")
      .select("id,tracking_number,tracking_carrier")
      .eq("id", orderId)
      .maybeSingle();

    if (lookupError) throw lookupError;
    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order was not found." },
        { status: 404 }
      );
    }

    // Prevent stale requests from overwriting a different tracking number.
    if (String(order.tracking_number || "").trim() !== trackingNumber) {
      return NextResponse.json(
        { success: false, error: "Tracking number changed. Reload the order and save again." },
        { status: 409 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({ tracking_carrier: carrier })
      .eq("id", orderId)
      .eq("tracking_number", trackingNumber);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      tracking: { number: trackingNumber, carrier },
      message: "Carrier saved to order; no third-party tracking service used.",
    });
  } catch (error: unknown) {
    console.error("Carrier save failed:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unable to save carrier." },
      { status: 500 }
    );
  }
}
