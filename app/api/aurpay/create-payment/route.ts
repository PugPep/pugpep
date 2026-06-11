import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { orderNumber, total } = await request.json();

    if (!orderNumber || !total) {
      return NextResponse.json(
        { error: "Missing orderNumber or total." },
        { status: 400 }
      );
    }

    // Grab the API key from your environment variables safely
    const apiKey = process.env.AURPAY_API_KEY;
    if (!apiKey) {
      console.error("AURPAY_API_KEY is not defined in environment variables.");
      return NextResponse.json(
        { error: "Internal server configuration error." },
        { status: 500 }
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const response = await fetch(
  "https://dashboard.aurpay.net/api/order/pay-url",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey.trim(),
    },
    body: JSON.stringify({
  price: Number(total),
  currency: "USD",
  id: String(orderNumber),
  callback_url: `${siteUrl}/api/aurpay/webhook`,
      
      

    }),
  }
);

    // Parse the JSON data directly if the response is successful
    const data = await response.json().catch(() => null);

    console.log("STATUS:", response.status);
    console.log("DATA:", data);

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.message || "Aurpay gateway error" },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message || "Server error.",
      },
      {
        status: 500,
      }
    );
  }
}