"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { createClient } from "../lib/supabaseClient";
import {
  getPrimaryStorefrontCampaign,
  loadStorefrontSales,
  type StorefrontSale,
} from "../lib/storefrontCampaigns";

const STOREFRONT_SALE_CACHE_KEY = "pugpep_storefront_sales_v1";
const STOREFRONT_SALE_CACHE_TTL_MS = 5 * 60 * 1000;

export type StorefrontProduct = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  color: string | null;
  category: string | null;
  is_new: boolean;
  feature_on_homepage: boolean;
  new_until?: string | null;
  homepage_feature_order?: number | null;
  is_coming_soon?: boolean;
  coming_soon_date?: string | null;
};

type StorefrontSaleCache = {
  savedAt: number;
  sales: Record<string, StorefrontSale>;
};

export function useStorefrontData() {
  const supabase = useMemo(() => createClient(), []);

  const [products, setProducts] = useState<StorefrontProduct[]>([]);
  const [saleMap, setSaleMap] = useState<Record<string, StorefrontSale>>({});
  const [productsLoading, setProductsLoading] = useState(true);
  const [campaignLoading, setCampaignLoading] = useState(true);

  const mountedRef = useRef(true);
  const campaignLoadStartedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    void loadProducts();

    const cachedSales = readCachedSales();

    if (cachedSales) {
      setSaleMap(cachedSales);
      setCampaignLoading(false);
    }

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
  }, [supabase]);

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
      // Cache failure should never block storefront rendering.
    }
  }

  async function loadProducts() {
    setProductsLoading(true);

    try {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, name, slug, color, image, category, is_new, feature_on_homepage, new_until, homepage_feature_order, is_coming_soon, coming_soon_date"
        )
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (!mountedRef.current) return;

      if (error) {
        console.error("Product loading failed:", error);
        setProducts([]);
        return;
      }

      setProducts((data || []) as StorefrontProduct[]);
    } catch (error) {
      console.error("Product loading failed:", error);

      if (mountedRef.current) {
        setProducts([]);
      }
    } finally {
      if (mountedRef.current) {
        setProductsLoading(false);
      }
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

      setSaleMap((current) =>
        Object.keys(current).length > 0 ? current : {}
      );
    } finally {
      if (mountedRef.current) {
        setCampaignLoading(false);
      }
    }
  }

  async function openProduct(productSlug: string) {
    const productPath = `/products/${productSlug}`;

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

      window.location.href = "/login";
      return;
    }

    window.location.href = productPath;
  }

  const primaryCampaign = useMemo(
    () => getPrimaryStorefrontCampaign(saleMap),
    [saleMap]
  );

  return {
    products,
    saleMap,
    primaryCampaign,
    productsLoading,
    campaignLoading,
    openProduct,
    refreshProducts: loadProducts,
    refreshCampaigns: loadCampaignSales,
  };
}
