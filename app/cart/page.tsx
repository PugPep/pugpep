"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "../../lib/supabaseClient";
import { useCart } from "../cartContext";

function money(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

export default function CartPage() {
  const router = useRouter();

  const supabase = useMemo(
    () => createClient(),
    []
  );

  const {
    cart,
    total,
    removeFromCart,
    updateQuantity,
  } = useCart();

  const [
    checkingOut,
    setCheckingOut,
  ] = useState(false);

  const subtotalBeforeSales =
    cart.reduce(
      (
        sum,
        item
      ) =>
        sum +
        Number(
          item.regularPrice ||
            item.price ||
            0
        ) *
          Number(
            item.quantity ||
              1
          ),
      0
    );

  const saleSavings =
    Math.max(
      0,
      subtotalBeforeSales -
        total
    );

  const estimatedPoints =
    Math.max(
      0,
      Math.floor(total)
    );

  const hasPresaleItems =
    cart.some(
      (item) =>
        String(
          item.status || ""
        )
          .trim()
          .toLowerCase() ===
        "pre-sale"
    );

  async function proceedToCheckout() {
    if (
      cart.length === 0 ||
      checkingOut
    ) {
      return;
    }

    setCheckingOut(true);

    try {
      const {
        data:
          sessionData,
        error:
          sessionError,
      } =
        await supabase.auth.getSession();

      if (sessionError) {
        console.error(
          "Cart session check failed:",
          sessionError
        );
      }

      const user =
        sessionData.session
          ?.user;

      if (!user) {
        localStorage.setItem(
          "pugpep_redirect_after_login",
          "/checkout"
        );

        router.push(
          "/login?redirect=/checkout"
        );

        return;
      }

      router.push(
        "/checkout"
      );
    } finally {
      setCheckingOut(false);
    }
  }

  function increaseQuantity(
    index: number
  ) {
    const item =
      cart[index];

    if (!item) {
      return;
    }

    const nextQuantity =
      Number(
        item.quantity || 1
      ) + 1;

    const normalizedStatus =
      String(
        item.status || ""
      )
        .trim()
        .toLowerCase();

    if (
      item.purchaseType ===
        "single" &&
      normalizedStatus !==
        "pre-sale" &&
      typeof item.maxAvailable ===
        "number" &&
      nextQuantity >
        item.maxAvailable
    ) {
      alert(
        `Only ${item.maxAvailable} item(s) are currently available.`
      );

      return;
    }

    if (
      item.purchaseType ===
        "kit" &&
      normalizedStatus !==
        "pre-sale" &&
      typeof item.maxAvailable ===
        "number"
    ) {
      const maximumKits =
        Math.floor(
          item.maxAvailable /
            10
        );

      if (
        nextQuantity >
        maximumKits
      ) {
        alert(
          `Only ${maximumKits} kit(s) are currently available.`
        );

        return;
      }
    }

    updateQuantity(
      index,
      nextQuantity
    );
  }

  if (
    cart.length === 0
  ) {
    return (
      <main style={page}>
        <div style={container}>
          <section style={emptyCard}>
            <div style={emptyIcon}>
              🧪
            </div>

            <p style={eyebrow}>
              YOUR CART
            </p>

            <h1 style={title}>
              Your Cart Is Empty
            </h1>

            <p style={emptyText}>
              Return to the laboratory to explore the current catalog.
            </p>

            <Link
              href="/"
              style={primaryLink}
            >
              Return to the Lab
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main style={page}>
      <div style={container}>
        <header style={header}>
          <div>
            <p style={eyebrow}>
              YOUR CART
            </p>

            <h1 style={title}>
              Review Your Order
            </h1>

            <p style={subtitle}>
              Confirm your selections before continuing to checkout.
            </p>
          </div>

          <Link
            href="/"
            style={continueLink}
          >
            Continue Browsing
          </Link>
        </header>

        {hasPresaleItems && (
          <div style={presaleNotice}>
            <strong>
              Pre-sale item included
            </strong>

            <span>
              Some items may require additional fulfillment time.
            </span>
          </div>
        )}

        <div
          className="cart-layout"
          style={layout}
        >
          <section style={itemList}>
            {cart.map(
              (
                item,
                index
              ) => {
                const lineTotal =
                  Number(
                    item.price || 0
                  ) *
                  Number(
                    item.quantity || 1
                  );

                const regularLineTotal =
                  Number(
                    item.regularPrice ||
                      item.price ||
                      0
                  ) *
                  Number(
                    item.quantity || 1
                  );

                const lineSavings =
                  Math.max(
                    0,
                    regularLineTotal -
                      lineTotal
                  );

                return (
                  <article
                    key={`${item.productOptionId || item.slug}-${index}`}
                    style={itemCard}
                  >
                    <Link
                      href={`/products/${item.slug}`}
                      style={imageLink}
                    >
                      <Image
                        src={
                          item.image ||
                          "/pugpep-logo.png"
                        }
                        alt={
                          item.name
                        }
                        width={170}
                        height={170}
                        style={productImage}
                      />
                    </Link>

                    <div style={itemDetails}>
                      <div style={itemTopRow}>
                        <div>
                          <Link
                            href={`/products/${item.slug}`}
                            style={itemName}
                          >
                            {
                              item.name
                            }
                          </Link>

                          <p style={itemMeta}>
                            {
                              item.dosage
                            }{" "}
                            ·{" "}
                            {item.purchaseType ===
                            "single"
                              ? "Single"
                              : "Kit of 10"}
                          </p>
                        </div>

                        {item.wasOnSale &&
                          item.salePercent >
                            0 && (
                          <span style={saleBadge}>
                            {
                              item.salePercent
                            }
                            % OFF
                          </span>
                        )}
                      </div>

                      <div style={priceRow}>
                        <div>
                          {lineSavings >
                            0 && (
                            <span style={regularPrice}>
                              {
                                money(
                                  regularLineTotal
                                )
                              }
                            </span>
                          )}

                          <strong style={linePrice}>
                            {
                              money(
                                lineTotal
                              )
                            }
                          </strong>
                        </div>

                        {lineSavings >
                          0 && (
                          <span style={savingsText}>
                            Save{" "}
                            {
                              money(
                                lineSavings
                              )
                            }
                          </span>
                        )}
                      </div>

                      <div style={controlsRow}>
                        <div style={quantityControl}>
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(
                                index,
                                Number(
                                  item.quantity ||
                                    1
                                ) - 1
                              )
                            }
                            style={quantityButton}
                            aria-label={`Decrease ${item.name} quantity`}
                          >
                            −
                          </button>

                          <span style={quantityValue}>
                            {
                              item.quantity
                            }
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              increaseQuantity(
                                index
                              )
                            }
                            style={quantityButton}
                            aria-label={`Increase ${item.name} quantity`}
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            removeFromCart(
                              index
                            )
                          }
                          style={removeButton}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </article>
                );
              }
            )}
          </section>

          <aside
            className="cart-summary"
            style={summaryColumn}
          >
            <div style={summaryCard}>
              <p style={summaryEyebrow}>
                ORDER SUMMARY
              </p>

              <h2 style={summaryTitle}>
                Cart Total
              </h2>

              <div style={summaryRows}>
                <SummaryRow
                  label="Items"
                  value={money(
                    subtotalBeforeSales
                  )}
                />

                {saleSavings >
                  0 && (
                  <SummaryRow
                    label="Sale Savings"
                    value={`-${money(
                      saleSavings
                    )}`}
                    positive
                  />
                )}

                <SummaryRow
                  label="Estimated PugPoints"
                  value={`+${estimatedPoints}`}
                  positive
                />

                <SummaryRow
                  label="Delivery"
                  value="Calculated at checkout"
                />
              </div>

              <div style={totalRow}>
                <span>
                  Current Total
                </span>

                <strong>
                  {money(total)}
                </strong>
              </div>

              <button
                type="button"
                onClick={() => {
                  void proceedToCheckout();
                }}
                disabled={
                  checkingOut
                }
                style={{
                  ...checkoutButton,
                  opacity:
                    checkingOut
                      ? 0.65
                      : 1,
                  cursor:
                    checkingOut
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {checkingOut
                  ? "Preparing Checkout..."
                  : "Proceed to Checkout →"}
              </button>

              <Link
                href="/"
                style={secondaryLink}
              >
                Continue Browsing
              </Link>

              <div style={trustList}>
                <TrustItem text="Pricing verified again at checkout" />
                <TrustItem text="Standard and Express delivery available" />
                <TrustItem text="Rewards and promo codes apply at checkout" />
              </div>
            </div>
          </aside>
        </div>

        <style jsx>{`
          @media (min-width: 921px) {
            .cart-summary {
              position: sticky;
              top: 18px;
              align-self: start;
            }
          }

          @media (max-width: 920px) {
            .cart-layout {
              grid-template-columns:
                minmax(0, 1fr) !important;
            }
          }

          @media (max-width: 640px) {
            article {
              grid-template-columns:
                minmax(0, 1fr) !important;
            }

            article a:first-child {
              width: 100% !important;
            }
          }
        `}</style>
      </div>
    </main>
  );
}

function SummaryRow({
  label,
  value,
  positive = false,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div style={summaryRow}>
      <span>
        {label}
      </span>

      <strong
        style={{
          color:
            positive
              ? "#00ff99"
              : "#ffffff",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function TrustItem({
  text,
}: {
  text: string;
}) {
  return (
    <div style={trustItem}>
      <span style={trustIcon}>
        ✓
      </span>

      <span>
        {text}
      </span>
    </div>
  );
}

const page = {
  minHeight: "100vh",
  overflowX: "hidden" as const,
  padding:
    "clamp(18px, 4vw, 36px)",
  background:
    "radial-gradient(circle at 12% 0%, rgba(255,47,208,.14), transparent 27%), radial-gradient(circle at 88% 4%, rgba(0,217,255,.14), transparent 30%), #000000",
  color: "#ffffff",
};

const container = {
  width: "100%",
  maxWidth: 1240,
  margin: "0 auto",
};

const header = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 18,
  flexWrap: "wrap" as const,
  marginBottom: 24,
};

const eyebrow = {
  margin: 0,
  color: "#00d9ff",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: ".14em",
};

const title = {
  margin: "6px 0 0",
  color: "#ff45d8",
  fontSize:
    "clamp(36px, 7vw, 54px)",
  letterSpacing: "-.035em",
  textShadow:
    "0 0 16px rgba(255,47,208,.26)",
};

const subtitle = {
  margin: "9px 0 0",
  color: "#b4b4bc",
  lineHeight: 1.6,
};

const continueLink = {
  minHeight: 46,
  padding: "10px 15px",
  display: "grid",
  placeItems: "center",
  border:
    "1px solid rgba(0,217,255,.46)",
  borderRadius: 10,
  background:
    "rgba(0,217,255,.06)",
  color: "#7df9ff",
  textDecoration: "none",
  fontWeight: 900,
};

const presaleNotice = {
  marginBottom: 22,
  padding: "14px 16px",
  display: "grid",
  gap: 4,
  border:
    "1px solid rgba(255,191,0,.58)",
  borderRadius: 12,
  background:
    "rgba(255,191,0,.08)",
  color: "#ffdd99",
};

const layout = {
  display: "grid",
  gridTemplateColumns:
    "minmax(0, 1.15fr) minmax(340px, .85fr)",
  gap: 24,
  alignItems: "start",
};

const itemList = {
  display: "grid",
  gap: 14,
};

const itemCard = {
  padding: 16,
  display: "grid",
  gridTemplateColumns:
    "150px minmax(0, 1fr)",
  gap: 17,
  border:
    "1px solid rgba(0,217,255,.34)",
  borderRadius: 16,
  background:
    "linear-gradient(145deg, rgba(10,10,14,.97), rgba(16,8,17,.95))",
  boxShadow:
    "0 0 18px rgba(0,217,255,.07)",
};

const imageLink = {
  width: 150,
  aspectRatio: "1",
  overflow: "hidden",
  display: "block",
  border:
    "1px solid rgba(255,47,208,.35)",
  borderRadius: 13,
  background: "#08080b",
};

const productImage = {
  width: "100%",
  height: "100%",
  objectFit: "cover" as const,
};

const itemDetails = {
  minWidth: 0,
  display: "grid",
  alignContent: "space-between",
  gap: 14,
};

const itemTopRow = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "start",
  gap: 14,
};

const itemName = {
  color: "#ff75df",
  textDecoration: "none",
  fontSize: 21,
  fontWeight: 900,
  overflowWrap:
    "anywhere" as const,
};

const itemMeta = {
  margin: "7px 0 0",
  color: "#a7a7af",
  fontSize: 14,
};

const saleBadge = {
  flexShrink: 0,
  padding: "6px 9px",
  border:
    "1px solid rgba(0,255,153,.5)",
  borderRadius: 999,
  background:
    "rgba(0,255,153,.08)",
  color: "#00ff99",
  fontSize: 10,
  fontWeight: 900,
};

const priceRow = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap" as const,
};

const regularPrice = {
  display: "block",
  color: "#777",
  fontSize: 13,
  textDecoration: "line-through",
};

const linePrice = {
  color: "#ffffff",
  fontSize: 22,
};

const savingsText = {
  color: "#00ff99",
  fontSize: 13,
  fontWeight: 900,
};

const controlsRow = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap" as const,
};

const quantityControl = {
  display: "flex",
  alignItems: "center",
  gap: 9,
};

const quantityButton = {
  width: 40,
  height: 40,
  border:
    "1px solid #00d9ff",
  borderRadius: 9,
  background:
    "rgba(0,217,255,.06)",
  color: "#7df9ff",
  fontSize: 19,
  fontWeight: 900,
  cursor: "pointer",
};

const quantityValue = {
  minWidth: 30,
  textAlign: "center" as const,
  fontSize: 18,
  fontWeight: 900,
};

const removeButton = {
  minHeight: 40,
  padding: "9px 12px",
  border:
    "1px solid rgba(255,97,97,.54)",
  borderRadius: 9,
  background:
    "rgba(255,97,97,.07)",
  color: "#ff8585",
  fontWeight: 900,
  cursor: "pointer",
};

const summaryColumn = {
  display: "grid",
};

const summaryCard = {
  padding:
    "clamp(18px, 3vw, 24px)",
  border:
    "1px solid rgba(255,47,208,.52)",
  borderRadius: 17,
  background:
    "linear-gradient(145deg, rgba(16,7,18,.96), rgba(5,12,16,.96))",
  boxShadow:
    "0 0 24px rgba(255,47,208,.11)",
};

const summaryEyebrow = {
  margin: 0,
  color: "#00d9ff",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: ".13em",
};

const summaryTitle = {
  margin: "6px 0 0",
  color: "#ffffff",
  fontSize: 28,
};

const summaryRows = {
  marginTop: 14,
};

const summaryRow = {
  minHeight: 46,
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 14,
  borderBottom:
    "1px solid rgba(255,255,255,.08)",
};

const totalRow = {
  minHeight: 72,
  marginTop: 15,
  padding: "0 15px",
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 14,
  border:
    "1px solid rgba(0,255,153,.46)",
  borderRadius: 12,
  background:
    "linear-gradient(90deg, rgba(0,255,153,.10), rgba(0,217,255,.07))",
  color: "#ffffff",
  fontSize:
    "clamp(21px, 4vw, 27px)",
};

const checkoutButton = {
  width: "100%",
  minHeight: 62,
  marginTop: 17,
  padding: "14px 18px",
  border:
    "2px solid #45d97a",
  borderRadius: 12,
  background:
    "linear-gradient(180deg, #2eea6f, #19b857)",
  color: "#ffffff",
  fontSize: 18,
  fontWeight: 900,
  boxShadow:
    "0 0 18px rgba(46,234,111,.23)",
};

const secondaryLink = {
  minHeight: 48,
  marginTop: 10,
  display: "grid",
  placeItems: "center",
  border:
    "1px solid rgba(0,217,255,.44)",
  borderRadius: 10,
  background:
    "rgba(0,217,255,.05)",
  color: "#7df9ff",
  textDecoration: "none",
  fontWeight: 900,
};

const trustList = {
  marginTop: 17,
  display: "grid",
  gap: 9,
};

const trustItem = {
  display: "flex",
  alignItems: "center",
  gap: 9,
  color: "#b8b8c0",
  fontSize: 13,
};

const trustIcon = {
  width: 20,
  height: 20,
  display: "grid",
  placeItems: "center",
  borderRadius: 999,
  background:
    "rgba(0,255,153,.11)",
  color: "#00ff99",
  fontWeight: 900,
};

const emptyCard = {
  maxWidth: 620,
  margin: "10vh auto 0",
  padding:
    "clamp(28px, 6vw, 44px)",
  display: "grid",
  justifyItems: "center",
  gap: 13,
  textAlign: "center" as const,
  border:
    "1px solid rgba(0,217,255,.38)",
  borderRadius: 19,
  background:
    "linear-gradient(145deg, rgba(10,10,14,.96), rgba(16,8,17,.94))",
  boxShadow:
    "0 0 26px rgba(0,217,255,.08)",
};

const emptyIcon = {
  fontSize: 44,
};

const emptyText = {
  margin: 0,
  color: "#a7a7af",
  lineHeight: 1.65,
};

const primaryLink = {
  minHeight: 52,
  marginTop: 5,
  padding: "12px 18px",
  display: "grid",
  placeItems: "center",
  border:
    "1px solid #ff62de",
  borderRadius: 11,
  background:
    "linear-gradient(90deg, #d92eb8, #079dca)",
  color: "#ffffff",
  textDecoration: "none",
  fontWeight: 900,
  boxShadow:
    "0 0 20px rgba(255,47,208,.20)",
};