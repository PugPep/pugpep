"use client";

import { useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PendingOrder } from "../../lib/payment/types";

export type PrismClientConfig = {
  enabled: true;
  apiBase: string;
  moduleUrl: string;
};

export type PrismSdkState = {
  busy: boolean;
  pending: boolean;
  completed: boolean;
  ready: boolean;
};

export type PrismQuoteData = {
  amount_minor?: number;
  subtotal_minor?: number;
  discount_minor?: number;
  shipping_minor?: number;
  tax_minor?: number;
};

export type PrismOrderReceipt = {
  order_number?: string;
  id?: string;
};

export const PRISM_SDK_PATH_RE =
  /^\/prism\/0\.2\.2-candidate\.4(?:-[a-zA-Z0-9.-]+)?\/assets\/js\/checkout\.js$/;

type Transport = {
  bootstrap(): Promise<unknown>;
  post(action: string, fields?: Record<string, unknown>): Promise<Record<string, unknown>>;
};

type CheckoutSdk = {
  createTransport(
    base: string,
    signal: AbortSignal,
    injected?: undefined,
    auth?: { getToken: () => Promise<string | null> },
  ): Transport;
  mountPrismCheckout(
    node: HTMLElement,
    options: {
      apiBase: string;
      appearance: "dark";
      transport: Transport;
      auth?: { getToken: () => Promise<string | null> };
      hostForm: {
        readFields(): Record<string, string>;
        writeFields(fields: Record<string, string>): void;
        validate(): boolean;
        onState(state: PrismSdkState): void;
        onQuote?(quote: PrismQuoteData): void;
        onComplete(order: PrismOrderReceipt): void;
      };
    },
  ): { submit(): Promise<void>; refresh(): Promise<void>; destroy(): void };
};

function splitFullName(name: string): { first: string; last: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return { first: parts[0] || "Customer", last: "" };
  }
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

function buildPugPepHostFields(order: PendingOrder, termsAccepted: boolean): Record<string, string> {
  const { first, last } = splitFullName(order.customer.name || "");
  const state = (order.customer.state || "").trim().toUpperCase();
  const zip = (order.customer.zip || "").trim();
  const promoCode = String(order.pricingInput?.promoCode ?? order.promoCode ?? "")
    .trim()
    .toUpperCase()
    .slice(0, 40);
  const rewardPoints = Math.max(
    0,
    Math.floor(Number(order.pricingInput?.rewardPointsRequested ?? order.rewardPointsUsed ?? 0) || 0),
  );
  const smsFlag = order.smsConsent === true ? "1" : "0";
  const safeOrderNum = String(order.orderNumber || "")
    .replace(/[^A-Za-z0-9_-]/g, "")
    .slice(0, 40);
  const metaCode = `pts=${rewardPoints};sms=${smsFlag};ord=${safeOrderNum}`.slice(0, 120);

  return {
    billing_first_name: first,
    billing_last_name: last,
    billing_company: (order.customer.organization || "").trim(),
    billing_email: (order.customer.email || "").trim(),
    billing_phone: (order.customer.phone || "").trim(),
    billing_address_1: (order.customer.address || "").trim(),
    billing_address_2: "",
    billing_city: (order.customer.city || "").trim(),
    billing_state: state,
    billing_postcode: zip,
    billing_country: (order.pricingInput?.shippingAddress?.countryCode || "US").toUpperCase(),
    ship_to_different_address: "0",
    shipping_first_name: first,
    shipping_last_name: last,
    shipping_company: (order.customer.organization || "").trim(),
    shipping_address_1: (order.customer.address || "").trim(),
    shipping_address_2: "",
    shipping_city: (order.customer.city || "").trim(),
    shipping_state: state,
    shipping_postcode: zip,
    shipping_country: (order.pricingInput?.shippingAddress?.countryCode || "US").toUpperCase(),
    shipping_method: "standard",
    prism_discount_code: promoCode,
    prism_referral_code: metaCode,
    prism_terms_accepted: termsAccepted ? "1" : "0",
  };
}

