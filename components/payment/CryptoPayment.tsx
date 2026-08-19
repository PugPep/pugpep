"use client";

import { useState } from "react";

import { getErrorMessage } from "../../lib/payment/utils";

import {
  contactButton,
  cryptoBanner,
  cryptoWrap,
  paymentMessage,
} from "./paymentTheme";

export function CryptoPayment({
  orderNumber,
  total,
}: {
  orderNumber: string;
  total: number;
}) {
  const [loading, setLoading] =
    useState(false);

  async function startAurpayPayment() {
    setLoading(true);

    try {
      const response =
        await fetch(
          "/api/aurpay/create-payment",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                orderNumber,
                total,
              }),
          }
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        result.error
      ) {
        throw new Error(
          result.error ||
            "Payment generation failed."
        );
      }

      const checkoutUrl =
        result.data?.pay_url ||
        result.pay_url ||
        result.payUrl ||
        result.url;

      if (!checkoutUrl) {
        throw new Error(
          "Unable to find the AURPAY payment link."
        );
      }

      window.open(
        checkoutUrl,
        "_blank",
        "noopener,noreferrer"
      );
    } catch (error: unknown) {
      alert(
        getErrorMessage(
          error,
          "Unable to create AURPAY payment."
        )
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={cryptoWrap}>
      <h2 style={{ color: "#ff45d8" }}>
        Crypto Payment
      </h2>

      <p style={paymentMessage}>
        Open secure AURPAY checkout for
        this order total.
      </p>

      <button
        type="button"
        onClick={() => {
          void startAurpayPayment();
        }}
        disabled={loading}
        style={{
          ...contactButton,
          width: "100%",
          border: "none",
          opacity:
            loading
              ? 0.65
              : 1,
          cursor:
            loading
              ? "not-allowed"
              : "pointer",
        }}
      >
        {loading
          ? "Opening AURPAY..."
          : "Secure Crypto Checkout"}
      </button>

      <img
        src="/crypto-banner.png"
        alt="We Accept Crypto"
        style={cryptoBanner}
      />
    </div>
  );
}