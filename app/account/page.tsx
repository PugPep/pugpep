"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabaseClient";

export default function AccountPage() {
  const supabase = createClient();

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
if (localStorage.getItem("pugpep_password_recovery") === "yes") {
  return (
    <main style={page}>
      <h1 style={{ color: "#ff45d8" }}>Password Reset Required</h1>
      <p>Please finish updating your password before viewing your account.</p>
    </main>
  );
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
              <p>Status: {order.status}</p>
              <p>Shipping: {order.shipping_status || "not shipped"}</p>
              {order.tracking_number && (
                <p>Tracking: {order.tracking_number}</p>
              )}
            </div>
          ))
        )}
      </section>
    </main>
  );
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