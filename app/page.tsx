
"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "../lib/supabaseClient";
import { useCart } from "./cartContext";
import {
  getPrimaryStorefrontCampaign,
  loadStorefrontSales,
  type StorefrontSale,
} from "../lib/storefrontCampaigns";

// TEMPORARILY DISABLED FOR PAYMENT PROCESSOR REVIEW.
// Change to true to restore the original homepage hero video.
const ENABLE_HERO_VIDEO = false;

const STOREFRONT_SALE_CACHE_KEY = "pugpep_storefront_sales_v1";
const STOREFRONT_SALE_CACHE_TTL_MS = 5 * 60 * 1000;
const RESEARCH_ACKNOWLEDGMENT_KEY = "pugpep_research_ack_v2";
const CARD_CACHE_KEY = "pugpep_home_cards_v2";
const OPTION_PRICE_CACHE_KEY = "pugpep_home_option_prices_v1";
const CARD_CACHE_TTL = 90 * 1000;
type CachedOptionPrice = { savedAt: number; signature: string; price: number; hasCampaign: boolean };
function optionPriceSignature(option: CatalogOption) {
  return JSON.stringify([option.price, option.sale_active, option.sale_percent, option.purchase_type, option.dosage]);
}
function readRecentCatalogCache<T>(key: string): T | null {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(key) || "null");
    return parsed && typeof parsed.savedAt === "number" && Date.now() - parsed.savedAt < CARD_CACHE_TTL ? parsed.value as T : null;
  } catch { return null; }
}
function saveCatalogCache(key: string, value: unknown) {
  try { sessionStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), value })); } catch {}
}
const CATALOG_CACHE_KEY = "pugpep_home_catalog_v1";

type StorefrontSaleCache = {
  savedAt: number;
  sales: Record<string, StorefrontSale>;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  image: string;
  color: string;
  category: string;
  product_family?: string | null;
  is_new: boolean;
  feature_on_homepage: boolean;
  new_until?: string | null;
  homepage_feature_order?: number | null;
  is_coming_soon?: boolean;
  coming_soon_date?: string | null;
};

type CatalogOption = {
  id: string;
  product_slug: string;
  dosage: string;
  purchase_type: string;
  price: number;
  status: string;
  cost: number;
  is_active?: boolean;
  archived_at?: string | null;
  sale_active: boolean;
  sale_percent: number;
  bundle_discount_enabled?: boolean;
  bundle_qty_1?: number;
  bundle_discount_1?: number;
  bundle_qty_2?: number;
  bundle_discount_2?: number;
  bundle_qty_3?: number;
  bundle_discount_3?: number;
};

type CatalogPricedOption = CatalogOption & { effectivePrice: number | null; hasCampaign?: boolean };

type CatalogStrengthChoice = {
  key: string;
  label: string;
  optionId: string;
  purchaseType: string;
  price: number | null;
  single?: CatalogPricedOption;
  kit?: CatalogPricedOption;
};

type CatalogDetails = {
  choices: CatalogStrengthChoice[];
  strengths: string[];
  startingPrice: number | null;
  coaUrl?: string;
  coaUrlsByStrength: Record<string, string>;
};

function catalogSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}


function homepageCoaTime(row: {test_date?: string | null; created_at?: string | null}): number {
  const value = row.test_date || row.created_at;
  if (!value) return 0;
  const n = Date.parse(value.length === 10 ? `${value}T12:00:00` : value);
  return Number.isFinite(n) ? n : 0;
}
function homepageCoaBase(value: string): string {
  return catalogSlug(value).replace(/(?:research)?(?:nasal)?spray$/, "");
}

function buildCatalogStrengthChoices(
  options: CatalogOption[],
  prices: Map<string, number>,
  failedPrices: Set<string>,
  campaignOptions = new Set<string>()
): CatalogStrengthChoice[] {
  const dosageGroups = new Map<string, CatalogOption[]>();
  for (const option of options) {
    const label = String(option.dosage || "").trim();
    if (!label) continue;
    const key = label.toLowerCase().replace(/\s+/g, "");
    dosageGroups.set(key, [...(dosageGroups.get(key) || []), option]);
  }
  return Array.from(dosageGroups.entries()).map(([key, group]) => {
    const withPrice = (option: CatalogOption | undefined): CatalogPricedOption | undefined => option
      ? { ...option, effectivePrice: failedPrices.has(option.id) ? null : prices.get(option.id) ?? null, hasCampaign: campaignOptions.has(option.id) }
      : undefined;
    const single = withPrice(group.find((item) => item.purchase_type === "single"));
    const kit = withPrice(group.find((item) => item.purchase_type === "kit"));
    const option = single || kit || group[0];
    return {
      key,
      label: option.dosage.trim(),
      single,
      kit,
      optionId: option.id,
      purchaseType: option.purchase_type,
      price: failedPrices.has(option.id) ? null : prices.get(option.id) ?? null,
    };
  }).sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
}

function selectedCatalogStrength(choices: CatalogStrengthChoice[], selectedKey?: string) {
  return choices.find((choice) => choice.key === selectedKey) || choices[0];
}

function catalogPurchaseOption(choice: CatalogStrengthChoice | undefined, requestKit = false) {
  if (!choice) return undefined;
  return requestKit && choice.kit ? choice.kit : choice.single || choice.kit;
}

function cardQuantity(value: number) {
  return Number.isFinite(value) ? Math.max(1, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(value))) : 1;
}

