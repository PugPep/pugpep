"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type CartItem = {
  /*
   * Stable database identifier used by the unified pricing engine.
   *
   * This remains optional temporarily so existing saved carts and
   * product pages continue working while product pages are updated.
   */
  productOptionId?: string;

  name: string;
  slug: string;
  image: string;
  dosage: string;
  purchaseType: "single" | "kit";

  /*
   * These browser prices are for display only.
   * The future server pricing engine will calculate authoritative prices.
   */
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

  /*
   * Browser display subtotal only.
   * Checkout will later replace this with a server-calculated quote.
   */
  total: number;
};

const CartContext =
  createContext<CartContextType | null>(
    null
  );

function normalizePurchaseType(
  value: unknown
): "single" | "kit" {
  return value === "kit"
    ? "kit"
    : "single";
}

function normalizeOptionalString(
  value: unknown
) {
  return typeof value === "string" &&
    value.trim()
    ? value.trim()
    : undefined;
}

function normalizeCartItem(
  item: Partial<CartItem>
): CartItem {
  const currentPrice = Math.max(
    0,
    Number(item.price || 0)
  );

  const regularPrice = Math.max(
    0,
    Number(
      item.regularPrice ??
        currentPrice
    )
  );

  const salePrice = Math.max(
    0,
    Number(
      item.salePrice ??
        currentPrice
    )
  );

  const wasOnSale = Boolean(
    item.wasOnSale ??
      salePrice < regularPrice
  );

  return {
    productOptionId:
      normalizeOptionalString(
        item.productOptionId
      ),

    name:
      typeof item.name === "string"
        ? item.name
        : "",

    slug:
      typeof item.slug === "string"
        ? item.slug
        : "",

    image:
      typeof item.image === "string"
        ? item.image
        : "",

    dosage:
      typeof item.dosage === "string"
        ? item.dosage
        : "",

    purchaseType:
      normalizePurchaseType(
        item.purchaseType
      ),

    price: currentPrice,

    regularPrice,

    salePrice,

    wasOnSale,

    salePercent: Math.max(
      0,
      Number(
        item.salePercent || 0
      )
    ),

    quantity: Math.max(
      1,
      Math.floor(
        Number(
          item.quantity || 1
        )
      )
    ),

    status:
      normalizeOptionalString(
        item.status
      ),

    cost: Math.max(
      0,
      Number(item.cost || 0)
    ),

    maxAvailable:
      item.maxAvailable == null
        ? undefined
        : Math.max(
            0,
            Math.floor(
              Number(
                item.maxAvailable || 0
              )
            )
          ),
  };
}

function itemsMatch(
  existing: CartItem,
  incoming: Omit<
    CartItem,
    "quantity"
  >
) {
  /*
   * Once both items have a product-option ID, that ID becomes
   * the primary identity for cart merging.
   */
  if (
    existing.productOptionId &&
    incoming.productOptionId
  ) {
    return (
      existing.productOptionId ===
      incoming.productOptionId
    );
  }

  /*
   * Temporary fallback for older carts and product pages that
   * have not yet been updated to pass productOptionId.
   */
  return (
    existing.slug ===
      incoming.slug &&
    existing.dosage ===
      incoming.dosage &&
    existing.purchaseType ===
      incoming.purchaseType
  );
}

export function CartProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [cart, setCart] =
    useState<CartItem[]>([]);

  const [hydrated, setHydrated] =
    useState(false);

  useEffect(() => {
    try {
      const savedCart =
        localStorage.getItem(
          "pugpep_cart"
        );

      if (savedCart) {
        const parsed =
          JSON.parse(
            savedCart
          ) as Partial<CartItem>[];

        if (!Array.isArray(parsed)) {
          throw new Error(
            "Saved cart is not an array."
          );
        }

        setCart(
          parsed.map(
            normalizeCartItem
          )
        );
      }
    } catch (error) {
      console.error(
        "Unable to load saved cart:",
        error
      );

      localStorage.removeItem(
        "pugpep_cart"
      );
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    localStorage.setItem(
      "pugpep_cart",
      JSON.stringify(cart)
    );
  }, [cart, hydrated]);

  function addToCart(
    item: Omit<
      CartItem,
      "quantity"
    >,
    quantity = 1
  ) {
    const safeQuantity = Math.max(
      1,
      Math.floor(
        Number(quantity || 1)
      )
    );

    const normalizedIncoming =
      normalizeCartItem({
        ...item,
        quantity: safeQuantity,
      });

    setCart(
      (previousCart) => {
        const existingIndex =
          previousCart.findIndex(
            (cartItem) =>
              itemsMatch(
                cartItem,
                normalizedIncoming
              )
          );

        if (
          existingIndex >= 0
        ) {
          return previousCart.map(
            (
              cartItem,
              index
            ) =>
              index ===
              existingIndex
                ? {
                    ...cartItem,

                    /*
                     * Refresh display metadata while preserving the
                     * accumulated quantity.
                     */
                    ...normalizedIncoming,

                    quantity:
                      cartItem.quantity +
                      safeQuantity,
                  }
                : cartItem
          );
        }

        return [
          ...previousCart,
          normalizedIncoming,
        ];
      }
    );
  }

  function removeFromCart(
    index: number
  ) {
    setCart(
      (previousCart) =>
        previousCart.filter(
          (
            _item,
            itemIndex
          ) =>
            itemIndex !==
            index
        )
    );
  }

  function updateQuantity(
    index: number,
    quantity: number
  ) {
    const safeQuantity =
      Math.floor(
        Number(quantity || 0)
      );

    if (safeQuantity <= 0) {
      removeFromCart(index);
      return;
    }

    setCart(
      (previousCart) =>
        previousCart.map(
          (
            item,
            itemIndex
          ) =>
            itemIndex === index
              ? {
                  ...item,
                  quantity:
                    safeQuantity,
                }
              : item
        )
    );
  }

  function clearCart() {
    setCart([]);

    localStorage.removeItem(
      "pugpep_cart"
    );
  }

  const total = useMemo(
    () =>
      cart.reduce(
        (sum, item) =>
          sum +
          Math.max(
            0,
            Number(
              item.price || 0
            )
          ) *
            Math.max(
              1,
              Number(
                item.quantity ||
                  1
              )
            ),
        0
      ),
    [cart]
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
  const context =
    useContext(CartContext);

  if (!context) {
    throw new Error(
      "useCart must be used inside CartProvider"
    );
  }

  return context;
}