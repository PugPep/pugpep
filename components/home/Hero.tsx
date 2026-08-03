"use client";

import { FormEvent, useEffect, useState } from "react";
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
    const target = query
      ? `/?search=${encodeURIComponent(query)}#laboratory`
      : "/#laboratory";

    router.push(target);

    window.setTimeout(() => {
      document.getElementById("laboratory")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 60);
  }

  function enterLab() {
    document.getElementById("laboratory")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  const firstName =
    profile?.full_name?.trim().split(/\s+/)[0] || null;

  const tier = profile?.vip_tier || null;

  return (
    <section aria-labelledby="pugpep-hero-title" style={hero}>
      <div aria-hidden="true" style={gridOverlay} />
      <div aria-hidden="true" style={{ ...glowOrb, ...pinkOrb }} />
      <div aria-hidden="true" style={{ ...glowOrb, ...cyanOrb }} />
      <div aria-hidden="true" style={{ ...glowOrb, ...greenOrb }} />

      <div style={heroInner}>
        <div style={contentColumn}>
          <div style={brandPill}>
            <span style={brandDot} />
            PUGPEP LABORATORY
          </div>

          {firstName ? (
            <p style={welcomeText}>
              Welcome back, <strong>{firstName}</strong>
              {tier ? <> · {tier} Lab Status</> : null}
            </p>
          ) : (
            <p style={welcomeText}>
              Premium compounds for qualified laboratory research
            </p>
          )}

          <p style={overline}>ENTER THE LAB</p>

          <h1 id="pugpep-hero-title" style={headline}>
            Precision
            <span style={headlineAccent}> Starts Here.</span>
          </h1>

          <p style={description}>
            Explore third-party-tested compounds, transparent quality
            documentation, and a streamlined ordering experience built for
            discovery.
          </p>

          <div style={actionRow}>
            <button type="button" onClick={enterLab} style={primaryButton}>
              Enter the Lab
              <span aria-hidden="true" style={buttonArrow}>
                →
              </span>
            </button>

            <a href="/quality" style={secondaryButton}>
              View Quality Standards
            </a>
          </div>

          <form onSubmit={submitSearch} role="search" style={searchShell}>
            <span aria-hidden="true" style={searchIcon}>
              ⌕
            </span>

            <label htmlFor="hero-lab-search" style={srOnly}>
              Search the laboratory
            </label>

            <input
              id="hero-lab-search"
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search the Lab..."
              autoComplete="off"
              style={searchInput}
            />

            <button type="submit" style={searchButton}>
              Search
            </button>
          </form>

          <div style={trustGrid}>
            <TrustBadge icon="★" label="Veteran Owned" />
            <TrustBadge icon="✓" label="Third-Party Tested" />
            <TrustBadge icon="↗" label="Fast Delivery" />
            <TrustBadge icon="◆" label="Trusted by Researchers" />
          </div>
        </div>

        <aside style={visualColumn}>
          <div style={visualCard}>
            <div style={visualTopRow}>
              <span style={visualLabel}>LIVE LAB OVERVIEW</span>
              <span style={statusPill}>ONLINE</span>
            </div>

            <div style={visualCenter}>
              <div style={coreRingOuter}>
                <div style={coreRingMiddle}>
                  <div style={coreRingInner}>
                    <span style={coreMark}>P</span>
                  </div>
                </div>
              </div>

              <div style={visualCopy}>
                <p style={visualEyebrow}>BUILT FOR DISCOVERY</p>
                <h2 style={visualTitle}>
                  Transparent quality.
                  <br />
                  Premium experience.
                </h2>
              </div>
            </div>

            <div style={metricGrid}>
              <Metric value="RUO" label="Research Use Only" />
              <Metric value="COA" label="Quality Documentation" />
              <Metric value="USA" label="Domestic Fulfillment" />
            </div>
          </div>
        </aside>
      </div>

      <style jsx>{`
        @keyframes heroFloat {
          0%,
          100% {
            transform: translate3d(0, 0, 0);
          }

          50% {
            transform: translate3d(0, -12px, 0);
          }
        }

        @keyframes heroPulse {
          0%,
          100% {
            opacity: 0.52;
            transform: scale(1);
          }

          50% {
            opacity: 0.8;
            transform: scale(1.06);
          }
        }

        section {
          isolation: isolate;
        }

        aside {
          animation: heroFloat 8s ease-in-out infinite;
        }

        @media (max-width: 980px) {
          section > div:last-of-type {
            grid-template-columns: minmax(0, 1fr) !important;
          }

          aside {
            max-width: 720px;
            width: 100%;
            justify-self: center;
          }
        }

        @media (max-width: 720px) {
          form {
            grid-template-columns: 32px minmax(0, 1fr) !important;
          }

          form button {
            grid-column: 1 / -1;
            width: 100%;
          }
        }

        @media (max-width: 620px) {
          section {
            min-height: auto !important;
          }

          section > div:last-of-type {
            padding-top: 72px !important;
            padding-bottom: 54px !important;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          section *,
          aside {
            animation: none !important;
            scroll-behavior: auto !important;
          }
        }
      `}</style>
    </section>
  );
}

