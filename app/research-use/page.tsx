"use client";

import Link from "next/link";

export default function ResearchUsePolicyPage() {
  return (
    <main style={page}>
      <div style={container}>
        <section style={hero}>
          <p style={eyebrow}>
            RESEARCH POLICY
          </p>

          <h1 style={title}>
            Research Use Policy
          </h1>

          <p style={subtitle}>
            Standards governing the purchase, handling, interpretation, and
            use of PugPep laboratory research materials.
          </p>
        </section>

        <section style={policyPanel}>
          <p style={sectionEyebrow}>
            INTENDED USE
          </p>

          <h2 style={sectionTitle}>
            Laboratory Research Purposes Only
          </h2>

          <p style={bodyText}>
            Products offered by PugPep are supplied exclusively as laboratory
            research materials for research, analytical, educational, and
            in-vitro applications unless expressly stated otherwise.
          </p>

          <div style={noticeBox}>
            <strong style={noticeTitle}>
              Not for human or veterinary use.
            </strong>

            <p style={noticeText}>
              PugPep products are not intended for ingestion, injection,
              implantation, topical application to humans or animals, clinical
              treatment, diagnostic use, therapeutic use, or any other human
              or veterinary application.
            </p>
          </div>
        </section>

        <section style={classificationPanel}>
          <p style={sectionEyebrow}>
            PRODUCT CLASSIFICATION
          </p>

          <h2 style={sectionTitle}>
            Research Materials, Not Consumer Health Products
          </h2>

          <p style={bodyText}>
            Unless specifically identified otherwise, PugPep products are not
            represented or offered as drugs, medicines, dietary supplements,
            food products, cosmetics, medical devices, veterinary products, or
            products intended to diagnose, treat, cure, mitigate, or prevent
            disease.
          </p>

          <p style={bodyText}>
            Product names, compound identifiers, analytical descriptions, or
            references to published research are provided for laboratory
            identification and scientific context only.
          </p>
        </section>

        <section style={informationPanel}>
          <p style={sectionEyebrow}>
            RESEARCH INFORMATION
          </p>

          <h2 style={sectionTitle}>
            Scientific Information Is Not Medical Advice
          </h2>

          <p style={bodyText}>
            Information appearing on the PugPep website may summarize
            scientific literature, laboratory characteristics, analytical
            documentation, areas of investigation, or other research-oriented
            information.
          </p>

          <p style={bodyText}>
            This information is provided for research and informational
            purposes only and does not constitute medical advice, veterinary
            advice, diagnosis, treatment recommendations, dosing instructions,
            clinical guidance, or claims of therapeutic benefit.
          </p>

          <div style={standardsGrid}>
            <PolicyPoint
              title="No Dosing Guidance"
              text="PugPep does not provide human or veterinary dosing instructions, treatment protocols, or administration guidance."
            />

            <PolicyPoint
              title="No Medical Claims"
              text="Research references and analytical information are not representations that a material is safe, effective, or approved for clinical use."
            />

            <PolicyPoint
              title="No Clinical Consultation"
              text="PugPep customer support is not a substitute for medical, veterinary, legal, regulatory, or institutional research guidance."
            />
          </div>
        </section>

        <section style={researcherPanel}>
          <p style={sectionEyebrow}>
            RESEARCHER RESPONSIBILITY
          </p>

          <h2 style={sectionTitle}>
            Handling, Storage &amp; Compliance
          </h2>

          <p style={bodyText}>
            Customers are responsible for determining whether a product is
            appropriate for their intended research application and for
            ensuring that its purchase, possession, storage, handling, study,
            documentation, and disposal comply with applicable laws,
            regulations, institutional requirements, laboratory procedures,
            and safety standards.
          </p>

          <p style={bodyText}>
            Researchers should use appropriate laboratory controls, protective
            equipment, containment procedures, documentation practices, and
            qualified personnel consistent with the nature of the material and
            the work being performed.
          </p>
        </section>

        <section style={qualityPanel}>
          <p style={sectionEyebrow}>
            ANALYTICAL DOCUMENTATION
          </p>

          <h2 style={sectionTitle}>
            Quality &amp; Testing Information
          </h2>

          <p style={bodyText}>
            Where available, PugPep provides Certificates of Analysis and
            other analytical documentation associated with research
            materials. Testing may include characteristics such as identity,
            purity, quantity, or other laboratory measurements depending on
            the compound and analytical method.
          </p>

          <p style={bodyText}>
            Analytical documentation describes the tested research sample and
            should not be interpreted as evidence of safety, efficacy,
            clinical suitability, therapeutic performance, or regulatory
            approval.
          </p>

          <Link
            href="/quality"
            style={ctaLink}
          >
            View Quality &amp; Testing →
          </Link>
        </section>

        <section style={eligibilityPanel}>
          <p style={sectionEyebrow}>
            CUSTOMER ACKNOWLEDGMENT
          </p>

          <h2 style={sectionTitle}>
            Purchase Represents Research-Use Intent
          </h2>

          <p style={bodyText}>
            By purchasing research materials from PugPep, the customer
            acknowledges that the products are being acquired for legitimate
            laboratory research purposes and agrees not to use, resell,
            represent, or distribute the materials for prohibited human,
            veterinary, therapeutic, diagnostic, or consumer-health purposes.
          </p>

          <p style={bodyText}>
            PugPep reserves the right to decline, cancel, or restrict an order
            when information available to PugPep reasonably indicates that the
            requested transaction may be inconsistent with this Research Use
            Policy or other applicable PugPep policies.
          </p>
        </section>

        <section style={contactPanel}>
          <p style={sectionEyebrow}>
            SUPPORT
          </p>

          <h2 style={sectionTitle}>
            Research Documentation Questions
          </h2>

          <p style={bodyText}>
            For questions about product documentation, Certificates of
            Analysis, or PugPep research-use policies, contact{" "}
            <a
              href="mailto:Support@PugPep.com"
              style={link}
            >
              Support@PugPep.com
            </a>
            .
          </p>

          <div style={footerLinks}>
            <Link
              href="/policies"
              style={link}
            >
              Legal &amp; Policies
            </Link>

            <span style={dot}>
              •
            </span>

            <Link
              href="/quality"
              style={link}
            >
              Quality &amp; Testing
            </Link>

            <span style={dot}>
              •
            </span>

            <Link
              href="/terms"
              style={link}
            >
              Terms &amp; Conditions
            </Link>

            <span style={dot}>
              •
            </span>

            <Link
              href="/"
              style={link}
            >
              Return Home
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function PolicyPoint({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div style={pointCard}>
      <div style={pointIcon}>
        ✓
      </div>

      <div>
        <strong style={pointTitle}>
          {title}
        </strong>

        <p style={pointText}>
          {text}
        </p>
      </div>
    </div>
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
  maxWidth: 1120,
  margin: "0 auto",
};

const hero = {
  maxWidth: 900,
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
    "clamp(44px, 8vw, 68px)",
  letterSpacing: "-.04em",
  textShadow:
    "0 0 26px rgba(255,45,210,.36)",
};

const subtitle = {
  maxWidth: 790,
  margin: "16px auto 0",
  color: "#c6c6ce",
  fontSize: 20,
  lineHeight: 1.7,
};

const policyPanel = {
  marginTop: 34,
  padding:
    "clamp(22px, 4vw, 32px)",
  border:
    "1px solid rgba(0,255,153,.30)",
  borderRadius: 20,
  background:
    "linear-gradient(145deg, rgba(5,14,12,.94), rgba(7,8,12,.96))",
  boxShadow:
    "0 0 24px rgba(0,255,153,.06)",
};

const classificationPanel = {
  marginTop: 28,
  padding:
    "clamp(22px, 4vw, 32px)",
  border:
    "1px solid rgba(255,69,216,.28)",
  borderRadius: 20,
  background:
    "linear-gradient(145deg, rgba(9,7,13,.95), rgba(5,10,14,.94))",
};

const informationPanel = {
  marginTop: 28,
  padding:
    "clamp(22px, 4vw, 32px)",
  border:
    "1px solid rgba(0,217,255,.30)",
  borderRadius: 20,
  background:
    "linear-gradient(145deg, rgba(8,8,12,.95), rgba(15,8,18,.92))",
};

const researcherPanel = {
  marginTop: 28,
  padding:
    "clamp(22px, 4vw, 32px)",
  border:
    "1px solid rgba(255,204,102,.28)",
  borderRadius: 20,
  background:
    "linear-gradient(145deg, rgba(12,10,6,.94), rgba(8,8,12,.96))",
};

const qualityPanel = {
  marginTop: 28,
  padding:
    "clamp(22px, 4vw, 32px)",
  border:
    "1px solid rgba(125,249,255,.28)",
  borderRadius: 20,
  background:
    "linear-gradient(145deg, rgba(5,11,14,.94), rgba(7,8,12,.96))",
};

const eligibilityPanel = {
  marginTop: 28,
  padding:
    "clamp(22px, 4vw, 32px)",
  border:
    "1px solid rgba(255,117,223,.26)",
  borderRadius: 20,
  background:
    "linear-gradient(145deg, rgba(13,7,12,.93), rgba(7,8,12,.96))",
};

const contactPanel = {
  marginTop: 28,
  padding:
    "clamp(22px, 4vw, 32px)",
  border:
    "1px solid rgba(255,255,255,.11)",
  borderRadius: 20,
  background:
    "rgba(7,7,10,.93)",
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
    "clamp(28px, 5vw, 40px)",
};

const bodyText = {
  margin: "14px 0 0",
  color: "#c3c3ca",
  fontSize: 17,
  lineHeight: 1.75,
};

const noticeBox = {
  marginTop: 20,
  padding: 18,
  border:
    "1px solid rgba(255,204,102,.35)",
  borderRadius: 14,
  background:
    "rgba(255,204,102,.05)",
};

const noticeTitle = {
  color: "#ffcc66",
  fontSize: 17,
};

const noticeText = {
  margin: "8px 0 0",
  color: "#c3c3ca",
  lineHeight: 1.7,
};

const standardsGrid = {
  marginTop: 22,
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 14,
};

const pointCard = {
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

const pointIcon = {
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

const pointTitle = {
  color: "#ffffff",
  fontSize: 17,
};

const pointText = {
  margin: "6px 0 0",
  color: "#a9a9b2",
  lineHeight: 1.6,
};

const ctaLink = {
  display: "inline-flex",
  marginTop: 20,
  minHeight: 48,
  padding: "11px 15px",
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

const footerLinks = {
  marginTop: 20,
  display: "flex",
  gap: 10,
  alignItems: "center",
  flexWrap: "wrap" as const,
};

const link = {
  color: "#7df9ff",
  textDecoration: "underline",
};

const dot = {
  color: "#62666d",
};