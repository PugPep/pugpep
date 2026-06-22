export async function trackEvent(event: {
  event_type: string;
  page_path?: string;
  product_slug?: string;
  order_number?: string;
  promo_code?: string;
  payment_method?: string;
  metadata?: any;
}) {
  try {
    await fetch("/api/analytics", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    });
  } catch (error) {
    console.error("Analytics failed:", error);
  }
}