function TrustBadge({ icon, label }: { icon: string; label: string }) {
  return (
    <div style={trustBadge}>
      <span style={trustIcon}>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div style={metricCard}>
      <strong style={metricValue}>{value}</strong>
      <span style={metricLabel}>{label}</span>
    </div>
  );
}

const hero = {
  position: "relative" as const,
  minHeight: "72vh",
  overflow: "hidden",
  display: "grid",
  alignItems: "center",
  borderBottom: "1px solid rgba(0,217,255,.20)",
  background:
    "radial-gradient(circle at 15% 10%, rgba(255,47,208,.15), transparent 29%), radial-gradient(circle at 82% 15%, rgba(0,217,255,.16), transparent 30%), radial-gradient(circle at 50% 100%, rgba(0,255,153,.08), transparent 36%), linear-gradient(180deg, #050507 0%, #020203 100%)",
  color: "#ffffff",
};

const heroInner = {
  position: "relative" as const,
  zIndex: 2,
  width: "100%",
  maxWidth: 1320,
  margin: "0 auto",
  padding:
    "clamp(84px, 10vw, 130px) clamp(18px, 4vw, 52px) clamp(64px, 8vw, 100px)",
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.08fr) minmax(360px, .92fr)",
  gap: "clamp(30px, 6vw, 80px)",
  alignItems: "center",
  boxSizing: "border-box" as const,
};

const contentColumn = { minWidth: 0 };

const visualColumn = { minWidth: 0 };

const gridOverlay = {
  position: "absolute" as const,
  inset: 0,
  zIndex: 0,
  opacity: 0.16,
  backgroundImage:
    "linear-gradient(rgba(0,217,255,.14) 1px, transparent 1px), linear-gradient(90deg, rgba(255,47,208,.11) 1px, transparent 1px)",
  backgroundSize: "64px 64px",
  maskImage:
    "linear-gradient(to bottom, rgba(0,0,0,.85), transparent 92%)",
};

const glowOrb = {
  position: "absolute" as const,
  zIndex: 0,
  borderRadius: 999,
  filter: "blur(12px)",
  pointerEvents: "none" as const,
};

const pinkOrb = {
  width: 290,
  height: 290,
  left: "-110px",
  top: "22%",
  background:
    "radial-gradient(circle, rgba(255,47,208,.25), transparent 70%)",
};

const cyanOrb = {
  width: 360,
  height: 360,
  right: "-120px",
  top: "2%",
  background:
    "radial-gradient(circle, rgba(0,217,255,.24), transparent 70%)",
};

const greenOrb = {
  width: 280,
  height: 280,
  left: "44%",
  bottom: "-150px",
  background:
    "radial-gradient(circle, rgba(0,255,153,.14), transparent 70%)",
};

const brandPill = {
  width: "fit-content",
  display: "flex",
  alignItems: "center",
  gap: 9,
  padding: "8px 12px",
  border: "1px solid rgba(0,217,255,.36)",
  borderRadius: 999,
  background: "rgba(0,217,255,.06)",
  color: "#7df9ff",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: ".14em",
};

const brandDot = {
  width: 8,
  height: 8,
  borderRadius: 999,
  background: "#00ff99",
  boxShadow: "0 0 12px rgba(0,255,153,.75)",
};

const welcomeText = {
  margin: "16px 0 0",
  color: "#a9a9b0",
  fontSize: 14,
};

const overline = {
  margin: "clamp(32px, 5vw, 56px) 0 0",
  color: "#ff45d8",
  fontSize: 13,
  fontWeight: 900,
  letterSpacing: ".22em",
};

const headline = {
  maxWidth: 800,
  margin: "10px 0 0",
  fontSize: "clamp(48px, 8vw, 92px)",
  lineHeight: 0.96,
  letterSpacing: "-.055em",
  color: "#ffffff",
};

const headlineAccent = {
  color: "#7df9ff",
  textShadow: "0 0 24px rgba(0,217,255,.22)",
};

const description = {
  maxWidth: 670,
  margin: "22px 0 0",
  color: "#bdbdc4",
  fontSize: "clamp(16px, 2vw, 19px)",
  lineHeight: 1.7,
};

const actionRow = {
  marginTop: 28,
  display: "flex",
  gap: 12,
  flexWrap: "wrap" as const,
};

const primaryButton = {
  minHeight: 54,
  padding: "13px 20px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  border: "1px solid #ff62de",
  borderRadius: 12,
  background: "linear-gradient(90deg, #d92eb8, #079dca)",
  color: "#ffffff",
  fontSize: 16,
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 0 22px rgba(255,47,208,.23)",
};

const buttonArrow = {
  fontSize: 21,
  lineHeight: 1,
};

const secondaryButton = {
  minHeight: 54,
  padding: "13px 20px",
  display: "inline-grid",
  placeItems: "center",
  border: "1px solid rgba(0,217,255,.48)",
  borderRadius: 12,
  background: "rgba(0,217,255,.06)",
  color: "#7df9ff",
  textDecoration: "none",
  fontSize: 15,
  fontWeight: 800,
};

