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
};

export default function HomePage() {
  const supabase = useMemo(() => createClient(), []);

  const [ageVerified, setAgeVerified] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [saleMap, setSaleMap] = useState<Record<string, StorefrontSale>>({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
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
        "id, name, slug, color, image, category, is_new, feature_on_homepage, new_until, homepage_feature_order"
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
        isProductNew(product)
    )
    .sort((a, b) => {
      const aOrder = a.homepage_feature_order ?? 9999;
      const bOrder = b.homepage_feature_order ?? 9999;

      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.name.localeCompare(b.name);
    });

  const primaryCampaign = getPrimaryStorefrontCampaign(saleMap);

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
            <span style={campaignEyebrow}>🔥 ACTIVE PUGPEP PROMOTION</span>

            <h2 style={campaignTitle}>
              {primaryCampaign.campaignName}
            </h2>

            <p style={campaignMessage}>
              {primaryCampaign.bannerText}
            </p>

            <button
              type="button"
              onClick={() => setFilter("sale")}
              style={shopSaleButton}
            >
              SHOP THE SALE
            </button>
          </div>
        </section>
      )}

      {featuredNewProducts.length > 0 && (
        <section style={newProductsSection}>
          <div style={newProductsHeader}>
            <span style={newProductsEyebrow}>🧪 JUST DROPPED</span>
            <h2 style={newProductsTitle}>New Products at PUGPEP</h2>
            <p style={newProductsText}>
              Explore the latest additions to the PUGPEP research catalog.
            </p>
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
                    boxShadow: `0 0 28px ${product.color || "#ff45d8"}33`,
                  }}
                >
                  <span style={newBadge}>NEW</span>

                  <img
                    src={product.image || "/pugpep-logo.png"}
                    alt={product.name}
                    style={newProductImage}
                  />

                  <strong
                    style={{
                      ...newProductName,
                      color: product.color || "#ff45d8",
                    }}
                  >
                    {product.name}
                  </strong>

                  <span style={newProductCta}>VIEW PRODUCT →</span>
                </article>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section style={discoverBanner}>
        <h2 style={discoverTitle}>
          Discover the Full Line of PUGPEP Products
        </h2>

        <p style={discoverText}>
          PUGPEP provides high-purity research chemicals and peptides at
          competitive pricing, backed by verified COAs, fast shipping, and
          trusted quality standards.
        </p>
      </section>

      <section style={searchSection}>
        <input
          placeholder="Search products..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          style={searchInput}
        />

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
                    : "1px solid #333",
                color: filter === item ? "#00ff99" : "#ccc",
              }}
            >
              {item.toUpperCase()}
            </button>
          ))}
        </div>

        {campaignLoading && (
          <p style={campaignLoadingText}>Checking active promotions...</p>
        )}
      </section>

      <section style={productsGrid}>
        {products
          .filter((product) => {
            const matchesSearch =
              product.name.toLowerCase().includes(search.toLowerCase()) ||
              product.slug.toLowerCase().includes(search.toLowerCase());

            const category = String(product.category || "")
              .toLowerCase()
              .trim();

            const effectiveSale = saleMap[product.slug];

            const matchesFilter =
              filter === "all"
                ? true
                : filter === "sale"
                ? Boolean(effectiveSale?.isOnSale)
                : filter === "peptides"
                ? category === "peptide"
                : filter === "lab materials"
                ? category === "lab-material"
                : true;

            return matchesSearch && matchesFilter;
          })
          .sort((a, b) => {
            if (a.category === b.category) {
              return a.name.localeCompare(b.name);
            }

            if (a.category === "peptide") return -1;
            if (b.category === "peptide") return 1;

            return 0;
          })
          .map((product) => {
            const effectiveSale = saleMap[product.slug];

            return (
              <Link
                key={product.slug}
                href={`/products/${product.slug}`}
                style={{ textDecoration: "none" }}
              >
                <div
                  style={{
                    ...productCard,
                    border: `1px solid ${product.color || "#ff45d8"}`,
                    boxShadow: `0 0 26px ${
                      product.color || "#ff45d8"
                    }55`,
                  }}
                >
                  {isProductNew(product) && (
                    <div style={catalogNewBadge}>NEW</div>
                  )}

                  {effectiveSale?.isOnSale && (
                    <div style={saleBadge}>{effectiveSale.badgeText}</div>
                  )}

                  {effectiveSale?.source === "campaign" &&
                    effectiveSale.campaignName && (
                      <div style={campaignNameBadge}>
                        {effectiveSale.campaignName}
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
                    style={{
                      width: "100%",
                      height: 360,
                      objectFit:
                        product.slug === "compoundmicroscope"
                          ? "fill"
                          : "cover",
                      transform:
                        product.slug === "compoundmicroscope"
                          ? "scale(1)"
                          : "none",
                      borderRadius: 12,
                    }}
                  />

                  <h2
                    style={{
                      ...productName,
                      color: product.color || "#ff45d8",
                    }}
                  >
                    {product.name}
                  </h2>

                  {effectiveSale?.isOnSale && (
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
                      background: product.color || "#ff45d8",
                    }}
                  >
                    VIEW PRODUCT
                  </div>
                </div>
              </Link>
            );
          })}
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
              href="mailto:Support@PugPep.com"
              style={footerLink}
            >
              Contact Support
            </a>
          </div>

          <div style={footerColumn}>
            <p style={footerColumnTitle}>
              COMPANY &amp; RESEARCH
            </p>

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
  margin: "24px auto 18px",
  padding: 2,
  borderRadius: 20,
  background:
    "linear-gradient(90deg, #ff45d8, #00d9ff, #00ff99, #ff45d8)",
  animation: "campaignGlow 3s ease-in-out infinite",
};

const campaignBannerContent = {
  padding: "28px 24px",
  borderRadius: 18,
  background:
    "linear-gradient(135deg, rgba(12,5,16,.98), rgba(4,13,16,.98))",
  textAlign: "center" as const,
};

const campaignEyebrow = {
  color: "#00ff99",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: ".13em",
};

const campaignTitle = {
  margin: "8px 0 4px",
  color: "#ff75df",
  fontSize: "clamp(28px, 5vw, 44px)",
  textTransform: "uppercase" as const,
};

const campaignMessage = {
  margin: "7px 0 18px",
  color: "#fff",
  fontSize: 19,
  fontWeight: 900,
};

const shopSaleButton = {
  minHeight: 44,
  padding: "10px 18px",
  border: "1px solid #00ff99",
  borderRadius: 999,
  background: "rgba(0,255,153,.08)",
  color: "#00ff99",
  fontWeight: 900,
  cursor: "pointer",
};

const newProductsSection = {
  maxWidth: 1320,
  margin: "24px auto 18px",
  padding: "26px 20px",
  border: "1px solid rgba(0,255,153,.32)",
  borderRadius: 20,
  background:
    "linear-gradient(135deg, rgba(0,255,153,.07), rgba(0,217,255,.055), rgba(255,69,216,.055))",
  boxShadow: "0 0 30px rgba(0,255,153,.08)",
};

const newProductsHeader = {
  textAlign: "center" as const,
  marginBottom: 20,
};

const newProductsEyebrow = {
  color: "#00ff99",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: ".14em",
};

const newProductsTitle = {
  margin: "7px 0 4px",
  color: "#7df9ff",
  fontSize: "clamp(28px, 5vw, 42px)",
  textTransform: "uppercase" as const,
};

const newProductsText = {
  margin: "7px auto 0",
  maxWidth: 760,
  color: "#cfcfd5",
  fontSize: 16,
};

const newProductsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 16,
};

