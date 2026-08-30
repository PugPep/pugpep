"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  useRouter,
} from "next/navigation";

import {
  createClient,
  enforceAuthPersistencePolicy,
} from "../../lib/supabaseClient";
import { useCart } from "../cartContext";
import AccountEligibilityGate from "./components/AccountEligibilityGate";
import {
  OrderCard,
  StatCard,
} from "./components/AccountOrderCard";
import type {
  AccountOrder,
  AccountProfile,
  CurrentInventory,
  CurrentProduct,
  CurrentProductOption,
  DeliveryForm,
  RepresentativeDashboardResult,
} from "./lib/accountTypes";
import {
  getTierProgress,
  getTierTheme,
  money,
} from "./lib/accountUtils";

export default function AccountClient() {
  const router = useRouter();
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const { addToCart } =
    useCart();

  const [loading, setLoading] =
    useState(true);

  const [email, setEmail] =
    useState("");

  const [orders, setOrders] =
    useState<AccountOrder[]>([]);

  const [profile, setProfile] =
    useState<AccountProfile | null>(
      null
    );

  const [isSalesRep, setIsSalesRep] =
    useState(false);

  const [
    userId,
    setUserId,
  ] = useState("");

  const [
    editingDelivery,
    setEditingDelivery,
  ] = useState(false);

  const [
    savingDelivery,
    setSavingDelivery,
  ] = useState(false);

  const [
    deliveryMessage,
    setDeliveryMessage,
  ] = useState("");

  const [
    deliveryForm,
    setDeliveryForm,
  ] = useState<DeliveryForm>({
    full_name: "",
    organization: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip: "",
  });


  const [
    eligibilityRequired,
    setEligibilityRequired,
  ] = useState(false);

  const [
    eligibilityOrganization,
    setEligibilityOrganization,
  ] = useState("");

  const [
    eligibilityAgeConfirmed,
    setEligibilityAgeConfirmed,
  ] = useState(false);

  const [
    eligibilityResearchConfirmed,
    setEligibilityResearchConfirmed,
  ] = useState(false);

  const [
    savingEligibility,
    setSavingEligibility,
  ] = useState(false);

  const [
    eligibilityMessage,
    setEligibilityMessage,
  ] = useState("");

  const [
    reorderingId,
    setReorderingId,
  ] = useState<string | null>(
    null
  );

  const [loadError, setLoadError] =
    useState("");

  const [
    confirmedOrderNumber,
    setConfirmedOrderNumber,
  ] = useState<string | null>(
    null
  );

  const [
    showConfirmedBanner,
    setShowConfirmedBanner,
  ] = useState(false);

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search
      );

    setConfirmedOrderNumber(
      params.get("order")
    );

    setShowConfirmedBanner(
      params.get("confirmed") ===
        "1"
    );
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadAccount() {
      setLoading(true);
      setLoadError("");
      setIsSalesRep(false);

      try {
        await enforceAuthPersistencePolicy(
          supabase
        );

        const {
          data: sessionData,
          error: sessionError,
        } =
          await supabase.auth.getSession();

        if (sessionError) {
          console.error(
            "Session loading error:",
            sessionError
          );
        }

        let session =
          sessionData.session;

        if (!session) {
          await new Promise(
            (resolve) =>
              setTimeout(
                resolve,
                250
              )
          );

          const {
            data:
              retrySessionData,
          } =
            await supabase.auth.getSession();

          session =
            retrySessionData.session;
        }

        if (!session?.user) {
          if (!cancelled) {
            router.replace(
              "/login?redirect=/account"
            );
          }

          return;
        }

        const user =
          session.user;

        setUserId(
          user.id
        );

        localStorage.removeItem(
          "pugpep_password_recovery"
        );

        if (cancelled) {
          return;
        }

        setEmail(
          user.email || ""
        );

        const [
          profileResult,
          representativeResult,
          orderResult,
        ] =
          await Promise.all([
            supabase
              .from(
                "customer_profiles"
              )
              .select("*")
              .eq(
                "id",
                user.id
              )
              .maybeSingle(),

            supabase.rpc(
              "get_my_sales_rep_dashboard"
            ),

            supabase
              .from("orders")
              .select("*")
              .eq(
                "user_id",
                user.id
              )
              .order(
                "created_at",
                {
                  ascending:
                    false,
                }
              ),
          ]);

        if (cancelled) {
          return;
        }

        if (
          profileResult.error
        ) {
          console.error(
            "Profile loading error:",
            profileResult.error
          );
        }

        const loadedProfile =
          (
            profileResult.data ||
            null
          ) as AccountProfile | null;

        setProfile(
          loadedProfile
        );

        const metadata =
          (user.user_metadata || {}) as Record<
            string,
            unknown
          >;

        const metadataOrganization =
          typeof metadata.organization_name === "string"
            ? metadata.organization_name.trim()
            : "";

        const profileOrganization =
          loadedProfile?.organization?.trim() ||
          "";

        const resolvedOrganization =
          metadataOrganization ||
          profileOrganization;

        const hasAgeConfirmation =
          metadata.age_21_confirmed === true;

        const hasResearchConfirmation =
          metadata.research_entity_confirmed === true;

        const needsEligibilityCompletion =
          !hasAgeConfirmation ||
          !hasResearchConfirmation ||
          !resolvedOrganization;

        setEligibilityRequired(
          needsEligibilityCompletion
        );

        setEligibilityOrganization(
          resolvedOrganization
        );

        setEligibilityAgeConfirmed(
          hasAgeConfirmation
        );

        setEligibilityResearchConfirmed(
          hasResearchConfirmation
        );

        setDeliveryForm({
          full_name:
            loadedProfile?.full_name ||
            "",
          organization:
            loadedProfile?.organization ||
            "",
          phone:
            loadedProfile?.phone ||
            "",
          address:
            loadedProfile?.address ||
            "",
          city:
            loadedProfile?.city ||
            "",
          state:
            loadedProfile?.state ||
            "",
          zip:
            loadedProfile?.zip ||
            "",
        });

        if (
          representativeResult.error
        ) {
          const repError =
            representativeResult.error;

          const isExpectedNonRepError =
            repError.code === "P0001" &&
            repError.message ===
              "Active sales-rep account not found.";

          if (!isExpectedNonRepError) {
            console.error(
              "Representative dashboard check failed:",
              repError
            );
          }

          setIsSalesRep(false);
        } else {
          const dashboard =
            representativeResult.data as RepresentativeDashboardResult | null;

          const hasDashboard =
            dashboard !== null &&
            typeof dashboard ===
              "object" &&
            !Array.isArray(
              dashboard
            ) &&
            Object.keys(
              dashboard
            ).length > 0;

          setIsSalesRep(
            hasDashboard
          );
        }

        if (
          orderResult.error
        ) {
          console.error(
            "Orders loading error:",
            orderResult.error
          );
        }

        setOrders(
          (
            orderResult.data ||
            []
          ) as AccountOrder[]
        );
      } catch (error) {
        console.error(
          "Account loading failed:",
          error
        );

        if (!cancelled) {
          setLoadError(
            "We could not load your account right now. Please refresh and try again."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadAccount();

    const {
      data:
        authListener,
    } =
      supabase.auth.onAuthStateChange(
        (
          event,
          session
        ) => {
          if (
            event ===
              "SIGNED_OUT" ||
            !session
          ) {
            router.replace(
              "/login?redirect=/account"
            );
          }
        }
      );

    return () => {
      cancelled = true;

      authListener.subscription.unsubscribe();
    };
  }, [
    router,
    supabase,
  ]);

  async function saveResearchEligibility() {
    if (!userId) {
      setEligibilityMessage(
        "Your account could not be identified. Please refresh and try again."
      );
      return;
    }

    const cleanOrganization =
      eligibilityOrganization.trim();

    if (!cleanOrganization) {
      setEligibilityMessage(
        "Organization / Lab Name is required."
      );
      return;
    }

    if (!eligibilityAgeConfirmed) {
      setEligibilityMessage(
        "You must confirm that you are 21 years of age or older."
      );
      return;
    }

    if (!eligibilityResearchConfirmed) {
      setEligibilityMessage(
        "You must confirm that you are an authorized representative of a qualified research entity."
      );
      return;
    }

    setSavingEligibility(true);
    setEligibilityMessage("");

    try {
      const {
        data: currentUserData,
        error: currentUserError,
      } = await supabase.auth.getUser();

      if (
        currentUserError ||
        !currentUserData.user
      ) {
        throw (
          currentUserError ||
          new Error(
            "Your account session could not be verified."
          )
        );
      }

      const currentMetadata =
        (currentUserData.user.user_metadata ||
          {}) as Record<string, unknown>;

      const attestationTimestamp =
        new Date().toISOString();

      const {
        error: authUpdateError,
      } = await supabase.auth.updateUser({
        data: {
          ...currentMetadata,
          organization_name:
            cleanOrganization,
          age_21_confirmed: true,
          research_entity_confirmed:
            true,
          research_attestation_at:
            attestationTimestamp,
        },
      });

      if (authUpdateError) {
        throw authUpdateError;
      }

      if (profile) {
        const {
          error: profileUpdateError,
        } = await supabase
          .from("customer_profiles")
          .update({
            organization:
              cleanOrganization,
          })
          .eq("id", userId);

        if (profileUpdateError) {
          console.warn(
            "Research eligibility saved, but profile organization sync failed:",
            profileUpdateError
          );
        }

        setProfile(
          (previous) =>
            previous
              ? {
                  ...previous,
                  organization:
                    cleanOrganization,
                }
              : previous
        );

        setDeliveryForm(
          (previous) => ({
            ...previous,
            organization:
              cleanOrganization,
          })
        );
      }

      setEligibilityRequired(false);
      setEligibilityMessage(
        "Research eligibility confirmed."
      );
    } catch (error) {
      console.error(
        "Research eligibility update failed:",
        error
      );

      setEligibilityMessage(
        error instanceof Error
          ? error.message
          : "We could not save your research eligibility. Please try again."
      );
    } finally {
      setSavingEligibility(false);
    }
  }

  function updateDeliveryField(
    field: keyof DeliveryForm,
    value: string
  ) {
    setDeliveryForm(
      (
        previous
      ) => ({
        ...previous,
        [field]:
          value,
      })
    );

    setDeliveryMessage("");
  }

  function cancelDeliveryEdit() {
    setDeliveryForm({
      full_name:
        profile?.full_name ||
        "",
      organization:
        profile?.organization ||
        "",
      phone:
        profile?.phone ||
        "",
      address:
        profile?.address ||
        "",
      city:
        profile?.city ||
        "",
      state:
        profile?.state ||
        "",
      zip:
        profile?.zip ||
        "",
    });

    setDeliveryMessage("");
    setEditingDelivery(false);
  }

  async function saveDeliveryInformation() {
    if (!userId) {
      setDeliveryMessage(
        "Your account could not be identified. Please refresh and try again."
      );
      return;
    }

    if (
      !deliveryForm.full_name.trim() ||
      !deliveryForm.address.trim() ||
      !deliveryForm.city.trim() ||
      !deliveryForm.state.trim() ||
      !deliveryForm.zip.trim()
    ) {
      setDeliveryMessage(
        "Name, address, city, state, and ZIP code are required."
      );
      return;
    }

    setSavingDelivery(true);
    setDeliveryMessage("");

    const cleanedDelivery = {
      full_name:
        deliveryForm.full_name.trim(),
      organization:
        deliveryForm.organization.trim(),
      phone:
        deliveryForm.phone.trim(),
      address:
        deliveryForm.address.trim(),
      city:
        deliveryForm.city.trim(),
      state:
        deliveryForm.state
          .trim()
          .toUpperCase(),
      zip:
        deliveryForm.zip.trim(),
    };

    const {
      data,
      error,
    } =
      await supabase
        .from(
          "customer_profiles"
        )
        .update(
          cleanedDelivery
        )
        .eq(
          "id",
          userId
        )
        .select("*")
        .maybeSingle();

    setSavingDelivery(false);

    if (error) {
      console.error(
        "Delivery information update failed:",
        error
      );

      setDeliveryMessage(
        error.message
      );
      return;
    }

    const updatedProfile =
      (
        data || {
          ...profile,
          ...cleanedDelivery,
        }
      ) as AccountProfile;

    setProfile(
      updatedProfile
    );

    setDeliveryForm({
      full_name:
        updatedProfile.full_name ||
        "",
      organization:
        updatedProfile.organization ||
        "",
      phone:
        updatedProfile.phone ||
        "",
      address:
        updatedProfile.address ||
        "",
      city:
        updatedProfile.city ||
        "",
      state:
        updatedProfile.state ||
        "",
      zip:
        updatedProfile.zip ||
        "",
    });

    setDeliveryMessage(
      "Delivery information saved."
    );

    setEditingDelivery(false);
  }

  async function reorder(
    orderId: string
  ) {
    setReorderingId(
      orderId
    );

    try {
      const {
        data: items,
        error: itemsError,
      } =
        await supabase
          .from("order_items")
          .select("*")
          .eq(
            "order_id",
            orderId
          );

      if (itemsError) {
        alert(
          itemsError.message
        );
        return;
      }

      if (
        !items ||
        items.length === 0
      ) {
        alert(
          "No items were found for this order."
        );
        return;
      }

      let addedItems = 0;

      const skippedItems: string[] =
        [];

      for (
        const item
        of items
      ) {
        const productName =
          String(
            item.product_name ||
              "Previous Order Item"
          );

        const productSlug =
          String(
            item.product_slug ||
              ""
          );

        const dosage =
          String(
            item.dosage ||
              ""
          );

        const purchaseType:
          | "single"
          | "kit" =
          item.purchase_type ===
          "kit"
            ? "kit"
            : "single";

        const requestedQuantity =
          Math.max(
            1,
            Number(
              item.quantity ||
                1
            )
          );

        if (
          !productSlug ||
          !dosage
        ) {
          skippedItems.push(
            `${productName}: missing product details.`
          );
          continue;
        }

        const {
          data:
            productData,
        } =
          await supabase
            .from(
              "products"
            )
            .select(
              "name,slug,image,is_active"
            )
            .eq(
              "slug",
              productSlug
            )
            .eq(
              "is_active",
              true
            )
            .maybeSingle();

        if (!productData) {
          skippedItems.push(
            `${productName} ${dosage}: product is no longer available.`
          );
          continue;
        }

        const product =
          productData as CurrentProduct;

        const {
          data:
            optionData,
        } =
          await supabase
            .from(
              "product_options"
            )
            .select(
              "id,product_slug,dosage,purchase_type,price,status,cost"
            )
            .eq(
              "product_slug",
              productSlug
            )
            .eq(
              "dosage",
              dosage
            )
            .eq(
              "purchase_type",
              purchaseType
            )
            .maybeSingle();

        if (!optionData) {
          skippedItems.push(
            `${productName} ${dosage}: this option no longer exists.`
          );
          continue;
        }

        const option =
          optionData as CurrentProductOption;

        const {
          data:
            inventoryData,
        } =
          await supabase
            .from(
              "inventory"
            )
            .select(
              "quantity"
            )
            .eq(
              "product_slug",
              productSlug
            )
            .eq(
              "dosage",
              dosage
            )
            .eq(
              "purchase_type",
              "single"
            )
            .maybeSingle();

        const inventory =
          inventoryData as CurrentInventory | null;

        const availableSingleUnits =
          Number(
            inventory?.quantity ||
              0
          );

        const optionStatus =
          String(
            option.status ||
              "in stock"
          );

        const isPreSale =
          optionStatus ===
          "pre-sale";

        const isOutOfStock =
          optionStatus ===
          "out of stock";

        let maxAvailable:
          | number
          | undefined;

        if (
          purchaseType ===
          "single"
        ) {
          maxAvailable =
            availableSingleUnits;

          if (
            isOutOfStock ||
            availableSingleUnits <
              requestedQuantity
          ) {
            skippedItems.push(
              `${productName} ${dosage}: only ${availableSingleUnits} currently available.`
            );
            continue;
          }
        } else if (
          !isPreSale
        ) {
          maxAvailable =
            Math.floor(
              availableSingleUnits /
                10
            );

          if (
            isOutOfStock ||
            maxAvailable <
              requestedQuantity
          ) {
            skippedItems.push(
              `${productName} ${dosage} kit: only ${maxAvailable} kit(s) currently available.`
            );
            continue;
          }
        }

        const currentPrice =
          Number(
            option.price ||
              0
          );

        addToCart(
          {
            productOptionId:
              option.id,

            name:
              String(
                product.name ||
                  productName
              ),

            slug:
              productSlug,

            image:
              String(
                product.image ||
                  item.image ||
                  "/pugpep-logo.png"
              ),

            dosage,
            purchaseType,
            price:
              currentPrice,
            regularPrice:
              currentPrice,
            salePrice:
              currentPrice,
            wasOnSale:
              false,
            salePercent:
              0,
            status:
              optionStatus,
            cost:
              Number(
                option.cost ||
                  0
              ),
            maxAvailable,
          },
          requestedQuantity
        );

        addedItems += 1;
      }

      if (
        addedItems === 0
      ) {
        alert(
          `Nothing was added to the cart.\n\n${skippedItems.join(
            "\n"
          )}`
        );
        return;
      }

      if (
        skippedItems.length >
        0
      ) {
        alert(
          `${addedItems} item type(s) were added using current pricing and inventory.\n\nThe following could not be added:\n${skippedItems.join(
            "\n"
          )}`
        );
      }

      router.push(
        "/checkout"
      );
    } finally {
      setReorderingId(
        null
      );
    }
  }

  if (loading) {
    return (
      <main style={page}>
        <div style={centerCard}>
          <div style={loadingRing} />

          <h1 style={title}>
            Loading My Lab
          </h1>

          <p style={muted}>
            Preparing your account...
          </p>
        </div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main style={page}>
        <div style={centerCard}>
          <h1 style={title}>
            My Lab
          </h1>

          <p style={errorText}>
            {loadError}
          </p>

          <button
            type="button"
            onClick={() =>
              window.location.reload()
            }
            style={primaryButton}
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  if (eligibilityRequired) {
    return (
      <AccountEligibilityGate
        organization={eligibilityOrganization}
        ageConfirmed={eligibilityAgeConfirmed}
        researchConfirmed={eligibilityResearchConfirmed}
        saving={savingEligibility}
        message={eligibilityMessage}
        onOrganizationChange={(value) => {
          setEligibilityOrganization(value);
          setEligibilityMessage("");
        }}
        onAgeConfirmedChange={(value) => {
          setEligibilityAgeConfirmed(value);
          setEligibilityMessage("");
        }}
        onResearchConfirmedChange={(value) => {
          setEligibilityResearchConfirmed(value);
          setEligibilityMessage("");
        }}
        onSave={() => {
          void saveResearchEligibility();
        }}
      />
    );
  }

  const confirmedOrder =
    confirmedOrderNumber;

  const confirmed =
    showConfirmedBanner;

  const tier =
    profile?.vip_tier ||
    "Stone";

  const lifetimeSpend =
    Number(
      profile?.lifetime_spend ||
        0
    );

  const rewardPoints =
    Number(
      profile?.reward_points ||
        0
    );

  const tierTheme =
    getTierTheme(
      tier
    );

  const progress =
    getTierProgress(
      tier,
      lifetimeSpend
    );

  const activeOrders =
    orders.filter(
      (order) =>
        order.shipping_status !==
          "delivered" &&
        order.status !==
          "cancelled"
    );

  return (
    <main style={page}>
      <div style={container}>
        <section style={portalHero}>
          <div style={portalHeroTop}>
            <div>
              <p style={portalEyebrow}>
                CUSTOMER PORTAL
              </p>

              <h1 style={portalTitle}>
                My Lab
              </h1>

              <p style={portalWelcome}>
                Welcome back
                {profile?.full_name
                  ? `, ${profile.full_name}`
                  : ""}.
              </p>
            </div>

            <div style={portalIdentity}>
              <div style={portalIdentityPrimary}>
                {profile?.full_name ||
                  "PUGPEP Customer"}
              </div>

              <div style={portalIdentitySecondary}>
                {email}
              </div>

              {profile?.organization && (
                <div style={portalOrganization}>
                  {profile.organization}
                </div>
              )}
            </div>
          </div>

          <div style={portalStatGrid}>
            <div
              style={{
                ...portalStatCard,
                borderColor:
                  tierTheme.border,
                boxShadow:
                  `0 0 22px ${tierTheme.glow}`,
              }}
            >
              <span style={portalStatLabel}>
                LAB STATUS
              </span>

              <strong
                style={{
                  ...portalStatValue,
                  color:
                    tierTheme.color,
                  textShadow:
                    `0 0 12px ${tierTheme.glow}`,
                }}
              >
                {tier}
              </strong>

              <span style={portalStatMeta}>
                {progress.nextTier ===
                "Top Tier"
                  ? "Highest status reached"
                  : `${money(
                      progress.remaining
                    )} until ${progress.nextTier}`}
              </span>
            </div>

            <div style={portalStatCard}>
              <span style={portalStatLabel}>
                PUGPOINTS
              </span>

              <strong style={portalStatValue}>
                {rewardPoints}
              </strong>

              <span style={portalStatMeta}>
                Available account rewards
              </span>
            </div>

            <div style={portalStatCard}>
              <span style={portalStatLabel}>
                LIFETIME SPEND
              </span>

              <strong style={portalStatValue}>
                {money(
                  lifetimeSpend
                )}
              </strong>

              <span style={portalStatMeta}>
                Total recorded purchases
              </span>
            </div>

            <div style={portalStatCard}>
              <span style={portalStatLabel}>
                DELIVERY BENEFIT
              </span>

              <strong style={portalStatValue}>
                {profile?.has_lifetime_free_shipping
                  ? "Lifetime Free"
                  : "Standard"}
              </strong>

              <span style={portalStatMeta}>
                Shipping account status
              </span>
            </div>
          </div>

          <div style={portalProgressArea}>
            <div style={portalProgressHeader}>
              <span>
                Lab Status Progress
              </span>

              <span>
                {progress.nextTier ===
                "Top Tier"
                  ? "Complete"
                  : `${Math.round(
                      progress.percent
                    )}%`}
              </span>
            </div>

            <div style={portalProgressTrack}>
              <div
                style={{
                  ...portalProgressFill,
                  width:
                    `${progress.percent}%`,
                  background:
                    tierTheme.color,
                  boxShadow:
                    `0 0 16px ${tierTheme.glow}`,
                }}
              />
            </div>
          </div>
        </section>

        {confirmed &&
          confirmedOrder && (
          <section style={successBanner}>
            <div style={successIcon}>
              ✓
            </div>

            <div>
              <p style={successEyebrow}>
                ORDER CONFIRMED
              </p>

              <h2 style={successTitle}>
                Your Order Was Submitted
              </h2>

              <p style={successText}>
                Order {confirmedOrder} is now in your history below.
              </p>
            </div>
          </section>
        )}

        {profile?.is_hero_account && (
          <section style={heroBanner}>
            <div>
              <p style={heroEyebrow}>PUGPEP HERO ACCOUNT</p>
              <h2 style={heroTitle}>Thank you for your service.</h2>
              <p style={heroCopy}>
                You served our communities and our country. Now it is our privilege
                to serve you. Your Hero Account automatically receives an additional{" "}
                <strong>
                  {Number(profile.hero_discount_percent || 5)}% Hero Appreciation Discount
                </strong>{" "}
                on eligible orders, including sale pricing and other eligible savings.
              </p>
            </div>

            <div style={heroPercent}>
              +{Number(profile.hero_discount_percent || 5)}%
              <span>APPRECIATION</span>
            </div>
          </section>
        )}

        <div
          className="account-grid"
          style={mainGrid}
        >
          <section style={stack}>
            <div style={card}>
              <div style={activeOrdersHeader}>
                <div>
                  <p style={sectionEyebrow}>
                    ACTIVE ORDERS
                  </p>

                  <h2 style={sectionTitle}>
                    Track Your Current Orders
                  </h2>

                  <p style={activeOrdersSubtext}>
                    Follow payment, preparation, shipping, and delivery progress from one place.
                  </p>
                </div>

                <div style={activeOrderActions}>
                  <div style={activeOrderCount}>
                    {activeOrders.length}
                    <span>
                      ACTIVE
                    </span>
                  </div>

                  <Link
                    href="/"
                    style={smallButton}
                  >
                    Browse Products
                  </Link>
                </div>
              </div>

              {activeOrders.length ===
              0 ? (
                <div style={activeOrdersEmpty}>
                  <div style={activeOrdersEmptyIcon}>
                    📦
                  </div>

                  <div>
                    <strong style={activeOrdersEmptyTitle}>
                      No active shipments
                    </strong>

                    <p style={muted}>
                      Your next confirmed order will appear here with its shipping progress.
                    </p>
                  </div>
                </div>
              ) : (
                <div style={orderGrid}>
                  {activeOrders.map(
                    (order) => (
                      <OrderCard
                        key={
                          order.id
                        }
                        order={
                          order
                        }
                        reordering={
                          reorderingId ===
                          order.id
                        }
                        disabled={
                          reorderingId !==
                          null
                        }
                        reorder={() => {
                          void reorder(
                            order.id
                          );
                        }}
                      />
                    )
                  )}
                </div>
              )}
            </div>

            <div style={card}>
              <p style={sectionEyebrow}>
                ORDER HISTORY
              </p>

              <h2 style={sectionTitle}>
                Previous Orders
              </h2>

              {orders.length ===
              0 ? (
                <p style={muted}>
                  No previous orders found.
                </p>
              ) : (
                <div style={orderGrid}>
                  {orders.map(
                    (order) => (
                      <OrderCard
                        key={
                          order.id
                        }
                        order={
                          order
                        }
                        reordering={
                          reorderingId ===
                          order.id
                        }
                        disabled={
                          reorderingId !==
                          null
                        }
                        reorder={() => {
                          void reorder(
                            order.id
                          );
                        }}
                      />
                    )
                  )}
                </div>
              )}
            </div>
          </section>

          <aside style={stack}>
            <div style={card}>
              <div style={sectionHeader}>
                <div>
                  <p style={sectionEyebrow}>
                    DELIVERY
                  </p>

                  <h2 style={sectionTitle}>
                    Saved Delivery Information
                  </h2>
                </div>

                {!editingDelivery && (
                  <button
                    type="button"
                    onClick={() => {
                      setDeliveryMessage("");
                      setEditingDelivery(true);
                    }}
                    style={editDeliveryButton}
                  >
                    Edit
                  </button>
                )}
              </div>

              {editingDelivery ? (
                <div className="delivery-form-grid" style={deliveryFormGrid}>
                  <label style={deliveryField}>
                    <span style={deliveryLabel}>
                      Full Name
                    </span>

                    <input
                      value={
                        deliveryForm.full_name
                      }
                      onChange={(event) =>
                        updateDeliveryField(
                          "full_name",
                          event.target.value
                        )
                      }
                      style={deliveryInput}
                      autoComplete="name"
                    />
                  </label>

                  <label style={deliveryField}>
                    <span style={deliveryLabel}>
                      Organization
                    </span>

                    <input
                      value={
                        deliveryForm.organization
                      }
                      onChange={(event) =>
                        updateDeliveryField(
                          "organization",
                          event.target.value
                        )
                      }
                      style={deliveryInput}
                      autoComplete="organization"
                    />
                  </label>

                  <label style={deliveryField}>
                    <span style={deliveryLabel}>
                      Phone
                    </span>

                    <input
                      value={
                        deliveryForm.phone
                      }
                      onChange={(event) =>
                        updateDeliveryField(
                          "phone",
                          event.target.value
                        )
                      }
                      style={deliveryInput}
                      autoComplete="tel"
                    />
                  </label>

                  <label
                    style={{
                      ...deliveryField,
                      gridColumn:
                        "1 / -1",
                    }}
                  >
                    <span style={deliveryLabel}>
                      Street Address
                    </span>

                    <input
                      value={
                        deliveryForm.address
                      }
                      onChange={(event) =>
                        updateDeliveryField(
                          "address",
                          event.target.value
                        )
                      }
                      style={deliveryInput}
                      autoComplete="street-address"
                    />
                  </label>

                  <label style={deliveryField}>
                    <span style={deliveryLabel}>
                      City
                    </span>

                    <input
                      value={
                        deliveryForm.city
                      }
                      onChange={(event) =>
                        updateDeliveryField(
                          "city",
                          event.target.value
                        )
                      }
                      style={deliveryInput}
                      autoComplete="address-level2"
                    />
                  </label>

                  <label style={deliveryField}>
                    <span style={deliveryLabel}>
                      State
                    </span>

                    <input
                      value={
                        deliveryForm.state
                      }
                      onChange={(event) =>
                        updateDeliveryField(
                          "state",
                          event.target.value
                        )
                      }
                      style={deliveryInput}
                      maxLength={2}
                      autoComplete="address-level1"
                    />
                  </label>

                  <label style={deliveryField}>
                    <span style={deliveryLabel}>
                      ZIP Code
                    </span>

                    <input
                      value={
                        deliveryForm.zip
                      }
                      onChange={(event) =>
                        updateDeliveryField(
                          "zip",
                          event.target.value
                        )
                      }
                      style={deliveryInput}
                      autoComplete="postal-code"
                    />
                  </label>

                  {deliveryMessage && (
                    <p
                      style={{
                        ...deliveryMessageStyle,
                        color:
                          deliveryMessage ===
                          "Delivery information saved."
                            ? "#00ff99"
                            : "#ff8a8a",
                      }}
                    >
                      {deliveryMessage}
                    </p>
                  )}

                  <div style={deliveryActionRow}>
                    <button
                      type="button"
                      onClick={() => {
                        void saveDeliveryInformation();
                      }}
                      disabled={savingDelivery}
                      style={{
                        ...saveDeliveryButton,
                        opacity:
                          savingDelivery
                            ? 0.65
                            : 1,
                      }}
                    >
                      {savingDelivery
                        ? "Saving..."
                        : "Save Delivery Information"}
                    </button>

                    <button
                      type="button"
                      onClick={cancelDeliveryEdit}
                      disabled={savingDelivery}
                      style={cancelDeliveryButton}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : profile?.full_name ? (
                <>
                  <div style={deliveryDetails}>
                    <strong>
                      {profile.full_name}
                    </strong>

                    {profile.organization && (
                      <span>
                        {profile.organization}
                      </span>
                    )}

                    {profile.phone && (
                      <span>
                        {profile.phone}
                      </span>
                    )}

                    <span>
                      {profile.address}
                    </span>

                    <span>
                      {profile.city},{" "}
                      {profile.state}{" "}
                      {profile.zip}
                    </span>
                  </div>

                  {deliveryMessage && (
                    <p style={deliverySavedMessage}>
                      {deliveryMessage}
                    </p>
                  )}
                </>
              ) : (
                <div style={deliveryEmptyState}>
                  <p style={muted}>
                    Add your delivery information so it is ready for future checkout.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setDeliveryMessage("");
                      setEditingDelivery(true);
                    }}
                    style={editDeliveryButton}
                  >
                    Add Delivery Information
                  </button>
                </div>
              )}
            </div>

            <div style={card}>
              <p style={sectionEyebrow}>
                QUICK ACTIONS
              </p>

              <h2 style={sectionTitle}>
                Useful Links
              </h2>

              <div style={quickGrid}>
                <Link
                  href="/"
                  style={quickButton}
                >
                  Browse Products
                </Link>

                <Link
                  href="/quality"
                  style={quickButton}
                >
                  View COAs
                </Link>

                <Link
                  href="/contact"
                  style={quickButton}
                >
                  Contact Support
                </Link>

                <a
                  href="https://discord.gg/yas8DetFz"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={quickButton}
                >
                  Join Discord
                </a>
              </div>
            </div>

            {isSalesRep && (
              <div style={repCard}>
                <p style={sectionEyebrow}>
                  REPRESENTATIVE
                </p>

                <h2 style={sectionTitle}>
                  Sales Dashboard
                </h2>

                <p style={muted}>
                  View customers, promotional codes, sales history, and commissions.
                </p>

                <Link
                  href="/rep"
                  style={primaryButton}
                >
                  Open Dashboard
                </Link>
              </div>
            )}
          </aside>
        </div>

        <style>{`
          @media (max-width: 900px) {
            .account-grid {
              grid-template-columns:
                minmax(0, 1fr) !important;
            }
          }

          @media (max-width: 620px) {
            .delivery-form-grid {
              grid-template-columns:
                minmax(0, 1fr) !important;
            }
          }
        `}</style>
      </div>
    </main>
  );
}

const page = {
  minHeight: "100vh",
  overflowX: "hidden" as const,
  padding:
    "clamp(16px, 3vw, 32px)",
  background:
    "radial-gradient(circle at 12% 0%, rgba(255,47,208,.15), transparent 27%), radial-gradient(circle at 88% 4%, rgba(0,217,255,.15), transparent 30%), radial-gradient(circle at 50% 100%, rgba(0,255,153,.06), transparent 36%), #000",
  color: "#ffffff",
};

const container = {
  width: "100%",
  maxWidth: 1240,
  margin: "0 auto",
};

const portalHero = {
  marginBottom: 24,
  padding:
    "clamp(20px, 3vw, 28px)",
  border:
    "1px solid rgba(0,217,255,.36)",
  borderRadius: 22,
  background:
    "linear-gradient(135deg, rgba(8,14,24,.88), rgba(18,8,24,.80), rgba(5,20,20,.72))",
  boxShadow:
    "0 0 34px rgba(0,217,255,.09), 0 0 46px rgba(255,47,208,.07)",
};

const portalHeroTop = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "flex-start",
  gap: 20,
  flexWrap: "wrap" as const,
};

const portalEyebrow = {
  margin: 0,
  color: "#00ff99",
  fontSize: 11,
  fontWeight: 1000,
  letterSpacing: ".16em",
};

const portalTitle = {
  margin: "6px 0 0",
  color: "#ffffff",
  fontSize:
    "clamp(36px, 7vw, 54px)",
  lineHeight: 1,
  textShadow:
    "0 0 18px rgba(255,47,208,.24), 0 0 24px rgba(0,217,255,.16)",
};

const portalWelcome = {
  margin: "9px 0 0",
  color: "#c2c6cc",
  fontSize: 15,
};

const portalIdentity = {
  minWidth: 240,
  padding: "14px 16px",
  border:
    "1px solid rgba(255,255,255,.10)",
  borderRadius: 14,
  background:
    "rgba(255,255,255,.035)",
};

const portalIdentityPrimary = {
  color: "#ffffff",
  fontWeight: 900,
  fontSize: 16,
};

const portalIdentitySecondary = {
  marginTop: 4,
  color: "#7df9ff",
  fontSize: 12,
  overflowWrap:
    "anywhere" as const,
};

const portalOrganization = {
  marginTop: 7,
  color: "#ff8ce9",
  fontSize: 12,
  fontWeight: 800,
};

const portalStatGrid = {
  marginTop: 22,
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 12,
};

const portalStatCard = {
  minWidth: 0,
  padding: 15,
  display: "grid",
  gap: 5,
  border:
    "1px solid rgba(255,255,255,.11)",
  borderRadius: 14,
  background:
    "rgba(0,0,0,.20)",
};

const portalStatLabel = {
  color: "#8f969f",
  fontSize: 10,
  fontWeight: 1000,
  letterSpacing: ".11em",
};

const portalStatValue = {
  color: "#ffffff",
  fontSize:
    "clamp(20px, 3vw, 27px)",
  lineHeight: 1.1,
  overflowWrap:
    "anywhere" as const,
};

const portalStatMeta = {
  color: "#747b84",
  fontSize: 10,
  lineHeight: 1.4,
};

const portalProgressArea = {
  marginTop: 18,
};

const portalProgressHeader = {
  marginBottom: 7,
  display: "flex",
  justifyContent:
    "space-between",
  gap: 12,
  color: "#aeb4bb",
  fontSize: 11,
  fontWeight: 800,
};

const portalProgressTrack = {
  height: 8,
  borderRadius: 999,
  background:
    "rgba(255,255,255,.09)",
  overflow: "hidden",
};

const portalProgressFill = {
  height: "100%",
  borderRadius: 999,
};

const activeOrdersHeader = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "flex-start",
  gap: 18,
  flexWrap: "wrap" as const,
};