export function PrismCardPayment({
  config,
  order,
  supabase,
  errorMessage,
  onStateChange,
  onQuoteChange,
  onErrorChange,
  onRegisterSubmit,
  onComplete,
}: {
  config: PrismClientConfig;
  order: PendingOrder;
  supabase: SupabaseClient;
  errorMessage: string | null;
  onStateChange: (state: PrismSdkState) => void;
  onQuoteChange: (quote: PrismQuoteData | null) => void;
  onErrorChange: (message: string | null) => void;
  onRegisterSubmit: (submitFn: (() => Promise<void>) | null) => void;
  onComplete: (receipt: PrismOrderReceipt) => void;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(true);
  const latestRef = useRef({
    order,
    supabase,
    termsAccepted,
    onStateChange,
    onQuoteChange,
    onErrorChange,
    onComplete,
  });
  latestRef.current = {
    order,
    supabase,
    termsAccepted,
    onStateChange,
    onQuoteChange,
    onErrorChange,
    onComplete,
  };

  useEffect(() => {
    if (!PRISM_SDK_PATH_RE.test(config.moduleUrl)) {
      onErrorChange("Secure card checkout configuration could not be verified.");
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;
    let mount: ReturnType<CheckoutSdk["mountPrismCheckout"]> | null = null;

    const boot = async () => {
      onErrorChange(null);
      const sdk = (await import(/* webpackIgnore: true */ config.moduleUrl)) as CheckoutSdk;
      if (signal.aborted || !mountRef.current) return;

      const getToken = async () => {
        const { data } = await latestRef.current.supabase.auth.getSession();
        return data.session?.access_token ?? null;
      };

      const transport = sdk.createTransport(config.apiBase, signal, undefined, { getToken });
      await transport.bootstrap();
      const previous = await transport.post("psc_native_status");
      const alreadyPending =
        !["none", "idle"].includes(String(previous.status || "idle")) &&
        previous.retry_allowed !== true;

      const syncOrder = async () => {
        if (signal.aborted || alreadyPending) return;
        const current = latestRef.current.order;
        const items = current.items
          .filter((item) => Boolean(item.productOptionId))
          .map((item) => {
            const rawGroup =
              "customKitGroupId" in item && typeof item.customKitGroupId === "string"
                ? item.customKitGroupId.trim().toLowerCase()
                : "";
            const productId = rawGroup
              ? `${item.productOptionId!.toLowerCase()}__${rawGroup}`
              : item.productOptionId!.toLowerCase();
            return {
              product_id: productId,
              quantity: Math.max(1, Math.floor(Number(item.quantity || 1))),
            };
          });
        if (!items.length) {
          throw new Error("Your cart has no eligible items for card checkout.");
        }
        const fields = buildPugPepHostFields(current, latestRef.current.termsAccepted);
        await transport.post("psc_native_cart", { items });
        const synced = (await transport.post("psc_sync_wallet", {
          fields: JSON.stringify(fields),
          shipping_method: "standard",
          ship_to_different_address: "0",
        })) as PrismQuoteData;
        if (!signal.aborted && synced && typeof synced === "object") {
          latestRef.current.onQuoteChange(synced);
        }
      };

      await syncOrder();
      if (signal.aborted || !mountRef.current) return;

      mount = sdk.mountPrismCheckout(mountRef.current, {
        apiBase: config.apiBase,
        appearance: "dark",
        transport,
        auth: { getToken },
        hostForm: {
          readFields: () =>
            buildPugPepHostFields(latestRef.current.order, latestRef.current.termsAccepted),
          writeFields: () => {
            // Delivery fields are finalized on /checkout prior to entering /payment.
          },
          validate: () => {
            if (!latestRef.current.termsAccepted) {
              latestRef.current.onErrorChange(
                "Please confirm the Research Use Only agreement before submitting card payment.",
              );
              return false;
            }
            latestRef.current.onErrorChange(null);
            return true;
          },
          onState: (state) => {
            if (!signal.aborted) latestRef.current.onStateChange(state);
          },
          onQuote: (quote) => {
            if (!signal.aborted) latestRef.current.onQuoteChange(quote);
          },
          onComplete: (receipt) => {
            if (!signal.aborted) latestRef.current.onComplete(receipt);
          },
        },
      });

      onRegisterSubmit(async () => {
        if (!mount) throw new Error("The secure card form is still loading.");
        if (!latestRef.current.termsAccepted) {
          throw new Error("Please confirm the Research Use Only agreement before paying.");
        }
        latestRef.current.onErrorChange(null);
        await syncOrder();
        await mount.submit();
      });
    };

    void boot().catch((err: unknown) => {
      if (!signal.aborted) {
        onErrorChange(
          err instanceof Error ? err.message : "Card payment form could not be loaded.",
        );
      }
    });

    return () => {
      controller.abort();
      mount?.destroy();
      onRegisterSubmit(null);
    };
  }, [config.apiBase, config.moduleUrl, order.id]);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div>
        <p
          style={{
            margin: 0,
            color: "#7df9ff",
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: ".12em",
            textTransform: "uppercase",
          }}
        >
          ENCRYPTED CARD CHECKOUT
        </p>
        <h2 style={{ margin: "6px 0 6px", color: "#ffffff", fontSize: 22 }}>
          Pay with Credit or Debit Card
        </h2>
        <p style={{ margin: 0, color: "#c9d2e0", fontSize: 14, lineHeight: 1.5 }}>
          Complete your payment below, then select <strong style={{ color: "#ffffff" }}>Pay with Card</strong>{" "}
          in Order Review to submit your order.
        </p>
      </div>

      {errorMessage && (
        <div
          role="alert"
          style={{
            padding: "11px 14px",
            borderRadius: 10,
            border: "1px solid rgba(255,95,126,.55)",
            background: "rgba(255,95,126,.12)",
            color: "#ffd0da",
            fontSize: 14,
            lineHeight: 1.45,
          }}
        >
          {errorMessage}
        </div>
      )}

      <div
        ref={mountRef}
        aria-label="Secure credit and debit card form"
        style={{
          minHeight: 120,
          padding: 14,
          borderRadius: 12,
          border: "1px solid rgba(125,249,255,.28)",
          background: "#07090d",
        }}
      />

      <label
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          color: "#d4dce8",
          fontSize: 13,
          lineHeight: 1.45,
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={termsAccepted}
          onChange={(e) => {
            setTermsAccepted(e.target.checked);
            if (e.target.checked) onErrorChange(null);
          }}
          style={{ marginTop: 3, accentColor: "#00d9ff" }}
        />
        <span>
          I reaffirm that I am 21+ years of age, acquiring PugPep materials solely for lawful
          in-vitro laboratory research use, and accept the PugPep{" "}
          <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: "#7df9ff" }}>
            Terms &amp; Conditions
          </a>{" "}
          and{" "}
          <a
            href="/research-use-policy"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#7df9ff" }}
          >
            Research Use Only Policy
          </a>
          .
        </span>
      </label>
    </div>
  );
}
