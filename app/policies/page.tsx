"use client";

import Link from "next/link";

type PolicyCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  accent: string;
};

export default function PoliciesPage() {
  return (
    <main style={page}>
      <div style={container}>
        <section style={hero}>
          <p style={eyebrow}>
            PUGPEP POLICY CENTER
          </p>

          <h1 style={title}>
            Legal &amp; Policies
          </h1>

          <p style={subtitle}>
            Central access to PugPep research-use standards, customer terms,
            privacy practices, fulfillment policies, and communication rules.
          </p>

          <p style={updatedText}>
            Last updated: August 22, 2026
          </p>

          <div style={heroStats}>
            <StatCard
              label="Research Standards"
              value="RUO"
              accent="#00d9ff"
            />

            <StatCard
              label="Customer Policies"
              value="8"
              accent="#00ff99"
            />

            <StatCard
              label="Policy Access"
              value="24/7"
              accent="#ff75df"
            />
          </div>
        </section>

        <section style={standardsPanel}>
          <div>
            <p style={sectionEyebrow}>
              OUR APPROACH
            </p>

            <h2 style={sectionTitle}>
              Transparency &amp; Responsible Research Distribution
            </h2>
          </div>

          <p style={bodyText}>
            PugPep supplies laboratory research materials intended exclusively
            for research, analytical, educational, and in-vitro applications.
            This Policy Center provides direct access to the terms,
            research-use standards, privacy practices, shipping information,
            refund rules, communication policies, and customer-service
            guidelines that govern use of the PugPep website and services.
          </p>

          <div style={standardsGrid}>
            <StandardCard
              title="Research Use Focus"
              text="Policies are written to clearly distinguish laboratory research use from medical, clinical, human, or veterinary use."
            />

            <StandardCard
              title="Customer Transparency"
              text="Ordering, fulfillment, refunds, communications, and privacy practices are presented in clear standalone policies."
            />

            <StandardCard
              title="Public Access"
              text="Key policies remain directly accessible for customers, service providers, compliance reviewers, and business partners."
            />
          </div>
        </section>

        <section style={policyPanel}>
          <div style={policyHeader}>
            <div>
              <p style={sectionEyebrow}>
                POLICY LIBRARY
              </p>

              <h2 style={sectionTitle}>
                Browse PugPep Policies
              </h2>
            </div>

            <Link
              href="/"
              style={backButton}
            >
              ← Return Home
            </Link>
          </div>

          <div style={policyGrid}>
            <PolicyCard
              eyebrow="LEGAL"
              title="Terms & Conditions"
              description="Master terms governing website access, customer eligibility, ordering, payments, research-use responsibilities, fulfillment, communications, and related policies."
              href="/terms"
              accent="#ff75df"
            />

            <PolicyCard
              eyebrow="PRIVACY"
              title="Privacy Policy"
              description="How PugPep collects, uses, protects, retains, and shares customer, account, order, technical, and SMS-related information."
              href="/privacy"
              accent="#00d9ff"
            />

            <PolicyCard
              eyebrow="CUSTOMER SERVICE"
              title="Refund & Return Policy"
              description="PugPep's final-sale policy and the process for reviewing damaged, incorrect, incomplete, or verified fulfillment-error orders."
              href="/refund-policy"
              accent="#00ff99"
            />

            <PolicyCard
              eyebrow="FULFILLMENT"
              title="Shipping & Delivery Policy"
              description="Order preparation, shipping-address responsibilities, carrier transit, tracking updates, delivery expectations, and shipment-issue procedures."
              href="/shipping-policy"
              accent="#7df9ff"
            />

            <PolicyCard
              eyebrow="RESEARCH"
              title="Research Use Policy"
              description="Standards governing laboratory research materials, customer research-use responsibilities, analytical information, and the prohibition on human or veterinary use."
              href="/research-use"
              accent="#ffcc66"
            />

            <PolicyCard
              eyebrow="COMMUNICATIONS"
              title="SMS Terms"
              description="Terms for optional PugPep Order Updates, including checkout opt-in, message frequency, rates, STOP, HELP, privacy, and carrier-delivery disclosures."
              href="/sms-terms"
              accent="#00ff99"
            />

            <PolicyCard
              eyebrow="QUALITY"
              title="Quality & Testing"
              description="Available third-party analytical documentation and Certificates of Analysis organized by research compound."
              href="/quality"
              accent="#00d9ff"
            />

            <PolicyCard
              eyebrow="SUPPORT"
              title="Contact PugPep"
              description="Customer and research support for questions about orders, documentation, accounts, shipping, SMS, and PugPep policies."
              href="mailto:Support@PugPep.com"
              accent="#ff75df"
            />
          </div>
        </section>

        <section style={researchPanel}>
          <p style={sectionEyebrow}>
            RESEARCH USE NOTICE
          </p>

          <h2 style={researchTitle}>
            Laboratory Research Materials Only
          </h2>

          <p style={bodyText}>
            PugPep products are intended for laboratory research purposes only.
            They are not intended for human or veterinary use and are not
            represented as drugs, medicines, dietary supplements, food
            products, cosmetics, medical devices, veterinary products, or
            products intended to diagnose, treat, cure, mitigate, or prevent
            disease.
          </p>

          <p style={bodyText}>
            Information provided by PugPep is for research and informational
            purposes and does not constitute medical advice, dosing guidance,
            treatment recommendations, or claims of therapeutic benefit.
          </p>
        </section>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div
      style={{
        ...statCard,
        borderColor:
          `${accent}55`,
        boxShadow:
          `0 0 18px ${accent}18`,
      }}
    >
      <span
        style={{
          ...statLabel,
          color: accent,
        }}
      >
        {label}
      </span>

      <strong style={statValue}>
        {value}
      </strong>
    </div>
  );
}

