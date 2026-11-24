import { timingSafeEqual } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { persistOrder } from "./payment/persistOrder";
import { persistOrderItems } from "./payment/persistOrderItems";
import { persistOrderLedger } from "./payment/orderLedger";
import { deductRewardPoints, restoreRewardPoints } from "./payment/rewards";
import { rollbackOrder } from "./payment/rollbackOrder";
import type { PendingCartItem, PendingOrder } from "./payment/types";
import { prismMerchantSecret } from "./prism-config";
import { calculateServerPricing } from "./pricing/pricingEngine";
import { roundCurrency } from "./pricing/utils";
import { sendSms } from "./sendSms";

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PI_RE = /^pi_[A-Za-z0-9]+$/;
const TERMS_VERSION = "pugpep-ruo-checkout-2026-10-v1";
const EMAILJS_URL = "https://api.emailjs.com/api/v1.0/email/send";

export class MerchantHttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export interface MerchantDeps {
  admin?: SupabaseClient;
  sendEmailFn?: (payload: Record<string, unknown>) => Promise<void>;
  sendSmsFn?: (to: string, body: string) => Promise<unknown>;
  expectedSecret?: string;
}

type ParsedLine = {
  encodedId: string;
  productOptionId: string;
  customKitGroupId?: string;
  quantity: number;
};

type OptionCatalogRow = {
  id: string;
  product_slug: string;
  dosage: string | null;
  purchase_type: string | null;
  price: number | string | null;
  status: string | null;
  is_active: boolean | null;
  archived_at: string | null;
};