const newProductCard = {
  position: "relative" as const,
  height: "100%",
  padding: 15,
  display: "grid",
  gap: 10,
  alignContent: "start",
  border: "1px solid",
  borderRadius: 16,
  background: "rgba(3,3,3,.92)",
};

const newProductImage = {
  width: "100%",
  aspectRatio: "1 / 1",
  objectFit: "cover" as const,
  borderRadius: 12,
};

const newProductName = {
  display: "block",
  textAlign: "center" as const,
  fontSize: 19,
  textTransform: "uppercase" as const,
};

const newProductCta = {
  display: "block",
  textAlign: "center" as const,
  color: "#00ff99",
  fontSize: 12,
  fontWeight: 900,
};

const newBadge = {
  position: "absolute" as const,
  top: 10,
  left: 10,
  zIndex: 4,
  padding: "6px 10px",
  borderRadius: 999,
  background: "linear-gradient(90deg, #00ff99, #00d9ff)",
  color: "#000",
  fontSize: 11,
  fontWeight: 1000,
  letterSpacing: ".08em",
  boxShadow: "0 0 14px rgba(0,255,153,.45)",
};

const catalogNewBadge = {
  position: "absolute" as const,
  top: 12,
  left: 12,
  zIndex: 4,
  padding: "6px 10px",
  borderRadius: 999,
  background: "linear-gradient(90deg, #00ff99, #00d9ff)",
  color: "#000",
  fontWeight: 900,
  fontSize: 12,
  boxShadow: "0 0 14px rgba(0,255,153,.45)",
};