function catalogCampaignResult(data: unknown): Record<string, unknown> | null {
  const value = Array.isArray(data) ? data[0] : data;
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function catalogSalePercent(option: CatalogPricedOption | undefined, matchingSingle?: CatalogPricedOption) {
  // A kit's retail comparison is the price of ten matching single vials.
  // Its stored option.price already includes the standard kit savings.
  const tenSingleRetail = matchingSingle && Number.isFinite(Number(matchingSingle.price))
    ? Math.round(Number(matchingSingle.price) * 1000) / 100 : 0;
  const regular = option?.purchase_type === "kit" && tenSingleRetail > 0
    ? tenSingleRetail : Number(option?.price);
  const current = option?.effectivePrice;
  return current != null && Number.isFinite(regular) && regular > 0 && current < regular
    ? Number(((1 - current / regular) * 100).toFixed(2)) : 0;
}

// Current Offers is exclusively for database-confirmed campaigns on the
// EXACT selected product option (dosage + single/kit). Standard kit savings,
// manually calculated discounts, and cached old prices cannot qualify.
function catalogActivePromotion(option?: CatalogPricedOption): boolean {
  const regular = Number(option?.price);
  const effective = option?.effectivePrice;
  return option?.hasCampaign === true && effective != null
    && Number.isFinite(regular) && regular > 0
    && effective < regular - 0.005;
}

function catalogPromotedChoice(choice: CatalogStrengthChoice): boolean {
  return catalogActivePromotion(choice.single) || catalogActivePromotion(choice.kit);
}

function catalogBundleTiers(option: CatalogPricedOption | undefined, quantity: number) {
  // Bundle tiers are configured on each product option, including kit options.
  // The normal built-in kit savings are not a campaign and do not disable tiers.
  if (!option || option.effectivePrice == null || (option.purchase_type !== "kit" && option.bundle_discount_enabled === false)
    || option.hasCampaign || (option.sale_active && Number(option.sale_percent) > 0)
    || (option.purchase_type === "single" && catalogSalePercent(option) > 0)) return [];
  // A kit is already discounted versus ten singles. Bundle & Save provides
  // ADDITIONAL quantity savings based on kits purchased, not vial count.
  // The three tiers mirror PugPep's single-vial Bundle & Save program.
  if (option.purchase_type === "kit") return [
    { quantity: 3, discount: 2 },
    { quantity: 5, discount: 4 },
    { quantity: 8, discount: 7 },
  ];
  return [
    { quantity: Number(option.bundle_qty_1), discount: Number(option.bundle_discount_1) },
    { quantity: Number(option.bundle_qty_2), discount: Number(option.bundle_discount_2) },
    { quantity: Number(option.bundle_qty_3), discount: Number(option.bundle_discount_3) },
  ].filter((tier) => Number.isInteger(tier.quantity) && tier.quantity > 0
    && (option.purchase_type === "kit" || tier.quantity < 10)
    && Number.isFinite(tier.discount) && tier.discount > 0 && tier.discount <= 100)
    .sort((a, b) => a.quantity - b.quantity);
}

function catalogQuantityQuote(option: CatalogPricedOption | undefined, requestedQuantity: number, matchingSingle?: CatalogPricedOption) {
  if (!option || option.effectivePrice == null || !Number.isFinite(option.effectivePrice)
    || !Number.isFinite(Number(option.price))) return null;
  const quantity = Math.max(1, Math.floor(Number(requestedQuantity) || 1));
  const tier = catalogBundleTiers(option, quantity).filter((item) => quantity >= item.quantity).at(-1);
  const unitPrice = Math.round(option.effectivePrice * (1 - (tier?.discount || 0) / 100) * 100) / 100;
  const total = Math.round(unitPrice * quantity * 100) / 100;
  const regularUnit = Math.round(Number(option.price) * 100) / 100;
  const tenSingleValue = option.purchase_type === "kit" && matchingSingle && Number.isFinite(Number(matchingSingle.price))
    ? Math.round(Number(matchingSingle.price) * 100) / 10 : 0;
  // Always show the full ten-single retail value for a kit, including during a campaign.
  const compareWithSingles = option.purchase_type === "kit" && tenSingleValue > 0;
  const originalUnit = compareWithSingles ? tenSingleValue : regularUnit;
  const originalTotal = Math.round(originalUnit * quantity * 100) / 100;
  const singleComparisonTotal = Math.round(tenSingleValue * quantity * 100) / 100;
  const kitSavings = Math.max(0, Math.round((singleComparisonTotal - total) * 100) / 100);
  const savings = Math.max(0, Math.round((originalTotal - total) * 100) / 100);
  return { quantity, unitPrice, total, originalTotal, savings, compareWithSingles, kitSavings, singleComparisonTotal,
    percent: originalTotal > 0 ? Math.round(savings / originalTotal * 10000) / 100 : 0 };
}

export default function HomePage() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  const { addToCart } = useCart();
  const [cardKitSelections, setCardKitSelections] = useState<Record<string, boolean>>({});
  const [cardQuantities, setCardQuantities] = useState<Record<string, number>>({});
  const [cardMessages, setCardMessages] = useState<Record<string, string>>({});
  const [cardBusy, setCardBusy] = useState<Record<string, boolean>>({});
  const cardPendingRef = useRef(new Set<string>());

  const [ageVerified, setAgeVerified] = useState(true);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [researchConfirmed, setResearchConfirmed] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productLoadError, setProductLoadError] = useState("");
  const productRequestRef = useRef(0);
  const productAbortRef = useRef<AbortController | null>(null);
  const [saleMap, setSaleMap] = useState<Record<string, StorefrontSale>>({});
  const [catalogDetails, setCatalogDetails] = useState<Record<string, CatalogDetails>>({});
  const [selectedCardDosages, setSelectedCardDosages] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("featured");
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [campaignLoading, setCampaignLoading] = useState(true);
  const campaignLoadStartedRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    if (pathname !== "/") return;
    mountedRef.current = true;
    campaignLoadStartedRef.current = false;

    try { setAgeVerified(localStorage.getItem(RESEARCH_ACKNOWLEDGMENT_KEY) === "accepted"); }
    catch { setAgeVerified(false); }

    restoreCachedProducts();
    const cachedCards = readRecentCatalogCache<Record<string, CatalogDetails>>(CARD_CACHE_KEY);
    if (cachedCards && typeof cachedCards === "object" && !Array.isArray(cachedCards)) setCatalogDetails(cachedCards);

    const mediaQuery = window.matchMedia("(max-width: 768px)");

    const updateMobile = () => {
      setIsMobile(mediaQuery.matches);
    };

    updateMobile();
    mediaQuery.addEventListener("change", updateMobile);

    // Load the catalog immediately. Campaign pricing is deliberately
    // separated so it cannot block the initial product render.
    void loadProducts();

    const restoreCatalog = () => {
      if (window.location.pathname !== "/" || !mountedRef.current) return;
      restoreCachedProducts();
      void loadProducts();
    };
    const onPageShow = () => {
      restoreCatalog();
    };
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("popstate", restoreCatalog);
    window.addEventListener("online", restoreCatalog);
    const onVisible = () => { if (document.visibilityState === "visible") restoreCatalog(); };
    document.addEventListener("visibilitychange", onVisible);

    // Restore recent campaign data instantly when available.
    const cachedSales = readCachedSales();
    if (cachedSales) {
      setSaleMap(cachedSales);
      setCampaignLoading(false);
    }

    // Defer the heavier campaign lookup until after the page has had
    // a chance to render. This keeps campaign RPC traffic off the
    // critical path for the homepage.
    const startCampaignLoad = () => {
      void loadCampaignSales();
    };

    let idleId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const browserWindow = window as Window & {
      requestIdleCallback?: (
        callback: () => void,
        options?: { timeout: number }
      ) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (typeof browserWindow.requestIdleCallback === "function") {
      idleId = browserWindow.requestIdleCallback(startCampaignLoad, {
        timeout: 1200,
      });
    } else {
      timeoutId = globalThis.setTimeout(startCampaignLoad, 250);
    }

    return () => {
      mountedRef.current = false;
      productRequestRef.current += 1;
      productAbortRef.current?.abort();
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("popstate", restoreCatalog);
      window.removeEventListener("online", restoreCatalog);
      document.removeEventListener("visibilitychange", onVisible);
      mediaQuery.removeEventListener("change", updateMobile);

      if (
        idleId !== null &&
        typeof browserWindow.cancelIdleCallback === "function"
      ) {
        browserWindow.cancelIdleCallback(idleId);
      }

      if (timeoutId !== null) {
        globalThis.clearTimeout(timeoutId);
      }
    };
  }, [supabase, pathname]);

  function restoreCachedProducts() {
    try {
      const raw = sessionStorage.getItem(CATALOG_CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw) as { savedAt: number; products: Product[] };
        if (typeof cached.savedAt === "number" && Date.now() - cached.savedAt < 24 * 60 * 60 * 1000
          && Array.isArray(cached.products) && cached.products.every((item) => item && typeof item.id === "string"
            && typeof item.slug === "string" && typeof item.name === "string")) {
          setProducts(cached.products);
        }
      }
    } catch { /* Storage is an optional navigation optimization. */ }

  }

  function readCachedSales() {
    try {
      const raw = sessionStorage.getItem(STOREFRONT_SALE_CACHE_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw) as StorefrontSaleCache;

      if (
        !parsed ||
        typeof parsed.savedAt !== "number" ||
        !parsed.sales ||
        Date.now() - parsed.savedAt > STOREFRONT_SALE_CACHE_TTL_MS
      ) {
        sessionStorage.removeItem(STOREFRONT_SALE_CACHE_KEY);
        return null;
      }

      return parsed.sales;
    } catch {
      return null;
    }
  }

  function writeCachedSales(sales: Record<string, StorefrontSale>) {
    try {
      const payload: StorefrontSaleCache = {
        savedAt: Date.now(),
        sales,
      };

      sessionStorage.setItem(
        STOREFRONT_SALE_CACHE_KEY,
        JSON.stringify(payload)
      );
    } catch {
      // Session storage is an optimization only.
    }
  }

  async function loadProducts() {
    if (!mountedRef.current || window.location.pathname !== "/") return;
    const requestId = ++productRequestRef.current;
    productAbortRef.current?.abort();
    setProductsLoading(true);
    setProductLoadError("");
    const isCurrent = () => mountedRef.current && requestId === productRequestRef.current;
    try {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const controller = new AbortController();
        productAbortRef.current = controller;
        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        try {
          const query = supabase.from("products")
            .select("id, name, slug, color, image, category, product_family, is_new, feature_on_homepage, new_until, homepage_feature_order, is_coming_soon, coming_soon_date")
            .eq("is_active", true).order("name", { ascending: true }).abortSignal(controller.signal);
          const timeout = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => {
              controller.abort();
              reject(new Error("Product request timed out."));
            }, 12000);
          });
          const { data, error } = await Promise.race([query, timeout]);
          if (!isCurrent()) return;
          if (error) throw error;
          if (!Array.isArray(data)) throw new Error("Product response did not contain a catalog.");
          const next = data as Product[];
          setProducts(next);
          try { sessionStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), products: next })); }
          catch { /* Catalog loading does not require storage. */ }
          return;
        } catch (error) {
          if (!isCurrent()) return;
          if (attempt === 1) {
            console.error("Product loading failed:", error);
            setProductLoadError("Unable to refresh products. Please try again.");
          }
        } finally {
          if (timeoutId !== undefined) clearTimeout(timeoutId);
          if (productAbortRef.current === controller) productAbortRef.current = null;
        }
      }
    } finally {
      if (isCurrent()) setProductsLoading(false);
    }
  }

  async function loadCampaignSales() {
    if (campaignLoadStartedRef.current) return;
    campaignLoadStartedRef.current = true;

    setCampaignLoading(true);

    try {
      const effectiveSales = await loadStorefrontSales(supabase);

      if (!mountedRef.current) return;

      setSaleMap(effectiveSales);
      writeCachedSales(effectiveSales);
    } catch (error) {
      console.error("Storefront sale loading failed:", error);

      if (!mountedRef.current) return;

      // Keep any valid cached sale map already on screen rather than
      // clearing the UI because one campaign request failed.
      setSaleMap((current) =>
        Object.keys(current).length > 0 ? current : {}
      );
    } finally {
      if (mountedRef.current) {
        setCampaignLoading(false);
      }
    }
  }

  const catalogIdentity = products.map((product) => `${product.id}:${product.slug}`).sort().join("|");
  useEffect(() => {
    if (pathname !== "/" || products.length === 0) return;
    let cancelled = false;
    let publishTimer: ReturnType<typeof setTimeout> | undefined;

    async function loadCatalogDetails() {
      const results = await Promise.allSettled([
        supabase.from("product_options")
          .select("id,product_slug,dosage,purchase_type,price,status,cost,sale_active,sale_percent,bundle_discount_enabled,bundle_qty_1,bundle_discount_1,bundle_qty_2,bundle_discount_2,bundle_qty_3,bundle_discount_3")
          .eq("is_active", true).is("archived_at", null),
        supabase.from("coa_documents")
          .select("product_slug,dosage,file_path,storage_bucket,test_date,created_at,is_current")
          .eq("status", "active")
          .order("test_date", { ascending: false, nullsFirst: false }),
      ]);
      if (cancelled) return;
      const optionsResult = results[0];
      const documentsResult = results[1];
      const options = optionsResult.status === "fulfilled" && !optionsResult.value.error
        ? (optionsResult.value.data || []) as CatalogOption[] : [];
      if (optionsResult.status === "rejected" || optionsResult.value.error) {
        throw new Error("Unable to refresh product options.");
      }
      const documents = documentsResult.status === "fulfilled" && !documentsResult.value.error
        ? documentsResult.value.data || [] : [];
      for (const result of results) {
        if (result.status === "rejected") console.warn("Catalog details unavailable:", result.reason);
        else if (result.value.error) console.warn("Catalog details unavailable:", result.value.error);
      }
      const prices = new Map<string, number>();
      const failedPrices = new Set<string>();
      const campaignOptions = new Set<string>();
      const priceCache = readRecentCatalogCache<Record<string, CachedOptionPrice>>(OPTION_PRICE_CACHE_KEY) || {};
      const optionsBySlug = new Map<string, CatalogOption[]>();
      for (const option of options) {
        const key = catalogSlug(option.product_slug);
        const group = optionsBySlug.get(key) || [];
        group.push(option); optionsBySlug.set(key, group);
        const cached = priceCache[option.id];
        if (cached && Date.now() - cached.savedAt < CARD_CACHE_TTL && cached.signature === optionPriceSignature(option)
          && Number.isFinite(cached.price) && cached.price >= 0) {
          // Price cache improves initial rendering, but an old campaign
          // must NEVER be shown as currently active until RPC revalidates it.
          const regular = Number(option.price);
          const manualPercent = Math.min(100, Math.max(0, Number(option.sale_percent) || 0));
          prices.set(option.id, Math.round((option.sale_active ? regular * (1 - manualPercent / 100) : regular) * 100) / 100);
        }
      }
      const documentsBySlug = new Map<string, (typeof documents)[number][]>();
      for (const document of documents) {
        if (!document.file_path) continue;
        const key = catalogSlug(String(document.product_slug));
        const group = documentsBySlug.get(key) || [];
        group.push(document);
        documentsBySlug.set(key, group);
      }
      function publishCatalog() {
        if (cancelled) return;
      const next: Record<string, CatalogDetails> = {};
      for (const product of products) {
        const key = catalogSlug(product.slug);
        const productOptions = optionsBySlug.get(key) || [];
        const values = productOptions.map((option) => prices.get(option.id)).filter((price): price is number => price !== undefined);
        const ownDocuments = documentsBySlug.get(key) || [];
        const isSpray = canonicalProductCategory(product.category) === "research-sprays";
        const sourceKey = homepageCoaBase(product.slug);
        const sourceDocuments = isSpray && sourceKey !== key ? documentsBySlug.get(sourceKey) || [] : [];
        const productDocuments = [...(sourceDocuments.length ? sourceDocuments : ownDocuments)]
          .sort((a, b) => homepageCoaTime(b) - homepageCoaTime(a));
        const choices = buildCatalogStrengthChoices(productOptions, prices, failedPrices, campaignOptions);
        const coaUrlsByStrength: Record<string, string> = {};

        for (const document of productDocuments) {
          const dosageKey = String(document.dosage || "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "");

          const publicUrl = supabase.storage
            .from(document.storage_bucket || "coas")
            .getPublicUrl(document.file_path).data.publicUrl;

          /*
            productDocuments is ordered by created_at descending.
            The first COA found for each strength is therefore the
            most recently uploaded active certificate.
          */
          if (dosageKey && !coaUrlsByStrength[dosageKey]) {
            coaUrlsByStrength[dosageKey] = publicUrl;
          }
        }

        if (isSpray && productDocuments.length) {
          const newestSource = productDocuments[0];
          const url = supabase.storage.from(newestSource.storage_bucket || "coas")
            .getPublicUrl(newestSource.file_path).data.publicUrl;
          for (const choice of choices) coaUrlsByStrength[choice.key] = url;
        }

        const productLevelDocument =
          productDocuments.find(
            (document) => !String(document.dosage || "").trim()
          );

        const fallbackDocument = isSpray
          ? productDocuments[0]
          : productLevelDocument;

        next[product.slug] = {
          choices,
          strengths: Array.from(new Set(productOptions.map((option) => option.dosage).filter(Boolean)))
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
          startingPrice: !productOptions.some((option) => failedPrices.has(option.id)) && values.length > 0 ? Math.min(...values) : null,
          coaUrl: fallbackDocument
            ? supabase.storage
                .from(fallbackDocument.storage_bucket || "coas")
                .getPublicUrl(fallbackDocument.file_path).data.publicUrl
            : undefined,
          coaUrlsByStrength,
        };
      }
      setCatalogDetails((previous) => {
        for (const product of products) {
          const group = optionsBySlug.get(catalogSlug(product.slug)) || [];
          if (group.some((option) => !prices.has(option.id) && !failedPrices.has(option.id)) && previous[product.slug]) {
            next[product.slug] = previous[product.slug];
          }
        }
        return next;
      });
      }
      publishCatalog();
      function schedulePublish() {
        if (cancelled || publishTimer !== undefined) return;
        publishTimer = setTimeout(() => { publishTimer = undefined; publishCatalog(); }, 80);
      }
      let cursor = 0;
      async function priceWorker() {
        while (cursor < options.length && !cancelled) {
          const option = options[cursor++];
          // Always revalidate campaign membership, including cached options.
          // Otherwise expired kit campaigns can remain in Current Offers.
          const regular = Number(option.price);
          if (!Number.isFinite(regular) || regular < 0) continue;
          const percent = Math.min(100, Math.max(0, Number(option.sale_percent) || 0));
          let price = option.sale_active ? regular * (1 - percent / 100) : regular;
          // The database assignment for this option is authoritative, even
          // when the product-wide sale list is cached or missing this product.
          try {
            const { data, error } = await supabase.rpc("get_product_option_campaign_price", {
              p_product_option_id: option.id,
            });
            if (error) throw error;
            const campaign = catalogCampaignResult(data);
            if (campaign?.has_campaign) {
              campaignOptions.add(option.id);
              const campaignPrice = Number(campaign.sale_unit_price);
              if (!Number.isFinite(campaignPrice) || campaignPrice < 0) throw new Error("Invalid campaign price");
              price = Math.min(price, campaignPrice);
            }
          } catch (error) {
            campaignOptions.delete(option.id);
            failedPrices.add(option.id);
            console.warn("Catalog campaign pricing unavailable:", error);
          }
          const roundedPrice = Math.round(price * 100) / 100;
          prices.set(option.id, roundedPrice);
          if (!failedPrices.has(option.id)) {
            priceCache[option.id] = { savedAt: Date.now(), signature: optionPriceSignature(option), price: roundedPrice,
              hasCampaign: campaignOptions.has(option.id) };
          }
          schedulePublish();
        }
      }
      await Promise.all(Array.from({ length: Math.min(8, options.length) }, () => priceWorker()));
      if (cancelled) return;
      if (publishTimer !== undefined) { clearTimeout(publishTimer); publishTimer = undefined; }
      publishCatalog();
      const currentPrices: Record<string, CachedOptionPrice> = {};
      for (const option of options) if (priceCache[option.id] && !failedPrices.has(option.id)) currentPrices[option.id] = priceCache[option.id];
      saveCatalogCache(OPTION_PRICE_CACHE_KEY, currentPrices);
    }
    void loadCatalogDetails().catch((error) => console.warn("Catalog details unavailable:", error));
    return () => { cancelled = true; if (publishTimer !== undefined) clearTimeout(publishTimer); };
  }, [catalogIdentity, supabase, pathname]);

  useEffect(() => {
    if (pathname === "/" && Object.keys(catalogDetails).length > 0) saveCatalogCache(CARD_CACHE_KEY, catalogDetails);
  }, [catalogDetails, pathname]);

  async function handleProductAccess(
    event: React.MouseEvent<HTMLAnchorElement>,
    productSlug: string,
    destination?: string
  ) {
    event.preventDefault();

    const productPath = destination || `/products/${productSlug}`;

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      try {
        localStorage.setItem(
          "pugpep_redirect_after_login",
          productPath
        );
      } catch {
        // Redirect persistence is a convenience only.
      }

      router.push("/login");
      return;
    }

    router.push(productPath);
  }

  function isProductNew(product: Product) {
    if (!product.is_new) return false;
    if (!product.new_until) return true;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date(`${product.new_until}T23:59:59`);
    return endDate.getTime() >= today.getTime();
  }

  const featuredNewProducts = products
    .filter(
      (product) =>
        product.feature_on_homepage &&
        (isProductNew(product) || product.is_coming_soon)
    )
    .sort((a, b) => {
      const aOrder = a.homepage_feature_order ?? 9999;
      const bOrder = b.homepage_feature_order ?? 9999;

      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.name.localeCompare(b.name);
    });


  const featuredProducts = products
    .filter(
      (product) =>
        product.feature_on_homepage &&
        !product.is_coming_soon
    )
    .sort((a, b) => {
      const aOrder = a.homepage_feature_order ?? 9999;
      const bOrder = b.homepage_feature_order ?? 9999;

      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.name.localeCompare(b.name);
    })
    .slice(0, 6);

  // One sale card per product, showing only strengths that have a genuine
  // option-level promotion. Ordinary kit savings do not qualify.
  const saleProducts = products
    .filter((product) => !product.is_coming_soon &&
      (catalogDetails[product.slug]?.choices || []).some(catalogPromotedChoice))
    .sort((a, b) => a.name.localeCompare(b.name));

  const primaryCampaign = getPrimaryStorefrontCampaign(saleMap);

  const productFamilies = [
    { value: "all", label: "All Research" },
    { value: "individual-peptides", label: "Individual Peptides" },
    { value: "peptide-blends", label: "Peptide Blends" },
    { value: "research-sprays", label: "Research Sprays" },
    { value: "biochemical-compounds", label: "Biochemical Compounds" },
    { value: "laboratory-supplies", label: "Laboratory Supplies" },
  ];

  const researchFamilyThemes: Record<
    string,
    {
      color: string;
      soft: string;
      border: string;
      glow: string;
      cardBackground: string;
    }
  > = {
    all: {
      color: "#00d9ff",
      soft: "rgba(0,217,255,.10)",
      border: "rgba(0,217,255,.72)",
      glow: "rgba(0,217,255,.18)",
      cardBackground:
        "linear-gradient(180deg, rgba(0,217,255,.055), rgba(5,5,7,.96) 62%)",
    },
    "metabolism-research": {
      color: "#ff45d8",
      soft: "rgba(255,69,216,.10)",
      border: "rgba(255,69,216,.72)",
      glow: "rgba(255,69,216,.18)",
      cardBackground:
        "linear-gradient(180deg, rgba(255,69,216,.075), rgba(5,5,7,.96) 62%)",
    },
    "brain-nerve-research": {
      color: "#14b8ff",
      soft: "rgba(20,184,255,.10)",
      border: "rgba(20,184,255,.72)",
      glow: "rgba(20,184,255,.18)",
      cardBackground:
        "linear-gradient(180deg, rgba(20,184,255,.075), rgba(5,5,7,.96) 62%)",
    },
    "cell-energy-research": {
      color: "#00ff99",
      soft: "rgba(0,255,153,.10)",
      border: "rgba(0,255,153,.72)",
      glow: "rgba(0,255,153,.18)",
      cardBackground:
        "linear-gradient(180deg, rgba(0,255,153,.07), rgba(5,5,7,.96) 62%)",
    },
    "peptide-molecular-research": {
      color: "#c455ff",
      soft: "rgba(196,85,255,.10)",
      border: "rgba(196,85,255,.72)",
      glow: "rgba(196,85,255,.18)",
      cardBackground:
        "linear-gradient(180deg, rgba(196,85,255,.075), rgba(5,5,7,.96) 62%)",
    },
    "hormone-signaling-research": {
      color: "#ff9f1a",
      soft: "rgba(255,159,26,.10)",
      border: "rgba(255,159,26,.72)",
      glow: "rgba(255,159,26,.18)",
      cardBackground:
        "linear-gradient(180deg, rgba(255,159,26,.075), rgba(5,5,7,.96) 62%)",
    },
    "lab-materials": {
      color: "#a8b7c9",
      soft: "rgba(168,183,201,.10)",
      border: "rgba(168,183,201,.64)",
      glow: "rgba(168,183,201,.14)",
      cardBackground:
        "linear-gradient(180deg, rgba(168,183,201,.065), rgba(5,5,7,.96) 62%)",
    },
  };

  const categoryThemes: Record<string, string> = {
    "individual-peptides": "peptide-molecular-research",
    "peptide-blends": "cell-energy-research",
    "research-sprays": "brain-nerve-research",
    "biochemical-compounds": "hormone-signaling-research",
    "laboratory-supplies": "lab-materials",
  };

  function getThemeForFamily(value: string) {
    return researchFamilyThemes[categoryThemes[value] || value] || researchFamilyThemes.all;
  }

  function getProductTheme(product: Product) {
    if (isLabMaterialCategory(product.category)) {
      return researchFamilyThemes["lab-materials"];
    }

    return getThemeForFamily(normalizeProductCategory(product.category) || "all");
  }

  function normalizeProductCategory(value?: string | null) {
    return String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[_–—]/g, "-")
      .replace(/\s+/g, " ");
  }

  function canonicalProductCategory(value?: string | null) {
    const category = normalizeProductCategory(value).replace(/\s+/g, "-");
    if (["research-sprays", "research-spray", "sprays", "spray", "nasal-sprays", "nasal-spray"].includes(category)) return "research-sprays";
    if (["laboratory-supplies", "laboratory-materials", "laboratory-material", "lab-materials", "lab-material", "lab-supplies", "lab-supply", "supplies"].includes(category)) return "laboratory-supplies";
    if (["individual-peptides", "individual-peptide", "peptides", "peptide", "research-peptides", "research-peptide"].includes(category)) return "individual-peptides";
    if (["peptide-blends", "peptide-blend", "blends", "blend"].includes(category)) return "peptide-blends";
    if (["biochemical-compounds", "biochemical-compound", "biochemicals"].includes(category)) return "biochemical-compounds";
    return category;
  }

  function isResearchSprayCategory(value?: string | null) {
    const category = normalizeProductCategory(value);

    return (
      category === "spray" ||
      category === "sprays" ||
      category === "nasal-spray" ||
      category === "nasal spray" ||
      category === "research-spray" ||
      category === "research spray" ||
      category === "research sprays" ||
      category === "research-sprays"
    );
  }

  function isLabMaterialCategory(value?: string | null) {
    const category = normalizeProductCategory(value);

    return (
      category === "lab-material" ||
      category === "lab material" ||
      category === "lab-materials" ||
      category === "lab materials" ||
      category === "laboratory-supplies" ||
      category === "laboratory-material" ||
      category === "laboratory material" ||
      category === "laboratory-materials" ||
      category === "laboratory materials"
    );
  }

  function getResearchFamily(product: Product) {
    const savedFamily = String(product.product_family || "")
      .toLowerCase()
      .trim();

    if (savedFamily) {
      return savedFamily;
    }

    const isSpray =
      isResearchSprayCategory(product.category);

    if (!isSpray) {
      return "";
    }

    const identity = `${product.name} ${product.slug}`
      .toLowerCase()
      .replace(/[_–—]/g, "-");

    // Research Sprays: fallback mapping for products that do not yet
    // have product_family populated in the database.
    if (
      identity.includes("semax") ||
      identity.includes("selank") ||
      identity.includes("adamax")
    ) {
      return "brain-nerve-research";
    }

    if (
      identity.includes("nad") ||
      identity.includes("nad+")
    ) {
      return "cell-energy-research";
    }

    if (
      identity.includes("bpc") ||
      identity.includes("kpv")
    ) {
      return "peptide-molecular-research";
    }

    if (
      identity.includes("pt-141") ||
      identity.includes("pt141") ||
      identity.includes("kisspeptin") ||
      identity.includes("mt-2") ||
      identity.includes("mt2") ||
      identity.includes("mt-ii")
    ) {
      return "hormone-signaling-research";
    }

    return "";
  }

  const visibleProducts = products
    .filter((product) => {
      const query = search.trim().toLowerCase();
      const category = canonicalProductCategory(product.category);

      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.slug.toLowerCase().includes(query);

      const isSpray =
        isResearchSprayCategory(product.category);

      const isLabMaterial =
        isLabMaterialCategory(product.category);

      const matchesFilter = filter === "all"
        || (filter === "sale" && (catalogDetails[product.slug]?.choices || []).some(catalogPromotedChoice))
        || (filter === "new" && isProductNew(product))
        || (filter === "research-sprays" && isSpray)
        || (filter === "laboratory-supplies" && isLabMaterial)
        || category === filter;

      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (sort === "az") return a.name.localeCompare(b.name);
      if (sort === "za") return b.name.localeCompare(a.name);

      const aFeatured = a.feature_on_homepage || isProductNew(a) ? 0 : 1;
      const bFeatured = b.feature_on_homepage || isProductNew(b) ? 0 : 1;
      if (aFeatured !== bFeatured) return aFeatured - bFeatured;

      if (a.category === b.category) return a.name.localeCompare(b.name);
      if (a.category === "peptide") return -1;
      if (b.category === "peptide") return 1;
      return 0;
    });

  const saleCount = products.filter(
    (product) => (catalogDetails[product.slug]?.choices || []).some(catalogPromotedChoice)
  ).length;


  const knownFamilyKeys = new Set(productFamilies.slice(1).map((family) => family.value));
  const catalogGroups = [
    ...productFamilies.slice(1).map((family) => ({
      key: family.value,
      title: family.label,
      products: visibleProducts.filter((product) => canonicalProductCategory(product.category) === family.value),
    })),
    { key: "other", title: "Other Research Products",
      products: visibleProducts.filter((product) => !knownFamilyKeys.has(canonicalProductCategory(product.category))) },
  ].filter((group) => group.products.length > 0);

  function viewAllProducts(type = "all", family = "all") {
    setFilter(family !== "all" ? family : type);
    setSearch("");
    document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function changeCatalogQuantity(product: Product, requestedQuantity: number, saleOnly = false) {
    const details = catalogDetails[product.slug];
    const choices = saleOnly ? (details?.choices || []).filter(catalogPromotedChoice) : (details?.choices || []);
    const strength = selectedCatalogStrength(choices, selectedCardDosages[product.slug]);
    const requestedOption = catalogPurchaseOption(strength, cardKitSelections[product.slug]);
    const currentOption = saleOnly && !catalogActivePromotion(requestedOption)
      ? (catalogActivePromotion(strength?.single) ? strength?.single : strength?.kit) : requestedOption;
    if (currentOption?.purchase_type === "kit" && requestedQuantity < 1 && strength?.single) {
      setCardKitSelections((current) => ({ ...current, [product.slug]: false }));
      setCardQuantities((current) => ({ ...current, [product.slug]: 9 }));
      setCardMessages((current) => ({ ...current, [product.slug]: "" }));
      return;
    }
    const nextQuantity = cardQuantity(requestedQuantity);
    const kit = strength?.kit;
    if (nextQuantity === 10 && currentOption?.purchase_type === "single" && kit
      && kit.is_active !== false && !kit.archived_at && kit.status !== "out of stock" && kit.effectivePrice != null) {
      setCardKitSelections((current) => ({ ...current, [product.slug]: true }));
      setCardQuantities((current) => ({ ...current, [product.slug]: 1 }));
      setCardMessages((current) => ({ ...current, [product.slug]: "" }));
      return;
    }
    setCardQuantities((current) => ({ ...current, [product.slug]: nextQuantity }));
    setCardMessages((current) => ({ ...current, [product.slug]: "" }));
  }

  function changeCatalogVialInput(product: Product, requestedVials: number, saleOnly = false) {
    const details = catalogDetails[product.slug];
    const choices = saleOnly ? (details?.choices || []).filter(catalogPromotedChoice) : (details?.choices || []);
    const strength = selectedCatalogStrength(choices, selectedCardDosages[product.slug]);
    const requestedOption = catalogPurchaseOption(strength, cardKitSelections[product.slug]);
    const currentOption = saleOnly && !catalogActivePromotion(requestedOption)
      ? (catalogActivePromotion(strength?.single) ? strength?.single : strength?.kit) : requestedOption;
    const vials = cardQuantity(requestedVials);
    if (currentOption?.purchase_type === "kit" && vials < 10 && strength?.single) {
      setCardKitSelections((current) => ({ ...current, [product.slug]: false }));
      setCardQuantities((current) => ({ ...current, [product.slug]: vials }));
      setCardMessages((current) => ({ ...current, [product.slug]: "" }));
      return;
    }
    changeCatalogQuantity(product, currentOption?.purchase_type === "kit" ? Math.max(1, Math.floor(vials / 10)) : vials, saleOnly);
  }

  function resetCardMessage(slug: string) {
    setCardMessages((current) => ({ ...current, [slug]: "" }));
    setCardQuantities((current) => ({ ...current, [slug]: 1 }));
  }

  async function addCatalogProductToCart(product: Product, selected: CatalogPricedOption | undefined) {
    if (!selected || selected.effectivePrice === null || product.is_coming_soon || cardPendingRef.current.has(product.slug)) return;
    const quantity = cardQuantity(cardQuantities[product.slug] ?? 1);
    cardPendingRef.current.add(product.slug);
    setCardBusy((current) => ({ ...current, [product.slug]: true }));
    setCardMessages((current) => ({ ...current, [product.slug]: "" }));
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        try { localStorage.setItem("pugpep_redirect_after_login", `/products/${product.slug}`); } catch {}
        window.location.href = "/login";
        return;
      }
      const [optionResult, inventoryResult] = await Promise.all([
        supabase.from("product_options").select("*").eq("id", selected.id).single(),
        supabase.from("inventory").select("product_slug,dosage,purchase_type,quantity"),
      ]);
      if (optionResult.error) throw optionResult.error;
      if (inventoryResult.error) throw new Error("Unable to check availability. Please try again.");
      const option = optionResult.data as CatalogOption | null;
      if (!option || option.is_active === false || option.archived_at || catalogSlug(option.product_slug) !== catalogSlug(product.slug)
        || !["single", "kit"].includes(option.purchase_type) || option.status === "out of stock") {
        throw new Error("This option is not currently available for purchase.");
      }
      const inventory = (inventoryResult.data || []).find((item) =>
        catalogSlug(String(item.product_slug)) === catalogSlug(option.product_slug)
        && String(item.dosage).toLowerCase().replace(/\s+/g, "") === option.dosage.toLowerCase().replace(/\s+/g, "")
        && item.purchase_type === "single");
      const available = Math.max(0, Number(inventory?.quantity) || 0);
      const maxKits = Math.floor(available / 10);
      if (option.purchase_type === "single" && quantity > available) {
        throw new Error(available > 0 ? `Only ${available} available for this strength.` : "This strength is currently out of stock.");
      }
      if (option.purchase_type === "kit" && maxKits < 1 && option.status !== "pre-sale") {
        throw new Error("This kit is currently unavailable.");
      }
      const { data, error } = await supabase.rpc("get_product_option_campaign_price", { p_product_option_id: option.id });
      if (error) throw new Error("Unable to confirm the current price. Please try again.");
      const regular = Number(option.price);
      if (!Number.isFinite(regular) || regular < 0) throw new Error("This option's price is unavailable.");
      const percent = Math.min(100, Math.max(0, Number(option.sale_percent) || 0));
      const manual = option.sale_active ? regular * (1 - percent / 100) : regular;
      const campaign = catalogCampaignResult(data);
      const campaignPrice = campaign?.has_campaign ? Number(campaign.sale_unit_price) : regular;
      if (!Number.isFinite(campaignPrice) || campaignPrice < 0) throw new Error("Unable to confirm the current price.");
      const basePrice = Math.round(Math.min(regular, manual, campaignPrice) * 100) / 100;
      const selectedForBundle: CatalogPricedOption = {
        ...option, effectivePrice: basePrice, hasCampaign: Boolean(campaign?.has_campaign),
      };
      const eligibleBundleTier = catalogBundleTiers(selectedForBundle, quantity)
        .filter((tier) => quantity >= tier.quantity).at(-1);
      // CartContext calculates quantity discounts as the single source of truth.
      // Send the unbundled option price to avoid double applying Bundle & Save.
      const price = basePrice;
      const kitPresale = option.purchase_type === "kit" && quantity > maxKits;
      addToCart({
        productOptionId: option.id,
        name: product.name, slug: product.slug, image: product.image, dosage: option.dosage,
        price, basePrice, hasCampaign: Boolean(campaign?.has_campaign),
        bundleTiers: catalogBundleTiers(selectedForBundle, quantity),
        regularPrice: regular, salePrice: price,
        wasOnSale: price < regular || Boolean(campaign?.has_campaign),
        salePercent: regular > 0 ? Number((((regular - price) / regular) * 100).toFixed(2)) : 0,
        cost: Number(option.cost) || 0,
        purchaseType: option.purchase_type as "single" | "kit",
        status: kitPresale ? "pre-sale" : option.status,
        maxAvailable: available,
      }, quantity);
      setCatalogDetails((current) => {
        const details = current[product.slug];
        if (!details) return current;
        return { ...current, [product.slug]: { ...details, choices: details.choices.map((choice) => ({
          ...choice,
          price: choice.optionId === option.id ? basePrice : choice.price,
          single: choice.single?.id === option.id ? { ...option, effectivePrice: basePrice, hasCampaign: Boolean(campaign?.has_campaign) } : choice.single,
          kit: choice.kit?.id === option.id ? { ...option, effectivePrice: basePrice, hasCampaign: Boolean(campaign?.has_campaign) } : choice.kit,
        })) } };
      });
      setCardMessages((current) => ({ ...current, [product.slug]: kitPresale
        ? "Added to cart. Some kits are pre-sale and may take up to 2 weeks."
        : "Added to cart." }));
    } catch (error) {
      console.error("Catalog add to cart failed:", error);
      setCardMessages((current) => ({ ...current, [product.slug]: error instanceof Error ? error.message : "Unable to add this item. Please try again." }));
    } finally {
      cardPendingRef.current.delete(product.slug);
      setCardBusy((current) => ({ ...current, [product.slug]: false }));
    }
  }

  function renderCatalogProduct(product: Product, saleOnly = false) {
    const detail = catalogDetails[product.slug];
    // A sale shelf shows ONLY strengths with an actual option-level promotion.
    // Other shelves continue to show every available dosage.
    const choices = saleOnly
      ? (detail?.choices || []).filter(catalogPromotedChoice)
      : (detail?.choices || []);
    const selectedStrength = selectedCatalogStrength(choices, selectedCardDosages[product.slug]);
    const requestedOption = catalogPurchaseOption(selectedStrength, cardKitSelections[product.slug]);
    const selectedOption = saleOnly && !catalogActivePromotion(requestedOption)
      ? (catalogActivePromotion(selectedStrength?.single) ? selectedStrength?.single
        : catalogActivePromotion(selectedStrength?.kit) ? selectedStrength?.kit : undefined)
      : requestedOption;
    const kitSelected = selectedOption?.purchase_type === "kit";
    const quantity = cardQuantities[product.slug] ?? 1;
    const pending = Boolean(cardBusy[product.slug]);
    const kitSalePercent = catalogSalePercent(selectedStrength?.kit, selectedStrength?.single);
    const singleSalePercent = catalogSalePercent(selectedStrength?.single);
    // A badge must describe the selected dosage AND selected purchase type.
    // Do not call an entire product 15% off just because its regular kit saves 15%.
    const offerPercent = catalogActivePromotion(selectedOption)
      ? catalogSalePercent(selectedOption, selectedStrength?.single) : 0;
    const offerBadge = `${Math.round(offerPercent)}% OFF`;
    const bundleTiers = product.is_coming_soon ? [] : catalogBundleTiers(selectedOption, quantity);
    const activeBundleTier = [...bundleTiers].reverse().find((tier) => quantity >= tier.quantity);
    const quantityQuote = catalogQuantityQuote(selectedOption, quantity, selectedStrength?.single);
    const displayedVials = kitSelected ? quantity * 10 : quantity;
    const familyLabel = productFamilies.find((family) => family.value === canonicalProductCategory(product.category))?.label;
    const productPath = `/products/${product.slug}`;
    const selectedCoaUrl =
      (selectedStrength?.key
        ? detail?.coaUrlsByStrength?.[selectedStrength.key]
        : undefined) ||
      (canonicalProductCategory(product.category) === "research-sprays" ? detail?.coaUrl : undefined);
    return (
      <article key={product.id} className="pugpep-product-card">
        <Link href={productPath} className="pugpep-product-image-link"
          onClick={(event) => { void handleProductAccess(event, product.slug); }}
          aria-label={`View ${product.name}`}>
          <img src={product.image || "/pugpep-logo.png"} alt={product.name} loading="lazy" decoding="async" />
          <div className="pugpep-product-badges">
            {product.is_coming_soon ? <span className="pugpep-status-badge">Coming soon</span>
              : isProductNew(product) ? <span className="pugpep-status-badge">New</span> : null}
            {!product.is_coming_soon && offerPercent > 0 && <span className="pugpep-offer-badge">{offerBadge}</span>}
          </div>
        </Link>
        <div className="pugpep-product-info">
          <span className="pugpep-product-family">{familyLabel || "Research Products"}</span>
          <div className="pugpep-product-title-row">
          <Link href={productPath} className="pugpep-product-name"
            onClick={(event) => { void handleProductAccess(event, product.slug); }}>{product.name}</Link>

          </div>
          <div
            className="pugpep-product-strengths"
            role="group"
            aria-label={`Select strength for ${product.name}`}
            style={{
              gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
            }}
          >
            {choices.length ? choices.map((choice) => (
              <button
                key={choice.key}
                type="button"
                className="pugpep-strength-button"
                aria-pressed={selectedStrength?.key === choice.key}
                disabled={product.is_coming_soon || pending}
                onClick={() => {
                  setSelectedCardDosages((current) => ({ ...current, [product.slug]: choice.key }));
                  if (saleOnly) setCardKitSelections((current) => ({
                    ...current, [product.slug]: !catalogActivePromotion(choice.single) && catalogActivePromotion(choice.kit)
                  }));
                  resetCardMessage(product.slug);
                }}
              >
                {choice.label}
              </button>
            )) : <span className="pugpep-option-placeholder">View available options</span>}
          </div>
          <div className="pugpep-purchase-row">
            <div>
              <div className="pugpep-product-price" aria-live="polite" aria-atomic="true">
                {product.is_coming_soon ? "Coming soon" : quantityQuote
                  ? `$${quantityQuote.total.toFixed(2)}` : "View pricing"}
                {!product.is_coming_soon && quantityQuote && quantityQuote.savings > 0 && <>
                  <del className="pugpep-card-original-price" aria-label={`${quantityQuote.compareWithSingles ? "Regular price of matching single vials" : "Original total"} $${quantityQuote.originalTotal.toFixed(2)}`}>
                    ${quantityQuote.originalTotal.toFixed(2)}
                  </del>
                  <span className="pugpep-card-dollar-savings">Save ${quantityQuote.savings.toFixed(2)}</span>
                </>}
              </div>
              {!product.is_coming_soon && quantityQuote && <div className="pugpep-card-price-caption">
                Total for {quantity} {kitSelected ? (quantity === 1 ? "kit (10 vials)" : `kits (${quantity * 10} vials)`)
                  : (quantity === 1 ? "single" : "singles")}
                {quantityQuote.savings > 0 && !quantityQuote.compareWithSingles && <span className="pugpep-card-sale-percent"> · {Math.round(quantityQuote.percent)}% OFF</span>}
              </div>}
              {/* Keep Kit savings in the main price summary; avoid extra rows
                  that make the product card jump when Kit is selected. */}
            </div>

          </div>
          <div className="pugpep-kit-selection-row">
            {selectedStrength?.kit && <button
              type="button"
              className="pugpep-kit-bubble"
              aria-pressed={kitSelected}
              aria-label={`${kitSelected ? "Switch to single vials" : "Select kit"} for ${product.name}`}
              disabled={pending || product.is_coming_soon || !selectedStrength.single ||
                (saleOnly && (!catalogActivePromotion(selectedStrength.kit) || !catalogActivePromotion(selectedStrength.single)))}
              title={kitSalePercent > 0 ? `Kit savings: ${kitSalePercent}%` : "Select kit"}
              onClick={() => {
                setCardKitSelections((current) => ({ ...current, [product.slug]: !kitSelected }));
                resetCardMessage(product.slug);
              }}
            ><span className="pugpep-kit-circle" aria-hidden="true" /><span className="pugpep-kit-label">Kit</span></button>}
            {selectedStrength?.kit && kitSalePercent > 0 && !product.is_coming_soon && (
              <span className="pugpep-kit-selection-hint">{kitSalePercent}% kit savings</span>
            )}
          </div>
          <div className="pugpep-card-buy-row">
            <div className="pugpep-card-quantity" role="group" aria-label={`Quantity for ${product.name}`}>
              <button type="button" aria-label={`Decrease quantity for ${product.name}`} disabled={(!kitSelected && quantity <= 1) || (kitSelected && quantity <= 1 && !selectedStrength?.single) || pending || product.is_coming_soon}
                onClick={() => changeCatalogQuantity(product, quantity - 1, saleOnly)}>−</button>
              <input type="number" min={1} step={kitSelected ? 10 : 1} value={displayedVials} disabled={pending || product.is_coming_soon}
                aria-label={`Vial quantity for ${product.name}`}
                onChange={(event) => changeCatalogVialInput(product, Number(event.target.value), saleOnly)} />
              <button type="button" aria-label={`Increase quantity for ${product.name}`} disabled={pending || product.is_coming_soon}
                onClick={() => changeCatalogQuantity(product, quantity + 1, saleOnly)}>+</button>
            </div>
            <button type="button" className="pugpep-add-button"
              disabled={pending || product.is_coming_soon || selectedOption?.effectivePrice == null}
              onClick={() => { void addCatalogProductToCart(product, selectedOption); }}>
              {pending ? "Adding…" : product.is_coming_soon ? "Coming Soon" : "Add to Cart"}
            </button>
          </div>
          <div className={`pugpep-card-secondary-actions${selectedCoaUrl ? "" : " pugpep-no-coa"}`}>
            <button type="button" className="pugpep-card-cart-button pugpep-cart-mobile"
              onClick={() => window.dispatchEvent(new Event("pugpep:open-cart"))}>View Cart</button>
            {selectedCoaUrl && <a className="pugpep-coa-button pugpep-coa-mobile" href={selectedCoaUrl}
              onClick={(event) => { void handleProductAccess(event, product.slug, selectedCoaUrl); }}
              aria-label={`View current COA for ${product.name}${selectedStrength?.label ? ` ${selectedStrength.label}` : ""}`}>View COA</a>}
          </div>

          <div className={`pugpep-card-bundles${bundleTiers.length === 0 ? " pugpep-card-bundles-empty" : ""}`}>
            {bundleTiers.length > 0 && <span className="pugpep-card-bundle-title">Bundle &amp; Save</span>}
            {bundleTiers.length > 0 && <div className="pugpep-card-bundle-options" role="group" aria-label={`Bundle quantities for ${product.name}`}>
              {bundleTiers.map((tier) => <button key={`${tier.quantity}-${tier.discount}`} type="button"
                aria-label={`Buy ${tier.quantity} for ${tier.discount}% off`}
                aria-pressed={activeBundleTier?.quantity === tier.quantity}
                disabled={pending}
                onClick={() => {
                  changeCatalogQuantity(product, tier.quantity, saleOnly);
                }}>
                <span className="pugpep-bundle-desktop-label">Buy {tier.quantity} · {tier.discount}% off</span>
                <span className="pugpep-bundle-mobile-label">{tier.quantity} · {tier.discount}%</span>
              </button>)}
            </div>}
          </div>
          {cardMessages[product.slug] && <p className="pugpep-card-message" role="status">{cardMessages[product.slug]}</p>}

        </div>
      </article>
    );
  }

  return (
    <main style={page}>
      <style>{`
        .pugpep-shelf { min-width: 0; padding: 22px 0; }
        .pugpep-shelf-header { display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; margin-bottom:18px; }
        .pugpep-shelf-kicker { color:#7df9ff; font-size:10px; font-weight:800; letter-spacing:.15em; }
        .pugpep-shelf-title { margin:5px 0; color:#fff; font-size:clamp(22px,2.4vw,30px); letter-spacing:-.025em; }
        .pugpep-shelf-tools { display:flex; align-items:center; gap:8px; }
        .pugpep-shelf-tools button { border:1px solid #34363e; border-radius:10px; background:#15161d; color:#eee; cursor:pointer; font:inherit; font-size:12px; font-weight:700; padding:10px 13px; min-height:40px; }
        .pugpep-shelf-tools button:disabled { opacity:.3; cursor:default; }
        .pugpep-shelf-tools .pugpep-shelf-arrow { width:40px; padding:8px; font-size:20px; }
        .pugpep-product-row { display:grid; align-items:stretch; grid-auto-flow:column; grid-auto-columns:max(270px,calc((100% - 64px) / 4.25)); gap:16px; overflow-x:auto; scroll-snap-type:x proximity; scroll-padding:2px; padding:4px 2px 16px; scrollbar-width:thin; scrollbar-color:#4c505b #13141a; overscroll-behavior-x:contain; }
        .pugpep-product-row > * { scroll-snap-align:start; }
        .pugpep-product-grid { display:grid; align-items:stretch; grid-template-columns:repeat(4,minmax(0,1fr)); gap:18px; }
        .pugpep-product-card { min-width:0; border:1px solid #30323a; border-radius:16px; overflow:hidden; background:#14151c; display:flex; flex-direction:column; box-shadow:0 10px 24px rgba(0,0,0,.16); transition:border-color .18s ease; }
        .pugpep-product-card:hover { border-color:#7df9ff; }
        .pugpep-product-image-link { position:relative; display:block; width:100%; aspect-ratio:4 / 5; background:#14151c; overflow:hidden; }
        /* Portrait product photography fills the card without side letterboxing. */
        .pugpep-product-image-link img { display:block; width:100%; height:100%; object-fit:cover; object-position:center center; }
        .pugpep-product-badges { position:absolute; top:10px; left:10px; right:10px; display:flex; flex-wrap:wrap; justify-content:space-between; gap:5px; pointer-events:none; }
        .pugpep-status-badge, .pugpep-offer-badge { border-radius:7px; padding:6px 8px; font-size:10px; font-weight:850; background:#181a22; color:#fff; box-shadow:0 2px 8px #0002; }
        .pugpep-offer-badge { background:#d3ff69; color:#182000; margin-left:auto; }
        .pugpep-product-info { padding:16px; display:flex; flex:1; flex-direction:column; }
        /* Unified neutral product typography without changing button contrast. */
        .pugpep-product-info .pugpep-product-family, .pugpep-product-info .pugpep-product-name, .pugpep-product-info .pugpep-card-price-caption, .pugpep-product-info .pugpep-card-sale-percent, .pugpep-product-info .pugpep-card-dollar-savings, .pugpep-product-info .pugpep-card-bundle-title, .pugpep-product-info .pugpep-card-original-price, .pugpep-product-info .pugpep-purchase-type, .pugpep-product-info .pugpep-kit-sale-hint, .pugpep-product-info .pugpep-card-message { color:#fff; }
        .pugpep-product-family { color:#fff; font-size:10px; letter-spacing:.10em; text-transform:uppercase; font-weight:800; }
        .pugpep-product-title-row { display:flex; align-items:flex-start; gap:8px; margin-top:8px; }
        .pugpep-product-name { flex:1; min-width:0; display:block; color:#fff; font-size:19px; font-weight:800; line-height:1.25; text-decoration:none; margin:0; min-height:48px; overflow-wrap:anywhere; }
        .pugpep-product-strengths { display:flex; flex-wrap:wrap; align-content:flex-start; gap:4px; color:#aeb3c2; font-size:12px; line-height:1.5; margin:10px 0 14px; min-height:36px; }
        .pugpep-strength-button { padding:5px 5px; white-space:nowrap; min-height:32px; border:1px solid #414550; border-radius:7px; background:#1b1e27; color:#c8cddb; font:inherit; font-size:12px; font-weight:700; cursor:pointer; }
        .pugpep-strength-button[aria-pressed="true"] { color:#061f26; background:#7df9ff; border-color:#7df9ff; }
        .pugpep-strength-button:hover:not(:disabled) { border-color:#7df9ff; }
        .pugpep-strength-button:focus-visible { outline:3px solid #ff75df; outline-offset:2px; }
        .pugpep-strength-button:disabled { cursor:default; opacity:.55; }
        .pugpep-option-placeholder { padding-top:5px; }
        .pugpep-product-price { margin:0; color:#fff; font-size:26px; font-weight:850; display:flex; align-items:baseline; gap:7px; flex-wrap:wrap; }
        .pugpep-card-price-caption { color:#aeb3c2; font-size:11px; margin-top:3px; }
        .pugpep-card-price-caption .pugpep-card-sale-percent { color:#b5ff85; font-weight:800; }
        .pugpep-product-price > .pugpep-card-dollar-savings { color:#b5ff85; font-size:12px; font-weight:800; white-space:nowrap; }
        .pugpep-card-original-price { color:#aeb3c2; font-size:14px; font-weight:500; }
        .pugpep-product-price > .pugpep-card-sale-percent { color:#b5ff85; font-size:12px; font-weight:800; white-space:nowrap; }
        .pugpep-card-bundles { margin-top:10px; display:grid; gap:6px; }
        .pugpep-card-bundle-title { font-size:13px; font-weight:800; color:#c6edee; }
        /* Keep all three bundle tiers inside each product card at every viewport. */
        .pugpep-product-info { container-type:inline-size; }
        .pugpep-card-bundle-options { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:5px; width:100%; min-width:0; box-sizing:border-box; }
        .pugpep-card-bundle-options > button { min-width:0; max-width:100%; overflow:hidden; }
        /* Compact labels are based on CARD width, not just the screen width. */
        @container (max-width: 420px) {
          .pugpep-card-bundle-options { gap:3px !important; }
          .pugpep-card-bundle-options > button { padding:5px 1px !important; font-size:clamp(9px,2.2vw,11px) !important; }
          .pugpep-bundle-desktop-label { display:none !important; }
          .pugpep-bundle-mobile-label { display:inline !important; }
        }
        .pugpep-card-bundle-options button { flex:1 1 0; min-width:0; box-sizing:border-box; white-space:nowrap; padding:7px 4px; min-height:34px; font:inherit; font-size:12px; font-weight:700; border:1px solid #454956; border-radius:6px; background:#1d212b; color:#dce5f0; cursor:pointer; }
        .pugpep-card-bundle-options button[aria-pressed="true"] { color:#062027; background:#7df9ff; border-color:#7df9ff; }
        .pugpep-card-bundle-options button:disabled { opacity:.5; cursor:default; }
        .pugpep-card-bundle-options button:focus-visible { outline:3px solid #ff75df; outline-offset:2px; }
        .pugpep-bundle-mobile-label { display:none; }
        .pugpep-card-bundles-empty { display:none; }
        .pugpep-product-price > span { color:#aeb3c2; font-size:12px; font-weight:500; }
        .pugpep-purchase-row { margin-top:0; margin-bottom:12px; display:flex; flex-direction:column; align-items:stretch; gap:8px; }
        .pugpep-purchase-controls { display:flex; align-items:center; justify-content:space-between; gap:8px; min-width:0; }
        .pugpep-purchase-type { display:flex; align-items:center; gap:6px; font-size:14px; color:#afb7c8; }
        .pugpep-purchase-type label { display:flex; align-items:center; gap:4px; cursor:pointer; color:#e6e9f2; }
        .pugpep-kit-sale-hint { color:#b5ff85; font-size:10px; font-weight:800; }
        .pugpep-purchase-type label { flex-wrap:nowrap; }
        .pugpep-purchase-type input { accent-color:#7df9ff; margin:0; width:16px; height:16px; flex-shrink:0; }
        .pugpep-card-buy-row { display:flex; align-items:stretch; gap:7px; }
        .pugpep-card-quantity { display:flex; flex:0 0 auto; align-items:center; border:0; border-radius:0; background:transparent; overflow:hidden; }
        .pugpep-card-quantity button { width:24px; min-height:38px; border:0; background:transparent; color:#fff; padding:0; cursor:pointer; font-size:16px; }
        .pugpep-card-quantity input { width:32px; min-width:0; background:transparent; border:0; color:#fff; text-align:center; padding:0; font-size:14px; appearance:textfield; -moz-appearance:textfield; }
        .pugpep-card-quantity input::-webkit-inner-spin-button, .pugpep-card-quantity input::-webkit-outer-spin-button { -webkit-appearance:none; margin:0; }
        .pugpep-add-button { flex:1; min-width:0; min-height:40px; border:1px solid #7df9ff; border-radius:8px; background:#7df9ff; color:#052027; padding:8px 7px; cursor:pointer; font:inherit; font-size:15px; white-space:nowrap; line-height:1.15; font-weight:800; }
        .pugpep-add-button:disabled, .pugpep-card-quantity button:disabled { opacity:.5; cursor:default; }
        .pugpep-cart-mobile { display:none; }
        .pugpep-card-cart-button { margin:0 0 0 auto; flex-shrink:0; white-space:nowrap; padding:3px 0; color:#c6cddd; background:transparent; border:0; text-decoration:underline; cursor:pointer; font:inherit; font-size:14px; font-weight:700; }
        .pugpep-card-message { color:#bfe8df; font-size:11px; line-height:1.5; margin:9px 0 0; }
        .pugpep-card-cart-button:focus-visible, .pugpep-card-buy-row button:focus-visible, .pugpep-card-buy-row input:focus-visible { outline:3px solid #ff75df; outline-offset:2px; }
        .pugpep-view-button, .pugpep-coa-button { display:flex; align-items:center; justify-content:center; gap:7px; padding:10px 11px; min-height:40px; box-sizing:border-box; border-radius:9px; font-size:11px; font-weight:800; text-decoration:none; }
        .pugpep-view-button { flex:1; background:#7df9ff; color:#052027; border:1px solid #7df9ff; white-space:nowrap; }
        .pugpep-coa-button { flex-shrink:0; background:transparent; color:#e3e6ef; border:1px solid #444753; white-space:nowrap; padding:5px 7px; min-height:28px; font-size:10px; border-radius:6px; }
        .pugpep-product-card a:focus-visible, .pugpep-shelf button:focus-visible, .pugpep-product-row:focus-visible { outline:3px solid #ff75df; outline-offset:3px; }
        /* Clinical storefront controls: keep existing neon environment, standardize the controls. */
        .pugpep-product-card { --product-accent: #ffffff !important; }
        .pugpep-product-info, .pugpep-product-info :is(span, p, label, strong, small),
        .pugpep-product-name, .pugpep-product-family, .pugpep-product-price,
        .pugpep-card-price-caption, .pugpep-card-dollar-savings,
        .pugpep-card-original-price, .pugpep-card-sale-percent,
        .pugpep-card-bundle-title, .pugpep-card-message,
        .pugpep-kit-sale-hint, .pugpep-purchase-type,
        .pugpep-purchase-type label { color:#fff !important; }
        .pugpep-product-card :is(.pugpep-strength-button, .pugpep-add-button,
          .pugpep-card-cart-button, .pugpep-coa-button,
          .pugpep-card-bundle-options button, .pugpep-card-quantity button) {
          background:#17191f !important; border:1px solid #f5f5f5 !important;
          color:#fff !important; text-decoration:none;
        }
        .pugpep-product-card :is(.pugpep-strength-button, .pugpep-add-button,
          .pugpep-card-cart-button, .pugpep-coa-button,
          .pugpep-card-bundle-options button, .pugpep-card-quantity button):hover:not(:disabled) {
          background:#34363b !important;
        }
        .pugpep-product-card :is(.pugpep-strength-button[aria-pressed="true"],
          .pugpep-card-bundle-options button[aria-pressed="true"]) {
          background:#fff !important; color:#111 !important; border-color:#fff !important;
        }
        .pugpep-product-card :is(.pugpep-strength-button, .pugpep-add-button,
          .pugpep-card-cart-button, .pugpep-coa-button,
          .pugpep-card-bundle-options button, .pugpep-card-quantity button):focus-visible {
          outline:3px solid #fff; outline-offset:2px;
        }
        .pugpep-shelf-tools button { color:#fff; border-color:#fff; }
        .pugpep-shelf-tools button:hover:not(:disabled) { background:#292b32; }
        /* Mobile catalog filters: exact two-row, four-column grid. */
        @media (max-width: 720px) {
          .pugpep-catalog-controls {
            flex-wrap: wrap !important;
            overflow-x: visible !important;
            min-width: 0 !important;
            width: 100%;
            align-items: flex-start !important;
          }
          .pugpep-catalog-filter-list {
            display: grid !important;
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
            grid-template-rows: repeat(2, minmax(42px, auto));
            gap: 6px !important;
            min-width: 0 !important;
            width: 100%;
          }
          .pugpep-catalog-filter-button {
            box-sizing: border-box !important;
            width: 100% !important;
            min-width: 0 !important;
            max-width: 100% !important;
            min-height: 42px !important;
            height: 100% !important;
            padding: 5px 3px !important;
            font-size: clamp(9px, 2.45vw, 11px) !important;
            line-height: 1.12 !important;
            white-space: normal !important;
            overflow-wrap: anywhere;
            text-align: center;
            display: flex !important;
            align-items: center;
            justify-content: center;
            flex: none !important;
          }
        }
        @media(max-width:1100px) { .pugpep-product-row { grid-auto-columns:max(270px,calc((100% - 44px) / 3.2)); } .pugpep-product-grid { grid-template-columns:repeat(3,minmax(0,1fr)); } }
        @media(max-width:900px) { .pugpep-product-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
        @media(max-width:720px) { .pugpep-product-row { grid-auto-columns:max(270px,calc((100% - 20px) / 2.15)); gap:12px; } .pugpep-product-grid { grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; } .pugpep-product-info { padding:12px; } .pugpep-product-name { font-size:17px; } }
        @media(max-width:600px) { .pugpep-product-grid { grid-template-columns:minmax(0,1fr); } }
        @media(max-width:480px) { .pugpep-product-row { grid-auto-columns:max(270px,82%); } .pugpep-product-grid { grid-template-columns:minmax(0,1fr); } .pugpep-shelf-header { gap:8px; } .pugpep-shelf-title { font-size:22px; } }
        @media(prefers-reduced-motion:reduce) { .pugpep-product-card { transition:none; } }

        .category-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
        }

        .catalog-products-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
        }

        .catalog-product-link {
          display: block;
          transition:
            transform 180ms ease,
            filter 180ms ease;
        }

        .catalog-product-link:hover {
          transform: translateY(-4px);
          filter: brightness(1.06);
        }

        .catalog-product-card {
          transition:
            border-color 180ms ease,
            box-shadow 180ms ease;
        }

        .catalog-product-link:hover .catalog-product-card {
          box-shadow:
            0 18px 42px rgba(0,0,0,.48),
            0 0 28px rgba(0,217,255,.08);
        }


        .shop-by-focus-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        }

        @media (max-width: 1100px) {
          .category-grid,
          .shop-by-focus-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }

          .catalog-products-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 720px) {
          .category-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .shop-by-focus-grid .category-card {
            min-height: 0 !important;
            aspect-ratio: 4 / 3;
            background: #050507 !important;
          }

          .shop-by-focus-grid .shop-by-focus-image {
            object-fit: contain !important;
            object-position: center center !important;
            background: #050507;
          }

          .catalog-products-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 420px) {
          .category-grid {
            grid-template-columns: 1fr !important;
          }

          .shop-by-focus-grid .category-card {
            aspect-ratio: 16 / 10;
          }

          .catalog-products-grid {
            grid-template-columns: 1fr !important;
          }
        }


        /* Proof Hits Different: keep desktop layout untouched; on mobile show the
           entire original image with no crop and position the caption below it. */
        @media (max-width: 768px) {
          .pugpep-proof-section {
            display: grid !important;
            grid-template-columns: minmax(0, 1fr) !important;
            gap: 14px !important;
            min-width: 0;
          }
          .pugpep-proof-section > * { min-width: 0; }
          .pugpep-proof-link {
            display: block !important;
            width: 100% !important;
            min-width: 0;
          }
          .pugpep-proof-visual {
            height: auto !important;
            min-height: 0 !important;
            overflow: hidden !important;
          }
          .pugpep-proof-image {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            object-fit: contain !important;
            object-position: center center !important;
            border-radius: 0 !important;
          }
          .pugpep-proof-shade { display: none !important; }
          .pugpep-proof-caption {
            position: relative !important;
            inset: auto !important;
            left: auto !important;
            right: auto !important;
            bottom: auto !important;
            padding: 12px 14px 14px !important;
            background: #080c12 !important;
          }
        }

        /* Uniform dosage buttons: five fixed equal columns for every product card.
           Products with fewer strengths leave the remaining slots empty. */
        .pugpep-product-strengths {
          display: grid !important;
          width: 100%;
          align-content: start;
          gap: 5px;
          margin-top: 12px;
          margin-bottom: 16px;
          min-height: 38px;
        }
        .pugpep-product-strengths .pugpep-strength-button {
          min-width: 0;
          width: 100%;
          box-sizing: border-box;
          min-height: 38px;
          padding: 7px 2px;
          font-size: 13px;
          line-height: 1.15;
          white-space: normal;
          overflow-wrap: anywhere;
          text-align: center;
        }
        .pugpep-product-family { font-size: 12px; }
        .pugpep-product-name { font-size: 20px; }
        .pugpep-product-info .pugpep-card-price-caption { font-size: 13px; line-height: 1.5; }
        .pugpep-product-info .pugpep-card-original-price { font-size: 15px; }
        .pugpep-product-info .pugpep-card-dollar-savings,
        .pugpep-product-info .pugpep-card-sale-percent { font-size: 13px; }
        .pugpep-product-info .pugpep-purchase-type { font-size: 15px; }
        .pugpep-product-info .pugpep-kit-sale-hint { font-size: 12px; }
        .pugpep-product-info .pugpep-card-bundle-title { font-size: 15px; }
        .pugpep-product-info .pugpep-card-message { font-size: 13px; }
        .pugpep-product-card .pugpep-card-bundle-options button {
          font-size: 13px; min-height: 38px;
          padding: 8px 5px;
        }
        .pugpep-product-card .pugpep-coa-button {
          font-size: 12px; min-height: 34px; padding: 7px 9px;
        }
        .pugpep-product-card .pugpep-add-button {
          font-size: 16px; min-height: 44px;
        }
        .pugpep-product-card .pugpep-card-quantity button {
          font-size: 19px; min-height: 44px;
        }
        .pugpep-product-card .pugpep-card-quantity input { font-size: 16px; }
        /* View Cart: slightly larger control, without enlarging it as much as the others. */
        .pugpep-product-card .pugpep-card-cart-button {
          font-size: 14px; min-height: 32px; padding: 5px 9px;
          border-radius: 7px;
        }
        @media (max-width: 720px) {
          .pugpep-product-name { font-size: 19px; }
          .pugpep-product-strengths .pugpep-strength-button { font-size: 12px; }
        }

        /* 2026 mobile polish: original artwork carries category names; no added overlays. */
        .shop-by-focus-grid .category-card {
          border: 0 !important;
          outline: none;
          box-shadow: none !important;
          background: transparent !important;
          padding: 0 !important;
        }
        .shop-by-focus-grid .shop-by-focus-image {
          display: block;
          border: 0 !important;
        }
        .shop-by-focus-grid .category-card:focus-visible {
          outline: 2px solid #7df9ff;
          outline-offset: 3px;
        }
        @media (max-width: 600px) {
          /* Both the full catalog and horizontal shelves display two cards. */
          .pugpep-product-grid { grid-template-columns: repeat(2,minmax(0,1fr)) !important; gap: 10px; }
          .pugpep-product-row {
            grid-auto-columns: calc((100% - 10px) / 2) !important;
            gap: 10px;
          }
          .pugpep-product-card { border-radius: 12px; }
          .pugpep-product-image-link { aspect-ratio: 1 / 1.08; }
          .pugpep-product-info { padding: 9px !important; }
          .pugpep-product-family { font-size: 9px; letter-spacing: .04em; }
          .pugpep-product-title-row { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 5px; }
          .pugpep-product-name { font-size: 14px !important; line-height: 1.25; min-height: 0; }
          .pugpep-product-card .pugpep-coa-button { font-size: 10px; min-height: 32px; padding: 6px 8px; }
          /* Five compact mg selectors across each of the two mobile cards. */
          .pugpep-product-strengths {
            grid-template-columns: repeat(5,minmax(0,1fr)) !important;
            gap: 3px !important;
            margin: 9px 0 !important;
            min-height: 0;
          }
          .pugpep-product-strengths .pugpep-strength-button {
            min-width: 0;
            width: 100%;
            min-height: 32px;
            padding: 5px 0;
            font-size: clamp(8px, 2.15vw, 10px);
            font-weight: 700;
            line-height: 1;
            letter-spacing: -0.35px;
            white-space: nowrap;
            overflow-wrap: normal;
            border-radius: 5px;
          }
          .pugpep-product-price { font-size: 20px; gap: 4px; }
          .pugpep-product-info .pugpep-card-price-caption { font-size: 10px; }
          .pugpep-product-info .pugpep-card-dollar-savings,
          .pugpep-product-info .pugpep-card-sale-percent { font-size: 10px; }
          .pugpep-product-info .pugpep-card-original-price { font-size: 11px; }
          .pugpep-purchase-controls { flex-wrap: wrap; gap: 5px; }
          .pugpep-product-info .pugpep-purchase-type { font-size: 12px; }
          .pugpep-product-card .pugpep-card-cart-button { font-size: 11px; padding: 4px 0; }
          /* Quantity and Add to Cart share a single compact row on mobile. */
          .pugpep-card-buy-row {
            display: grid !important;
            grid-template-columns: minmax(0, 53%) minmax(0, 1fr);
            align-items: stretch;
            gap: 5px;
            width: 100%;
          }
          .pugpep-card-quantity {
            min-width: 0;
            width: 100%;
            display: grid;
            grid-template-columns: minmax(25px, 30%) minmax(0, 1fr) minmax(25px, 30%);
          }
          .pugpep-product-card .pugpep-card-quantity button {
            min-width: 0;
            min-height: 44px;
            width: 100%;
            font-size: 17px;
          }
          .pugpep-product-card .pugpep-card-quantity input {
            min-width: 0;
            min-height: 44px;
            width: 100%;
            font-size: 15px;
          }
          .pugpep-product-card .pugpep-add-button {
            width: 100%;
            min-width: 0;
            min-height: 44px;
            padding: 5px 2px;
            font-size: clamp(10px, 2.65vw, 13px);
            line-height: 1.13;
            white-space: normal;
            text-wrap: balance;
          }
          /* Compact, content-driven mobile cards: no fixed row allocations. */
          .pugpep-product-info {
            display:flex !important;
            flex:0 0 auto !important;
            flex-direction:column;
            align-items:stretch;
            gap:0;
            min-height:0 !important;
            height:auto !important;
          }
          .pugpep-product-family { line-height:14px; }
          .pugpep-product-title-row { margin-top:4px; align-content:start; }
          .pugpep-product-strengths { margin:10px 0 7px !important; min-height:0; align-content:start; }
          .pugpep-purchase-row { margin:0 0 8px !important; gap:5px; }
          .pugpep-purchase-controls { gap:4px; align-items:center; }
          .pugpep-purchase-type { min-width:0; flex-wrap:wrap; gap:3px; }
          .pugpep-purchase-type label { gap:3px; }
          .pugpep-card-buy-row { margin:0 !important; min-width:0; }
          .pugpep-cart-desktop { display:none !important; }
          .pugpep-product-card .pugpep-cart-mobile {
            display:block !important;
            width:100%;
            min-height:31px;
            margin:5px 0 0 !important;
            padding:5px 6px !important;
            box-sizing:border-box;
            border:1px solid #4c5260;
            border-radius:7px;
            text-align:center;
            text-decoration:none;
            background:transparent;
            color:#fff;
            font-size:11px;
          }
          .pugpep-card-bundles { display:grid !important; gap:4px; margin:8px 0 0 !important; min-height:0 !important; }
          .pugpep-card-bundles-empty { display:none !important; }
          .pugpep-card-bundle-options { display:grid !important; grid-template-columns:repeat(3,minmax(0,1fr)); gap:3px !important; flex-wrap:nowrap !important; min-width:0; }
          .pugpep-product-card .pugpep-card-bundle-options button {
            display:flex; align-items:center; justify-content:center;
            min-width:0; width:100%; box-sizing:border-box;
            min-height:32px; padding:4px 1px;
            font-size:clamp(9px,2.2vw,11px); line-height:1.1;
            white-space:nowrap; letter-spacing:-.2px;
          }
          .pugpep-bundle-desktop-label { display:none; }
          .pugpep-bundle-mobile-label { display:inline; }
          .pugpep-product-info .pugpep-card-bundle-title { font-size:12px; line-height:17px; }
          .pugpep-card-message { margin:6px 0 0; }
          .pugpep-product-price { line-height:1.16; }
          .pugpep-card-price-caption { overflow-wrap:anywhere; }
          .pugpep-product-grid, .pugpep-product-row { align-items:start; }
          .pugpep-product-card { height:auto !important; align-self:start; }
          .pugpep-product-badges { top: 5px; left: 5px; right: 5px; }
          .pugpep-status-badge, .pugpep-offer-badge { padding: 4px 5px; font-size: 9px; }
          .shop-by-focus-grid .category-card { border: 0 !important; box-shadow: none !important; aspect-ratio: 16 / 9 !important; min-height: 0 !important; }
          .shop-by-focus-grid .shop-by-focus-image { object-fit: contain !important; background: transparent !important; }
        }
        /* Extremely narrow devices need room for functional cart controls. */
        @media (max-width: 350px) {
          .pugpep-product-grid { grid-template-columns: 1fr !important; }
          .pugpep-product-row { grid-auto-columns: min(85%,270px) !important; }
        }


        /* Small circular Kit selector with an adjacent label on desktop and mobile. */
        .pugpep-kit-bubble {
          flex:0 0 auto; display:inline-flex; align-items:center; justify-content:center;
          gap:5px; min-width:0; min-height:40px; padding:0 4px;
          border:0; border-radius:0; background:transparent; color:#f7f8fb;
          font:inherit; font-weight:800; font-size:12px; cursor:pointer;
          white-space:nowrap;
        }
        .pugpep-kit-circle {
          display:inline-block; flex:0 0 17px; width:17px; height:17px;
          box-sizing:border-box; border:2px solid #c6cad4; border-radius:50%;
          background:transparent; position:relative;
        }
        .pugpep-kit-bubble[aria-pressed="true"] .pugpep-kit-circle {
          border-color:#7df9ff; background:#7df9ff;
        }
        .pugpep-kit-bubble[aria-pressed="true"] .pugpep-kit-circle::after {
          content:""; position:absolute; width:7px; height:7px;
          top:3px; left:3px; background:#10212a; border-radius:50%;
        }
        .pugpep-kit-bubble:disabled { opacity:.45; cursor:not-allowed; }
        .pugpep-kit-bubble:focus-visible { outline:3px solid #ff75df; outline-offset:2px; border-radius:4px; }
        .pugpep-coa-mobile, .pugpep-card-secondary-actions { display:none; }
        @media (max-width:600px) {
          /* One shared control row with no separate Kit line. */
          .pugpep-product-card .pugpep-purchase-controls { display:none !important; }
          .pugpep-product-card .pugpep-card-buy-row {
            display:flex !important; gap:4px !important; align-items:stretch;
          }
          .pugpep-product-card .pugpep-kit-bubble {
            flex:0 0 auto; min-width:0; min-height:40px;
            padding:0 1px; gap:3px; font-size:10px; border:0; background:transparent;
          }
          .pugpep-product-card .pugpep-kit-circle {
            flex-basis:15px; width:15px; height:15px;
          }
          .pugpep-product-card .pugpep-kit-bubble[aria-pressed="true"] .pugpep-kit-circle::after {
            width:5px; height:5px; top:3px; left:3px;
          }
          .pugpep-product-card .pugpep-card-quantity {
            flex:1 1 42%; width:auto; min-width:0;
            grid-template-columns:minmax(17px,28%) minmax(0,1fr) minmax(17px,28%);
          }
          .pugpep-product-card .pugpep-card-quantity button,
          .pugpep-product-card .pugpep-card-quantity input { min-height:40px; }
          .pugpep-product-card .pugpep-add-button {
            flex:1 1 45%; width:auto; min-width:0;
            min-height:40px; font-size:clamp(9px,2.25vw,12px);
          }
          .pugpep-product-card .pugpep-coa-desktop { display:none !important; }
          .pugpep-product-card .pugpep-product-title-row { min-height:34px; }
          .pugpep-product-card .pugpep-card-secondary-actions {
            display:grid !important; grid-template-columns:repeat(2,minmax(0,1fr));
            gap:5px; width:100%; margin:5px 0 0;
          }
          .pugpep-product-card .pugpep-card-secondary-actions.pugpep-no-coa {
            grid-template-columns:1fr;
          }
          .pugpep-product-card .pugpep-card-secondary-actions .pugpep-cart-mobile,
          .pugpep-product-card .pugpep-card-secondary-actions .pugpep-coa-mobile {
            display:flex !important; margin:0 !important; width:100%; min-width:0;
            min-height:32px; padding:5px 2px !important;
            align-items:center; justify-content:center;
            box-sizing:border-box; border:1px solid #4c5260;
            border-radius:7px; background:transparent; color:#fff;
            font:inherit; font-size:11px; font-weight:800;
            text-decoration:none; white-space:nowrap;
          }
          .pugpep-product-card .pugpep-card-bundles { margin-top:8px !important; }
        }

        /* Quiet trust badge near the Proof section; visible without crowding navigation. */
        .pugpep-veteran-owned { align-self:flex-start; display:inline-flex; align-items:center;
          margin-top:10px; padding:6px 10px; border:1px solid rgba(125,249,255,.34);
          border-radius:999px; background:rgba(0,217,255,.07); color:#b8f5ff;
          font-size:10px; line-height:1.2; font-weight:800; letter-spacing:.10em; }
        /* Keep pricing footprint stable when switching between singles and kits. */
        .pugpep-product-card .pugpep-card-price-caption { overflow-wrap:anywhere; }

        /* Unified shopping control order on mobile AND desktop. */
        .pugpep-product-card .pugpep-product-title-row { align-items:flex-start; min-height:0; }
        .pugpep-product-card .pugpep-coa-desktop,
        .pugpep-product-card .pugpep-cart-desktop { display:none !important; }
        .pugpep-product-card .pugpep-purchase-row { margin-bottom:5px !important; }
        .pugpep-product-card .pugpep-kit-selection-row {
          display:flex; align-items:center; justify-content:space-between;
          gap:6px; min-height:28px; margin:2px 0 6px; width:100%;
        }
        .pugpep-product-card .pugpep-kit-selection-hint {
          font-size:11px; font-weight:700; color:#b5ff85; text-align:right;
        }
        .pugpep-product-card .pugpep-kit-bubble { min-height:28px; padding:0 3px; }
        .pugpep-product-card .pugpep-card-buy-row {
          display:flex !important; flex-direction:row !important;
          align-items:stretch !important; gap:6px !important; margin:0 !important;
        }
        .pugpep-product-card .pugpep-card-quantity { flex:1 1 50%; min-width:0; width:auto; }
        .pugpep-product-card .pugpep-add-button { flex:1 1 50%; min-width:0; width:auto; }
        .pugpep-product-card .pugpep-card-secondary-actions {
          display:grid !important; grid-template-columns:repeat(2,minmax(0,1fr));
          gap:6px; width:100%; margin:6px 0 0 !important;
        }
        .pugpep-product-card .pugpep-card-secondary-actions.pugpep-no-coa { grid-template-columns:1fr; }
        .pugpep-product-card .pugpep-card-secondary-actions .pugpep-cart-mobile,
        .pugpep-product-card .pugpep-card-secondary-actions .pugpep-coa-mobile {
          display:flex !important; width:100%; min-width:0; margin:0 !important;
          align-items:center; justify-content:center; box-sizing:border-box;
          padding:8px 5px; min-height:36px; border:1px solid #4c5260;
          background:transparent; color:#fff; border-radius:7px;
          font-size:11px; font-weight:800; text-decoration:none;
        }
        .pugpep-product-card .pugpep-card-bundles { margin-top:8px !important; }
        @media (max-width:600px) {
          .pugpep-product-card .pugpep-kit-selection-row { min-height:24px; margin:0 0 5px; }
          .pugpep-product-card .pugpep-kit-selection-hint { font-size:9px; }
          .pugpep-product-card .pugpep-kit-bubble { min-height:24px; font-size:11px; }
          .pugpep-product-card .pugpep-card-quantity,
          .pugpep-product-card .pugpep-add-button { flex:1 1 50%; min-width:0; }
          .pugpep-product-card .pugpep-card-secondary-actions { margin-top:5px !important; }
          .pugpep-product-card .pugpep-card-secondary-actions .pugpep-cart-mobile,
          .pugpep-product-card .pugpep-card-secondary-actions .pugpep-coa-mobile {
            font-size:10px; min-height:33px; padding:5px 2px;
          }
        }

        @keyframes campaignGlow {
          0%, 100% {
            box-shadow:
              0 0 20px rgba(255,69,216,.18),
              inset 0 0 18px rgba(0,217,255,.04);
          }
          50% {
            box-shadow:
              0 0 34px rgba(0,255,153,.20),
              inset 0 0 24px rgba(255,69,216,.06);
          }
        }

        /* Edge cleanup: remove the fine light seam visible at the left edge
           of the Proof artwork and Research Sprays on mobile. The source
           artwork remains unchanged; only 1% of its horizontal edges is
           concealed inside the existing rounded, clipped wrappers. */
        .pugpep-proof-link,
        .pugpep-proof-visual,
        .shop-by-focus-grid .category-card {
          overflow: hidden !important;
          border: 0 !important;
          outline: 0;
          box-shadow: none !important;
          background: transparent !important;
        }
        .pugpep-proof-image,
        .shop-by-focus-grid .shop-by-focus-image {
          display: block !important;
          border: 0 !important;
          outline: 0;
          box-shadow: none !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        /* Desktop-only: the two source images have a pale strip at their
           left edge. Conceal the outer 1.5% inside the existing rounded
           clips without moving, reflowing, or cropping any mobile image. */
        /* Keep the sort menu beside the catalog title, not below the filters. */
        @media (max-width: 600px) {
          #catalog h2 { min-width: 0; font-size: clamp(19px, 5.2vw, 26px) !important; }
          #catalog .pugpep-catalog-sort {
            min-height: 36px;
            max-width: 112px;
            padding: 0 7px;
            font-size: 12px;
          }
        }
        @media (min-width: 769px) {
          .pugpep-proof-visual,
          .shop-by-focus-grid .category-card:nth-child(2) {
            overflow: hidden !important;
          }
          .pugpep-proof-visual > .pugpep-proof-image,
          .shop-by-focus-grid .category-card:nth-child(2) > .shop-by-focus-image {
            transform: scaleX(1.03) !important;
            transform-origin: center center !important;
          }
        }
        @media (max-width: 768px) {
          .pugpep-proof-image {
            transform: scaleX(1.02) !important;
            transform-origin: center center !important;
          }
          .shop-by-focus-grid .category-card:nth-child(2) .shop-by-focus-image {
            transform: scaleX(1.02) !important;
            transform-origin: center center !important;
          }
        }

        /* Desktop product shelves: equal-height cards even when bundle tiers
           or a COA are unavailable. Mobile keeps its existing compact layout. */
        @media (min-width: 721px) {
          .pugpep-product-row,
          .pugpep-product-grid { align-items: stretch !important; }
          .pugpep-product-card { height: 100%; align-self: stretch; }
          .pugpep-product-info { flex: 1 1 auto; display:flex; flex-direction:column; }
          .pugpep-product-card .pugpep-card-bundles {
            margin-top: auto !important;
            padding-top: 10px;
            min-height: 71px;
            box-sizing: border-box;
            align-content: end;
          }
          /* Preserve the same bottom-of-card footprint when a product has no bundle. */
          .pugpep-product-card .pugpep-card-bundles-empty {
            display: block !important;
            visibility: hidden;
            pointer-events: none;
          }
          /* Larger labels inside existing buttons: heights/padding stay unchanged. */
          .pugpep-product-card .pugpep-card-secondary-actions .pugpep-cart-mobile,
          .pugpep-product-card .pugpep-card-secondary-actions .pugpep-coa-mobile {
            font-size: 15px !important;
            line-height: 1.15;
          }
          .pugpep-product-card .pugpep-card-bundle-options button {
            font-size: 14px !important;
            line-height: 1.15;
          }
          /* Narrow four-column cards need compact numbers to avoid clipped text. */
          @container (max-width: 420px) {
            .pugpep-product-card .pugpep-card-bundle-options button {
              font-size: 13px !important;
              padding-inline: 1px !important;
            }
          }
        }
      `}</style>

      {!ageVerified && (
        <div style={overlay}>
          <div style={modal}>
            <Image
              src="/pugpep-age-logo.png"
              alt="PUGPEP"
              width={150}
              height={150}
              priority
            />

            <h1 style={{ color: "#ff45d8" }}>PUGPEP Disclaimer</h1>

            <p style={{ color: "#fff", lineHeight: 1.6, fontSize: 17 }}>
              Before accessing the research catalog, please read and affirm each
              requirement below. This acknowledgment is required for first-time visitors
              and does not replace purchaser verification at checkout.
            </p>

            <label style={gateCheckboxRow}>
              <input
                type="checkbox"
                checked={ageConfirmed}
                onChange={(event) => setAgeConfirmed(event.target.checked)}
                style={gateCheckbox}
              />
              <span>
                I confirm that I am 21 years of age or older.
              </span>
            </label>

            <label style={gateCheckboxRow}>
              <input
                type="checkbox"
                checked={researchConfirmed}
                onChange={(event) => setResearchConfirmed(event.target.checked)}
                style={gateCheckbox}
              />
              <span>
                I confirm that I am authorized to obtain laboratory research materials
                for legitimate research purposes only. I understand that
                PUGPEP research products are not for human or veterinary use,
                including consumption, injection, or administration, and I
                will not purchase them for those purposes.
              </span>
            </label>

            <button
              type="button"
              disabled={!ageConfirmed || !researchConfirmed}
              onClick={() => {
                if (!ageConfirmed || !researchConfirmed) return;

                localStorage.setItem(RESEARCH_ACKNOWLEDGMENT_KEY, "accepted");
                setAgeVerified(true);
              }}
              style={{
                ...mainButton,
                opacity:
                  ageConfirmed && researchConfirmed
                    ? 1
                    : 0.45,
                cursor:
                  ageConfirmed && researchConfirmed
                    ? "pointer"
                    : "not-allowed",
              }}
            >
              I Agree &amp; Enter
            </button>
          </div>
        </div>
      )}

      <section style={heroVideoSection}>
        {/* Keep the original desktop/mobile hero videos preserved but disabled.
            After payment approval, set ENABLE_HERO_VIDEO = true to restore them. */}
        {ENABLE_HERO_VIDEO ? (
          isMobile !== null && (
            <video
              key={isMobile ? "mobile-video" : "desktop-video"}
              autoPlay
              muted
              loop
              playsInline
              style={heroVideo}
              src={isMobile ? "/hero-mobile.mp4" : "/hero-desktop.mp4"}
            />
          )
        ) : (
          <picture>
            <source media="(max-width: 768px)" srcSet="/pugpep-hero-mobile.png" />
            <img
              src="/pugpep-hero-desktop.png"
              alt="PugPep — The Future Is Biotech"
              style={
                isMobile
                  ? {
                      ...heroBannerImage,
                      height: "auto",
                      objectFit: "contain" as const,
                      objectPosition: "center top" as const,
                    }
                  : heroBannerImage
              }
              fetchPriority="high"
            />
          </picture>
        )}

        {/* Combined Veteran Owned and research-use notice: image directly below the hero. */}
        <div className="pugpep-combined-notice-banner">
          <img
            src="/pugpep-veteran-research-banner-trimmed.png"
            alt="Veteran Owned — Discipline, Integrity, Service. For Research Purposes Only. Not for Human or Veterinary Use."
            loading="eager"
            decoding="async"
          />

        </div>
      </section>

      <style jsx global>{`
        @media (max-width: 600px) {
          .pugpep-footer-legal { font-size: 12px !important; }
        }
        .pugpep-combined-notice-banner {
          box-sizing: border-box;
          width: 100%;
          padding: 2px clamp(8px, 2vw, 24px);
          background: #000;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .pugpep-combined-notice-banner > img {
          display: block;
          width: 60%;
          max-width: 1320px;
          height: auto;
          object-fit: contain;
        }
        @media (max-width: 768px) {
          .pugpep-combined-notice-banner {
            /* Match the hero image's calc(100% - 32px) mobile width. */
            padding: 2px 16px;
          }
          .pugpep-combined-notice-banner > img {
            width: 100%;
            max-width: none;
          }
        }
      `}</style>

      {featuredNewProducts.length > 0 && (
        <section style={newProductsSection}>
          <ProductShelf id="new-products-row" title="New & Coming Soon" eyebrow="LATEST ADDITIONS"
            products={featuredNewProducts} renderProduct={(product) => renderCatalogProduct(product, filter === "sale")}
            onViewAll={() => viewAllProducts()} />
        </section>
      )}


      <section className="pugpep-proof-section" style={brandIntroSection}>
        <div style={brandIntroCopy}>
          <span style={premiumEyebrow}>WHY PUGPEP</span>
          <h2 style={brandIntroTitle}>Proof Hits Different.</h2>

          <div style={brandPunchLine}>
            <span style={brandPunchDot}>●</span>
            <span>VERIFY IT. TRACE IT. RESEARCH WITH CONFIDENCE.</span>
          </div>

          <div style={brandIntroActions}>
            <button
              type="button"
              onClick={() => {
                setFilter("all");
                document
                  .getElementById("catalog")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              style={primaryMarketingButton}
            >
              EXPLORE THE CATALOG →
            </button>
          </div>
        </div>

        <Link href="/quality" className="pugpep-proof-link" style={brandQualityVisualLink}>
          <div className="pugpep-proof-visual" style={brandQualityVisual}>
            <img
              src="/marketing/lot-specific-coas.png"
              alt="PugPep transparent research quality and testing"
              className="pugpep-proof-image"
              style={brandQualityImage}
            />
          </div>
        </Link>
      </section>

      <section style={categorySection}>
        <div style={sectionLead}>
          <h2 style={premiumSectionTitle}>Explore the PugPep Catalog</h2>

        </div>

        <div className="category-grid shop-by-focus-grid" style={categoryGrid}>
          <button
            type="button"
            onClick={() => {
              setFilter("individual-peptides");
              setSearch("");
              document
                .getElementById("catalog")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="category-card"
            style={categoryCardButton}
          >
            <img
              className="shop-by-focus-image"
              src="/marketing/research-peptides.png"
              alt="PugPep research peptides category"
              style={categoryImage}
            />
          </button>

          <button
            type="button"
            onClick={() => {
              setFilter("research-sprays");
              setSearch("");
              document
                .getElementById("catalog")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="category-card"
            style={categoryCardButton}
          >
            <img
              className="shop-by-focus-image"
              src="/marketing/research-sprays.png"
              alt="PugPep research sprays category"
              style={categoryImage}
            />
          </button>

          <button
            type="button"
            onClick={() => {
              setFilter("laboratory-supplies");
              setSearch("");
              document
                .getElementById("catalog")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="category-card"
            style={categoryCardButton}
          >
            <img
              className="shop-by-focus-image"
              src="/marketing/lab-materials.png"
              alt="PugPep laboratory materials category"
              style={categoryImage}
            />
          </button>

        </div>
      </section>

      {saleProducts.length > 0 && (
        <section id="current-offers" style={saleShowcaseSection} aria-labelledby="current-offers-heading">
          <div className="pugpep-shelf-header">
            <div>
              <h3 id="current-offers-heading" className="pugpep-shelf-title">Current Offers</h3>
            </div>
            <span style={{ color: "#ffffff", fontSize: 12 }}>{saleProducts.length} products on sale</span>
          </div>
          <div className="pugpep-product-grid" style={{ marginTop: 18 }}>
            {saleProducts.map((product) => renderCatalogProduct(product, true))}
          </div>
        </section>
      )}

      {featuredProducts.length > 0 && (
        <section style={newProductsSection}>
          <ProductShelf id="featured-products-row" title="Featured Products"
            products={featuredProducts} renderProduct={(product) => renderCatalogProduct(product, filter === "sale")}
            onViewAll={() => viewAllProducts()} />
        </section>
      )}

      <section id="catalog" style={catalogShell}>
        <div style={catalogHeader}>
          <h2 style={catalogTitle}>Browse the Full Catalog</h2>
          <select
            className="pugpep-catalog-sort"
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            style={sortSelect}
            aria-label="Sort products"
          >
            <option value="featured">Featured</option>
            <option value="az">A–Z</option>
            <option value="za">Z–A</option>
          </select>
        </div>

        <div style={searchSection}>
          <div className="pugpep-catalog-controls" style={catalogControls}>
            <div className="pugpep-catalog-filter-list" style={filterButtons}>
              {[
                { value: "all", label: "All Products" },
                { value: "new", label: "New Products" },
                { value: "sale", label: "Sale" },
                ...productFamilies.slice(1),
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    setFilter(item.value);
                  }}
                  className="pugpep-catalog-filter-button"
                  style={{
                    ...filterButton,
                    border: filter === item.value
                      ? "1px solid #ffffff" : "1px solid rgba(255,255,255,.45)",
                    color: filter === item.value ? "#111111" : "#ffffff",
                    background: filter === item.value
                      ? "#ffffff" : "rgba(255,255,255,.025)",
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>

          </div>

          <div style={catalogSearchWrap}>
            <input
              placeholder="Search products..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={catalogSearchInput}
            />
          </div>

          {campaignLoading && (
            <p style={campaignLoadingText}>Checking active promotions...</p>
          )}
        </div>

        {productLoadError && products.length > 0 && <div role="status" style={{ margin: "12px 0", color: "#d7c7b4", fontSize: 13 }}>
          {productLoadError} <button type="button" disabled={productsLoading} onClick={() => { void loadProducts(); }}
            style={{ background: "transparent", color: "#7df9ff", border: 0, textDecoration: "underline", cursor: "pointer" }}>Retry</button>
        </div>}
        {products.length === 0 && (productsLoading || productLoadError) ? (
          <div style={emptyState} role="status" aria-live="polite">
            <h3 style={emptyTitle}>{productsLoading ? "Loading Products…" : "Products Could Not Be Loaded"}</h3>
            {!productsLoading && <>
              <p style={emptyText}>{productLoadError}</p>
              <button type="button" onClick={() => { void loadProducts(); }} style={emptyButton}>TRY AGAIN</button>
            </>}
          </div>
        ) : visibleProducts.length === 0 ? (
          <div style={emptyState}>
            <h3 style={emptyTitle}>No Products Found</h3>
            <p style={emptyText}>Try another search or clear your filters.</p>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setFilter("all");
                setSort("featured");
              }}
              style={emptyButton}
            >
              RESET CATALOG
            </button>
          </div>
        ) : (
          <div style={groupedCatalog}>
            {catalogGroups.map((group) => (
              <ProductShelf key={group.key} id={`catalog-row-${group.key}`} title={group.title}
                products={group.products} renderProduct={(product) => renderCatalogProduct(product, filter === "sale")}
                onViewAll={() => viewAllProducts("all", knownFamilyKeys.has(group.key) ? group.key : "all")} />
            ))}
          </div>
        )}
      </section>


      <footer style={footer}>
        <div style={footerGrid}>
          <div style={footerColumn}>
            <p style={footerColumnTitle}>
              CUSTOMER SUPPORT
            </p>

            <p style={footerSupportPromise}>
              Veteran-Owned • U.S.-Based • Human Support
            </p>

            <Link href="/account" style={footerLink}>
              My Account
            </Link>

            <Link href="/cart" style={footerLink}>
              Cart
            </Link>

            <Link href="/checkout" style={footerLink}>
              Checkout
            </Link>

            <a
              href="mailto:support@pugpep.com"
              style={footerLink}
            >
              Contact Support
            </a>
          </div>

          <div style={footerColumn}>
            <p style={footerColumnTitle}>
              COMPANY &amp; RESEARCH
            </p>

            <Link href="/about" style={footerLink}>
              About PugPep
            </Link>

            <Link href="/quality" style={footerLink}>
              Quality &amp; Testing
            </Link>

            <Link href="/research-use" style={footerLink}>
              Research Use Policy
            </Link>

            <Link href="/policies" style={footerLink}>
              Legal &amp; Policies
            </Link>
          </div>

          <div style={{ ...footerColumn, gridColumn: "1 / -1" }}>
            <p style={footerColumnTitle}>
              LEGAL &amp; POLICIES
            </p>

            <div style={footerLegalLinks}>
              <Link href="/terms" style={footerLink}>
                Terms &amp; Conditions
              </Link>
              <Link href="/privacy" style={footerLink}>
                Privacy Policy
              </Link>
              <Link href="/refund-policy" style={footerLink}>
                Refund &amp; Return Policy
              </Link>
              <Link href="/shipping-policy" style={footerLink}>
                Shipping &amp; Delivery Policy
              </Link>
              <Link href="/sms-terms" style={footerLink}>
                SMS Terms
              </Link>
            </div>
          </div>
        </div>

        <div style={footerDivider} />

        <p className="pugpep-footer-legal" style={footerResearchNotice}>
          <strong style={{ color: "#ffffff" }}>
            RESEARCH USE ONLY:
          </strong>{" "}
          PugPep products are intended for laboratory research purposes only.
          Not for human or veterinary use.
        </p>

        <p className="pugpep-footer-legal" style={footerText}>
          Information provided on this website is for research and
          informational purposes only and does not constitute medical advice,
          dosing guidance, treatment recommendations, or claims of therapeutic
          benefit. Products are not intended to diagnose, treat, cure, mitigate,
          or prevent disease.
        </p>

        <p className="pugpep-footer-legal" style={footerText}>
          PUGPEP is a chemical supplier. PUGPEP is not a compounding pharmacy
          or chemical compounding facility as defined under 503A of the Federal
          Food, Drug, and Cosmetic Act. PUGPEP is not an outsourcing facility
          as defined under 503B of the Federal Food, Drug, and Cosmetic Act.
        </p>

        <p style={footerCopyright}>
          PUGPEP © 2026 All Rights Reserved
        </p>
      </footer>
    </main>
  );
}

function ProductShelf(props: {
  id: string;
  title: string;
  eyebrow?: string;
  products: Product[];
  renderProduct: (product: Product) => React.ReactNode;
  onViewAll: () => void;
  grid?: boolean;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  useEffect(() => {
    const row = rowRef.current;
    if (!row || props.grid) return;
    const update = () => {
      setCanGoBack(row.scrollLeft > 2);
      setCanGoForward(row.scrollLeft + row.clientWidth < row.scrollWidth - 2);
    };
    update();
    row.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(row);
    return () => { row.removeEventListener("scroll", update); observer.disconnect(); };
  }, [props.products.length, props.grid]);

  function move(direction: number) {
    const row = rowRef.current;
    if (!row) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    row.scrollBy({ left: direction * row.clientWidth * .85, behavior: reduceMotion ? "auto" : "smooth" });
  }
  return (
    <section className="pugpep-shelf" aria-labelledby={`${props.id}-title`}>
      <div className="pugpep-shelf-header">
        <div>
          {props.eyebrow && <span className="pugpep-shelf-kicker">{props.eyebrow}</span>}
          <h3 id={`${props.id}-title`} className="pugpep-shelf-title">{props.title}</h3>
        </div>
        <div className="pugpep-shelf-tools">
          {!props.grid && <>
            <button type="button" onClick={props.onViewAll}>View All</button>
            <button type="button" className="pugpep-shelf-arrow" disabled={!canGoBack} onClick={() => move(-1)}
              aria-label={`Scroll ${props.title} left`} aria-controls={props.id}>‹</button>
            <button type="button" className="pugpep-shelf-arrow" disabled={!canGoForward} onClick={() => move(1)}
              aria-label={`Scroll ${props.title} right`} aria-controls={props.id}>›</button>
          </>}
          <span style={{ color: "#9198a9", fontSize: 12 }}>{props.products.length} products</span>
        </div>
      </div>
      <div
        ref={rowRef}
        id={props.id}
        className={props.grid ? "pugpep-product-grid" : "pugpep-product-row"}
        tabIndex={props.grid ? undefined : 0}
        aria-label={props.title}
        onKeyDown={(event) => {
          if (props.grid || event.target !== event.currentTarget) return;
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault(); move(event.key === "ArrowLeft" ? -1 : 1);
          }
        }}>
        {props.products.map(props.renderProduct)}
      </div>
    </section>
  );
}

function getCategoryLabel(category: string | null | undefined) {
  const normalized = String(category || "").toLowerCase().trim();

  if (normalized === "spray" || normalized === "nasal-spray") {
    return "Spray";
  }

  if (normalized === "lab-material") {
    return "Lab Material";
  }

  return "Research Compound";
}

function QualityItem({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div style={qualityItem}>
      <div style={{ fontSize: 28 }}>{icon}</div>

      <div>
        <h3 style={{ margin: 0, color: "#00d9ff" }}>{title}</h3>

        <p style={{ margin: "6px 0 0", color: "#ccc", lineHeight: 1.4 }}>
          {text}
        </p>
      </div>
    </div>
  );
}

const page = {
  minHeight: "100vh",
  background: "#000",
  color: "#fff",
};

const heroVideoSection = {
  width: "100%",
  background: "#000",
  marginTop: 90,
  position: "relative" as const,
};

const researchBadge = {
  display: "inline-block",
  marginTop: 10,
  padding: "10px 16px",
  border: "1px solid #ff2fbf",
  borderRadius: 12,
  background: "rgba(0,0,0,.45)",
  fontWeight: "bold",
  boxShadow: "0 0 18px rgba(255,45,210,.35)",
};

const campaignBanner = {
  maxWidth: 1320,
  margin: "14px auto 10px",
  padding: 1,
  borderRadius: 16,
  background: "linear-gradient(90deg, #ff45d8, #00d9ff, #00ff99)",
};

const campaignBannerContent = {
  padding: "12px 14px",
  borderRadius: 15,
  background:
    "linear-gradient(135deg, rgba(12,5,16,.98), rgba(4,13,16,.98))",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 9,
  flexWrap: "wrap" as const,
};

const campaignEyebrow = {
  color: "#00ff99",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: ".12em",
};

const campaignTitle = {
  margin: "4px 0 1px",
  color: "#ff75df",
  fontSize: "clamp(18px, 2.8vw, 24px)",
  textTransform: "uppercase" as const,
};

const campaignMessage = {
  margin: "4px 0 0",
  color: "#d6d6dc",
  fontSize: 11,
  fontWeight: 700,
};

const shopSaleButton = {
  minHeight: 28,
  padding: "6px 11px",
  border: "1px solid #00ff99",
  borderRadius: 999,
  background: "rgba(0,255,153,.07)",
  color: "#00ff99",
  fontWeight: 900,
  cursor: "pointer",
};

const showcaseSection = {
  maxWidth: 1280,
  margin: "22px auto 12px",
  padding: "0 16px",
};

const saleShowcaseSection = {
  maxWidth: 1320,
  margin: "24px auto 12px",
  padding: "14px",
  boxSizing: "border-box" as const,
};

const showcaseHeader = {
  marginBottom: 12,
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: 9,
  flexWrap: "wrap" as const,
};

const showcaseEyebrow = {
  color: "#00d9ff",
  fontSize: 10,
  fontWeight: 950,
  letterSpacing: ".13em",
};

const saleShowcaseEyebrow = {
  ...showcaseEyebrow,
  color: "#00ff99",
};

const showcaseTitle = {
  margin: "5px 0 2px",
  color: "#ffffff",
  fontSize: "clamp(21px, 2.4vw, 28px)",
  letterSpacing: "-.02em",
  lineHeight: 1.08,
};

const showcaseText = {
  maxWidth: 720,
  margin: "6px 0 0",
  color: "#b9bbc3",
  fontSize: 11,
  lineHeight: 1.55,
};

const showcaseBrowseButton = {
  minHeight: 42,
  padding: "9px 14px",
  border: "1px solid rgba(0,217,255,.45)",
  borderRadius: 999,
  background: "rgba(0,217,255,.06)",
  color: "#7df9ff",
  fontSize: 10,
  fontWeight: 950,
  letterSpacing: ".04em",
  cursor: "pointer",
};

const saleBrowseButton = {
  ...showcaseBrowseButton,
  border: "1px solid rgba(0,255,153,.48)",
  background: "rgba(0,255,153,.06)",
  color: "#00ff99",
};

const showcaseGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fill, minmax(195px, 1fr))",
  gap: 11,
};

const showcaseCard = {
  position: "relative" as const,
  overflow: "hidden",
  width: "100%",
  height: "auto",
  aspectRatio: "4 / 5",
  minHeight: 0,
  display: "block",
  border: "1px solid",
  borderRadius: 13,
  background: "#050507",
};

const showcaseImageWrap = {
  position: "absolute" as const,
  inset: 0,
  zIndex: 0,
  overflow: "hidden",
  display: "grid",
  placeItems: "center",
  background: "#050507",
};

const showcaseImage = {
  width: "100%",
  height: "100%",
  objectFit: "contain" as const,
  objectPosition: "center",
  padding: 0,
  boxSizing: "border-box" as const,
  transform: "none",
};

const showcaseBody = {
  position: "absolute" as const,
  zIndex: 2,
  left: 0,
  right: 0,
  bottom: 0,
  padding: "26px 10px 10px",
  display: "grid",
  gap: 5,
  alignContent: "end",
  background:
    "linear-gradient(180deg, transparent 0%, rgba(0,0,0,.28) 18%, rgba(0,0,0,.86) 66%, rgba(0,0,0,.97) 100%)",
};

const showcaseCategory = {
  width: "fit-content",
  padding: "4px 7px",
  border: "1px solid rgba(255,255,255,.14)",
  borderRadius: 999,
  color: "#989ba4",
  fontSize: 9,
  fontWeight: 900,
  textTransform: "uppercase" as const,
  letterSpacing: ".04em",
};

const showcaseName = {
  display: "block",
  minHeight: 28,
  fontSize: 11,
  lineHeight: 1.18,
  textTransform: "uppercase" as const,
};

const showcaseSaleBadge = {
  position: "absolute" as const,
  top: 10,
  right: 10,
  zIndex: 5,
  padding: "6px 10px",
  borderRadius: 999,
  border: "2px solid rgba(0,0,0,.85)",
  background: "#ffd400",
  color: "#050505",
  fontSize: 10,
  fontWeight: 1000,
  letterSpacing: ".04em",
  boxShadow:
    "0 3px 12px rgba(0,0,0,.72), 0 0 0 1px rgba(255,255,255,.22)",
};

const showcaseCampaignName = {
  color: "#00ff99",
  fontSize: 10,
  fontWeight: 900,
  textTransform: "uppercase" as const,
};

const newProductsSection = {
  maxWidth: 1320,
  margin: "18px auto 14px",
  padding: "14px",
  boxSizing: "border-box" as const,
  borderRadius: 16,
  background:
    "linear-gradient(135deg, rgba(0,255,153,.045), rgba(0,217,255,.035), rgba(255,69,216,.035))",
};

const newProductsHeader = {
  marginBottom: 10,
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: 8,
  flexWrap: "wrap" as const,
};

const newProductsEyebrow = {
  color: "#00ff99",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: ".12em",
};

const newProductsTitle = {
  margin: "4px 0 1px",
  color: "#7df9ff",
  fontSize: "clamp(20px, 3vw, 28px)",
};

const newProductsText = {
  margin: "4px 0 0",
  color: "#cfcfd5",
  fontSize: 11,
};

const newProductsCount = {
  padding: "5px 8px",
  border: "1px solid rgba(0,255,153,.26)",
  borderRadius: 999,
  color: "#00ff99",
  fontSize: 9,
  fontWeight: 900,
};

const desktopNewProductsLayout = {
  display: "grid",
  gap: 12,
};

const newProductsGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fill, minmax(195px, 1fr))",
  gap: 11,
};

const desktopMoreNewProducts = {
  display: "grid",
  gap: 12,
  paddingTop: 2,
};

const moreNewProductsButton = {
  width: "100%",
  minHeight: 46,
  padding: "10px 14px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  border: "1px solid rgba(0,217,255,.42)",
  borderRadius: 11,
  background:
    "linear-gradient(135deg, rgba(0,217,255,.08), rgba(0,255,153,.04))",
  color: "#7df9ff",
  fontSize: 11,
  fontWeight: 950,
  letterSpacing: ".05em",
  cursor: "pointer",
  boxShadow:
    "0 0 18px rgba(0,217,255,.06)",
};

const moreNewProductsChevron = {
  display: "inline-block",
  fontSize: 15,
  transition: "transform 160ms ease",
};

const expandedNewProductsGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fill, minmax(195px, 1fr))",
  gap: 11,
  paddingTop: 2,
};

const mobileNewProductsLayout = {
  display: "grid",
  gap: 12,
};

const mobileNewProductSelectorLabel = {
  display: "grid",
  gap: 7,
};

const mobileNewProductSelectorTitle = {
  color: "#9fa2aa",
  fontSize: 9,
  fontWeight: 950,
  letterSpacing: ".10em",
};

const mobileNewProductSelect = {
  width: "100%",
  minHeight: 44,
  padding: "0 12px",
  border: "1px solid rgba(0,217,255,.42)",
  borderRadius: 10,
  background: "#08090b",
  color: "#ffffff",
  fontSize: 14,
  fontWeight: 800,
  outline: "none",
  boxSizing: "border-box" as const,
};

const mobileNewProductCard = {
  position: "relative" as const,
  overflow: "hidden",
  width: "100%",
  height: "auto",
  aspectRatio: "4 / 5",
  minHeight: 0,
  display: "block",
  border: "1px solid",
  borderRadius: 16,
  background: "#050507",
  boxShadow:
    "0 10px 26px rgba(0,0,0,.24)",
};

const mobileNewProductImageWrap = {
  position: "absolute" as const,
  inset: 0,
  overflow: "hidden",
  display: "grid",
  placeItems: "center",
  background: "#050507",
};

const mobileNewProductImage = {
  width: "100%",
  height: "100%",
  objectFit: "contain" as const,
  objectPosition: "center",
  display: "block",
  padding: 0,
  boxSizing: "border-box" as const,
};

const newProductCard = {
  position: "relative" as const,
  overflow: "hidden",
  width: "100%",
  height: "auto",
  aspectRatio: "4 / 5",
  minHeight: 0,
  display: "block",
  border: "1px solid",
  borderRadius: 13,
  background: "#050507",
};

const newProductImageWrap = {
  position: "absolute" as const,
  inset: 0,
  overflow: "hidden",
  background: "#050507",
  display: "grid",
  placeItems: "center",
};

const newProductImage = {
  width: "100%",
  height: "100%",
  objectFit: "contain" as const,
  objectPosition: "center",
  display: "block",
  padding: 0,
  boxSizing: "border-box" as const,
  transform: "none",
};

const newProductImageShade = {
  display: "none",
};

const newProductOverlayBody = {
  position: "absolute" as const,
  zIndex: 2,
  left: 0,
  right: 0,
  bottom: 0,
  padding: "28px 10px 10px",
  display: "grid",
  alignContent: "end",
  gap: 5,
};

const newProductBody = {
  padding: 10,
  display: "grid",
  gap: 6,
  alignContent: "start",
};

const newProductName = {
  display: "block",
  minHeight: 28,
  fontSize: 11,
  lineHeight: 1.18,
  textTransform: "uppercase" as const,
};

const newProductCta = {
  display: "block",
  marginTop: 1,
  color: "#00ff99",
  fontSize: 9,
  fontWeight: 900,
};

const comingSoonBadge = {
  position: "absolute" as const,
  top: 9,
  left: 9,
  zIndex: 4,
  padding: "5px 8px",
  border: "1px solid rgba(255,204,0,.65)",
  borderRadius: 999,
  background: "rgba(0,0,0,.78)",
  color: "#ffdf73",
  fontSize: 10,
  fontWeight: 1000,
};

const newBadge = {
  position: "absolute" as const,
  top: 9,
  left: 9,
  zIndex: 4,
  padding: "5px 8px",
  borderRadius: 999,
  background: "linear-gradient(90deg, #00ff99, #00d9ff)",
  color: "#000",
  fontSize: 10,
  fontWeight: 1000,
};

const catalogComingSoonBadge = {
  position: "absolute" as const,
  top: 10,
  left: 10,
  zIndex: 4,
  padding: "5px 8px",
  border: "1px solid rgba(255,204,0,.65)",
  borderRadius: 999,
  background: "rgba(0,0,0,.78)",
  color: "#ffdf73",
  fontWeight: 900,
  fontSize: 10,
};

const catalogNewBadge = {
  position: "absolute" as const,
  top: 10,
  left: 10,
  zIndex: 4,
  padding: "5px 8px",
  borderRadius: 999,
  background: "linear-gradient(90deg, #00ff99, #00d9ff)",
  color: "#000",
  fontWeight: 900,
  fontSize: 10,
};

const discoverBanner = {
  maxWidth: 1320,
  margin: "18px auto 14px",
  padding: "13px 15px",
  borderRadius: 16,
  background:
    "linear-gradient(135deg, rgba(255,45,210,.05), rgba(0,217,255,.04), rgba(124,255,0,.035))",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 9,
  flexWrap: "wrap" as const,
};

const discoverEyebrow = {
  color: "#00d9ff",
  fontSize: 9,
  fontWeight: 900,
  letterSpacing: ".11em",
};

const discoverTitle = {
  margin: "4px 0 0",
  fontSize: "clamp(20px, 3vw, 27px)",
  color: "#ff45d8",
};

const discoverText = {
  maxWidth: 720,
  margin: "5px 0 0",
  color: "#cfd0d5",
  fontSize: 11,
  lineHeight: 1.55,
};

const discoverPoints = {
  display: "flex",
  gap: 5,
  flexWrap: "wrap" as const,
  color: "#00ff99",
  fontSize: 10,
  fontWeight: 900,
};

const familyFilterSection = {
  maxWidth: "1320px",
  margin: "0 auto 24px",
  padding: "26px 28px",
  borderRadius: "20px",
  background:
    "linear-gradient(135deg, rgba(0,217,255,.055), rgba(255,69,216,.035) 48%, rgba(0,255,153,.035))",
  boxShadow: "0 18px 46px rgba(0,0,0,.26)",
} as const;

const familyFilterHeader = {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: "20px",
  marginBottom: "18px",
} as const;

const familyFilterEyebrow = {
  display: "block",
  color: "#00d9ff",
  fontSize: "11px",
  fontWeight: 900,
  letterSpacing: "1.6px",
  marginBottom: "7px",
} as const;

const familyFilterTitle = {
  margin: 0,
  color: "#fff",
  fontSize: "clamp(22px, 3vw, 32px)",
  lineHeight: 1.08,
} as const;

const familyFilterText = {
  margin: "8px 0 0",
  color: "#aaa",
  fontSize: "14px",
  lineHeight: 1.55,
} as const;

const familyFilterScroller = {
  width: "100%",
  overflowX: "auto",
  WebkitOverflowScrolling: "touch",
  paddingBottom: "3px",
} as const;

const familyFilterButtons = {
  display: "flex",
  gap: "10px",
  width: "100%",
  minWidth: "max-content",
  flexWrap: "nowrap" as const,
  alignItems: "center",
} as const;

const familyFilterButton = {
  minHeight: "40px",
  padding: "9px 14px",
  flex: "0 0 auto",
  borderRadius: "999px",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "rgba(255,255,255,.13)",
  background: "rgba(255,255,255,.025)",
  color: "#d5d5d5",
  fontSize: "12px",
  fontWeight: 850,
  letterSpacing: ".35px",
  cursor: "pointer",
  whiteSpace: "nowrap",
  transition:
    "border-color 160ms ease, background 160ms ease, color 160ms ease, box-shadow 160ms ease, transform 160ms ease",
} as const;

const catalogShell = {
  maxWidth: 1440,
  margin: "20px auto 0",
  padding: "22px 18px 18px",
  boxSizing: "border-box" as const,
  scrollMarginTop: 110,
  borderRadius: 18,
  background:
    "linear-gradient(135deg, rgba(0,217,255,.04), rgba(255,69,216,.022) 48%, rgba(0,255,153,.025))",
  boxShadow: "0 18px 46px rgba(0,0,0,.22)",
};

const catalogHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  flexWrap: "nowrap" as const,
};