function StandardCard({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div style={standardCard}>
      <div style={standardIcon}>
        ✓
      </div>

      <div>
        <strong style={standardTitle}>
          {title}
        </strong>

        <p style={standardText}>
          {text}
        </p>
      </div>
    </div>
  );
}

function PolicyCard({
  eyebrow: cardEyebrow,
  title: cardTitle,
  description,
  href,
  accent,
}: PolicyCardProps) {
  return (
    <Link
      href={href}
      style={{
        ...policyCard,
        borderColor:
          `${accent}40`,
        boxShadow:
          `0 0 20px ${accent}0d`,
      }}
    >
      <span
        style={{
          ...policyEyebrow,
          color: accent,
        }}
      >
        {cardEyebrow}
      </span>

      <h3 style={policyTitle}>
        {cardTitle}
      </h3>

      <p style={policyText}>
        {description}
      </p>

      <span
        style={{
          ...policyLink,
          color: accent,
        }}
      >
        View Policy →
      </span>
    </Link>
  );
}

const page = {
  minHeight: "100vh",
  padding:
    "clamp(28px, 6vw, 72px) clamp(18px, 4vw, 34px)",
  background:
    "radial-gradient(circle at 10% 0%, rgba(0,217,255,.14), transparent 30%), radial-gradient(circle at 90% 0%, rgba(255,45,210,.16), transparent 31%), radial-gradient(circle at 50% 100%, rgba(0,255,153,.06), transparent 36%), #000",
  color: "#ffffff",
  fontSize: 16,
};

const container = {
  width: "100%",
  maxWidth: 1320,
  margin: "0 auto",
};

const hero = {
  maxWidth: 980,
  margin: "0 auto",
  textAlign: "center" as const,
};

const eyebrow = {
  margin: 0,
  color: "#00d9ff",
  fontSize: 13,
  fontWeight: 900,
  letterSpacing: ".16em",
};

const title = {
  margin: "10px 0 0",
  color: "#ff45d8",
  fontSize:
    "clamp(46px, 8vw, 72px)",
  letterSpacing: "-.04em",
  textShadow:
    "0 0 26px rgba(255,45,210,.36)",
};

const subtitle = {
  maxWidth: 780,
  margin: "16px auto 0",
  color: "#c6c6ce",
  fontSize: 20,
  lineHeight: 1.7,
};

const updatedText = {
  margin: "12px 0 0",
  color: "#85858e",
  fontSize: 13,
};

const heroStats = {
  marginTop: 28,
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 14,
};

const statCard = {
  padding: 20,
  display: "grid",
  gap: 8,
  border: "1px solid",
  borderRadius: 16,
  background:
    "linear-gradient(145deg, rgba(12,12,17,.94), rgba(6,6,9,.95))",
};

