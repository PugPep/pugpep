import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const OPTION_ID = "11111111-1111-4111-8111-111111111111";
const KIT_GROUP_ID = "22222222-2222-4222-8222-222222222222";
const ORDER_ID = "33333333-3333-4333-8333-333333333333";
const USER_ID = "44444444-4444-4444-8444-444444444444";
const MERCHANT_SECRET = "pugpep_test_merchant_secret_1234567890";
const PROXY_SECRET = "pugpep_test_proxy_secret_12345678901234";

function createFakeSupabase({
  orderRow = null,
  orderItemCount = 1,
  markPaidResult = { error: null },
  userForJwt = null,
}: {
  orderRow?: Record<string, unknown> | null;
  orderItemCount?: number;
  markPaidResult?: { error: { message: string } | null };
  userForJwt?: { id: string; email: string; user_metadata?: Record<string, unknown> } | null;
} = {}) {
  const rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const updateCalls: Array<{ table: string; values: Record<string, unknown> }> = [];

  const buildChain = (table: string) => {
    const chain = {
      select: (_cols?: string, opts?: { count?: string; head?: boolean }) => {
        if (opts?.head && table === "order_items") {
          return {
            eq: async () => ({ count: orderItemCount, error: null }),
          };
        }
        return chain;
      },
      eq: () => chain,
      is: () => chain,
      in: () => {
        if (table === "product_options") {
          return {
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    is: async () => ({
                      data: [
                        {
                          id: OPTION_ID,
                          product_slug: "bpc-157",
                          dosage: "10mg",
                          purchase_type: "single",
                          status: "in stock",
                          is_active: true,
                          archived_at: null,
                          sale_active: false,
                          sale_percent: 0,
                          bundle_discount_enabled: false,
                          bundle_qty_1: null,
                          bundle_discount_1: null,
                          bundle_qty_2: null,
                          bundle_discount_2: null,
                          bundle_qty_3: null,
                          bundle_discount_3: null,
                        },
                      ],
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
            then: (resolve: (val: unknown) => void) =>
              resolve({
                data: [
                  {
                    id: OPTION_ID,
                    product_slug: "bpc-157",
                    dosage: "10mg",
                    purchase_type: "single",
                    status: "in stock",
                    is_active: true,
                    archived_at: null,
                    sale_active: false,
                    sale_percent: 0,
                    bundle_discount_enabled: false,
                    bundle_qty_1: null,
                    bundle_discount_1: null,
                    bundle_qty_2: null,
                    bundle_discount_2: null,
                    bundle_qty_3: null,
                    bundle_discount_3: null,
                  },
                ],
                error: null,
              }),
          };
        }
        if (table === "products") {
          return Promise.resolve({
            data: [{ slug: "bpc-157", name: "BPC-157", is_active: true, is_taxable: true, tax_code: null }],
            error: null,
          });
        }
        if (table === "inventory") {
          return {
            eq: () => ({
              eq: async () => ({
                data: [{ product_slug: "bpc-157", dosage: "10mg", quantity: 50 }],
                error: null,
              }),
            }),
          };
        }
        return Promise.resolve({ data: [], error: null });
      },
      order: () => chain,
      limit: () => chain,
      maybeSingle: async () => {
        if (table === "orders") return { data: orderRow, error: null };
        if (table === "customer_profiles") return { data: { full_name: "Test Researcher" }, error: null };
        if (table === "marketing_rules") {
          return {
            data: {
              rewards_enabled: true,
              allow_rewards_on_sale_items: true,
              earn_rewards_on_sale_orders: true,
              general_promos_enabled: true,
              allow_general_promos_on_sale_items: true,
              sales_rep_codes_enabled: true,
              sales_rep_discount_first_order_only: false,
              allow_sales_rep_discount_on_sale_items: true,
              preserve_sales_rep_attribution_when_discount_blocked: true,
              default_sales_rep_commission_percent: 10,
              referral_program_enabled: false,
              allow_referral_discount_on_sale_items: false,
              maximum_referral_discount_percent: 0,
              free_shipping_threshold: 250,
              lifetime_free_shipping_enabled: true,
              default_shipping_cost: 6,
              default_express_shipping_cost: 12,
              default_packaging_cost: 1.5,
              minimum_margin_warning_percent: 15,
              critical_margin_percent: 5,
            },
            error: null,
          };
        }
        if (table === "sales_tax_settings") {
          return {
            data: {
              tax_enabled: false,
              calculation_mode: "manual",
              tax_provider: "manual",
              prices_include_tax: false,
              tax_shipping: false,
            },
            error: null,
          };
        }
        return { data: null, error: null };
      },
      single: async () => ({
        data: orderRow ? { ...orderRow, status: "paid" } : null,
        error: null,
      }),
      update: (values: Record<string, unknown>) => ({
        eq: async () => {
          updateCalls.push({ table, values });
          return { error: null };
        },
      }),
      then: (resolve: (val: unknown) => void) => {
        if (table === "product_options") {
          return resolve({
            data: [
              {
                id: OPTION_ID,
                product_slug: "bpc-157",
                dosage: "10mg",
                purchase_type: "single",
                price: 50,
                status: "in stock",
                is_active: true,
                archived_at: null,
              },
            ],
            error: null,
          });
        }
        if (table === "products") {
          return resolve({
            data: [{ slug: "bpc-157", name: "BPC-157", is_active: true }],
            error: null,
          });
        }
        if (table === "order_items") {
          return resolve({
            data: [
              {
                product_name: "BPC-157",
                dosage: "10mg",
                quantity: 2,
                line_revenue: 100,
                price: 100,
                lot_number: "LOT-2026-01",
              },
            ],
            error: null,
          });
        }
        return resolve({ data: [], error: null });
      },
    };
    return chain;
  };

  const client = {
    auth: {
      getUser: async (jwt?: string) => {
        if (userForJwt && jwt === "header.payload.sig") {
          return { data: { user: userForJwt }, error: null };
        }
        return { data: { user: null }, error: new Error("invalid jwt") };
      },
    },
    from: (table: string) => buildChain(table),
    rpc: async (name: string, args: Record<string, unknown>) => {
      rpcCalls.push({ name, args });
      if (name === "get_product_option_campaign_price") {
        return {
          data: {
            product_option_id: OPTION_ID,
            product_slug: "bpc-157",
            dosage: "10mg",
            purchase_type: "single",
            has_campaign: false,
            regular_unit_price: 50,
            sale_unit_price: 50,
            sale_discount_amount: 0,
            discount_value: 0,
            unit_cost: 15,
          },
          error: null,
        };
      }
      if (name === "mark_order_paid") {
        return markPaidResult;
      }
      return { data: null, error: null };
    },
  };

  return {
    client: client as unknown as SupabaseClient,
    rpcCalls,
    updateCalls,
  };
}

describe("PugPep hidden PRISM checkout", () => {
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.resetModules();
    process.env.PRISM_CHECKOUT_ENABLED = "false";
    process.env.PRISM_CHECKOUT_HOST = "https://prism-pugpep-checkout-production.workers.dev";
    process.env.PRISM_PROXY_SECRET = PROXY_SECRET;
    process.env.PRISM_MERCHANT_SECRET = MERCHANT_SECRET;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    globalThis.fetch = originalFetch;
  });

  it("keeps card checkout dormant when PRISM_CHECKOUT_ENABLED=false", async () => {
    const { relayPrismCheckout } = await import("../lib/prism-relay");

    const cfgRes = await relayPrismCheckout(
      new Request("https://pugpep.com/api/prism/config", {
        method: "GET",
        headers: { "x-real-ip": "203.0.113.10" },
      }),
    );
    expect(cfgRes.status).toBe(200);
    expect(await cfgRes.json()).toEqual({ enabled: false });

    const bootRes = await relayPrismCheckout(
      new Request("https://pugpep.com/api/prism/bootstrap", {
        method: "POST",
        headers: { "x-real-ip": "203.0.113.10" },
      }),
    );
    expect(bootRes.status).toBe(404);

    const actionRes = await relayPrismCheckout(
      new Request("https://pugpep.com/api/prism/action", {
        method: "POST",
        headers: { "x-real-ip": "203.0.113.10" },
      }),
    );
    expect(actionRes.status).toBe(404);

    const assetRes = await relayPrismCheckout(
      new Request("https://pugpep.com/prism/0.2.2-candidate.4-pugpep.1/assets/js/checkout.js", {
        method: "GET",
        headers: { "x-real-ip": "203.0.113.10" },
      }),
    );
    expect(assetRes.status).toBe(404);
  });

  it("keeps POST /api/prism/callback active even when checkout UI flag is false", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        Response.json({ ok: true }, { status: 200 }),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const { relayPrismCheckout } = await import("../lib/prism-relay");
    const cbRes = await relayPrismCheckout(
      new Request("https://pugpep.com/api/prism/callback", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-psc-site": "site-1",
          "x-psc-signature": "sig",
        },
        body: JSON.stringify({ ok: true }),
      }),
    );
    expect(cbRes.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const forwardedHeaders = fetchMock.mock.calls[0]?.[1]?.headers as Headers;
    expect(forwardedHeaders.get("x-prism-proxy")).toBe(PROXY_SECRET);
  });

  it("rejects /api/prism/merchant requests missing or mismatching x-prism-merchant-secret with 404", async () => {
    const { handleMerchantRequest } = await import("../lib/prism-merchant");
    const { client } = createFakeSupabase();

    const noSecret = await handleMerchantRequest(
      new Request("https://pugpep.com/api/prism/merchant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prismOperation: "catalog" }),
      }),
      { admin: client },
    );
    expect(noSecret.status).toBe(404);

    const badSecret = await handleMerchantRequest(
      new Request("https://pugpep.com/api/prism/merchant", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-prism-merchant-secret": "wrong_secret",
        },
        body: JSON.stringify({ prismOperation: "catalog" }),
      }),
      { admin: client },
    );
    expect(badSecret.status).toBe(404);
  });

  it("supports guest and verified account resolution on /api/prism/merchant", async () => {
    const { handleMerchantRequest } = await import("../lib/prism-merchant");
    const { client } = createFakeSupabase({
      userForJwt: { id: USER_ID, email: "Researcher@PugPep.com" },
    });

    const guestRes = await handleMerchantRequest(
      new Request("https://pugpep.com/api/prism/merchant", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-prism-merchant-secret": MERCHANT_SECRET,
        },
        body: JSON.stringify({ prismOperation: "account" }),
      }),
      { admin: client },
    );
    expect(guestRes.status).toBe(200);
    expect(await guestRes.json()).toEqual({ account: null });

    const userRes = await handleMerchantRequest(
      new Request("https://pugpep.com/api/prism/merchant", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-prism-merchant-secret": MERCHANT_SECRET,
          "x-prism-account": "header.payload.sig",
        },
        body: JSON.stringify({ prismOperation: "account" }),
      }),
      { admin: client },
    );
    expect(userRes.status).toBe(200);
    expect(await userRes.json()).toEqual({
      account: { id: USER_ID, email: "researcher@pugpep.com", name: "Test Researcher" },
    });

    const invalidJwtRes = await handleMerchantRequest(
      new Request("https://pugpep.com/api/prism/merchant", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-prism-merchant-secret": MERCHANT_SECRET,
          "x-prism-account": "bad.jwt.value",
        },
        body: JSON.stringify({ prismOperation: "account" }),
      }),
      { admin: client },
    );
    expect(invalidJwtRes.status).toBe(401);
  });

  it("handles catalog, guest custom-kit quote, prepare replay, settle mark_order_paid, and notify", async () => {
    const { handleMerchantRequest } = await import("../lib/prism-merchant");
    const { client, rpcCalls } = createFakeSupabase({
      orderRow: {
        id: ORDER_ID,
        user_id: null,
        order_number: "PUG-123456",
        total: 112,
        status: "pending",
        payment_method: "credit_card",
        customer_name: "Guest Lab",
        customer_email: "guest@example.com",
        customer_phone: "5551234567",
        organization: "Example Lab",
        shipping_collected: 12,
        sales_tax_amount: 0,
        promo_code: null,
        promo_discount: 0,
        reward_discount: 0,
        sms_consent: true,
      },
    });

    const catRes = await handleMerchantRequest(
      new Request("https://pugpep.com/api/prism/merchant", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-prism-merchant-secret": MERCHANT_SECRET,
        },
        body: JSON.stringify({ prismOperation: "catalog" }),
      }),
      { admin: client },
    );
    expect(catRes.status).toBe(200);
    const catJson = await catRes.json();
    expect(catJson.catalog).toHaveLength(1);
    expect(catJson.policy.shipping_methods[0].id).toBe("standard");

    const kitEncodedId = `${OPTION_ID}__${KIT_GROUP_ID}`;
    const quoteRes = await handleMerchantRequest(
      new Request("https://pugpep.com/api/prism/merchant", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-prism-merchant-secret": MERCHANT_SECRET,
        },
        body: JSON.stringify({
          prismOperation: "quote",
          cart: {
            customer_name: "Guest Lab",
            customer_email: "guest@example.com",
            address: "100 Science Way",
            city: "Austin",
            state: "TX",
            zip: "78701",
            country: "US",
            shipping_method: "standard",
            items: [{ id: kitEncodedId, qty: 2 }],
          },
        }),
      }),
      { admin: client },
    );
    expect(quoteRes.status).toBe(200);
    const quoteJson = await quoteRes.json();
    expect(quoteJson.nativeQuote).toBe(true);
    expect(quoteJson.lines[0].product_id).toBe(kitEncodedId);
    expect(quoteJson.quotes.standard.subtotal).toBe(100);
    expect(quoteJson.quotes.standard.shipping).toBe(12);
    expect(quoteJson.quotes.standard.total).toBe(112);

    const replayPrepareRes = await handleMerchantRequest(
      new Request("https://pugpep.com/api/prism/merchant", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-prism-merchant-secret": MERCHANT_SECRET,
        },
        body: JSON.stringify({
          prismOperation: "prepare",
          prismOrderId: ORDER_ID,
          expectedAmountMinor: 11200,
          cart: {
            customer_name: "Guest Lab",
            customer_email: "guest@example.com",
            address: "100 Science Way",
            city: "Austin",
            state: "TX",
            zip: "78701",
            country: "US",
            shipping_method: "standard",
            items: [{ id: OPTION_ID, qty: 2 }],
            consent: { age_ok: true, research_use_ok: true, terms_ok: true },
          },
        }),
      }),
      { admin: client },
    );
    expect(replayPrepareRes.status).toBe(200);
    expect(await replayPrepareRes.json()).toEqual({
      prepared: true,
      orderId: ORDER_ID,
      orderNumber: "PUG-123456",
      total: 112,
      alreadyPrepared: true,
    });

    const settleRes = await handleMerchantRequest(
      new Request("https://pugpep.com/api/prism/merchant", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-prism-merchant-secret": MERCHANT_SECRET,
        },
        body: JSON.stringify({
          prismOperation: "settle",
          orderId: ORDER_ID,
          amountMinor: 11200,
          currency: "usd",
          paymentId: "pi_test123456",
          status: "succeeded",
        }),
      }),
      { admin: client },
    );
    expect(settleRes.status).toBe(200);
    expect(await settleRes.json()).toEqual({
      ok: true,
      orderId: ORDER_ID,
      orderNumber: "PUG-123456",
      paymentId: "pi_test123456",
    });
    expect(rpcCalls.some((c) => c.name === "mark_order_paid" && c.args.target_order_id === ORDER_ID)).toBe(true);

    const sendEmailFn = vi.fn(async () => {});
    const sendSmsFn = vi.fn(async () => ({ sid: "SM123" }));
    process.env.EMAILJS_PRIVATE_KEY = "test_emailjs_private_key";
    const notifyRes = await handleMerchantRequest(
      new Request("https://pugpep.com/api/prism/merchant", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-prism-merchant-secret": MERCHANT_SECRET,
        },
        body: JSON.stringify({
          prismOperation: "notify",
          orderId: ORDER_ID,
          paymentId: "pi_test123456",
        }),
      }),
      { admin: client, sendEmailFn, sendSmsFn },
    );
    expect(notifyRes.status).toBe(200);
    expect(await notifyRes.json()).toEqual({ ok: true, emailSent: true, smsSent: true });
    expect(sendEmailFn).toHaveBeenCalledTimes(1);
    expect(sendSmsFn).toHaveBeenCalledTimes(1);
  });

  it("allows POST /api/prism/merchant through proxy.ts as a checkout serviceRoute", async () => {
    vi.resetModules();
    process.env.PRA_SERVICE_ORIGIN = "https://research-access.prismpro.io";
    process.env.PRA_PUBLIC_ORIGIN = "https://pugpep.com";
    process.env.PRA_SITE_ID = "11111111-1111-4111-8111-111111111111";
    process.env.PRA_SITE_SLUG = "pugpep";
    process.env.PRA_SITE_KEY = `pra_k_${"0".repeat(48)}`;
    process.env.PRA_COOKIE_SECRET = "0123456789abcdef0123456789abcdef";
    process.env.PRA_TURNSTILE_SITE_KEY = "1x00000000000000000000AA";
    process.env.PRA_TURNSTILE_SECRET = "1x0000000000000000000000000000000AA";
    process.env.PRA_INGRESS_EVIDENCE_REF = "vercel-trusted-proxy-test";

    const { NextRequest } = await import("next/server");
    const { proxy } = await import("../proxy");
    const req = new NextRequest("https://pugpep.com/api/prism/merchant", {
      method: "POST",
      headers: { "x-real-ip": "203.0.113.10" },
    });
    const res = await proxy(req, {} as never);
    expect(res.status).toBe(200);
  });
});
