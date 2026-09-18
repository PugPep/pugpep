"use client";

type TrustItem = {
  title: string;
  description: string;
  accent: string;
  href?: string;
};

const trustItems: TrustItem[] = [
  {
    title: "Veteran Owned",
    description:
      "Built with discipline, accountability, and a commitment to reliable service.",
    accent: "#ff45d8",
  },
  {
    title: "Third-Party Tested",
    description:
      "Independent analytical documentation is available for represented research lots.",
    accent: "#00d9ff",
    href: "/quality",
  },
  {
    title: "Tracked Shipping",
    description:
      "Carrier tracking is provided when available for supported fulfillment methods.",
    accent: "#00ff99",
    href: "/shipping-policy",
  },
  {
    title: "U.S.-Based Support",
    description:
      "Direct help for orders, product questions, and research documentation.",
    accent: "#ffd166",
    href: "/contact",
  },
];

export default function TrustStrip() {
  return (
    <section aria-labelledby="trust-strip-title" className="section">
      <div className="container">
        <div className="headingRow">
          <div>
            <p className="eyebrow">WHY PUGPEP</p>
            <h2 id="trust-strip-title">Built on Trust</h2>
          </div>

          <a href="/quality" className="qualityLink">
            QUALITY &amp; TESTING →
          </a>
        </div>

        <div className="scroller" role="list">
          {trustItems.map((item) => {
            const content = (
              <article
                className="card"
                style={{
                  borderColor: `${item.accent}55`,
                  boxShadow: `0 0 18px ${item.accent}12`,
                }}
              >
                <span
                  className="accentBar"
                  style={{ background: item.accent }}
                  aria-hidden="true"
                />

                <div className="cardCopy">
                  <h3 style={{ color: item.accent }}>{item.title}</h3>
                  <p>{item.description}</p>
                </div>

                {item.href ? (
                  <span className="arrow" style={{ color: item.accent }}>
                    →
                  </span>
                ) : null}
              </article>
            );

            return item.href ? (
              <a
                key={item.title}
                href={item.href}
                className="cardLink"
                role="listitem"
              >
                {content}
              </a>
            ) : (
              <div key={item.title} className="cardLink" role="listitem">
                {content}
              </div>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .section {
          padding: 34px 18px 18px;
          background:
            radial-gradient(
              circle at 15% 10%,
              rgba(0, 217, 255, 0.05),
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
          margin-bottom: 16px;
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
          font-size: clamp(25px, 4vw, 34px);
          line-height: 1.05;
          letter-spacing: -0.03em;
        }

        .qualityLink {
          color: #7df9ff;
          text-decoration: none;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.05em;
          white-space: nowrap;
        }

        .scroller {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .cardLink {
          min-width: 0;
          color: inherit;
          text-decoration: none;
        }

        .card {
          position: relative;
          min-height: 128px;
          height: 100%;
          padding: 17px 42px 17px 18px;
          overflow: hidden;
          display: grid;
          align-content: center;
          border: 1px solid;
          border-radius: 14px;
          background:
            linear-gradient(
              145deg,
              rgba(13, 13, 18, 0.96),
              rgba(7, 7, 10, 0.96)
            );
          transition:
            transform 160ms ease,
            border-color 160ms ease,
            background 160ms ease;
        }

        .cardLink:hover .card {
          transform: translateY(-2px);
          background:
            linear-gradient(
              145deg,
              rgba(16, 16, 22, 0.98),
              rgba(8, 8, 12, 0.98)
            );
        }

        .accentBar {
          position: absolute;
          top: 14px;
          bottom: 14px;
          left: 0;
          width: 3px;
          border-radius: 0 3px 3px 0;
          box-shadow: 0 0 12px currentColor;
        }

        .cardCopy {
          min-width: 0;
        }

        h3 {
          margin: 0;
          font-size: 15px;
          line-height: 1.2;
        }

        .card p {
          margin: 7px 0 0;
          color: #a8aab2;
          font-size: 12px;
          line-height: 1.5;
        }

        .arrow {
          position: absolute;
          right: 16px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 18px;
          font-weight: 900;
        }

        @media (max-width: 900px) {
          .section {
            padding-right: 0;
          }

          .headingRow {
            padding-right: 18px;
          }

          .scroller {
            display: flex;
            gap: 12px;
            overflow-x: auto;
            padding-right: 18px;
            padding-bottom: 6px;
            scroll-snap-type: x proximity;
            scrollbar-width: none;
          }

          .scroller::-webkit-scrollbar {
            display: none;
          }

          .cardLink {
            flex: 0 0 min(78vw, 300px);
            scroll-snap-align: start;
          }

          .card {
            min-height: 118px;
          }
        }

        @media (max-width: 620px) {
          .section {
            padding-top: 26px;
          }

          .headingRow {
            align-items: flex-start;
          }

          .qualityLink {
            display: none;
          }

          h2 {
            font-size: 28px;
          }

          .cardLink {
            flex-basis: min(82vw, 290px);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .card {
            transition: none !important;
          }

          .cardLink:hover .card {
            transform: none !important;
          }
        }
      `}</style>
    </section>
  );
}
