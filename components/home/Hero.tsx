"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createClient } from "../../lib/supabaseClient";

type HeroProfile = {
  full_name?: string | null;
  vip_tier?: string | null;
};

export default function Hero() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [profile, setProfile] = useState<HeroProfile | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const supabase = createClient();
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData.session?.user;

        if (!user || cancelled) return;

        const { data: profileData } = await supabase
          .from("customer_profiles")
          .select("full_name,vip_tier")
          .eq("id", user.id)
          .maybeSingle();

        if (!cancelled && profileData) {
          setProfile(profileData as HeroProfile);
        }
      } catch (error) {
        console.error("Unable to personalize homepage hero:", error);
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const query = searchTerm.trim();

    router.push(
      query
        ? `/shop?search=${encodeURIComponent(query)}`
        : "/shop"
    );
  }

  const firstName =
    profile?.full_name?.trim().split(/\s+/)[0] || null;

  const tier = profile?.vip_tier || null;

  return (
    <section aria-labelledby="pugpep-hero-title" className="hero">
      <div className="gridOverlay" aria-hidden="true" />
      <div className="glow glowPink" aria-hidden="true" />
      <div className="glow glowCyan" aria-hidden="true" />

      <div className="inner">
        <div className="content">
          <div className="brandPill">
            <span className="brandDot" />
            PUGPEP LABORATORY
          </div>

          {firstName ? (
            <p className="welcome">
              Welcome back, <strong>{firstName}</strong>
              {tier ? <> · {tier} Lab Status</> : null}
            </p>
          ) : (
            <p className="welcome">
              Premium research materials for qualified laboratory use
            </p>
          )}

          <p className="eyebrow">ENTER THE LAB</p>

          <h1 id="pugpep-hero-title" className="headline">
            Precision
            <span> Starts Here.</span>
          </h1>

          <p className="description">
            Explore research materials, transparent quality documentation,
            and a streamlined storefront built for fast product discovery.
          </p>

          <div className="actions">
            <Link href="/shop" className="primaryButton">
              SHOP THE LAB
              <span aria-hidden="true">→</span>
            </Link>

            <Link href="/quality" className="secondaryButton">
              VIEW QUALITY &amp; TESTING
            </Link>
          </div>

          <form
            onSubmit={submitSearch}
            role="search"
            className="searchShell"
          >
            <label htmlFor="hero-shop-search" className="srOnly">
              Search PugPep products
            </label>

            <span className="searchIcon" aria-hidden="true">
              ⌕
            </span>

            <input
              id="hero-shop-search"
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search products..."
              autoComplete="off"
            />

            <button type="submit">
              Search
            </button>
          </form>
        </div>

        <aside className="visual" aria-label="PugPep research overview">
          <div className="visualCard">
            <div className="visualTop">
              <span>RESEARCH OVERVIEW</span>
              <span className="online">ONLINE</span>
            </div>

            <div className="visualCenter">
              <div className="coreOuter">
                <div className="coreMiddle">
                  <div className="coreInner">P</div>
                </div>
              </div>

              <div className="visualCopy">
                <p>RESEARCH-FIRST</p>
                <h2>
                  Quality documentation.
                  <br />
                  Cleaner shopping.
                </h2>
              </div>
            </div>

            <div className="metrics">
              <div>
                <strong>RUO</strong>
                <span>Research Use Only</span>
              </div>
              <div>
                <strong>COA</strong>
                <span>Quality Documentation</span>
              </div>
              <div>
                <strong>USA</strong>
                <span>Domestic Support</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <style jsx>{`
        .hero {
          position: relative;
          min-height: 620px;
          overflow: hidden;
          display: grid;
          align-items: center;
          color: #fff;
          border-bottom: 1px solid rgba(0, 217, 255, 0.18);
          background:
            radial-gradient(circle at 15% 12%, rgba(255, 69, 216, 0.14), transparent 29%),
            radial-gradient(circle at 84% 14%, rgba(0, 217, 255, 0.15), transparent 30%),
            linear-gradient(180deg, #050507 0%, #020203 100%);
        }

        .gridOverlay {
          position: absolute;
          inset: 0;
          opacity: 0.13;
          background-image:
            linear-gradient(rgba(0, 217, 255, 0.13) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 69, 216, 0.1) 1px, transparent 1px);
          background-size: 64px 64px;
          mask-image: linear-gradient(to bottom, #000, transparent 94%);
          pointer-events: none;
        }

        .glow {
          position: absolute;
          border-radius: 999px;
          filter: blur(24px);
          pointer-events: none;
        }

        .glowPink {
          width: 280px;
          height: 280px;
          left: -100px;
          top: 24%;
          background: rgba(255, 69, 216, 0.12);
        }

        .glowCyan {
          width: 340px;
          height: 340px;
          right: -120px;
          top: 4%;
          background: rgba(0, 217, 255, 0.12);
        }

        .inner {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 1320px;
          margin: 0 auto;
          padding: 90px clamp(18px, 4vw, 52px) 70px;
          display: grid;
          grid-template-columns: minmax(0, 1.08fr) minmax(340px, 0.92fr);
          gap: clamp(28px, 5vw, 64px);
          align-items: center;
        }

        .content {
          min-width: 0;
        }

        .brandPill {
          width: fit-content;
          display: inline-flex;
          align-items: center;
          gap: 9px;
          padding: 8px 12px;
          border: 1px solid rgba(0, 217, 255, 0.34);
          border-radius: 999px;
          background: rgba(0, 217, 255, 0.05);
          color: #7df9ff;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.14em;
        }

        .brandDot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #00ff99;
          box-shadow: 0 0 12px rgba(0, 255, 153, 0.7);
        }

        .welcome {
          margin: 15px 0 0;
          color: #9fa1aa;
          font-size: 14px;
        }

        .eyebrow {
          margin: 34px 0 0;
          color: #ff45d8;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.2em;
        }

        .headline {
          max-width: 760px;
          margin: 9px 0 0;
          font-size: clamp(48px, 7vw, 84px);
          line-height: 0.98;
          letter-spacing: -0.055em;
          color: #fff;
        }

        .headline span {
          color: #7df9ff;
          text-shadow: 0 0 24px rgba(0, 217, 255, 0.2);
        }

        .description {
          max-width: 650px;
          margin: 20px 0 0;
          color: #b7b8c0;
          font-size: clamp(16px, 2vw, 18px);
          line-height: 1.65;
        }

        .actions {
          margin-top: 26px;
          display: flex;
          gap: 11px;
          flex-wrap: wrap;
        }

        .primaryButton,
        .secondaryButton {
          min-height: 50px;
          padding: 12px 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          border-radius: 11px;
          text-decoration: none;
          font-weight: 900;
        }

        .primaryButton {
          border: 1px solid #ff62de;
          background: linear-gradient(90deg, #d92eb8, #079dca);
          color: #fff;
          box-shadow: 0 0 20px rgba(255, 47, 208, 0.2);
        }

        .secondaryButton {
          border: 1px solid rgba(0, 217, 255, 0.45);
          background: rgba(0, 217, 255, 0.05);
          color: #7df9ff;
        }

        .searchShell {
          max-width: 690px;
          margin-top: 22px;
          padding: 7px;
          display: grid;
          grid-template-columns: 34px minmax(0, 1fr) auto;
          align-items: center;
          gap: 8px;
          border: 1px solid rgba(0, 217, 255, 0.36);
          border-radius: 14px;
          background: rgba(7, 7, 11, 0.92);
        }

        .searchIcon {
          text-align: center;
          color: #00d9ff;
          font-size: 23px;
        }

        .searchShell input {
          min-width: 0;
          min-height: 44px;
          padding: 8px;
          border: 0;
          outline: 0;
          background: transparent;
          color: #fff;
          font-size: 16px;
        }

        .searchShell button {
          min-height: 42px;
          padding: 9px 16px;
          border: 1px solid #45d97a;
          border-radius: 9px;
          background: linear-gradient(180deg, #2eea6f, #19b857);
          color: #fff;
          font-weight: 900;
          cursor: pointer;
        }

        .visual {
          min-width: 0;
        }

        .visualCard {
          padding: 24px;
          border: 1px solid rgba(255, 69, 216, 0.36);
          border-radius: 22px;
          background: linear-gradient(
            145deg,
            rgba(17, 7, 20, 0.94),
            rgba(5, 14, 18, 0.94)
          );
          box-shadow:
            0 0 32px rgba(255, 69, 216, 0.1),
            inset 0 0 28px rgba(0, 217, 255, 0.02);
        }

        .visualTop {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          color: #00d9ff;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.13em;
        }

        .online {
          padding: 5px 8px;
          border: 1px solid rgba(0, 255, 153, 0.5);
          border-radius: 999px;
          color: #00ff99;
          background: rgba(0, 255, 153, 0.07);
        }

        .visualCenter {
          min-height: 305px;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 20px;
        }

        .coreOuter {
          width: clamp(160px, 20vw, 220px);
          aspect-ratio: 1;
          display: grid;
          place-items: center;
          border: 1px solid rgba(0, 217, 255, 0.34);
          border-radius: 999px;
          background: conic-gradient(
            from 0deg,
            rgba(0, 217, 255, 0.02),
            rgba(255, 69, 216, 0.2),
            rgba(0, 255, 153, 0.08),
            rgba(0, 217, 255, 0.02)
          );
        }

        .coreMiddle {
          width: 76%;
          aspect-ratio: 1;
          display: grid;
          place-items: center;
          border: 1px solid rgba(255, 69, 216, 0.38);
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.3);
        }

        .coreInner {
          width: 62%;
          aspect-ratio: 1;
          display: grid;
          place-items: center;
          border: 1px solid rgba(0, 255, 153, 0.4);
          border-radius: 999px;
          color: #fff;
          font-size: clamp(50px, 7vw, 72px);
          font-weight: 900;
          text-shadow:
            7px 0 0 rgba(255, 69, 216, 0.38),
            -7px 0 0 rgba(0, 217, 255, 0.32);
        }

        .visualCopy {
          text-align: center;
        }

        .visualCopy p {
          margin: 0;
          color: #ff45d8;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.14em;
        }

        .visualCopy h2 {
          margin: 7px 0 0;
          color: #fff;
          font-size: clamp(21px, 3vw, 28px);
          line-height: 1.2;
        }

        .metrics {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        .metrics > div {
          min-width: 0;
          padding: 11px 9px;
          display: grid;
          gap: 4px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          background: rgba(0, 0, 0, 0.23);
        }

        .metrics strong {
          color: #7df9ff;
          font-size: 16px;
        }

        .metrics span {
          color: #8f9299;
          font-size: 10px;
          line-height: 1.3;
        }

        .srOnly {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        @media (max-width: 980px) {
          .inner {
            grid-template-columns: minmax(0, 1fr);
            padding-top: 82px;
          }

          .visual {
            display: none;
          }

          .hero {
            min-height: auto;
          }
        }

        @media (max-width: 620px) {
          .inner {
            padding-top: 72px;
            padding-bottom: 48px;
          }

          .headline {
            font-size: clamp(44px, 15vw, 64px);
          }

          .actions {
            display: grid;
          }

          .primaryButton,
          .secondaryButton {
            width: 100%;
          }

          .searchShell {
            grid-template-columns: 30px minmax(0, 1fr);
          }

          .searchShell button {
            grid-column: 1 / -1;
            width: 100%;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            scroll-behavior: auto !important;
          }
        }
      `}</style>
    </section>
  );
}
