"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  useRouter,
} from "next/navigation";

import { createClient } from "../../lib/supabaseClient";
import { useCart } from "../cartContext";

type CurrentProduct = {
  name: string;
  slug: string;
  image: string | null;
  is_active: boolean;
};

type CurrentProductOption = {
  id?: string;
  product_slug: string;
  dosage: string;
  purchase_type: string;
  price: number;
  status: string;
  cost: number | null;
};

type CurrentInventory = {
  quantity: number;
};

type RepresentativeDashboardResult = {
  rep?: {
    id?: string;
    user_id?: string;
    display_name?: string;
    commission_percent?: number;
    commission_rate?: number;
    is_active?: boolean;
  };
};

type AccountProfile = {
  full_name?: string | null;
  organization?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;

  vip_tier?: string | null;
  lifetime_spend?: number | null;
  reward_points?: number | null;
  has_lifetime_free_shipping?: boolean | null;
  is_hero_account?: boolean | null;
  hero_discount_percent?: number | null;
};

type DeliveryForm = {
  full_name: string;
  organization: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
};

type AccountOrder = {
  id: string;
  order_number: string;
  total: number | null;
  status: string | null;
  shipping_status: string | null;
  tracking_number: string | null;
  created_at: string | null;
  shipping_method_label?: string | null;
};

function money(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Date unavailable";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );
}

function getTierTheme(tier: string) {
  const normalized = tier.trim().toLowerCase();

  const themes: Record<
    string,
    {
      color: string;
      border: string;
      glow: string;
      background: string;
    }
  > = {
    stone: {
      color: "#b8bcc4",
      border: "#b8bcc4",
      glow: "rgba(184,188,196,.4)",
      background:
        "linear-gradient(135deg, rgba(184,188,196,.14), rgba(0,217,255,.07))",
    },
    iron: {
      color: "#8f9aa8",
      border: "#8f9aa8",
      glow: "rgba(143,154,168,.46)",
      background:
        "linear-gradient(135deg, rgba(143,154,168,.18), rgba(0,217,255,.07))",
    },
    bronze: {
      color: "#cd7f32",
      border: "#cd7f32",
      glow: "rgba(205,127,50,.5)",
      background:
        "linear-gradient(135deg, rgba(205,127,50,.20), rgba(255,47,208,.08))",
    },
    silver: {
      color: "#d8dde6",
      border: "#d8dde6",
      glow: "rgba(216,221,230,.52)",
      background:
        "linear-gradient(135deg, rgba(216,221,230,.18), rgba(0,217,255,.09))",
    },
    gold: {
      color: "#ffd700",
      border: "#ffd700",
      glow: "rgba(255,215,0,.55)",
      background:
        "linear-gradient(135deg, rgba(255,215,0,.22), rgba(255,47,208,.09))",
    },
    platinum: {
      color: "#e5e4e2",
      border: "#e5e4e2",
      glow: "rgba(229,228,226,.58)",
      background:
        "linear-gradient(135deg, rgba(229,228,226,.20), rgba(0,217,255,.10))",
    },
    emerald: {
      color: "#00ff99",
      border: "#00ff99",
      glow: "rgba(0,255,153,.56)",
      background:
        "linear-gradient(135deg, rgba(0,255,153,.20), rgba(0,217,255,.10))",
    },
    sapphire: {
      color: "#2f80ff",
      border: "#2f80ff",
      glow: "rgba(47,128,255,.58)",
      background:
        "linear-gradient(135deg, rgba(47,128,255,.22), rgba(255,47,208,.09))",
    },
    ruby: {
      color: "#ff3b5c",
      border: "#ff3b5c",
      glow: "rgba(255,59,92,.58)",
      background:
        "linear-gradient(135deg, rgba(255,59,92,.22), rgba(255,47,208,.10))",
    },
    diamond: {
      color: "#7df9ff",
      border: "#7df9ff",
      glow: "rgba(125,249,255,.65)",
      background:
        "linear-gradient(135deg, rgba(125,249,255,.22), rgba(255,47,208,.12))",
    },
  };

  return (
    themes[normalized] || {
      color: "#ff45d8",
      border: "#ff45d8",
      glow: "rgba(255,69,216,.52)",
      background:
        "linear-gradient(135deg, rgba(255,69,216,.16), rgba(0,217,255,.10))",
    }
  );
}