const activeOrdersSubtext = {
  maxWidth: 600,
  margin: "7px 0 0",
  color: "#8e959d",
  fontSize: 13,
  lineHeight: 1.5,
};

const activeOrderActions = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap" as const,
};

const activeOrderCount = {
  minWidth: 58,
  minHeight: 48,
  padding: "7px 10px",
  display: "grid",
  placeItems: "center",
  border:
    "1px solid rgba(0,255,153,.34)",
  borderRadius: 12,
  background:
    "rgba(0,255,153,.06)",
  color: "#00ff99",
  fontSize: 18,
  fontWeight: 1000,
  lineHeight: 1,
};

const activeOrdersEmpty = {
  marginTop: 16,
  padding: 18,
  display: "flex",
  gap: 14,
  alignItems: "center",
  border:
    "1px dashed rgba(0,217,255,.22)",
  borderRadius: 13,
  background:
    "rgba(0,217,255,.025)",
};

const activeOrdersEmptyIcon = {
  width: 44,
  height: 44,
  display: "grid",
  placeItems: "center",
  borderRadius: 12,
  background:
    "rgba(0,217,255,.08)",
  fontSize: 22,
};

const activeOrdersEmptyTitle = {
  color: "#ffffff",
  fontSize: 14,
};

const header = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 18,
  flexWrap: "wrap" as const,
  marginBottom: 22,
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
    "clamp(34px, 7vw, 52px)",
  textShadow:
    "0 0 16px rgba(255,47,208,.28)",
};

