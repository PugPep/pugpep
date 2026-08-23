import { NextResponse } from "next/server";
import { sendSms } from "@/lib/sendSms";

export const runtime = "nodejs";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        success: false,
        error: "SMS test endpoint is disabled in production.",
      },
      {
        status: 404,
      }
    );
  }

  try {
    const testNumber =
      process.env.TWILIO_TEST_PHONE_NUMBER?.trim();

    if (!testNumber) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing TWILIO_TEST_PHONE_NUMBER environment variable.",
        },
        {
          status: 500,
        }
      );
    }

    const message =
      await sendSms(
        testNumber,
        "PugPep test text: SMS is working."
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
      "SMS test failed:",
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
      },
      {
        status: 500,
      }
    );
  }
}