function getTierThresholds() {
  return [
    { name: "Stone", amount: 0 },
    { name: "Iron", amount: 250 },
    { name: "Bronze", amount: 500 },
    { name: "Silver", amount: 1000 },
    { name: "Gold", amount: 2500 },
    { name: "Platinum", amount: 5000 },
    { name: "Emerald", amount: 10000 },
    { name: "Sapphire", amount: 20000 },
    { name: "Ruby", amount: 35000 },
    { name: "Diamond", amount: 50000 },
  ];
}

function getTierProgress(
  currentTier: string,
  lifetimeSpend: number
) {
  const tiers = getTierThresholds();

  const index = Math.max(
    0,
    tiers.findIndex(
      (tier) =>
        tier.name.toLowerCase() ===
        currentTier.toLowerCase()
    )
  );

  const current =
    tiers[index] || tiers[0];

  const next =
    tiers[index + 1] || null;

  if (!next) {
    return {
      percent: 100,
      remaining: 0,
      nextTier: "Top Tier",
    };
  }

  const span =
    next.amount - current.amount;

  const progress =
    lifetimeSpend - current.amount;

  const percent =
    span > 0
      ? Math.max(
          0,
          Math.min(
            100,
            (progress / span) * 100
          )
        )
      : 100;

  return {
    percent,
    remaining: Math.max(
      0,
      next.amount - lifetimeSpend
    ),
    nextTier: next.name,
  };
}

