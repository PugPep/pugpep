"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "../lib/supabaseClient";
import { trackEvent } from "../lib/trackEvent";

export type CartBundleTier = { quantity: number; discount: number };
export type CartVariant = {
  productOptionId: string;
  purchaseType: "single" | "kit";
  price: number;
  regularPrice: number;
  hasCampaign?: boolean;
  status?: string;
  cost?: number;
  maxAvailable?: number;
  bundleTiers?: CartBundleTier[];
};
export type CartItem = {
  productOptionId?: string;
  name: string;
  slug: string;
  image: string;
  dosage: string;
  purchaseType: "single" | "kit";
  // Per-unit browser display prices. Checkout still validates database prices.
  price: number;
  regularPrice: number;
  salePrice: number;
  wasOnSale: boolean;
  salePercent: number;
  quantity: number;
  status?: string;
  cost?: number;
  maxAvailable?: number;
  basePrice?: number;
  hasCampaign?: boolean;
  bundleTiers?: CartBundleTier[];
  singleOption?: CartVariant;
  kitOption?: CartVariant;
  variantsLoadedAt?: number;
};
type CartContextType = {
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeFromCart: (index: number) => void;
  updateQuantity: (index: number, quantity: number) => void;
  setPurchaseType: (index: number, type: "single" | "kit") => void;
  clearCart: () => void;
  total: number;
};
const CartContext = createContext<CartContextType | null>(null);
const money = (value: number) => Math.round(value * 100) / 100;
const safeNumber = (value: unknown, fallback = 0) => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : fallback;
const count = (value: unknown) => Math.max(1, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(safeNumber(value, 1))));
const text = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : undefined;
const dosageKey = (value: string) => value.toLowerCase().replace(/\s+/g, "");
function normalizeTiers(tiers: CartBundleTier[] | undefined): CartBundleTier[] {
  return Array.isArray(tiers) ? tiers.filter((tier) => tier && Number.isInteger(Number(tier.quantity)) && Number(tier.quantity) > 0
    && Number(tier.quantity) < 10 && Number(tier.discount) > 0 && Number(tier.discount) <= 100)
    .map((tier) => ({ quantity: Number(tier.quantity), discount: Number(tier.discount) })).sort((a, b) => a.quantity - b.quantity) : [];
}
function normalizeVariant(variant?: CartVariant): CartVariant | undefined {
  if (!variant || !text(variant.productOptionId) || !Number.isFinite(Number(variant.price))) return undefined;
  return { productOptionId: variant.productOptionId, purchaseType: variant.purchaseType === "kit" ? "kit" : "single",
    price: money(safeNumber(variant.price)), regularPrice: money(safeNumber(variant.regularPrice, variant.price)),
    hasCampaign: Boolean(variant.hasCampaign), status: text(variant.status), cost: safeNumber(variant.cost),
    maxAvailable: variant.maxAvailable == null ? undefined : Math.floor(safeNumber(variant.maxAvailable)), bundleTiers: normalizeTiers(variant.bundleTiers) };
}
function normalizeCartItem(item: Partial<CartItem>): CartItem {
  const price = money(safeNumber(item.price));
  return applyDisplayPrice({
    productOptionId: text(item.productOptionId), name: item.name || "", slug: item.slug || "", image: item.image || "", dosage: item.dosage || "",
    purchaseType: item.purchaseType === "kit" ? "kit" : "single", price,
    regularPrice: money(safeNumber(item.regularPrice, price)), salePrice: money(safeNumber(item.salePrice, price)),
    wasOnSale: Boolean(item.wasOnSale), salePercent: safeNumber(item.salePercent), quantity: count(item.quantity),
    status: text(item.status), cost: safeNumber(item.cost),
    maxAvailable: item.maxAvailable == null ? undefined : Math.floor(safeNumber(item.maxAvailable)),
    basePrice: money(safeNumber(item.basePrice, price)), hasCampaign: Boolean(item.hasCampaign ?? (item.wasOnSale && price >= safeNumber(item.regularPrice, price))), bundleTiers: normalizeTiers(item.bundleTiers),
    singleOption: normalizeVariant(item.singleOption), kitOption: normalizeVariant(item.kitOption), variantsLoadedAt: safeNumber(item.variantsLoadedAt),
  });
}
function applyDisplayPrice(item: CartItem): CartItem {
  const base = money(safeNumber(item.basePrice, item.price));
  const tiers = item.purchaseType === "single" && item.quantity < 10 && !item.hasCampaign && base >= item.regularPrice
    ? normalizeTiers(item.bundleTiers) : [];
  const tier = tiers.filter((candidate) => item.quantity >= candidate.quantity).at(-1);
  const price = money(base * (1 - (tier?.discount || 0) / 100));
  return { ...item, price, basePrice: base, salePrice: price, wasOnSale: price < item.regularPrice || Boolean(item.hasCampaign),
    salePercent: item.regularPrice > 0 ? money(Math.max(0, (item.regularPrice - price) / item.regularPrice * 100)) : 0 };
}
export function getCartItemTotals(item: CartItem) {
  const quantity = count(item.quantity);
  const total = money(item.price * quantity);
  const tenSingles = item.purchaseType === "kit" && item.singleOption ? money(item.singleOption.regularPrice * 10) : 0;
  const compareWithSingles = item.purchaseType === "kit" && item.price >= item.regularPrice && tenSingles > item.regularPrice;
  const originalTotal = money((compareWithSingles ? tenSingles : item.regularPrice) * quantity);
  const savings = money(Math.max(0, originalTotal - total));
  return { total, originalTotal, savings, compareWithSingles, percent: originalTotal > 0 ? money(savings / originalTotal * 100) : 0,
    vialQuantity: item.purchaseType === "kit" ? quantity * 10 : quantity,
    kitSavings: money(Math.max(0, tenSingles * quantity - total)) };
}
function itemsMatch(existing: CartItem, incoming: Partial<CartItem>) {
  if (existing.productOptionId && incoming.productOptionId) return existing.productOptionId === incoming.productOptionId;
  return existing.slug === incoming.slug && dosageKey(existing.dosage) === dosageKey(incoming.dosage || "") && existing.purchaseType === incoming.purchaseType;
}
function variantAvailable(variant?: CartVariant) {
  return variant && variant.status !== "out of stock" && (variant.maxAvailable == null
    || variant.maxAvailable >= (variant.purchaseType === "kit" ? 10 : 1) || variant.status === "pre-sale");
}
function useVariant(item: CartItem, variant: CartVariant, quantity: number): CartItem {
  return applyDisplayPrice({ ...item, ...variant, quantity: count(quantity), basePrice: variant.price, salePrice: variant.price,
    hasCampaign: Boolean(variant.hasCampaign), bundleTiers: variant.bundleTiers });
}
function automaticKit(item: CartItem): CartItem {
  return item.purchaseType === "single" && item.quantity === 10 && variantAvailable(item.kitOption)
    ? useVariant(item, item.kitOption!, 1) : applyDisplayPrice(item);
}
function consolidate(items: CartItem[]) {
  const result: CartItem[] = [];
  for (const entry of items) {
    const item = automaticKit(entry);
    const index = result.findIndex((current) => itemsMatch(current, item));
    if (index < 0) result.push(item);
    else result[index] = applyDisplayPrice({ ...result[index], ...item, quantity: result[index].quantity + item.quantity });
  }
  return result;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const supabase = useMemo(() => createClient(), []);
  useEffect(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem("pugpep_cart") || "[]");
      if (!Array.isArray(parsed)) throw new Error("Saved cart is not an array.");
      setCart(consolidate(parsed.filter((item) => item && typeof item === "object").map(normalizeCartItem)));
    } catch (error) { console.error("Unable to load saved cart:", error); try { localStorage.removeItem("pugpep_cart"); } catch {} }
    finally { setHydrated(true); }
  }, []);
  useEffect(() => {
    if (hydrated) { try { localStorage.setItem("pugpep_cart", JSON.stringify(cart)); } catch (error) { console.error("Unable to save cart:", error); } }
  }, [cart, hydrated]);

  // Fetch matching variants for older carts and callers that do not send variant metadata.
  // The dependency omits quantity, so every +/- click does not repeat these requests.
  const cartIdentity = Array.from(new Set(cart.map((item) => item.slug + "|" + dosageKey(item.dosage)))).sort().join(";");
  useEffect(() => {
    if (!hydrated || !cartIdentity) return;
    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    const targets = cart.filter((item, index, all) => all.findIndex((other) => other.slug === item.slug && dosageKey(other.dosage) === dosageKey(item.dosage)) === index
      && !(item.variantsLoadedAt && Date.now() - item.variantsLoadedAt < 90000 && (item.singleOption || item.kitOption)));
    async function hydrateVariants(item: CartItem) {
      const [optionResult, inventoryResult] = await Promise.all([
        supabase.from("product_options").select("*").eq("product_slug", item.slug).eq("is_active", true).is("archived_at", null).abortSignal(controller.signal),
        supabase.from("inventory").select("dosage,purchase_type,quantity").eq("product_slug", item.slug).eq("purchase_type", "single").abortSignal(controller.signal),
      ]);
      if (cancelled || controller.signal.aborted) return;
      if (optionResult.error || inventoryResult.error) throw new Error("Cart option details could not be refreshed.");
      const available = Math.max(0, Number((inventoryResult.data || []).find((row) => dosageKey(String(row.dosage)) === dosageKey(item.dosage))?.quantity) || 0);
      const rows = (optionResult.data || []).filter((row) => dosageKey(String(row.dosage)) === dosageKey(item.dosage)
        && (row.purchase_type === "single" || row.purchase_type === "kit"));
      const variants = await Promise.all(rows.map(async (row): Promise<CartVariant> => {
        const { data, error } = await supabase.rpc("get_product_option_campaign_price", { p_product_option_id: row.id }).abortSignal(controller.signal);
        if (error) throw error;
        const campaign = Array.isArray(data) ? data[0] : data;
        const regular = Number(row.price);
        if (!Number.isFinite(regular) || regular < 0) throw new Error("Invalid cart option price.");
        const manual = row.sale_active ? regular * (1 - Math.min(100, Math.max(0, Number(row.sale_percent) || 0)) / 100) : regular;
        const campaignPrice = campaign?.has_campaign ? Number(campaign.sale_unit_price) : regular;
        if (!Number.isFinite(campaignPrice) || campaignPrice < 0) throw new Error("Invalid cart campaign price.");
        return { productOptionId: String(row.id), purchaseType: row.purchase_type as "single" | "kit", price: money(Math.min(regular, manual, campaignPrice)),
          regularPrice: money(regular), hasCampaign: Boolean(campaign?.has_campaign), status: row.status, cost: safeNumber(row.cost), maxAvailable: available,
          bundleTiers: row.bundle_discount_enabled === false ? [] : normalizeTiers([1, 2, 3].map((n) => ({ quantity: Number(row["bundle_qty_" + n]), discount: Number(row["bundle_discount_" + n]) }))) };
      }));
      if (cancelled || controller.signal.aborted) return;
      const singleOption = variants.find((variant) => variant.purchaseType === "single");
      const kitOption = variants.find((variant) => variant.purchaseType === "kit");
      setCart((previous) => consolidate(previous.map((current) => {
        if (current.slug !== item.slug || dosageKey(current.dosage) !== dosageKey(item.dosage)) return current;
        const next = { ...current, singleOption, kitOption, variantsLoadedAt: Date.now() };
        const variant = current.purchaseType === "kit" ? kitOption : singleOption;
        return variant ? useVariant(next, variant, current.quantity) : next;
      })));
    }
    void Promise.allSettled(targets.map(hydrateVariants)).then((results) => {
      clearTimeout(timeoutId);
      if (!cancelled) for (const result of results) if (result.status === "rejected") console.error("Cart pricing refresh failed:", result.reason);
    });
    return () => { cancelled = true; clearTimeout(timeoutId); controller.abort(); };
  }, [cartIdentity, hydrated, supabase]);

  function addToCart(item: Omit<CartItem, "quantity">, quantity = 1) {
    const incoming = normalizeCartItem({ ...item, quantity: count(quantity) });
    void trackEvent({ event_type: "add_to_cart", page_path: typeof window !== "undefined" ? window.location.pathname : undefined,
      product_slug: incoming.slug || undefined, metadata: { product_name: incoming.name, product_option_id: incoming.productOptionId || null,
        dosage: incoming.dosage, purchase_type: incoming.purchaseType, quantity: incoming.quantity, unit_price: incoming.price,
        regular_unit_price: incoming.regularPrice, sale_unit_price: incoming.salePrice, was_on_sale: incoming.wasOnSale, sale_percent: incoming.salePercent } });
    setCart((previous) => {
      const index = previous.findIndex((existing) => itemsMatch(existing, incoming));
      if (index < 0) return consolidate([...previous, incoming]);
      return consolidate(previous.map((existing, position) => position === index ? normalizeCartItem({ ...existing, ...incoming,
        singleOption: incoming.singleOption || existing.singleOption, kitOption: incoming.kitOption || existing.kitOption,
        bundleTiers: incoming.bundleTiers?.length ? incoming.bundleTiers : existing.bundleTiers, quantity: existing.quantity + incoming.quantity }) : existing));
    });
  }
  function removeFromCart(index: number) { setCart((previous) => previous.filter((_item, position) => position !== index)); }
  function updateQuantity(index: number, requested: number) {
    if (!Number.isFinite(requested)) return;
    const quantity = Math.floor(requested);
    setCart((previous) => consolidate(previous.flatMap((item, position) => {
      if (position !== index) return [item];
      if (item.purchaseType === "kit" && quantity < 1 && item.singleOption) return [useVariant(item, item.singleOption, 9)];
      if (quantity <= 0) return [];
      return [automaticKit({ ...item, quantity })];
    })));
  }
  function setPurchaseType(index: number, type: "single" | "kit") {
    setCart((previous) => consolidate(previous.map((item, position) => {
      if (position !== index || item.purchaseType === type) return item;
      const variant = type === "kit" ? item.kitOption : item.singleOption;
      return variantAvailable(variant) ? useVariant(item, variant!, 1) : item;
    })));
  }
  function clearCart() { setCart([]); try { localStorage.removeItem("pugpep_cart"); } catch {} }
  const total = useMemo(() => money(cart.reduce((sum, item) => sum + getCartItemTotals(item).total, 0)), [cart]);
  return <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, setPurchaseType, clearCart, total }}>{children}</CartContext.Provider>;
}
export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
