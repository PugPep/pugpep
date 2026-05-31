"use client";

import emailjs from "emailjs-com";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "../cartContext";
import { createClient } from "../../lib/supabaseClient";

export default function CheckoutPage() {
  const { cart, total, removeFromCart, updateQuantity, clearCart } = useCart();

  const router = useRouter();
  const supabase = createClient();



  const [loading, setLoading] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoData, setPromoData] = useState<any>(null);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoLoading, setPromoLoading] = useState(false);
  const [hasLifetimeFreeShipping, setHasLifetimeFreeShipping] = useState(false);
  const [rewardPoints, setRewardPoints] = useState(0);
const [pointsToUse, setPointsToUse] = useState(0);
const shipping = hasLifetimeFreeShipping || total >= 250 ? 0 : 10;
const rewardDiscount = pointsToUse / 100;
 const finalTotal = Math.max(
  0,
  total - promoDiscount - rewardDiscount + shipping
);
 const hasPreSaleItems = cart.some(
  (item: any) => item.status === "pre-sale"
);

  const [customer, setCustomer] = useState({
    organization:"",
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    
    zip: "",
  });
useEffect(() => {
  async function checkLifetimeShipping() {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
  alert("You must create an account or log in before checkout.");
  router.push("/login");
  return;
}

  const { data: profile } = await supabase
  .from("customer_profiles")
  .select("*")
  .eq("id", user.id)
  .single();

if (profile?.has_lifetime_free_shipping) {
  setHasLifetimeFreeShipping(true);
}

if (profile) {
  setCustomer((prev) => ({
  ...prev,
  organization: profile.organization || "",
  name: profile.full_name || "",
  phone: profile.phone || "",
  address: profile.address || "",
  city: profile.city || "",
  state: profile.state || "",
  zip: profile.zip || "",
  email: user.email || "",
}));

setRewardPoints(
  Number(profile.reward_points || 0)
);
}
  }

  checkLifetimeShipping();
  
}, []);
  useEffect(() => {
    if (!promoData) {
      setPromoDiscount(0);
      return;
    }

    let discount = 0;

    if (promoData.discount_type === "percent") {
      discount = total * (Number(promoData.discount_value) / 100);
    } else {
      discount = Number(promoData.discount_value);
    }

    setPromoDiscount(Math.min(discount, total));
  }, [total, promoData]);

  function updateField(field: string, value: string) {
    setCustomer((prev) => ({ ...prev, [field]: value }));
  }

  async function applyPromoCode() {
    if (!promoCode.trim()) {
      alert("Enter a promo code.");
      return;
    }

    setPromoLoading(true);

    const { data, error } = await supabase
      .from("promo_codes")
      .select("*")
      .eq("code", promoCode.toUpperCase())
      .eq("is_active", true)
      .single();

    setPromoLoading(false);

    if (error || !data) {
      alert("Invalid or inactive promo code.");
      setPromoData(null);
      setPromoDiscount(0);
      return;
    }

    setPromoData(data);
    alert("Promo code applied.");
  }

  async function proceedToPayment() {
    if (cart.length === 0) return alert("Your cart is empty.");

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
  return alert("Please fill out all required checkout fields.");
}

    setLoading(true);

    const orderId = crypto.randomUUID();
    const orderNumber = `PUG-${Date.now()}`;
const { data: userData } = await supabase.auth.getUser();
const userId = userData.user?.id || null;
if (userId) {
  await supabase
    .from("customer_profiles")
    .update({
      organization: customer.organization,
      full_name: customer.name,
      phone: customer.phone,
      address: customer.address,
      city: customer.city,
      state: customer.state,
      zip: customer.zip,
    })
    .eq("id", userId);
}const { data: existingProfile } = await supabase
  .from("customer_profiles")
  .select("*")
  .eq("id", userId)
  .single();

