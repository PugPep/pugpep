"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  createClient,
  enforceAuthPersistencePolicy,
} from "../../../lib/supabaseClient";
import {
  loadStorefrontSales,
  type StorefrontSale,
} from "../../../lib/storefrontCampaigns";
import { useCart } from "../../cartContext";
import { trackEvent } from "../../../lib/trackEvent";

type Product = {
  id: string;
  name: string;
  slug: string;
  color?: string | null;
  image: string;
  short_description?: string | null;
  description?: string | null;
  storage?: string | null;
  category?: string | null;
  is_active: boolean;
  is_new: boolean;
  feature_on_homepage?: boolean;
  new_until?: string | null;
  homepage_feature_order?: number | null;
  is_coming_soon?: boolean;
  coming_soon_date?: string | null;
};

type ProductOption = {
  id: string;
  product_slug: string;
  dosage: string;
  purchase_type: string;
  price: number;
  status: string;
  sale_active: boolean;
  sale_percent: number;
  cost: number;
  is_active: boolean;
  archived_at?: string | null;
  bundle_discount_enabled?: boolean;
  bundle_qty_1?: number;
  bundle_discount_1?: number;
  bundle_qty_2?: number;
  bundle_discount_2?: number;
  bundle_qty_3?: number;
  bundle_discount_3?: number;
};

type OptionCampaignPrice = {
  hasCampaign: boolean;
  campaignId: string | null;
  campaignName: string | null;
  campaignType: string | null;
  regularUnitPrice: number;
  saleUnitPrice: number;
  saleDiscountAmount: number;
};

type InventoryItem = {
  id?: string;
  product_slug: string;
  dosage: string;
  purchase_type: string;
  quantity: number;
};

type RecommendationProduct = {
  id: string;
  name: string;
  slug: string;
  image: string;
  color?: string | null;
  category?: string | null;
  is_active: boolean;
};

type RecentlyViewedItem = {
  id: string;
  name: string;
  slug: string;
  image: string;
  color?: string | null;
};

type CoaDocument = {
  id: string;
  product_slug: string;
  product_name?: string | null;
  dosage?: string | null;
  report_id?: string | null;
  lab_name?: string | null;
  test_date?: string | null;
  purity_percent?: number | null;
  identity_result?: string | null;
  net_content?: string | null;
  test_method?: string | null;
  file_path: string;
  file_name?: string | null;
  mime_type?: string | null;
  file_type?: string | null;
  status: string;
  is_current?: boolean;
  storage_bucket?: string | null;
  created_at?: string | null;
};

const RECENTLY_VIEWED_KEY =
  "pugpep_recently_viewed";


