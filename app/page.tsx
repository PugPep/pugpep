"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "../lib/supabaseClient";
import {
  getPrimaryStorefrontCampaign,
  loadStorefrontSales,
  type StorefrontSale,
} from "../lib/storefrontCampaigns";

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
  const [products, setProducts] = useState<Product[]>([]);
  const [saleMap, setSaleMap] = useState<Record<string, StorefrontSale>>({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("featured");
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [campaignLoading, setCampaignLoading] = useState(true);

  useEffect(() => {
    const accepted = localStorage.getItem("pugpep_age_verified");
    setAgeVerified(accepted === "yes");
    void loadProducts();

    const mediaQuery = window.matchMedia("(max-width: 768px)");

    const updateMobile = () => {
      setIsMobile(mediaQuery.matches);
    };

    updateMobile();
    mediaQuery.addEventListener("change", updateMobile);

    return () => {
      mediaQuery.removeEventListener("change", updateMobile);
    };
  }, []);

  async function loadProducts() {
    const { data: productData, error: productError } = await supabase
      .from("products")
      .select(
        "id, name, slug, color, image, category, is_new, feature_on_homepage, new_until, homepage_feature_order, is_coming_soon, coming_soon_date"
      )
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (productError) {
      console.error("Product loading failed:", productError);
      setProducts([]);
    } else {
      setProducts((productData || []) as Product[]);
    }

    setCampaignLoading(true);

    try {
      const effectiveSales = await loadStorefrontSales(supabase);
      setSaleMap(effectiveSales);
    } catch (error) {
      console.error("Storefront sale loading failed:", error);
      setSaleMap({});
    } finally {
      setCampaignLoading(false);
    }
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

      const matchesFilter =
        filter === "all"
          ? true
          : filter === "sale"
          ? Boolean(sale?.isOnSale)
          : filter === "peptides"
          ? category === "peptide"
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

  return (
    <main style={page}>
      <style>{`
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
              You must be 21+ to enter. By clicking "I Agree & Enter", you
              certify that you are an authorized laboratory representative
              procurement agent purchasing reagents solely for in-vitro
              evaluation. All products are for research purposes only and not
              for human or veterinary use. By clicking "I Agree & Enter", you
              confirm that you understand and accept these terms.
            </p>

            <button
              type="button"
              onClick={() => {
                localStorage.setItem("pugpep_age_verified", "yes");
                setAgeVerified(true);
              }}
              style={mainButton}
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
            🧪 FOR RESEARCH PURPOSES ONLY
            <br />
            <span style={{ color: "#00ff99" }}>
              NOT FOR HUMAN OR VETERINARY USE
            </span>
          </div>
        </div>
      </section>

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

      {featuredNewProducts.length > 0 && (
        <section style={newProductsSection}>
          <div style={newProductsHeader}>
            <div>
              <span style={newProductsEyebrow}>NEW &amp; FEATURED</span>
              <h2 style={newProductsTitle}>Latest Research Additions</h2>
              <p style={newProductsText}>
                Selected new additions to the PUGPEP research catalog.
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
                style={{ textDecoration: "none" }}
              >
                <article
                  style={{
                    ...newProductCard,
                    borderColor: product.color || "#ff45d8",
                  }}
                >
                  {product.is_coming_soon ? (
                    <span style={comingSoonBadge}>COMING SOON</span>
                  ) : (
                    <span style={newBadge}>NEW</span>
                  )}

                  <div style={newProductImageWrap}>
                    <img
                      src={product.image || "/pugpep-logo.png"}
                      alt={product.name}
                      style={productImage}
                    />
                  </div>

                  <div style={newProductBody}>
                    <strong
                      style={{
                        ...newProductName,
                        color: product.color || "#ff45d8",
                      }}
                    >
                      {product.name}
                    </strong>

                    <span style={newProductCta}>VIEW PRODUCT →</span>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section style={discoverBanner}>
        <div>
          <span style={discoverEyebrow}>WHY PUGPEP</span>
          <h2 style={discoverTitle}>Built Around Better Research Standards</h2>
          <p style={discoverText}>
            Research-focused products, available quality documentation,
            tracked fulfillment, and real human support.
          </p>
        </div>

        <div style={discoverPoints}>
          <span>✓ Quality Documentation</span>
          <span>✓ Veteran-Owned Support</span>
          <span>✓ Tracked Shipping</span>
        </div>
      </section>

      <section id="catalog" style={catalogShell}>
        <div style={catalogHeader}>
          <div>
            <span style={catalogEyebrow}>RESEARCH CATALOG</span>
            <h2 style={catalogTitle}>Browse PUGPEP Products</h2>
          </div>

          <div style={catalogStats}>
            <span>{products.length} Products</span>
            <span>{saleCount} On Sale</span>
            <span>{visibleProducts.length} Showing</span>
          </div>
        </div>

        <div style={searchSection}>
          <input
            placeholder="Search products..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={searchInput}
          />

          <div style={catalogControls}>
            <div style={filterButtons}>
              {["all", "sale", "peptides", "lab materials"].map((item) => (
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
          <section style={productsGrid}>
            {visibleProducts.map((product) => {
              const effectiveSale = saleMap[product.slug];

              return (
                <Link
                  key={product.slug}
                  href={`/products/${product.slug}`}
                  style={{ textDecoration: "none" }}
                >
                  <article
                    style={{
                      ...productCard,
                      borderColor: product.color || "#ff45d8",
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
                          <div style={saleBadge}>{effectiveSale.badgeText}</div>
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

                      {!product.is_coming_soon &&
                        effectiveSale?.isOnSale && (
                        <div style={saleDetail}>
                          {effectiveSale.source === "campaign" &&
                          effectiveSale.campaignName
                            ? effectiveSale.campaignName
                            : "PUGPEP SALE"}
                        </div>
                      )}

                      <div
                        style={{
                          ...viewButton,
                          borderColor: product.color || "#ff45d8",
                          color: product.color || "#ff45d8",
                        }}
                      >
                        VIEW PRODUCT →
                      </div>
                    </div>
                  </article>
                </Link>
              );
            })}
          </section>
        )}
      </section>

      <section style={bottomBar}>
        <QualityItem
          icon="🔒"
          title="SECURE PACKAGING"
          text="secure, safe & professional"
        />

        <QualityItem
          icon="🚚"
          title="FAST & TRACKED SHIPPING"
          text="Quick & reliable delivery"
        />

        <QualityItem
          icon="💳"
          title="EASY PAYMENT"
          text="Multiple secure options"
        />

        <QualityItem
          icon="🇺🇸"
          title="VETERAN-OWNED HUMAN SUPPORT"
          text="Real U.S.-based people when you need help"
        />
      </section>

      <footer style={footer}>
        <div style={footerGrid}>
          <div style={footerColumn}>
            <p style={footerColumnTitle}>
              CUSTOMER SUPPORT
            </p>

            <p style={footerSupportPromise}>
              🇺🇸 Veteran-Owned • U.S.-Based • Human Support
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
  marginTop: 20,
  padding: "15px 24px",
  border: "1px solid #ff2fbf",
  borderRadius: 12,
  background: "rgba(0,0,0,.45)",
  fontWeight: "bold",
  boxShadow: "0 0 18px rgba(255,45,210,.35)",
};

const campaignBanner = {
  maxWidth: 1320,
  margin: "20px auto 14px",
  padding: 1,
  borderRadius: 16,
  background: "linear-gradient(90deg, #ff45d8, #00d9ff, #00ff99)",
};

const campaignBannerContent = {
  padding: "17px 18px",
  borderRadius: 15,
  background:
    "linear-gradient(135deg, rgba(12,5,16,.98), rgba(4,13,16,.98))",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 18,
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
  fontSize: "clamp(22px, 4vw, 30px)",
  textTransform: "uppercase" as const,
};

const campaignMessage = {
  margin: "4px 0 0",
  color: "#d6d6dc",
  fontSize: 14,
  fontWeight: 700,
};

const shopSaleButton = {
  minHeight: 40,
  padding: "8px 14px",
  border: "1px solid #00ff99",
  borderRadius: 999,
  background: "rgba(0,255,153,.07)",
  color: "#00ff99",
  fontWeight: 900,
  cursor: "pointer",
};

const newProductsSection = {
  maxWidth: 1320,
  margin: "18px auto 14px",
  padding: "20px 18px",
  border: "1px solid rgba(0,255,153,.24)",
  borderRadius: 16,
  background:
    "linear-gradient(135deg, rgba(0,255,153,.045), rgba(0,217,255,.035), rgba(255,69,216,.035))",
};

const newProductsHeader = {
  marginBottom: 14,
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: 14,
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
  fontSize: "clamp(24px, 4vw, 34px)",
};

const newProductsText = {
  margin: "4px 0 0",
  color: "#cfcfd5",
  fontSize: 13,
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
  gridTemplateColumns: "repeat(auto-fit, minmax(185px, 1fr))",
  gap: 12,
};

const newProductCard = {
  position: "relative" as const,
  overflow: "hidden",
  height: "100%",
  display: "grid",
  gridTemplateRows: "180px minmax(0, 1fr)",
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

const newProductBody = {
  padding: 12,
  display: "grid",
  gap: 6,
  alignContent: "start",
};


const newProductName = {
  display: "block",
  fontSize: 17,
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
  padding: "18px 20px",
  border: "1px solid rgba(255,45,210,.22)",
  borderRadius: 16,
  background:
    "linear-gradient(135deg, rgba(255,45,210,.05), rgba(0,217,255,.04), rgba(124,255,0,.035))",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 18,
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
  fontSize: "clamp(24px, 4vw, 32px)",
  color: "#ff45d8",
};

const discoverText = {
  maxWidth: 720,
  margin: "5px 0 0",
  color: "#cfd0d5",
  fontSize: 14,
  lineHeight: 1.55,
};

const discoverPoints = {
  display: "flex",
  gap: 7,
  flexWrap: "wrap" as const,
  color: "#00ff99",
  fontSize: 10,
  fontWeight: 900,
};

const catalogShell = {
  maxWidth: 1320,
  margin: "20px auto 0",
  padding: "0 14px",
  scrollMarginTop: 110,
};

const catalogHeader = {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: 14,
  flexWrap: "wrap" as const,
};

const catalogEyebrow = {
  color: "#00d9ff",
  fontSize: 9,
  fontWeight: 900,
  letterSpacing: ".11em",
};

const catalogTitle = {
  margin: "4px 0 0",
  color: "#ff75df",
  fontSize: "clamp(26px, 4vw, 36px)",
};

const catalogStats = {
  display: "flex",
  gap: 7,
  flexWrap: "wrap" as const,
  color: "#b9bcc2",
  fontSize: 10,
  fontWeight: 800,
};

const searchSection = {
  marginTop: 13,
  padding: 12,
  display: "grid",
  gap: 10,
  border: "1px solid rgba(255,255,255,.09)",
  borderRadius: 13,
  background: "rgba(255,255,255,.018)",
};

const searchInput = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: 12,
  borderRadius: 9,
  border: "1px solid #333",
  background: "#0b0b0d",
  color: "#fff",
  fontSize: 16,
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
  gap: 7,
  flexWrap: "wrap" as const,
};

const filterButton = {
  minHeight: 36,
  padding: "7px 10px",
  borderRadius: 999,
  cursor: "pointer",
  fontWeight: 900,
  fontSize: 10,
};

const sortSelect = {
  minHeight: 36,
  padding: "0 10px",
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
  fontSize: 11,
};

const productsGrid = {
  margin: "15px 0 0",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(205px, 1fr))",
  gap: 14,
};

const productCard = {
  position: "relative" as const,
  overflow: "hidden",
  height: "100%",
  display: "grid",
  gridTemplateRows: "245px minmax(0, 1fr)",
  border: "1px solid",
  borderRadius: 13,
  background: "#050505",
};

const productImageWrap = {
  position: "relative" as const,
  overflow: "hidden",
  background: "#030303",
};

const productImage = {
  width: "100%",
  height: "100%",
  objectFit: "contain" as const,
  objectPosition: "center",
  padding: 12,
  boxSizing: "border-box" as const,
  background: "#030303",
};

const productBody = {
  padding: 13,
  display: "grid",
  gap: 7,
  alignContent: "start",
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

const productName = {
  margin: 0,
  fontSize: 19,
  textTransform: "uppercase" as const,
  lineHeight: 1.2,
};

const viewButton = {
  marginTop: 3,
  width: "fit-content",
  padding: "7px 10px",
  border: "1px solid",
  borderRadius: 7,
  background: "rgba(255,255,255,.015)",
  fontWeight: 900,
  fontSize: 10,
};

const emptyState = {
  marginTop: 15,
  padding: 24,
  border: "1px dashed rgba(0,217,255,.20)",
  borderRadius: 13,
  textAlign: "center" as const,
};

const emptyTitle = {
  margin: 0,
  color: "#fff",
  fontSize: 20,
};

const emptyText = {
  margin: "5px 0 10px",
  color: "#94989f",
  fontSize: 13,
};

const emptyButton = {
  minHeight: 38,
  padding: "7px 11px",
  border: "1px solid rgba(0,255,153,.32)",
  borderRadius: 8,
  background: "rgba(0,255,153,.04)",
  color: "#00ff99",
  fontWeight: 900,
  cursor: "pointer",
};

const qualityItem = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  padding: 12,
  borderLeft: "1px solid #333",
};

const bottomBar = {
  maxWidth: 1320,
  margin: "18px auto 46px",
  padding: 13,
  border: "1px solid rgba(255,255,255,.10)",
  borderRadius: 13,
  background: "rgba(10,10,10,.95)",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 10,
};

const overlay = {
  position: "fixed" as const,
  inset: 0,
  background: "rgba(0,0,0,.96)",
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 25,
};

const modal = {
  maxWidth: 520,
  padding: 30,
  border: "1px solid #ff45d8",
  borderRadius: 18,
  background: "#080808",
  textAlign: "center" as const,
};

const mainButton = {
  marginTop: 20,
  padding: "14px 24px",
  border: "none",
  borderRadius: 10,
  background: "linear-gradient(90deg, #00b7ff, #ff2fd0)",
  color: "#fff",
  fontWeight: "bold",
  cursor: "pointer",
  fontSize: 18,
};

const footer = {
  marginTop: 60,
  padding:
    "clamp(34px, 5vw, 54px) clamp(20px, 4vw, 36px)",
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
  gap: 28,
};

const footerColumn = {
  display: "grid",
  alignContent: "start",
  gap: 10,
};

const footerColumnTitle = {
  margin: "0 0 5px",
  color: "#ff75df",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: ".13em",
};

const footerSupportPromise = {
  margin: "0 0 8px",
  color: "#00ff99",
  fontSize: 13,
  lineHeight: 1.5,
  fontWeight: 700,
};

const footerLink = {
  width: "fit-content",
  color: "#cfcfd5",
  fontSize: 14,
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
  fontSize: 13,
  textAlign: "center" as const,
};

const footerText = {
  maxWidth: 1100,
  margin: "0 auto 14px",
  color: "#888",
  lineHeight: 1.7,
  fontSize: 13,
  textAlign: "center" as const,
};

const footerCopyright = {
  maxWidth: 1100,
  margin: "22px auto 0",
  color: "#00d9ff",
  fontWeight: 900,
  fontSize: 13,
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