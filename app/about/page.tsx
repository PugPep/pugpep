"use client";

export default function AboutPage() {
  return (
    <main style={page}>
      <style>{responsiveStyle}</style>

      <div style={container}>
        <section style={hero}>
          <p style={eyebrow}>
            ABOUT PUGPEP
          </p>

          <h1 style={title}>
            Research Without Limits
          </h1>

          <p style={heroText}>
            PugPep was founded to make advanced research materials more accessible, transparent, and dependable for independent researchers, educators, laboratories, and innovators.
          </p>

          <div style={heroGrid}>
            <HeroCard
              label="OUR PURPOSE"
              value="Access"
              text="Reduce unnecessary barriers to scientific exploration."
              accent="#00d9ff"
            />

            <HeroCard
              label="OUR STANDARD"
              value="Transparency"
              text="Provide clearer documentation, testing access, and product information."
              accent="#ff75df"
            />

            <HeroCard
              label="OUR COMMITMENT"
              value="Consistency"
              text="Support dependable research workflows through reliable handling and fulfillment."
              accent="#00ff99"
            />
          </div>
        </section>

        <section style={sectionPanel}>
          <SectionHeader
            eyebrow="OUR MISSION"
            title="Built to Support Discovery"
          />

          <div style={twoColumn}>
            <p style={paragraph}>
              At PugPep, we believe scientific exploration should not be limited by unnecessary barriers. In a field where advanced research materials are often difficult to access or priced beyond reach, we chose a different path—one centered on accessibility, transparency, consistency, and integrity.
            </p>

            <p style={paragraph}>
              Our goal is to support researchers, laboratories, educators, and innovators seeking dependable materials for analytical, laboratory, and scientific investigation.
            </p>
          </div>
        </section>

        <section style={sectionPanel}>
          <SectionHeader
            eyebrow="RESEARCH"
            title="Areas of Scientific Focus"
          />

          <div style={cardGrid}>
            <InfoCard
              number="01"
              title="Cellular Discovery"
              text="Exploration of cellular shifting, signaling pathways, and structural protein mechanisms."
              accent="#00d9ff"
            />

            <InfoCard
              number="02"
              title="Metabolic & Mitochondrial Studies"
              text="Research involving energy systems, metabolic pathway communication, and adaptive biological response."
              accent="#00ff99"
            />

            <InfoCard
              number="03"
              title="Neuropeptide Research Tools"
              text="Investigation into peptide pathways related to neurobiology and communication systems."
              accent="#ff75df"
            />

            <InfoCard
              number="04"
              title="Cellular Resilience & Aging"
              text="Research involving biological resilience, cellular and tissue biology, repair and maintenance pathways, and adaptive stress responses."
              accent="#ffcc00"
            />
          </div>
        </section>

        <section style={sectionPanel}>
          <SectionHeader
            eyebrow="QUALITY"
            title="Scientific Integrity"
          />

          <p style={introText}>
            Every product distributed by PugPep is handled with a commitment to consistency, transparency, and quality control.
          </p>

          <div style={cardGrid}>
            <InfoCard
              number="A"
              title="Third-Party Testing"
              text="Independent laboratory COAs help validate identity and purity."
              accent="#00d9ff"
            />

            <InfoCard
              number="B"
              title="Batch Consistency"
              text="Controlled handling and standardized fulfillment procedures support reliable research workflows."
              accent="#00ff99"
            />

            <InfoCard
              number="C"
              title="Secure Fulfillment"
              text="Professional packaging, dependable processing, and timely shipping."
              accent="#ff75df"
            />

            <InfoCard
              number="D"
              title="Accessibility"
              text="Research materials are priced intentionally to support broader participation in scientific exploration."
              accent="#ffcc00"
            />
          </div>
        </section>

        <section className="veteran-panel" style={veteranPanel}>
          <div style={veteranBadge}>
            VETERAN OWNED
          </div>

          <div>
            <p style={sectionEyebrow}>
              SERVICE-DRIVEN VALUES
            </p>

            <h2 style={sectionTitle}>
              Discipline. Accountability. Integrity.
            </h2>

            <p style={paragraph}>
              PugPep is proudly veteran owned and operated. We believe in discipline, accountability, integrity, and supporting those committed to pushing boundaries through knowledge, innovation, and research.
            </p>
          </div>
        </section>

        <section style={compliancePanel}>
          <SectionHeader
            eyebrow="COMPLIANCE"
            title="Research Use Policy"
          />

          <div style={complianceGrid}>
            <ComplianceCard
              title="Research Use Only"
              text="All products offered by PugPep are intended strictly for laboratory, analytical, and research purposes only. Products are not intended for human or veterinary use."
            />

            <ComplianceCard
              title="Regulatory Statement"
              text="Statements made on this website have not been evaluated by the U.S. Food and Drug Administration. Products are not intended to diagnose, treat, cure, or prevent disease."
            />

            <ComplianceCard
              title="Supplier Classification"
              text="PugPep is a chemical supplier and is not a compounding pharmacy under Section 503A of the Federal Food, Drug, and Cosmetic Act, nor an outsourcing facility under Section 503B."
            />
          </div>
        </section>

        <section style={closing}>
          <p style={closingEyebrow}>
            BUILT FOR RESEARCHERS
          </p>

          <h2 style={closingTitle}>
            Designed for Discovery
          </h2>

          <p style={closingText}>
            PugPep exists to support the curious, the driven, and the innovators pushing into the next generation of biological understanding.
          </p>
        </section>
      </div>
    </main>
  );
}