const statLabel = {
  fontSize: 13,
  fontWeight: 900,
  letterSpacing: ".08em",
  textTransform:
    "uppercase" as const,
};

const statValue = {
  fontSize: 34,
};

const standardsPanel = {
  marginTop: 34,
  padding:
    "clamp(22px, 4vw, 32px)",
  border:
    "1px solid rgba(0,217,255,.30)",
  borderRadius: 20,
  background:
    "linear-gradient(145deg, rgba(8,8,12,.95), rgba(15,8,18,.92))",
  boxShadow:
    "0 0 24px rgba(0,217,255,.07)",
};

const sectionEyebrow = {
  margin: 0,
  color: "#00d9ff",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: ".14em",
};

const sectionTitle = {
  margin: "7px 0 0",
  color: "#7df9ff",
  fontSize:
    "clamp(30px, 5vw, 40px)",
};

const bodyText = {
  margin: "14px 0 0",
  color: "#c3c3ca",
  fontSize: 17,
  lineHeight: 1.75,
};

const standardsGrid = {
  marginTop: 22,
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 14,
};

const standardCard = {
  padding: 17,
  display: "grid",
  gridTemplateColumns:
    "38px minmax(0, 1fr)",
  gap: 12,
  border:
    "1px solid rgba(255,255,255,.10)",
  borderRadius: 13,
  background:
    "rgba(0,0,0,.25)",
};

const standardIcon = {
  width: 34,
  height: 34,
  display: "grid",
  placeItems: "center",
  border:
    "1px solid rgba(0,255,153,.42)",
  borderRadius: 999,
  background:
    "rgba(0,255,153,.08)",
  color: "#00ff99",
  fontWeight: 900,
};

const standardTitle = {
  color: "#ffffff",
  fontSize: 17,
};

const standardText = {
  margin: "6px 0 0",
  color: "#a9a9b2",
  lineHeight: 1.6,
};

const policyPanel = {
  marginTop: 28,
  padding:
    "clamp(22px, 4vw, 30px)",
  border:
    "1px solid rgba(255,69,216,.28)",
  borderRadius: 20,
  background:
    "linear-gradient(145deg, rgba(9,7,13,.95), rgba(5,10,14,.94))",
  boxShadow:
    "0 0 24px rgba(255,69,216,.06)",
};

const policyHeader = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 16,
  flexWrap: "wrap" as const,
};

const backButton = {
  minHeight: 48,
  padding: "11px 15px",
  display: "inline-flex",
  alignItems: "center",
  border:
    "1px solid rgba(0,217,255,.48)",
  borderRadius: 10,
  background:
    "rgba(0,217,255,.06)",
  color: "#7df9ff",
  fontSize: 15,
  fontWeight: 900,
  textDecoration: "none",
};

const policyGrid = {
  marginTop: 22,
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
  gap: 16,
};

const policyCard = {
  minHeight: 230,
  padding: 20,
  display: "flex",
  flexDirection: "column" as const,
  border: "1px solid",
  borderRadius: 16,
  background:
    "rgba(0,0,0,.27)",
  color: "#ffffff",
  textDecoration: "none",
};

const policyEyebrow = {
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: ".13em",
};

const policyTitle = {
  margin: "10px 0 0",
  color: "#ffffff",
  fontSize: 23,
};

const policyText = {
  margin: "10px 0 0",
  color: "#a8a8b0",
  fontSize: 15,
  lineHeight: 1.6,
};

const policyLink = {
  marginTop: "auto",
  paddingTop: 18,
  fontSize: 14,
  fontWeight: 900,
};

const researchPanel = {
  marginTop: 28,
  padding:
    "clamp(22px, 4vw, 30px)",
  border:
    "1px solid rgba(0,255,153,.28)",
  borderRadius: 20,
  background:
    "linear-gradient(145deg, rgba(5,14,12,.92), rgba(7,8,12,.96))",
  boxShadow:
    "0 0 24px rgba(0,255,153,.05)",
};

const researchTitle = {
  margin: "7px 0 0",
  color: "#00ff99",
  fontSize:
    "clamp(28px, 5vw, 38px)",
};