const catalogEyebrow = {
  color: "#00d9ff",
  fontSize: 9,
  fontWeight: 900,
  letterSpacing: ".11em",
};

const catalogTitle = {
  margin: "5px 0 0",
  color: "#ffffff",
  fontSize: "clamp(24px, 3vw, 34px)",
  letterSpacing: "-.025em",
  lineHeight: 1.08,
};

const catalogIntroText = {
  margin: "7px 0 0",
  color: "#aaa",
  fontSize: 13,
  lineHeight: 1.5,
};

const catalogFamilyRow = {
  marginTop: 20,
  padding: "13px 14px",
  borderRadius: 13,
  background: "rgba(0,0,0,.18)",
};

const catalogStats = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap" as const,
  padding: "6px 10px",
  border: "1px solid rgba(255,255,255,.10)",
  borderRadius: 999,
  background: "rgba(255,255,255,.025)",
  color: "#b9bcc2",
  fontSize: 10,
  fontWeight: 850,
};

const catalogSearchWrap = {
  marginTop: 10,
  width: "100%",
};

const catalogSearchInput = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "11px 12px",
  borderRadius: 10,
  border: "1px solid rgba(0,217,255,.34)",
  background: "#0b0b0d",
  color: "#fff",
  fontSize: 14,
  outline: "none",
};