function SectionHeader({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div style={sectionHeader}>
      <p style={sectionEyebrow}>
        {eyebrow}
      </p>

      <h2 style={sectionTitle}>
        {title}
      </h2>
    </div>
  );
}

function HeroCard({
  label,
  value,
  text,
  accent,
}: {
  label: string;
  value: string;
  text: string;
  accent: string;
}) {
  return (
    <div
      style={{
        ...heroCard,
        borderColor: `${accent}55`,
        boxShadow: `0 0 20px ${accent}14`,
      }}
    >
      <span
        style={{
          ...heroCardLabel,
          color: accent,
        }}
      >
        {label}
      </span>

      <strong style={heroCardValue}>
        {value}
      </strong>

      <p style={heroCardText}>
        {text}
      </p>
    </div>
  );
}

function InfoCard({
  number,
  title,
  text,
  accent,
}: {
  number: string;
  title: string;
  text: string;
  accent: string;
}) {
  return (
    <article
      style={{
        ...infoCard,
        borderColor: `${accent}38`,
      }}
    >
      <span
        style={{
          ...infoNumber,
          color: accent,
          borderColor: `${accent}55`,
          background: `${accent}10`,
        }}
      >
        {number}
      </span>

      <h3 style={infoTitle}>
        {title}
      </h3>

      <p style={infoText}>
        {text}
      </p>
    </article>
  );
}

function ComplianceCard({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <article style={complianceCard}>
      <h3 style={complianceTitle}>
        {title}
      </h3>

      <p style={complianceText}>
        {text}
      </p>
    </article>
  );
}

const page = {
  minHeight: "100vh",
  padding:
    "clamp(34px, 7vw, 80px) clamp(18px, 4vw, 34px)",
  background:
    "radial-gradient(circle at 8% 0%, rgba(0,217,255,.15), transparent 30%), radial-gradient(circle at 92% 0%, rgba(255,45,210,.17), transparent 32%), radial-gradient(circle at 50% 100%, rgba(0,255,153,.06), transparent 38%), #000",
  color: "#ffffff",
  fontSize: 16,
};

const container = {
  width: "100%",
  maxWidth: 1320,
  margin: "0 auto",
};

const hero = {
  maxWidth: 1080,
  margin: "0 auto",
  textAlign: "center" as const,
};

const eyebrow = {
  margin: 0,
  color: "#00d9ff",
  fontSize: 13,
  fontWeight: 900,
  letterSpacing: ".17em",
};

const title = {
  margin: "12px 0 0",
  color: "#ff45d8",
  fontSize:
    "clamp(48px, 9vw, 80px)",
  letterSpacing: "-.045em",
  textShadow:
    "0 0 28px rgba(255,45,210,.38)",
};

const heroText = {
  maxWidth: 860,
  margin: "18px auto 0",
  color: "#c8c8cf",
  fontSize: 20,
  lineHeight: 1.75,
};

const heroGrid = {
  marginTop: 30,
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(230px, 1fr))",
  gap: 15,
};

