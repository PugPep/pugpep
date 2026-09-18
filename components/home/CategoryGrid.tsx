"use client";

type CategoryItem = {
  title: string;
  description: string;
  href: string;
  accent: string;
  label: string;
};

const categories: CategoryItem[] = [
  {
    title: "Research Peptides",
    description: "Browse the core PugPep research catalog.",
    href: "/shop?filter=peptides",
    accent: "#ff45d8",
    label: "CORE CATALOG",
  },
  {
    title: "Research Sprays",
    description: "Explore available research spray formats.",
    href: "/shop?filter=sprays",
    accent: "#00d9ff",
    label: "SPRAYS",
  },
  {
    title: "Lab Materials",
    description: "Shop laboratory supplies and supporting materials.",
    href: "/shop?filter=lab%20materials",
    accent: "#00ff99",
    label: "LAB ESSENTIALS",
  },
  {
    title: "Current Offers",
    description: "See products included in active promotions.",
    href: "/shop?filter=sale",
    accent: "#ffd166",
    label: "PROMOTIONS",
  },
];

export default function CategoryGrid() {
  return (
    <section aria-labelledby="shop-categories-title" className="section">
      <div className="container">
        <div className="headingRow">
          <div>
            <p className="eyebrow">SHOP BY CATEGORY</p>
            <h2 id="shop-categories-title">Find What You Need Faster</h2>
          </div>

          <a href="/shop" className="viewAll">
            VIEW FULL CATALOG →
          </a>
        </div>

        <div className="grid">
          {categories.map((category) => (
            <a
              key={category.title}
              href={category.href}
              className="card"
              style={{
                borderColor: `${category.accent}4d`,
                boxShadow: `0 0 18px ${category.accent}0d`,
              }}
            >
              <span
                className="topLine"
                style={{ background: category.accent }}
                aria-hidden="true"
              />

              <span
                className="label"
                style={{ color: category.accent }}
              >
                {category.label}
              </span>

              <strong>{category.title}</strong>

              <span className="description">
                {category.description}
              </span>

              <span
                className="arrow"
                style={{ color: category.accent }}
                aria-hidden="true"
              >
                →
              </span>
            </a>
          ))}
        </div>
      </div>

      <style jsx>{`
        .section {
          padding: 26px 18px 18px;
          background: #020203;
          color: #fff;
        }

        .container {
          width: 100%;
          max-width: 1280px;
          margin: 0 auto;
        }

        .headingRow {
          margin-bottom: 16px;
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 18px;
        }

        .eyebrow {
          margin: 0;
          color: #00d9ff;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.15em;
        }

        h2 {
          margin: 5px 0 0;
          color: #fff;
          font-size: clamp(25px, 4vw, 34px);
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

        .grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .card {
          position: relative;
          min-height: 150px;
          padding: 18px;
          overflow: hidden;
          display: grid;
          align-content: start;
          gap: 8px;
          border: 1px solid;
          border-radius: 14px;
          background:
            linear-gradient(
              145deg,
              rgba(13, 13, 18, 0.96),
              rgba(7, 7, 10, 0.96)
            );
          color: #fff;
          text-decoration: none;
          transition:
            transform 160ms ease,
            border-color 160ms ease,
            background 160ms ease;
        }

        .card:hover {
          transform: translateY(-2px);
          background:
            linear-gradient(
              145deg,
              rgba(16, 16, 22, 0.98),
              rgba(8, 8, 12, 0.98)
            );
        }

        .topLine {
          position: absolute;
          top: 0;
          left: 18px;
          right: 18px;
          height: 2px;
          border-radius: 0 0 3px 3px;
          opacity: 0.9;
        }

        .label {
          margin-top: 4px;
          font-size: 9px;
          font-weight: 950;
          letter-spacing: 0.12em;
        }

        strong {
          padding-right: 24px;
          color: #fff;
          font-size: 18px;
          line-height: 1.2;
        }

        .description {
          max-width: 260px;
          color: #9fa1aa;
          font-size: 12px;
          line-height: 1.5;
        }

        .arrow {
          position: absolute;
          right: 16px;
          bottom: 15px;
          font-size: 20px;
          font-weight: 900;
        }

        @media (max-width: 920px) {
          .grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 620px) {
          .section {
            padding-top: 22px;
          }

          .headingRow {
            align-items: flex-start;
          }

          .viewAll {
            display: none;
          }

          h2 {
            font-size: 28px;
          }

          .grid {
            gap: 10px;
          }

          .card {
            min-height: 138px;
            padding: 15px;
          }

          strong {
            padding-right: 18px;
            font-size: 16px;
          }

          .description {
            font-size: 11px;
          }

          .topLine {
            left: 15px;
            right: 15px;
          }
        }

        @media (max-width: 390px) {
          .grid {
            grid-template-columns: 1fr;
          }

          .card {
            min-height: 120px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .card {
            transition: none !important;
          }

          .card:hover {
            transform: none !important;
          }
        }
      `}</style>
    </section>
  );
}
