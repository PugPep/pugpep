"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type CartItem = {
  name: string;
  slug: string;
  image: string;
  dosage: string;
  purchaseType: "single" | "kit";
  price: number;
  regularPrice: number;
  salePrice: number;
  wasOnSale: boolean;
  salePercent: number;
  quantity: number;
  status?: string;
  cost?: number;
  maxAvailable?: number;
};

type CartContextType = {
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeFromCart: (index: number) => void;
  updateQuantity: (index: number, quantity: number) => void;
  clearCart: () => void;
  total: number;
};

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("pugpep_cart");
      if (savedCart) {
        const parsed = JSON.parse(savedCart) as Partial<CartItem>[];
        setCart(
          parsed.map((item) => {
            const currentPrice = Number(item.price || 0);
            const regularPrice = Number(item.regularPrice ?? currentPrice);
            const salePrice = Number(item.salePrice ?? currentPrice);
            const wasOnSale = Boolean(item.wasOnSale ?? salePrice < regularPrice);

            return {
              name: item.name || "",
              slug: item.slug || "",
              image: item.image || "",
              dosage: item.dosage || "",
              purchaseType: item.purchaseType === "kit" ? "kit" : "single",
              price: currentPrice,
              regularPrice,
              salePrice,
              wasOnSale,
              salePercent: Number(item.salePercent || 0),
              quantity: Math.max(1, Number(item.quantity || 1)),
              status: item.status,
              cost: Number(item.cost || 0),
              maxAvailable: item.maxAvailable,
            };
          })
        );
      }
    } catch (error) {
      console.error("Unable to load saved cart:", error);
      localStorage.removeItem("pugpep_cart");
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("pugpep_cart", JSON.stringify(cart));
  }, [cart, hydrated]);

  function addToCart(item: Omit<CartItem, "quantity">, quantity = 1) {
    setCart((previousCart) => {
      const existingIndex = previousCart.findIndex(
        (cartItem) =>
          cartItem.slug === item.slug &&
          cartItem.dosage === item.dosage &&
          cartItem.purchaseType === item.purchaseType &&
          cartItem.price === item.price &&
          cartItem.wasOnSale === item.wasOnSale &&
          cartItem.salePercent === item.salePercent
      );

      if (existingIndex >= 0) {
        return previousCart.map((cartItem, index) =>
          index === existingIndex
            ? {
                ...cartItem,
                ...item,
                quantity: cartItem.quantity + quantity,
              }
            : cartItem
        );
      }

      return [...previousCart, { ...item, quantity }];
    });
  }

  function removeFromCart(index: number) {
    setCart((previousCart) => previousCart.filter((_, itemIndex) => itemIndex !== index));
  }

  function updateQuantity(index: number, quantity: number) {
    if (quantity <= 0) {
      removeFromCart(index);
      return;
    }

    setCart((previousCart) =>
      previousCart.map((item, itemIndex) =>
        itemIndex === index ? { ...item, quantity } : item
      )
    );
  }

  function clearCart() {
    setCart([]);
    localStorage.removeItem("pugpep_cart");
  }

  const total = cart.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
    0
  );

  return (
    <CartContext.Provider
      value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, total }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}