const searchShell = {
  maxWidth: 720,
  marginTop: 26,
  padding: 8,
  display: "grid",
  gridTemplateColumns: "34px minmax(0, 1fr) auto",
  alignItems: "center",
  gap: 8,
  border: "1px solid rgba(0,217,255,.44)",
  borderRadius: 15,
  background:
    "linear-gradient(145deg, rgba(8,8,12,.96), rgba(17,8,18,.94))",
  boxShadow: "0 0 20px rgba(0,217,255,.10)",
};

const searchIcon = {
  textAlign: "center" as const,
  color: "#00d9ff",
  fontSize: 25,
};

const searchInput = {
  minWidth: 0,
  minHeight: 46,
  padding: "9px 8px",
  border: 0,
  outline: 0,
  background: "transparent",
  color: "#ffffff",
  fontSize: 16,
};

const searchButton = {
  minHeight: 44,
  padding: "10px 17px",
  border: "1px solid #45d97a",
  borderRadius: 10,
  background: "linear-gradient(180deg, #2eea6f, #19b857)",
  color: "#ffffff",
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 0 14px rgba(46,234,111,.18)",
};

const trustGrid = {
  marginTop: 20,
  display: "flex",
  flexWrap: "wrap" as const,
  gap: 9,
};

const trustBadge = {
  minHeight: 35,
  padding: "7px 10px",
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  border: "1px solid rgba(255,255,255,.12)",
  borderRadius: 999,
  background: "rgba(255,255,255,.035)",
  color: "#d1d1d6",
  fontSize: 12,
  fontWeight: 700,
};

const trustIcon = {
  color: "#00ff99",
  fontWeight: 900,
};

const visualCard = {
  position: "relative" as const,
  padding: "clamp(20px, 4vw, 30px)",
  overflow: "hidden",
  border: "1px solid rgba(255,47,208,.46)",
  borderRadius: 24,
  background:
    "linear-gradient(145deg, rgba(17,7,20,.96), rgba(5,14,18,.96))",
  boxShadow:
    "0 0 34px rgba(255,47,208,.12), inset 0 0 30px rgba(0,217,255,.025)",
};

const visualTopRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
};

const visualLabel = {
  color: "#00d9ff",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: ".14em",
};

const statusPill = {
  padding: "6px 9px",
  border: "1px solid rgba(0,255,153,.55)",
  borderRadius: 999,
  background: "rgba(0,255,153,.08)",
  color: "#00ff99",
  fontSize: 10,
  fontWeight: 900,
};

const visualCenter = {
  minHeight: 390,
  display: "grid",
  placeItems: "center",
  alignContent: "center",
  gap: 24,
};

const coreRingOuter = {
  width: "clamp(190px, 24vw, 260px)",
  aspectRatio: "1",
  display: "grid",
  placeItems: "center",
  border: "1px solid rgba(0,217,255,.38)",
  borderRadius: 999,
  background:
    "conic-gradient(from 0deg, rgba(0,217,255,.02), rgba(255,47,208,.24), rgba(0,255,153,.10), rgba(0,217,255,.02))",
  boxShadow: "0 0 38px rgba(0,217,255,.10)",
};

const coreRingMiddle = {
  width: "78%",
  aspectRatio: "1",
  display: "grid",
  placeItems: "center",
  border: "1px solid rgba(255,47,208,.42)",
  borderRadius: 999,
  background: "rgba(0,0,0,.34)",
  boxShadow: "inset 0 0 26px rgba(255,47,208,.10)",
};

const coreRingInner = {
  width: "62%",
  aspectRatio: "1",
  display: "grid",
  placeItems: "center",
  border: "1px solid rgba(0,255,153,.44)",
  borderRadius: 999,
  background:
    "radial-gradient(circle, rgba(0,255,153,.13), rgba(0,217,255,.04), rgba(0,0,0,.48))",
  boxShadow: "0 0 30px rgba(0,255,153,.10)",
};

const coreMark = {
  color: "#ffffff",
  fontSize: "clamp(54px, 8vw, 84px)",
  fontWeight: 900,
  letterSpacing: "-.08em",
  textShadow:
    "8px 0 0 rgba(255,47,208,.42), -8px 0 0 rgba(0,217,255,.35)",
};

const visualCopy = {
  textAlign: "center" as const,
};

const visualEyebrow = {
  margin: 0,
  color: "#ff45d8",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: ".14em",
};

const visualTitle = {
  margin: "8px 0 0",
  color: "#ffffff",
  fontSize: "clamp(22px, 4vw, 32px)",
  lineHeight: 1.2,
};

const metricGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 9,
};

const metricCard = {
  minWidth: 0,
  padding: "12px 10px",
  display: "grid",
  gap: 4,
  border: "1px solid rgba(255,255,255,.11)",
  borderRadius: 11,
  background: "rgba(0,0,0,.25)",
};

const metricValue = {
  color: "#7df9ff",
  fontSize: 17,
};

const metricLabel = {
  color: "#8f8f97",
  fontSize: 10,
  lineHeight: 1.35,
};

const srOnly = {
  position: "absolute" as const,
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap" as const,
  border: 0,
};