const subtitle = {
  margin: "8px 0 0",
  color: "#b7b7b7",
};

const emailBadge = {
  padding: "10px 14px",
  border:
    "1px solid rgba(0,217,255,.45)",
  borderRadius: 999,
  background:
    "rgba(0,217,255,.07)",
  color: "#7df9ff",
  fontWeight: 800,
  overflowWrap:
    "anywhere" as const,
};

const successBanner = {
  marginBottom: 22,
  padding: "17px 19px",
  display: "grid",
  gridTemplateColumns:
    "46px minmax(0, 1fr)",
  gap: 14,
  alignItems: "center",
  border:
    "1px solid rgba(0,255,153,.5)",
  borderRadius: 15,
  background:
    "linear-gradient(90deg, rgba(0,255,153,.11), rgba(0,217,255,.08))",
  boxShadow:
    "0 0 20px rgba(0,255,153,.10)",
};

const successIcon = {
  width: 42,
  height: 42,
  display: "grid",
  placeItems: "center",
  border:
    "1px solid #00ff99",
  borderRadius: 999,
  background:
    "rgba(0,255,153,.12)",
  color: "#00ff99",
  fontSize: 22,
  fontWeight: 900,
};

const successEyebrow = {
  margin: 0,
  color: "#00ff99",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: ".14em",
};