const heroCard = {
  padding: 22,
  display: "grid",
  gap: 8,
  border: "1px solid",
  borderRadius: 17,
  background:
    "linear-gradient(145deg, rgba(12,12,17,.94), rgba(6,6,9,.95))",
};

const heroCardLabel = {
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: ".12em",
};

const heroCardValue = {
  fontSize: 29,
};

const heroCardText = {
  margin: 0,
  color: "#a9a9b2",
  lineHeight: 1.6,
};

const sectionPanel = {
  marginTop: 28,
  padding:
    "clamp(22px, 4vw, 32px)",
  border:
    "1px solid rgba(0,217,255,.28)",
  borderRadius: 20,
  background:
    "linear-gradient(145deg, rgba(8,8,12,.95), rgba(15,8,18,.92))",
  boxShadow:
    "0 0 24px rgba(0,217,255,.06)",
};

const sectionHeader = {
  marginBottom: 18,
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
  color: "#ff75df",
  fontSize:
    "clamp(30px, 5vw, 42px)",
};

const twoColumn = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 22,
};

const paragraph = {
  margin: 0,
  color: "#c7c7ce",
  fontSize: 17,
  lineHeight: 1.8,
};

const introText = {
  maxWidth: 900,
  margin: "0 0 22px",
  color: "#c7c7ce",
  fontSize: 17,
  lineHeight: 1.8,
};

const cardGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(250px, 1fr))",
  gap: 16,
};

const infoCard = {
  padding: 20,
  display: "grid",
  gap: 12,
  border: "1px solid",
  borderRadius: 16,
  background:
    "rgba(0,0,0,.28)",
};

const infoNumber = {
  width: 42,
  height: 42,
  display: "grid",
  placeItems: "center",
  border: "1px solid",
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 900,
};

const infoTitle = {
  margin: 0,
  color: "#ffffff",
  fontSize: 21,
};

const infoText = {
  margin: 0,
  color: "#aaaab3",
  lineHeight: 1.7,
};

const veteranPanel = {
  marginTop: 28,
  padding:
    "clamp(22px, 4vw, 32px)",
  display: "grid",
  gridTemplateColumns:
    "190px minmax(0, 1fr)",
  gap: 24,
  alignItems: "center",
  border:
    "1px solid rgba(0,255,153,.32)",
  borderRadius: 20,
  background:
    "linear-gradient(135deg, rgba(0,255,153,.08), rgba(0,217,255,.05), rgba(255,69,216,.06))",
};

const veteranBadge = {
  minHeight: 140,
  display: "grid",
  placeItems: "center",
  padding: 18,
  border:
    "1px solid rgba(0,255,153,.44)",
  borderRadius: 16,
  background:
    "rgba(0,255,153,.07)",
  color: "#00ff99",
  textAlign: "center" as const,
  fontSize: 22,
  fontWeight: 900,
  letterSpacing: ".08em",
};

const compliancePanel = {
  marginTop: 28,
  padding:
    "clamp(22px, 4vw, 32px)",
  border:
    "1px solid rgba(255,204,0,.28)",
  borderRadius: 20,
  background:
    "linear-gradient(145deg, rgba(12,10,4,.94), rgba(8,8,12,.95))",
};

const complianceGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 16,
};

const complianceCard = {
  padding: 20,
  border:
    "1px solid rgba(255,255,255,.10)",
  borderRadius: 15,
  background:
    "rgba(0,0,0,.25)",
};

const complianceTitle = {
  margin: 0,
  color: "#ffcc00",
  fontSize: 20,
};

const complianceText = {
  margin: "10px 0 0",
  color: "#b7b7bf",
  lineHeight: 1.75,
};

const closing = {
  maxWidth: 980,
  margin:
    "clamp(42px, 8vw, 80px) auto 0",
  textAlign: "center" as const,
};

const closingEyebrow = {
  margin: 0,
  color: "#00ff99",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: ".16em",
};

const closingTitle = {
  margin: "10px 0 0",
  color: "#7df9ff",
  fontSize:
    "clamp(36px, 6vw, 54px)",
};

const closingText = {
  maxWidth: 760,
  margin: "16px auto 0",
  color: "#c5c5cc",
  fontSize: 19,
  lineHeight: 1.75,
};

const responsiveStyle = `
  @media (max-width: 760px) {
    .veteran-panel {
      grid-template-columns: minmax(0, 1fr) !important;
    }
  }
`;