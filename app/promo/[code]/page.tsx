"use client";

import {
  useEffect,
} from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";

export default function PromoCapturePage() {
  const params =
    useParams<{
      code: string;
    }>();

  const router =
    useRouter();

  useEffect(() => {
    const rawCode =
      String(
        params?.code || ""
      );

    const normalizedCode =
      decodeURIComponent(
        rawCode
      )
        .trim()
        .toUpperCase();

    if (
      normalizedCode &&
      /^[A-Z0-9_-]{1,64}$/.test(
        normalizedCode
      )
    ) {
      localStorage.setItem(
        "pugpep_pending_promo",
        normalizedCode
      );
    }

    router.replace("/");
  }, [
    params,
    router,
  ]);

  return (
    <main style={page}>
      <section style={card}>
        <p style={eyebrow}>
          PUGPEP PROMO
        </p>

        <h1 style={title}>
          Loading Your Promo
        </h1>

        <p style={message}>
          Your promo code is being saved. You&apos;ll be redirected to the store automatically.
        </p>
      </section>
    </main>
  );
}

const page = {
  minHeight: "100vh",
  padding: 24,
  display: "grid",
  placeItems: "center",
  background:
    "radial-gradient(circle at 12% 0%, rgba(255,47,208,.14), transparent 27%), radial-gradient(circle at 88% 4%, rgba(0,217,255,.14), transparent 30%), #000",
  color: "#ffffff",
};

const card = {
  width: "min(560px, 100%)",
  padding:
    "clamp(24px, 5vw, 38px)",
  textAlign: "center" as const,
  border:
    "1px solid rgba(0,217,255,.38)",
  borderRadius: 18,
  background:
    "linear-gradient(145deg, rgba(8,8,12,.98), rgba(15,8,18,.96))",
};

const eyebrow = {
  margin: 0,
  color: "#00d9ff",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: ".14em",
};

const title = {
  margin: "8px 0 10px",
  color: "#ff45d8",
  fontSize:
    "clamp(34px, 7vw, 48px)",
};

const message = {
  margin: 0,
  color: "#bdbdc6",
  lineHeight: 1.65,
};