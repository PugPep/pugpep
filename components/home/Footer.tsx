"use client";

import Link from "next/link";

const shopLinks = [
  { label: "Shop", href: "/shop" },
  { label: "Quality & Testing", href: "/quality" },
  { label: "My Lab", href: "/account" },
];

const supportLinks = [
  { label: "Contact", href: "/contact" },
  { label: "Shipping", href: "/shipping-policy" },
  { label: "Refunds", href: "/refund-policy" },
];

const legalLinks = [
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
  { label: "Research Use", href: "/research-use" },
];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="top">
          <div className="brandBlock">
            <p className="brand">PUGPEP</p>

            <h2>Precision Starts Here.</h2>

            <p className="copy">
              Research materials with transparent quality documentation,
              streamlined ordering, and direct support.
            </p>
          </div>

          <div className="linkGrid">
            <FooterColumn title="SHOP" links={shopLinks} />
            <FooterColumn title="SUPPORT" links={supportLinks} />
            <FooterColumn title="LEGAL" links={legalLinks} />
          </div>
        </div>

        <div className="notice">
          <strong>RESEARCH USE ONLY:</strong>{" "}
          PugPep products are intended for laboratory research purposes only.
          Not for human or veterinary use.
        </div>

        <div className="bottom">
          <span>
            © {new Date().getFullYear()} PugPep. All Rights Reserved.
          </span>

          <span>Veteran-Owned • U.S.-Based Support</span>
        </div>
      </div>

      <style jsx>{`
        .footer {
          padding: 34px 18px 22px;
          border-top: 1px solid rgba(0, 217, 255, 0.16);
          background: #010102;
          color: #fff;
        }

        .container {
          width: 100%;
          max-width: 1280px;
          margin: 0 auto;
        }

        .top {
          display: grid;
          grid-template-columns: minmax(0, 1.5fr) minmax(380px, 1fr);
          gap: 46px;
          align-items: start;
        }

        .brandBlock {
          max-width: 620px;
        }

        .brand {
          margin: 0;
          color: #00d9ff;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.18em;
        }

        h2 {
          margin: 8px 0 0;
          color: #fff;
          font-size: clamp(25px, 4vw, 34px);
          line-height: 1.05;
          letter-spacing: -0.03em;
        }

        .copy {
          margin: 10px 0 0;
          max-width: 560px;
          color: #9da0a8;
          font-size: 13px;
          line-height: 1.6;
        }

        .linkGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 22px;
        }

        .notice {
          margin-top: 28px;
          padding: 13px 14px;
          border: 1px solid rgba(0, 255, 153, 0.18);
          border-radius: 11px;
          background: rgba(0, 255, 153, 0.025);
          color: #989ba3;
          font-size: 11px;
          line-height: 1.55;
        }

        .notice strong {
          color: #00ff99;
        }

        .bottom {
          margin-top: 18px;
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.07);
          display: flex;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          color: #72757d;
          font-size: 11px;
        }

        @media (max-width: 900px) {
          .top {
            grid-template-columns: 1fr;
            gap: 28px;
          }
        }

        @media (max-width: 620px) {
          .footer {
            padding: 28px 14px 20px;
          }

          .linkGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 20px 16px;
          }

          .bottom {
            display: grid;
          }
        }

        @media (max-width: 390px) {
          .linkGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div className="column">
      <p>{title}</p>

      <div>
        {links.map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
      </div>

      <style jsx>{`
        .column p {
          margin: 0 0 9px;
          color: #ff45d8;
          font-size: 9px;
          font-weight: 950;
          letter-spacing: 0.13em;
        }

        .column div {
          display: grid;
          gap: 7px;
        }

        .column :global(a) {
          color: #c7c9cf;
          text-decoration: none;
          font-size: 12px;
          font-weight: 700;
        }

        .column :global(a:hover) {
          color: #7df9ff;
        }
      `}</style>
    </div>
  );
}
