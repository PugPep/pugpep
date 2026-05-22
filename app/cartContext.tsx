"use client";

import { createContext, useContext, useEffect, useState } from "react";

type CartItem = {
  name: string;
  slug: string;
  image: string;
  dosage: string;
  purchaseType: "single" | "kit";
  price: number;
  quantity: number;
  status?: string;
};

type CartContextType = {
  cart: CartItem[];

  addToCart: (
    item: Omit<CartItem, "quantity">,
    quantity?: number
  ) => void;

  removeFromCart: (index: number) => void;

  updateQuantity: (
    index: number,
    quantity: number
  ) => void;

  clearCart: () => void;

  total: number;
};

const CartContext = createContext<CartContextType | null>(
  null
);

export function CartProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    const savedCart =
      localStorage.getItem("pugpep_cart");

    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "pugpep_cart",
      JSON.stringify(cart)
    );
  }, [cart]);

  function addToCart(
    item: Omit<CartItem, "quantity">,
    quantity = 1
  ) {
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (cartItem) =>
          cartItem.slug === item.slug &&
          cartItem.dosage === item.dosage &&
          cartItem.purchaseType ===
            item.purchaseType
      );

      if (existingIndex >= 0) {
        return prev.map((cartItem, index) =>
          index === existingIndex
            ? {
                ...cartItem,
                quantity:
                  cartItem.quantity + quantity,
              }
            : cartItem
        );
      }

      return [
        ...prev,
        {
          ...item,
          quantity,
        },
      ];
    });
  }

  function removeFromCart(index: number) {
    setCart((prev) =>
      prev.filter((_, i) => i !== index)
    );
  }

  function updateQuantity(
    index: number,
    quantity: number
  ) {
    if (quantity <= 0) {
      removeFromCart(index);
      return;
    }

    setCart((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, quantity }
          : item
      )
    );
  }

  function clearCart() {
    setCart([]);
    localStorage.removeItem("pugpep_cart");
  }

  const total = cart.reduce(
    (sum, item) =>
      sum + item.price * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        total,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error(
      "useCart must be used inside CartProvider"
    );
  }

  return context;
}