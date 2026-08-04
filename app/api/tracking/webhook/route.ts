import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

import { NextResponse } from "next/server";

import { sendSms } from "@/lib/sendSms";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AnyRecord =
  Record<string, any>;

function formatPhoneNumber(
  phone: string
) {
  const digits =
    phone.replace(
      /\D/g,
      ""
    );

  if (
    digits.length ===
    10
  ) {
    return `+1${digits}`;
  }

  if (
    digits.length ===
      11 &&
    digits.startsWith(
      "1"
    )
  ) {
    return `+${digits}`;
  }

  return phone;
}

function verifySignature(
  rawBody: string,
  receivedSignature:
    string | null
) {
  const secret =
    process.env.AFTERSHIP_WEBHOOK_SECRET;

  if (
    !secret ||
    !receivedSignature
  ) {
    return false;
  }

  const expected =
    createHmac(
      "sha256",
      secret
    )
      .update(
        rawBody,
        "utf8"
      )
      .digest(
        "base64"
      );

  const expectedBuffer =
    Buffer.from(
      expected
    );

  const receivedBuffer =
    Buffer.from(
      receivedSignature
    );

  return (
    expectedBuffer.length ===
      receivedBuffer.length &&
    timingSafeEqual(
      expectedBuffer,
      receivedBuffer
    )
  );
}

function getTracking(
  payload: AnyRecord
) {
  return (
    payload?.msg?.tracking ||
    payload?.msg ||
    payload?.data
      ?.tracking ||
    payload?.tracking ||
    null
  );
}

function mapShippingStatus(
  tag: string
) {
  switch (
    tag
      .trim()
      .toLowerCase()
  ) {
    case "delivered":
      return "delivered";

    case "outfordelivery":
    case "out for delivery":
      return "out for delivery";

    case "intransit":
    case "in transit":
    case "inforeceived":
    case "info received":
    case "availableforpickup":
    case "available for pickup":
      return "shipped";

    case "attemptfail":
    case "failed attempt":
    case "exception":
    case "expired":
      return "shipping exception";

    default:
      return "shipped";
  }
}

export async function POST(
  request: Request
) {
  const rawBody =
    await request.text();

  const signature =
    request.headers.get(
      "aftership-hmac-sha256"
    );

  if (
    !verifySignature(
      rawBody,
      signature
    )
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Invalid webhook signature.",
      },
      {
        status: 401,
      }
    );
  }

  try {
    const payload =
      JSON.parse(
        rawBody
      ) as AnyRecord;

    const eventId =
      String(
        payload.event_id ||
          ""
      ).trim();

    const eventType =
      String(
        payload.event ||
          ""
      ).trim();

    if (
      eventType &&
      eventType !==
        "tracking_update"
    ) {
      return NextResponse.json({
        success: true,
        ignored: true,
      });
    }

    const tracking =
      getTracking(
        payload
      );

    if (!tracking) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Tracking data missing from webhook.",
        },
        {
          status: 400,
        }
      );
    }

    const trackingNumber =
      String(
        tracking.tracking_number ||
          ""
      ).trim();

    const aftershipTrackingId =
      String(
        tracking.id ||
          ""
      ).trim();

    const tag =
      String(
        tracking.tag ||
          tracking.delivery_status ||
          ""
      ).trim();

    const carrier =
      String(
        tracking.slug ||
          ""
      ).trim() ||
      null;

    const customOrderId =
      String(
        tracking.custom_fields
          ?.pugpep_order_id ||
          ""
      ).trim();

    const externalOrderNumber =
      String(
        tracking.order_id ||
          tracking.title ||
          ""
      ).trim();

    if (eventId) {
      const {
        error: eventError,
      } =
        await supabaseAdmin
          .from(
            "aftership_webhook_events"
          )
          .insert({
            event_id:
              eventId,
            event_type:
              eventType ||
              null,
            tracking_number:
              trackingNumber ||
              null,
            tracking_status:
              tag ||
              null,
            payload,
          });

      if (
        eventError &&
        eventError.code ===
          "23505"
      ) {
        return NextResponse.json({
          success: true,
          duplicate: true,
        });
      }

      if (eventError) {
        throw eventError;
      }
    }

    let orderQuery =
      supabaseAdmin
        .from("orders")
        .select(
          [
            "id",
            "order_number",
            "customer_phone",
            "shipping_status",
            "closed_at",
          ].join(",")
        );

    if (customOrderId) {
      orderQuery =
        orderQuery.eq(
          "id",
          customOrderId
        );
    } else if (
      aftershipTrackingId
    ) {
      orderQuery =
        orderQuery.eq(
          "aftership_tracking_id",
          aftershipTrackingId
        );
    } else if (
      trackingNumber
    ) {
      orderQuery =
        orderQuery.eq(
          "tracking_number",
          trackingNumber
        );
    } else {
      orderQuery =
        orderQuery.eq(
          "order_number",
          externalOrderNumber
        );
    }

    const {
      data: order,
      error: orderError,
    } =
      await orderQuery
        .maybeSingle();

    if (orderError) {
      throw orderError;
    }

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No PugPep order matched this tracking update.",
        },
        {
          status: 404,
        }
      );
    }

    const shippingStatus =
      mapShippingStatus(
        tag
      );

    const delivered =
      tag.toLowerCase() ===
      "delivered";

    const updatePayload:
      Record<
        string,
        unknown
      > = {
        tracking_number:
          trackingNumber ||
          undefined,
        tracking_carrier:
          carrier,
        aftership_tracking_id:
          aftershipTrackingId ||
          undefined,
        tracking_last_status:
          tag ||
          null,
        tracking_last_updated_at:
          new Date().toISOString(),
        shipping_status:
          shippingStatus,
      };

    if (delivered) {
      updatePayload.delivered_at =
        tracking.shipment_delivery_date ||
        new Date().toISOString();
    }

    const {
      error: updateError,
    } =
      await supabaseAdmin
        .from("orders")
        .update(
          updatePayload
        )
        .eq(
          "id",
          order.id
        );

    if (updateError) {
      throw updateError;
    }

    /*
     * Updating shipping_status to delivered activates the database
     * trigger that sets closed_at, so the order moves to Closed.
     */
    if (
      delivered &&
      order.shipping_status !==
        "delivered" &&
      order.customer_phone
    ) {
      try {
        await sendSms(
          formatPhoneNumber(
            order.customer_phone
          ),
          `PugPep: Your order #${order.order_number} has been delivered. Thank you for choosing PugPep.`
        );
      } catch (
        smsError
      ) {
        console.error(
          "Delivered SMS failed:",
          smsError
        );
      }
    }

    return NextResponse.json({
      success: true,
      orderId:
        order.id,
      shippingStatus,
      closedAutomatically:
        delivered,
    });
  } catch (error: unknown) {
    console.error(
      "AfterShip webhook failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof
          Error
            ? error.message
            : "Webhook processing failed.",
      },
      {
        status: 500,
      }
    );
  }
}