const successTitle = {
  margin: "4px 0 0",
  color: "#ffffff",
};

const successText = {
  margin: "4px 0 0",
  color: "#b8b8b8",
};

const tierHero = {
  padding:
    "clamp(18px, 3vw, 24px)",
  display: "grid",
  gridTemplateColumns:
    "minmax(240px, .9fr) minmax(0, 1.4fr)",
  gap: 22,
  alignItems: "center",
  border: "1px solid",
  borderRadius: 18,
};

const tierTitle = {
  margin: "6px 0 0",
  fontSize:
    "clamp(30px, 6vw, 46px)",
};

const tierText = {
  margin: "7px 0 0",
  color: "#c3c3c3",
};

const progressTrack = {
  marginTop: 15,
  height: 10,
  borderRadius: 999,
  background:
    "rgba(255,255,255,.10)",
  overflow: "hidden",
};

const progressFill = {
  height: "100%",
  borderRadius: 999,
};

const statGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(3, minmax(0, 1fr))",
  gap: 10,
};

const heroBanner = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 24,
  flexWrap: "wrap" as const,
  marginBottom: 24,
  padding: "24px clamp(20px, 4vw, 34px)",
  border: "1px solid rgba(125,249,255,.42)",
  borderRadius: 20,
  background:
    "linear-gradient(135deg, rgba(0,217,255,.10), rgba(255,45,216,.07), rgba(255,255,255,.025))",
  boxShadow: "0 16px 45px rgba(0,0,0,.28)",
};

