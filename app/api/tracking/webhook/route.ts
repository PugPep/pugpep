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

type OrderRow = {
  id: string;
  order_number: string | null;
  customer_phone: string | null;
  sms_consent: boolean | null;
  shipping_status: string | null;
  closed_at: string | null;
};

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
            "sms_consent",
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
      data: orderData,
      error: orderError,
    } =
      await orderQuery
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
      tag
        .trim()
        .toLowerCase() ===
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
     * Delivery status updates must always be saved, regardless of
     * whether the customer opted in to SMS.
     *
     * A delivered text is sent only when:
     * - this webhook moves the order INTO delivered,
     * - the customer explicitly consented to SMS,
     * - and a customer phone number exists.
     */
    if (
      delivered &&
      order.shipping_status !==
        "delivered" &&
      order.sms_consent ===
        true &&
      order.customer_phone
    ) {
      try {
        const orderLabel =
          order.order_number?.trim() ||
          "Your order";

        const message =
          await sendSms(
            order.customer_phone,
            `PugPep: ${orderLabel} has been delivered. Thank you for choosing PugPep. Reply STOP to opt out or HELP for help.`
          );

        console.log(
          "Delivered SMS accepted:",
          {
            orderId:
              order.id,
            orderNumber:
              order.order_number,
            sid:
              message.sid,
            status:
              message.status,
          }
        );
      } catch (
        smsError
      ) {
        const details =
          smsError as {
            code?: number;
            status?: number;
            message?: string;
            moreInfo?: string;
          };

        /*
         * A failed customer text must not cause AfterShip to retry
         * the entire webhook after the order status was already saved.
         */
        console.error(
          "Delivered SMS failed:",
          {
            orderId:
              order.id,
            orderNumber:
              order.order_number,
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
      }
    } else if (
      delivered &&
      order.shipping_status !==
        "delivered" &&
      order.sms_consent !==
        true
    ) {
      console.log(
        "Delivered SMS skipped because customer did not opt in.",
        {
          orderId:
            order.id,
          orderNumber:
            order.order_number,
        }
      );
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