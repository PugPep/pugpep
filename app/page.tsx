"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "../lib/supabaseClient";
import {
  getPrimaryStorefrontCampaign,
  loadStorefrontSales,
  type StorefrontSale,
} from "../lib/storefrontCampaigns";

const STOREFRONT_SALE_CACHE_KEY = "pugpep_storefront_sales_v1";
const STOREFRONT_SALE_CACHE_TTL_MS = 5 * 60 * 1000;

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
  is_new: boolean;
  feature_on_homepage: boolean;
  new_until?: string | null;
  homepage_feature_order?: number | null;
  is_coming_soon?: boolean;
  coming_soon_date?: string | null;
};

export default function HomePage() {
  const supabase = useMemo(() => createClient(), []);

  const [ageVerified, setAgeVerified] = useState(true);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [researchConfirmed, setResearchConfirmed] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [saleMap, setSaleMap] = useState<Record<string, StorefrontSale>>({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("featured");
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [campaignLoading, setCampaignLoading] = useState(true);
  const campaignLoadStartedRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const accepted = localStorage.getItem("pugpep_age_verified");
    setAgeVerified(accepted === "yes");

    const mediaQuery = window.matchMedia("(max-width: 768px)");

    const updateMobile = () => {
      setIsMobile(mediaQuery.matches);
    };

    updateMobile();
    mediaQuery.addEventListener("change", updateMobile);

    // Load the catalog immediately. Campaign pricing is deliberately
    // separated so it cannot block the initial product render.
    void loadProducts();

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
      // Session storage is an optimization only.
    }
  }

  async function loadProducts() {
    const { data: productData, error: productError } = await supabase
      .from("products")
      .select(
        "id, name, slug, color, image, category, is_new, feature_on_homepage, new_until, homepage_feature_order, is_coming_soon, coming_soon_date"
      )
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (!mountedRef.current) return;

    if (productError) {
      console.error("Product loading failed:", productError);
      setProducts([]);
      return;
    }

    setProducts((productData || []) as Product[]);
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

  async function handleProductAccess(
    event: React.MouseEvent<HTMLAnchorElement>,
    productSlug: string
  ) {
    event.preventDefault();

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

  const saleProducts = products
    .filter(
      (product) =>
        !product.is_coming_soon &&
        Boolean(saleMap[product.slug]?.isOnSale)
    )
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 6);

  const primaryCampaign = getPrimaryStorefrontCampaign(saleMap);

  const visibleProducts = products
    .filter((product) => {
      const query = search.trim().toLowerCase();
      const category = String(product.category || "").toLowerCase().trim();
      const sale = saleMap[product.slug];

      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.slug.toLowerCase().includes(query);

      const isSpray =
        category === "spray" ||
        category === "nasal-spray";

      const matchesFilter =
        filter === "all"
          ? true
          : filter === "sale"
          ? Boolean(sale?.isOnSale)
          : filter === "peptides"
          ? category === "peptide" && !isSpray
          : filter === "sprays"
          ? isSpray
          : filter === "lab materials"
          ? category === "lab-material"
          : true;

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
    (product) => saleMap[product.slug]?.isOnSale
  ).length;


  const catalogGroups = [
    {
      key: "compounds",
      eyebrow: "",
      title: "",
      products: visibleProducts.filter((product) => {
        const category = String(product.category || "").toLowerCase().trim();
        return (
          category !== "spray" &&
          category !== "nasal-spray" &&
          category !== "lab-material"
        );
      }),
    },
    {
      key: "sprays",
      eyebrow: "",
      title: "Research Sprays",
      products: visibleProducts.filter((product) => {
        const category = String(product.category || "").toLowerCase().trim();
        return category === "spray" || category === "nasal-spray";
      }),
    },
    {
      key: "materials",
      eyebrow: "",
      title: "Lab Materials",
      products: visibleProducts.filter((product) => {
        const category = String(product.category || "").toLowerCase().trim();
        return category === "lab-material";
      }),
    },
  ].filter((group) => group.products.length > 0);

  return (
    <main style={page}>
      <style>{`
        .category-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
        }

        @media (max-width: 1100px) {
          .category-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 720px) {
          .category-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 420px) {
          .category-grid {
            grid-template-columns: 1fr !important;
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

            <p style={{ color: "#ddd", lineHeight: 1.6 }}>
              Access to PUGPEP requires confirmation of the following research
              eligibility requirements.
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
                I confirm that I am an authorized representative of an
                independent research laboratory, research organization, or
                other qualified research entity, and that I am accessing
                PUGPEP solely for lawful laboratory research purposes.
                Products are not for human or veterinary use.
              </span>
            </label>

            <button
              type="button"
              disabled={!ageConfirmed || !researchConfirmed}
              onClick={() => {
                if (!ageConfirmed || !researchConfirmed) return;

                localStorage.setItem("pugpep_age_verified", "yes");
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
              I Agree & Enter
            </button>
          </div>
        </div>
      )}

      <section style={heroVideoSection}>
        {isMobile !== null && (
          <video
            key={isMobile ? "mobile-video" : "desktop-video"}
            autoPlay
            muted
            loop
            playsInline
            style={heroVideo}
            src={isMobile ? "/hero-mobile.mp4" : "/hero-desktop.mp4"}
          />
        )}

        <div style={heroOverlay}>
          <div style={researchBadge}>
            FOR RESEARCH PURPOSES ONLY
            <br />
            <span style={{ color: "#00ff99" }}>
              NOT FOR HUMAN OR VETERINARY USE
            </span>
          </div>
        </div>
      </section>

      {featuredNewProducts.length > 0 && (
        <section style={newProductsSection}>
          <div style={newProductsHeader}>
            <div>
              <span style={newProductsEyebrow}>NEW &amp; COMING SOON</span>
              <h2 style={newProductsTitle}>New Products</h2>
              <p style={newProductsText}>
                Recently added research products and upcoming additions.
              </p>
            </div>

            <span style={newProductsCount}>
              {featuredNewProducts.length} FEATURED
            </span>
          </div>

          <div style={newProductsGrid}>
            {featuredNewProducts.map((product) => (
              <Link
                key={`new-${product.slug}`}
                href={`/products/${product.slug}`}
                onClick={(event) => {
                  void handleProductAccess(event, product.slug);
                }}
                style={{ textDecoration: "none" }}
              >
                <article
                  style={{
                    ...newProductCard,
                    borderColor: product.color || "rgba(0,255,153,.42)",
                  }}
                >
                  <div style={newProductImageWrap}>
                    {product.is_coming_soon ? (
                      <span style={comingSoonBadge}>COMING SOON</span>
                    ) : (
                      <span style={newBadge}>NEW</span>
                    )}

                    <img
                      src={product.image || "/pugpep-logo.png"}
                      alt={product.name}
                      style={newProductImage}
                    />
                  </div>

                  <div style={newProductBody}>
                    <span style={showcaseCategory}>
                      {getCategoryLabel(product.category)}
                    </span>

                    <strong
                      style={{
                        ...newProductName,
                        color: product.color || "#7df9ff",
                      }}
                    >
                      {product.name}
                    </strong>

                    <span style={newProductCta}>
                      {product.is_coming_soon ? "VIEW DETAILS →" : "VIEW PRODUCT →"}
                    </span>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </section>
      )}

      {primaryCampaign && (
        <section style={campaignBanner}>
          <div style={campaignBannerContent}>
            <div>
              <span style={campaignEyebrow}>ACTIVE PROMOTION</span>
              <h2 style={campaignTitle}>{primaryCampaign.campaignName}</h2>
              <p style={campaignMessage}>{primaryCampaign.bannerText}</p>
            </div>

            <button
              type="button"
              onClick={() => {
                setFilter("sale");
                document
                  .getElementById("catalog")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              style={shopSaleButton}
            >
              SHOP SALE
            </button>
          </div>
        </section>
      )}

      <section style={brandIntroSection}>
        <div style={brandIntroCopy}>
          <span style={premiumEyebrow}>WHY PUGPEP</span>
          <h2 style={brandIntroTitle}>Proof Hits Different.</h2>
          <p style={brandIntroText}>
            Clean research. Clear documentation. Lot-level traceability.
            No mystery. No digging.
          </p>

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

        <Link href="/quality" style={brandQualityVisualLink}>
          <div style={brandQualityVisual}>
            <img
              src="/marketing/lot-specific-coas.png"
              alt="PugPep transparent research quality and testing"
              style={brandQualityImage}
            />
            <div style={brandQualityShade} />
            <div style={brandQualityOverlayCopy}>
              <span style={brandQualityKicker}>TRANSPARENT RESEARCH</span>
              <strong style={brandQualityOverlayTitle}>Quality You Can Verify</strong>
              <span style={brandQualityCta}>SEE THE PROOF →</span>
            </div>
          </div>
        </Link>
      </section>

      <section style={categorySection}>
        <div style={sectionLead}>
          <span style={premiumEyebrow}>SHOP BY FOCUS</span>
          <h2 style={premiumSectionTitle}>Explore the PugPep Catalog</h2>
          <p style={premiumSectionText}>
            Premium category visuals guide the storefront while the real product
            catalog remains clean, fast, and easy to browse.
          </p>

        </div>

        <div className="category-grid" style={categoryGrid}>
          <button
            type="button"
            onClick={() => {
              setFilter("peptides");
              document
                .getElementById("catalog")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="category-card"
            style={categoryCardButton}
          >
            <img
              src="/marketing/research-peptides.png"
              alt="PugPep research peptides category"
              style={categoryImage}
            />
            <div style={categoryShade} />
            <div style={categoryContent}>
              <span style={categoryKicker}>CORE CATALOG</span>
              <h3 style={categoryTitle}>Research Peptides</h3>
              <span style={categoryCta}>SHOP PEPTIDES →</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setFilter("sprays");
              document
                .getElementById("catalog")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="category-card"
            style={categoryCardButton}
          >
            <img
              src="/marketing/research-sprays.png"
              alt="PugPep research sprays category"
              style={categoryImage}
            />
            <div style={categoryShade} />
            <div style={categoryContent}>
              <span style={categoryKicker}>SPRAY CATALOG</span>
              <h3 style={categoryTitle}>Research Sprays</h3>
              <span style={categoryCta}>SHOP SPRAYS →</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setFilter("lab materials");
              document
                .getElementById("catalog")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="category-card"
            style={categoryCardButton}
          >
            <img
              src="/marketing/lab-materials.png"
              alt="PugPep laboratory materials category"
              style={categoryImage}
            />
            <div style={categoryShade} />
            <div style={categoryContent}>
              <span style={categoryKicker}>LAB ESSENTIALS</span>
              <h3 style={categoryTitle}>Lab Materials</h3>
              <span style={categoryCta}>SHOP LAB MATERIALS →</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setFilter("sale");
              document
                .getElementById("catalog")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="category-card"
            style={categoryCardButton}
          >
            <img
              src="/marketing/current-offers.png"
              alt="PugPep current offers and promotions"
              style={categoryImage}
            />
            <div style={categoryShade} />
            <div style={categoryContent}>
              <span style={categoryKicker}>FEATURED PROMOTIONS</span>
              <h3 style={categoryTitle}>Current Offers</h3>
              <span style={categoryCta}>VIEW OFFERS →</span>
            </div>
          </button>
        </div>
      </section>

      {saleProducts.length > 0 && (
        <section style={saleShowcaseSection}>
          <div style={showcaseHeader}>
            <div>
              <span style={saleShowcaseEyebrow}></span>
              <h2 style={showcaseTitle}>Current Offers</h2>
              <p style={showcaseText}>
                Discounted products available now.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setFilter("sale");
                document
                  .getElementById("catalog")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              style={saleBrowseButton}
            >
              VIEW ALL SALE ITEMS →
            </button>
          </div>

          <div style={showcaseGrid}>
            {saleProducts.map((product) => {
              const effectiveSale = saleMap[product.slug];

              return (
                <Link
                  key={`sale-${product.slug}`}
                  href={`/products/${product.slug}`}
                  onClick={(event) => {
                    void handleProductAccess(event, product.slug);
                  }}
                  style={{ textDecoration: "none" }}
                >
                  <article
                    style={{
                      ...showcaseCard,
                      borderColor: "rgba(0,255,153,.48)",
                      boxShadow: "0 0 24px rgba(0,255,153,.10)",
                    }}
                  >
                    <div style={showcaseImageWrap}>
                      <span style={showcaseSaleBadge}>
                        {effectiveSale?.badgeText || "SALE"}
                      </span>

                      <img
                        src={product.image || "/pugpep-logo.png"}
                        alt={product.name}
                        style={showcaseImage}
                      />
                    </div>

                    <div style={showcaseBody}>
                      <span style={showcaseCategory}>
                        {getCategoryLabel(product.category)}
                      </span>

                      <strong
                        style={{
                          ...showcaseName,
                          color: product.color || "#00ff99",
                        }}
                      >
                        {product.name}
                      </strong>

                      {effectiveSale?.campaignName && (
                        <span style={showcaseCampaignName}>
                          {effectiveSale.campaignName}
                        </span>
                      )}

                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section id="catalog" style={catalogShell}>
        <div style={catalogHeader}>
          <div>
            <span style={catalogEyebrow}></span>
            <h2 style={catalogTitle}>Browse the Full Catalog</h2>
          </div>

          <div style={catalogStats}>
            <span>{products.length} Products</span>
            <span>{saleCount} On Sale</span>
            <span>{visibleProducts.length} Showing</span>
          </div>
        </div>

        <div style={searchSection}>
          <div style={catalogControls}>
            <div style={filterButtons}>
              {["all", "sale", "peptides", "sprays", "lab materials"].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  style={{
                    ...filterButton,
                    border:
                      filter === item
                        ? "1px solid #00ff99"
                        : "1px solid rgba(255,255,255,.12)",
                    color: filter === item ? "#00ff99" : "#ccc",
                    background:
                      filter === item
                        ? "rgba(0,255,153,.07)"
                        : "rgba(255,255,255,.025)",
                  }}
                >
                  {item.toUpperCase()}
                </button>
              ))}
            </div>

            <select
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

        {visibleProducts.length === 0 ? (
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
              <section key={group.key} style={catalogGroup}>
                <div style={catalogGroupHeader}>
                  <div>
                    {group.eyebrow ? (
                      <span style={catalogGroupEyebrow}>{group.eyebrow}</span>
                    ) : null}
                    <h3 style={catalogGroupTitle}>{group.title}</h3>
                  </div>

                  <span style={catalogGroupCount}>
                    {group.products.length}
                  </span>
                </div>

                <div style={productsGrid}>
                  {group.products.map((product) => {
                    const effectiveSale = saleMap[product.slug];

                    return (
                      <Link
                        key={product.slug}
                        href={`/products/${product.slug}`}
                        onClick={(event) => {
                          void handleProductAccess(event, product.slug);
                        }}
                        style={{ textDecoration: "none" }}
                      >
                        <article
                          style={{
                            ...productCard,
                            borderColor: `${product.color || "#ff45d8"}65`,
                          }}
                        >
                          <div style={productImageWrap}>
                            {product.is_coming_soon ? (
                              <div style={catalogComingSoonBadge}>COMING SOON</div>
                            ) : isProductNew(product) ? (
                              <div style={catalogNewBadge}>NEW</div>
                            ) : null}

                            {!product.is_coming_soon &&
                              effectiveSale?.isOnSale && (
                                <div style={saleBadge}>
                                  {effectiveSale.badgeText}
                                </div>
                              )}

                            <img
                              src={
                                typeof product.image === "string" &&
                                product.image.length > 0
                                  ? product.image
                                  : "/pugpep-logo.png"
                              }
                              alt={product.name}
                              style={productImage}
                            />
                          </div>

                          <div style={productBody}>
                            <h2
                              style={{
                                ...productName,
                                color: product.color || "#ff45d8",
                              }}
                            >
                              {product.name}
                            </h2>

                            {!product.is_coming_soon &&
                              effectiveSale?.source === "campaign" &&
                              effectiveSale.campaignName && (
                                <div style={campaignNameBadge}>
                                  {effectiveSale.campaignName}
                                </div>
                              )}

                          </div>
                        </article>
                      </Link>
                    );
                  })}
                </div>
              </section>
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

          <div style={footerColumn}>
            <p style={footerColumnTitle}>
              LEGAL &amp; POLICIES
            </p>

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

        <div style={footerDivider} />

        <p style={footerResearchNotice}>
          <strong style={{ color: "#00ff99" }}>
            RESEARCH USE ONLY:
          </strong>{" "}
          PugPep products are intended for laboratory research purposes only.
          Not for human or veterinary use.
        </p>

        <p style={footerText}>
          Information provided on this website is for research and
          informational purposes only and does not constitute medical advice,
          dosing guidance, treatment recommendations, or claims of therapeutic
          benefit. Products are not intended to diagnose, treat, cure, mitigate,
          or prevent disease.
        </p>

        <p style={footerText}>
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
  ...showcaseSection,
  marginTop: 24,
  paddingTop: 14,
  borderTop: "1px solid rgba(0,255,153,.30)",
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
    "repeat(auto-fill, minmax(160px, 1fr))",
  gap: 9,
  justifyContent: "stretch",
  alignItems: "stretch",
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
  alignContent: "end",
  gap: 5,
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
  padding: "6px 9px",
  borderRadius: 999,
  background: "#00ff99",
  color: "#001009",
  fontSize: 10,
  fontWeight: 1000,
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
  padding: "14px 14px",
  border: "1px solid rgba(0,255,153,.24)",
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

const newProductsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(215px, 1fr))",
  gap: 11,
};

const newProductCard = {
  position: "relative" as const,
  overflow: "hidden",
  height: "100%",
  display: "grid",
  gridTemplateRows: "215px minmax(0, 1fr)",
  border: "1px solid",
  borderRadius: 13,
  background: "rgba(3,3,3,.92)",
};

const newProductImageWrap = {
  overflow: "hidden",
  background: "#030303",
  display: "grid",
  placeItems: "center",
};

const newProductImage = {
  width: "100%",
  height: "100%",
  objectFit: "contain" as const,
  objectPosition: "center",
  display: "block",
};

const newProductBody = {
  padding: 10,
  display: "grid",
  gap: 6,
  alignContent: "start",
};


const newProductName = {
  display: "block",
  fontSize: 14,
  textTransform: "uppercase" as const,
};

const newProductCta = {
  display: "block",
  marginTop: 3,
  color: "#00ff99",
  fontSize: 10,
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
  border: "1px solid rgba(255,45,210,.22)",
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

const catalogShell = {
  maxWidth: 1320,
  margin: "20px auto 0",
  padding: "0 12px",
  scrollMarginTop: 110,
};

const catalogHeader = {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: 8,
  flexWrap: "wrap" as const,
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
  marginTop: 9,
  padding: 10,
  display: "grid",
  gap: 8,
  border: "1px solid rgba(255,255,255,.09)",
  borderRadius: 13,
  background: "rgba(255,255,255,.018)",
};


const catalogControls = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 9,
  flexWrap: "wrap" as const,
};

const filterButtons = {
  display: "flex",
  gap: 5,
  flexWrap: "wrap" as const,
};

const filterButton = {
  minHeight: 32,
  padding: "6px 9px",
  borderRadius: 999,
  cursor: "pointer",
  fontWeight: 900,
  fontSize: 10,
};

const sortSelect = {
  minHeight: 32,
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
  marginTop: 8,
  display: "grid",
  gap: 18,
};

const catalogGroup = {
  paddingTop: 4,
};

const catalogGroupHeader = {
  paddingBottom: 10,
  display: "flex",
  alignItems: "end",
  justifyContent: "space-between",
  gap: 8,
  borderBottom: "1px solid rgba(255,255,255,.10)",
};

const catalogGroupEyebrow = {
  color: "#00d9ff",
  fontSize: 9,
  fontWeight: 950,
  letterSpacing: ".12em",
};

const catalogGroupTitle = {
  margin: "3px 0 0",
  color: "#ffffff",
  fontSize: "clamp(18px, 2.2vw, 24px)",
  lineHeight: 1.05,
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
  margin: "12px 0 0",
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fill, minmax(195px, 1fr))",
  gap: 11,
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
  borderRadius: 13,
  background: "#050507",
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
  padding: "26px 10px 10px",
  display: "grid",
  gap: 5,
  alignContent: "end",
  background:
    "linear-gradient(180deg, transparent 0%, rgba(0,0,0,.28) 18%, rgba(0,0,0,.86) 66%, rgba(0,0,0,.97) 100%)",
};


const saleBadge = {
  position: "absolute" as const,
  top: 10,
  right: 10,
  maxWidth: "75%",
  padding: "5px 8px",
  borderRadius: 999,
  background: "#00ff99",
  color: "#000",
  fontWeight: 900,
  fontSize: 10,
  zIndex: 3,
};

const campaignNameBadge = {
  width: "fit-content",
  maxWidth: "100%",
  padding: "4px 7px",
  border: "1px solid rgba(255,69,216,.55)",
  borderRadius: 999,
  background: "rgba(255,69,216,.04)",
  color: "#ff75df",
  fontWeight: 900,
  fontSize: 9,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap" as const,
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
  fontSize: 16,
  textTransform: "uppercase" as const,
  lineHeight: 1.2,
};

const emptyState = {
  marginTop: 7,
  padding: 11,
  border: "1px dashed rgba(0,217,255,.20)",
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
  border: "1px solid rgba(255,255,255,.10)",
  borderRadius: 13,
  background: "rgba(10,10,10,.95)",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 8,
};

const brandIntroSection = {
  maxWidth: 1320,
  margin: "22px auto 0",
  padding: "14px",
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.25fr) minmax(260px, .75fr)",
  gap: 16,
  alignItems: "stretch",
  border: "1px solid rgba(0,217,255,.18)",
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
  border: "1px solid rgba(0,217,255,.30)",
  borderRadius: 14,
  background: "#030304",
  boxShadow: "0 0 30px rgba(0,217,255,.06)",
};

const brandQualityImage = {
  width: "100%",
  height: "100%",
  minHeight: 160,
  display: "block",
  objectFit: "contain" as const,
  objectPosition: "center",
  padding: 8,
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
  border: "1px solid rgba(255,255,255,.12)",
  borderRadius: 18,
  background: "#050507",
  color: "#fff",
  textAlign: "left" as const,
  cursor: "pointer",
  boxShadow: "0 18px 44px rgba(0,0,0,.28)",
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
  maxWidth: 520,
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
  fontSize: 11,
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
  borderTop:
    "1px solid rgba(255,255,255,.12)",
  background:
    "radial-gradient(circle at 10% 0%, rgba(0,217,255,.07), transparent 28%), radial-gradient(circle at 90% 0%, rgba(255,45,210,.08), transparent 30%), #050505",
};

const footerGrid = {
  width: "100%",
  maxWidth: 1180,
  margin: "0 auto",
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(210px, 1fr))",
  gap: 18,
};

const footerColumn = {
  display: "grid",
  alignContent: "start",
  gap: 8,
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
  margin: "0 auto 14px",
  color: "#cfcfd5",
  lineHeight: 1.7,
  fontSize: 11,
  textAlign: "center" as const,
};

const footerText = {
  maxWidth: 1100,
  margin: "0 auto 14px",
  color: "#888",
  lineHeight: 1.7,
  fontSize: 11,
  textAlign: "center" as const,
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

const heroOverlay = {
  position: "absolute" as const,
  bottom: 25,
  width: "100%",
  display: "flex",
  justifyContent: "center",
  pointerEvents: "none" as const,
};