const heroEyebrow = {
  margin: "0 0 7px",
  color: "#7df9ff",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: "0.16em",
};

const heroTitle = {
  margin: "0 0 8px",
  color: "#fff",
  fontSize: 27,
};

const heroCopy = {
  maxWidth: 760,
  margin: 0,
  color: "#cfd6dc",
  lineHeight: 1.7,
};

const heroPercent = {
  display: "grid",
  gap: 2,
  minWidth: 130,
  textAlign: "center" as const,
  color: "#7df9ff",
  fontSize: 30,
  fontWeight: 900,
};

const mainGrid = {
  marginTop: 24,
  display: "grid",
  gridTemplateColumns:
    "minmax(0, 1.15fr) minmax(340px, .85fr)",
  gap: 24,
  alignItems: "start",
};

const stack = {
  display: "grid",
  gap: 18,
};

const card = {
  padding:
    "clamp(18px, 3vw, 24px)",
  border:
    "1px solid rgba(0,217,255,.40)",
  borderRadius: 16,
  background:
    "linear-gradient(145deg, rgba(8,8,12,.96), rgba(15,8,18,.94))",
  boxShadow:
    "0 0 18px rgba(0,217,255,.08)",
};

const repCard = {
  ...card,
  border:
    "1px solid rgba(255,47,208,.48)",
};