const searchSection = {
  marginTop: 14,
  padding: 12,
  display: "grid",
  gap: 8,
  borderRadius: 13,
  background: "rgba(255,255,255,.018)",
};


const catalogControls = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 9,
  flexWrap: "nowrap" as const,
  overflowX: "auto" as const,
  WebkitOverflowScrolling: "touch" as const,
};

const filterButtons = {
  display: "flex",
  gap: 7,
  flexWrap: "nowrap" as const,
  minWidth: "max-content",
};

const filterButton = {
  minHeight: 38,
  padding: "8px 11px",
  flex: "0 0 auto",
  whiteSpace: "nowrap" as const,
  borderRadius: 999,
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 12,
  lineHeight: 1.15,
  textTransform: "none" as const,
};

const sortSelect = {
  minHeight: 36,
  flexShrink: 0,
  padding: "0 9px",
  border: "1px solid rgba(0,217,255,.24)",
  borderRadius: 9,
  background: "#0a0a0c",
  color: "#fff",
  fontWeight: 800,
};

const campaignLoadingText = {
  margin: 0,
  textAlign: "center" as const,
  color: "#8d8d96",
  fontSize: 10,
};

const groupedCatalog = {
  marginTop: 22,
  display: "grid",
  gap: 36,
};

const catalogGroup = {
  padding: "24px",
  borderRadius: 20,
  overflow: "hidden",
};

