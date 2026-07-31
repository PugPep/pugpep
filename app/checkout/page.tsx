"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "../cartContext";
import { createClient } from "../../lib/supabaseClient";
import { trackEvent } from "../../lib/trackEvent";

type PromoValidation = {
  valid: boolean;
  source: "general" | "sales_rep" | null;
  code: string | null;
  discount_type?: "percent" | "fixed" | string | null;
  discount_value?: number | null;
  sales_rep_id?: string | null;
  sales_rep_name?: string | null;
  first_order_only?: boolean;
  discount_allowed: boolean;
  message: string;
};

type SupabaseErrorDetails = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
};

function getErrorMessage(
  error: unknown,
  fallback = "An unexpected error occurred."
) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  if (error && typeof error === "object") {
    const databaseError = error as SupabaseErrorDetails;

    const parts = [
      databaseError.message,
      databaseError.details,
      databaseError.hint,
      databaseError.code
        ? `Error code: ${databaseError.code}`
        : null,
    ].filter(
      (value): value is string =>
        typeof value === "string" &&
        value.trim().length > 0
    );

    if (parts.length > 0) {
      return parts.join(" | ");
    }
  }

  return fallback;
}

export default function CheckoutPage() {
  const {
    cart,
    total,
    removeFromCart,
    updateQuantity,
  } = useCart();

  const router = useRouter();

  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [loading, setLoading] =
    useState(false);

  const [promoCode, setPromoCode] =
    useState("");

  const [promoData, setPromoData] =
    useState<PromoValidation | null>(null);

  const [promoDiscount, setPromoDiscount] =
    useState(0);

  const [promoLoading, setPromoLoading] =
    useState(false);

  const [
    hasLifetimeFreeShipping,
    setHasLifetimeFreeShipping,
  ] = useState(false);

  const [rewardPoints, setRewardPoints] =
    useState(0);

  const [pointsToUse, setPointsToUse] =
    useState(0);

  const [customer, setCustomer] = useState({
    organization: "",
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip: "",
  });

  const shipping =
    hasLifetimeFreeShipping || total >= 250
      ? 0
      : 10;

  const rewardDiscount =
    pointsToUse / 100;

  const finalTotal = Math.max(
    0,
    total -
      promoDiscount -
      rewardDiscount +
      shipping
  );

  const hasPreSaleItems = cart.some(
    (item: any) =>
      item.status === "pre-sale"
  );

  function calculatePromoDiscount(
    validation: PromoValidation | null
  ) {
    if (!validation?.valid) {
      return 0;
    }

    if (!validation.discount_allowed) {
      return 0;
    }

    const discountValue = Number(
      validation.discount_value || 0
    );

    if (
      !Number.isFinite(discountValue) ||
      discountValue <= 0
    ) {
      return 0;
    }

    let discount = 0;

    if (
      validation.discount_type ===
      "percent"
    ) {
      discount =
        total * (discountValue / 100);
    }

    if (
      validation.discount_type ===
      "fixed"
    ) {
      discount = discountValue;
    }

    return Math.min(
      Math.max(discount, 0),
      total
    );
  }

  async function validatePromo(
    code: string,
    showAlert = true
  ): Promise<PromoValidation | null> {
    const normalizedCode = code
      .trim()
      .toUpperCase();

    if (!normalizedCode) {
      setPromoData(null);
      setPromoDiscount(0);

      if (showAlert) {
        alert("Enter a promo code.");
      }

      return null;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      throw new Error(
        getErrorMessage(
          userError,
          "Unable to verify your account."
        )
      );
    }

    if (!user) {
      router.push("/login");

      throw new Error(
        "You must log in before applying a promo code."
      );
    }

    const {
      data,
      error,
    } = await supabase.rpc(
      "validate_checkout_promo",
      {
        p_code: normalizedCode,
        p_customer_id: user.id,
      }
    );

    if (error) {
      const detailedMessage =
        getErrorMessage(
          error,
          "The promo code could not be validated."
        );

      console.error(
        "validate_checkout_promo RPC failed:",
        {
          message: error.message || null,
          details: error.details || null,
          hint: error.hint || null,
          code: error.code || null,
        }
      );

      throw new Error(detailedMessage);
    }

    const validation =
      data as PromoValidation | null;

    if (!validation?.valid) {
      setPromoData(null);
      setPromoDiscount(0);

      if (showAlert) {
        alert(
          validation?.message ||
            "Invalid or inactive promo code."
        );
      }

      return null;
    }

    setPromoCode(
      validation.code || normalizedCode
    );

    setPromoData(validation);

    setPromoDiscount(
      calculatePromoDiscount(validation)
    );

    if (showAlert) {
      alert(
        validation.message ||
          "Promo code applied."
      );
    }

    return validation;
  }

  useEffect(() => {
    void trackEvent({
      event_type: "checkout_started",
      page_path: "/checkout",
    });

    async function loadCustomer() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error(
          "Unable to verify customer account:",
          {
            message:
              userError.message || null,
            status:
              userError.status || null,
          }
        );
      }

      if (!user) {
        alert(
          "You must create an account or log in before checkout."
        );

        router.push("/login");
        return;
      }

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("customer_profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error(
          "Unable to load customer profile:",
          {
            message:
              profileError.message ||
              null,
            details:
              profileError.details ||
              null,
            hint:
              profileError.hint ||
              null,
            code:
              profileError.code ||
              null,
          }
        );
      }

      setHasLifetimeFreeShipping(
        Boolean(
          profile?.has_lifetime_free_shipping
        )
      );

      setRewardPoints(
        Math.max(
          0,
          Number(
            profile?.reward_points || 0
          )
        )
      );

      setCustomer((current) => ({
        ...current,
        organization:
          profile?.organization || "",
        name:
          profile?.full_name || "",
        email:
          user.email || "",
        phone:
          profile?.phone || "",
        address:
          profile?.address || "",
        city:
          profile?.city || "",
        state:
          profile?.state || "",
        zip:
          profile?.zip || "",
      }));
    }

    void loadCustomer();
  }, [router, supabase]);

  useEffect(() => {
    setPromoDiscount(
      calculatePromoDiscount(promoData)
    );
  }, [total, promoData]);

  function updateField(
    field: keyof typeof customer,
    value: string
  ) {
    setCustomer((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function applyPromoCode() {
    if (promoLoading) {
      return;
    }

    setPromoLoading(true);

    try {
      await validatePromo(
        promoCode,
        true
      );
    } catch (error: unknown) {
      const message = getErrorMessage(
        error,
        "The promo code could not be validated."
      );

      console.error(
        "Promo validation failed:",
        {
          message,
          rawError: error,
        }
      );

      setPromoData(null);
      setPromoDiscount(0);

      alert(message);
    } finally {
      setPromoLoading(false);
    }
  }

  async function proceedToPayment() {
    if (loading) {
      return;
    }

    if (cart.length === 0) {
      alert("Your cart is empty.");
      return;
    }

    if (
      !customer.organization.trim() ||
      !customer.name.trim() ||
      !customer.email.trim() ||
      !customer.phone.trim() ||
      !customer.address.trim() ||
      !customer.city.trim() ||
      !customer.state.trim() ||
      !customer.zip.trim()
    ) {
      alert(
        "Please fill out all required checkout fields."
      );

      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw new Error(
          getErrorMessage(
            userError,
            "Unable to verify your account."
          )
        );
      }

      if (!user) {
        alert(
          "You must create an account or log in before checkout."
        );

        router.push("/login");
        return;
      }

      let finalPromoData:
        | PromoValidation
        | null = promoData;

      /*
       * Validate the promo again immediately before
       * proceeding to payment.
       */
      if (promoCode.trim()) {
        finalPromoData =
          await validatePromo(
            promoCode,
            false
          );

        if (!finalPromoData) {
          throw new Error(
            "The promo code is no longer valid."
          );
        }
      } else {
        finalPromoData = null;
      }

      const verifiedPromoDiscount =
        calculatePromoDiscount(
          finalPromoData
        );

      const safePointsToUse =
        Math.max(
          0,
          Math.min(
            Math.floor(pointsToUse),
            rewardPoints
          )
        );

      const verifiedRewardDiscount =
        safePointsToUse / 100;

      const verifiedFinalTotal =
        Math.max(
          0,
          total -
            verifiedPromoDiscount -
            verifiedRewardDiscount +
            shipping
        );

      const orderId =
        crypto.randomUUID();

      const orderNumber =
        `PUG-${Date.now()}`;

      const {
        error: profileError,
      } = await supabase
        .from("customer_profiles")
        .update({
          organization:
            customer.organization.trim(),

          full_name:
            customer.name.trim(),

          phone:
            customer.phone.trim(),

          address:
            customer.address.trim(),

          city:
            customer.city.trim(),

          state:
            customer.state
              .trim()
              .toUpperCase(),

          zip:
            customer.zip.trim(),
        })
        .eq("id", user.id);

      if (profileError) {
        throw new Error(
          getErrorMessage(
            profileError,
            "Unable to save your checkout information."
          )
        );
      }

      localStorage.setItem(
        "pugpep_order",
        JSON.stringify({
          id: orderId,

          userId: user.id,

          orderNumber,

          customer: {
            organization:
              customer.organization.trim(),

            name:
              customer.name.trim(),

            email:
              customer.email.trim(),

            phone:
              customer.phone.trim(),

            address:
              customer.address.trim(),

            city:
              customer.city.trim(),

            state:
              customer.state
                .trim()
                .toUpperCase(),

            zip:
              customer.zip.trim(),
          },

          items: cart,

          subtotal: total,

          shipping,

          rewardPointsUsed:
            safePointsToUse,

          rewardDiscount:
            verifiedRewardDiscount,

          promoCode:
            finalPromoData?.code ||
            null,

          promoSource:
            finalPromoData?.source ||
            null,

          promoDiscountAllowed:
            Boolean(
              finalPromoData
                ?.discount_allowed
            ),

          promoDiscountType:
            finalPromoData
              ?.discount_type ||
            null,

          promoDiscountValue:
            Number(
              finalPromoData
                ?.discount_value ||
                0
            ),

          promoDiscount:
            verifiedPromoDiscount,

          totalDiscount:
            verifiedPromoDiscount +
            verifiedRewardDiscount,

          total:
            verifiedFinalTotal,

          hasLifetimeFreeShipping,

          createdAt:
            new Date().toISOString(),

          confirmed: false,
        })
      );

      router.push("/payment");
    } catch (error: unknown) {
      const message = getErrorMessage(
        error,
        "Unable to continue to payment."
      );

      console.error(
        "Proceed to payment error:",
        {
          message,
          rawError: error,
        }
      );

      alert(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={page}>
      <h1 style={{ color: "#ff45d8" }}>
        Checkout
      </h1>

      <div style={freeShippingBanner}>
        🚚 FREE U.S. Shipping on orders
        over $250
      </div>

      <div
        style={{
          color: "#888",
          fontSize: 12,
          marginBottom: 20,
        }}
      >
        By providing your phone number,
        you agree to receive transactional
        SMS messages regarding your order,
        including order confirmations and
        shipping updates. Message and data
        rates may apply.
      </div>

      {hasPreSaleItems && (
        <div style={preSaleBanner}>
          ⚠️ One or more items in your cart
          are currently on pre-sale.
          <br />
          Estimated delivery time may take
          up to 2 weeks.
        </div>
      )}

      <div style={checkoutGrid}>
        <section>
          <div style={promoBox}>
            <h3
              style={{
                color: "#ff45d8",
                marginTop: 0,
              }}
            >
              Promo Code
            </h3>

            <div style={promoRow}>
              <input
                placeholder="Enter promo code"
                value={promoCode}
                disabled={promoLoading}
                onChange={(event) => {
                  setPromoCode(
                    event.target.value
                      .toUpperCase()
                  );

                  setPromoData(null);
                  setPromoDiscount(0);
                }}
                onKeyDown={(event) => {
                  if (
                    event.key ===
                    "Enter"
                  ) {
                    event.preventDefault();
                    void applyPromoCode();
                  }
                }}
                style={{
                  ...inputStyle,
                  flex: 1,
                  marginBottom: 0,
                }}
              />

              <button
                type="button"
                disabled={
                  promoLoading ||
                  !promoCode.trim()
                }
                onClick={() => {
                  void applyPromoCode();
                }}
                style={{
                  ...promoButton,
                  opacity:
                    promoLoading ||
                    !promoCode.trim()
                      ? 0.65
                      : 1,
                  cursor:
                    promoLoading ||
                    !promoCode.trim()
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {promoLoading
                  ? "Applying..."
                  : "Apply"}
              </button>
            </div>

            {promoData && (
              <div
                style={{
                  marginTop: 10,
                }}
              >
                <p
                  style={{
                    color:
                      promoData
                        .discount_allowed
                        ? "#00ff99"
                        : "#ffcc66",
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {promoData.message}
                </p>

                {promoData
                  .discount_allowed && (
                  <p
                    style={{
                      color: "#00ff99",
                      marginBottom: 0,
                    }}
                  >
                    Promo Applied:{" "}
                    {promoData
                      .discount_type ===
                    "percent"
                      ? `${Number(
                          promoData.discount_value ||
                            0
                        )}% OFF`
                      : `$${Number(
                          promoData.discount_value ||
                            0
                        ).toFixed(
                          2
                        )} OFF`}
                  </p>
                )}

                {promoData.source ===
                  "sales_rep" &&
                  promoData
                    .sales_rep_name && (
                    <p
                      style={{
                        color: "#00d9ff",
                        marginBottom: 0,
                      }}
                    >
                      Sales Representative:{" "}
                      {
                        promoData
                          .sales_rep_name
                      }
                    </p>
                  )}
              </div>
            )}
          </div>

          <h2
            style={{
              color: "#00d9ff",
              marginTop: 25,
            }}
          >
            Shipping Information
          </h2>

          <input
            required
            placeholder="Organization / Lab Name"
            value={
              customer.organization
            }
            onChange={(event) =>
              updateField(
                "organization",
                event.target.value
              )
            }
            style={inputStyle}
          />

          <input
            required
            placeholder="Full Name"
            value={customer.name}
            onChange={(event) =>
              updateField(
                "name",
                event.target.value
              )
            }
            style={inputStyle}
          />

          <input
            required
            type="email"
            placeholder="Email"
            value={customer.email}
            onChange={(event) =>
              updateField(
                "email",
                event.target.value
              )
            }
            style={inputStyle}
          />

          <input
            required
            type="tel"
            placeholder="Phone Number"
            value={customer.phone}
            onChange={(event) =>
              updateField(
                "phone",
                event.target.value
              )
            }
            style={inputStyle}
          />

          <input
            required
            placeholder="Shipping Address"
            value={customer.address}
            onChange={(event) =>
              updateField(
                "address",
                event.target.value
              )
            }
            style={inputStyle}
          />

          <input
            required
            placeholder="City"
            value={customer.city}
            onChange={(event) =>
              updateField(
                "city",
                event.target.value
              )
            }
            style={inputStyle}
          />

          <input
            required
            placeholder="State"
            maxLength={2}
            value={customer.state}
            onChange={(event) =>
              updateField(
                "state",
                event.target.value
                  .toUpperCase()
              )
            }
            style={inputStyle}
          />

          <input
            required
            placeholder="ZIP Code"
            value={customer.zip}
            onChange={(event) =>
              updateField(
                "zip",
                event.target.value
              )
            }
            style={inputStyle}
          />

          <p style={requiredText}>
            * All fields are required to
            proceed to payment.
          </p>

          <button
            type="button"
            disabled={
              loading ||
              promoLoading ||
              cart.length === 0
            }
            onClick={() => {
              void proceedToPayment();
            }}
            style={{
              ...buttonStyle,
              opacity:
                loading ||
                promoLoading ||
                cart.length === 0
                  ? 0.7
                  : 1,
              cursor:
                loading ||
                promoLoading ||
                cart.length === 0
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {loading
              ? "Preparing Payment..."
              : "Proceed to Payment"}
          </button>
        </section>

        <section>
          <h2
            style={{
              color: "#00d9ff",
            }}
          >
            Order Summary
          </h2>

          <div style={rewardsBox}>
            <h3
              style={{
                color: "#00ff99",
                marginTop: 0,
              }}
            >
              Reward Points
            </h3>

            <p>
              Available Points:{" "}
              <strong>
                {rewardPoints}
              </strong>
            </p>

            <input
              type="number"
              min="0"
              max={rewardPoints}
              step="1"
              placeholder="Points to redeem"
              value={pointsToUse}
              onChange={(event) => {
                const requestedPoints =
                  Number(
                    event.target.value
                  );

                const safePoints =
                  Math.max(
                    0,
                    Math.min(
                      Number.isFinite(
                        requestedPoints
                      )
                        ? Math.floor(
                            requestedPoints
                          )
                        : 0,
                      rewardPoints
                    )
                  );

                setPointsToUse(
                  safePoints
                );
              }}
              style={inputStyle}
            />

            <p
              style={{
                color: "#00ff99",
              }}
            >
              Reward Discount: $
              {rewardDiscount.toFixed(2)}
            </p>

            <p
              style={{
                color: "#888",
                fontSize: 13,
              }}
            >
              100 points = $1 off
            </p>
          </div>

          {cart.length === 0 ? (
            <p>Your cart is empty.</p>
          ) : (
            <>
              {cart.map(
                (item, index) => (
                  <div
                    key={`${item.slug}-${item.dosage}-${item.purchaseType}-${index}`}
                    style={
                      cartItemStyle
                    }
                  >
                    <Image
                      src={item.image}
                      alt={item.name}
                      width={95}
                      height={95}
                      style={cartImage}
                    />

                    <div>
                      <strong
                        style={{
                          color:
                            "#ff45d8",
                        }}
                      >
                        {item.name}
                      </strong>

                      {item.wasOnSale && (
                        <p
                          style={
                            saleText
                          }
                        >
                          SALE{" "}
                          {Number(
                            item.salePercent ||
                              0
                          )}
                          % OFF — regular $
                          {Number(
                            item.regularPrice ||
                              item.price
                          ).toFixed(2)}
                        </p>
                      )}

                      <p
                        style={{
                          margin:
                            "4px 0",
                          color: "#ccc",
                        }}
                      >
                        {item.dosage} —{" "}
                        {item.purchaseType ===
                        "single"
                          ? "Single Vial"
                          : "Full Kit of 10"}
                      </p>

                      <p
                        style={{
                          margin:
                            "4px 0",
                          color:
                            "#ffffff",
                        }}
                      >
                        $
                        {Number(
                          item.price
                        ).toFixed(2)}{" "}
                        each
                      </p>

                      <div
                        style={qtyRow}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(
                              index,
                              Number(
                                item.quantity
                              ) - 1
                            )
                          }
                          style={
                            qtyButton
                          }
                        >
                          −
                        </button>

                        <span
                          style={{
                            minWidth: 24,
                            textAlign:
                              "center",
                          }}
                        >
                          {item.quantity}
                        </span>

                        <button
                          type="button"
                          onClick={() => {
                            const currentQuantity =
                              Number(
                                item.quantity ||
                                  1
                              );

                            if (
                              item.purchaseType ===
                                "single" &&
                              item.status !==
                                "pre-sale"
                            ) {
                              const maxAvailable =
                                Number(
                                  item.maxAvailable ||
                                    currentQuantity
                                );

                              if (
                                currentQuantity +
                                  1 >
                                maxAvailable
                              ) {
                                alert(
                                  `Only ${maxAvailable} vial(s) currently available.`
                                );

                                return;
                              }
                            }

                            updateQuantity(
                              index,
                              currentQuantity +
                                1
                            );
                          }}
                          style={
                            qtyButton
                          }
                        >
                          +
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            removeFromCart(
                              index
                            )
                          }
                          style={
                            removeButton
                          }
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <strong>
                      $
                      {(
                        Number(
                          item.price
                        ) *
                        Number(
                          item.quantity ||
                            1
                        )
                      ).toFixed(2)}
                    </strong>
                  </div>
                )
              )}

              <h3>
                Subtotal: $
                {total.toFixed(2)}
              </h3>

              {promoDiscount > 0 && (
                <h3
                  style={{
                    color: "#00ff99",
                  }}
                >
                  Promo Discount: -$
                  {promoDiscount.toFixed(
                    2
                  )}
                </h3>
              )}

              {rewardDiscount > 0 && (
                <h3
                  style={{
                    color: "#00ff99",
                  }}
                >
                  Rewards Discount: -$
                  {rewardDiscount.toFixed(
                    2
                  )}
                </h3>
              )}

              <h3>
                Shipping:{" "}
                {shipping === 0 ? (
                  <span
                    style={{
                      color:
                        "#00ff99",
                    }}
                  >
                    FREE{" "}
                    {hasLifetimeFreeShipping
                      ? "(Lifetime)"
                      : ""}
                  </span>
                ) : (
                  `$${shipping.toFixed(
                    2
                  )}`
                )}
              </h3>

              <h2
                style={{
                  color: "#00d9ff",
                }}
              >
                Total: $
                {finalTotal.toFixed(2)}
              </h2>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

const page = {
  padding: 30,
  color: "#fff",
  background: "#000",
  minHeight: "100vh",
};

const checkoutGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 30,
};

const promoBox = {
  marginBottom: 20,
  padding: 16,
  border:
    "1px solid rgba(255,255,255,.18)",
  borderRadius: 12,
  background:
    "rgba(255,255,255,.04)",
};

const promoRow = {
  display: "flex",
  gap: 12,
  alignItems: "stretch",
};

const freeShippingBanner = {
  padding: 15,
  marginBottom: 25,
  border: "1px solid #00d9ff",
  borderRadius: 10,
  background:
    "rgba(0,217,255,0.12)",
  color: "#00d9ff",
  fontWeight: "bold",
  textAlign: "center" as const,
};

const preSaleBanner = {
  padding: 15,
  marginBottom: 25,
  border: "1px solid #ffbf00",
  borderRadius: 10,
  background:
    "rgba(255,191,0,.08)",
  color: "#ffcc66",
  fontWeight: "bold",
  textAlign: "center" as const,
  lineHeight: 1.6,
};

const inputStyle = {
  display: "block",
  width: "100%",
  boxSizing: "border-box" as const,
  padding: 12,
  marginBottom: 12,
  background: "#111",
  color: "#fff",
  border: "1px solid #333",
  borderRadius: 8,
};

const promoButton = {
  padding: "12px 18px",
  background: "#111",
  color: "#00d9ff",
  border: "1px solid #00d9ff",
  borderRadius: 10,
  fontWeight: "bold",
  width: 130,
  flexShrink: 0,
};

const buttonStyle = {
  marginTop: 15,
  padding: "14px 22px",
  width: "100%",
  background:
    "linear-gradient(90deg, #00b7ff, #ff2fd0)",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  fontWeight: "bold",
  fontSize: 18,
};

const rewardsBox = {
  marginBottom: 20,
  padding: 14,
  border:
    "1px solid rgba(255,255,255,.18)",
  borderRadius: 10,
  background:
    "rgba(255,255,255,.04)",
};

const requiredText = {
  color: "#ffcc66",
  fontSize: 14,
  marginBottom: 12,
  textAlign: "center" as const,
  fontWeight: "bold",
};

const saleText = {
  margin: "5px 0",
  color: "#00ff99",
  fontWeight: "bold",
};

const cartItemStyle = {
  display: "grid",
  gridTemplateColumns:
    "95px minmax(160px, 1fr) auto",
  gap: 14,
  padding: 12,
  borderBottom: "1px solid #333",
  alignItems: "center",
};

const cartImage = {
  width: 95,
  height: 95,
  objectFit: "cover" as const,
  borderRadius: 12,
  border:
    "1px solid rgba(255,255,255,.18)",
};

const qtyRow = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  marginTop: 8,
  flexWrap: "wrap" as const,
};

const qtyButton = {
  width: 30,
  height: 30,
  borderRadius: 6,
  border: "1px solid #00d9ff",
  background: "#111",
  color: "#00d9ff",
  cursor: "pointer",
  fontWeight: "bold",
};

const removeButton = {
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid #ff4d4d",
  background: "#220000",
  color: "#ff4d4d",
  cursor: "pointer",
  fontWeight: "bold",
};