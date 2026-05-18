"use client";

export default function TermsPage() {
  return (
    <main style={page}>
      <section style={hero}>
        <h1 style={title}>Terms & Conditions</h1>

        <p style={heroText}>
          Research Use Agreement, Liability Waiver, and Product Use Policy
        </p>
      </section>

      <Section
        title="1. Research Use Only"
        text={[
          "All products distributed by PUGPEP are sold strictly for laboratory, analytical, educational, and scientific research purposes only.",
          "Products are not intended for human or veterinary consumption, therapeutic use, diagnostic application, or medical treatment under any circumstances.",
          "By purchasing from PUGPEP, the customer acknowledges that all materials are investigational research compounds intended only for qualified handling and lawful scientific use.",
        ]}
      />

      <Section
        title="2. Customer Responsibility"
        text={[
          "Customers are solely responsible for proper handling, storage, preparation, reconstitution, testing, and laboratory use of all materials purchased.",
          "PUGPEP assumes no responsibility for misuse, mishandling, improper storage, unauthorized application, or unlawful use of products after delivery.",
        ]}
      />

      <Section
        title="3. Product Quality & Testing"
        text={[
          "PUGPEP is committed to quality, consistency, and transparency.",
          "Products may include third-party analytical testing, including identity and purity verification where applicable.",
          "No warranties are provided regarding experimental outcomes, research results, or suitability for any specific purpose.",
        ]}
      />

      <Section
        title="4. Vacuum Seal & Lyophilized Appearance"
        text={[
          "Variations in vacuum pressure, cosmetic appearance, cracked pucks, fragmented lyophilized material, or visual inconsistencies do not indicate contamination, impurity, or product failure.",
          "Shipping vibration, temperature fluctuations, pressure changes, and compound-specific characteristics may alter cosmetic appearance without affecting product integrity.",
        ]}
      />

      <Section
        title="5. Reconstitution & Solvent Responsibility"
        text={[
          "Research compounds are sensitive to pH, solvent quality, temperature, and handling technique.",
          "Customers assume full responsibility for all reconstitution methods, solvent selection, dilution practices, and storage conditions.",
          "PUGPEP is not liable for degradation, oxidation, precipitation, aggregation, or instability resulting from post-delivery handling.",
        ]}
      />

      <Section
        title="6. No Returns / Refund Policy"
        text={[
          "Due to the sensitive nature of research materials and inability to verify post-delivery handling conditions, all sales are final.",
          "PUGPEP does not accept returns, exchanges, or refunds once products have been delivered.",
        ]}
      />

      <Section
        title="7. Shipping & Risk of Loss"
        text={[
          "Risk of loss transfers to the customer once an order is released to the shipping carrier.",
          "PUGPEP is not responsible for carrier delays, customs holds, seizures, delivery issues, weather disruptions, or third-party shipping complications.",
        ]}
      />

      <Section
        title="8. Cryptocurrency & Alternative Payments"
        text={[
          "Cryptocurrency transactions are final and irreversible.",
          "Customers are solely responsible for verifying wallet addresses, networks, token selection, and payment accuracy before sending funds.",
          "PUGPEP is not liable for lost or misdirected cryptocurrency transactions.",
        ]}
      />

      <Section
        title="9. Limitation of Liability"
        text={[
          "To the maximum extent permitted by law, PUGPEP shall not be liable for any direct, indirect, incidental, consequential, or special damages related to the purchase, possession, handling, or use of any products.",
          "Customers agree to indemnify and hold harmless PUGPEP, its owners, affiliates, operators, and partners from any claims arising from misuse or unlawful application of products.",
        ]}
      />

      <Section
        title="10. Compliance & Regulatory Statement"
        text={[
          "Statements made on this website have not been evaluated by the U.S. Food and Drug Administration.",
          "Products offered by PUGPEP are not intended to diagnose, treat, cure, or prevent disease.",
          "PUGPEP is a research material supplier and is not a compounding pharmacy under Section 503A of the Federal Food, Drug, and Cosmetic Act, nor an outsourcing facility under Section 503B.",
        ]}
      />

      <Section
        title="11. Acceptance of Terms"
        text={[
          "By purchasing, accessing, or using any product sold by PUGPEP, the customer acknowledges that they have read, understood, and agreed to these Terms & Conditions in full.",
        ]}
      />

      <footer style={footer}>
        <p style={{ color: "#00d9ff", fontWeight: "bold" }}>
          PUGPEP © 2026 All Rights Reserved
        </p>
      </footer>
    </main>
  );
}

function Section({
  title,
  text,
}: {
  title: string;
  text: string[];
}) {
  return (
    <section style={section}>
      <h2 style={sectionTitle}>{title}</h2>

      {text.map((paragraph, index) => (
        <p key={index} style={paragraphStyle}>
          {paragraph}
        </p>
      ))}
    </section>
  );
}

const page = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top left, rgba(0,217,255,.14), transparent 35%), radial-gradient(circle at top right, rgba(255,45,210,.18), transparent 35%), #000",
  color: "#fff",
  padding: "50px 18px 80px",
};

const hero = {
  maxWidth: 1100,
  margin: "0 auto 45px",
  textAlign: "center" as const,
};

const title = {
  fontSize: 58,
  color: "#ff45d8",
  marginBottom: 10,
  textShadow: "0 0 25px rgba(255,45,210,.45)",
};

const heroText = {
  color: "#ccc",
  fontSize: 20,
};

const section = {
  maxWidth: 1150,
  margin: "0 auto 24px",
  padding: 28,
  border: "1px solid rgba(255,255,255,.12)",
  borderRadius: 18,
  background: "rgba(0,0,0,.55)",
  backdropFilter: "blur(8px)",
};

const sectionTitle = {
  color: "#00d9ff",
  marginTop: 0,
  marginBottom: 16,
};

const paragraphStyle = {
  color: "#ccc",
  lineHeight: 1.8,
  marginBottom: 14,
};

const footer = {
  textAlign: "center" as const,
  marginTop: 50,
};