const catalogGroupCompounds = {
  background:
    "linear-gradient(135deg, rgba(255,69,216,.055), rgba(0,217,255,.025) 52%, rgba(255,255,255,.012))",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,.035), 0 20px 55px rgba(0,0,0,.16)",
};

const catalogGroupSprays = {
  background:
    "linear-gradient(135deg, rgba(0,217,255,.055), rgba(0,255,153,.022) 52%, rgba(255,255,255,.012))",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,.035), 0 20px 55px rgba(0,0,0,.16)",
};

const catalogGroupMaterials = {
  background:
    "linear-gradient(135deg, rgba(0,255,153,.050), rgba(255,69,216,.020) 52%, rgba(255,255,255,.012))",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,.035), 0 20px 55px rgba(0,0,0,.16)",
};

const catalogGroupHeader = {
  paddingBottom: 14,
  display: "flex",
  alignItems: "end",
  justifyContent: "space-between",
  gap: 12,
};

const catalogGroupEyebrow = {
  color: "#7df9ff",
  fontSize: 10,
  fontWeight: 950,
  letterSpacing: ".15em",
};

const catalogGroupTitle = {
  margin: "5px 0 0",
  color: "#ffffff",
  fontSize: "clamp(23px, 2.6vw, 32px)",
  lineHeight: 1.02,
  letterSpacing: "-.025em",
};

