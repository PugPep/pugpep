"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../../lib/supabaseClient";

const ADMIN_EMAIL = "pugpep99@gmail.com";

type HubCard = {
  title: string;
  description: string;
  href: string;
  accent: string;
  icon: string;
  status: string;
};

const hubCards: HubCard[] = [
  {
    title: "Campaigns",
    description:
      "Create, edit, schedule, activate, and deactivate sales campaigns.",
    href: "/admin/promotions/campaigns",
    accent: "#ff45d8",
    icon: "📢",
    status: "Ready to build",
  },
  {
    title: "Product Assignments",
    description:
      "Choose which products, dosages, singles, and kits belong to each campaign.",
    href: "/admin/promotions/assignments",
    accent: "#00d9ff",
    icon: "📦",
    status: "Ready to build",
  },
  {
    title: "Profit Simulator",
    description:
      "Preview sale revenue, product cost, shipping, packaging, profit, and margin.",
    href: "/admin/promotions/simulator",
    accent: "#00ff99",
    icon: "💰",
    status: "Ready to build",
  },
  {
    title: "Marketing Rules",
    description:
      "Control discount stacking, rewards, referrals, shipping, and campaign rules.",
    href: "/admin/promotions/rules",
    accent: "#ffcc00",
    icon: "⚙️",
    status: "Ready to build",
  },
  {
    title: "Campaign Reports",
    description:
      "Review campaign revenue, discounts, profit, margins, and product performance.",
    href: "/admin/promotions/reports",
    accent: "#b388ff",
    icon: "📈",
    status: "Coming later",
  },
  {
    title: "Promo Codes",
    description:
      "Manage your existing general promo codes without changing the current system.",
    href: "/admin/promos",
    accent: "#ffffff",
    icon: "🏷️",
    status: "Existing page",
  },
];

export default function PromotionCenterHubPage() {
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function verifyAdmin() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      const email = session?.user?.email;

      setAuthorized(
        Boolean(
          email &&
            email.toLowerCase() ===
              ADMIN_EMAIL.toLowerCase()
        )
      );

      setLoading(false);
    }

    void verifyAdmin();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) {
          return;
        }

        const email = session?.user?.email;

        setAuthorized(
          Boolean(
            email &&
              email.toLowerCase() ===
                ADMIN_EMAIL.toLowerCase()
          )
        );

        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  if (loading) {
    return (
      <main style={styles.page}>
        <section style={styles.loadingCard}>
          Loading Marketing Center...
        </section>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main style={styles.page}>
        <section style={styles.loadingCard}>
          <h1 style={styles.deniedTitle}>
            Access Denied
          </h1>

          <p style={styles.helpText}>
            You must be logged in as the
            administrator.
          </p>

          <Link
            href="/login"
            style={styles.primaryLink}
          >
            Go to Login
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.topBar}>
        <Link
          href="/admin"
          style={styles.backLink}
        >
          ← Back to Admin
        </Link>

        <Link
          href="/admin/dashboard"
          style={styles.dashboardLink}
        >
          Dashboard
        </Link>
      </div>

      <header style={styles.hero}>
        <div>
          <p style={styles.eyebrow}>
            PUGPEP ADMIN
          </p>

          <h1 style={styles.title}>
            Marketing Center
          </h1>

          <p style={styles.subtitle}>
            Manage campaigns, product sales,
            profit planning, discount rules,
            and performance from focused
            sections instead of one crowded
            page.
          </p>
        </div>

        <Link
          href="/admin/promotions/campaigns"
          style={styles.createButton}
        >
          + New Campaign
        </Link>
      </header>

      <section style={styles.notice}>
        <strong style={styles.noticeTitle}>
          Current setup
        </strong>

        <span style={styles.noticeText}>
          Your campaign, referral, pricing,
          and financial-ledger database
          foundations are already in place.
          We are now separating the admin
          interface into smaller pages.
        </span>
      </section>

      <section style={styles.grid}>
        {hubCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            style={{
              ...styles.card,
              borderColor: card.accent,
            }}
          >
            <div style={styles.cardTop}>
              <span
                style={{
                  ...styles.iconBox,
                  borderColor: card.accent,
                  color: card.accent,
                }}
              >
                {card.icon}
              </span>

              <span
                style={{
                  ...styles.statusBadge,
                  color: card.accent,
                  borderColor: card.accent,
                }}
              >
                {card.status}
              </span>
            </div>

            <h2
              style={{
                ...styles.cardTitle,
                color: card.accent,
              }}
            >
              {card.title}
            </h2>

            <p style={styles.cardDescription}>
              {card.description}
            </p>

            <span
              style={{
                ...styles.openLabel,
                color: card.accent,
              }}
            >
              Open section →
            </span>
          </Link>
        ))}
      </section>

      <section style={styles.workflow}>
        <h2 style={styles.sectionTitle}>
          Recommended campaign workflow
        </h2>

        <div style={styles.workflowGrid}>
          <WorkflowStep
            number="1"
            title="Create"
            text="Set the campaign type, discount, dates, stacking rules, and status."
          />

          <WorkflowStep
            number="2"
            title="Assign"
            text="Choose the exact products, dosages, singles, and kits included."
          />

          <WorkflowStep
            number="3"
            title="Simulate"
            text="Review projected profit after product, shipping, packaging, and discounts."
          />

          <WorkflowStep
            number="4"
            title="Activate"
            text="Turn the campaign on only after the profit and margin look safe."
          />
        </div>
      </section>
    </main>
  );
}