export default function AccountPage() {
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
          console.error(
            "Representative dashboard check failed:",
            representativeResult.error
          );

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
        <header style={header}>
          <div>
            <p style={eyebrow}>
              CUSTOMER DASHBOARD
            </p>

            <h1 style={title}>
              My Lab
            </h1>

            <p style={subtitle}>
              Welcome back{profile?.full_name ? `, ${profile.full_name}` : ""}.
            </p>
          </div>

          <div style={emailBadge}>
            {email}
          </div>
        </header>

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

        <section
          style={{
            ...tierHero,

            borderColor:
              tierTheme.border,

            background:
              tierTheme.background,

            boxShadow:
              `0 0 24px ${tierTheme.glow}`,
          }}
        >
          <div>
            <p
              style={{
                ...eyebrow,
                color:
                  tierTheme.color,
              }}
            >
              LAB STATUS
            </p>

            <h2
              style={{
                ...tierTitle,
                color:
                  tierTheme.color,

                textShadow:
                  `0 0 14px ${tierTheme.glow}`,
              }}
            >
              {tier}
            </h2>

            <p style={tierText}>
              {progress.nextTier ===
              "Top Tier"
                ? "You’ve reached the highest Lab Status."
                : `${money(
                    progress.remaining
                  )} until ${progress.nextTier}`}
            </p>

            <div style={progressTrack}>
              <div
                style={{
                  ...progressFill,

                  width:
                    `${progress.percent}%`,

                  background:
                    tierTheme.color,

                  boxShadow:
                    `0 0 12px ${tierTheme.glow}`,
                }}
              />
            </div>
          </div>

          <div style={statGrid}>
            <StatCard
              label="Lifetime Spend"
              value={money(
                lifetimeSpend
              )}
            />

            <StatCard
              label="PugPoints"
              value={String(
                rewardPoints
              )}
            />

            <StatCard
              label="Delivery"
              value={
                profile?.has_lifetime_free_shipping
                  ? "Lifetime Free"
                  : "Standard Benefits"
              }
            />
          </div>
        </section>

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
              <div style={sectionHeader}>
                <div>
                  <p style={sectionEyebrow}>
                    ACTIVE ORDERS
                  </p>

                  <h2 style={sectionTitle}>
                    Current Activity
                  </h2>
                </div>

                <Link
                  href="/"
                  style={smallButton}
                >
                  Continue Shopping
                </Link>
              </div>

              {activeOrders.length ===
              0 ? (
                <div style={emptyState}>
                  <div style={emptyIcon}>
                    📦
                  </div>

                  <p style={muted}>
                    You don’t have any active orders right now.
                  </p>
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

        <style jsx>{`
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

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={statCard}>
      <span style={statLabel}>
        {label}
      </span>

      <strong style={statValue}>
        {value}
      </strong>
    </div>
  );
}

function OrderCard({
  order,
  reorder,
  reordering,
  disabled,
}: {
  order: AccountOrder;
  reorder: () => void;
  reordering: boolean;
  disabled: boolean;
}) {
  return (
    <article style={orderCard}>
      <div style={orderHeader}>
        <div>
          <p style={orderNumber}>
            {order.order_number}
          </p>

          <span style={orderDate}>
            {formatDate(
              order.created_at
            )}
          </span>
        </div>

        <strong style={orderTotal}>
          {money(
            Number(
              order.total ||
                0
            )
          )}
        </strong>
      </div>

      <div style={badgeRow}>
        <span
          style={getPaymentBadge(
            order.status ||
              "pending"
          )}
        >
          {order.status ===
          "paid"
            ? "PAID"
            : "PENDING PAYMENT"}
        </span>

        <span
          style={getDeliveryBadge(
            order.shipping_status ||
              "not_shipped"
          )}
        >
          {order.shipping_status ===
          "delivered"
            ? "DELIVERED"
            : order.shipping_status ===
              "shipped"
            ? "IN DELIVERY"
            : "PREPARING"}
        </span>
      </div>

      {order.tracking_number && (
        <p style={trackingText}>
          Tracking:{" "}
          {order.tracking_number}
        </p>
      )}

      <button
        type="button"
        onClick={reorder}
        disabled={disabled}
        style={{
          ...reorderButton,
          opacity:
            disabled
              ? 0.65
              : 1,
        }}
      >
        {reordering
          ? "Checking Stock..."
          : "Reorder"}
      </button>
    </article>
  );
}

function getPaymentBadge(
  status: string
) {
  return {
    padding: "6px 10px",
    borderRadius: 999,
    fontWeight: 900,
    fontSize: 11,
    background:
      status === "paid"
        ? "rgba(255,191,0,.12)"
        : "rgba(255,77,77,.12)",
    color:
      status === "paid"
        ? "#ffcc00"
        : "#ff6f6f",
    border:
      status === "paid"
        ? "1px solid #ffcc00"
        : "1px solid #ff6f6f",
  };
}

function getDeliveryBadge(
  status: string
) {
  return {
    padding: "6px 10px",
    borderRadius: 999,
    fontWeight: 900,
    fontSize: 11,
    background:
      status === "delivered"
        ? "rgba(0,255,153,.12)"
        : status === "shipped"
        ? "rgba(0,217,255,.12)"
        : "rgba(255,255,255,.07)",
    color:
      status === "delivered"
        ? "#00ff99"
        : status === "shipped"
        ? "#00d9ff"
        : "#aaaaaa",
    border:
      status === "delivered"
        ? "1px solid #00ff99"
        : status === "shipped"
        ? "1px solid #00d9ff"
        : "1px solid #444",
  };
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

const statCard = {
  minWidth: 0,
  padding: 14,
  display: "grid",
  gap: 5,
  border:
    "1px solid rgba(255,255,255,.15)",
  borderRadius: 12,
  background:
    "rgba(0,0,0,.28)",
};

const statLabel = {
  color: "#9e9e9e",
  fontSize: 11,
  fontWeight: 900,
  textTransform:
    "uppercase" as const,
};

const statValue = {
  color: "#ffffff",
  fontSize:
    "clamp(17px, 3vw, 22px)",
  overflowWrap:
    "anywhere" as const,
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

const orderCard = {
  padding: 15,
  border:
    "1px solid rgba(255,255,255,.12)",
  borderRadius: 13,
  background:
    "rgba(0,0,0,.28)",
};

const orderHeader = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "start",
  gap: 12,
};

const orderNumber = {
  margin: 0,
  color: "#ff45d8",
  fontWeight: 900,
  overflowWrap:
    "anywhere" as const,
};

const orderDate = {
  display: "block",
  marginTop: 4,
  color: "#8f8f8f",
  fontSize: 12,
};

const orderTotal = {
  color: "#00ff99",
  fontSize: 19,
};

const badgeRow = {
  marginTop: 12,
  display: "flex",
  gap: 9,
  flexWrap: "wrap" as const,
};

const trackingText = {
  margin: "11px 0 0",
  color: "#cfcfcf",
  fontSize: 13,
};

const reorderButton = {
  marginTop: 13,
  minHeight: 42,
  padding: "10px 14px",
  border:
    "1px solid #00ff99",
  borderRadius: 9,
  background:
    "rgba(0,255,153,.07)",
  color: "#00ff99",
  fontWeight: 900,
  cursor: "pointer",
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