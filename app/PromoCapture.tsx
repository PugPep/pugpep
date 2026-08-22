"use client";

import { useEffect } from "react";

export const PUGPEP_SAVED_PROMO_KEY =
  "pugpep_saved_promo_code";

const PROMO_QUERY_KEYS = [
  "promo",
  "promo_code",
  "code",
];

function normalizePromoCode(
  value: string | null
) {
  if (!value) {
    return "";
  }

  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 64);
}

export default function PromoCapture() {
  useEffect(() => {
    const url =
      new URL(
        window.location.href
      );

    let capturedCode = "";

    for (
      const key of PROMO_QUERY_KEYS
    ) {
      const code =
        normalizePromoCode(
          url.searchParams.get(key)
        );

      if (code) {
        capturedCode = code;
        break;
      }
    }

    if (!capturedCode) {
      return;
    }

    window.localStorage.setItem(
      PUGPEP_SAVED_PROMO_KEY,
      capturedCode
    );

    window.dispatchEvent(
      new CustomEvent(
        "pugpep:promo-captured",
        {
          detail: {
            code: capturedCode,
          },
        }
      )
    );

    for (
      const key of PROMO_QUERY_KEYS
    ) {
      url.searchParams.delete(key);
    }

    const cleanedUrl =
      `${url.pathname}${url.search}${url.hash}`;

    window.history.replaceState(
      window.history.state,
      "",
      cleanedUrl
    );
  }, []);

  return null;
}