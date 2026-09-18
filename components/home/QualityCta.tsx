"use client";

import Link from "next/link";

export default function QualityCta() {
  return (
    <section aria-labelledby="quality-cta-title" className="section">
      <div className="container">
        <div className="copy">
          <p className="eyebrow">TRANSPARENT RESEARCH</p>

          <h2 id="quality-cta-title">Quality You Can Verify</h2>

          <p className="text">
            Review testing information, lot documentation, and PugPep quality
            standards before you shop.
          </p>
        </div>

        <div className="actions">
          <Link href="/quality" className="primary">
            VIEW QUALITY &amp; TESTING
          </Link>

          <Link href="/shop" className="secondary">
            BROWSE CATALOG
          </Link>
        </div>
      </div>

      <style jsx>{`
        .section {
          padding: 24px 18px 36px;
          background: #020203;
          color: #fff;
        }

        .container {
          width: 100%;
          max-width: 1280px;
          margin: 0 auto;
          padding: 22px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          border: 1px solid rgba(0, 217, 255, 0.22);
          border-radius: 16px;
          background:
            linear-gradient(
              115deg,
              rgba(0, 217, 255, 0.05),
              rgba(255, 69, 216, 0.045),
              rgba(0, 255, 153, 0.035)
            ),
            #070709;
        }

        .copy {
          min-width: 0;
          max-width: 760px;
        }

        .eyebrow {
          margin: 0;
          color: #00ff99;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.15em;
        }

        h2 {
          margin: 6px 0 0;
          color: #fff;
          font-size: clamp(25px, 4vw, 34px);
          line-height: 1.08;
          letter-spacing: -0.03em;
        }

        .text {
          margin: 9px 0 0;
          max-width: 700px;
          color: #a8abb2;
          font-size: 13px;
          line-height: 1.55;
        }

        .actions {
          flex: 0 0 auto;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .primary,
        .secondary {
          min-height: 42px;
          padding: 9px 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          text-decoration: none;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.04em;
          white-space: nowrap;
        }

        .primary {
          border: 1px solid rgba(0, 255, 153, 0.5);
          background: rgba(0, 255, 153, 0.07);
          color: #00ff99;
        }

        .secondary {
          border: 1px solid rgba(0, 217, 255, 0.42);
          background: rgba(0, 217, 255, 0.05);
          color: #7df9ff;
        }

        @media (max-width: 760px) {
          .container {
            display: grid;
          }

          .actions {
            justify-content: stretch;
          }

          .primary,
          .secondary {
            flex: 1 1 100%;
          }
        }

        @media (max-width: 620px) {
          .section {
            padding: 20px 12px 28px;
          }

          .container {
            padding: 18px;
          }

          h2 {
            font-size: 28px;
          }
        }
      `}</style>
    </section>
  );
}