if (existingProfile) {
  const newLifetimeSpend =
    Number(existingProfile.lifetime_spend || 0) +
    Number(finalTotal || 0);

  const newRewardPoints =
    Number(existingProfile.reward_points || 0) +
    Math.floor(Number(finalTotal || 0));

  let vipTier = "Stone";

  if (newLifetimeSpend >= 50000) {
    vipTier = "Diamond";
  } else if (newLifetimeSpend >= 35000) {
    vipTier = "Ruby";
  } else if (newLifetimeSpend >= 20000) {
    vipTier = "Sapphire";
  } else if (newLifetimeSpend >= 10000) {
    vipTier = "Emerald";
  } else if (newLifetimeSpend >= 5000) {
    vipTier = "Platinum";
  } else if (newLifetimeSpend >= 2500) {
    vipTier = "Gold";
  } else if (newLifetimeSpend >= 1000) {
    vipTier = "Silver";
  } else if (newLifetimeSpend >= 500) {
    vipTier = "Bronze";
  } else if (newLifetimeSpend >= 250) {
    vipTier = "Iron";
  }

  await supabase
    .from("customer_profiles")
    .update({
      lifetime_spend: newLifetimeSpend,
      reward_points:
  newRewardPoints - pointsToUse,
      vip_tier: vipTier,
    })
    .eq("id", userId);
}
    const productCostTotal = cart.reduce(
  (sum, item: any) =>
    sum +
    Number(item.cost || 0) *
      Number(item.quantity || 1),
  0
);

const estimatedShippingCost =
  shipping > 0 ? 10 : 0;

const estimatedPackagingCost = 3;

const estimatedProfit =
  finalTotal -
  productCostTotal -
  estimatedShippingCost -
  estimatedPackagingCost;

