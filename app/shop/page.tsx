"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import AgeGate from "../../components/home/AgeGate";
import Footer from "../../components/home/Footer";
import { useStorefrontData } from "../../hooks/useStorefrontData";

type SortKey = "featured" | "az" | "za";
type FilterKey = "all" | "sale" | "peptides" | "sprays" | "lab materials";

export default function ShopPage() {
  return (
    <Suspense fallback={<ShopLoading />}>
      <ShopContent />
    </Suspense>
  );
}

function ShopContent() {
  const searchParams = useSearchParams();

  const {
    products,
    saleMap,
    productsLoading,
    campaignLoading,
    primaryCampaign,
    openProduct,
  } = useStorefrontData();

  const initialSearch = searchParams.get("search") || "";
  const initialFilter = normalizeFilter(searchParams.get("filter"));

  const [search, setSearch] = useState(initialSearch);
  const [filter, setFilter] = useState<FilterKey>(initialFilter);
  const [sort, setSort] = useState<SortKey>("featured");

  useEffect(() => {
    setSearch(searchParams.get("search") || "");
    setFilter(normalizeFilter(searchParams.get("filter")));
  }, [searchParams]);

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...products]
      .filter((product) => {
        const category = String(product.category || "")
          .toLowerCase()
          .trim();

        const isSpray =
          category === "spray" ||
          category === "nasal-spray";

        const matchesSearch =
          !query ||
          product.name.toLowerCase().includes(query) ||
          product.slug.toLowerCase().includes(query);

        const matchesFilter =
          filter === "all"
            ? true
            : filter === "sale"
              ? Boolean(saleMap[product.slug]?.isOnSale)
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
        if (sort === "az") {
          return a.name.localeCompare(b.name);
        }

        if (sort === "za") {
          return b.name.localeCompare(a.name);
        }

        const aFeatured =
          a.feature_on_homepage || isProductNew(a)
            ? 0
            : 1;

        const bFeatured =
          b.feature_on_homepage || isProductNew(b)
            ? 0
            : 1;

        if (aFeatured !== bFeatured) {
          return aFeatured - bFeatured;
        }

        if (a.category === b.category) {
          return a.name.localeCompare(b.name);
        }

        if (a.category === "peptide") return -1;
        if (b.category === "peptide") return 1;

        return a.name.localeCompare(b.name);
      });
  }, [products, saleMap, search, filter, sort]);

  const saleCount = useMemo(
    () =>
      products.filter(
        (product) =>
          Boolean(saleMap[product.slug]?.isOnSale)
      ).length,
    [products, saleMap]
  );

  return (
    <main className="page">
      <AgeGate />

      <section className="hero">
        <div className="heroInner">
          <div>
            <p className="eyebrow">PUGPEP CATALOG</p>

            <h1>Shop the Lab</h1>

            <p className="subtitle">
              Search the full PugPep research catalog, filter by category,
              and open any product for detailed research information.
            </p>
          </div>

          <div className="stats">
            <span>{products.length} PRODUCTS</span>
            <span>{saleCount} ON SALE</span>
            <span>{visibleProducts.length} SHOWING</span>
          </div>
        </div>
      </section>

      {primaryCampaign ? (
        <section className="campaignWrap">
          <div className="campaign">
            <div>
              <span className="campaignLabel">
                ACTIVE PROMOTION
              </span>

              <strong>
                {primaryCampaign.campaignName}
              </strong>

              <p>
                {primaryCampaign.bannerText}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setFilter("sale")}
            >
              VIEW SALE ITEMS
            </button>
          </div>
        </section>
      ) : null}

      <section className="catalog">
        <div className="controls">
          <div className="searchWrap">
            <label htmlFor="shop-search">
              SEARCH
            </label>

            <input
              id="shop-search"
              type="search"
              placeholder="Search products..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </div>

          <div className="filterRow">
            <div className="filterButtons">
              {(
                [
                  ["all", "ALL"],
                  ["sale", "SALE"],
                  ["peptides", "PEPTIDES"],
                  ["sprays", "SPRAYS"],
                  ["lab materials", "LAB MATERIALS"],
                ] as [FilterKey, string][]
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={
                    filter === value
                      ? "filter active"
                      : "filter"
                  }
                  onClick={() => setFilter(value)}
                >
                  {label}
                </button>
              ))}
            </div>

            <select
              value={sort}
              onChange={(event) =>
                setSort(event.target.value as SortKey)
              }
              aria-label="Sort products"
            >
              <option value="featured">
                Featured
              </option>
              <option value="az">A–Z</option>
              <option value="za">Z–A</option>
            </select>
          </div>

          {campaignLoading ? (
            <p className="campaignLoading">
              Checking active promotions...
            </p>
          ) : null}
        </div>

        {productsLoading ? (
          <div className="loadingGrid">
            {Array.from({ length: 8 }).map(
              (_, index) => (
                <div
                  key={index}
                  className="skeleton"
                />
              )
            )}
          </div>
        ) : visibleProducts.length === 0 ? (
          <div className="empty">
            <h2>No Products Found</h2>

            <p>
              Try another search term or clear your filters.
            </p>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setFilter("all");
                setSort("featured");
              }}
            >
              RESET CATALOG
            </button>
          </div>
        ) : (
          <div className="productGrid">
            {visibleProducts.map((product) => {
              const sale = saleMap[product.slug];

              return (
                <button
                  key={product.slug}
                  type="button"
                  className="productCard"
                  style={{
                    borderColor:
                      `${product.color || "#00d9ff"}45`,
                  }}
                  onClick={() => {
                    void openProduct(product.slug);
                  }}
                >
                  <div className="imageWrap">
                    {product.is_coming_soon ? (
                      <span className="comingSoonBadge">
                        COMING SOON
                      </span>
                    ) : sale?.isOnSale ? (
                      <span className="saleBadge">
                        {sale.badgeText || "SALE"}
                      </span>
                    ) : isProductNew(product) ? (
                      <span className="newBadge">
                        NEW
                      </span>
                    ) : null}

                    <img
                      src={
                        product.image ||
                        "/pugpep-logo.png"
                      }
                      alt={product.name}
                    />
                  </div>

                  <div className="productBody">
                    <span className="category">
                      {getCategoryLabel(
                        product.category
                      )}
                    </span>

                    <strong
                      style={{
                        color:
                          product.color ||
                          "#7df9ff",
                      }}
                    >
                      {product.name}
                    </strong>

                    {sale?.campaignName ? (
                      <span className="campaignName">
                        {sale.campaignName}
                      </span>
                    ) : null}

                    <span className="cta">
                      VIEW PRODUCT →
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <Footer />

      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          background: #000;
          color: #fff;
        }

        * {
          box-sizing: border-box;
        }
      `}</style>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: #000;
          color: #fff;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .hero {
          padding: 112px 18px 34px;
          border-bottom: 1px solid rgba(0, 217, 255, 0.16);
          background:
            radial-gradient(
              circle at 15% 10%,
              rgba(255, 69, 216, 0.12),
              transparent 28%
            ),
            radial-gradient(
              circle at 85% 5%,
              rgba(0, 217, 255, 0.12),
              transparent 28%
            ),
            #030304;
        }

        .heroInner {
          width: 100%;
          max-width: 1280px;
          margin: 0 auto;
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 24px;
        }

        .eyebrow {
          margin: 0;
          color: #ff45d8;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.16em;
        }

        h1 {
          margin: 7px 0 0;
          font-size: clamp(38px, 6vw, 62px);
          line-height: 1;
          letter-spacing: -0.045em;
        }

        .subtitle {
          max-width: 720px;
          margin: 12px 0 0;
          color: #a7a9b0;
          font-size: 14px;
          line-height: 1.6;
        }

        .stats {
          display: flex;
          gap: 7px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .stats span {
          padding: 6px 9px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.025);
          color: #9ca0a8;
          font-size: 9px;
          font-weight: 900;
        }

        .campaignWrap {
          padding: 14px 18px 0;
          background: #000;
        }

        .campaign {
          max-width: 1280px;
          margin: 0 auto;
          padding: 13px 15px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          border: 1px solid rgba(0, 255, 153, 0.28);
          border-radius: 13px;
          background:
            linear-gradient(
              110deg,
              rgba(0, 255, 153, 0.05),
              rgba(255, 69, 216, 0.04)
            ),
            #070709;
        }

        .campaignLabel {
          display: block;
          color: #00ff99;
          font-size: 9px;
          font-weight: 950;
          letter-spacing: 0.13em;
        }

        .campaign strong {
          display: block;
          margin-top: 3px;
          color: #ff75df;
          font-size: 14px;
          text-transform: uppercase;
        }

        .campaign p {
          margin: 4px 0 0;
          color: #aeb0b7;
          font-size: 12px;
        }

        .campaign button {
          flex: 0 0 auto;
          min-height: 38px;
          padding: 8px 12px;
          border: 1px solid rgba(0, 255, 153, 0.48);
          border-radius: 999px;
          background: rgba(0, 255, 153, 0.06);
          color: #00ff99;
          font-size: 9px;
          font-weight: 950;
          cursor: pointer;
        }

        .catalog {
          width: 100%;
          max-width: 1320px;
          margin: 0 auto;
          padding: 22px 18px 40px;
        }

        .controls {
          padding: 13px;
          display: grid;
          gap: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.018);
        }

        .searchWrap {
          display: grid;
          gap: 6px;
        }

        .searchWrap label {
          color: #00d9ff;
          font-size: 9px;
          font-weight: 950;
          letter-spacing: 0.13em;
        }

        .searchWrap input {
          width: 100%;
          min-height: 46px;
          padding: 10px 12px;
          border: 1px solid rgba(0, 217, 255, 0.32);
          border-radius: 10px;
          outline: 0;
          background: #050507;
          color: #fff;
          font-size: 15px;
        }

        .filterRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .filterButtons {
          display: flex;
          gap: 7px;
          flex-wrap: wrap;
        }

        .filter {
          min-height: 34px;
          padding: 7px 10px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.025);
          color: #aaaeb6;
          font-size: 9px;
          font-weight: 950;
          cursor: pointer;
        }

        .filter.active {
          border-color: rgba(0, 255, 153, 0.55);
          background: rgba(0, 255, 153, 0.07);
          color: #00ff99;
        }

        select {
          min-height: 36px;
          padding: 7px 30px 7px 10px;
          border: 1px solid rgba(0, 217, 255, 0.28);
          border-radius: 9px;
          background: #08080b;
          color: #fff;
          font-size: 11px;
        }

        .campaignLoading {
          margin: 0;
          color: #7e8189;
          font-size: 10px;
        }

        .productGrid,
        .loadingGrid {
          margin-top: 16px;
          display: grid;
          grid-template-columns: repeat(
            4,
            minmax(0, 1fr)
          );
          gap: 12px;
        }

        .productCard {
          min-width: 0;
          padding: 0;
          overflow: hidden;
          display: grid;
          grid-template-rows:
            minmax(0, 1fr)
            auto;
          border: 1px solid;
          border-radius: 14px;
          background: #060608;
          color: #fff;
          text-align: left;
          cursor: pointer;
          transition:
            transform 160ms ease,
            background 160ms ease;
        }

        .productCard:hover {
          transform: translateY(-2px);
          background: #08080b;
        }

        .imageWrap {
          position: relative;
          aspect-ratio: 1 / 1;
          overflow: hidden;
          display: grid;
          place-items: center;
          background:
            radial-gradient(
              circle,
              rgba(255, 255, 255, 0.035),
              transparent 62%
            ),
            #030304;
        }

        .imageWrap img {
          width: 100%;
          height: 100%;
          padding: 6px;
          object-fit: contain;
        }

        .saleBadge,
        .newBadge,
        .comingSoonBadge {
          position: absolute;
          top: 10px;
          right: 10px;
          z-index: 2;
          padding: 5px 8px;
          border-radius: 999px;
          font-size: 8px;
          font-weight: 1000;
          letter-spacing: 0.04em;
        }

        .saleBadge {
          background: #00ff99;
          color: #001009;
        }

        .newBadge {
          background:
            linear-gradient(
              90deg,
              #00d9ff,
              #ff45d8
            );
          color: #fff;
        }

        .comingSoonBadge {
          border: 1px solid rgba(255, 209, 102, 0.54);
          background: rgba(0, 0, 0, 0.82);
          color: #ffd166;
        }

        .productBody {
          padding: 12px;
          display: grid;
          gap: 6px;
        }

        .category {
          width: fit-content;
          padding: 3px 6px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 999px;
          color: #858890;
          font-size: 8px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .productBody strong {
          min-height: 34px;
          font-size: 14px;
          line-height: 1.2;
          text-transform: uppercase;
        }

        .campaignName {
          color: #00ff99;
          font-size: 9px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .cta {
          color: #989ba3;
          font-size: 9px;
          font-weight: 900;
        }

        .skeleton {
          aspect-ratio: 4 / 5;
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 14px;
          background:
            linear-gradient(
              110deg,
              #08080a 8%,
              #111116 18%,
              #08080a 33%
            );
          background-size: 200% 100%;
        }

        .empty {
          margin-top: 16px;
          padding: 42px 18px;
          border: 1px solid rgba(0, 217, 255, 0.18);
          border-radius: 14px;
          background: rgba(0, 217, 255, 0.025);
          text-align: center;
        }

        .empty h2 {
          margin: 0;
          font-size: 24px;
        }

        .empty p {
          margin: 8px 0 0;
          color: #9ca0a8;
          font-size: 13px;
        }

        .empty button {
          margin-top: 15px;
          min-height: 38px;
          padding: 8px 12px;
          border: 1px solid rgba(0, 255, 153, 0.44);
          border-radius: 999px;
          background: rgba(0, 255, 153, 0.06);
          color: #00ff99;
          font-size: 9px;
          font-weight: 950;
          cursor: pointer;
        }

        @media (max-width: 980px) {
          .productGrid,
          .loadingGrid {
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 720px) {
          .hero {
            padding-top: 92px;
          }

          .heroInner {
            display: grid;
          }

          .stats {
            justify-content: flex-start;
          }

          .campaign {
            align-items: stretch;
          }

          .campaign button {
            align-self: center;
          }

          .productGrid,
          .loadingGrid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
            gap: 10px;
          }
        }

        @media (max-width: 520px) {
          .hero {
            padding:
              84px 14px 28px;
          }

          .catalog {
            padding:
              18px 12px 32px;
          }

          .campaignWrap {
            padding:
              10px 12px 0;
          }

          .campaign {
            display: grid;
          }

          .campaign button {
            width: 100%;
          }

          .filterRow {
            display: grid;
          }

          select {
            width: 100%;
          }

          .productBody {
            padding: 10px;
          }

          .productBody strong {
            font-size: 12px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .productCard {
            transition: none !important;
          }

          .productCard:hover {
            transform: none !important;
          }
        }
      `}</style>
    </main>
  );
}

function normalizeFilter(
  value: string | null
): FilterKey {
  const normalized = String(value || "")
    .toLowerCase()
    .trim();

  if (normalized === "sale") return "sale";
  if (normalized === "peptides") return "peptides";
  if (normalized === "sprays") return "sprays";

  if (
    normalized === "lab materials" ||
    normalized === "lab-materials"
  ) {
    return "lab materials";
  }

  return "all";
}

function isProductNew(product: {
  is_new?: boolean;
  new_until?: string | null;
}) {
  if (!product.is_new) return false;
  if (!product.new_until) return true;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endDate = new Date(
    `${product.new_until}T23:59:59`
  );

  return (
    endDate.getTime() >= today.getTime()
  );
}

function getCategoryLabel(
  category?: string | null
) {
  const normalized = String(category || "")
    .toLowerCase()
    .trim();

  if (
    normalized === "spray" ||
    normalized === "nasal-spray"
  ) {
    return "Spray";
  }

  if (normalized === "lab-material") {
    return "Lab Material";
  }

  return "Research Compound";
}

function ShopLoading() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#000",
        color: "#8f9299",
        fontFamily:
          "Inter, ui-sans-serif, system-ui, sans-serif",
      }}
    >
      Loading catalog…
    </main>
  );
}
