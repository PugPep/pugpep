"use client";

import Link from "next/link";
import { useCart } from "./cartContext";

export default function CartIcon() {
  const { cart, total } = useCart();

  return (
    <Link
      href="/checkout"
      style={{
  marginLeft: "auto",
  color: "#fff",
  textDecoration: "none",
  background: "linear-gradient(90deg, #00b7ff, #ff2fd0)",
  padding: "8px 12px",
  borderRadius: 10,
  fontWeight: "bold",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  whiteSpace: "nowrap",
  flexShrink: 0,
}}
    >
      🛒 {cart.length} | ${total.toFixed(2)}
    </Link>
  );
}