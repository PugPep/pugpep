"use client";

export default function AboutPage() {
  return (
    <main style={page}>
      <section style={hero}>
        <h1 style={title}>ABOUT PUGPEP</h1>

        <p style={heroText}>
          PUGPEP was founded on one driving principle:
        </p>

        <h2 style={motto}>RESEARCH WITHOUT LIMITS</h2>

        <p style={heroSubtext}>
          Making advanced research materials more accessible, transparent,
          and reliable for independent researchers, educators, laboratories,
          and innovators exploring the next frontier of biological science.
        </p>
      </section>

      <section style={contentBox}>
        <h2 style={sectionTitle}>Our Mission</h2>

        <p style={paragraph}>
          At PUGPEP, we believe scientific exploration should not be limited
          by unnecessary barriers. In a field where advanced research
          materials are often difficult to access or priced beyond reach,
          we chose a different path — one focused on accessibility,
          transparency, consistency, and integrity.
        </p>

        <p style={paragraph}>
          Our goal is to support researchers, laboratories, educators,
          and innovators seeking dependable materials for analytical,
          laboratory, and scientific investigation.
        </p>
      </section>

      <section style={contentBox}>
        <h2 style={sectionTitle}>Research Focus</h2>

        <div style={grid}>
          <InfoCard
            title="Cellular Research"
            text="Exploration of cellular repair, signaling pathways, and structural protein mechanisms."
          />

          <InfoCard
            title="Metabolic & Mitochondrial Studies"
            text="Research involving energy systems, metabolic signaling, and adaptive biological response."
          />

          <InfoCard
            title="Neuropeptide & Cognitive Studies"
            text="Investigation into peptide pathways related to neurobiology and communication systems."
          />

          <InfoCard
            title="Longevity & Resilience"
            text="Research involving biological resilience, tissue support, recovery mechanisms, and adaptive physiology."
          />
        </div>
      </section>

      <section style={contentBox}>
        <h2 style={sectionTitle}>Scientific Integrity</h2>

        <p style={paragraph}>
          Every product distributed by PUGPEP is handled with a commitment
          to consistency, transparency, and quality control.
        </p>

        <div style={grid}>
          <InfoCard
            title="Third-Party Testing"
            text="Independent laboratory COAs help validate identity and purity."
          />

          <InfoCard
            title="Batch Consistency"
            text="Controlled handling and standardized fulfillment procedures."
          />

          <InfoCard
            title="Secure Fulfillment"
            text="Professional packaging, discreet shipping, and dependable processing."
          />

          <InfoCard
            title="Accessibility"
            text="Research materials priced intentionally to support broader participation in scientific exploration."
          />
        </div>
      </section>

      <section style={contentBox}>
        <h2 style={sectionTitle}>Veteran Owned</h2>

        <p style={paragraph}>
          PUGPEP is proudly veteran owned and operated. We believe in
          discipline, accountability, integrity, and supporting those
          committed to pushing boundaries through knowledge, innovation,
          and research.
        </p>
      </section>

      <section style={contentBox}>
        <h2 style={sectionTitle}>Compliance & Research Use Policy</h2>

        <p style={paragraph}>
          All products offered by PUGPEP are intended strictly for
          laboratory, analytical, and research purposes only.
          Products are not intended for human or veterinary use.
        </p>

        <p style={paragraph}>
          Statements made on this website have not been evaluated by the
          U.S. Food and Drug Administration. Products are not intended
          to diagnose, treat, cure, or prevent disease.
        </p>

        <p style={paragraph}>
          PUGPEP is a chemical supplier and is not a compounding pharmacy
          under Section 503A of the Federal Food, Drug, and Cosmetic Act,
          nor an outsourcing facility under Section 503B.
        </p>
      </section>

      <section style={closing}>
        <h2 style={closingTitle}>
          Built For Researchers. Designed For Discovery.
        </h2>

        <p style={closingText}>
          PUGPEP exists to support those who think beyond limitations —
          the curious, the driven, and the innovators pushing into the
          next generation of biological understanding.
        </p>
      </section>
    </main>
  );
}

function InfoCard({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div style={card}>
      <h3 style={{ color: "#00d9ff", marginTop: 0 }}>{title}</h3>

      <p style={{ color: "#ccc", lineHeight: 1.6 }}>
        {text}
      </p>
    </div>
  );
}

const page = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top left, rgba(0,217,255,.16), transparent 35%), radial-gradient(circle at top right, rgba(255,45,210,.18), transparent 35%), #000",
  color: "#fff",
  padding: "50px 18px 80px",
};

const hero = {
  maxWidth: 1100,
  margin: "0 auto 50px",
  textAlign: "center" as const,
};

const title = {
  fontSize: 58,
  color: "#ff45d8",
  marginBottom: 10,
  textShadow: "0 0 25px rgba(255,45,210,.45)",
};

const heroText = {
  fontSize: 22,
  color: "#ddd",
};

const motto = {
  fontSize: 42,
  color: "#00d9ff",
  margin: "18px 0",
  letterSpacing: 2,
};

const heroSubtext = {
  maxWidth: 900,
  margin: "0 auto",
  color: "#ccc",
  lineHeight: 1.8,
  fontSize: 18,
};

const contentBox = {
  maxWidth: 1200,
  margin: "0 auto 30px",
  padding: 28,
  border: "1px solid rgba(255,255,255,.14)",
  borderRadius: 18,
  background: "rgba(0,0,0,.55)",
  backdropFilter: "blur(8px)",
};

const sectionTitle = {
  color: "#ff45d8",
  marginTop: 0,
  marginBottom: 18,
};

const paragraph = {
  color: "#ccc",
  lineHeight: 1.8,
  marginBottom: 18,
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 18,
};

const card = {
  padding: 20,
  border: "1px solid rgba(0,217,255,.18)",
  borderRadius: 16,
  background: "#080808",
  boxShadow: "0 0 20px rgba(0,217,255,.08)",
};

const closing = {
  maxWidth: 1000,
  margin: "60px auto 0",
  textAlign: "center" as const,
};

const closingTitle = {
  color: "#00ff99",
  fontSize: 34,
};

const closingText = {
  color: "#ccc",
  lineHeight: 1.8,
  fontSize: 18,
};