import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_EMAIL =
  "pugpep99@gmail.com";

const AFTERSHIP_BASE_URL =
  process.env.AFTERSHIP_API_BASE_URL ||
  "https://api.aftership.com/tracking/2026-07";

type RegisterBody = {
  orderId?: string;
  trackingNumber?: string;
  carrier?: string | null;
};

type OrderRow = {
  id: string;
  order_number: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  created_at: string | null;
};


function cleanCarrier(
  value: unknown
) {
  const carrier =
    String(value || "")
      .trim()
      .toLowerCase();

  return carrier ||
    undefined;
}

async function verifyAdmin(
  request: Request
) {
  const authorization =
    request.headers.get(
      "authorization"
    );

  const token =
    authorization?.startsWith(
      "Bearer "
    )
      ? authorization.slice(
          7
        )
      : "";

  if (!token) {
    return null;
  }

  const {
    data,
    error,
  } =
    await supabaseAdmin.auth.getUser(
      token
    );

  if (
    error ||
    !data.user?.email ||
    data.user.email.toLowerCase() !==
      ADMIN_EMAIL.toLowerCase()
  ) {
    return null;
  }

  return data.user;
}

export async function POST(
  request: Request
) {
  try {
    const admin =
      await verifyAdmin(
        request
      );

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Administrator authorization required.",
        },
        {
          status: 401,
        }
      );
    }

    const apiKey =
      process.env.AFTERSHIP_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "AFTERSHIP_API_KEY is missing.",
        },
        {
          status: 500,
        }
      );
    }

    const body =
      (await request.json()) as
        RegisterBody;

    const orderId =
      String(
        body.orderId ||
          ""
      ).trim();

    const trackingNumber =
      String(
        body.trackingNumber ||
          ""
      ).trim();

    const carrier =
      cleanCarrier(
        body.carrier
      );

    if (
      !orderId ||
      !trackingNumber
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Order ID and tracking number are required.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: orderData,
      error: orderError,
    } =
      await supabaseAdmin
        .from("orders")
        .select(
          [
            "id",
            "order_number",
            "customer_name",
            "customer_email",
            "customer_phone",
            "city",
            "state",
            "zip",
            "created_at",
          ].join(",")
        )
        .eq("id", orderId)
        .maybeSingle();

    if (orderError) {
      throw orderError;
    }

    const order =
      orderData as unknown as
        OrderRow | null;

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Order was not found.",
        },
        {
          status: 404,
        }
      );
    }

    const trackingPayload: Record<
      string,
      unknown
    > = {
      tracking_number:
        trackingNumber,
      title:
        order.order_number ||
        trackingNumber,
      order_id:
        order.order_number ||
        order.id,
      custom_fields: {
        pugpep_order_id:
          order.id,
      },
      destination_country_region:
        "USA",
      destination_state:
        order.state ||
        undefined,
      destination_city:
        order.city ||
        undefined,
      destination_postal_code:
        order.zip ||
        undefined,
      order_date:
        order.created_at ||
        undefined,
      shipment_direction:
        "forward",
      customers: [
        {
          id: order.id,
          role: "customer",
          name:
            order.customer_name ||
            undefined,
          email:
            order.customer_email ||
            undefined,
          phone_number:
            order.customer_phone ||
            undefined,
          language: "en",
        },
      ],
    };

    if (carrier) {
      trackingPayload.slug =
        carrier;
    }

    const response =
      await fetch(
        `${AFTERSHIP_BASE_URL}/trackings`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            "as-api-key":
              apiKey,
          },
          body:
            JSON.stringify(
              trackingPayload
            ),
          cache: "no-store",
        }
      );

    const responseText =
      await response.text();

    let afterShipData:
      | Record<
          string,
          any
        >
      | null = null;

    try {
      afterShipData =
        responseText
          ? JSON.parse(
              responseText
            )
          : null;
    } catch {
      afterShipData = null;
    }

    /*
     * AfterShip may return a conflict if the tracking already exists.
     * We still preserve the local tracking number, then the webhook can
     * match it by tracking_number.
     */
    if (
      !response.ok &&
      response.status !==
        409
    ) {
      const message =
        afterShipData?.meta
          ?.message ||
        afterShipData?.message ||
        responseText ||
        "AfterShip registration failed.";

      return NextResponse.json(
        {
          success: false,
          error: message,
          aftershipStatus:
            response.status,
        },
        {
          status: 502,
        }
      );
    }

    const tracking =
      afterShipData?.data
        ?.tracking ||
      afterShipData?.tracking ||
      afterShipData?.data ||
      null;

    const aftershipTrackingId =
      String(
        tracking?.id ||
          ""
      ).trim() ||
      null;

    const detectedCarrier =
      String(
        tracking?.slug ||
          carrier ||
          ""
      ).trim() ||
      null;

    const currentTag =
      String(
        tracking?.tag ||
          ""
      ).trim() ||
      null;

    const {
      error: updateError,
    } =
      await supabaseAdmin
        .from("orders")
        .update({
          tracking_number:
            trackingNumber,
          tracking_carrier:
            detectedCarrier,
          aftership_tracking_id:
            aftershipTrackingId,
          tracking_last_status:
            currentTag,
          tracking_last_updated_at:
            new Date().toISOString(),
          shipping_status:
            currentTag ===
            "Delivered"
              ? "delivered"
              : "shipped",
        })
        .eq("id", orderId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      alreadyRegistered:
        response.status ===
        409,
      tracking: {
        id:
          aftershipTrackingId,
        number:
          trackingNumber,
        carrier:
          detectedCarrier,
        status:
          currentTag,
      },
    });
  } catch (error: unknown) {
    console.error(
      "Tracking registration failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof
          Error
            ? error.message
            : "Tracking registration failed.",
      },
      {
        status: 500,
      }
    );
  }
}