export default function ProductDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const supabase = useMemo(() => createClient(), []);
  const { addToCart } = useCart();

  /*
   * React development mode may invoke effects more than once.
   * Keep one product-view event per mounted product page.
   */
  const trackedProductViewRef =
    useRef<string | null>(null);

  const [product, setProduct] = useState<Product | null>(null);
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selectedOption, setSelectedOption] =
    useState<ProductOption | null>(null);

  const [coaDocuments, setCoaDocuments] =
    useState<CoaDocument[]>([]);

  const [coaLoading, setCoaLoading] =
    useState(false);

  const [coaPanelOpen, setCoaPanelOpen] =
    useState(false);

  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  const [activeInfoTab, setActiveInfoTab] =
    useState<"description" | "storage">("description");

  const [researchDetailsOpen, setResearchDetailsOpen] =
    useState(false);

  const [recentlyViewed, setRecentlyViewed] =
    useState<RecentlyViewedItem[]>([]);

  const [alsoBought, setAlsoBought] =
    useState<RecommendationProduct[]>([]);

  const [saleRecommendations, setSaleRecommendations] =
    useState<RecommendationProduct[]>([]);

  const [saleMap, setSaleMap] =
    useState<Record<string, StorefrontSale>>({});

  const [productSearch, setProductSearch] =
    useState("");

  const [productSearchFocused, setProductSearchFocused] =
    useState(false);

  const [searchProducts, setSearchProducts] =
    useState<RecommendationProduct[]>([]);

  /*
   * Campaign pricing must be tracked by product OPTION, not only
   * by product slug. A product can have 20mg on sale while 10mg is not.
   */
  const [optionCampaignPriceMap, setOptionCampaignPriceMap] =
    useState<Record<string, OptionCampaignPrice>>({});

  function normalizeDosageKey(
    value: string | null | undefined
  ) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");
  }

  function normalizeProductSlug(
    value: string | null | undefined
  ) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, "");
  }

  const selectedCoas =
    useMemo(
      () => {
        if (!selectedOption) {
          return [] as CoaDocument[];
        }

        const selectedDosage =
          normalizeDosageKey(
            selectedOption.dosage
          );

        return coaDocuments
          .filter(
            (document) =>
              normalizeDosageKey(
                document.dosage
              ) === selectedDosage
          )
          .sort((a, b) => {
            const aDate =
              a.test_date
                ? new Date(
                    a.test_date.includes("T")
                      ? a.test_date
                      : `${a.test_date}T12:00:00`
                  ).getTime()
                : a.created_at
                  ? new Date(a.created_at).getTime()
                  : 0;

            const bDate =
              b.test_date
                ? new Date(
                    b.test_date.includes("T")
                      ? b.test_date
                      : `${b.test_date}T12:00:00`
                  ).getTime()
                : b.created_at
                  ? new Date(b.created_at).getTime()
                  : 0;

            return bDate - aDate;
          });
      },
      [
        coaDocuments,
        selectedOption,
      ]
    );

  const filteredSearchProducts =
    useMemo(
      () => {
        const query =
          productSearch.trim().toLowerCase();

        if (!query) {
          return [];
        }

        const normalizedQuery =
          normalizeProductSlug(query);

        return searchProducts
          .filter(
            (item) =>
              item.is_active !== false &&
              (
                item.name
                  .toLowerCase()
                  .includes(query) ||
                normalizeProductSlug(
                  item.slug
                ).includes(
                  normalizedQuery
                )
              )
          )
          .slice(0, 6);
      },
      [
        productSearch,
        searchProducts,
      ]
    );

  function getCoaPublicUrl(
    document: CoaDocument
  ) {
    const bucket =
      document.storage_bucket ||
      "coas";

    return supabase.storage
      .from(bucket)
      .getPublicUrl(
        document.file_path
      )
      .data.publicUrl;
  }

  function formatCoaDate(
    value: string | null | undefined
  ) {
    if (!value) {
      return "Date not listed";
    }

    const parsed =
      new Date(
        value.includes("T")
          ? value
          : `${value}T12:00:00`
      );

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      return value;
    }

    return parsed.toLocaleDateString(
      undefined,
      {
        month: "short",
        day: "numeric",
        year: "numeric",
      }
    );
  }

  function readRecentlyViewed() {
    try {
      const raw =
        localStorage.getItem(
          RECENTLY_VIEWED_KEY
        );

      if (!raw) {
        return [] as RecentlyViewedItem[];
      }

      const parsed =
        JSON.parse(raw);

      if (!Array.isArray(parsed)) {
        return [] as RecentlyViewedItem[];
      }

      return parsed.filter(
        (item): item is RecentlyViewedItem =>
          Boolean(
            item &&
            typeof item.slug === "string" &&
            typeof item.name === "string"
          )
      );
    } catch {
      return [] as RecentlyViewedItem[];
    }
  }

  function saveRecentlyViewed(
    viewedProduct: Product
  ) {
    const existing =
      readRecentlyViewed();

    const next: RecentlyViewedItem[] = [
      {
        id: viewedProduct.id,
        name: viewedProduct.name,
        slug: viewedProduct.slug,
        image: viewedProduct.image,
        color: viewedProduct.color,
      },
      ...existing.filter(
        (item) =>
          normalizeProductSlug(
            item.slug
          ) !==
          normalizeProductSlug(
            viewedProduct.slug
          )
      ),
    ].slice(0, 8);

    localStorage.setItem(
      RECENTLY_VIEWED_KEY,
      JSON.stringify(next)
    );

    setRecentlyViewed(
      next.filter(
        (item) =>
          normalizeProductSlug(
            item.slug
          ) !==
          normalizeProductSlug(
            viewedProduct.slug
          )
      ).slice(0, 3)
    );
  }

  async function loadRecommendationProducts(
    currentProduct: Product
  ) {
    try {
      const [
        productsResult,
        storefrontSales,
      ] = await Promise.all([
        supabase
          .from("products")
          .select(
            "id,name,slug,image,color,category,is_active"
          )
          .eq("is_active", true),

        loadStorefrontSales(
          supabase
        ),
      ]);

      if (productsResult.error) {
        throw productsResult.error;
      }

      const activeProducts =
        ((productsResult.data ||
          []) as RecommendationProduct[])
          .filter(
            (item) =>
              normalizeProductSlug(
                item.slug
              ) !==
              normalizeProductSlug(
                currentProduct.slug
              )
          );

      setSearchProducts(
        (productsResult.data ||
          []) as RecommendationProduct[]
      );

      setSaleMap(
        storefrontSales
      );

      const saleItems =
        activeProducts
          .filter(
            (item) =>
              Boolean(
                storefrontSales[
                  item.slug
                ]?.isOnSale
              )
          )
          .sort(
            (a, b) => {
              const sameCategoryA =
                a.category ===
                currentProduct.category
                  ? 1
                  : 0;

              const sameCategoryB =
                b.category ===
                currentProduct.category
                  ? 1
                  : 0;

              return (
                sameCategoryB -
                sameCategoryA
              );
            }
          )
          .slice(0, 3);

      setSaleRecommendations(
        saleItems
      );

      /*
       * Customers Also Bought:
       * Find orders containing the current product,
       * count the other product slugs appearing in
       * those same orders, and rank by frequency.
       *
       * If order history is unavailable through RLS
       * or there is not enough history yet, fall back
       * to other active products in the same category.
       */
      try {
        const {
          data: seedItems,
          error: seedError,
        } =
          await supabase
            .from("order_items")
            .select("order_id,product_slug")
            .limit(5000);

        if (seedError) {
          throw seedError;
        }

        const currentSlugKey =
          normalizeProductSlug(
            currentProduct.slug
          );

        const orderIds =
          Array.from(
            new Set(
              (seedItems || [])
                .filter(
                  (row) =>
                    normalizeProductSlug(
                      String(
                        row.product_slug ||
                          ""
                      )
                    ) === currentSlugKey
                )
                .map(
                  (row) =>
                    row.order_id as string
                )
                .filter(Boolean)
            )
          ).slice(0, 75);

        if (
          orderIds.length >
          0
        ) {
          const {
            data:
              companionItems,
            error:
              companionError,
          } =
            await supabase
              .from(
                "order_items"
              )
              .select(
                "product_slug"
              )
              .in(
                "order_id",
                orderIds
              );

          if (companionError) {
            throw companionError;
          }

          const counts =
            new Map<
              string,
              number
            >();

          (
            companionItems ||
            []
          ).forEach(
            (row) => {
              const itemSlug =
                String(
                  row.product_slug ||
                    ""
                );

              if (
                !itemSlug ||
                normalizeProductSlug(
                  itemSlug
                ) ===
                  normalizeProductSlug(
                    currentProduct.slug
                  )
              ) {
                return;
              }

              counts.set(
                itemSlug,
                (counts.get(
                  itemSlug
                ) || 0) + 1
              );
            }
          );

          const rankedSlugs =
            Array.from(
              counts.entries()
            )
              .sort(
                (a, b) =>
                  b[1] - a[1]
              )
              .map(
                ([itemSlug]) =>
                  itemSlug
              );

          const rankedProducts =
            rankedSlugs
              .map(
                (itemSlug) =>
                  activeProducts.find(
                    (item) =>
                      item.slug ===
                      itemSlug
                  )
              )
              .filter(
                (
                  item
                ): item is RecommendationProduct =>
                  Boolean(item)
              )
              .slice(0, 3);

          if (
            rankedProducts.length >
            0
          ) {
            setAlsoBought(
              rankedProducts
            );

            return;
          }
        }
      } catch (
        historyError
      ) {
        console.warn(
          "Customers Also Bought history unavailable; using fallback.",
          historyError
        );
      }

      const fallback =
        activeProducts
          .filter(
            (item) =>
              item.category ===
              currentProduct.category
          )
          .slice(0, 3);

      setAlsoBought(
        fallback.length >
          0
          ? fallback
          : activeProducts.slice(
              0,
              3
            )
      );
    } catch (
      error
    ) {
      console.error(
        "Product recommendations failed:",
        error
      );

      setAlsoBought([]);
      setSaleRecommendations([]);
      setSaleMap({});
    }
  }

  useEffect(() => {
    let mounted = true;

    async function checkAuthentication() {
      await enforceAuthPersistencePolicy(
        supabase
      );

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (error || !user) {
        try {
          localStorage.setItem(
            "pugpep_redirect_after_login",
            `/products/${slug}`
          );
        } catch {
          // Redirect persistence is a convenience only.
        }

        window.location.replace("/login");
        return;
      }

      setIsAuthenticated(true);
      setAuthChecking(false);
    }

    void checkAuthentication();

    return () => {
      mounted = false;
    };
  }, [slug, supabase]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    async function loadProduct() {
      setLoading(true);

      const { data: productRows, error: productError } =
        await supabase
          .from("products")
          .select("*")
          .eq("is_active", true);

      const routeSlugKey =
        normalizeProductSlug(slug);

      const productData =
        ((productRows || []) as Product[]).find(
          (candidate) =>
            normalizeProductSlug(
              candidate.slug
            ) === routeSlugKey
        ) || null;

      if (productError || !productData) {
        console.error("Product loading error:", productError);
        setProduct(null);
        setLoading(false);
        return;
      }

      const loadedProduct =
        productData as Product;

      const canonicalSlugKey =
        normalizeProductSlug(
          loadedProduct.slug
        );

      setProduct(
        loadedProduct
      );

      if (
        trackedProductViewRef.current !==
        loadedProduct.slug
      ) {
        trackedProductViewRef.current =
          loadedProduct.slug;

        void trackEvent({
          event_type:
            "product_view",
          page_path:
            `/products/${loadedProduct.slug}`,
          product_slug:
            loadedProduct.slug,
          metadata: {
            product_name:
              loadedProduct.name,
            category:
              loadedProduct.category ||
              null,
          },
        });
      }

      saveRecentlyViewed(
        loadedProduct
      );

      void loadRecommendationProducts(
        loadedProduct
      );

      const { data: optionRows, error: optionError } =
        await supabase
          .from("product_options")
          .select("*")
          .eq("is_active", true)
          .is("archived_at", null);

      if (optionError) {
        console.error("Option loading error:", optionError);
      }

      const optionData =
        ((optionRows || []) as ProductOption[]).filter(
          (option) =>
            normalizeProductSlug(
              option.product_slug
            ) === canonicalSlugKey
        );

      const sortedOptions = (
        optionData
      ).sort((a, b) => {
        if (a.purchase_type !== b.purchase_type) {
          return a.purchase_type === "single" ? -1 : 1;
        }

        const aDosage = parseFloat(a.dosage);
        const bDosage = parseFloat(b.dosage);

        if (Number.isNaN(aDosage) || Number.isNaN(bDosage)) {
          return a.dosage.localeCompare(b.dosage);
        }

        return aDosage - bDosage;
      });

      setOptions(sortedOptions);

      /*
       * Load the ACTUAL campaign price for every individual option.
       *
       * Campaign assignments are option-specific. A 20mg single can be
       * included in a campaign while the 10mg single or kit is not.
       *
       * The old version stored only true/false here. That was enough to
       * pause Bundle Savings, but it meant the product page still rendered
       * the manual product_options.sale_active price and ignored the
       * campaign sale price.
       *
       * Store the RPC pricing snapshot instead so the customer-facing
       * product page, cart snapshot, and Bundle Savings state all use the
       * same campaign assignment.
       */
      const optionCampaignEntries =
        await Promise.all(
          sortedOptions.map(async (option) => {
            try {
              const { data, error } =
                await supabase.rpc(
                  "get_product_option_campaign_price",
                  {
                    p_product_option_id: option.id,
                  }
                );

              if (error) {
                console.warn(
                  `Unable to load campaign pricing for option ${option.id}:`,
                  error
                );

                return [
                  option.id,
                  {
                    hasCampaign: false,
                    campaignId: null,
                    campaignName: null,
                    campaignType: null,
                    regularUnitPrice: Number(option.price || 0),
                    saleUnitPrice: Number(option.price || 0),
                    saleDiscountAmount: 0,
                  } satisfies OptionCampaignPrice,
                ] as const;
              }

              const campaignData =
                data && typeof data === "object"
                  ? (data as Record<string, unknown>)
                  : null;

              const hasCampaign =
                Boolean(
                  campaignData?.has_campaign
                );

              const regularUnitPrice =
                Number(
                  campaignData?.regular_unit_price ??
                    option.price ??
                    0
                );

              const saleUnitPrice =
                Number(
                  campaignData?.sale_unit_price ??
                    regularUnitPrice
                );

              const saleDiscountAmount =
                Number(
                  campaignData?.sale_discount_amount ??
                    Math.max(
                      0,
                      regularUnitPrice -
                        saleUnitPrice
                    )
                );

              return [
                option.id,
                {
                  hasCampaign,
                  campaignId:
                    campaignData?.sale_campaign_id
                      ? String(
                          campaignData.sale_campaign_id
                        )
                      : null,
                  campaignName:
                    campaignData?.sale_campaign_name
                      ? String(
                          campaignData.sale_campaign_name
                        )
                      : null,
                  campaignType:
                    campaignData?.sale_campaign_type
                      ? String(
                          campaignData.sale_campaign_type
                        )
                      : null,
                  regularUnitPrice:
                    Number.isFinite(
                      regularUnitPrice
                    )
                      ? regularUnitPrice
                      : Number(option.price || 0),
                  saleUnitPrice:
                    hasCampaign &&
                    Number.isFinite(
                      saleUnitPrice
                    )
                      ? Math.max(
                          0,
                          saleUnitPrice
                        )
                      : Number(option.price || 0),
                  saleDiscountAmount:
                    hasCampaign &&
                    Number.isFinite(
                      saleDiscountAmount
                    )
                      ? Math.max(
                          0,
                          saleDiscountAmount
                        )
                      : 0,
                } satisfies OptionCampaignPrice,
              ] as const;
            } catch (campaignError) {
              console.warn(
                `Unable to load campaign pricing for option ${option.id}:`,
                campaignError
              );

              return [
                option.id,
                {
                  hasCampaign: false,
                  campaignId: null,
                  campaignName: null,
                  campaignType: null,
                  regularUnitPrice: Number(option.price || 0),
                  saleUnitPrice: Number(option.price || 0),
                  saleDiscountAmount: 0,
                } satisfies OptionCampaignPrice,
              ] as const;
            }
          })
        );

      setOptionCampaignPriceMap(
        Object.fromEntries(
          optionCampaignEntries
        )
      );

      const { data: inventoryRows, error: inventoryError } =
        await supabase
          .from("inventory")
          .select("*");

      if (inventoryError) {
        console.error(
          "Inventory loading error:",
          inventoryError
        );
      }

      const inventoryData =
        ((inventoryRows || []) as InventoryItem[]).filter(
          (item) =>
            normalizeProductSlug(
              item.product_slug
            ) === canonicalSlugKey
        );

      setInventory(inventoryData);

      setCoaLoading(true);

      const {
        data: coaRows,
        error: coaError,
      } =
        await supabase
          .from("coa_documents")
          .select(
            "id,product_slug,product_name,dosage,report_id,lab_name,test_date,purity_percent,identity_result,net_content,test_method,file_path,file_name,mime_type,file_type,status,is_current,storage_bucket,created_at"
          )
          .eq(
            "status",
            "active"
          )
          .order(
            "test_date",
            {
              ascending: false,
            }
          );

      if (coaError) {
        console.warn(
          "COA loading error:",
          coaError
        );

        setCoaDocuments([]);
      } else {
        const coaData =
          ((coaRows || []) as CoaDocument[]).filter(
            (document) =>
              normalizeProductSlug(
                document.product_slug
              ) === canonicalSlugKey
          );

        setCoaDocuments(coaData);
      }

      setCoaLoading(false);
      setLoading(false);
    }

    loadProduct();
  }, [slug, supabase, isAuthenticated]);

  useEffect(() => {
    if (options.length === 0) {
      setSelectedOption(null);
      return;
    }

    const firstAvailable =
      options.find((option) => isOptionAvailable(option)) ||
      options[0];

    setSelectedOption(firstAvailable);
    setQuantity(1);
  }, [options, inventory]);

  function getAvailableQuantity(option: ProductOption) {
    const inventoryItem = inventory.find(
      (item) =>
        item.dosage === option.dosage &&
        item.purchase_type === "single"
    );

    return Number(inventoryItem?.quantity || 0);
  }

  function isOptionAvailable(option: ProductOption) {
    if (option.is_active === false || option.archived_at) {
      return false;
    }

    const availableQuantity =
      getAvailableQuantity(option);

    if (option.purchase_type === "single") {
      return (
        availableQuantity >= 1 &&
        option.status !== "out of stock"
      );
    }

    if (option.purchase_type === "kit") {
      if (option.status === "pre-sale") {
        return true;
      }

      if (option.status === "out of stock") {
        return false;
      }

      return availableQuantity >= 10;
    }

    return false;
  }

  function getPurchaseLabel(purchaseType: string) {
    if (product?.category === "lab-material") {
      return purchaseType === "kit"
        ? "10 Pack"
        : "Single Item";
    }

    return purchaseType === "kit"
      ? "Full Kit of 10"
      : "Single Vial";
  }

  function getMatchingSingleOption(
    option: ProductOption
  ) {
    if (option.purchase_type !== "kit") {
      return null;
    }

    return (
      options.find(
        (candidate) =>
          candidate.purchase_type === "single" &&
          candidate.dosage === option.dosage &&
          candidate.is_active !== false &&
          !candidate.archived_at
      ) || null
    );
  }

  function getKitSavings(option: ProductOption) {
    if (option.purchase_type !== "kit") {
      return null;
    }

    const single =
      getMatchingSingleOption(option);

    if (!single) {
      return null;
    }

    const singlePrice =
      Number(single.price || 0);

    const kitPrice =
      Number(option.price || 0);

    const tenSingleValue =
      singlePrice * 10;

    if (tenSingleValue <= 0) {
      return null;
    }

    const savingsAmount =
      Math.max(
        0,
        tenSingleValue -
          kitPrice
      );

    const savingsPercent =
      (savingsAmount /
        tenSingleValue) *
      100;

    return {
      singlePrice,
      tenSingleValue,
      kitPrice,
      savingsAmount,
      savingsPercent,
    };
  }

  function getManualSalePrice(option: ProductOption) {
    const regularPrice =
      Number(option.price || 0);

    const salePercent =
      Number(
        option.sale_percent || 0
      );

    if (
      !option.sale_active ||
      salePercent <= 0
    ) {
      return regularPrice;
    }

    return Math.max(
      0,
      regularPrice -
        regularPrice *
          (salePercent / 100)
    );
  }

  function getCampaignPrice(
    option: ProductOption
  ) {
    const campaign =
      optionCampaignPriceMap[
        option.id
      ];

    if (
      !campaign?.hasCampaign
    ) {
      return null;
    }

    return Math.max(
      0,
      Number(
        campaign.saleUnitPrice
      )
    );
  }

  /*
   * If both a manual option sale and a campaign are active, show the
   * lower customer price. This prevents a campaign from making the
   * storefront appear more expensive than an already-active manual sale.
   *
   * Checkout still reruns the authoritative pricing engine by
   * productOptionId before the order is created.
   */
  function getSalePrice(option: ProductOption) {
    const regularPrice =
      Number(option.price || 0);

    const prices = [
      regularPrice,
    ];

    if (
      option.sale_active &&
      Number(
        option.sale_percent || 0
      ) > 0
    ) {
      prices.push(
        getManualSalePrice(option)
      );
    }

    const campaignPrice =
      getCampaignPrice(option);

    if (
      campaignPrice !== null
    ) {
      prices.push(
        campaignPrice
      );
    }

    return Math.min(
      ...prices
    );
  }

  function getEffectiveSalePercent(
    option: ProductOption
  ) {
    const regularPrice =
      Number(option.price || 0);

    const salePrice =
      getSalePrice(option);

    if (
      regularPrice <= 0 ||
      salePrice >= regularPrice
    ) {
      return 0;
    }

    return Number(
      (
        ((regularPrice - salePrice) /
          regularPrice) *
        100
      ).toFixed(2)
    );
  }

  function getEffectiveCampaign(
    option: ProductOption
  ) {
    const campaign =
      optionCampaignPriceMap[
        option.id
      ];

    return campaign?.hasCampaign
      ? campaign
      : null;
  }

  function getBundleTier(option: ProductOption, requestedQuantity: number) {
    if (
      option.purchase_type !== "single" ||
      requestedQuantity >= 10
    ) {
      return null;
    }

    const saleActive =
      Boolean(
        option.sale_active &&
        Number(option.sale_percent || 0) > 0
      ) ||
      Boolean(
        optionCampaignPriceMap[option.id]?.hasCampaign
      );

    if (
      saleActive ||
      option.bundle_discount_enabled === false
    ) {
      return null;
    }

    const tiers = [
      {
        quantity: Number(option.bundle_qty_1 || 0),
        discount: Number(option.bundle_discount_1 || 0),
      },
      {
        quantity: Number(option.bundle_qty_2 || 0),
        discount: Number(option.bundle_discount_2 || 0),
      },
      {
        quantity: Number(option.bundle_qty_3 || 0),
        discount: Number(option.bundle_discount_3 || 0),
      },
    ]
      .filter(
        (tier) =>
          tier.quantity > 0 &&
          tier.discount > 0
      )
      .sort((a, b) => b.quantity - a.quantity);

    return (
      tiers.find(
        (tier) =>
          requestedQuantity >= tier.quantity
      ) || null
    );
  }

  function hasActiveSaleForOption(option: ProductOption) {
    return (
      getEffectiveSalePercent(
        option
      ) > 0 ||
      Boolean(
        optionCampaignPriceMap[
          option.id
        ]?.hasCampaign
      )
    );
  }

  function handleAddToCart() {
    if (!product || !selectedOption) {
      return;
    }

    if (!isOptionAvailable(selectedOption)) {
      alert(
        "This option is not currently available for purchase."
      );
      return;
    }

    if (product.is_coming_soon) {
      alert(
        product.coming_soon_date
          ? `This product is coming soon. Expected ${formatLaunchDate(
              product.coming_soon_date
            )}.`
          : "This product is coming soon and is not available for purchase yet."
      );
      return;
    }

    const availableQuantity =
      getAvailableQuantity(selectedOption);

    const maxKits = Math.floor(
      availableQuantity / 10
    );

    if (
      selectedOption.purchase_type === "single" &&
      quantity > availableQuantity
    ) {
      alert(
        `Only ${availableQuantity} vial(s) are currently available.`
      );
      return;
    }

    const isKitPresale =
      selectedOption.purchase_type === "kit" &&
      quantity > maxKits;

    addToCart(
  {
    productOptionId: selectedOption.id,

    name: product.name,
    slug: product.slug,
    image: product.image,
    dosage: selectedOption.dosage,

    price: getSalePrice(selectedOption),
    regularPrice: Number(selectedOption.price || 0),
    salePrice: getSalePrice(selectedOption),

    wasOnSale:
      hasActiveSaleForOption(
        selectedOption
      ),

    salePercent:
      getEffectiveSalePercent(
        selectedOption
      ),

    cost: Number(selectedOption.cost || 0),

    purchaseType:
      selectedOption.purchase_type as
        | "single"
        | "kit",

    status: isKitPresale
      ? "pre-sale"
      : selectedOption.status,

    maxAvailable: availableQuantity,
  },
  quantity
);

    if (isKitPresale) {
      alert(
        "Some kits in this order will be fulfilled as pre-sale and may take up to 2 weeks."
      );
      return;
    }

    alert(`${product.name} added to cart.`);
  }

  function renderRecommendationSection({
    title,
    eyebrow,
    items,
  }: {
    title: string;
    eyebrow: string;
    items:
      | RecommendationProduct[]
      | RecentlyViewedItem[];
  }) {
    if (
      items.length === 0
    ) {
      return null;
    }

    return (
      <section style={recommendationSection}>
        <div style={recommendationHeader}>
          <span style={recommendationEyebrow}>
            {eyebrow}
          </span>

          <h2 style={recommendationTitle}>
            {title}
          </h2>
        </div>

        <div style={recommendationGrid}>
          {items.map(
            (item) => {
              const effectiveSale =
                saleMap[
                  item.slug
                ];

              return (
                <Link
                  key={item.slug}
                  href={`/products/${item.slug}`}
                  style={recommendationLink}
                >
                  <article style={recommendationCard}>
                    <div style={recommendationImageWrap}>
                      <img
                        src={
                          item.image ||
                          "/pugpep-logo.png"
                        }
                        alt={item.name}
                        style={recommendationImage}
                      />

                      {effectiveSale?.isOnSale && (
                        <span style={recommendationSaleBadge}>
                          {effectiveSale.badgeText}
                        </span>
                      )}
                    </div>

                    <div style={recommendationCopy}>
                      <strong style={recommendationName}>
                        {item.name}
                      </strong>

                      {effectiveSale?.source ===
                        "campaign" &&
                        effectiveSale.campaignName && (
                          <span style={recommendationCampaign}>
                            {effectiveSale.campaignName}
                          </span>
                        )}

                      <span style={recommendationCta}>
                        VIEW PRODUCT →
                      </span>
                    </div>
                  </article>
                </Link>
              );
            }
          )}
        </div>
      </section>
    );
  }

  function formatLaunchDate(value: string) {
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  function isCurrentProductNew() {
    if (!product?.is_new) return false;
    if (!product.new_until) return true;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date(`${product.new_until}T23:59:59`);
    return endDate.getTime() >= today.getTime();
  }

  function renderDescription(description: string) {
    const sections = description
      .split(/\n\s*\n/)
      .map((section) => section.trim())
      .filter(Boolean);

    return sections.map((section, index) => {
      const lines = section
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      const firstLine = lines[0] || "";
      const remainingLines = lines.slice(1);

      const looksLikeHeading =
        firstLine.length <= 70 &&
        (firstLine === firstLine.toUpperCase() ||
          firstLine.endsWith(":"));

      if (
        looksLikeHeading &&
        remainingLines.length > 0
      ) {
        return (
          <div
            key={`${firstLine}-${index}`}
            style={descriptionBlock}
          >
            <h3 style={descriptionHeading}>
              {firstLine.replace(/:$/, "")}
            </h3>

            <p style={descriptionParagraph}>
              {remainingLines.join("\n")}
            </p>
          </div>
        );
      }

      if (
        looksLikeHeading &&
        remainingLines.length === 0
      ) {
        return (
          <h3
            key={`${firstLine}-${index}`}
            style={descriptionHeading}
          >
            {firstLine.replace(/:$/, "")}
          </h3>
        );
      }

      return (
        <p
          key={`${firstLine}-${index}`}
          style={descriptionParagraph}
        >
          {section}
        </p>
      );
    });
  }

  if (authChecking || !isAuthenticated || loading) {
    return (
      <main style={pageStyle}>
        <div style={pageContainer}>
          <p style={loadingText}>
            {authChecking || !isAuthenticated
              ? "Verifying account access..."
              : "Loading product..."}
          </p>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main style={pageStyle}>
        <div style={pageContainer}>
          <h1 style={notFoundTitle}>
            Product Not Found
          </h1>

          <button
            type="button"
            onClick={() => window.history.back()}
            style={backButton}
          >
            ← Go Back
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <style jsx global>{`
        @media (max-width: 980px) {
          .product-detail-main-grid {
            grid-template-columns: 1fr !important;
            grid-template-areas:
              "left"
              "middle" !important;
          }

          .product-detail-recommendations {
            grid-template-columns:
              repeat(2, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 680px) {
          .product-detail-recommendations {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <div style={pageContainer}>
        <Link href="/" style={backLink}>
          ← Back to Home
        </Link>

        <section className="product-detail-main-grid" style={productLayout}>
          {/* Left column: product image, options, and purchase controls */}
          <div className="product-detail-left" style={imageColumn}>
            <div style={imageBox}>
              <img
                src={product.image}
                alt={product.name}
                style={productImage}
              />
            </div>

            <div style={imageOptionSection}>
              <h2 style={selectOptionTitle}>
              Select Option
            </h2>

              {options.length === 0 ? (
              <div style={noOptionsBox}>
                No purchasing options are currently
                available.
              </div>
            ) : (
              <div style={optionsGrid}>
                {options.map((option) => {
                  const canBuy =
                    !product.is_coming_soon &&
                    isOptionAvailable(option);

                  const availableQuantity =
                    getAvailableQuantity(option);

                  const maxKits = Math.floor(
                    availableQuantity / 10
                  );

                  const effectiveSalePercent =
                    getEffectiveSalePercent(
                      option
                    );

                  const isOnSale =
                    effectiveSalePercent >
                    0;

                  const activeCampaign =
                    getEffectiveCampaign(
                      option
                    );

                  const isSelected =
                    selectedOption?.id === option.id;

                  const kitSavings =
                    option.purchase_type === "kit"
                      ? getKitSavings(option)
                      : null;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        setSelectedOption(option);
                        setQuantity(1);
                        setCoaPanelOpen(true);
                      }}
                      style={{
                        ...optionButton,

                        cursor: "pointer",

                        background: isSelected
                          ? "linear-gradient(135deg, rgba(255,45,216,.13), rgba(0,217,255,.08))"
                          : "#101010",

                        border: isSelected
                          ? `2px solid ${
                              product.color ||
                              "#ff45d8"
                            }`
                          : "1px solid #333",

                        opacity: canBuy ? 1 : 0.68,

                        boxShadow: isSelected
                          ? "0 0 18px rgba(255,45,216,.15)"
                          : "none",
                      }}
                    >
                      {isOnSale && (
                        <div style={saleBadge}>
                          SALE{" "}
                          {effectiveSalePercent}% OFF
                          {activeCampaign?.campaignName
                            ? ` · ${activeCampaign.campaignName}`
                            : ""}
                        </div>
                      )}

                      <div style={optionMainLine}>
                        <strong>
                          {option.dosage}
                        </strong>

                        <span>
                          {" — "}
                          {getPurchaseLabel(
                            option.purchase_type
                          )}
                          {" — "}
                        </span>

                        {isOnSale ? (
                          <>
                            <span
                              style={regularPrice}
                            >
                              $
                              {Number(
                                option.price
                              ).toFixed(2)}
                            </span>

                            <span style={salePrice}>
                              $
                              {getSalePrice(
                                option
                              ).toFixed(2)}
                            </span>
                          </>
                        ) : (
                          <span>
                            $
                            {Number(
                              option.price
                            ).toFixed(2)}
                          </span>
                        )}
                      </div>

                      {kitSavings && !isOnSale && (
                        <div style={kitOptionSavings}>
                          <div style={kitOptionPriceCompare}>
                            <span style={regularPrice}>
                              ${kitSavings.tenSingleValue.toFixed(2)}
                            </span>

                            <span style={salePrice}>
                              ${kitSavings.kitPrice.toFixed(2)}
                            </span>
                          </div>

                          <strong>
                            KIT SAVINGS {kitSavings.savingsPercent.toFixed(2)}% OFF
                          </strong>

                          <span>
                            Save ${kitSavings.savingsAmount.toFixed(2)} vs. 10 single vials
                          </span>
                        </div>
                      )}

                      <span
                        style={{
                          ...stockLabel,

                          color: canBuy
                            ? "#00ff99"
                            : "#ff5a5a",
                        }}
                      >
                        {option.purchase_type ===
                        "single"
                          ? availableQuantity >= 1
                            ? `${availableQuantity} vial(s) available`
                            : "Out of stock"
                          : option.status ===
                              "pre-sale"
                            ? "Pre-sale"
                            : `${maxKits} kit(s) available`}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {selectedOption && !product.is_coming_soon && (
              <>
                <div style={quantitySection}>
                  <span style={quantityLabel}>
                    Quantity
                  </span>

                  <div style={quantityRow}>
                    <button
                      type="button"
                      onClick={() =>
                        setQuantity((previous) =>
                          Math.max(
                            1,
                            previous - 1
                          )
                        )
                      }
                      style={qtyButton}
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>

                    <span style={quantityNumber}>
                      {quantity}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setQuantity(
                          (previous) =>
                            previous + 1
                        )
                      }
                      style={qtyButton}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                </div>

                {!hasActiveSaleForOption(selectedOption) && (
                  <>
                {selectedOption.purchase_type === "single" ? (
                  <div style={bundleSavingsCard}>
                    <div style={bundleSavingsHeader}>
                      <strong>Bundle Savings</strong>

                      {quantity >= 10 ? (
                        <span style={bundlePausedBadge}>
                          CHOOSE THE 10-VIAL KIT
                        </span>
                      ) : getBundleTier(selectedOption, quantity) ? (
                        <span style={bundleActiveBadge}>
                          {getBundleTier(selectedOption, quantity)?.discount}% APPLIED
                        </span>
                      ) : null}
                    </div>

                    {quantity >= 10 ? (
                      <p style={bundleHelpText}>
                        For 10 vials, choose the Full Kit of 10 instead.
                        Kit pricing has its own built-in savings compared with
                        purchasing 10 single vials.
                      </p>
                    ) : selectedOption.bundle_discount_enabled === false ? (
                      <p style={bundleHelpText}>
                        Bundle savings are not enabled for this option.
                      </p>
                    ) : (
                      <>
                        <div style={bundleTierGrid}>
                          {[
                            {
                              quantity: Number(
                                selectedOption.bundle_qty_1 || 3
                              ),
                              discount: Number(
                                selectedOption.bundle_discount_1 || 2
                              ),
                            },
                            {
                              quantity: Number(
                                selectedOption.bundle_qty_2 || 5
                              ),
                              discount: Number(
                                selectedOption.bundle_discount_2 || 4
                              ),
                            },
                            {
                              quantity: Number(
                                selectedOption.bundle_qty_3 || 8
                              ),
                              discount: Number(
                                selectedOption.bundle_discount_3 || 7
                              ),
                            },
                          ]
                            .filter(
                              (tier) =>
                                tier.quantity > 0 &&
                                tier.quantity < 10 &&
                                tier.discount > 0
                            )
                            .map((tier) => {
                              const active =
                                quantity >= tier.quantity;

                              return (
                                <div
                                  key={`${tier.quantity}-${tier.discount}`}
                                  style={{
                                    ...bundleTier,
                                    ...(active
                                      ? bundleTierActive
                                      : {}),
                                  }}
                                >
                                  <strong>{tier.quantity}+ vials</strong>
                                  <span>{tier.discount}% off</span>
                                </div>
                              );
                            })}
                        </div>

                        <p style={bundleHelpText}>
                          Buying 10 vials? Select the Full Kit of 10 for
                          dedicated kit savings.
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  (() => {
                    const savings =
                      getKitSavings(selectedOption);

                    if (!savings) {
                      return null;
                    }

                    return (
                      <div style={kitSavingsCard}>
                        <div style={kitSavingsHeader}>
                          <div>
                            <span style={kitSavingsEyebrow}>
                              BUILT-IN 10-VIAL KIT SAVINGS
                            </span>

                            <strong style={kitSavingsTitle}>
                              {savings.savingsPercent.toFixed(2)}% OFF
                            </strong>
                          </div>

                          <span style={kitSavingsAmount}>
                            SAVE ${savings.savingsAmount.toFixed(2)}
                          </span>
                        </div>

                        <div style={kitSavingsComparison}>
                          <span>
                            10 single vials{" "}
                            <strong>
                              ${savings.tenSingleValue.toFixed(2)}
                            </strong>
                          </span>

                          <span>
                            Kit price{" "}
                            <strong>
                              ${savings.kitPrice.toFixed(2)}
                            </strong>
                          </span>
                        </div>

                        <p style={bundleHelpText}>
                          Kit savings are built into the regular kit price
                          and are separate from temporary sales or checkout discounts.
                        </p>
                      </div>
                    );
                  })()
                )}

                  </>
                )}

                <div style={availabilityBox}>
                  {selectedOption.purchase_type ===
                  "single" ? (
                    quantity >
                    getAvailableQuantity(
                      selectedOption
                    ) ? (
                      <span
                        style={{
                          color: "#ff5a5a",
                        }}
                      >
                        Only{" "}
                        {getAvailableQuantity(
                          selectedOption
                        )}{" "}
                        vial(s) are currently available.
                        Please reduce the quantity.
                      </span>
                    ) : (
                      <span
                        style={{
                          color: "#00ff99",
                        }}
                      >
                        {getAvailableQuantity(
                          selectedOption
                        )}{" "}
                        vial(s) currently available.
                      </span>
                    )
                  ) : quantity >
                    Math.floor(
                      getAvailableQuantity(
                        selectedOption
                      ) / 10
                    ) ? (
                    <span
                      style={{
                        color: "#ffcc66",
                      }}
                    >
                      {Math.floor(
                        getAvailableQuantity(
                          selectedOption
                        ) / 10
                      )}{" "}
                      kit(s) are currently in stock.
                      Additional kits will be fulfilled as
                      pre-sale and may take up to 2 weeks.
                    </span>
                  ) : (
                    <span
                      style={{
                        color: "#00ff99",
                      }}
                    >
                      {Math.floor(
                        getAvailableQuantity(
                          selectedOption
                        ) / 10
                      )}{" "}
                      kit(s) currently available.
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={
                    !isOptionAvailable(
                      selectedOption
                    ) ||
                    (
                      selectedOption.purchase_type ===
                        "single" &&
                      quantity >
                        getAvailableQuantity(
                          selectedOption
                        )
                    )
                  }
                  style={{
                    ...addButton,

                    opacity:
                      !isOptionAvailable(
                        selectedOption
                      ) ||
                      (
                        selectedOption.purchase_type ===
                          "single" &&
                        quantity >
                          getAvailableQuantity(
                            selectedOption
                          )
                      )
                        ? 0.5
                        : 1,

                    cursor:
                      !isOptionAvailable(
                        selectedOption
                      ) ||
                      (
                        selectedOption.purchase_type ===
                          "single" &&
                        quantity >
                          getAvailableQuantity(
                            selectedOption
                          )
                      )
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  Add to Cart
                </button>
              </>
            )}

            </div>

          </div>

          {/* Right column: product overview and dosage-specific COAs */}
          <div className="product-detail-middle" style={purchaseColumn}>
            {product.is_coming_soon && (
              <div style={comingSoonBadge}>COMING SOON</div>
            )}

            {!product.is_coming_soon && isCurrentProductNew() && (
              <div style={productNewBadge}>NEW PRODUCT</div>
            )}

            <h1 style={productTitle}>
              {product.name}
            </h1>

            {product.short_description && (
              <section style={simpleOverviewCard}>
                <span style={simpleOverviewEyebrow}>Simple Overview</span>
                <h2 style={simpleOverviewTitle}>What researchers are studying</h2>
                <p style={shortDescriptionText}>
                  {product.short_description}
                </p>
              </section>
            )}

            <div style={disclaimerBox}>
              For research purposes only. Not for human or
              veterinary use.
            </div>

            {product.is_coming_soon && (
              <div style={comingSoonBox}>
                <strong>COMING SOON</strong>
                <span>
                  This research product is visible for preview but is not
                  available for purchase yet.
                </span>
                {product.coming_soon_date && (
                  <span style={comingSoonDate}>
                    Expected: {formatLaunchDate(product.coming_soon_date)}
                  </span>
                )}
              </div>
            )}

            {selectedOption?.status ===
              "pre-sale" && (
              <div style={presaleBox}>
                <strong>⚠️ PRE-SALE ITEM</strong>

                <span>
                  Estimated delivery time may take up to 2
                  weeks.
                </span>
              </div>
            )}

            {product.is_coming_soon && (
              <button
                type="button"
                disabled
                style={{
                  ...addButton,
                  marginTop: 18,
                  opacity: 0.62,
                  cursor: "not-allowed",
                  background:
                    "linear-gradient(90deg, rgba(255,204,0,.18), rgba(255,117,223,.16))",
                  borderColor: "rgba(255,204,0,.45)",
                  color: "#ffdf73",
                }}
              >
                COMING SOON
              </button>
            )}

          {coaPanelOpen &&
            selectedOption && (
            <aside
              style={coaMiddlePanel}
              aria-label={`COAs for ${product.name} ${selectedOption.dosage}`}
            >
              <div style={coaPanelHeader}>
                <div>
                  <span style={coaPanelEyebrow}>
                    CERTIFICATES OF ANALYSIS
                  </span>

                  <h2 style={coaPanelTitle}>
                    {product.name}
                  </h2>

                  <div style={coaDosageBadge}>
                    {selectedOption.dosage}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setCoaPanelOpen(
                      false
                    )
                  }
                  style={coaCloseButton}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              <p style={coaPanelHelp}>
                The newest COA for the selected dosage is shown below.
                Older reports are available from the dropdown when present.
              </p>

              <div style={coaList}>
                {coaLoading ? (
                  <div style={coaEmptyState}>
                    Loading COAs...
                  </div>
                ) : selectedCoas.length === 0 ? (
                  <div style={coaEmptyState}>
                    No active COAs are currently listed for{" "}
                    <strong>
                      {selectedOption.dosage}
                    </strong>
                    .
                  </div>
                ) : (
                  <>
                    <div style={coaPrimaryRow}>
                      <div style={coaPrimaryLabel}>
                        <span style={coaReportLabel}>
                          MOST RECENT COA
                        </span>

                        <strong style={coaReportDate}>
                          {formatCoaDate(
                            selectedCoas[0].test_date
                          )}
                        </strong>
                      </div>

                      {selectedCoas.length > 1 && (
                        <details style={coaHistoryDropdown}>
                          <summary style={coaHistorySummary}>
                            Older COAs ({selectedCoas.length - 1}) ▾
                          </summary>

                          <div style={coaHistoryMenu}>
                            {selectedCoas
                              .slice(1)
                              .map(
                                (
                                  document,
                                  index
                                ) => (
                                  <div
                                    key={document.id}
                                    style={coaHistoryItem}
                                  >
                                    <div style={coaHistoryItemCopy}>
                                      <strong style={coaHistoryDate}>
                                        {formatCoaDate(
                                          document.test_date
                                        )}
                                      </strong>

                                      <span style={coaHistoryMeta}>
                                        {document.lab_name ||
                                          "Lab not listed"}
                                        {document.report_id
                                          ? ` · ${document.report_id}`
                                          : ""}
                                      </span>
                                    </div>

                                    {document.file_path ? (
                                      <a
                                        href={getCoaPublicUrl(
                                          document
                                        )}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={coaHistoryViewButton}
                                      >
                                        View ↗
                                      </a>
                                    ) : (
                                      <span style={coaHistoryUnavailable}>
                                        Unavailable
                                      </span>
                                    )}
                                  </div>
                                )
                              )}
                          </div>
                        </details>
                      )}
                    </div>

                    <article
                      key={selectedCoas[0].id}
                      style={coaListItem}
                    >
                      <div style={coaListItemTop}>
                        <div>
                          <span style={coaReportLabel}>
                            CURRENT DISPLAY
                          </span>

                          <strong style={coaReportDate}>
                            {formatCoaDate(
                              selectedCoas[0].test_date
                            )}
                          </strong>
                        </div>

                        <span style={coaCurrentBadge}>
                          LATEST
                        </span>
                      </div>

                      <div style={coaMetaGrid}>
                        <div style={coaMetaItem}>
                          <span style={coaMetaLabel}>
                            LAB
                          </span>
                          <strong>
                            {selectedCoas[0].lab_name ||
                              "Not listed"}
                          </strong>
                        </div>

                        <div style={coaMetaItem}>
                          <span style={coaMetaLabel}>
                            PURITY
                          </span>
                          <strong>
                            {selectedCoas[0].purity_percent !==
                              null &&
                            selectedCoas[0].purity_percent !==
                              undefined
                              ? `${Number(
                                  selectedCoas[0].purity_percent
                                ).toFixed(2)}%`
                              : "Not listed"}
                          </strong>
                        </div>

                        <div style={coaMetaItem}>
                          <span style={coaMetaLabel}>
                            REPORT ID
                          </span>
                          <strong>
                            {selectedCoas[0].report_id ||
                              "Not listed"}
                          </strong>
                        </div>

                        <div style={coaMetaItem}>
                          <span style={coaMetaLabel}>
                            NET CONTENT
                          </span>
                          <strong>
                            {selectedCoas[0].net_content ||
                              "Not listed"}
                          </strong>
                        </div>
                      </div>

                      {selectedCoas[0].test_method && (
                        <div style={coaMethod}>
                          <span style={coaMetaLabel}>
                            TEST METHOD
                          </span>

                          <span>
                            {selectedCoas[0].test_method}
                          </span>
                        </div>
                      )}

                      {selectedCoas[0].file_path ? (
                        <a
                          href={getCoaPublicUrl(
                            selectedCoas[0]
                          )}
                          target="_blank"
                          rel="noreferrer"
                          style={coaViewButton}
                        >
                          VIEW MOST RECENT COA ↗
                        </a>
                      ) : (
                        <span style={coaUnavailable}>
                          COA file unavailable
                        </span>
                      )}
                    </article>
                  </>
                )}
              </div>
            </aside>
            )}

            <section style={productSearchCard}>
              <div style={productSearchHeader}>
                <span style={productSearchEyebrow}>
                  QUICK PRODUCT SEARCH
                </span>

                <strong style={productSearchTitle}>
                  Find another product
                </strong>
              </div>

              <div style={productSearchWrap}>
                <input
                  type="search"
                  value={productSearch}
                  onChange={(event) =>
                    setProductSearch(
                      event.target.value
                    )
                  }
                  onFocus={() =>
                    setProductSearchFocused(
                      true
                    )
                  }
                  onBlur={() =>
                    window.setTimeout(
                      () =>
                        setProductSearchFocused(
                          false
                        ),
                      120
                    )
                  }
                  placeholder="Search products..."
                  style={productSearchInput}
                  aria-label="Search products"
                />

                {productSearchFocused &&
                  productSearch.trim() && (
                  <div style={productSearchResults}>
                    {filteredSearchProducts.length ===
                    0 ? (
                      <div style={productSearchEmpty}>
                        No matching products found.
                      </div>
                    ) : (
                      filteredSearchProducts.map(
                        (item) => (
                          <Link
                            key={item.id}
                            href={`/products/${item.slug}`}
                            style={productSearchResultLink}
                          >
                            <img
                              src={
                                item.image ||
                                "/pugpep-logo.png"
                              }
                              alt=""
                              style={productSearchThumb}
                            />

                            <div style={productSearchResultCopy}>
                              <strong>
                                {item.name}
                              </strong>

                              <span>
                                View product →
                              </span>
                            </div>
                          </Link>
                        )
                      )
                    )}
                  </div>
                )}
              </div>
            </section>


          </div>


        </section>



        <section
          className="product-detail-recommendations"
          style={recommendationStrip}
        >
          {renderRecommendationSection({
            eyebrow: "CONTINUE EXPLORING",
            title: "Recently Viewed",
            items: recentlyViewed,
          })}

          {renderRecommendationSection({
            eyebrow: "PURCHASE PATTERNS",
            title: "Customers Also Bought",
            items: alsoBought,
          })}

          {renderRecommendationSection({
            eyebrow: "ACTIVE SAVINGS",
            title: "Relevant Items On Sale",
            items: saleRecommendations,
          })}
        </section>

        <section style={descriptionSection}>
          <button
            type="button"
            onClick={() =>
              setResearchDetailsOpen(
                (previous) => !previous
              )
            }
            style={researchDetailsToggle}
            aria-expanded={researchDetailsOpen}
          >
            <div style={researchDetailsToggleCopy}>
              <span style={researchDetailsEyebrow}>
                PRODUCT INFORMATION
              </span>

              <strong style={researchDetailsToggleTitle}>
                Research Details
              </strong>
            </div>

            <span
              style={{
                ...researchDetailsArrow,
                transform: researchDetailsOpen
                  ? "rotate(180deg)"
                  : "rotate(0deg)",
              }}
              aria-hidden="true"
            >
              ▼
            </span>
          </button>

          {researchDetailsOpen && (
            <div style={researchDetailsContent}>
          <div style={descriptionHeader}>
            <span style={descriptionEyebrow}>
              Product Information
            </span>

            <h2 style={descriptionTitle}>
              Research Details
            </h2>
          </div>

          <div style={infoTabs}>
            <button
              type="button"
              onClick={() =>
                setActiveInfoTab(
                  "description"
                )
              }
              style={{
                ...infoTabButton,
                ...(activeInfoTab ===
                "description"
                  ? infoTabButtonActive
                  : {}),
              }}
            >
              Description
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveInfoTab(
                  "storage"
                )
              }
              style={{
                ...infoTabButton,
                ...(activeInfoTab ===
                "storage"
                  ? infoTabButtonActive
                  : {}),
              }}
            >
              Storage
            </button>
          </div>

          <div style={descriptionContent}>
            {activeInfoTab ===
            "description" ? (
              product.description ? (
                renderDescription(
                  product.description
                )
              ) : (
                <p style={descriptionParagraph}>
                  No description has been added for this product yet.
                </p>
              )
            ) : product.storage ? (
              renderDescription(
                product.storage
              )
            ) : (
              <p style={descriptionParagraph}>
                Storage information has not been added for this product yet.
              </p>
            )}
          </div>
            </div>
          )}
        </section>
      </div>


    </main>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top, #10151a 0%, #030303 38%, #000 100%)",
  color: "#fff",
  padding: "32px 22px 70px",
};

const pageContainer = {
  width: "100%",
  maxWidth: 1300,
  margin: "0 auto",
};

const backLink = {
  color: "#00d9ff",
  textDecoration: "none",
  display: "inline-block",
  marginBottom: 26,
  fontWeight: 700,
};

const loadingText = {
  color: "#00d9ff",
  fontSize: 18,
};

const notFoundTitle = {
  color: "#ff45d8",
};

const productLayout = {
  width: "100%",
  display: "grid",
  gridTemplateColumns:
    "minmax(340px, .95fr) minmax(420px, 1.05fr)",
  gridTemplateAreas:
    '"left middle"',
  gap: "clamp(22px, 3vw, 38px)",
  alignItems: "start",
  marginBottom: 36,
};

const imageColumn = {
  gridArea: "left",
  minWidth: 0,
  display: "grid",
  gap: 20,
};

const imageOptionSection = {
  display: "grid",
  gap: 0,
  padding: "2px 0 0",
};

const imageBox = {
  background:
    "linear-gradient(145deg, #0d0d0d, #030303)",
  border: "1px solid rgba(255,255,255,.12)",
  borderRadius: 24,
  padding: "clamp(14px, 3vw, 24px)",
  boxShadow:
    "0 22px 60px rgba(0,0,0,.45)",
};

const productImage = {
  width: "100%",
  height: "auto",
  display: "block",
  borderRadius: 18,
  objectFit: "contain" as const,
};









const purchaseColumn = {
  gridArea: "middle",
  minWidth: 0,
  display: "grid",
  alignContent: "start",
};

const comingSoonBadge = {
  width: "fit-content",
  marginBottom: 12,
  padding: "7px 12px",
  border: "1px solid rgba(255,204,0,.55)",
  borderRadius: 999,
  background: "rgba(255,204,0,.10)",
  color: "#ffdf73",
  fontSize: 12,
  fontWeight: 1000,
  letterSpacing: ".1em",
  boxShadow: "0 0 18px rgba(255,204,0,.18)",
};

const productNewBadge = {
  width: "fit-content",
  marginBottom: 12,
  padding: "7px 12px",
  borderRadius: 999,
  background: "linear-gradient(90deg, #00ff99, #00d9ff)",
  color: "#000",
  fontSize: 12,
  fontWeight: 1000,
  letterSpacing: ".1em",
  boxShadow: "0 0 18px rgba(0,255,153,.38)",
};

const productTitle = {
  color: "#e1e5e9",
  fontSize: "clamp(38px, 5vw, 58px)",
  lineHeight: 1.05,
  margin: "0 0 20px",
  overflowWrap: "anywhere" as const,
  textShadow:
    "0 0 20px rgba(207,211,216,.22)",
};

const simpleOverviewCard = {
  marginTop: 26,
  padding: "clamp(20px, 3vw, 28px)",
  border: "1px solid rgba(255,255,255,.12)",
  borderRadius: 20,
  background:
    "linear-gradient(145deg, rgba(255,255,255,.055), rgba(255,255,255,.02))",
  boxShadow: "0 15px 36px rgba(0,0,0,.22)",
};

const simpleOverviewEyebrow = {
  display: "block",
  marginBottom: 7,
  color: "#00d9ff",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.14em",
  textTransform: "uppercase" as const,
};

const simpleOverviewTitle = {
  margin: "0 0 12px",
  color: "#f0f2f4",
  fontSize: 23,
};

const shortDescriptionText = {
  margin: 0,
  color: "#d2d6da",
  fontSize: 17,
  lineHeight: 1.75,
  whiteSpace: "pre-line" as const,
};

const disclaimerBox = {
  padding: 15,
  border: "1px solid rgba(255,69,216,.75)",
  borderRadius: 12,
  color: "#ffd1f7",
  background: "rgba(255,45,216,.08)",
  fontWeight: 700,
  lineHeight: 1.55,
};

const comingSoonBox = {
  display: "grid",
  gap: 6,
  marginTop: 16,
  padding: 16,
  border: "1px solid rgba(255,204,0,.48)",
  borderRadius: 12,
  background:
    "linear-gradient(135deg, rgba(255,204,0,.08), rgba(255,69,216,.045))",
  color: "#f4f1dc",
  lineHeight: 1.55,
};

const comingSoonDate = {
  color: "#ffdf73",
  fontWeight: 900,
};

const presaleBox = {
  display: "grid",
  gap: 6,
  marginTop: 16,
  padding: 16,
  border: "1px solid #ffbf00",
  borderRadius: 12,
  background: "rgba(255,191,0,.08)",
  color: "#ffcc66",
  lineHeight: 1.5,
};

const selectOptionTitle = {
  color: "#00d9ff",
  marginTop: 30,
  marginBottom: 16,
  fontSize: 24,
};

const noOptionsBox = {
  padding: 18,
  border: "1px solid #333",
  borderRadius: 12,
  background: "#101010",
  color: "#aaa",
};

const optionsGrid = {
  display: "grid",
  gap: 12,
};

const optionButton = {
  width: "100%",
  padding: 15,
  borderRadius: 12,
  color: "#fff",
  textAlign: "left" as const,
  overflowWrap: "anywhere" as const,
  transition:
    "border-color .2s ease, background .2s ease, opacity .2s ease",
};

const optionMainLine = {
  lineHeight: 1.65,
  fontSize: 16,
};

const saleBadge = {
  display: "inline-block",
  marginBottom: 9,
  padding: "4px 10px",
  borderRadius: 999,
  background: "#00ff99",
  color: "#000",
  fontWeight: 800,
  fontSize: 12,
};

const regularPrice = {
  textDecoration: "line-through",
  color: "#888",
  marginRight: 8,
};

const salePrice = {
  color: "#00ff99",
  fontWeight: 800,
};

const stockLabel = {
  display: "block",
  marginTop: 6,
  fontSize: 14,
  fontWeight: 700,
};

const quantitySection = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 20,
  marginTop: 25,
  padding: "14px 0",
  borderTop:
    "1px solid rgba(255,255,255,.12)",
  borderBottom:
    "1px solid rgba(255,255,255,.12)",
};

const quantityLabel = {
  color: "#ddd",
  fontWeight: 700,
};

const quantityRow = {
  display: "flex",
  gap: 12,
  alignItems: "center",
};

const quantityNumber = {
  minWidth: 40,
  textAlign: "center" as const,
  fontWeight: 800,
  fontSize: 18,
};

const qtyButton = {
  width: 40,
  height: 40,
  borderRadius: 9,
  border: "1px solid #00d9ff",
  background: "#111",
  color: "#00d9ff",
  cursor: "pointer",
  fontWeight: 800,
  fontSize: 18,
};

const kitOptionPriceCompare = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 3,
  fontSize: 14,
};

const kitOptionSavings = {
  marginTop: 7,
  display: "grid",
  gap: 2,
  color: "#00ff99",
  fontSize: 11,
  lineHeight: 1.35,
  textAlign: "left" as const,
};

const kitSavingsCard = {
  marginTop: 16,
  padding: 15,
  borderRadius: 12,
  border: "1px solid rgba(0,255,153,.34)",
  background:
    "linear-gradient(145deg, rgba(0,255,153,.07), rgba(0,0,0,.35))",
};

const kitSavingsHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap" as const,
};

const kitSavingsEyebrow = {
  display: "block",
  color: "#888",
  fontSize: 9,
  fontWeight: 900,
  letterSpacing: ".12em",
};

const kitSavingsTitle = {
  display: "block",
  marginTop: 4,
  color: "#00ff99",
  fontSize: 23,
};

const kitSavingsAmount = {
  padding: "6px 10px",
  borderRadius: 999,
  background: "#00ff99",
  color: "#000",
  fontSize: 11,
  fontWeight: 900,
};

const kitSavingsComparison = {
  marginTop: 12,
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap" as const,
  color: "#c7c7ce",
  fontSize: 13,
};

const bundleSavingsCard = {
  marginTop: 16,
  padding: 14,
  borderRadius: 12,
  border: "1px solid rgba(0,217,255,.22)",
  background: "rgba(0,217,255,.045)",
};

const bundleSavingsHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap" as const,
  color: "#fff",
};

const bundleTierGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 8,
  marginTop: 12,
};

const bundleTier = {
  display: "grid",
  gap: 3,
  padding: "9px 7px",
  borderRadius: 9,
  border: "1px solid rgba(255,255,255,.12)",
  background: "#0b0b0b",
  color: "#aaa",
  fontSize: 12,
  textAlign: "center" as const,
};

const bundleTierActive = {
  border: "1px solid rgba(0,255,153,.55)",
  background: "rgba(0,255,153,.08)",
  color: "#bfffe3",
};

const bundleActiveBadge = {
  padding: "4px 8px",
  borderRadius: 999,
  background: "#00ff99",
  color: "#000",
  fontSize: 10,
  fontWeight: 900,
};

const bundlePausedBadge = {
  padding: "4px 8px",
  borderRadius: 999,
  background: "rgba(255,204,0,.12)",
  border: "1px solid rgba(255,204,0,.35)",
  color: "#ffcc00",
  fontSize: 10,
  fontWeight: 900,
};

const bundleHelpText = {
  margin: "10px 0 0",
  color: "#aaa",
  fontSize: 12,
  lineHeight: 1.5,
};

const availabilityBox = {
  marginTop: 16,
  padding: 14,
  borderRadius: 11,
  border: "1px solid rgba(255,255,255,.15)",
  background: "rgba(255,255,255,.045)",
  color: "#ccc",
  lineHeight: 1.6,
  fontWeight: 700,
};

const addButton = {
  marginTop: 20,
  width: "100%",
  padding: "17px 22px",
  border: "none",
  borderRadius: 12,
  background:
    "linear-gradient(90deg, #00b7ff, #ff2fd0)",
  color: "#fff",
  fontWeight: 800,
  fontSize: 18,
  boxShadow:
    "0 12px 30px rgba(255,47,208,.16)",
};

const researchDetailsToggle = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 18,
  padding: "18px 20px",
  borderRadius: 16,
  border:
    "1px solid rgba(125,249,255,.28)",
  background:
    "linear-gradient(135deg, rgba(0,217,255,.07), rgba(255,45,216,.05))",
  color: "#fff",
  cursor: "pointer",
  textAlign: "left" as const,
};

const researchDetailsToggleCopy = {
  display: "grid",
  gap: 4,
};

const researchDetailsEyebrow = {
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: ".13em",
  color: "#7df9ff",
};

const researchDetailsToggleTitle = {
  fontSize: 18,
  lineHeight: 1.2,
};

const researchDetailsArrow = {
  flexShrink: 0,
  fontSize: 16,
  color: "#ff75df",
  transition: "transform .2s ease",
};

const researchDetailsContent = {
  marginTop: 14,
};

const productSearchCard = {
  marginTop: 18,
  padding: 16,
  borderRadius: 16,
  border:
    "1px solid rgba(255,45,216,.22)",
  background:
    "linear-gradient(180deg, rgba(255,45,216,.05), rgba(0,217,255,.035))",
  boxShadow:
    "0 14px 32px rgba(0,0,0,.24)",
};

const productSearchHeader = {
  display: "grid",
  gap: 3,
  marginBottom: 10,
};

const productSearchEyebrow = {
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: ".12em",
  color: "#ff75df",
};

const productSearchTitle = {
  fontSize: 15,
  color: "#fff",
};

const productSearchWrap = {
  position: "relative" as const,
};

const productSearchInput = {
  width: "100%",
  boxSizing: "border-box" as const,
  height: 42,
  borderRadius: 11,
  border:
    "1px solid rgba(125,249,255,.28)",
  background: "#090909",
  color: "#fff",
  padding: "0 13px",
  outline: "none",
  fontSize: 13,
};

const productSearchResults = {
  position: "absolute" as const,
  top: "calc(100% + 8px)",
  left: 0,
  right: 0,
  zIndex: 40,
  maxHeight: 330,
  overflowY: "auto" as const,
  padding: 8,
  borderRadius: 12,
  border:
    "1px solid rgba(0,217,255,.3)",
  background: "#070707",
  boxShadow:
    "0 18px 42px rgba(0,0,0,.58)",
};

const productSearchResultLink = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  textDecoration: "none",
  color: "#fff",
  padding: 9,
  borderRadius: 10,
  borderBottom:
    "1px solid rgba(255,255,255,.06)",
};

const productSearchThumb = {
  width: 42,
  height: 42,
  borderRadius: 9,
  objectFit: "cover" as const,
  background: "#111",
  flexShrink: 0,
};

const productSearchResultCopy = {
  minWidth: 0,
  display: "grid",
  gap: 3,
  fontSize: 12,
};

const productSearchEmpty = {
  padding: "12px 10px",
  color: "#8f949a",
  fontSize: 12,
};

const descriptionSection = {
  width: "100%",
  padding: "clamp(25px, 5vw, 48px)",
  boxSizing: "border-box" as const,
  border: "1px solid rgba(0,217,255,.25)",
  borderRadius: 22,
  background:
    "linear-gradient(145deg, rgba(0,217,255,.055), rgba(255,45,216,.04))",
  boxShadow:
    "0 20px 55px rgba(0,0,0,.25)",
};

const descriptionHeader = {
  marginBottom: 30,
  paddingBottom: 20,
  borderBottom:
    "1px solid rgba(255,255,255,.12)",
};

const descriptionEyebrow = {
  display: "block",
  marginBottom: 8,
  color: "#ff65dc",
  fontSize: 13,
  fontWeight: 800,
  letterSpacing: "0.14em",
  textTransform: "uppercase" as const,
};

const descriptionTitle = {
  margin: 0,
  color: "#00d9ff",
  fontSize: "clamp(28px, 4vw, 38px)",
  textShadow:
    "0 0 14px rgba(0,217,255,.35)",
};

const descriptionContent = {
  display: "grid",
  gap: 26,
  maxWidth: 1100,
};

const descriptionBlock = {
  display: "grid",
  gap: 10,
};

const descriptionHeading = {
  margin: 0,
  color: "#ff65dc",
  fontSize: 20,
  lineHeight: 1.4,
};

const descriptionParagraph = {
  margin: 0,
  color: "#d7d7d7",
  fontSize: 17,
  lineHeight: 1.85,
  whiteSpace: "pre-line" as const,
  overflowWrap: "anywhere" as const,
};

const recommendationStrip = {
  width: "100%",
  display: "grid",
  gridTemplateColumns:
    "repeat(3, minmax(0, 1fr))",
  gap: 18,
  marginBottom: 46,
  alignItems: "start",
};

const recommendationSection = {
  width: "100%",
  marginBottom: 0,
  padding: 14,
  boxSizing: "border-box" as const,
  border: "1px solid rgba(255,255,255,.10)",
  borderRadius: 22,
  background:
    "linear-gradient(145deg, rgba(255,255,255,.035), rgba(0,0,0,.72))",
};

const recommendationHeader = {
  marginBottom: 18,
};

const recommendationEyebrow = {
  display: "block",
  marginBottom: 7,
  color: "#ff65dc",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: "0.14em",
};

const recommendationTitle = {
  margin: 0,
  color: "#00d9ff",
  fontSize: "clamp(24px, 3vw, 32px)",
};

const recommendationGrid = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 10,
};

const recommendationLink = {
  textDecoration: "none",
  color: "inherit",
};

const recommendationCard = {
  minHeight: 78,
  overflow: "hidden",
  display: "grid",
  gridTemplateColumns: "78px minmax(0, 1fr)",
  border: "1px solid rgba(0,217,255,.20)",
  borderRadius: 16,
  background: "#080808",
  transition: "transform .2s ease, border-color .2s ease",
};

const recommendationImageWrap = {
  position: "relative" as const,
  width: 78,
  height: 78,
  overflow: "hidden",
  background: "#030303",
};

const recommendationImage = {
  width: "100%",
  height: "100%",
  objectFit: "cover" as const,
  display: "block",
};

const recommendationSaleBadge = {
  position: "absolute" as const,
  top: 10,
  right: 10,
  maxWidth: "78%",
  padding: "5px 9px",
  borderRadius: 999,
  background: "#00ff99",
  color: "#000",
  fontSize: 11,
  fontWeight: 900,
};

const recommendationCopy = {
  display: "grid",
  gap: 7,
  padding: 14,
};

const recommendationName = {
  color: "#fff",
  fontSize: 16,
  lineHeight: 1.35,
};

const recommendationCampaign = {
  color: "#ff75df",
  fontSize: 11,
  fontWeight: 800,
};

const recommendationCta = {
  marginTop: 3,
  color: "#00d9ff",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: ".08em",
};

const infoTabs = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap" as const,
  marginBottom: 26,
};

const infoTabButton = {
  minWidth: 130,
  padding: "11px 18px",
  border: "1px solid rgba(255,255,255,.16)",
  borderRadius: 999,
  background: "#0b0b0b",
  color: "#aaa",
  fontWeight: 900,
  cursor: "pointer",
};

const infoTabButtonActive = {
  border: "1px solid #00d9ff",
  background:
    "linear-gradient(90deg, rgba(0,217,255,.12), rgba(255,69,216,.10))",
  color: "#fff",
  boxShadow: "0 0 16px rgba(0,217,255,.15)",
};

const coaMiddlePanel = {
  width: "100%",
  boxSizing: "border-box" as const,
  marginTop: 18,
  marginBottom: 4,
  padding: "18px 16px 20px",
  background:
    "linear-gradient(180deg, #080b0d 0%, #030303 58%, #000 100%)",
  border:
    "1px solid rgba(0,217,255,.32)",
  borderRadius: 18,
  boxShadow:
    "0 16px 36px rgba(0,0,0,.32)",
};

const coaPanelHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 18,
  paddingBottom: 18,
  borderBottom:
    "1px solid rgba(255,255,255,.10)",
};

const coaPanelEyebrow = {
  display: "block",
  marginBottom: 7,
  color: "#ff65dc",
  fontSize: 10,
  fontWeight: 1000,
  letterSpacing: ".16em",
};

const coaPanelTitle = {
  margin: 0,
  color: "#f1f4f6",
  fontSize: 24,
  lineHeight: 1.15,
};

const coaDosageBadge = {
  width: "fit-content",
  marginTop: 10,
  padding: "6px 10px",
  borderRadius: 999,
  background: "rgba(0,217,255,.11)",
  border:
    "1px solid rgba(0,217,255,.42)",
  color: "#7df9ff",
  fontSize: 12,
  fontWeight: 1000,
};

const coaCloseButton = {
  width: 34,
  height: 34,
  flex: "0 0 auto",
  display: "grid",
  placeItems: "center",
  borderRadius: 9,
  border:
    "1px solid rgba(255,255,255,.16)",
  background: "#0d0d0d",
  color: "#fff",
  cursor: "pointer",
  fontSize: 22,
  lineHeight: 1,
};

const coaPanelHelp = {
  margin: "14px 0",
  color: "#9da3aa",
  fontSize: 11,
  lineHeight: 1.55,
};

const coaPrimaryRow = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap" as const,
  marginBottom: 12,
};

const coaPrimaryLabel = {
  display: "grid",
  gap: 4,
};

const coaHistoryDropdown = {
  position: "relative" as const,
  zIndex: 20,
};

const coaHistorySummary = {
  listStyle: "none",
  cursor: "pointer",
  userSelect: "none" as const,
  padding: "8px 11px",
  borderRadius: 10,
  border: "1px solid rgba(0,217,255,.35)",
  background: "rgba(0,217,255,.07)",
  color: "#7df9ff",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: ".06em",
  whiteSpace: "nowrap" as const,
};

const coaHistoryMenu = {
  position: "absolute" as const,
  top: "calc(100% + 8px)",
  right: 0,
  width: "min(360px, 82vw)",
  maxHeight: 300,
  overflowY: "auto" as const,
  padding: 8,
  borderRadius: 12,
  border: "1px solid rgba(255,45,216,.35)",
  background: "#080808",
  boxShadow: "0 18px 40px rgba(0,0,0,.55)",
};

const coaHistoryItem = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "10px 9px",
  borderBottom: "1px solid rgba(255,255,255,.08)",
};

const coaHistoryItemCopy = {
  minWidth: 0,
  display: "grid",
  gap: 3,
};

const coaHistoryDate = {
  color: "#fff",
  fontSize: 12,
};

const coaHistoryMeta = {
  color: "#9aa0a6",
  fontSize: 10,
  lineHeight: 1.35,
  overflowWrap: "anywhere" as const,
};

const coaHistoryViewButton = {
  flexShrink: 0,
  textDecoration: "none",
  color: "#00ff99",
  fontSize: 11,
  fontWeight: 900,
  padding: "6px 8px",
  borderRadius: 8,
  border: "1px solid rgba(0,255,153,.3)",
  background: "rgba(0,255,153,.06)",
};

const coaHistoryUnavailable = {
  flexShrink: 0,
  color: "#777",
  fontSize: 10,
};

const coaList = {
  display: "grid",
  gap: 10,
};

const coaEmptyState = {
  padding: "18px 14px",
  borderRadius: 12,
  border:
    "1px solid rgba(255,255,255,.11)",
  background: "#0a0a0a",
  color: "#a9adb3",
  lineHeight: 1.55,
};

const coaListItem = {
  padding: 14,
  borderRadius: 14,
  border:
    "1px solid rgba(0,217,255,.20)",
  background:
    "linear-gradient(145deg, rgba(0,217,255,.055), rgba(255,69,216,.03))",
  boxShadow:
    "0 10px 24px rgba(0,0,0,.20)",
};

const coaListItemTop = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 10,
  marginBottom: 12,
};

const coaReportLabel = {
  display: "block",
  marginBottom: 4,
  color: "#858b93",
  fontSize: 9,
  fontWeight: 1000,
  letterSpacing: ".14em",
};

const coaReportDate = {
  color: "#fff",
  fontSize: 16,
};

const coaCurrentBadge = {
  padding: "4px 7px",
  borderRadius: 999,
  background: "rgba(0,255,153,.10)",
  border:
    "1px solid rgba(0,255,153,.38)",
  color: "#00ff99",
  fontSize: 8,
  fontWeight: 1000,
  letterSpacing: ".08em",
};

const coaMetaGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",
  gap: 8,
};

const coaMetaItem = {
  minWidth: 0,
  display: "grid",
  gap: 4,
  padding: "8px 9px",
  borderRadius: 9,
  background: "rgba(255,255,255,.035)",
  color: "#d9dde1",
  fontSize: 11,
  overflowWrap: "anywhere" as const,
};

const coaMetaLabel = {
  color: "#747b84",
  fontSize: 8,
  fontWeight: 1000,
  letterSpacing: ".12em",
};

const coaMethod = {
  display: "grid",
  gap: 4,
  marginTop: 9,
  color: "#b9bec4",
  fontSize: 10,
  lineHeight: 1.5,
};

const coaViewButton = {
  marginTop: 12,
  width: "100%",
  boxSizing: "border-box" as const,
  display: "block",
  padding: "10px 12px",
  borderRadius: 9,
  border:
    "1px solid rgba(255,69,216,.45)",
  background:
    "linear-gradient(90deg, rgba(0,217,255,.10), rgba(255,69,216,.11))",
  color: "#fff",
  textDecoration: "none",
  textAlign: "center" as const,
  fontSize: 10,
  fontWeight: 1000,
  letterSpacing: ".08em",
};

const coaUnavailable = {
  display: "block",
  marginTop: 10,
  color: "#777d84",
  fontSize: 10,
};

const backButton = {
  background: "none",
  border: "none",
  color: "#00d9ff",
  cursor: "pointer",
  fontSize: 16,
  padding: 0,
};