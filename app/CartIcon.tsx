"use client";

import { useCart } from "./cartContext";

export default function CartIcon() {
  const { cart, total } = useCart();
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("pugpep:open-cart"))}
      aria-label={`Open cart: ${count} items, $${total.toFixed(2)}`}
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
      🛒 {count} | ${total.toFixed(2)}
    </button>
  );
}