function cents(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

function constantTimeSecretValid(actual: string, expected: string): boolean {
  const a = Buffer.from(actual, "utf8");
  const b = Buffer.from(expected, "utf8");
  return b.length >= 32 && a.length === b.length && timingSafeEqual(a, b);
}

export function createAdminSupabaseClient(): SupabaseClient {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !serviceKey) {
    throw new MerchantHttpError(503, "Store backend credentials are unavailable.");
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function parseLineId(rawId: unknown): {
  encodedId: string;
  productOptionId: string;
  customKitGroupId?: string;
} {
  if (typeof rawId !== "string") {
    throw new MerchantHttpError(400, "Choose a valid product.");
  }
  const trimmed = rawId.trim().toLowerCase();
  if (UUID_RE.test(trimmed)) {
    return { encodedId: trimmed, productOptionId: trimmed };
  }
  const parts = trimmed.split("__");
  if (parts.length === 2 && UUID_RE.test(parts[0]) && UUID_RE.test(parts[1])) {
    return {
      encodedId: `${parts[0]}__${parts[1]}`,
      productOptionId: parts[0],
      customKitGroupId: parts[1],
    };
  }
  throw new MerchantHttpError(400, "Choose a valid product.");
}

function parseCartItems(rawItems: unknown): ParsedLine[] {
  if (!Array.isArray(rawItems) || rawItems.length === 0 || rawItems.length > 100) {
    throw new MerchantHttpError(400, "Add at least one item to your cart.");
  }
  const merged = new Map<string, ParsedLine>();
  for (const entry of rawItems) {
    if (!entry || typeof entry !== "object") {
      throw new MerchantHttpError(400, "Invalid cart item.");
    }
    const raw = entry as { id?: unknown; product_id?: unknown; qty?: unknown; quantity?: unknown };
    const { encodedId, productOptionId, customKitGroupId } = parseLineId(
      raw.id ?? raw.product_id,
    );
    const qty = Number(raw.qty ?? raw.quantity);
    if (!Number.isSafeInteger(qty) || qty < 1 || qty > 100) {
      throw new MerchantHttpError(400, "Choose a whole-number quantity.");
    }
    const existing = merged.get(encodedId);
    if (existing) {
      existing.quantity += qty;
    } else {
      merged.set(encodedId, {
        encodedId,
        productOptionId,
        customKitGroupId,
        quantity: qty,
      });
    }
  }
  return Array.from(merged.values());
}

async function resolveAccount(
  admin: SupabaseClient,
  request: Request,
): Promise<{
  userId: string | null;
  account: { id: string; email: string; name: string } | null;
}> {
  let token = (request.headers.get("x-prism-account") || "").trim();
  if (token.toLowerCase().startsWith("bearer ")) {
    token = token.slice(7).trim();
  }
  if (!token) {
    return { userId: null, account: null };
  }
  if (token.length > 4096 || token.split(".").length !== 3) {
    throw new MerchantHttpError(401, "Sign in to your PugPep account again.");
  }
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user?.id) {
    throw new MerchantHttpError(401, "Sign in to your PugPep account again.");
  }
  const user = data.user;
  const { data: profile } = await admin
    .from("customer_profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const metaName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : "";
  const fullName = String(
    (profile as { full_name?: string | null } | null)?.full_name || metaName || "",
  ).trim();

  return {
    userId: user.id,
    account: {
      id: user.id,
      email: String(user.email || "").trim().toLowerCase(),
      name: fullName,
    },
  };
}

async function handleCatalog(admin: SupabaseClient) {
  const [{ data: options, error: optionsError }, { data: products, error: productsError }] =
    await Promise.all([
      admin
        .from("product_options")
        .select("id,product_slug,dosage,purchase_type,price,status,is_active,archived_at")
        .eq("is_active", true)
        .is("archived_at", null),
      admin.from("products").select("slug,name,is_active").eq("is_active", true),
    ]);

  if (optionsError) throw optionsError;
  if (productsError) throw productsError;

  const productNames = new Map<string, string>();
  for (const prod of (products || []) as Array<{ slug: string; name: string }>) {
    productNames.set(String(prod.slug || "").trim(), String(prod.name || "").trim());
  }

  const catalog = ((options || []) as OptionCatalogRow[])
    .filter((opt) => productNames.has(String(opt.product_slug || "").trim()))
    .map((opt) => ({
      id: String(opt.id).toLowerCase(),
      product_slug: opt.product_slug,
      name: productNames.get(opt.product_slug) || opt.product_slug,
      dosage: opt.dosage || "",
      purchase_type: opt.purchase_type || "single",
      price: Number(opt.price || 0),
      status: opt.status || "in stock",
      available: ["in stock", "pre-sale"].includes(String(opt.status || "").toLowerCase()),
      revision: "1",
    }));

  return {
    catalog,
    policy: {
      currency: "usd",
      countries: ["US"],
      terms_version: TERMS_VERSION,
      revision: "pugpep-v1",
      shipping_methods: [
        {
          id: "standard",
          label: "Priority Shipping",
          display_name: "Priority Shipping",
        },
      ],
    },
  };
}

function extractCartFields(rawCart: unknown) {
  if (!rawCart || typeof rawCart !== "object") {
    throw new MerchantHttpError(400, "Missing cart details.");
  }
  const cart = rawCart as Record<string, unknown>;
  const stateCode = String(cart.state || "").trim().toUpperCase();
  const postalCode = String(cart.zip || "").trim();
  const city = String(cart.city || "").trim();
  const countryCode = String(cart.country || "US").trim().toUpperCase();
  if (!stateCode || !postalCode) {
    throw new MerchantHttpError(400, "A shipping state and ZIP code are required.");
  }
  if (countryCode !== "US") {
    throw new MerchantHttpError(400, "PugPep currently ships within the United States.");
  }

  const rawPromo = typeof cart.discount_code === "string" ? cart.discount_code.trim().toUpperCase() : "";
  const promoCode = rawPromo || null;
  const rewardPointsRequested = Math.max(
    0,
    Math.floor(Number(cart.reward_points_requested || 0) || 0),
  );

  return {
    cart,
    items: parseCartItems(cart.items),
    stateCode,
    postalCode,
    city,
    countryCode,
    promoCode,
    rewardPointsRequested,
    customerName: String(cart.customer_name || "").trim(),
    customerEmail: String(cart.customer_email || "").trim().toLowerCase(),
    customerPhone: String(cart.phone || "").trim(),
    organization: String(cart.organization || "").trim(),
    address: String(cart.address || "").trim(),
    smsConsent: cart.sms_consent === true,
    requestedOrderNumber:
      typeof cart.requested_order_number === "string"
        ? cart.requested_order_number.trim()
        : "",
    consent:
      cart.consent && typeof cart.consent === "object"
        ? (cart.consent as { age_ok?: unknown; research_use_ok?: unknown; terms_ok?: unknown })
        : null,
  };
}

async function computeAuthoritativeQuote(
  admin: SupabaseClient,
  userId: string | null,
  parsed: ReturnType<typeof extractCartFields>,
) {
  const pricing = await calculateServerPricing({
    supabase: admin,
    customerId: userId,
    items: parsed.items.map((item) => ({
      productOptionId: item.productOptionId,
      quantity: item.quantity,
      ...(item.customKitGroupId ? { customKitGroupId: item.customKitGroupId } : {}),
    })),
    shippingAddress: {
      countryCode: parsed.countryCode,
      stateCode: parsed.stateCode,
      postalCode: parsed.postalCode,
      ...(parsed.city ? { city: parsed.city } : {}),
    },
    promoCode: parsed.promoCode,
    rewardPointsRequested: userId ? parsed.rewardPointsRequested : 0,
    shippingMethod: "standard",
  });

  const critical = pricing.warnings.find((w) => w.severity === "critical");
  if (critical) {
    throw new MerchantHttpError(409, critical.message);
  }
  if (!pricing.campaign.items.length) {
    throw new MerchantHttpError(409, "No valid items could be priced.");
  }

  const totalMinor = cents(pricing.accounting.customerTotal);
  if (!totalMinor || totalMinor <= 0) {
    throw new MerchantHttpError(409, "Order total is outside the supported payment range.");
  }

  const lineIndexUsed = new Set<number>();
  const lines = pricing.campaign.items.map((line, index) => {
    const reqAtIdx = parsed.items[index];
    let matched: ParsedLine | undefined;
    if (reqAtIdx && reqAtIdx.productOptionId === line.productOptionId && !lineIndexUsed.has(index)) {
      lineIndexUsed.add(index);
      matched = reqAtIdx;
    } else {
      const foundIdx = parsed.items.findIndex(
        (candidate, idx) =>
          !lineIndexUsed.has(idx) && candidate.productOptionId === line.productOptionId,
      );
      if (foundIdx >= 0) {
        lineIndexUsed.add(foundIdx);
        matched = parsed.items[foundIdx];
      }
    }
    const lineAmountMinor = cents(line.campaignLineRevenue) ?? 0;
    const unitAmountMinor = Math.round(lineAmountMinor / Math.max(1, line.quantity));
    return {
      product_id: matched?.encodedId || line.productOptionId,
      name: line.productName,
      parent_id: null,
      variant_label: `${line.dosage}${line.purchaseType === "kit" ? " · 10-Vial Kit" : ""}`,
      quantity: line.quantity,
      unit_amount_minor: unitAmountMinor,
      amount_minor: lineAmountMinor,
      revision: "1",
    };
  });

  const subtotal = roundCurrency(pricing.campaign.campaignMerchandiseRevenue);
  const orderDiscounts = roundCurrency(
    pricing.discounts.generalPromoDiscount +
      pricing.discounts.salesRepDiscount +
      pricing.discounts.referralDiscount +
      pricing.discounts.rewardsDiscount +
      pricing.discounts.vipDiscount +
      pricing.discounts.heroDiscount +
      pricing.discounts.manualDiscount +
      pricing.discounts.merchantTaxOffsetDiscount,
  );
  const shipping = roundCurrency(pricing.shipping.shippingCollected);
  const tax = roundCurrency(pricing.tax.salesTaxAmount);
  const total = roundCurrency(pricing.accounting.customerTotal);

  return {
    pricing,
    lines,
    quoteSummary: {
      complete: true,
      subtotal,
      discount: orderDiscounts,
      affiliate_discount: 0,
      store_credit: 0,
      pm_discount: 0,
      shipping,
      tax,
      total,
    },
  };
}

async function generateOrderNumber(admin: SupabaseClient, requested: string): Promise<string> {
  if (/^PUG-[A-Za-z0-9_-]{4,40}$/.test(requested)) {
    const { data: existing } = await admin
      .from("orders")
      .select("id")
      .eq("order_number", requested)
      .maybeSingle();
    if (!existing) return requested;
  }
  const suffix = Math.floor(Math.random() * 900 + 100);
  return `PUG-${Date.now()}-${suffix}`;
}

async function handleQuote(admin: SupabaseClient, request: Request, body: Record<string, unknown>) {
  const { userId } = await resolveAccount(admin, request);
  const parsed = extractCartFields(body.cart);
  const { lines, quoteSummary } = await computeAuthoritativeQuote(admin, userId, parsed);
  return {
    nativeQuote: true,
    lines,
    quotes: {
      standard: quoteSummary,
    },
  };
}

async function handlePrepare(admin: SupabaseClient, request: Request, body: Record<string, unknown>) {
  const { userId } = await resolveAccount(admin, request);
  const prismOrderId = typeof body.prismOrderId === "string" ? body.prismOrderId.trim() : "";
  if (!UUID_RE.test(prismOrderId)) {
    throw new MerchantHttpError(400, "Invalid checkout order ID.");
  }
  const expectedAmountMinor = Number(body.expectedAmountMinor);
  if (!Number.isSafeInteger(expectedAmountMinor) || expectedAmountMinor <= 0) {
    throw new MerchantHttpError(400, "Invalid expected order amount.");
  }

  const parsed = extractCartFields(body.cart);
  if (
    parsed.consent?.age_ok !== true ||
    parsed.consent?.research_use_ok !== true ||
    parsed.consent?.terms_ok !== true
  ) {
    throw new MerchantHttpError(400, "Please confirm the Research Use Only terms before paying.");
  }
  if (!parsed.customerEmail || !parsed.customerName || !parsed.address) {
    throw new MerchantHttpError(400, "Complete customer contact and delivery details before paying.");
  }

  // Idempotent replay verification for the same PRISM checkout order ID.
  const { data: existingOrder, error: existingError } = await admin
    .from("orders")
    .select("id,user_id,order_number,total")
    .eq("id", prismOrderId)
    .maybeSingle();
  if (existingError) throw existingError;

  if (existingOrder) {
    const existingRow = existingOrder as {
      id: string;
      user_id: string | null;
      order_number: string;
      total: number | string;
    };
    if ((existingRow.user_id ?? null) !== (userId ?? null)) {
      throw new MerchantHttpError(409, "This order belongs to a different account.");
    }
    const { count: itemCount, error: countError } = await admin
      .from("order_items")
      .select("id", { count: "exact", head: true })
      .eq("order_id", prismOrderId);
    if (countError) throw countError;
    if (!itemCount || itemCount <= 0) {
      throw new MerchantHttpError(409, "Existing order is missing its line items.");
    }
    if (cents(existingRow.total) !== expectedAmountMinor) {
      throw new MerchantHttpError(409, "The order total changed. Review checkout before paying.");
    }
    return {
      prepared: true,
      orderId: existingRow.id,
      orderNumber: existingRow.order_number,
      total: Number(existingRow.total),
      alreadyPrepared: true,
    };
  }

  const { pricing } = await computeAuthoritativeQuote(admin, userId, parsed);
  const actualMinor = cents(pricing.accounting.customerTotal);
  if (actualMinor !== expectedAmountMinor) {
    throw new MerchantHttpError(409, "The order total changed. Review checkout before paying.");
  }

  let rewardPointsBefore = 0;
  let lifetimeSpendBefore = 0;
  if (userId) {
    const { data: profileData, error: profileError } = await admin
      .from("customer_profiles")
      .select("reward_points,lifetime_spend")
      .eq("id", userId)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profileData) {
      throw new MerchantHttpError(409, "Customer profile could not be found.");
    }
    rewardPointsBefore = Math.max(
      0,
      Number((profileData as { reward_points?: number | null }).reward_points || 0),
    );
    lifetimeSpendBefore = Math.max(
      0,
      Number((profileData as { lifetime_spend?: number | null }).lifetime_spend || 0),
    );
  }

  const optionIds = Array.from(new Set(parsed.items.map((item) => item.productOptionId)));
  const { data: optionMetaRows, error: optionMetaError } = await admin
    .from("product_options")
    .select("id,status")
    .in("id", optionIds);
  if (optionMetaError) throw optionMetaError;
  const statusByOption = new Map<string, string>(
    ((optionMetaRows || []) as Array<{ id: string; status: string | null }>).map((row) => [
      String(row.id).toLowerCase(),
      String(row.status || "in stock"),
    ]),
  );

  const orderNumber = await generateOrderNumber(admin, parsed.requestedOrderNumber);
  const pendingItems: PendingCartItem[] = pricing.campaign.items.map((line, index) => {
    const reqLine = parsed.items[index];
    return {
      productOptionId: line.productOptionId,
      slug: line.productSlug,
      name: line.productName,
      dosage: line.dosage,
      purchaseType: line.purchaseType,
      price: line.actualUnitPrice,
      regularPrice: line.regularUnitPrice,
      quantity: line.quantity,
      status: statusByOption.get(line.productOptionId.toLowerCase()) || "in stock",
      ...(reqLine?.customKitGroupId ? { customKitGroupId: reqLine.customKitGroupId } : {}),
    } as PendingCartItem;
  });

  const pendingOrder: PendingOrder = {
    id: prismOrderId,
    userId,
    orderNumber,
    customer: {
      organization: parsed.organization,
      name: parsed.customerName,
      email: parsed.customerEmail,
      phone: parsed.customerPhone,
      address: parsed.address,
      city: parsed.city,
      state: parsed.stateCode,
      zip: parsed.postalCode,
    },
    items: pendingItems,
    smsConsent: parsed.smsConsent,
    paymentMethod: "credit_card",
    pricing,
    pricingSnapshot: pricing.snapshot,
    shippingMethod: pricing.shipping.shippingMethod,
    shippingMethodLabel: pricing.shipping.shippingMethodLabel,
    subtotal: pricing.accounting.regularMerchandiseValue,
    shipping: pricing.accounting.shippingCollected,
    salesTax: pricing.accounting.salesTaxCollected,
    rewardPointsUsed: pricing.rewards.pointsUsed,
    rewardDiscount: pricing.discounts.rewardsDiscount,
    promoCode: pricing.promo.appliedPromoCode,
    promoSource: pricing.promo.appliedPromoSource,
    promoDiscount:
      pricing.discounts.generalPromoDiscount + pricing.discounts.salesRepDiscount,
    totalDiscount: pricing.discounts.totalDiscount,
    total: pricing.accounting.customerTotal,
    createdAt: new Date().toISOString(),
    confirmed: true,
  };

  let orderInserted = false;
  let deductedRewardPoints = 0;

  try {
    await persistOrder({
      supabase: admin,
      order: pendingOrder,
      pricing,
      paymentMethod: "credit_card",
      lifetimeSpendBefore,
    });
    orderInserted = true;

    const pricedInputItems = parsed.items.map((item) => ({
      productOptionId: item.productOptionId,
      quantity: item.quantity,
      ...(item.customKitGroupId ? { customKitGroupId: item.customKitGroupId } : {}),
    }));
    const hasCustomKit = pricedInputItems.some((i) => Boolean(i.customKitGroupId));

    const insertedItems = await persistOrderItems({
      supabase: admin,
      order: pendingOrder,
      pricing,
      pricedInputItems,
    });

    await persistOrderLedger({
      supabase: admin,
      order: pendingOrder,
      pricing,
      insertedItems,
      itemsInPricingOrder: hasCustomKit,
    });

    if (userId || pricing.promo.appliedPromoSource === "sales_rep") {
      const { error: attributionError } = await admin.rpc(
        "finalize_sales_rep_order_attribution",
        {
          p_order_id: pendingOrder.id,
          p_customer_id: userId,
          p_promo_code: pricing.promo.appliedPromoCode,
          p_discount_amount: pricing.discounts.salesRepDiscount,
          p_commissionable_profit: pricing.commission.commissionBasis,
        },
      );
      if (attributionError) {
        if (userId) throw attributionError;
        console.warn("Guest sales-rep attribution skipped by DB RPC:", attributionError.message);
      }
    }

    if (
      pricing.promo.appliedPromoSource === "general" &&
      pricing.promo.appliedPromoCode &&
      pricing.discounts.generalPromoDiscount > 0
    ) {
      const { error: promoRedeemError } = await admin.rpc(
        "redeem_general_promo_for_order",
        {
          p_order_id: pendingOrder.id,
          p_customer_id: userId,
          p_code: pricing.promo.appliedPromoCode,
          p_discount_amount: pricing.discounts.generalPromoDiscount,
        },
      );
      if (promoRedeemError) {
        throw promoRedeemError;
      }
    }

    if (userId && pricing.rewards.pointsUsed > 0) {
      deductedRewardPoints = await deductRewardPoints({
        supabase: admin,
        customerId: userId,
        rewardPointsBefore,
        pointsUsed: pricing.rewards.pointsUsed,
      });
    }

    const { error: lockError } = await admin.rpc("lock_order_financial_snapshot", {
      p_order_id: pendingOrder.id,
    });
    if (lockError) {
      throw lockError;
    }

    return {
      prepared: true,
      orderId: pendingOrder.id,
      orderNumber: pendingOrder.orderNumber,
      total: pricing.accounting.customerTotal,
    };
  } catch (error) {
    if (deductedRewardPoints > 0 && userId) {
      try {
        await restoreRewardPoints({
          supabase: admin,
          customerId: userId,
          points: deductedRewardPoints,
        });
      } catch (restoreErr) {
        console.error("Failed to restore PugPoints during rollback:", restoreErr);
      }
    }
    if (orderInserted) {
      await rollbackOrder(admin, pendingOrder.id);
    }
    throw error;
  }
}

async function handleSettle(admin: SupabaseClient, body: Record<string, unknown>) {
  const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
  const paymentId = typeof body.paymentId === "string" ? body.paymentId.trim() : "";
  const currency = typeof body.currency === "string" ? body.currency.trim().toLowerCase() : "";
  const status = typeof body.status === "string" ? body.status.trim().toLowerCase() : "";
  const amountMinor = Number(body.amountMinor);

  if (!UUID_RE.test(orderId) || !PI_RE.test(paymentId) || currency !== "usd" || status !== "succeeded") {
    throw new MerchantHttpError(400, "Invalid settlement confirmation.");
  }

  const { data: orderData, error: orderError } = await admin
    .from("orders")
    .select("id,user_id,order_number,total,status,payment_method")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) throw orderError;
  if (!orderData) {
    throw new MerchantHttpError(404, "Order could not be found.");
  }

  const order = orderData as {
    id: string;
    user_id: string | null;
    order_number: string;
    total: number | string;
    status: string | null;
    payment_method: string | null;
  };

  if (cents(order.total) !== amountMinor) {
    throw new MerchantHttpError(409, "Settlement amount does not match the prepared order.");
  }

  if (String(order.status || "").toLowerCase() === "paid") {
    return {
      ok: true,
      orderId: order.id,
      orderNumber: order.order_number,
      paymentId,
      alreadySettled: true,
    };
  }

  if (order.payment_method !== "credit_card") {
    const { error: methodError } = await admin
      .from("orders")
      .update({ payment_method: "credit_card" })
      .eq("id", order.id);
    if (methodError) throw methodError;
  }

  const { error: paidError } = await admin.rpc("mark_order_paid", {
    target_order_id: order.id,
  });

  if (paidError) {
    if (order.user_id !== null) {
      throw new MerchantHttpError(500, `mark_order_paid failed: ${paidError.message}`);
    }
    console.warn(
      "mark_order_paid RPC returned error on guest order; falling back to direct status=paid:",
      paidError.message,
    );
    const { error: guestPaidError } = await admin
      .from("orders")
      .update({ status: "paid" })
      .eq("id", order.id);
    if (guestPaidError) {
      throw new MerchantHttpError(500, `Unable to settle guest order: ${guestPaidError.message}`);
    }
  }

  const { data: verified, error: verifyError } = await admin
    .from("orders")
    .select("id,order_number,status")
    .eq("id", order.id)
    .single();
  if (verifyError || !verified) {
    throw new MerchantHttpError(500, "Could not confirm settled order state.");
  }

  const settledRow = verified as { id: string; order_number: string; status: string | null };
  if (String(settledRow.status || "").toLowerCase() !== "paid") {
    throw new MerchantHttpError(409, "Order settlement did not transition status to paid.");
  }

  return {
    ok: true,
    orderId: settledRow.id,
    orderNumber: settledRow.order_number,
    paymentId,
  };
}

