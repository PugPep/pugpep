import { NextResponse } from "next/server";

import { sendSms } from "@/lib/sendSms";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

type OrderConfirmationSmsRequest = {
  orderNumber?: unknown;
};

type OrderSmsRow = {
  order_number: string | null;
  customer_phone: string | null;
  total: number | string | null;
  sms_consent: boolean | null;
  user_id: string | null;
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

export async function POST(
  req: Request
) {
  try {
    const accessToken =
      getBearerToken(req);

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Authentication required.",
        },
        {
          status: 401,
        }
      );
    }

    const {
      data:
        authData,
      error:
        authError,
    } =
      await supabaseAdmin.auth.getUser(
        accessToken
      );

    if (
      authError ||
      !authData.user
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid or expired session.",
        },
        {
          status: 401,
        }
      );
    }

    const body =
      (await req.json()) as OrderConfirmationSmsRequest;

    const orderNumber =
      cleanText(
        body.orderNumber,
        80
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

    /*
     * Do not trust a phone number or consent flag supplied by the browser.
     * Load the authoritative order record and enforce the saved checkout
     * consent before sending any SMS.
     *
     * The authenticated user must also own this order. This prevents
     * somebody from triggering an SMS by guessing another order number.
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
            "total",
            "sms_consent",
            "user_id",
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
      !order.user_id ||
      order.user_id !==
        authData.user.id
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "You are not authorized to send notifications for this order.",
        },
        {
          status: 403,
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

    const orderTotal =
      Number(
        order.total
      );

    if (
      !Number.isFinite(
        orderTotal
      ) ||
      orderTotal <
        0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Order total is invalid.",
        },
        {
          status: 500,
        }
      );
    }

    const message =
      await sendSms(
        customerPhone,
        `PugPep Order Updates: We received order ${orderNumber}. Total: $${orderTotal.toFixed(
          2
        )}. We’ll text you again when your order ships. Reply STOP to opt out or HELP for help.`
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
      "Order confirmation SMS failed:",
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