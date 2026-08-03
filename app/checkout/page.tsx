"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useCart } from "../cartContext";
import { createClient } from "../../lib/supabaseClient";
import { trackEvent } from "../../lib/trackEvent";
import { calculatePricing } from "../../lib/pricing/pricingEngine";

import type {
  PricingResult,
  ShippingMethod,
} from "../../lib/pricing/types";

import type {
  CustomerForm,
} from "./checkoutTypes";

import { styles } from "./checkoutTheme";
import { TierBanner } from "./TierBanner";
import { ShippingInformationSection } from "./ShippingInformationSection";
import { ShippingMethodSection } from "./ShippingMethodSection";
import {
  PromoSection,
  RewardsSection,
} from "./SavingsSections";
import {
  OrderBreakdown,
  OrderReview,
} from "./OrderReview";
import { FinalReview } from "./FinalReview";

type CustomerProfile = {
  organization?: string | null;
  full_name?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  reward_points?: number | null;
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
    const databaseError =
      error as SupabaseErrorDetails;

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
    removeFromCart,
    updateQuantity,
  } = useCart();

  const router = useRouter();

  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [userId, setUserId] =
    useState<string | null>(null);

  const [initializing, setInitializing] =
    useState(true);

  const [proceeding, setProceeding] =
    useState(false);

  const [pricingLoading, setPricingLoading] =
    useState(false);

  const [pricingError, setPricingError] =
    useState<string | null>(null);

  const [pricing, setPricing] =
    useState<PricingResult | null>(null);

  const [promoInput, setPromoInput] =
    useState("");

  const [appliedPromoCode, setAppliedPromoCode] =
    useState<string | null>(null);

  const [promoLoading, setPromoLoading] =
    useState(false);

  const [rewardPoints, setRewardPoints] =
    useState(0);

  const [pointsToUse, setPointsToUse] =
    useState(0);

  const [shippingMethod, setShippingMethod] =
    useState<ShippingMethod>("standard");

  const [customer, setCustomer] =
    useState<CustomerForm>({
      organization: "",
      name: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      zip: "",
    });

  const hasPreSaleItems =
    cart.some(
      (item) =>
        item.status === "pre-sale"
    );

  const hasMissingOptionIds =
    cart.some(
      (item) =>
        !item.productOptionId
    );

  const addressReady =
    customer.state.trim().length === 2 &&
    customer.zip.trim().length >= 5;


  const canRequestPricing =
    Boolean(userId) &&
    cart.length > 0 &&
    !hasMissingOptionIds &&
    addressReady;

  const requestPricing =
    useCallback(
      async ({
        promoCode = appliedPromoCode,
        rewardPointsRequested = pointsToUse,
        showErrors = true,
      }: {
        promoCode?: string | null;
        rewardPointsRequested?: number;
        showErrors?: boolean;
      } = {}) => {
        if (
          !userId ||
          cart.length === 0 ||
          hasMissingOptionIds ||
          !addressReady
        ) {
          setPricing(null);
          return null;
        }

        setPricingLoading(true);
        setPricingError(null);

        try {
          const result =
            await calculatePricing({
              supabase,

              customerId: userId,

              items: cart.map(
                (item) => ({
                  productOptionId:
                    item.productOptionId as string,

                  quantity:
                    Number(
                      item.quantity || 1
                    ),
                })
              ),

              shippingAddress: {
                countryCode: "US",

                stateCode:
                  customer.state
                    .trim()
                    .toUpperCase(),

                postalCode:
                  customer.zip.trim(),

                city:
                  customer.city.trim() ||
                  undefined,
              },

              promoCode:
                promoCode?.trim() ||
                null,

              rewardPointsRequested:
                Math.max(
                  0,
                  Math.floor(
                    Number(
                      rewardPointsRequested ||
                        0
                    )
                  )
                ),

              shippingMethod,
            });

          setPricing(result);

          return result;
        } catch (error: unknown) {
          const message =
            getErrorMessage(
              error,
              "Unable to calculate checkout pricing."
            );

          setPricing(null);
          setPricingError(message);

          if (showErrors) {
            alert(message);
          }

          return null;
        } finally {
          setPricingLoading(false);
        }
      },
      [
        addressReady,
        appliedPromoCode,
        cart,
        customer.city,
        customer.state,
        customer.zip,
        hasMissingOptionIds,
        pointsToUse,
        shippingMethod,
        supabase,
        userId,
      ]
    );

  useEffect(() => {
    void trackEvent({
      event_type:
        "checkout_started",

      page_path:
        "/checkout",
    });

    async function loadCustomer() {
      setInitializing(true);

      try {
        const {
          data: { user },
          error: userError,
        } =
          await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          alert(
            "You must create an account or log in before checkout."
          );

          router.push("/login");
          return;
        }

        setUserId(user.id);

        const {
          data,
          error: profileError,
        } = await supabase
          .from("customer_profiles")
          .select(
            [
              "organization",
              "full_name",
              "phone",
              "address",
              "city",
              "state",
              "zip",
              "reward_points",
            ].join(",")
          )
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        const profile =
          (data || {}) as unknown as CustomerProfile;

        setRewardPoints(
          Math.max(
            0,
            Math.floor(
              Number(
                profile.reward_points ||
                  0
              )
            )
          )
        );

        setCustomer({
          organization:
            profile.organization || "",

          name:
            profile.full_name || "",

          email:
            user.email || "",

          phone:
            profile.phone || "",

          address:
            profile.address || "",

          city:
            profile.city || "",

          state:
            (
              profile.state || ""
            ).toUpperCase(),

          zip:
            profile.zip || "",
        });
      } catch (error: unknown) {
        const message =
          getErrorMessage(
            error,
            "Unable to load your checkout information."
          );

        console.error(
          "Checkout initialization failed:",
          error
        );

        alert(message);
      } finally {
        setInitializing(false);
      }
    }

    void loadCustomer();
  }, [router, supabase]);

  useEffect(() => {
    if (!canRequestPricing) {
      setPricing(null);
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          void requestPricing({
            showErrors: false,
          });
        },
        350
      );

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    canRequestPricing,
    requestPricing,
  ]);

  function updateField(
    field: keyof CustomerForm,
    value: string
  ) {
    setCustomer(
      (current) => ({
        ...current,
        [field]: value,
      })
    );
  }

  async function applyPromoCode() {
    if (
      promoLoading ||
      !promoInput.trim()
    ) {
      return;
    }

    setPromoLoading(true);

    try {
      const normalizedCode =
        promoInput
          .trim()
          .toUpperCase();

      const result =
        await requestPricing({
          promoCode:
            normalizedCode,

          showErrors: true,
        });

      if (!result) {
        return;
      }

      const validation =
        result.promo.validation;

      if (!validation?.valid) {
        setAppliedPromoCode(null);

        alert(
          validation?.message ||
            "Invalid or inactive promo code."
        );

        return;
      }

      setAppliedPromoCode(
        validation.code ||
          normalizedCode
      );

      setPromoInput(
        validation.code ||
          normalizedCode
      );

      alert(
        validation.message ||
          "Promo code applied."
      );
    } finally {
      setPromoLoading(false);
    }
  }

  async function removePromoCode() {
    setAppliedPromoCode(null);
    setPromoInput("");

    await requestPricing({
      promoCode: null,
      showErrors: false,
    });
  }

  async function proceedToPayment() {
    if (proceeding) {
      return;
    }

    if (cart.length === 0) {
      alert(
        "Your cart is empty."
      );
      return;
    }

    if (hasMissingOptionIds) {
      alert(
        "One or more cart items were added before the pricing update. Remove those items and add them to the cart again."
      );
      return;
    }

    if (
      !customer.organization.trim() ||
      !customer.name.trim() ||
      !customer.email.trim() ||
      !customer.phone.trim() ||
      !customer.address.trim() ||
      !customer.city.trim() ||
      customer.state.trim().length !== 2 ||
      customer.zip.trim().length < 5
    ) {
      alert(
        "Please fill out all required checkout fields."
      );

      return;
    }

    setProceeding(true);

    try {
      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (
        !user ||
        !userId ||
        user.id !== userId
      ) {
        router.push("/login");

        throw new Error(
          "You must be signed in to the same account used for checkout."
        );
      }

      /*
       * Recalculate immediately before saving the pending order.
       * No totals from the browser display are trusted.
       */
      const finalPricing =
        await requestPricing({
          promoCode:
            appliedPromoCode,

          rewardPointsRequested:
            pointsToUse,

          showErrors: true,
        });

      if (!finalPricing) {
        throw new Error(
          "Checkout pricing could not be verified."
        );
      }

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
        throw profileError;
      }

      const orderId =
        crypto.randomUUID();

      const orderNumber =
        `PUG-${Date.now()}`;

      /*
       * Legacy summary fields remain temporarily so the current
       * payment page can still open this pending order. The complete
       * authoritative pricing result is stored alongside them.
       */
      const pendingOrder = {
        id: orderId,

        userId:
          user.id,

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

        pricingInput: {
          items: cart.map(
            (item) => ({
              productOptionId:
                item.productOptionId,

              quantity:
                Number(
                  item.quantity || 1
                ),
            })
          ),

          promoCode:
            appliedPromoCode,

          rewardPointsRequested:
            finalPricing.rewards
              .pointsUsed,

          shippingMethod:
            finalPricing.shipping
              .shippingMethod,

          shippingAddress: {
            countryCode: "US",

            stateCode:
              customer.state
                .trim()
                .toUpperCase(),

            postalCode:
              customer.zip.trim(),

            city:
              customer.city.trim(),
          },
        },

        pricing:
          finalPricing,

        pricingSnapshot:
          finalPricing.snapshot,

        subtotal:
          finalPricing.accounting
            .regularMerchandiseValue,

        shipping:
          finalPricing.shipping
            .shippingCollected,

        shippingMethod:
          finalPricing.shipping
            .shippingMethod,

        shippingMethodLabel:
          finalPricing.shipping
            .shippingMethodLabel,

        salesTax:
          finalPricing.tax
            .salesTaxAmount,

        rewardPointsUsed:
          finalPricing.rewards
            .pointsUsed,

        rewardDiscount:
          finalPricing.discounts
            .rewardsDiscount,

        promoCode:
          finalPricing.promo
            .appliedPromoCode,

        promoSource:
          finalPricing.promo
            .appliedPromoSource,

        promoDiscountAllowed:
          Boolean(
            finalPricing.promo
              .validation
              ?.discountAllowed
          ),

        promoDiscountType:
          finalPricing.promo
            .validation
            ?.discountType ||
          null,

        promoDiscountValue:
          Number(
            finalPricing.promo
              .validation
              ?.discountValue ||
              0
          ),

        promoDiscount:
          finalPricing.discounts
            .generalPromoDiscount +
          finalPricing.discounts
            .salesRepDiscount,

        totalDiscount:
          finalPricing.discounts
            .totalDiscount,

        total:
          finalPricing.accounting
            .customerTotal,

        hasLifetimeFreeShipping:
          finalPricing.shipping
            .hasLifetimeFreeShipping,

        createdAt:
          new Date().toISOString(),

        confirmed: false,
      };

      localStorage.setItem(
        "pugpep_order",
        JSON.stringify(
          pendingOrder
        )
      );

      router.push("/payment");
    } catch (error: unknown) {
      const message =
        getErrorMessage(
          error,
          "Unable to continue to payment."
        );

      console.error(
        "Proceed to payment error:",
        error
      );

      alert(message);
    } finally {
      setProceeding(false);
    }
  }


  if (initializing) {
    return (
      <main style={styles.page}>
        <div style={styles.content}>
          <h1 style={styles.title}>
            Research Preparation
          </h1>

          <p style={{ color: "#999" }}>
            Loading your laboratory profile...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.content}>
        <header style={styles.header}>
          <div>
            <p style={styles.eyebrow}>
              SECURE RESEARCH CHECKOUT
            </p>

            <h1 style={styles.title}>
              Research Preparation
            </h1>
          </div>

          <div style={styles.freeShipping}>
            🚚 Free Standard Shipping When Eligible
          </div>
        </header>

        <p
          style={{
            color: "#8f8f8f",
            fontSize: 12,
            lineHeight: 1.6,
            marginBottom: 20,
          }}
        >
          By providing your phone number, you agree to receive transactional
          order and shipping messages. Message and data rates may apply.
        </p>

        {hasPreSaleItems && (
          <div style={styles.notice}>
            ⚠️ One or more research items are on pre-sale. Estimated delivery
            may take up to two weeks.
          </div>
        )}

        {hasMissingOptionIds && (
          <div style={styles.error}>
            One or more saved cart items are missing their product option ID.
            Remove those items and add them again before continuing.
          </div>
        )}

        {pricingError && (
          <div style={styles.error}>
            {pricingError}
          </div>
        )}

        <TierBanner pricing={pricing} />

        <div
          className="checkout-balanced-grid"
          style={styles.balancedGrid}
        >
          <section style={styles.column}>
            <ShippingInformationSection
              customer={customer}
              updateField={updateField}
            />

            <ShippingMethodSection
              shippingMethod={shippingMethod}
              setShippingMethod={setShippingMethod}
              pricing={pricing}
            />
          </section>

          <section style={styles.column}>
            <RewardsSection
              rewardPoints={rewardPoints}
              pointsToUse={pointsToUse}
              setPointsToUse={setPointsToUse}
              pricing={pricing}
            />

            <PromoSection
              promoInput={promoInput}
              setPromoInput={setPromoInput}
              appliedPromoCode={appliedPromoCode}
              promoLoading={promoLoading}
              pricingLoading={pricingLoading}
              pricing={pricing}
              applyPromoCode={() => {
                void applyPromoCode();
              }}
              removePromoCode={() => {
                void removePromoCode();
              }}
            />

            <OrderReview
              cart={cart}
              pricing={pricing}
              updateQuantity={updateQuantity}
              removeFromCart={removeFromCart}
              routerToProducts={() =>
                router.push("/")
              }
            />

            <OrderBreakdown pricing={pricing} />
          </section>
        </div>

        <FinalReview
          pricing={pricing}
          proceeding={proceeding}
          pricingLoading={pricingLoading}
          cartIsEmpty={cart.length === 0}
          hasMissingOptionIds={hasMissingOptionIds}
          proceedToPayment={() => {
            void proceedToPayment();
          }}
        />

        <style jsx>{`
          @media (max-width: 900px) {
            .checkout-balanced-grid,
            .final-summary-grid,
            .checkout-status-band {
              grid-template-columns: minmax(0, 1fr) !important;
            }
          }

          @media (max-width: 640px) {
            .checkout-tier-benefits,
            .checkout-shipping-grid,
            .checkout-form-grid {
              grid-template-columns: minmax(0, 1fr) !important;
            }

            .checkout-promo-row {
              grid-template-columns: minmax(0, 1fr) !important;
            }

            .checkout-cart-item {
              grid-template-columns: 76px minmax(0, 1fr) !important;
            }

            .checkout-line-price {
              grid-column: 1 / -1 !important;
              width: 100% !important;
              display: flex !important;
              justify-content: space-between !important;
              padding-top: 10px !important;
              border-top: 1px solid rgba(255,47,208,.24) !important;
            }

            .checkout-final-total {
              width: 100% !important;
              box-sizing: border-box !important;
              text-align: left !important;
            }
          }
        `}</style>
      </div>
    </main>
  );
}