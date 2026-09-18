"use client";

import { useMemo, useState } from "react";

type Product = {
  id?: string;
  name: string;
  slug: string;
  image?: string | null;
  color?: string | null;
  category?: string | null;
  is_new?: boolean;
  new_until?: string | null;
  feature_on_homepage?: boolean;
  homepage_feature_order?: number | null;
  is_coming_soon?: boolean;
};

type SaleEntry = {
  isOnSale?: boolean;
  badgeText?: string | null;
  campaignName?: string | null;
};

type ProductShowcaseProps = {
  products: Product[];
  saleMap: Record<string, SaleEntry>;
  openProduct: (slug: string) => void | Promise<void>;
};

type TabKey = "featured" | "new" | "sale";

export default function ProductShowcase({
  products,
  saleMap,
  openProduct,
}: ProductShowcaseProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("featured");

  const isProductNew = (product: Product) => {
    if (!product.is_new) return false;
    if (!product.new_until) return true;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date(`${product.new_until}T23:59:59`);
    return endDate.getTime() >= today.getTime();
  };

  const featured = useMemo(() => {
    return [...products]
      .filter(
        (product) =>
          !product.is_coming_soon &&
          (product.feature_on_homepage || isProductNew(product))
      )
      .sort((a, b) => {
        const aOrder = a.homepage_feature_order ?? 9999;
        const bOrder = b.homepage_feature_order ?? 9999;

        if (aOrder !== bOrder) return aOrder - bOrder;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 8);
  }, [products]);

  const newProducts = useMemo(() => {
    return [...products]
      .filter(
        (product) =>
          !product.is_coming_soon &&
          isProductNew(product)
      )
      .sort((a, b) => {
        const aOrder = a.homepage_feature_order ?? 9999;
        const bOrder = b.homepage_feature_order ?? 9999;

        if (aOrder !== bOrder) return aOrder - bOrder;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 8);
  }, [products]);

  const saleProducts = useMemo(() => {
    return [...products]
      .filter(
        (product) =>
          !product.is_coming_soon &&
          Boolean(saleMap[product.slug]?.isOnSale)
      )
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 8);
  }, [products, saleMap]);

  const visibleProducts =
    activeTab === "new"
      ? newProducts
      : activeTab === "sale"
        ? saleProducts
        : featured;

  const hasNew = newProducts.length > 0;
  const hasSale = saleProducts.length > 0;

  return (
    <section
      aria-labelledby="product-showcase-title"
      className="section"
    >
      <div className="container">
        <div className="headingRow">
          <div>
            <p className="eyebrow">SHOP PUGPEP</p>
            <h2 id="product-showcase-title">
              Featured Research Materials
            </h2>
          </div>

          <a href="/shop" className="viewAll">
            VIEW FULL CATALOG →
          </a>
        </div>

        <div
          className="tabs"
          role="tablist"
          aria-label="Homepage product groups"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "featured"}
            className={activeTab === "featured" ? "active" : ""}
            onClick={() => setActiveTab("featured")}
          >
            FEATURED
          </button>

          {hasNew ? (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "new"}
              className={activeTab === "new" ? "active" : ""}
              onClick={() => setActiveTab("new")}
            >
              NEW
            </button>
          ) : null}

          {hasSale ? (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "sale"}
              className={activeTab === "sale" ? "active" : ""}
              onClick={() => setActiveTab("sale")}
            >
              SALE
            </button>
          ) : null}
        </div>

        {visibleProducts.length === 0 ? (
          <div className="empty">
            No products are available in this section right now.
          </div>
        ) : (
          <div className="products" role="list">
            {visibleProducts.map((product) => {
              const sale = saleMap[product.slug];
              const newProduct = isProductNew(product);

              return (
                <button
                  key={product.slug}
                  type="button"
                  className="productCard"
                  role="listitem"
                  onClick={() => {
                    void openProduct(product.slug);
                  }}
                  style={{
                    borderColor: `${product.color || "#00d9ff"}4d`,
                  }}
                >
                  <div className="imageWrap">
                    {sale?.isOnSale ? (
                      <span className="saleBadge">
                        {sale.badgeText || "SALE"}
                      </span>
                    ) : newProduct ? (
                      <span className="newBadge">
                        NEW
                      </span>
                    ) : null}

                    <img
                      src={product.image || "/pugpep-logo.png"}
                      alt={product.name}
                      className="productImage"
                    />
                  </div>

                  <div className="productBody">
                    <span className="category">
                      {getCategoryLabel(product.category)}
                    </span>

                    <strong
                      style={{
                        color: product.color || "#7df9ff",
                      }}
                    >
                      {product.name}
                    </strong>

                    <span className="productCta">
                      VIEW PRODUCT →
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <a href="/shop" className="mobileViewAll">
          VIEW FULL CATALOG →
        </a>
      </div>

      <style jsx>{`
        .section {
          padding: 34px 18px 24px;
          background:
            radial-gradient(
              circle at 84% 8%,
              rgba(255, 69, 216, 0.05),
              transparent 28%
            ),
            #020203;
          color: #fff;
        }

        .container {
          width: 100%;
          max-width: 1280px;
          margin: 0 auto;
        }

        .headingRow {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 18px;
        }

        .eyebrow {
          margin: 0;
          color: #ff45d8;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.15em;
        }

        h2 {
          margin: 5px 0 0;
          color: #fff;
          font-size: clamp(27px, 4vw, 36px);
          line-height: 1.05;
          letter-spacing: -0.03em;
        }

        .viewAll {
          color: #7df9ff;
          text-decoration: none;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.05em;
          white-space: nowrap;
        }

        .tabs {
          margin-top: 18px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .tabs button {
          min-height: 36px;
          padding: 7px 12px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.025);
          color: #a7a9b0;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.06em;
          cursor: pointer;
        }

        .tabs button.active {
          border-color: rgba(0, 255, 153, 0.54);
          background: rgba(0, 255, 153, 0.07);
          color: #00ff99;
          box-shadow: 0 0 16px rgba(0, 255, 153, 0.08);
        }

        .products {
          margin-top: 16px;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .productCard {
          position: relative;
          min-width: 0;
          padding: 0;
          overflow: hidden;
          display: grid;
          grid-template-rows: minmax(0, 1fr) auto;
          border: 1px solid;
          border-radius: 14px;
          background: #060608;
          color: #fff;
          text-align: left;
          cursor: pointer;
          transition:
            transform 160ms ease,
            background 160ms ease,
            border-color 160ms ease;
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
              circle at 50% 45%,
              rgba(255, 255, 255, 0.04),
              transparent 60%
            ),
            #030304;
        }

        .productImage {
          width: 100%;
          height: 100%;
          object-fit: contain;
          padding: 6px;
        }

        .saleBadge,
        .newBadge {
          position: absolute;
          top: 10px;
          right: 10px;
          z-index: 2;
          padding: 5px 8px;
          border-radius: 999px;
          font-size: 9px;
          font-weight: 1000;
          letter-spacing: 0.04em;
        }

        .saleBadge {
          background: #00ff99;
          color: #001009;
        }

        .newBadge {
          background: linear-gradient(90deg, #00d9ff, #ff45d8);
          color: #fff;
        }

        .productBody {
          padding: 12px;
          display: grid;
          gap: 6px;
        }

        .category {
          width: fit-content;
          padding: 3px 6px;
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: 999px;
          color: #858890;
          font-size: 8px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .productBody strong {
          min-height: 34px;
          font-size: 14px;
          line-height: 1.2;
          text-transform: uppercase;
        }

        .productCta {
          color: #9ea1a9;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.04em;
        }

        .empty {
          margin-top: 16px;
          padding: 24px;
          border: 1px solid rgba(0, 217, 255, 0.2);
          border-radius: 13px;
          background: rgba(0, 217, 255, 0.03);
          color: #a8abb2;
          text-align: center;
        }

        .mobileViewAll {
          display: none;
        }

        @media (max-width: 980px) {
          .products {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 720px) {
          .section {
            padding-right: 0;
          }

          .headingRow {
            padding-right: 18px;
          }

          .viewAll {
            display: none;
          }

          .tabs {
            padding-right: 18px;
          }

          .products {
            display: flex;
            gap: 12px;
            overflow-x: auto;
            padding-right: 18px;
            padding-bottom: 8px;
            scroll-snap-type: x proximity;
            scrollbar-width: none;
          }

          .products::-webkit-scrollbar {
            display: none;
          }

          .productCard {
            flex: 0 0 min(68vw, 245px);
            scroll-snap-align: start;
          }

          .mobileViewAll {
            width: calc(100% - 18px);
            min-height: 44px;
            margin-top: 10px;
            display: grid;
            place-items: center;
            border: 1px solid rgba(0, 217, 255, 0.36);
            border-radius: 10px;
            background: rgba(0, 217, 255, 0.045);
            color: #7df9ff;
            text-decoration: none;
            font-size: 10px;
            font-weight: 950;
            letter-spacing: 0.05em;
          }
        }

        @media (max-width: 480px) {
          .section {
            padding-top: 28px;
          }

          h2 {
            font-size: 28px;
          }

          .productCard {
            flex-basis: min(72vw, 230px);
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
    </section>
  );
}

function getCategoryLabel(category?: string | null) {
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