const sectionHeader = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 14,
  flexWrap: "wrap" as const,
};

const sectionEyebrow = {
  margin: 0,
  color: "#00d9ff",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: ".13em",
};

const sectionTitle = {
  margin: "5px 0 0",
  color: "#7df9ff",
  fontSize:
    "clamp(22px, 4vw, 29px)",
};

const orderGrid = {
  marginTop: 16,
  display: "grid",
  gap: 12,
};

const deliveryDetails = {
  marginTop: 15,
  display: "grid",
  gap: 7,
  color: "#d0d0d0",
  lineHeight: 1.5,
};

const editDeliveryButton = {
  minHeight: 40,
  padding: "9px 13px",
  border:
    "1px solid rgba(255,69,216,.55)",
  borderRadius: 9,
  background:
    "rgba(255,69,216,.07)",
  color: "#ff75df",
  fontWeight: 900,
  cursor: "pointer",
};

const deliveryFormGrid = {
  marginTop: 16,
  display: "grid",
  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",
  gap: 12,
};

const deliveryField = {
  minWidth: 0,
  display: "grid",
  gap: 6,
};

const deliveryLabel = {
  color: "#bcbcc4",
  fontSize: 12,
  fontWeight: 900,
};

const deliveryInput = {
  width: "100%",
  minWidth: 0,
  minHeight: 44,
  boxSizing:
    "border-box" as const,
  padding: "10px 12px",
  border:
    "1px solid rgba(0,217,255,.34)",
  borderRadius: 9,
  background: "#050507",
  color: "#ffffff",
  outline: 0,
};

