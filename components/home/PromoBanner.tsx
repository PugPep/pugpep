"use client";

type Campaign = {
  campaignName?: string | null;
  bannerText?: string | null;
};

type PromoBannerProps = {
  campaign?: Campaign | null;
};

export default function PromoBanner({ campaign }: PromoBannerProps) {
  if (!campaign) return null;

  const title = campaign.campaignName?.trim() || "Current Promotion";
  const message =
    campaign.bannerText?.trim() ||
    "Explore current PugPep offers while available.";

  return (
    <section className="wrap" aria-label="Current PugPep promotion">
      <div className="banner">
        <div className="copy">
          <span className="eyebrow">ACTIVE PROMOTION</span>
          <strong className="title">{title}</strong>
          <span className="message">{message}</span>
        </div>

        <a href="/shop?filter=sale" className="button">
          VIEW OFFERS
          <span aria-hidden="true">→</span>
        </a>
      </div>

      <style jsx>{`
        .wrap {
          width: 100%;
          padding: 14px 18px 0;
          background: #000;
        }

        .banner {
          max-width: 1280px;
          margin: 0 auto;
          padding: 14px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          border: 1px solid rgba(255, 69, 216, 0.34);
          border-radius: 14px;
          background:
            linear-gradient(
              110deg,
              rgba(255, 69, 216, 0.075),
              rgba(0, 217, 255, 0.05),
              rgba(0, 255, 153, 0.04)
            ),
            #070709;
          box-shadow:
            0 0 24px rgba(255, 69, 216, 0.07),
            inset 0 0 24px rgba(0, 217, 255, 0.025);
        }

        .copy {
          min-width: 0;
          display: grid;
          grid-template-columns: auto auto minmax(0, 1fr);
          align-items: center;
          gap: 10px 14px;
        }

        .eyebrow {
          color: #00ff99;
          font-size: 9px;
          font-weight: 950;
          letter-spacing: 0.14em;
          white-space: nowrap;
        }

        .title {
          color: #ff75df;
          font-size: 14px;
          line-height: 1.2;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .message {
          min-width: 0;
          color: #c3c5cc;
          font-size: 13px;
          line-height: 1.4;
        }

        .button {
          min-height: 40px;
          padding: 9px 13px;
          flex: 0 0 auto;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 1px solid rgba(0, 255, 153, 0.52);
          border-radius: 999px;
          background: rgba(0, 255, 153, 0.065);
          color: #00ff99;
          text-decoration: none;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.05em;
        }

        @media (max-width: 820px) {
          .banner {
            align-items: stretch;
          }

          .copy {
            grid-template-columns: 1fr;
            gap: 5px;
          }

          .title {
            white-space: normal;
          }

          .button {
            align-self: center;
          }
        }

        @media (max-width: 620px) {
          .wrap {
            padding: 10px 12px 0;
          }

          .banner {
            padding: 13px;
            display: grid;
            gap: 12px;
          }

          .button {
            width: 100%;
          }
        }
      `}</style>
    </section>
  );
}
