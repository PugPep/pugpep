import { NextResponse } from "next/server";

import { sendSms } from "@/lib/sendSms";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";


type ShippingSmsRequest = {
  orderNumber?: unknown;
  shippingStatus?: unknown;
  trackingNumber?: unknown;
};

type OrderSmsRow = {
  order_number: string | null;
  customer_phone: string | null;
  sms_consent: boolean | null;
};

function cleanText(
  value: unknown,
  maxLength: number
) {
  if (
    typeof value !== "string"
  ) {
    return "";
  }

  return value
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

function getBearerToken(
  req: Request
) {
  const authorization =
    req.headers.get("authorization")?.trim() || "";

  if (
    !authorization
      .toLowerCase()
      .startsWith("bearer ")
  ) {
    return "";
  }

  return authorization
    .slice(7)
    .trim();
}

async function requireAdmin(
  req: Request
) {
  const accessToken =
    getBearerToken(req);

  if (!accessToken) {
    return {
      authorized: false as const,
      status: 401,
      error: "Authentication required.",
    };
  }

  const {
    data,
    error,
  } =
    await supabaseAdmin.auth.getUser(
      accessToken
    );

  if (
    error ||
    !data.user
  ) {
    return {
      authorized: false as const,
      status: 401,
      error: "Invalid or expired session.",
    };
  }

  const {
    data: roleRow,
    error: roleError,
  } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (
    roleError ||
    !roleRow ||
    !["admin", "super_admin"].includes(roleRow.role)
  ) {
    return {
      authorized: false as const,
      status: 403,
      error: "Admin access required.",
    };
  }

  return {
    authorized: true as const,
    userId:
      data.user.id,
  };
}

export async function POST(
  req: Request
) {
  try {
    const admin =
      await requireAdmin(req);

    if (!admin.authorized) {
      return NextResponse.json(
        {
          success: false,
          error:
            admin.error,
        },
        {
          status:
            admin.status,
        }
      );
    }

    const body =
      (await req.json()) as ShippingSmsRequest;

    const orderNumber =
      cleanText(
        body.orderNumber,
        80
      );

    const shippingStatus =
      cleanText(
        body.shippingStatus,
        80
      );

    const trackingNumber =
      cleanText(
        body.trackingNumber,
        120
      );

    if (!orderNumber) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Order number missing.",
        },
        {
          status: 400,
        }
      );
    }

    if (!shippingStatus) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Shipping status missing.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Enforce SMS consent from the authoritative order record.
     * Do not trust a browser-supplied phone number.
     */
    const {
      data,
      error:
        orderError,
    } =
      await supabaseAdmin
        .from("orders")
        .select(
          [
            "order_number",
            "customer_phone",
            "sms_consent",
          ].join(",")
        )
        .eq(
          "order_number",
          orderNumber
        )
        .maybeSingle();

    if (orderError) {
      throw orderError;
    }

    const order =
      data as unknown as
        OrderSmsRow | null;

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Order not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      order.sms_consent !==
      true
    ) {
      return NextResponse.json(
        {
          success: false,
          skipped: true,
          error:
            "Customer did not opt in to SMS notifications.",
        },
        {
          status: 403,
        }
      );
    }

    const customerPhone =
      cleanText(
        order.customer_phone,
        40
      );

    if (!customerPhone) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Customer phone missing.",
        },
        {
          status: 400,
        }
      );
    }

    const statusText =
      shippingStatus
        .trim()
        .toLowerCase();

    let smsBody:
      string;

    if (
      statusText ===
        "shipped" &&
      trackingNumber
    ) {
      smsBody =
        `PugPep: ${orderNumber} has shipped. Tracking: ${trackingNumber}`;
    } else if (
      statusText ===
        "shipped"
    ) {
      smsBody =
        `PugPep: ${orderNumber} has shipped. Tracking will be available soon.`;
    } else if (
      statusText ===
        "out for delivery" &&
      trackingNumber
    ) {
      smsBody =
        `PugPep: ${orderNumber} is out for delivery. Tracking: ${trackingNumber}`;
    } else if (
      statusText ===
        "out for delivery"
    ) {
      smsBody =
        `PugPep: ${orderNumber} is out for delivery.`;
    } else if (
      statusText ===
        "shipping exception"
    ) {
      smsBody =
        trackingNumber
          ? `PugPep: There is a carrier update for ${orderNumber}. Tracking: ${trackingNumber}`
          : `PugPep: There is a carrier update for ${orderNumber}.`;
    } else {
      smsBody =
        trackingNumber
          ? `PugPep: ${orderNumber} shipping status is now ${shippingStatus}. Tracking: ${trackingNumber}`
          : `PugPep: ${orderNumber} shipping status is now ${shippingStatus}.`;
    }

    const message =
      await sendSms(
        customerPhone,
        smsBody
      );

    return NextResponse.json({
      success: true,
      sid:
        message.sid,
      status:
        message.status,
      to:
        message.to,
    });
  } catch (error) {
    const details =
      error as {
        code?: number;
        status?: number;
        message?: string;
        moreInfo?: string;
      };

    console.error(
      "Shipping SMS failed:",
      {
        code:
          details.code,

        status:
          details.status,

        message:
          details.message,

        moreInfo:
          details.moreInfo,
      }
    );

    return NextResponse.json(
      {
        success: false,

        error:
          details.message ||
          "SMS failed.",

        code:
          details.code ||
          null,

        twilioStatus:
          details.status ||
          null,

        moreInfo:
          details.moreInfo ||
          null,
      },
      {
        status: 500,
      }
    );
  }
}