const deliveryActionRow = {
  gridColumn: "1 / -1",
  display: "flex",
  gap: 10,
  flexWrap: "wrap" as const,
};

const saveDeliveryButton = {
  minHeight: 46,
  padding: "10px 15px",
  border:
    "1px solid #45d97a",
  borderRadius: 9,
  background:
    "linear-gradient(180deg, #2eea6f, #19b857)",
  color: "#ffffff",
  fontWeight: 900,
  cursor: "pointer",
};

const cancelDeliveryButton = {
  minHeight: 46,
  padding: "10px 15px",
  border:
    "1px solid rgba(255,255,255,.20)",
  borderRadius: 9,
  background:
    "rgba(255,255,255,.05)",
  color: "#d0d0d6",
  fontWeight: 900,
  cursor: "pointer",
};

const deliveryMessageStyle = {
  gridColumn: "1 / -1",
  margin: 0,
  lineHeight: 1.5,
  fontWeight: 800,
};

const deliverySavedMessage = {
  margin: "13px 0 0",
  color: "#00ff99",
  fontWeight: 800,
};

const deliveryEmptyState = {
  marginTop: 15,
  display: "grid",
  gap: 12,
};

const quickGrid = {
  marginTop: 16,
  display: "grid",
  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",
  gap: 10,
};