const catalogGroupCount = {
  minWidth: 30,
  minHeight: 27,
  display: "grid",
  placeItems: "center",
  border: "1px solid rgba(255,69,216,.32)",
  borderRadius: 999,
  color: "#ff75df",
  fontSize: 10,
  fontWeight: 900,
};

const productsGrid = {
  margin: "22px 0 0",
  display: "grid",
  gridTemplateColumns:
    "repeat(4, minmax(0, 1fr))",
  columnGap: 30,
  rowGap: 34,
};

const productCard = {
  position: "relative" as const,
  overflow: "hidden",
  width: "100%",
  height: "auto",
  aspectRatio: "4 / 5",
  minHeight: 0,
  display: "block",
  border: "1px solid",
  borderRadius: 16,
  background: "#050507",
  boxShadow:
    "0 10px 26px rgba(0,0,0,.24)",
};

const productImageWrap = {
  position: "absolute" as const,
  inset: 0,
  zIndex: 0,
  overflow: "hidden",
  display: "grid",
  placeItems: "center",
  background: "#050507",
};

const productImage = {
  width: "100%",
  height: "100%",
  objectFit: "contain" as const,
  objectPosition: "center",
  padding: 0,
  boxSizing: "border-box" as const,
  transform: "none",
};

const productBody = {
  position: "absolute" as const,
  zIndex: 2,
  left: 0,
  right: 0,
  bottom: 0,
  padding: "12px",
  display: "grid",
  gap: 6,
  alignContent: "end",
  background: "transparent",
};


