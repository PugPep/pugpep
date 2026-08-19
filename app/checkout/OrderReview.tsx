"use client";

import { useEffect, useMemo, useState } from "react";

import type { CartItem } from "../cartContext";
import { createClient } from "../../lib/supabaseClient";
import type { PricingResult } from "../../lib/pricing/types";
import { money, styles } from "./checkoutTheme";

function CheckoutProductImage({
  slug,
  cartImage,
  name,
}: {
  slug: string;
  cartImage: string;
  name: string;
}) {
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [currentImage, setCurrentImage] =
    useState<string>(
      cartImage || "/pugpep-logo.png"
    );

  const [imageFailed, setImageFailed] =
    useState(false);

  useEffect(() => {
    let active = true;

    async function loadCurrentImage() {
      try {
        const { data, error } =
          await supabase
            .from("products")
            .select("image")
            .eq("slug", slug)
            .maybeSingle();

        if (error) {
          console.warn(
            `Unable to refresh image for ${slug}:`,
            error
          );
          return;
        }

        const liveImage =
          String(
            data?.image || ""
          ).trim();

        if (
          active &&
          liveImage
        ) {
          setCurrentImage(
            liveImage
          );
          setImageFailed(
            false
          );
        }
      } catch (error) {
        console.warn(
          `Unable to refresh image for ${slug}:`,
          error
        );
      }
    }

    void loadCurrentImage();

    return () => {
      active = false;
    };
  }, [slug, supabase]);

  const resolvedImage =
    imageFailed
      ? "/pugpep-logo.png"
      : currentImage ||
        cartImage ||
        "/pugpep-logo.png";

  return (
    <img
      className="checkout-cart-image"
      src={resolvedImage}
      alt={name}
      width={88}
      height={88}
      style={styles.image}
      onError={() => {
        if (
          resolvedImage !==
          "/pugpep-logo.png"
        ) {
          setImageFailed(
            true
          );
        }
      }}
    />
  );
}