const quickButton = {
  minHeight: 48,
  display: "grid",
  placeItems: "center",
  padding: "11px 13px",
  border:
    "1px solid rgba(0,217,255,.46)",
  borderRadius: 10,
  background:
    "rgba(0,217,255,.06)",
  color: "#7df9ff",
  textDecoration: "none",
  textAlign: "center" as const,
  fontWeight: 800,
};

const primaryButton = {
  minHeight: 52,
  display: "grid",
  placeItems: "center",
  marginTop: 14,
  padding: "12px 17px",
  border:
    "2px solid #45d97a",
  borderRadius: 11,
  background:
    "linear-gradient(180deg, #2eea6f, #19b857)",
  color: "#ffffff",
  textDecoration: "none",
  fontWeight: 900,
  cursor: "pointer",
};

const smallButton = {
  padding: "9px 12px",
  border:
    "1px solid #00d9ff",
  borderRadius: 9,
  background:
    "rgba(0,217,255,.07)",
  color: "#7df9ff",
  textDecoration: "none",
  fontWeight: 800,
};

const emptyState = {
  marginTop: 16,
  padding: 23,
  display: "grid",
  justifyItems: "center",
  gap: 8,
  textAlign: "center" as const,
  border:
    "1px dashed rgba(0,217,255,.35)",
  borderRadius: 12,
};

const emptyIcon = {
  fontSize: 34,
};

const muted = {
  color: "#999999",
  lineHeight: 1.6,
};

const errorText = {
  color: "#ff8a8a",
  lineHeight: 1.6,
};

const centerCard = {
  maxWidth: 560,
  margin: "10vh auto 0",
  padding: 32,
  display: "grid",
  justifyItems: "center",
  gap: 12,
  textAlign: "center" as const,
  border:
    "1px solid rgba(0,217,255,.38)",
  borderRadius: 17,
  background:
    "rgba(8,8,12,.92)",
};

const loadingRing = {
  width: 46,
  height: 46,
  border:
    "4px solid rgba(0,217,255,.18)",
  borderTopColor:
    "#ff45d8",
  borderRadius: 999,
};