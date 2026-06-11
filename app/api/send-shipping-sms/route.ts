import { NextResponse } from "next/server";
import { sendSms } from "@/lib/sendSms";

function formatPhoneNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;

  return phone;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      customerPhone,
      orderNumber,
      shippingStatus,
      trackingNumber,
    } = body;

    if (!customerPhone) {
      return NextResponse.json(
        { success: false, error: "Customer phone missing" },
        { status: 400 }
      );
    }

    await sendSms(
      formatPhoneNumber(customerPhone),
      `PugPep: Your order #${orderNumber} shipping status is now ${shippingStatus}. Tracking: ${
        trackingNumber || "not available yet"
      }`
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
  console.error("SMS failed:", error);

  return NextResponse.json(
    {
      success: false,
      error: error?.message || "SMS failed",
      code: error?.code || null,
      moreInfo: error?.moreInfo || null,
    },
    { status: 500 }
  );
}
}