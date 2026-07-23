"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabaseClient";
import { useCart } from "../cartContext";

type CustomerProfile = {
  id: string;
  full_name?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  vip_tier?: string | null;
  lifetime_spend?: number | null;
  reward_points?: number | null;
  has_lifetime_free_shipping?: boolean | null;
};

type Order = {
  id: string;
  order_number?: string | null;
  total?: number | null;
  status?: string | null;
  shipping_status?: string | null;
  tracking_number?: string | null;
  created_at?: string | null;
};

type ShippingForm = {
  full_name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
};

const emptyShippingForm: ShippingForm = {
  full_name: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  zip: "",
};

export default function AccountPage() {
  const supabase = createClient();
  const router = useRouter();
  const { addToCart } = useCart();

  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);

  const [passwordRecoveryRequired, setPasswordRecoveryRequired] =
    useState(false);

  const [editingShipping, setEditingShipping] = useState(false);
  const [savingShipping, setSavingShipping] = useState(false);
  const [shippingMessage, setShippingMessage] = useState("");
  const [shippingError, setShippingError] = useState(false);

  const [shippingForm, setShippingForm] =
    useState<ShippingForm>(emptyShippingForm);

  useEffect(() => {
    async function loadAccount() {
      try {
        const recoveryRequired =
          localStorage.getItem("pugpep_password_recovery") === "yes";

        setPasswordRecoveryRequired(recoveryRequired);

        if (recoveryRequired) {
          setLoading(false);
          return;
        }

        const {
          data: userData,
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          console.error("User loading error:", userError);
        }

        const user = userData.user;

        if (!user) {
          setLoading(false);
          return;
        }

        setEmail(user.email || "");

        const {
          data: profileData,
          error: profileError,
        } = await supabase
          .from("customer_profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          console.error("Profile loading error:", profileError);
        }

        if (profileData) {
          setProfile(profileData);

          setShippingForm({
            full_name: profileData.full_name || "",
            phone: profileData.phone || "",
            address: profileData.address || "",
            city: profileData.city || "",
            state: profileData.state || "",
            zip: profileData.zip || "",
          });
        } else {
          setProfile(null);
          setShippingForm(emptyShippingForm);
        }

        const {
          data: orderData,
          error: orderError,
        } = await supabase
          .from("orders")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (orderError) {
          console.error("Order loading error:", orderError);
        }

        setOrders(orderData || []);
      } catch (error) {
        console.error("Account loading error:", error);
      } finally {
        setLoading(false);
      }
    }

    loadAccount();
  }, []);

  function updateShippingField(
    field: keyof ShippingForm,
    value: string
  ) {
    setShippingForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function startEditingShipping() {
    setShippingMessage("");
    setShippingError(false);
    setEditingShipping(true);
  }

  function cancelEditingShipping() {
    setShippingForm({
      full_name: profile?.full_name || "",
      phone: profile?.phone || "",
      address: profile?.address || "",
      city: profile?.city || "",
      state: profile?.state || "",
      zip: profile?.zip || "",
    });

    setShippingMessage("");
    setShippingError(false);
    setEditingShipping(false);
  }

  async function saveShippingInfo() {
    setShippingMessage("");
    setShippingError(false);

    const fullName = shippingForm.full_name.trim();
    const phone = shippingForm.phone.trim();
    const address = shippingForm.address.trim();
    const city = shippingForm.city.trim();
    const state = shippingForm.state.trim().toUpperCase();
    const zip = shippingForm.zip.trim();

    if (!fullName || !address || !city || !state || !zip) {
      setShippingError(true);
      setShippingMessage(
        "Please complete all required shipping fields."
      );
      return;
    }

    if (state.length !== 2) {
      setShippingError(true);
      setShippingMessage(
        "Please enter the two-letter state abbreviation."
      );
      return;
    }

    setSavingShipping(true);

    try {
      const {
        data: userData,
        error: userError,
      } = await supabase.auth.getUser();

      const user = userData.user;

      if (userError || !user) {
        setShippingError(true);
        setShippingMessage(
          "Your login session expired. Please log in again."
        );
        return;
      }

      const updatedShipping = {
        id: user.id,
        full_name: fullName,
        phone,
        address,
        city,
        state,
        zip,
      };

      const {
        data,
        error,
      } = await supabase
        .from("customer_profiles")
        .upsert(updatedShipping, {
          onConflict: "id",
        })
        .select("*")
        .single();

      if (error) {
        console.error("Shipping update error:", error);
        setShippingError(true);
        setShippingMessage(error.message);
        return;
      }

      setProfile(data);

      setShippingForm({
        full_name: data.full_name || "",
        phone: data.phone || "",
        address: data.address || "",
        city: data.city || "",
        state: data.state || "",
        zip: data.zip || "",
      });

      setEditingShipping(false);
      setShippingError(false);
      setShippingMessage(
        "Shipping information updated successfully."
      );
    } catch (error) {
      console.error("Shipping save error:", error);
      setShippingError(true);
      setShippingMessage(
        "Shipping information could not be saved."
      );
    } finally {
      setSavingShipping(false);
    }
  }

  async function reorder(orderId: string) {
    const {
      data: items,
      error,
    } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", orderId);

    if (error) {
      alert(error.message);
      return;
    }

    if (!items || items.length === 0) {
      alert("No items found for this order.");
      return;
    }

    items.forEach((item) => {
      const quantity = Number(item.quantity || 1);
      const totalPrice = Number(item.price || 0);

      addToCart(
        {
          name: item.product_name,
          slug: item.product_slug,
          image: item.image || "/pugpep-logo.png",
          dosage: item.dosage,
          price:
            quantity > 0
              ? totalPrice / quantity
              : totalPrice,
          purchaseType:
            item.purchase_type as "single" | "kit",
          status: "in stock",
        },
        quantity
      );
    });

    alert("Order added back to cart.");
    router.push("/checkout");
  }

  if (loading) {
    return (
      <main style={page}>
        <p>Loading account...</p>
      </main>
    );
  }

  if (passwordRecoveryRequired) {
    return (
      <main style={page}>
        <h1 style={{ color: "#ff45d8" }}>
          Password Reset Required
        </h1>

        <p>
          Please finish updating your password before viewing
          your account.
        </p>
      </main>
    );
  }

  if (!email) {
    return (
      <main style={page}>
        <h1 style={{ color: "#ff45d8" }}>
          My Account
        </h1>

        <p>Please log in to view your account.</p>

        <Link href="/login" style={{ color: "#00d9ff" }}>
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

      <p style={{ color: "#ccc" }}>
        Logged in as {email}
      </p>

      {profile && (
        <section style={box}>
          <h2 style={{ color: "#00d9ff" }}>
            VIP Rewards
          </h2>

          <div style={tierOverview}>
            <p
              style={{
                margin: 0,
                color: "#00ff99",
                fontWeight: "bold",
              }}
            >
              Current Tier: {profile.vip_tier || "Stone"}
            </p>

            <p
              style={{
                marginTop: 10,
                color: "#ccc",
                lineHeight: 1.8,
              }}
            >
              Stone → $0+
              <br />
              Iron → $250+
              <br />
              Bronze → $500+
              <br />
              Silver → $1,000+
              <br />
              Gold → $2,500+
              <br />
              Platinum → $5,000+
              <br />
              Emerald → $10,000+
              <br />
              Sapphire → $20,000+
              <br />
              Ruby → $35,000+
              <br />
              Diamond → $50,000+
            </p>
          </div>

          <p>
            <strong>Tier:</strong>{" "}
            <span
              style={{
                color: "#00ff99",
                fontWeight: "bold",
              }}
            >
              {profile.vip_tier || "Stone"}
            </span>
          </p>

          <p>
            <strong>Lifetime Spend:</strong> $
            {Number(
              profile.lifetime_spend || 0
            ).toFixed(2)}
          </p>

          <p style={{ color: "#ccc", lineHeight: 1.7 }}>
            Reward points are earned with every purchase and
            can be redeemed for discounts on future orders.
            The more you spend, the higher your VIP tier and
            the more rewards you unlock.
          </p>

          <p
            style={{
              color: "#ccc",
              fontSize: 14,
              marginTop: 10,
            }}
          >
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

            <ul style={benefitsList}>
              {getTierBenefits(
                profile.vip_tier || "Stone"
              ).map((benefit) => (
                <li key={benefit}>
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section style={box}>
        <div style={sectionHeader}>
          <h2
            style={{
              color: "#00d9ff",
              margin: 0,
            }}
          >
            Saved Shipping Info
          </h2>

          {!editingShipping && profile?.full_name && (
            <button
              type="button"
              onClick={startEditingShipping}
              style={editButton}
            >
              Edit Shipping Info
            </button>
          )}
        </div>

        {editingShipping ? (
          <div style={{ marginTop: 20 }}>
            <label style={shippingLabel}>
              Full Name *
              <input
                type="text"
                value={shippingForm.full_name}
                onChange={(event) =>
                  updateShippingField(
                    "full_name",
                    event.target.value
                  )
                }
                autoComplete="name"
                style={shippingInput}
              />
            </label>

            <label style={shippingLabel}>
              Phone Number
              <input
                type="tel"
                value={shippingForm.phone}
                onChange={(event) =>
                  updateShippingField(
                    "phone",
                    event.target.value
                  )
                }
                autoComplete="tel"
                style={shippingInput}
              />
            </label>

            <label style={shippingLabel}>
              Street Address *
              <input
                type="text"
                value={shippingForm.address}
                onChange={(event) =>
                  updateShippingField(
                    "address",
                    event.target.value
                  )
                }
                autoComplete="street-address"
                style={shippingInput}
              />
            </label>

            <div style={shippingGrid}>
              <label style={shippingLabel}>
                City *
                <input
                  type="text"
                  value={shippingForm.city}
                  onChange={(event) =>
                    updateShippingField(
                      "city",
                      event.target.value
                    )
                  }
                  autoComplete="address-level2"
                  style={shippingInput}
                />
              </label>

              <label style={shippingLabel}>
                State *
                <input
                  type="text"
                  value={shippingForm.state}
                  onChange={(event) =>
                    updateShippingField(
                      "state",
                      event.target.value
                    )
                  }
                  autoComplete="address-level1"
                  maxLength={2}
                  placeholder="FL"
                  style={shippingInput}
                />
              </label>

              <label style={shippingLabel}>
                ZIP Code *
                <input
                  type="text"
                  value={shippingForm.zip}
                  onChange={(event) =>
                    updateShippingField(
                      "zip",
                      event.target.value
                    )
                  }
                  autoComplete="postal-code"
                  style={shippingInput}
                />
              </label>
            </div>

            <div style={shippingButtonRow}>
              <button
                type="button"
                onClick={saveShippingInfo}
                disabled={savingShipping}
                style={{
                  ...saveButton,
                  opacity: savingShipping ? 0.6 : 1,
                  cursor: savingShipping
                    ? "not-allowed"
                    : "pointer",
                }}
              >
                {savingShipping
                  ? "Saving..."
                  : "Save Shipping Info"}
              </button>

              <button
                type="button"
                onClick={cancelEditingShipping}
                disabled={savingShipping}
                style={cancelButton}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : profile?.full_name ? (
          <div style={savedAddress}>
            <p style={{ margin: 0 }}>
              <strong>{profile.full_name}</strong>
            </p>

            {profile.phone && (
              <p style={addressLine}>
                {profile.phone}
              </p>
            )}

            <p style={addressLine}>
              {profile.address}
            </p>

            <p style={addressLine}>
              {profile.city}, {profile.state}{" "}
              {profile.zip}
            </p>
          </div>
        ) : (
          <div style={{ marginTop: 18 }}>
            <p style={{ color: "#ccc" }}>
              No saved shipping information yet.
            </p>

            <button
              type="button"
              onClick={startEditingShipping}
              style={editButton}
            >
              Add Shipping Info
            </button>
          </div>
        )}

        {shippingMessage && (
          <p
            role={shippingError ? "alert" : "status"}
            style={{
              marginTop: 16,
              color: shippingError
                ? "#ff6666"
                : "#00ff99",
            }}
          >
            {shippingMessage}
          </p>
        )}
      </section>

      {profile?.has_lifetime_free_shipping && (
        <section style={box}>
          <h2 style={{ color: "#00d9ff" }}>
            Lifetime Free Shipping
          </h2>

          <p
            style={{
              color: "#00ff99",
              fontWeight: "bold",
            }}
          >
            You have Lifetime FREE Shipping on every order.
          </p>
        </section>
      )}

      <section style={box}>
        <h2 style={{ color: "#00d9ff" }}>
          Previous Orders
        </h2>

        {orders.length === 0 ? (
          <p>No previous orders found.</p>
        ) : (
          orders.map((order) => (
            <div key={order.id} style={orderCard}>
              <strong>
                {order.order_number || "Order"}
              </strong>

              <p>
                Total: $
                {Number(order.total || 0).toFixed(2)}
              </p>

              <div style={badgeRow}>
                <span
                  style={getPaymentBadge(
                    order.status || ""
                  )}
                >
                  {order.status === "paid"
                    ? "PAID"
                    : "PENDING PAYMENT"}
                </span>

                <span
                  style={getShippingBadge(
                    order.shipping_status || ""
                  )}
                >
                  {order.shipping_status === "shipped"
                    ? "SHIPPED"
                    : order.shipping_status ===
                      "delivered"
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
                style={reorderButton}
              >
                Reorder
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
        : "#aaa",
    border:
      status === "delivered"
        ? "1px solid #00ff99"
        : status === "shipped"
        ? "1px solid #00d9ff"
        : "1px solid #444",
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
  background: "#000",
  color: "#fff",
  padding: 35,
};

const box = {
  marginTop: 25,
  padding: 22,
  border: "1px solid #333",
  borderRadius: 14,
  background: "#080808",
};

const tierOverview = {
  marginTop: 12,
  marginBottom: 18,
  padding: 14,
  border: "1px solid rgba(255,255,255,.12)",
  borderRadius: 10,
  background: "rgba(255,255,255,.04)",
};

const benefitsList = {
  marginTop: 10,
  color: "#ccc",
  lineHeight: 1.8,
  paddingLeft: 20,
};

const sectionHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap" as const,
};

const shippingLabel = {
  display: "block",
  marginBottom: 16,
  color: "#ccc",
  fontWeight: 600,
};

const shippingInput = {
  display: "block",
  width: "100%",
  marginTop: 7,
  padding: "12px 14px",
  borderRadius: 9,
  border: "1px solid #444",
  background: "#111",
  color: "#fff",
  fontSize: 16,
  boxSizing: "border-box" as const,
};

const shippingGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(140px, 1fr))",
  gap: 14,
};

const shippingButtonRow = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap" as const,
  marginTop: 8,
};

const savedAddress = {
  marginTop: 18,
  lineHeight: 1.7,
};

const addressLine = {
  margin: "4px 0",
};

const editButton = {
  padding: "9px 14px",
  borderRadius: 8,
  border: "1px solid #00d9ff",
  background: "rgba(0,75,90,.35)",
  color: "#00d9ff",
  fontWeight: "bold",
  cursor: "pointer",
};

const saveButton = {
  padding: "11px 16px",
  borderRadius: 8,
  border: "1px solid #00ff99",
  background: "rgba(0,70,42,.5)",
  color: "#00ff99",
  fontWeight: "bold",
};

const cancelButton = {
  padding: "11px 16px",
  borderRadius: 8,
  border: "1px solid #777",
  background: "#222",
  color: "#ddd",
  fontWeight: "bold",
  cursor: "pointer",
};

const orderCard = {
  marginTop: 14,
  padding: 16,
  border: "1px solid #333",
  borderRadius: 12,
  background: "#111",
};

const badgeRow = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap" as const,
  marginTop: 10,
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