async function defaultSendEmail(payload: Record<string, unknown>) {
  const response = await fetch(EMAILJS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`EmailJS failed (${response.status}): ${text}`);
  }
}

async function handleNotify(
  admin: SupabaseClient,
  body: Record<string, unknown>,
  deps: MerchantDeps,
) {
  const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
  if (!UUID_RE.test(orderId)) {
    throw new MerchantHttpError(400, "Invalid order ID.");
  }

  const { data: orderData, error: orderError } = await admin
    .from("orders")
    .select(
      "id,order_number,customer_name,customer_email,customer_phone,organization,shipping_collected,sales_tax_amount,promo_code,promo_discount,reward_discount,total,sms_consent",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (orderError) throw orderError;
  if (!orderData) {
    throw new MerchantHttpError(404, "Order could not be found.");
  }

  const order = orderData as {
    id: string;
    order_number: string;
    customer_name: string | null;
    customer_email: string | null;
    customer_phone: string | null;
    organization: string | null;
    shipping_collected: number | string | null;
    sales_tax_amount: number | string | null;
    promo_code: string | null;
    promo_discount: number | string | null;
    reward_discount: number | string | null;
    total: number | string | null;
    sms_consent: boolean | null;
  };

  const { data: items, error: itemsError } = await admin
    .from("order_items")
    .select("product_name,dosage,quantity,line_revenue,price,lot_number")
    .eq("order_id", order.id)
    .order("id", { ascending: true });
  if (itemsError) throw itemsError;

  let emailSent = false;
  const emailPrivateKey = (process.env.EMAILJS_PRIVATE_KEY || "").trim();
  const emailServiceId = (
    process.env.EMAILJS_SERVICE_ID ||
    process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID ||
    "service_quxnkin"
  ).trim();
  const emailPublicKey = (
    process.env.EMAILJS_PUBLIC_KEY ||
    process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY ||
    "yc_0cE0Mcl3tfzc11"
  ).trim();

  if (order.customer_email && emailPrivateKey) {
    try {
      const emailItems = ((items || []) as Array<{
        product_name: string | null;
        dosage: string | null;
        quantity: number | null;
        line_revenue: number | string | null;
        price: number | string | null;
        lot_number: string | null;
      }>).map((item) => {
        const productName = String(item.product_name || "Product");
        const dosage = String(item.dosage || "");
        const lotNumber = String(item.lot_number || "").trim();
        const displayName = dosage ? `${productName} (${dosage})` : productName;
        return {
          name: lotNumber ? `${displayName} — Lot ${lotNumber}` : displayName,
          dosage,
          lot_number: lotNumber || "Not captured",
          quantity: Math.max(1, Number(item.quantity || 1)),
          price: `$${Number(item.line_revenue ?? item.price ?? 0).toFixed(2)}`,
        };
      });

      const sendEmailFn = deps.sendEmailFn || defaultSendEmail;
      await sendEmailFn({
        service_id: emailServiceId,
        template_id: "template_xz4gtk9",
        user_id: emailPublicKey,
        accessToken: emailPrivateKey,
        template_params: {
          organization: order.organization || "",
          name: order.customer_name || "Customer",
          email: order.customer_email,
          admin_email: "Support@PugPep.com",
          order_number: order.order_number,
          items: emailItems,
          shipping: Number(order.shipping_collected || 0).toFixed(2),
          tax: Number(order.sales_tax_amount || 0).toFixed(2),
          promo_code: order.promo_code || "",
          promo_discount: Number(order.promo_discount || 0).toFixed(2),
          reward_discount: Number(order.reward_discount || 0).toFixed(2),
          total: Number(order.total || 0).toFixed(2),
        },
      });
      emailSent = true;
    } catch (emailErr) {
      console.error("PRISM confirmation email failed:", emailErr);
    }
  }

  let smsSent = false;
  if (order.sms_consent === true && order.customer_phone?.trim()) {
    try {
      const sendSmsFn = deps.sendSmsFn || sendSms;
      const total = Number(order.total || 0);
      await sendSmsFn(
        order.customer_phone,
        `PugPep Order Updates: We received order ${order.order_number}. Total: $${total.toFixed(2)}. We’ll text you again when your order ships. Reply STOP to opt out or HELP for help.`,
      );
      smsSent = true;
    } catch (smsErr) {
      console.error("PRISM confirmation SMS failed:", smsErr);
    }
  }

  return { ok: true, emailSent, smsSent };
}

export async function handleMerchantRequest(
  request: Request,
  deps: MerchantDeps = {},
): Promise<Response> {
  const expectedSecret = deps.expectedSecret ?? prismMerchantSecret();
  const actualSecret = (request.headers.get("x-prism-merchant-secret") || "").trim();
  if (!constantTimeSecretValid(actualSecret, expectedSecret)) {
    return new Response("Not found", { status: 404, headers: PRIVATE_HEADERS });
  }

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return Response.json({ error: "Invalid request body." }, { status: 400, headers: PRIVATE_HEADERS });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400, headers: PRIVATE_HEADERS });
  }

  const operation = typeof body.prismOperation === "string" ? body.prismOperation : "";
  try {
    const admin = deps.admin || createAdminSupabaseClient();
    if (operation === "account") {
      const { account } = await resolveAccount(admin, request);
      return Response.json({ account }, { headers: PRIVATE_HEADERS });
    }
    if (operation === "catalog") {
      return Response.json(await handleCatalog(admin), { headers: PRIVATE_HEADERS });
    }
    if (operation === "quote") {
      return Response.json(await handleQuote(admin, request, body), { headers: PRIVATE_HEADERS });
    }
    if (operation === "prepare") {
      return Response.json(await handlePrepare(admin, request, body), { headers: PRIVATE_HEADERS });
    }
    if (operation === "settle") {
      return Response.json(await handleSettle(admin, body), { headers: PRIVATE_HEADERS });
    }
    if (operation === "notify") {
      return Response.json(await handleNotify(admin, body, deps), { headers: PRIVATE_HEADERS });
    }
    return Response.json({ error: "Unknown merchant operation." }, { status: 400, headers: PRIVATE_HEADERS });
  } catch (error) {
    if (error instanceof MerchantHttpError) {
      return Response.json(
        { error: error.message },
        { status: error.status, headers: PRIVATE_HEADERS },
      );
    }
    console.error("PRISM merchant bridge error:", error);
    return Response.json(
      { error: "Unable to process merchant checkout request." },
      { status: 500, headers: PRIVATE_HEADERS },
    );
  }
}
