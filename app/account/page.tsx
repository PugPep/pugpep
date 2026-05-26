"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useCart } from "../cartContext";
export default function AccountPage() {
  const supabase = createClient();
const router = useRouter();
const { addToCart } = useCart();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [orders, setOrders] = useState<any[]>([]);
const [profile, setProfile] = useState<any>(null);
  useEffect(() => {
    async function loadAccount() {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!user) {
        setLoading(false);
        return;
      }

      setEmail(user.email || "");
const { data: profileData } = await supabase
  .from("customer_profiles")
  .select("*")
  .eq("id", user.id)
  .single();

setProfile(profileData);
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setOrders(data || []);
      setLoading(false);
    }

    loadAccount();
  }, []);
if (
  typeof window !== "undefined" &&
  localStorage.getItem("pugpep_password_recovery") === "yes"
) {
  return (
    <main style={page}>
      <h1 style={{ color: "#ff45d8" }}>Password Reset Required</h1>
      <p>Please finish updating your password before viewing your account.</p>
    </main>
  );
}async function reorder(orderId: string) {
  const { data: items, error } = await supabase
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
    addToCart(
      {
        name: item.product_name,
        slug: item.product_slug,
        image: item.image || "/pugpep-logo.png",
        dosage: item.dosage,
        price:
          Number(item.price || 0) /
          Number(item.quantity || 1),
        purchaseType:
          item.purchase_type as
            | "single"
            | "kit",
        status: "in stock",
      },
      Number(item.quantity || 1)
    );
  });

  alert("Order added back to cart.");
  router.push("/checkout");
}
  if (loading) return <main style={page}>Loading account...</main>;

  if (!email) {
    return (
      <main style={page}>
        <h1 style={{ color: "#ff45d8" }}>My Account</h1>
        <p>Please log in to view your account.</p>
        <Link href="/login" style={{ color: "#00d9ff" }}>
          Go to Login
        </Link>
      </main>
    );
  }

  return (
    <main style={page}>
      <h1 style={{ color: "#ff45d8" }}>My Account</h1>
      <p style={{ color: "#ccc" }}>Logged in as {email}</p>
{profile && (
  <section style={box}>
    <h2 style={{ color: "#00d9ff" }}>VIP Rewards</h2>
<div
  style={{
    marginTop: 12,
    marginBottom: 18,
    padding: 14,
    border: "1px solid rgba(255,255,255,.12)",
    borderRadius: 10,
    background: "rgba(255,255,255,.04)",
  }}
>
  <p style={{ margin: 0, color: "#00ff99", fontWeight: "bold" }}>
    Current Tier: {profile.vip_tier || "Stone"}
  </p>

  <p style={{ marginTop: 10, color: "#ccc", lineHeight: 1.8 }}>
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
      <span style={{ color: "#00ff99", fontWeight: "bold" }}>
        {profile.vip_tier || "Stone"}
      </span>
    </p>

    <p>
      <strong>Lifetime Spend:</strong> $
      {Number(profile.lifetime_spend || 0).toFixed(2)}
    </p>
Reward points are earned with every purchase and can be redeemed for discounts on future orders. The more you spend, the higher your VIP tier and the more rewards you unlock!
    <p style={{ color: "#ccc", fontSize: 14, marginTop: 10 }}>
      Note: VIP tier and rewards are updated after each order is completed.
    </p>
    <p>
      <strong>Reward Points:</strong>{" "}
      {Number(profile.reward_points || 0)}
    </p>
    <div style={{ marginTop: 18 }}>
  <strong style={{ color: "#00d9ff" }}>
    Tier Benefits
  </strong>

  <ul
    style={{
      marginTop: 10,
      color: "#ccc",
      lineHeight: 1.8,
      paddingLeft: 20,
    }}
  >
    {getTierBenefits(profile.vip_tier || "Stone").map(
      (benefit: string) => (
        <li key={benefit}>{benefit}</li>
      )
    )}
  </ul>
</div>
  </section>
)}
      <section style={box}>
  <h2 style={{ color: "#00d9ff" }}>Saved Shipping Info</h2>

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
    <p style={{ color: "#ccc" }}>
      No saved shipping info yet. It will save after checkout.
    </p>
  )}
</section>

{profile?.has_lifetime_free_shipping && (
  <section style={box}>
    <h2 style={{ color: "#00d9ff" }}>
      Lifetime Free Shipping
    </h2>

    <p style={{ color: "#00ff99", fontWeight: "bold" }}>
      You have Lifetime FREE Shipping on every order.
    </p>
  </section>
)}

      <section style={box}>
        <h2 style={{ color: "#00d9ff" }}>Previous Orders</h2>

        {orders.length === 0 ? (
          <p>No previous orders found.</p>
        ) : (
          orders.map((order) => (
            <div key={order.id} style={orderCard}>
              <strong>{order.order_number}</strong>
              <p>Total: ${Number(order.total || 0).toFixed(2)}</p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
  <span style={getPaymentBadge(order.status)}>
    {order.status === "paid" ? "PAID" : "PENDING PAYMENT"}
  </span>

  <span style={getShippingBadge(order.shipping_status)}>
    {order.shipping_status === "shipped"
      ? "SHIPPED"
      : order.shipping_status === "delivered"
      ? "DELIVERED"
      : "NOT SHIPPED"}
  </span>
</div>
              {order.tracking_number && (
  <p>Tracking: {order.tracking_number}</p>
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
    color: status === "paid" ? "#ffcc00" : "#ff4d4d",
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

const orderCard = {
  marginTop: 14,
  padding: 16,
  border: "1px solid #333",
  borderRadius: 12,
  background: "#111",
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