export function OrderReview({
  cart,
  pricing,
  updateQuantity,
  removeFromCart,
  routerToProducts,
}: {
  cart: CartItem[];
  pricing: PricingResult | null;
  updateQuantity: (index: number, quantity: number) => void;
  removeFromCart: (index: number) => void;
  routerToProducts: () => void;
}) {
  return (
    <section style={styles.card}>
      <h2 style={styles.sectionTitle}>
        Research Summary
      </h2>

      {cart.length === 0 ? (
        <div
          style={{
            padding: "28px 18px",
            display: "grid",
            justifyItems: "center",
            gap: 10,
            textAlign: "center",
            border: "1px dashed rgba(0,217,255,.46)",
            borderRadius: 14,
          }}
        >
          <div style={{ fontSize: 38 }}>🧪</div>

          <h3 style={{ margin: 0, color: "#7df9ff" }}>
            Nothing Is on the Research Bench
          </h3>

          <p style={{ margin: 0, color: "#aaa" }}>
            Browse the laboratory and select your next project.
          </p>

          <button
            type="button"
            onClick={routerToProducts}
            style={styles.secondaryButton}
          >
            Explore the Laboratory
          </button>
        </div>
      ) : (
        <div style={styles.cartList}>
          {cart.map((item, index) => {
            const pricedLine =
              pricing?.campaign.items.find(
                (line) =>
                  line.productOptionId ===
                  item.productOptionId
              );

            const quantity =
              Math.max(
                1,
                Number(item.quantity || 1)
              );

            /*
             * The cart already knows the product price.
             * Use it while authoritative checkout pricing
             * is still waiting for the shipping address.
             */
            const fallbackUnitPrice =
              Number(
                item.salePrice ??
                item.price ??
                0
              );

            const fallbackRegularUnitPrice =
              Number(
                item.regularPrice ??
                item.price ??
                fallbackUnitPrice
              );

            const fallbackLinePrice =
              fallbackUnitPrice *
              quantity;

            const fallbackRegularLinePrice =
              fallbackRegularUnitPrice *
              quantity;

            const fallbackHasSavings =
              fallbackRegularLinePrice >
              fallbackLinePrice;

            return (
              <article
                key={`${item.productOptionId || item.slug}-${index}`}
                className="checkout-cart-item"
                style={styles.cartItem}
              >
                <CheckoutProductImage
                  slug={item.slug}
                  cartImage={item.image}
                  name={item.name}
                />

                <div
                  style={{
                    minWidth: 0,
                    display: "grid",
                    gap: 5,
                  }}
                >
                  <strong
                    style={{
                      color: "#ff45d8",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {item.name}
                  </strong>

                  <span
                    style={{
                      color: "#bbb",
                      fontSize: 14,
                    }}
                  >
                    {item.dosage} ·{" "}
                    {item.purchaseType === "single"
                      ? "Single"
                      : "Kit of 10"}
                  </span>

                  {pricedLine?.hasCampaign && (
                    <span
                      style={{
                        color: "#00ff99",
                        fontSize: 13,
                        fontWeight: 800,
                      }}
                    >
                      {pricedLine.saleCampaignName}
                    </span>
                  )}

                  {!pricing && (
                    <span
                      style={{
                        color: "#888",
                        fontSize: 11,
                        lineHeight: 1.4,
                      }}
                    >
                      Final savings, shipping, and tax update
                      after required delivery information is entered.
                    </span>
                  )}

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                      marginTop: 6,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(
                          index,
                          Number(item.quantity) - 1
                        )
                      }
                      style={styles.qtyButton}
                    >
                      −
                    </button>

                    <span
                      style={{
                        minWidth: 25,
                        textAlign: "center",
                      }}
                    >
                      {item.quantity}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        const current =
                          Number(
                            item.quantity || 1
                          );

                        if (
                          item.purchaseType === "single" &&
                          item.status !== "pre-sale"
                        ) {
                          const maximum =
                            Number(
                              item.maxAvailable ||
                              current
                            );

                          if (
                            current + 1 >
                            maximum
                          ) {
                            alert(
                              `Only ${maximum} item(s) are currently available.`
                            );
                            return;
                          }
                        }

                        updateQuantity(
                          index,
                          current + 1
                        );
                      }}
                      style={styles.qtyButton}
                    >
                      +
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        removeFromCart(index)
                      }
                      style={styles.removeButton}
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div
                  className="checkout-line-price"
                  style={{
                    display: "grid",
                    justifyItems: "end",
                    gap: 3,
                  }}
                >
                  {pricedLine ? (
                    <>
                      {pricedLine.regularLineValue >
                        pricedLine.campaignLineRevenue && (
                        <span
                          style={{
                            color: "#777",
                            fontSize: 13,
                            textDecoration:
                              "line-through",
                          }}
                        >
                          {money(
                            pricedLine.regularLineValue
                          )}
                        </span>
                      )}

                      <strong>
                        {money(
                          pricedLine.campaignLineRevenue
                        )}
                      </strong>

                      {pricedLine.bundleDiscountAmount >
                        0 && (
                        <span
                          style={{
                            color: "#00ff99",
                            fontSize: 11,
                            fontWeight: 800,
                          }}
                        >
                          Bundle savings included
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      {fallbackHasSavings && (
                        <span
                          style={{
                            color: "#777",
                            fontSize: 13,
                            textDecoration:
                              "line-through",
                          }}
                        >
                          {money(
                            fallbackRegularLinePrice
                          )}
                        </span>
                      )}

                      <strong>
                        {money(
                          fallbackLinePrice
                        )}
                      </strong>

                      <span
                        style={{
                          color: "#888",
                          fontSize: 10,
                          fontWeight: 700,
                          textAlign: "right",
                        }}
                      >
                        PRODUCT PRICE
                      </span>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function OrderBreakdown({
  pricing,
}: {
  pricing: PricingResult | null;
}) {
  if (!pricing) {
    return (
      <div
        style={{
          marginTop: 12,
          padding: "12px 14px",
          borderRadius: 10,
          border:
            "1px solid rgba(0,217,255,.20)",
          background:
            "rgba(0,217,255,.035)",
          color: "#999",
          fontSize: 12,
          lineHeight: 1.55,
        }}
      >
        Complete the required delivery information to
        calculate final discounts, shipping, and tax.
      </div>
    );
  }

  return (
    <details style={styles.details}>
      <summary
        style={{
          color: "#00d9ff",
          fontWeight: 900,
          cursor: "pointer",
        }}
      >
        Order Breakdown
      </summary>

      <div
        style={{
          display: "grid",
          gap: 8,
          marginTop: 15,
        }}
      >
        {pricing.snapshot.steps
          .filter((step) => {
            if (
              step.category === "cost" ||
              step.category ===
                "commission" ||
              step.category === "profit"
            ) {
              return false;
            }

            if (
              !pricing.tax.enabled &&
              step.category === "tax"
            ) {
              return false;
            }

            return true;
          })
          .map((step, index) => (
            <div
              key={`${step.label}-${index}`}
              style={{
                padding: "9px 0",
                borderBottom:
                  "1px solid rgba(255,255,255,.1)",
                color: "#ccc",
                lineHeight: 1.5,
              }}
            >
              {step.message}
            </div>
          ))}
      </div>
    </details>
  );
}