const { error: orderError } = await supabase
  .from("orders")
  .insert({
    id: orderId,
    user_id: userId,
    order_number: orderNumber,
    customer_organization: customer.organization,
    customer_name: customer.name,
    customer_email: customer.email,
    customer_phone: customer.phone,
    shipping_address: customer.address,
    city: customer.city,
    state: customer.state,
    zip: customer.zip,

    subtotal: total,
    shipping,
    total: finalTotal,

    reward_points_used: pointsToUse,
    reward_discount: rewardDiscount,

    promo_code: promoData?.code || null,
    promo_discount: promoDiscount || 0,

    product_cost_total: productCostTotal,
    estimated_shipping_cost:
      estimatedShippingCost,

    estimated_packaging_cost:
      estimatedPackagingCost,

    estimated_profit: estimatedProfit,

    has_lifetime_free_shipping:
      hasLifetimeFreeShipping,

    status: "pending",
  });

    if (orderError) {
      setLoading(false);
      alert(orderError.message);
      return;
    }

    const orderItems = cart.map((item) => ({
  order_id: orderId,
  product_slug: item.slug,
  product_name: item.name,
  dosage: item.dosage,
  purchase_type: item.purchaseType,
  price: item.price * item.quantity,
  cost: item.cost || 0,
  quantity: item.quantity,
}));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      setLoading(false);
      alert(itemsError.message);
      return;
    }

    localStorage.setItem(
      "pugpep_order",
      JSON.stringify({
        id: orderId,
        orderNumber,
        customer,
        items: cart,
        subtotal: total,
        shipping,
        promoCode: promoData?.code || null,
        promoDiscount,
        total: finalTotal,
        createdAt: new Date().toISOString(),
      })
    );

    try {
      await emailjs.send(
        "service_quxnkin",
        "template_xz4gtk9",
        {
          organization: customer.organization,
          name: customer.name,
          email: customer.email,
          admin_email: "Support@PugPep.com",
          order_number: orderNumber,
          items: cart.map((item) => ({
            name: `${item.name} (${item.dosage})`,
            quantity: item.quantity,
            price: `$${(item.price * item.quantity).toFixed(2)}`,
          })),
          shipping: shipping.toFixed(2),
          tax: "0.00",
          promo_code: promoData?.code || "",
          promo_discount: promoDiscount.toFixed(2),
          total: finalTotal.toFixed(2),
        },
        "yc_0cE0Mcl3tfzc11"
      );
    } catch (error) {
      console.error("Email failed:", error);
    }

    setLoading(false);
    clearCart();
    router.push("/payment");
  }

  return (
    <main style={page}>
      <h1 style={{ color: "#ff45d8" }}>Checkout</h1>

      <div style={freeShippingBanner}>🚚 FREE U.S. Shipping on orders over $250</div>
{hasPreSaleItems && (
  <div
    style={{
      padding: 15,
      marginBottom: 25,
      border: "1px solid #ffbf00",
      borderRadius: 10,
      background: "rgba(255,191,0,.08)",
      color: "#ffcc66",
      fontWeight: "bold",
      textAlign: "center",
      lineHeight: 1.6,
    }}
  >
    ⚠️ One or more items in your cart are currently on pre-sale.
    <br />
    Estimated delivery time may take up to 2 weeks.
  </div>
)}
      <div style={checkoutGrid}>
        <section>
          <div style={promoBox}>
            <h3 style={{ color: "#ff45d8", marginTop: 0 }}>Promo Code</h3>

            <div style={promoRow}>
              <input
                placeholder="Enter promo code"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
              />

              <button
                type="button"
                onClick={applyPromoCode}
                style={promoButton}
              >
                {promoLoading ? "Applying..." : "Apply"}
              </button>
            </div>

            {promoData && (
              <p style={{ color: "#00ff99", marginTop: 10 }}>
                Promo Applied:{" "}
                {promoData.discount_type === "percent"
                  ? `${promoData.discount_value}% OFF`
                  : `$${promoData.discount_value} OFF`}
              </p>
            )}
          </div>

          <h2 style={{ color: "#00d9ff", marginTop: 25 }}>
            Shipping Information
          </h2>
<input
  required
  placeholder="Organization / Lab Name"
  value={customer.organization}
  onChange={(e) =>
    updateField("organization", e.target.value)
  }
  style={inputStyle}
/>
          <input
          required
            placeholder="Full Name"
            value={customer.name}
            onChange={(e) => updateField("name", e.target.value)}
            style={inputStyle}
          />

          <input
          required
            placeholder="Email"
            value={customer.email}
            onChange={(e) => updateField("email", e.target.value)}
            style={inputStyle}
          />

          <input
          required
            placeholder="Phone Number"
            value={customer.phone}
            onChange={(e) => updateField("phone", e.target.value)}
            style={inputStyle}
          />

          <input
          required
            placeholder="Shipping Address"
            value={customer.address}
            onChange={(e) => updateField("address", e.target.value)}
            style={inputStyle}
          />

          <input
          required
            placeholder="City"
            value={customer.city}
            onChange={(e) => updateField("city", e.target.value)}
            style={inputStyle}
          />

          <input
          required
            placeholder="State"
            value={customer.state}
            onChange={(e) => updateField("state", e.target.value)}
            style={inputStyle}
          />

          <input
          required
            placeholder="ZIP Code"
            value={customer.zip}
            onChange={(e) => updateField("zip", e.target.value)}
            style={inputStyle}
          />

          <button onClick={proceedToPayment} style={buttonStyle}>
            {loading ? "Saving Order..." : "Proceed to Payment"}
          </button>
        </section>

        <section>
          <h2 style={{ color: "#00d9ff" }}>Order Summary</h2>
<div
  style={{
    marginBottom: 20,
    padding: 14,
    border: "1px solid rgba(255,255,255,.18)",
    borderRadius: 10,
    background: "rgba(255,255,255,.04)",
  }}
>
  <h3 style={{ color: "#00ff99", marginTop: 0 }}>
    Reward Points
  </h3>

  <p>
    Available Points:{" "}
    <strong>{rewardPoints}</strong>
  </p>

  <input
    type="number"
    placeholder="Points to redeem"
    value={pointsToUse}
    onChange={(e) => {
      const value = Math.max(
        0,
        Math.min(
          Number(e.target.value),
          rewardPoints
        )
      );

      setPointsToUse(value);
    }}
    style={inputStyle}
  />

  <p style={{ color: "#00ff99" }}>
    Reward Discount: $
    {rewardDiscount.toFixed(2)}
  </p>

  <p style={{ color: "#888", fontSize: 13 }}>
    100 points = $1 off
  </p>
</div>
          {cart.length === 0 ? (
            <p>Your cart is empty.</p>
          ) : (
            <>
              {cart.map((item, index) => (
                <div key={index} style={cartItemStyle}>
                  <Image
                    src={item.image}
                    alt={item.name}
                    width={120}
                    height={120}
                    style={cartImage}
                  />

                  <div>
                    <strong style={{ color: "#ff45d8" }}>{item.name}</strong>

                    <p style={{ margin: "4px 0", color: "#ccc" }}>
                      {item.dosage} —{" "}
                      {item.purchaseType === "single"
                        ? "Single Vial"
                        : "Full Kit of 10"}
                    </p>

                    <div style={qtyRow}>
                      <button
                        type="button"
                        onClick={() => updateQuantity(index, item.quantity - 1)}
                        style={qtyButton}
                      >
                        -
                      </button>

                      <span style={{ minWidth: 24, textAlign: "center" }}>
                        {item.quantity}
                      </span>

                      <button
                        type="button"
                        onClick={() => {
  // SINGLE VIAL LIMITS
  if (
    item.purchaseType === "single" &&
    item.status !== "pre-sale"
  ) {
    const maxAvailable =
      item.maxAvailable || item.quantity;

    if (item.quantity + 1 > maxAvailable) {
      alert(
        `Only ${maxAvailable} vial(s) currently available.`
      );
      return;
    }
  }

  updateQuantity(index, item.quantity + 1);
}}
                        style={qtyButton}
                      >
                        +
                      </button>

                      <button
                        type="button"
                        onClick={() => removeFromCart(index)}
                        style={removeButton}
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <strong>${(item.price * item.quantity).toFixed(2)}</strong>
                </div>
              ))}

              <h3>Subtotal: ${total.toFixed(2)}</h3>

              {promoDiscount > 0 && (
                <h3 style={{ color: "#00ff99" }}>
                  Promo Discount: -${promoDiscount.toFixed(2)}
                </h3>
              )}

              <h3>
                Shipping:{" "}
{shipping === 0 ? (
  <span style={{ color: "#00ff99" }}>
    FREE {hasLifetimeFreeShipping ? "(Lifetime)" : ""}
  </span>
) : (
  `$${shipping.toFixed(2)}`
)}
              </h3>

              <h2 style={{ color: "#00d9ff" }}>
                Total: ${finalTotal.toFixed(2)}
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
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 30,
};

const promoBox = {
  marginBottom: 20,
  padding: 16,
  border: "1px solid rgba(255,255,255,.18)",
  borderRadius: 12,
  background: "rgba(255,255,255,.04)",
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
  background: "rgba(0,217,255,0.12)",
  color: "#00d9ff",
  fontWeight: "bold",
  textAlign: "center" as const,
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
  cursor: "pointer",
  fontWeight: "bold",
  width: 130,
  flexShrink: 0,
};

const buttonStyle = {
  marginTop: 15,
  padding: "14px 22px",
  width: "100%",
  background: "linear-gradient(90deg, #00b7ff, #ff2fd0)",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: 18,
};

const cartItemStyle = {
  display: "grid",
  gridTemplateColumns: "95px minmax(160px, 1fr)",
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
  border: "1px solid rgba(255,255,255,.18)",
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