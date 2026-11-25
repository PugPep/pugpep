"use client";

import { useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PendingOrder } from "../../lib/payment/types";
import {
  PRISM_SDK_PATH_RE,
  buildPugPepHostFields,
  createMountHandoffTransport,
  preparePugPepCardBootstrap,
  resetPreparedPugPepCardBootstrap,
  type PrismClientConfig,
  type PrismOrderReceipt,
  type PrismQuoteData,
  type PrismSdkState,
} from "../../lib/prism-checkout-transport";

export {
  PRISM_SDK_PATH_RE,
  type PrismClientConfig,
  type PrismOrderReceipt,
  type PrismQuoteData,
  type PrismSdkState,
};

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
    let mount: ReturnType<
      Awaited<ReturnType<typeof preparePugPepCardBootstrap>>["sdk"]["mountPrismCheckout"]
    > | null = null;

    const getToken = async () => {
      const { data } = await latestRef.current.supabase.auth.getSession();
      return data.session?.access_token ?? null;
    };

    const boot = async () => {
      onErrorChange(null);
      const prepared = await preparePugPepCardBootstrap({
        config,
        order: latestRef.current.order,
        getToken,
        termsAccepted: latestRef.current.termsAccepted,
      });
      if (signal.aborted || !mountRef.current) return;

      if (
        !prepared.alreadyPending &&
        prepared.initialQuote &&
        typeof prepared.initialQuote === "object"
      ) {
        latestRef.current.onQuoteChange(prepared.initialQuote as PrismQuoteData);
      }

      const mountTransport = createMountHandoffTransport({
        rawApi: prepared.rawApi,
        initialBoot: prepared.boot,
        initialStatus: prepared.saved,
        initialCart: prepared.initialCart,
        initialQuote: prepared.initialQuote,
        editable: !prepared.alreadyPending,
      });

      mount = prepared.sdk.mountPrismCheckout(mountRef.current, {
        apiBase: config.apiBase,
        appearance: "dark",
        transport: mountTransport,
        auth: { getToken },
        hostForm: {
          readFields: () =>
            buildPugPepHostFields(
              latestRef.current.order,
              latestRef.current.termsAccepted,
            ),
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
            resetPreparedPugPepCardBootstrap();
            if (!signal.aborted) latestRef.current.onComplete(receipt);
          },
        },
      });

      onRegisterSubmit(async () => {
        if (!mount) throw new Error("The secure card form is still loading.");
        if (!latestRef.current.termsAccepted) {
          throw new Error(
            "Please confirm the Research Use Only agreement before paying.",
          );
        }
        latestRef.current.onErrorChange(null);
        resetPreparedPugPepCardBootstrap();
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
          Complete your payment below, then select{" "}
          <strong style={{ color: "#ffffff" }}>Pay with Card</strong> in Order Review to
          submit your order.
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
          I reaffirm that I am 21+ years of age, acquiring PugPep materials solely for
          lawful in-vitro laboratory research use, and accept the PugPep{" "}
          <a
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#7df9ff" }}
          >
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
