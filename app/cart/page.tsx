"use client";

import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabaseClient";
import { useCart } from "../cartContext";

export default function CartPage() {
  const router = useRouter();
  const supabase = createClient();

  const {
    cart,
    total,
    removeFromCart,
    updateQuantity,
  } = useCart();

  async function proceedToCheckout() {
    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      localStorage.setItem(
        "pugpep_redirect_after_login",
        "/checkout"
      );

      alert(
        "Please create an account or log in before checkout."
      );

      router.push("/login");
      return;
    }

    router.push("/checkout");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#000",
        color: "#fff",
        padding: 30,
      }}
    >
      <h1 style={{ color: "#ff45d8" }}>
        Shopping Cart
      </h1>

      {cart.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <>
          {cart.map((item, index) => (
            <div
              key={index}
              style={{
                padding: 15,
                marginBottom: 12,
                border: "1px solid #333",
                borderRadius: 12,
                background: "#111",
              }}
            >
              <h3
                style={{
                  color: "#00d9ff",
                  marginTop: 0,
                }}
              >
                {item.name}
              </h3>

              <p>
                {item.dosage} —{" "}
                {item.purchaseType === "single"
                  ? "Single"
                  : "Kit"}
              </p>

              <p>
                $
                {(
                  item.price *
                  item.quantity
                ).toFixed(2)}
              </p>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <button
                  onClick={() =>
                    updateQuantity(
                      index,
                      item.quantity - 1
                    )
                  }
                >
                  -
                </button>

                <span>{item.quantity}</span>

                <button
                  onClick={() =>
                    updateQuantity(
                      index,
                      item.quantity + 1
                    )
                  }
                >
                  +
                </button>

                <button
                  onClick={() =>
                    removeFromCart(index)
                  }
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          <h2
            style={{
              color: "#00ff99",
            }}
          >
            Total: ${total.toFixed(2)}
          </h2>

          <button
            onClick={proceedToCheckout}
            style={{
              padding: "14px 24px",
              borderRadius: 10,
              border: "none",
              background:
                "linear-gradient(90deg,#00b7ff,#ff2fd0)",
              color: "#fff",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Proceed To Checkout
          </button>
        </>
      )}
    </main>
  );
}