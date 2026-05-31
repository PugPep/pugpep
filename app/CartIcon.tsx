"use client";

import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabaseClient";
import { useCart } from "./cartContext";

export default function CartIcon() {
  const { cart, total } = useCart();

  const router = useRouter();
  const supabase = createClient();

  async function handleCartClick() {
    const { data } = await supabase.auth.getUser();

    if (data.user) {
      router.push("/checkout");
      return;
    }

    router.push("/cart");
  }

  return (
    <button
      onClick={handleCartClick}
      style={{
        marginLeft: "auto",
        color: "#fff",
        background: "linear-gradient(90deg, #00b7ff, #ff2fd0)",
        padding: "8px 12px",
        borderRadius: 10,
        fontWeight: "bold",

        display: "flex",
        alignItems: "center",
        justifyContent: "center",

        whiteSpace: "nowrap",
        flexShrink: 0,

        border: "none",
        cursor: "pointer",
      }}
    >
      🛒 {cart.length} | ${total.toFixed(2)}
    </button>
  );
}