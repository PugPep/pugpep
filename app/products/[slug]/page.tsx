"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../../lib/supabaseClient";
import {
  loadStorefrontSales,
  type StorefrontSale,
} from "../../../lib/storefrontCampaigns";
import { useCart } from "../../cartContext";

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

const RECENTLY_VIEWED_KEY =
  "pugpep_recently_viewed";


export default function ProductDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const supabase = useMemo(() => createClient(), []);
  const { addToCart } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selectedOption, setSelectedOption] =
    useState<ProductOption | null>(null);

  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  const [activeInfoTab, setActiveInfoTab] =
    useState<"description" | "storage">("description");

  const [recentlyViewed, setRecentlyViewed] =
    useState<RecentlyViewedItem[]>([]);

  const [alsoBought, setAlsoBought] =
    useState<RecommendationProduct[]>([]);

  const [saleRecommendations, setSaleRecommendations] =
    useState<RecommendationProduct[]>([]);

  const [saleMap, setSaleMap] =
    useState<Record<string, StorefrontSale>>({});

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
          item.slug !== viewedProduct.slug
      ),
    ].slice(0, 8);

    localStorage.setItem(
      RECENTLY_VIEWED_KEY,
      JSON.stringify(next)
    );

    setRecentlyViewed(
      next.filter(
        (item) =>
          item.slug !== viewedProduct.slug
      ).slice(0, 4)
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
              item.slug !==
              currentProduct.slug
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
          .slice(0, 4);

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
            .select("order_id")
            .eq(
              "product_slug",
              currentProduct.slug
            )
            .limit(150);

        if (seedError) {
          throw seedError;
        }

        const orderIds =
          Array.from(
            new Set(
              (seedItems || [])
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
                itemSlug ===
                  currentProduct.slug
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
              .slice(0, 4);

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
          .slice(0, 4);

      setAlsoBought(
        fallback.length >
          0
          ? fallback
          : activeProducts.slice(
              0,
              4
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
    async function loadProduct() {
      setLoading(true);

      const { data: productData, error: productError } =
        await supabase
          .from("products")
          .select("*")
          .eq("slug", slug)
          .eq("is_active", true)
          .single();

      if (productError || !productData) {
        console.error("Product loading error:", productError);
        setProduct(null);
        setLoading(false);
        return;
      }

      const loadedProduct =
        productData as Product;

      setProduct(
        loadedProduct
      );

      saveRecentlyViewed(
        loadedProduct
      );

      void loadRecommendationProducts(
        loadedProduct
      );

      const { data: optionData, error: optionError } =
        await supabase
          .from("product_options")
          .select("*")
          .eq("product_slug", slug)
          .eq("is_active", true)
          .is("archived_at", null);

      if (optionError) {
        console.error("Option loading error:", optionError);
      }

      const sortedOptions = (
        (optionData || []) as ProductOption[]
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

      const { data: inventoryData, error: inventoryError } =
        await supabase
          .from("inventory")
          .select("*")
          .eq("product_slug", slug);

      if (inventoryError) {
        console.error(
          "Inventory loading error:",
          inventoryError
        );
      }

      setInventory(
        (inventoryData || []) as InventoryItem[]
      );

      setLoading(false);
    }

    loadProduct();
  }, [slug, supabase]);

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

  function getSalePrice(option: ProductOption) {
    const regularPrice = Number(option.price);
    const salePercent = Number(
      option.sale_percent || 0
    );

    if (!option.sale_active || salePercent <= 0) {
      return regularPrice;
    }

    return (
      regularPrice -
      regularPrice * (salePercent / 100)
    );
  }

  function getBundleTier(option: ProductOption, requestedQuantity: number) {
    const saleActive =
      Boolean(
        option.sale_active &&
        Number(option.sale_percent || 0) > 0
      ) ||
      Boolean(saleMap[option.product_slug]?.isOnSale);

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
      Boolean(
        option.sale_active &&
        Number(option.sale_percent || 0) > 0
      ) ||
      Boolean(saleMap[option.product_slug]?.isOnSale)
    );
  }

  function handleAddToCart() {
    if (!product || !selectedOption) {
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

    wasOnSale: Boolean(
      selectedOption.sale_active &&
      Number(selectedOption.sale_percent || 0) > 0
    ),

    salePercent: selectedOption.sale_active
      ? Number(selectedOption.sale_percent || 0)
      : 0,

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

  if (loading) {
    return (
      <main style={pageStyle}>
        <div style={pageContainer}>
          <p style={loadingText}>
            Loading product...
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
      <div style={pageContainer}>
        <Link href="/" style={backLink}>
          ← Back to Home
        </Link>

        <section style={productLayout}>
          {/* Left side: product image and research snapshot */}
          <div style={imageColumn}>
            <div style={imageBox}>
              <img
                src={product.image}
                alt={product.name}
                style={productImage}
              />
            </div>

            <aside style={snapshotCard}>
              <div style={snapshotHeader}>
                <span style={snapshotEyebrow}>Product Information</span>
                <h2 style={snapshotTitle}>Research Use Only</h2>
              </div>

              <div style={trustGrid}>
                <span style={trustBadge}>✓ Third-Party Tested</span>
                <span style={trustBadge}>✓ Secure Checkout</span>
                <span style={trustBadge}>✓ Fast Shipping</span>
                <span style={trustBadge}>✓ Laboratory Research Only</span>
              </div>
            </aside>
          </div>

          {/* Right side: product details and purchasing */}
          <div style={purchaseColumn}>
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
                    isOptionAvailable(option);

                  const availableQuantity =
                    getAvailableQuantity(option);

                  const maxKits = Math.floor(
                    availableQuantity / 10
                  );

                  const isOnSale =
                    option.sale_active &&
                    Number(
                      option.sale_percent || 0
                    ) > 0;

                  const isSelected =
                    selectedOption?.id === option.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        setSelectedOption(option);
                        setQuantity(1);
                      }}
                      disabled={!canBuy}
                      style={{
                        ...optionButton,

                        cursor: canBuy
                          ? "pointer"
                          : "not-allowed",

                        background: isSelected
                          ? "linear-gradient(135deg, rgba(255,45,216,.13), rgba(0,217,255,.08))"
                          : "#101010",

                        border: isSelected
                          ? `2px solid ${
                              product.color ||
                              "#ff45d8"
                            }`
                          : "1px solid #333",

                        opacity: canBuy ? 1 : 0.45,

                        boxShadow: isSelected
                          ? "0 0 18px rgba(255,45,216,.15)"
                          : "none",
                      }}
                    >
                      {isOnSale && (
                        <div style={saleBadge}>
                          SALE{" "}
                          {option.sale_percent}% OFF
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

            {selectedOption && (
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

                <div style={bundleSavingsCard}>
                  <div style={bundleSavingsHeader}>
                    <strong>Bundle Savings</strong>

                    {hasActiveSaleForOption(selectedOption) ? (
                      <span style={bundlePausedBadge}>
                        PAUSED DURING SALE
                      </span>
                    ) : getBundleTier(selectedOption, quantity) ? (
                      <span style={bundleActiveBadge}>
                        {getBundleTier(selectedOption, quantity)?.discount}% APPLIED
                      </span>
                    ) : null}
                  </div>

                  {hasActiveSaleForOption(selectedOption) ? (
                    <p style={bundleHelpText}>
                      Bundle pricing does not stack with an active product or campaign sale.
                      Your active sale pricing is being used instead.
                    </p>
                  ) : selectedOption.bundle_discount_enabled === false ? (
                    <p style={bundleHelpText}>
                      Bundle savings are not enabled for this option.
                    </p>
                  ) : (
                    <div style={bundleTierGrid}>
                      {[
                        {
                          quantity: Number(selectedOption.bundle_qty_1 || 0),
                          discount: Number(selectedOption.bundle_discount_1 || 0),
                        },
                        {
                          quantity: Number(selectedOption.bundle_qty_2 || 0),
                          discount: Number(selectedOption.bundle_discount_2 || 0),
                        },
                        {
                          quantity: Number(selectedOption.bundle_qty_3 || 0),
                          discount: Number(selectedOption.bundle_discount_3 || 0),
                        },
                      ]
                        .filter((tier) => tier.quantity > 0 && tier.discount > 0)
                        .map((tier) => {
                          const active = quantity >= tier.quantity;

                          return (
                            <div
                              key={`${tier.quantity}-${tier.discount}`}
                              style={{
                                ...bundleTier,
                                ...(active ? bundleTierActive : {}),
                              }}
                            >
                              <strong>{tier.quantity}+ units</strong>
                              <span>{tier.discount}% off</span>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

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
                    selectedOption.purchase_type ===
                      "single" &&
                    quantity >
                      getAvailableQuantity(
                        selectedOption
                      )
                  }
                  style={{
                    ...addButton,

                    opacity:
                      selectedOption.purchase_type ===
                        "single" &&
                      quantity >
                        getAvailableQuantity(
                          selectedOption
                        )
                        ? 0.5
                        : 1,

                    cursor:
                      selectedOption.purchase_type ===
                        "single" &&
                      quantity >
                        getAvailableQuantity(
                          selectedOption
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

          <aside style={recommendationSidebar}>
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
          </aside>
        </section>

        <section style={descriptionSection}>
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
    "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
  gap: "clamp(22px, 3vw, 38px)",
  alignItems: "start",
  marginBottom: 56,
};

const imageColumn = {
  minWidth: 0,
  display: "grid",
  gap: 20,
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

const snapshotCard = {
  border: "1px solid rgba(0,217,255,.25)",
  borderRadius: 22,
  padding: "clamp(20px, 3vw, 28px)",
  background:
    "linear-gradient(145deg, rgba(0,217,255,.07), rgba(255,45,216,.045))",
  boxShadow: "0 18px 45px rgba(0,0,0,.28)",
};

const snapshotHeader = { marginBottom: 8 };

const snapshotEyebrow = {
  display: "block",
  color: "#ff65dc",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.15em",
  textTransform: "uppercase" as const,
};

const snapshotTitle = {
  margin: "7px 0 0",
  color: "#f4f6f8",
  fontSize: 26,
};

const snapshotList = { display: "grid" };

const snapshotRow = {
  display: "grid",
  gridTemplateColumns: "minmax(115px, .75fr) minmax(0, 1.45fr)",
  gap: 16,
  padding: "16px 0",
  borderBottom: "1px solid rgba(255,255,255,.1)",
};

const snapshotLabel = {
  color: "#8c98a3",
  fontSize: 14,
  fontWeight: 700,
};

const snapshotValue = {
  color: "#edf0f2",
  fontSize: 15,
  fontWeight: 700,
  lineHeight: 1.55,
  overflowWrap: "anywhere" as const,
};

const trustGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 10,
  marginTop: 20,
};

const trustBadge = {
  padding: "10px 12px",
  border: "1px solid rgba(0,255,153,.2)",
  borderRadius: 10,
  color: "#bfffe3",
  background: "rgba(0,255,153,.055)",
  fontSize: 13,
  fontWeight: 700,
};

const purchaseColumn = {
  minWidth: 0,
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

const recommendationSidebar = {
  minWidth: 0,
  display: "grid",
  gap: 16,
  alignSelf: "start",
  position: "sticky" as const,
  top: 24,
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

const backButton = {
  background: "none",
  border: "none",
  color: "#00d9ff",
  cursor: "pointer",
  fontSize: 16,
  padding: 0,
};