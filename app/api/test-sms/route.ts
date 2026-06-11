import { NextResponse } from "next/server";
import { sendSms } from "@/lib/sendSms";

export async function GET() {
  try {
    await sendSms(
      "+1 5737187970",
      "PugPep test text: SMS is working."
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("SMS test failed:", error);
    return NextResponse.json(
      { success: false, error: "SMS failed" },
      { status: 500 }
    );
  }
}