function WorkflowStep({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <article style={styles.workflowCard}>
      <span style={styles.stepNumber}>
        {number}
      </span>

      <h3 style={styles.workflowTitle}>
        {title}
      </h3>

      <p style={styles.workflowText}>
        {text}
      </p>
    </article>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "clamp(16px, 3vw, 34px)",
    background:
      "radial-gradient(circle at top right, rgba(255,69,216,.10), transparent 30%), radial-gradient(circle at top left, rgba(0,217,255,.10), transparent 32%), #000000",
    color: "#ffffff",
    fontSize: "16px",
    lineHeight: 1.5,
  },

  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap" as const,
    maxWidth: "1180px",
    margin: "0 auto",
  },

  backLink: {
    color: "#00d9ff",
    textDecoration: "none",
    fontWeight: "bold",
    minHeight: "44px",
    display: "inline-flex",
    alignItems: "center",
  },

  dashboardLink: {
    color: "#dddddd",
    textDecoration: "none",
    border: "1px solid #555555",
    borderRadius: "10px",
    padding: "10px 14px",
    fontWeight: "bold",
  },

  hero: {
    maxWidth: "1180px",
    margin: "28px auto 0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: "24px",
    flexWrap: "wrap" as const,
  },

  eyebrow: {
    margin: 0,
    color: "#888888",
    fontSize: "13px",
    fontWeight: "bold",
    letterSpacing: "1.4px",
  },

  title: {
    margin: "7px 0 10px",
    color: "#ff45d8",
    fontSize: "clamp(34px, 7vw, 54px)",
    lineHeight: 1.05,
  },

  subtitle: {
    maxWidth: "760px",
    margin: 0,
    color: "#c4c4c4",
    fontSize: "clamp(16px, 2vw, 19px)",
    lineHeight: 1.65,
  },

  createButton: {
    minHeight: "52px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "13px 20px",
    borderRadius: "12px",
    background:
      "linear-gradient(90deg, #00b7ff, #ff2fd0)",
    color: "#ffffff",
    textDecoration: "none",
    fontSize: "16px",
    fontWeight: "bold",
    boxShadow:
      "0 10px 30px rgba(255,47,208,.20)",
  },

  notice: {
    maxWidth: "1180px",
    margin: "25px auto 0",
    padding: "16px 18px",
    display: "grid",
    gap: "5px",
    border: "1px solid #2b5962",
    borderRadius: "14px",
    background: "rgba(0,217,255,.06)",
  },

  noticeTitle: {
    color: "#00d9ff",
    fontSize: "16px",
  },

  noticeText: {
    color: "#d4edf2",
    lineHeight: 1.6,
  },

  grid: {
    maxWidth: "1180px",
    margin: "24px auto 0",
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
    gap: "18px",
  },

  card: {
    minHeight: "250px",
    padding: "20px",
    display: "flex",
    flexDirection: "column" as const,
    border: "1px solid",
    borderRadius: "17px",
    background:
      "linear-gradient(145deg, rgba(20,20,20,.96), rgba(7,7,7,.98))",
    color: "#ffffff",
    textDecoration: "none",
    boxShadow: "0 12px 34px rgba(0,0,0,.28)",
  },

  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
  },

  iconBox: {
    width: "48px",
    height: "48px",
    display: "grid",
    placeItems: "center",
    border: "1px solid",
    borderRadius: "13px",
    background: "rgba(255,255,255,.03)",
    fontSize: "24px",
  },

  statusBadge: {
    padding: "6px 9px",
    border: "1px solid",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "bold",
  },

  cardTitle: {
    margin: "22px 0 8px",
    fontSize: "clamp(23px, 4vw, 29px)",
    lineHeight: 1.15,
  },

  cardDescription: {
    margin: 0,
    color: "#bcbcbc",
    fontSize: "16px",
    lineHeight: 1.65,
  },

  openLabel: {
    marginTop: "auto",
    paddingTop: "22px",
    fontSize: "15px",
    fontWeight: "bold",
  },

  workflow: {
    maxWidth: "1180px",
    margin: "28px auto 0",
    padding: "clamp(18px, 3vw, 25px)",
    border: "1px solid #333333",
    borderRadius: "17px",
    background: "rgba(15,15,15,.94)",
  },

  sectionTitle: {
    margin: "0 0 18px",
    color: "#00d9ff",
    fontSize: "clamp(24px, 4vw, 31px)",
  },

  workflowGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(min(100%, 225px), 1fr))",
    gap: "14px",
  },

  workflowCard: {
    padding: "17px",
    border: "1px solid #333333",
    borderRadius: "13px",
    background: "#080808",
  },

  stepNumber: {
    width: "36px",
    height: "36px",
    display: "grid",
    placeItems: "center",
    borderRadius: "50%",
    background:
      "linear-gradient(135deg, #00b7ff, #ff2fd0)",
    color: "#ffffff",
    fontWeight: "bold",
  },

  workflowTitle: {
    margin: "13px 0 6px",
    color: "#ffffff",
    fontSize: "20px",
  },

  workflowText: {
    margin: 0,
    color: "#aaaaaa",
    lineHeight: 1.6,
  },

  loadingCard: {
    maxWidth: "560px",
    margin: "80px auto",
    padding: "25px",
    border: "1px solid #333333",
    borderRadius: "15px",
    background: "#111111",
  },

  deniedTitle: {
    marginTop: 0,
    color: "#ff45d8",
  },

  helpText: {
    color: "#aaaaaa",
  },

  primaryLink: {
    display: "inline-flex",
    minHeight: "48px",
    alignItems: "center",
    padding: "11px 16px",
    borderRadius: "10px",
    background:
      "linear-gradient(90deg, #00b7ff, #ff2fd0)",
    color: "#ffffff",
    textDecoration: "none",
    fontWeight: "bold",
  },
};