const saleBadge = {
  position: "absolute" as const,
  top: 10,
  right: 10,
  maxWidth: "75%",
  padding: "6px 10px",
  borderRadius: 999,
  border: "2px solid rgba(0,0,0,.85)",
  background: "#ffd400",
  color: "#050505",
  fontWeight: 1000,
  fontSize: 10,
  letterSpacing: ".04em",
  zIndex: 5,
  boxShadow:
    "0 3px 12px rgba(0,0,0,.72), 0 0 0 1px rgba(255,255,255,.22)",
};

const campaignNameBadge = {
  width: "fit-content",
  maxWidth: "100%",
  padding: "5px 8px",
  border: "1px solid rgba(255,212,0,.9)",
  borderRadius: 999,
  background: "rgba(0,0,0,.88)",
  color: "#ffe45c",
  fontWeight: 1000,
  fontSize: 9,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap" as const,
  boxShadow: "0 3px 10px rgba(0,0,0,.65)",
};

const campaignOverlay = {
  position: "absolute" as const,
  left: 10,
  bottom: 10,
  zIndex: 5,
  maxWidth: "calc(100% - 20px)",
  padding: "5px 8px",
  border: "1px solid rgba(255,212,0,.9)",
  borderRadius: 999,
  background: "rgba(0,0,0,.88)",
  color: "#ffe45c",
  fontWeight: 1000,
  fontSize: 9,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap" as const,
  boxShadow: "0 3px 10px rgba(0,0,0,.65)",
};

