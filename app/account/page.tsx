"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabaseClient";
import { useCart } from "../cartContext";

type CurrentProduct = {
  name: string;
  slug: string;
  image: string | null;
  is_active: boolean;
};

type CurrentProductOption = {
  product_slug: string;
  dosage: string;
  purchase_type: string;
  price: number;
  status: string;
  sale_active: boolean;
  sale_percent: number;
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
  totals?: Record<string, unknown>;
  promo_codes?: unknown[];
  customers?: unknown[];
  orders?: unknown[];
};

export default function AccountPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { addToCart } = useCart();

  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [orders, setOrders] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [isSalesRep, setIsSalesRep] = useState(false);

  const [passwordRecoveryRequired, setPasswordRecoveryRequired] =
    useState(false);

  const [reorderingId, setReorderingId] = useState<string | null>(null);

  useEffect(() => {
    setPasswordRecoveryRequired(
      localStorage.getItem("pugpep_password_recovery") === "yes"
    );
  }, []);

  useEffect(() => {
    async function loadAccount() {
      setLoading(true);
      setIsSalesRep(false);

      const {
        data: userData,
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("Account loading error:", {
          message: userError.message,
          status: userError.status,
          name: userError.name,
        });

        setLoading(false);
        return;
      }

      const user = userData.user;

      if (!user) {
        setEmail("");
        setOrders([]);
        setProfile(null);
        setIsSalesRep(false);
        setLoading(false);
        return;
      }

      setEmail(user.email || "");

      /*
       * Load the customer's profile.
       */
      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from("customer_profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Profile loading error:", {
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint,
          code: profileError.code,
        });
      }

      setProfile(profileData || null);

      /*
       * Check whether the logged-in user has a
       * representative dashboard.
       *
       * This uses the secure RPC instead of reading
       * the sales_reps table directly.
       */
      const {
        data: representativeData,
        error: representativeError,
      } = await supabase.rpc("get_my_sales_rep_dashboard");

      if (representativeError) {
        console.error("Representative dashboard check failed:", {
          message: representativeError.message,
          details: representativeError.details,
          hint: representativeError.hint,
          code: representativeError.code,
        });

        setIsSalesRep(false);
      } else {
        const dashboard =
          representativeData as RepresentativeDashboardResult | null;

        const hasRepresentativeDashboard =
          dashboard !== null &&
          dashboard !== undefined &&
          typeof dashboard === "object" &&
          !Array.isArray(dashboard) &&
          Object.keys(dashboard).length > 0;

        setIsSalesRep(hasRepresentativeDashboard);
      }

      /*
       * Load the logged-in customer's previous orders.
       */
      const {
        data: orderData,
        error: orderError,
      } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false,
        });

      if (orderError) {
        console.error("Orders loading error:", {
          message: orderError.message,
          details: orderError.details,
          hint: orderError.hint,
          code: orderError.code,
        });
      }

      setOrders(orderData || []);
      setLoading(false);
    }

    void loadAccount();
  }, [supabase]);

  async function reorder(orderId: string) {
    setReorderingId(orderId);

    try {
      const {
        data: items,
        error: itemsError,
      } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", orderId);

      if (itemsError) {
        alert(itemsError.message);
        return;
      }

      if (!items || items.length === 0) {
        alert("No items found for this order.");
        return;
      }

      let addedItems = 0;
      const skippedItems: string[] = [];

      for (const item of items) {
        const productName = String(
          item.product_name || "Previous Order Item"
        );

        const productSlug = String(item.product_slug || "");
        const dosage = String(item.dosage || "");

        const purchaseType: "single" | "kit" =
          item.purchase_type === "kit" ? "kit" : "single";

        const requestedQuantity = Math.max(
          1,
          Number(item.quantity || 1)
        );

        if (!productSlug || !dosage) {
          skippedItems.push(
            `${productName}: missing product slug or dosage.`
          );

          continue;
        }

        const {
          data: productData,
          error: productError,
        } = await supabase
          .from("products")
          .select("name, slug, image, is_active")
          .eq("slug", productSlug)
          .eq("is_active", true)
          .maybeSingle();

        if (productError || !productData) {
          skippedItems.push(
            `${productName} ${dosage}: product is no longer available.`
          );

          continue;
        }

        const product = productData as CurrentProduct;

        const {
          data: optionData,
          error: optionError,
        } = await supabase
          .from("product_options")
          .select(
            "product_slug, dosage, purchase_type, price, status, sale_active, sale_percent, cost"
          )
          .eq("product_slug", productSlug)
          .eq("dosage", dosage)
          .eq("purchase_type", purchaseType)
          .maybeSingle();

        if (optionError || !optionData) {
          skippedItems.push(
            `${productName} ${dosage} ${purchaseType}: this option no longer exists.`
          );

          continue;
        }

        const option = optionData as CurrentProductOption;

        const {
          data: inventoryData,
          error: inventoryError,
        } = await supabase
          .from("inventory")
          .select("quantity")
          .eq("product_slug", productSlug)
          .eq("dosage", dosage)
          .eq("purchase_type", "single")
          .maybeSingle();

        if (inventoryError) {
          skippedItems.push(
            `${productName} ${dosage}: inventory could not be checked.`
          );

          continue;
        }

        const inventory = inventoryData as CurrentInventory | null;

        const availableSingleUnits = Number(
          inventory?.quantity || 0
        );

        const optionStatus = String(option.status || "in stock");
        const isPreSale = optionStatus === "pre-sale";
        const isOutOfStock = optionStatus === "out of stock";

        let maxAvailable: number | undefined;

        if (purchaseType === "single") {
          maxAvailable = availableSingleUnits;

          if (
            isOutOfStock ||
            availableSingleUnits < requestedQuantity
          ) {
            skippedItems.push(
              `${productName} ${dosage}: only ${availableSingleUnits} currently available.`
            );

            continue;
          }
        } else if (!isPreSale) {
          maxAvailable = Math.floor(availableSingleUnits / 10);

          if (
            isOutOfStock ||
            maxAvailable < requestedQuantity
          ) {
            skippedItems.push(
              `${productName} ${dosage} kit: only ${maxAvailable} kit(s) currently available.`
            );

            continue;
          }
        }

        const regularPrice = Number(option.price || 0);
        const salePercent = Number(option.sale_percent || 0);

        const wasOnSale =
          Boolean(option.sale_active) &&
          salePercent > 0;

        const salePrice = wasOnSale
          ? Number(
              (
                regularPrice *
                (1 - salePercent / 100)
              ).toFixed(2)
            )
          : regularPrice;

        const currentPrice = wasOnSale
          ? salePrice
          : regularPrice;

        addToCart(
          {
            name: String(product.name || productName),
            slug: productSlug,

            image: String(
              product.image ||
                item.image ||
                "/pugpep-logo.png"
            ),

            dosage,
            purchaseType,
            price: currentPrice,
            regularPrice,
            salePrice,
            wasOnSale,

            salePercent: wasOnSale
              ? salePercent
              : 0,

            status: optionStatus,
            cost: Number(option.cost || 0),
            maxAvailable,
          },
          requestedQuantity
        );

        addedItems += 1;
      }

      if (addedItems === 0) {
        alert(
          `Nothing was added to the cart.\n\n${skippedItems.join(
            "\n"
          )}`
        );

        return;
      }

      if (skippedItems.length > 0) {
        alert(
          `${addedItems} item type(s) added using current pricing and inventory.\n\nThe following could not be added:\n${skippedItems.join(
            "\n"
          )}`
        );
      } else {
        alert(
          "Order added back to cart using current pricing and inventory."
        );
      }

      router.push("/checkout");
    } finally {
      setReorderingId(null);
    }
  }

  if (passwordRecoveryRequired) {
    return (
      <main style={page}>
        <h1 style={{ color: "#ff45d8" }}>
          Password Reset Required
        </h1>

        <p>
          Please finish updating your password before viewing your
          account.
        </p>
      </main>
    );
  }

  if (loading) {
    return (
      <main style={page}>
        Loading account...
      </main>
    );
  }

  if (!email) {
    return (
      <main style={page}>
        <h1 style={{ color: "#ff45d8" }}>
          My Account
        </h1>

        <p>
          Please log in to view your account.
        </p>

        <Link
          href="/login"
          style={{ color: "#00d9ff" }}
        >
          Go to Login
        </Link>
      </main>
    );
  }

  return (
    <main style={page}>
      <h1 style={{ color: "#ff45d8" }}>
        My Account
      </h1>

      <p style={{ color: "#cccccc" }}>
        Logged in as {email}
      </p>

      {isSalesRep && (
        <section style={representativeBox}>
          <p style={representativeLabel}>
            Sales Representative
          </p>

          <h2 style={representativeHeading}>
            Representative Dashboard
          </h2>

          <p style={representativeText}>
            View your assigned customers, promotional codes,
            sales history, and commission information.
          </p>

          <Link
            href="/rep"
            style={representativeButton}
          >
            Open Representative Dashboard
          </Link>
        </section>
      )}

      {profile && (
        <section style={box}>
          <h2 style={{ color: "#00d9ff" }}>
            VIP Rewards
          </h2>

          <div style={tierOverview}>
            <p style={currentTier}>
              Current Tier: {profile.vip_tier || "Stone"}
            </p>

            <p style={tierList}>
              Stone → $0+ <br />
              Iron → $250+ <br />
              Bronze → $500+ <br />
              Silver → $1,000+ <br />
              Gold → $2,500+ <br />
              Platinum → $5,000+ <br />
              Emerald → $10,000+ <br />
              Sapphire → $20,000+ <br />
              Ruby → $35,000+ <br />
              Diamond → $50,000+
            </p>
          </div>

          <p>
            <strong>Tier:</strong>{" "}

            <span style={tierName}>
              {profile.vip_tier || "Stone"}
            </span>
          </p>

          <p>
            <strong>Lifetime Spend:</strong>{" "}
            $
            {Number(
              profile.lifetime_spend || 0
            ).toFixed(2)}
          </p>

          <p style={rewardDescription}>
            Reward points are earned with every purchase and can
            be redeemed for discounts on future orders. The more
            you spend, the higher your VIP tier and the more
            rewards you unlock.
          </p>

          <p style={rewardNote}>
            Note: VIP tier and rewards are updated after each
            order is completed.
          </p>

          <p>
            <strong>Reward Points:</strong>{" "}
            {Number(profile.reward_points || 0)}
          </p>

          <div style={{ marginTop: 18 }}>
            <strong style={{ color: "#00d9ff" }}>
              Tier Benefits
            </strong>

            <ul style={benefitList}>
              {getTierBenefits(
                profile.vip_tier || "Stone"
              ).map((benefit: string) => (
                <li key={benefit}>
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section style={box}>
        <h2 style={{ color: "#00d9ff" }}>
          Saved Shipping Info
        </h2>

        {profile?.full_name ? (
          <>
            <p>{profile.full_name}</p>
            <p>{profile.phone}</p>
            <p>{profile.address}</p>

            <p>
              {profile.city}, {profile.state} {profile.zip}
            </p>
          </>
        ) : (
          <p style={{ color: "#cccccc" }}>
            No saved shipping info yet. It will save after checkout.
          </p>
        )}
      </section>

      {profile?.has_lifetime_free_shipping && (
        <section style={box}>
          <h2 style={{ color: "#00d9ff" }}>
            Lifetime Free Shipping
          </h2>

          <p style={freeShippingText}>
            You have Lifetime FREE Shipping on every order.
          </p>
        </section>
      )}

      <section style={box}>
        <h2 style={{ color: "#00d9ff" }}>
          Previous Orders
        </h2>

        {orders.length === 0 ? (
          <p>
            No previous orders found.
          </p>
        ) : (
          orders.map((order) => (
            <div
              key={order.id}
              style={orderCard}
            >
              <strong>
                {order.order_number}
              </strong>

              <p>
                Total: $
                {Number(order.total || 0).toFixed(2)}
              </p>

              <div style={badgeRow}>
                <span style={getPaymentBadge(order.status)}>
                  {order.status === "paid"
                    ? "PAID"
                    : "PENDING PAYMENT"}
                </span>

                <span
                  style={getShippingBadge(
                    order.shipping_status
                  )}
                >
                  {order.shipping_status === "shipped"
                    ? "SHIPPED"
                    : order.shipping_status === "delivered"
                    ? "DELIVERED"
                    : "NOT SHIPPED"}
                </span>
              </div>

              {order.tracking_number && (
                <p>
                  Tracking: {order.tracking_number}
                </p>
              )}

              <button
                type="button"
                onClick={() => reorder(order.id)}
                style={{
                  ...reorderButton,
                  opacity:
                    reorderingId === order.id
                      ? 0.65
                      : 1,
                }}
                disabled={reorderingId !== null}
              >
                {reorderingId === order.id
                  ? "Checking Current Stock..."
                  : "Reorder"}
              </button>
            </div>
          ))
        )}
      </section>
    </main>
  );
}

function getPaymentBadge(status: string) {
  return {
    padding: "6px 12px",
    borderRadius: 999,
    fontWeight: "bold",
    fontSize: 12,

    background:
      status === "paid"
        ? "rgba(255,191,0,.12)"
        : "rgba(255,77,77,.12)",

    color:
      status === "paid"
        ? "#ffcc00"
        : "#ff4d4d",

    border:
      status === "paid"
        ? "1px solid #ffcc00"
        : "1px solid #ff4d4d",
  };
}

function getShippingBadge(status: string) {
  return {
    padding: "6px 12px",
    borderRadius: 999,
    fontWeight: "bold",
    fontSize: 12,

    background:
      status === "delivered"
        ? "rgba(0,255,153,.12)"
        : status === "shipped"
        ? "rgba(0,217,255,.12)"
        : "rgba(255,255,255,.08)",

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
        : "1px solid #444444",
  };
}

function getTierBenefits(tier: string) {
  switch (tier) {
    case "Diamond":
      return [
        "Highest fulfillment priority",
        "Maximum rewards multiplier",
        "Personal VIP support",
      ];

    case "Ruby":
      return [
        "Custom discount events",
        "First-access product drops",
      ];

    case "Sapphire":
      return [
        "Exclusive limited products",
        "Private VIP announcements",
      ];

    case "Emerald":
      return [
        "VIP-only promo events",
        "Highest inventory priority",
      ];

    case "Platinum":
      return [
        "Free shipping on all orders",
        "Priority processing",
      ];

    case "Gold":
      return [
        "Discounted shipping",
        "Early access to new products",
      ];

    case "Silver":
      return [
        "VIP Discord access",
        "Free shipping weekends",
      ];

    case "Bronze":
      return [
        "Priority support",
        "Exclusive promo access",
      ];

    case "Iron":
      return [
        "Birthday promo code",
        "Early promotion access",
      ];

    default:
      return [
        "Earn reward points",
        "Access to promotions",
      ];
  }
}

const page = {
  minHeight: "100vh",
  background: "#000000",
  color: "#ffffff",
  padding: 35,
};

const box = {
  marginTop: 25,
  padding: 22,
  border: "1px solid #333333",
  borderRadius: 14,
  background: "#080808",
};

const representativeBox = {
  marginTop: 25,
  padding: 22,
  border: "1px solid #ff45d8",
  borderRadius: 14,

  background:
    "linear-gradient(135deg, rgba(0,217,255,.10), rgba(255,69,216,.12))",

  boxShadow:
    "0 0 24px rgba(255,69,216,.12)",
};

const representativeLabel = {
  margin: 0,
  color: "#00d9ff",
  fontSize: 12,
  fontWeight: "bold",
  textTransform: "uppercase" as const,
  letterSpacing: 1,
};

const representativeHeading = {
  color: "#ff45d8",
  marginTop: 8,
  marginBottom: 10,
};

const representativeText = {
  color: "#cccccc",
  lineHeight: 1.6,
  maxWidth: 700,
};

const representativeButton = {
  display: "inline-block",
  marginTop: 12,
  padding: "13px 18px",
  borderRadius: 10,

  background:
    "linear-gradient(90deg, #00b7ff, #ff2fd0)",

  color: "#ffffff",
  textDecoration: "none",
  fontWeight: "bold",
};

const tierOverview = {
  marginTop: 12,
  marginBottom: 18,
  padding: 14,

  border:
    "1px solid rgba(255,255,255,.12)",

  borderRadius: 10,

  background:
    "rgba(255,255,255,.04)",
};

const currentTier = {
  margin: 0,
  color: "#00ff99",
  fontWeight: "bold",
};

const tierList = {
  marginTop: 10,
  color: "#cccccc",
  lineHeight: 1.8,
};

const tierName = {
  color: "#00ff99",
  fontWeight: "bold",
};

const rewardDescription = {
  color: "#cccccc",
  lineHeight: 1.6,
};

const rewardNote = {
  color: "#cccccc",
  fontSize: 14,
  marginTop: 10,
};

const benefitList = {
  marginTop: 10,
  color: "#cccccc",
  lineHeight: 1.8,
  paddingLeft: 20,
};

const freeShippingText = {
  color: "#00ff99",
  fontWeight: "bold",
};

const badgeRow = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap" as const,
  marginTop: 10,
};

const orderCard = {
  marginTop: 14,
  padding: 16,
  border: "1px solid #333333",
  borderRadius: 12,
  background: "#111111",
};

const reorderButton = {
  marginTop: 12,
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid #00ff99",
  background: "rgba(0,34,0,.85)",
  color: "#00ff99",
  fontWeight: "bold",
  cursor: "pointer",
};