const searchSection = {
  maxWidth: 1320,
  margin: "0 auto 25px",
  padding: "0 14px",
  display: "grid",
  gap: 14,
};

const searchInput = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: 14,
  borderRadius: 10,
  border: "1px solid #333",
  background: "#111",
  color: "#fff",
  fontSize: 16,
};

const filterButtons = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap" as const,
  justifyContent: "center",
};

const filterButton = {
  padding: "10px 14px",
  borderRadius: 999,
  background: "#111",
  cursor: "pointer",
  fontWeight: "bold",
};

const campaignLoadingText = {
  margin: 0,
  textAlign: "center" as const,
  color: "#8d8d96",
  fontSize: 12,
};

const qualityItem = {
  display: "flex",
  gap: 15,
  alignItems: "center",
  padding: 15,
  borderLeft: "1px solid #333",
};

const productsGrid = {
  maxWidth: 1320,
  margin: "25px auto",
  padding: "0 14px",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 18,
};

const productCard = {
  position: "relative" as const,
  padding: 20,
  minHeight: 340,
  borderRadius: 16,
  textAlign: "center" as const,
  background: "#050505",
};

const saleBadge = {
  position: "absolute" as const,
  top: 12,
  right: 12,
  maxWidth: "75%",
  padding: "6px 10px",
  borderRadius: 999,
  background: "#00ff99",
  color: "#000",
  fontWeight: 900,
  fontSize: 12,
  zIndex: 3,
};

const campaignNameBadge = {
  position: "absolute" as const,
  top: 48,
  right: 12,
  maxWidth: "75%",
  padding: "5px 9px",
  border: "1px solid rgba(255,69,216,.70)",
  borderRadius: 999,
  background: "rgba(0,0,0,.82)",
  color: "#ff75df",
  fontWeight: 900,
  fontSize: 10,
  zIndex: 3,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap" as const,
};

const saleDetail = {
  minHeight: 20,
  margin: "-2px 0 8px",
  color: "#00ff99",
  fontSize: 11,
  fontWeight: 900,
  textTransform: "uppercase" as const,
};

const productName = {
  margin: "10px 0",
  fontSize: 22,
  textTransform: "uppercase" as const,
  height: 60,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const viewButton = {
  margin: "10px auto 0",
  padding: "11px 14px",
  borderRadius: 8,
  color: "#fff",
  fontWeight: "bold",
  maxWidth: 150,
};

const bottomBar = {
  maxWidth: 1320,
  margin: "18px auto 60px",
  padding: 18,
  border: "1px solid #333",
  borderRadius: 16,
  background: "rgba(10,10,10,.95)",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 18,
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

const discoverBanner = {
  maxWidth: 1320,
  margin: "24px auto 18px",
  padding: "30px 24px",
  border: "1px solid rgba(255,45,210,.35)",
  borderRadius: 18,
  background:
    "linear-gradient(135deg, rgba(255,45,210,.10), rgba(0,217,255,.08), rgba(124,255,0,.08))",
  boxShadow: "0 0 30px rgba(255,45,210,.12)",
  textAlign: "center" as const,
};

const discoverTitle = {
  margin: 0,
  fontSize: 38,
  color: "#ff45d8",
  textShadow: "0 0 18px rgba(255,45,210,.35)",
};

const discoverText = {
  maxWidth: 900,
  margin: "16px auto 0",
  color: "#ddd",
  fontSize: 18,
  lineHeight: 1.7,
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