const saleDetail = {
  minHeight: 16,
  color: "#00ff99",
  fontSize: 9,
  fontWeight: 900,
  textTransform: "uppercase" as const,
};

const catalogCategoryPill = {
  width: "fit-content",
  padding: "5px 8px",
  border: "1px solid rgba(255,255,255,.13)",
  borderRadius: 999,
  background: "rgba(255,255,255,.025)",
  color: "#9fa2aa",
  fontSize: 9,
  fontWeight: 900,
  letterSpacing: ".05em",
  textTransform: "uppercase" as const,
};

const productName = {
  margin: 0,
  fontSize: 15,
  fontWeight: 950,
  letterSpacing: ".01em",
  textTransform: "uppercase" as const,
  lineHeight: 1.15,
  textShadow: "0 2px 10px rgba(0,0,0,.85)",
};

const emptyState = {
  marginTop: 7,
  padding: 11,
  borderRadius: 13,
  textAlign: "center" as const,
};

const emptyTitle = {
  margin: 0,
  color: "#fff",
  fontSize: 17,
};

const emptyText = {
  margin: "5px 0 10px",
  color: "#94989f",
  fontSize: 11,
};

const emptyButton = {
  minHeight: 33,
  padding: "6px 9px",
  border: "1px solid rgba(0,255,153,.32)",
  borderRadius: 8,
  background: "rgba(0,255,153,.04)",
  color: "#00ff99",
  fontWeight: 900,
  cursor: "pointer",
};

const qualityItem = {
  display: "flex",
  gap: 9,
  alignItems: "center",
  padding: 10,
  borderLeft: "1px solid #333",
};

const bottomBar = {
  maxWidth: 1320,
  margin: "18px auto 46px",
  padding: 10,
  borderRadius: 13,
  background: "rgba(10,10,10,.95)",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 8,
};

const brandIntroSection = {
  maxWidth: 1320,
  margin: "10px auto 0",
  padding: "14px",
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.25fr) minmax(260px, .75fr)",
  gap: 16,
  alignItems: "stretch",
  borderRadius: 16,
  background:
    "linear-gradient(115deg, rgba(0,217,255,.055), rgba(255,69,216,.035) 48%, rgba(0,255,153,.045))",
  boxShadow: "0 18px 50px rgba(0,0,0,.28), inset 0 0 30px rgba(0,217,255,.025)",
};

const brandIntroCopy = {
  maxWidth: 760,
  display: "flex",
  flexDirection: "column" as const,
  justifyContent: "center",
  padding: "4px 2px",
};

const premiumEyebrow = {
  color: "#7df9ff",
  fontSize: 10,
  fontWeight: 950,
  letterSpacing: ".18em",
  textTransform: "uppercase" as const,
};

const brandIntroTitle = {
  margin: "5px 0 0",
  color: "#fff",
  fontSize: "clamp(26px, 3.5vw, 40px)",
  letterSpacing: "-.045em",
  lineHeight: .98,
  textShadow: "0 0 24px rgba(125,249,255,.12)",
};

const brandIntroText = {
  maxWidth: 600,
  margin: "9px 0 0",
  color: "#d4d7dd",
  fontSize: "clamp(12px, 1.45vw, 14px)",
  lineHeight: 1.45,
};

const brandIntroActions = {
  marginTop: 11,
  display: "flex",
  gap: 8,
  flexWrap: "wrap" as const,
};

const primaryMarketingButton = {
  minHeight: 38,
  padding: "8px 14px",
  border: "1px solid rgba(0,255,153,.72)",
  borderRadius: 999,
  background: "linear-gradient(90deg, rgba(0,255,153,.17), rgba(0,217,255,.15))",
  color: "#fff",
  fontSize: 10,
  fontWeight: 1000,
  letterSpacing: ".07em",
  cursor: "pointer",
  boxShadow: "0 0 26px rgba(0,255,153,.12)",
};







const brandQualityVisualLink = {
  display: "block",
  textDecoration: "none",
};

const brandQualityVisual = {
  position: "relative" as const,
  overflow: "hidden",
  minHeight: 160,
  height: "100%",
  border: "none",
  borderRadius: 14,
  background: "#030304",
  boxShadow: "none",
};

const brandQualityImage = {
  width: "100%",
  height: "100%",
  minHeight: 160,
  display: "block",
  objectFit: "cover" as const,
  objectPosition: "center",
  margin: 0,
  padding: 0,
  borderRadius: 14,
  overflow: "hidden" as const,
  background: "#030304",
};

const brandQualityShade = {
  position: "absolute" as const,
  inset: 0,
  background:
    "linear-gradient(180deg, transparent 34%, rgba(0,0,0,.12) 52%, rgba(0,0,0,.92) 100%)",
  pointerEvents: "none" as const,
};

const brandQualityOverlayCopy = {
  position: "absolute" as const,
  left: 12,
  right: 12,
  bottom: 10,
  zIndex: 2,
  display: "grid",
  gap: 2,
};

const brandQualityKicker = {
  color: "#ff8ee7",
  fontSize: 8,
  fontWeight: 950,
  letterSpacing: ".12em",
};

const brandQualityOverlayTitle = {
  color: "#fff",
  fontSize: 15,
  lineHeight: 1.12,
};

const brandQualityCta = {
  marginTop: 3,
  color: "#00ff99",
  fontSize: 9,
  fontWeight: 950,
  letterSpacing: ".05em",
};

const brandPunchLine = {
  marginTop: 10,
  display: "flex",
  alignItems: "center",
  gap: 7,
  color: "#7df9ff",
  fontSize: 9,
  fontWeight: 950,
  letterSpacing: ".09em",
};

const brandPunchDot = {
  color: "#ff45d8",
  fontSize: 9,
  textShadow: "0 0 12px rgba(255,69,216,.9)",
};



const sectionLead = {
  maxWidth: 820,
  marginBottom: 12,
};

const premiumSectionTitle = {
  margin: "7px 0 0",
  color: "#fff",
  fontSize: "clamp(20px, 2.4vw, 29px)",
  lineHeight: 1.05,
  letterSpacing: "-.03em",
};

const premiumSectionText = {
  margin: "10px 0 0",
  color: "#aeb2ba",
  fontSize: 11,
  lineHeight: 1.65,
};











const categorySection = {
  maxWidth: 1320,
  margin: "48px auto 0",
  padding: "0 14px",
};



const categoryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 10,
};


const categoryCardButton = {
  position: "relative" as const,
  minHeight: 230,
  overflow: "hidden",
  padding: 0,
  border: "0",
  borderRadius: 14,
  background: "#050507",
  color: "#fff",
  textAlign: "left" as const,
  cursor: "pointer",
  boxShadow: "none",
};

const categoryImage = {
  position: "absolute" as const,
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover" as const,
  objectPosition: "center",
};

const categoryShade = {
  position: "absolute" as const,
  inset: 0,
  background:
    "linear-gradient(180deg, rgba(0,0,0,.06), rgba(0,0,0,.24) 48%, rgba(0,0,0,.92) 100%)",
};

const categoryContent = {
  position: "absolute" as const,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 2,
  padding: 11,
};

const categoryKicker = {
  color: "#00ff99",
  fontSize: 9,
  fontWeight: 950,
  letterSpacing: ".14em",
};

const categoryTitle = {
  margin: "5px 0 0",
  color: "#fff",
  fontSize: "clamp(21px, 2.4vw, 28px)",
  lineHeight: 1.05,
};

const categoryCta = {
  display: "inline-block",
  marginTop: 7,
  color: "#7df9ff",
  fontSize: 10,
  fontWeight: 950,
};


















const overlay = {
  position: "fixed" as const,
  inset: 0,
  background: "rgba(0,0,0,.96)",
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 18,
};

const modal = {
  maxWidth: 620,
  width: "100%",
  maxHeight: "90vh",
  overflowY: "auto" as const,
  padding: 22,
  border: "1px solid #ff45d8",
  borderRadius: 18,
  background: "#080808",
  textAlign: "center" as const,
};

const gateCheckboxRow = {
  marginTop: 14,
  padding: 11,
  display: "flex",
  alignItems: "flex-start",
  gap: 9,
  border: "1px solid rgba(0,217,255,.22)",
  borderRadius: 12,
  background: "rgba(0,217,255,.035)",
  color: "#e5e5ea",
  textAlign: "left" as const,
  lineHeight: 1.55,
  fontSize: 16,
  cursor: "pointer",
};

const gateCheckbox = {
  width: 20,
  height: 17,
  marginTop: 2,
  flex: "0 0 auto",
  accentColor: "#00ff99",
  cursor: "pointer",
};

const mainButton = {
  marginTop: 14,
  padding: "10px 18px",
  border: "none",
  borderRadius: 10,
  background: "linear-gradient(90deg, #00b7ff, #ff2fd0)",
  color: "#fff",
  fontWeight: "bold",
  cursor: "pointer",
  fontSize: 15,
};

const primaryLinkButton = {
  minHeight: 32,
  padding: "6px 10px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid rgba(0,255,153,.44)",
  borderRadius: 9,
  background: "rgba(0,255,153,.06)",
  color: "#00ff99",
  textDecoration: "none",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: ".03em",
};

const footer = {
  marginTop: 38,
  padding:
    "clamp(24px, 3.5vw, 38px) clamp(14px, 3vw, 26px)",
  background:
    "radial-gradient(circle at 10% 0%, rgba(0,217,255,.07), transparent 28%), radial-gradient(circle at 90% 0%, rgba(255,45,210,.08), transparent 30%), #050505",
};

const footerGrid = {
  width: "100%",
  maxWidth: 1180,
  margin: "0 auto",
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 18,
};

const footerColumn = {
  display: "grid",
  alignContent: "start",
  gap: 8,
};

const footerLegalLinks = {
  display: "flex",
  flexWrap: "wrap" as const,
  alignItems: "center",
  columnGap: "clamp(16px, 3vw, 34px)",
  rowGap: 10,
};

const footerColumnTitle = {
  margin: "0 0 5px",
  color: "#ff75df",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: ".13em",
};

const footerSupportPromise = {
  margin: "0 0 8px",
  color: "#00ff99",
  fontSize: 11,
  lineHeight: 1.5,
  fontWeight: 700,
};

const footerLink = {
  width: "fit-content",
  color: "#cfcfd5",
  fontSize: 11,
  lineHeight: 1.5,
  textDecoration: "none",
};

const footerDivider = {
  width: "100%",
  maxWidth: 1180,
  height: 1,
  margin: "32px auto 24px",
  background:
    "linear-gradient(90deg, transparent, rgba(0,217,255,.32), rgba(255,69,216,.32), rgba(0,255,153,.28), transparent)",
};

const footerResearchNotice = {
  maxWidth: 1100,
  margin: "0 auto 10px",
  color: "#ffffff",
  lineHeight: 1.5,
  fontSize: 13,
  fontWeight: 400,
  textAlign: "left" as const,
};

const footerText = {
  maxWidth: 1100,
  margin: "0 auto 10px",
  color: "#c9cdd3",
  lineHeight: 1.5,
  fontSize: 13,
  fontWeight: 400,
  textAlign: "left" as const,
};

const footerCopyright = {
  maxWidth: 1100,
  margin: "22px auto 0",
  color: "#00d9ff",
  fontWeight: 900,
  fontSize: 11,
  textAlign: "center" as const,
};




const heroVideo = {
  width: "100%",
  height: "auto",
  display: "block" as const,
};

// Compact, content-aligned homepage hero banner.
// The original artwork is tall; crop its edges to a banner shape rather
// than shrinking the banner's width or stretching the image.
const heroBannerImage = {
  width: "calc(100% - 32px)",
  maxWidth: 1320,
  height: "clamp(320px, 29vw, 380px)",
  objectFit: "cover" as const,
  objectPosition: "center" as const,
  margin: "0 auto",
  display: "block" as const,
  borderRadius: 16,
  overflow: "hidden" as const,
};

// Keep the research notice readable without covering the new banner lettering.
const heroNoticeArea = {
  width: "100%",
  display: "flex",
  justifyContent: "center",
  padding: "12px 12px 18px",
  background: "#000",
  textAlign: "center" as const,
};
