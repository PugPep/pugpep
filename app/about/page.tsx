"use client";

import Link from "next/link";

export default function AboutPage() {
  return (
    <main style={page}>
      <style>{responsiveStyle}</style>

      <div style={container}>
        <section style={hero}>
          <div style={heroGlowOne} />
          <div style={heroGlowTwo} />

          <div style={heroContent}>
            <p style={eyebrow}>ABOUT PUGPEP</p>

            <h1 style={title}>
              Research Without Limits.
              <span style={titleAccent}> One Breakthrough at a Time.</span>
            </h1>

            <p style={heroText}>
              PugPep was built to provide researchers, laboratories,
              educators, and innovators with dependable research materials,
              clearer documentation, responsive support, and a higher standard
              of service.
            </p>

            <div className="hero-actions" style={heroActions}>
              <Link href="/" style={primaryButton}>
                EXPLORE PRODUCTS
              </Link>

              <Link href="/quality" style={secondaryButton}>
                QUALITY &amp; TESTING
              </Link>
            </div>

            <div style={heroGrid}>
              <HeroCard
                label="OUR PURPOSE"
                value="Access"
                text="Make dependable research materials easier to access without sacrificing standards."
                accent="#00d9ff"
              />

              <HeroCard
                label="OUR STANDARD"
                value="Transparency"
                text="Provide clearer product information, testing access, and supporting documentation."
                accent="#ff75df"
              />

              <HeroCard
                label="OUR COMMITMENT"
                value="Consistency"
                text="Support dependable research workflows through careful handling and fulfillment."
                accent="#00ff99"
              />

              <HeroCard
                label="OUR DIFFERENCE"
                value="Human Support"
                text="Real support from people who care about getting the details right."
                accent="#ffcc00"
              />
            </div>
          </div>
        </section>

        <section style={storyPanel}>
          <div style={storyCopy}>
            <p style={sectionEyebrow}>WHY PUGPEP EXISTS</p>

            <h2 style={storyTitle}>
              A Research Supplier Built Around Better Standards
            </h2>

            <p style={paragraph}>
              PugPep was founded on a simple idea: researchers should not have
              to choose between accessibility, transparency, dependable
              service, and quality-focused sourcing.
            </p>

            <p style={paragraph}>
              We created PugPep to support independent researchers,
              laboratories, educators, and innovators who value clear product
              information, responsive communication, documented quality
              practices, and reliable fulfillment.
            </p>
          </div>

          <div style={storyStatement}>
            <span style={statementEyebrow}>OUR APPROACH</span>

            <strong style={statementText}>
              Better research starts with better standards.
            </strong>

            <p style={statementBody}>
              Every decision we make is centered on consistency,
              accountability, transparency, and support.
            </p>
          </div>
        </section>

        <section style={sectionPanel}>
          <SectionHeader
            eyebrow="WHAT WE STAND FOR"
            title="Four Principles That Guide PugPep"
          />

          <div style={cardGrid}>
            <InfoCard
              number="01"
              title="Quality Focus"
              text="We prioritize documented quality practices, testing access, and consistency across the products we offer."
              accent="#00d9ff"
            />

            <InfoCard
              number="02"
              title="Transparency"
              text="Researchers should be able to understand what they are purchasing and access supporting product information."
              accent="#ff75df"
            />

            <InfoCard
              number="03"
              title="Accessibility"
              text="We work to make advanced research materials more accessible while maintaining responsible standards."
              accent="#00ff99"
            />

            <InfoCard
              number="04"
              title="Reliable Support"
              text="Responsive communication, dependable fulfillment, and accountable service are part of the research experience."
              accent="#ffcc00"
            />
          </div>
        </section>

        <section style={qualityPanel}>
          <div style={qualityHeader}>
            <div>
              <p style={sectionEyebrow}>QUALITY &amp; DOCUMENTATION</p>

              <h2 style={sectionTitle}>
                Built Around Verifiable Quality
              </h2>
            </div>

            <Link href="/quality" style={qualityLink}>
              EXPLORE QUALITY &amp; TESTING →
            </Link>
          </div>

          <p style={introText}>
            PugPep approaches product quality with an emphasis on
            documentation, independent testing access, batch consistency,
            careful handling, and dependable fulfillment.
          </p>

          <div style={qualityGrid}>
            <QualityCard
              title="Third-Party Testing"
              text="Independent laboratory testing and COAs help support identity and purity documentation."
              accent="#00d9ff"
            />

            <QualityCard
              title="Batch Documentation"
              text="Product records and available testing documentation support clearer research procurement decisions."
              accent="#00ff99"
            />

            <QualityCard
              title="Careful Handling"
              text="Standardized handling and fulfillment practices are designed to support consistency from storage through shipment."
              accent="#ff75df"
            />

            <QualityCard
              title="Tracked Fulfillment"
              text="Orders are processed with professional packaging and tracked delivery whenever available."
              accent="#ffcc00"
            />
          </div>
        </section>

        <section style={sectionPanel}>
          <SectionHeader
            eyebrow="RESEARCH"
            title="Areas of Scientific Focus"
          />

          <p style={introText}>
            Our catalog supports a range of laboratory and analytical
            research interests across peptide, cellular, metabolic, and
            biological systems.
          </p>

          <div style={cardGrid}>
            <InfoCard
              number="A"
              title="Cellular Signaling"
              text="Research involving cellular signaling, molecular pathways, receptor interactions, and structural protein mechanisms."
              accent="#00d9ff"
            />

            <InfoCard
              number="B"
              title="Metabolic & Mitochondrial Research"
              text="Investigation of energy systems, metabolic communication, mitochondrial function, and adaptive biological responses."
              accent="#00ff99"
            />

            <InfoCard
              number="C"
              title="Neuropeptide Research"
              text="Laboratory investigation of peptide pathways associated with neurobiology, signaling, and biological communication systems."
              accent="#ff75df"
            />

            <InfoCard
              number="D"
              title="Cellular Resilience & Aging"
              text="Research involving cellular resilience, tissue biology, repair and maintenance pathways, and adaptive stress responses."
              accent="#ffcc00"
            />
          </div>
        </section>

        <section className="veteran-panel" style={veteranPanel}>
          <div style={veteranVisual}>
            <div style={veteranFlagLine}>
              <span>★</span>
              <span>★</span>
              <span>★</span>
            </div>

            <div style={veteranBadge}>VETERAN OWNED</div>

            <p style={veteranSubtext}>
              Service-driven values brought into every part of the business.
            </p>
          </div>

          <div>
            <p style={sectionEyebrow}>SERVICE-DRIVEN VALUES</p>

            <h2 style={sectionTitle}>
              Discipline. Accountability. Integrity.
            </h2>

            <p style={paragraph}>
              PugPep is proudly veteran owned and operated. The same values
              that matter in service—discipline, accountability,
              responsibility, and attention to detail—shape how we approach
              customer support, product handling, fulfillment, and business
              operations.
            </p>

            <p style={{ ...paragraph, marginTop: 14 }}>
              Our goal is not simply to provide research materials. It is to
              build a company researchers can rely on for straightforward
              communication, dependable service, and higher operating
              standards.
            </p>
          </div>
        </section>

        <section style={supportPanel}>
          <div style={supportHeader}>
            <p style={sectionEyebrow}>MORE THAN A SUPPLIER</p>

            <h2 style={sectionTitle}>
              Research Support Beyond the Product
            </h2>

            <p style={introText}>
              The experience surrounding an order matters too. PugPep is
              designed around responsive communication, clear information,
              secure fulfillment, and human support when questions arise.
            </p>
          </div>

          <div style={supportGrid}>
            <SupportCard
              icon="✓"
              title="Human Support"
              text="Real U.S.-based support when you need assistance with orders or product information."
            />

            <SupportCard
              icon="✓"
              title="Clear Documentation"
              text="Accessible product information and available testing documentation."
            />

            <SupportCard
              icon="✓"
              title="Secure Fulfillment"
              text="Professional packaging, order handling, and tracked shipping workflows."
            />

            <SupportCard
              icon="✓"
              title="Research-First Focus"
              text="Products and website content are presented for laboratory and analytical research use."
            />
          </div>
        </section>

        <section style={compliancePanel}>
          <SectionHeader
            eyebrow="RESEARCH USE & COMPLIANCE"
            title="Clear Boundaries Matter"
          />

          <div style={complianceGrid}>
            <ComplianceCard
              title="Research Use Only"
              text="Products offered by PugPep are intended strictly for laboratory, analytical, and research purposes only. They are not intended for human or veterinary use."
            />

            <ComplianceCard
              title="No Medical Use"
              text="PugPep products are not intended to diagnose, treat, cure, mitigate, or prevent disease, and website information is not medical or veterinary advice."
            />

            <ComplianceCard
              title="Supplier Classification"
              text="PugPep operates as a chemical and research-material supplier. PugPep is not a compounding pharmacy or outsourcing facility."
            />
          </div>

          <p style={complianceNote}>
            Product and regulatory requirements can vary by jurisdiction and
            application. Customers are responsible for ensuring that their
            purchase, possession, handling, and research activities comply with
            applicable laws, regulations, institutional requirements, and
            laboratory procedures.
          </p>
        </section>

        <section style={closing}>
          <p style={closingEyebrow}>BUILT FOR RESEARCHERS</p>

          <h2 style={closingTitle}>
            One Breakthrough at a Time.
          </h2>

          <p style={closingText}>
            PugPep exists to support researchers who value dependable
            materials, transparent information, responsive service, and a
            higher standard of research procurement.
          </p>

          <div className="hero-actions" style={heroActions}>
            <Link href="/" style={primaryButton}>
              EXPLORE PRODUCTS
            </Link>

            <Link href="/quality" style={secondaryButton}>
              VIEW QUALITY &amp; TESTING
            </Link>
          </div>
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
      <p style={sectionEyebrow}>{eyebrow}</p>
      <h2 style={sectionTitle}>{title}</h2>
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
        boxShadow: `0 0 24px ${accent}12`,
      }}
    >
      <span style={{ ...heroCardLabel, color: accent }}>{label}</span>
      <strong style={heroCardValue}>{value}</strong>
      <p style={heroCardText}>{text}</p>
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
    <article style={{ ...infoCard, borderColor: `${accent}38` }}>
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

      <h3 style={infoTitle}>{title}</h3>
      <p style={infoText}>{text}</p>
    </article>
  );
}

function QualityCard({
  title,
  text,
  accent,
}: {
  title: string;
  text: string;
  accent: string;
}) {
  return (
    <article style={{ ...qualityCard, borderColor: `${accent}36` }}>
      <div
        style={{
          ...qualityIcon,
          borderColor: `${accent}58`,
          color: accent,
          background: `${accent}0d`,
        }}
      >
        ✓
      </div>

      <h3 style={qualityTitle}>{title}</h3>
      <p style={qualityText}>{text}</p>
    </article>
  );
}

function SupportCard({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <article style={supportCard}>
      <span style={supportIcon}>{icon}</span>

      <div>
        <h3 style={supportTitle}>{title}</h3>
        <p style={supportText}>{text}</p>
      </div>
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
      <h3 style={complianceTitle}>{title}</h3>
      <p style={complianceText}>{text}</p>
    </article>
  );
}

const page = {
  minHeight: "100vh",
  padding: "clamp(34px, 7vw, 80px) clamp(18px, 4vw, 34px)",
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
  position: "relative" as const,
  overflow: "hidden",
  border: "1px solid rgba(255,255,255,.10)",
  borderRadius: 28,
  background:
    "linear-gradient(145deg, rgba(8,8,12,.96), rgba(3,3,6,.98))",
  boxShadow: "0 28px 80px rgba(0,0,0,.38)",
};

const heroGlowOne = {
  position: "absolute" as const,
  width: 380,
  height: 380,
  top: -190,
  left: -120,
  borderRadius: 999,
  background:
    "radial-gradient(circle, rgba(0,217,255,.19), transparent 68%)",
  pointerEvents: "none" as const,
};

const heroGlowTwo = {
  position: "absolute" as const,
  width: 420,
  height: 420,
  top: -220,
  right: -130,
  borderRadius: 999,
  background:
    "radial-gradient(circle, rgba(255,69,216,.20), transparent 68%)",
  pointerEvents: "none" as const,
};

const heroContent = {
  position: "relative" as const,
  zIndex: 2,
  padding: "clamp(36px, 7vw, 72px) clamp(20px, 5vw, 54px)",
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
  maxWidth: 1080,
  margin: "14px auto 0",
  color: "#f6f7f9",
  fontSize: "clamp(46px, 8vw, 78px)",
  lineHeight: 1.04,
  letterSpacing: "-.05em",
  textShadow: "0 0 28px rgba(255,255,255,.08)",
};

const titleAccent = {
  display: "inline",
  color: "#ff45d8",
  textShadow: "0 0 28px rgba(255,45,210,.34)",
};

const heroText = {
  maxWidth: 900,
  margin: "22px auto 0",
  color: "#c8c8cf",
  fontSize: 20,
  lineHeight: 1.75,
};

const heroActions = {
  marginTop: 26,
  display: "flex",
  justifyContent: "center",
  gap: 12,
  flexWrap: "wrap" as const,
};

const primaryButton = {
  minHeight: 50,
  padding: "12px 18px",
  display: "grid",
  placeItems: "center",
  border: "1px solid rgba(0,255,153,.55)",
  borderRadius: 11,
  background:
    "linear-gradient(180deg, rgba(0,255,153,.18), rgba(0,255,153,.08))",
  color: "#00ff99",
  textDecoration: "none",
  fontWeight: 900,
  letterSpacing: ".04em",
};

const secondaryButton = {
  minHeight: 50,
  padding: "12px 18px",
  display: "grid",
  placeItems: "center",
  border: "1px solid rgba(0,217,255,.44)",
  borderRadius: 11,
  background: "rgba(0,217,255,.06)",
  color: "#7df9ff",
  textDecoration: "none",
  fontWeight: 900,
  letterSpacing: ".04em",
};

const heroGrid = {
  marginTop: 34,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
};

const heroCard = {
  padding: 21,
  display: "grid",
  gap: 8,
  border: "1px solid",
  borderRadius: 17,
  background:
    "linear-gradient(145deg, rgba(14,14,19,.92), rgba(5,5,8,.95))",
  textAlign: "left" as const,
};

const heroCardLabel = {
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: ".12em",
};

const heroCardValue = {
  fontSize: 27,
};

const heroCardText = {
  margin: 0,
  color: "#a9a9b2",
  lineHeight: 1.6,
};

const storyPanel = {
  marginTop: 28,
  padding: "clamp(24px, 5vw, 38px)",
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.4fr) minmax(280px, .8fr)",
  gap: 28,
  alignItems: "center",
  border: "1px solid rgba(0,217,255,.23)",
  borderRadius: 22,
  background:
    "linear-gradient(145deg, rgba(8,8,12,.95), rgba(8,12,16,.92))",
};

const storyCopy = {
  display: "grid",
  gap: 15,
};

const storyTitle = {
  maxWidth: 760,
  margin: 0,
  color: "#f3f4f6",
  fontSize: "clamp(32px, 5vw, 46px)",
  lineHeight: 1.1,
};

const storyStatement = {
  padding: 24,
  display: "grid",
  gap: 13,
  border: "1px solid rgba(255,69,216,.30)",
  borderRadius: 18,
  background:
    "linear-gradient(145deg, rgba(255,69,216,.075), rgba(0,217,255,.045))",
  boxShadow: "0 0 30px rgba(255,69,216,.06)",
};

const statementEyebrow = {
  color: "#ff75df",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: ".14em",
};

const statementText = {
  color: "#fff",
  fontSize: 28,
  lineHeight: 1.25,
};

const statementBody = {
  margin: 0,
  color: "#b7b9c0",
  lineHeight: 1.7,
};

const sectionPanel = {
  marginTop: 28,
  padding: "clamp(22px, 4vw, 32px)",
  border: "1px solid rgba(255,255,255,.11)",
  borderRadius: 20,
  background:
    "linear-gradient(145deg, rgba(8,8,12,.95), rgba(15,8,18,.92))",
  boxShadow: "0 0 24px rgba(0,217,255,.04)",
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
  fontSize: "clamp(30px, 5vw, 42px)",
  lineHeight: 1.15,
};

const paragraph = {
  margin: 0,
  color: "#c7c7ce",
  fontSize: 17,
  lineHeight: 1.8,
};

const introText = {
  maxWidth: 920,
  margin: "0 0 22px",
  color: "#c7c7ce",
  fontSize: 17,
  lineHeight: 1.8,
};

const cardGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
  gap: 16,
};

const infoCard = {
  padding: 20,
  display: "grid",
  gap: 12,
  border: "1px solid",
  borderRadius: 16,
  background: "rgba(0,0,0,.28)",
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

const qualityPanel = {
  marginTop: 28,
  padding: "clamp(24px, 5vw, 36px)",
  border: "1px solid rgba(0,255,153,.26)",
  borderRadius: 22,
  background:
    "linear-gradient(145deg, rgba(3,15,12,.94), rgba(6,7,11,.96))",
  boxShadow: "0 0 30px rgba(0,255,153,.05)",
};

const qualityHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: 18,
  flexWrap: "wrap" as const,
  marginBottom: 18,
};

const qualityLink = {
  color: "#00ff99",
  textDecoration: "none",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: ".05em",
};

const qualityGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
  gap: 15,
};

const qualityCard = {
  padding: 20,
  display: "grid",
  gap: 11,
  border: "1px solid",
  borderRadius: 16,
  background: "rgba(0,0,0,.24)",
};

const qualityIcon = {
  width: 40,
  height: 40,
  display: "grid",
  placeItems: "center",
  border: "1px solid",
  borderRadius: 999,
  fontWeight: 900,
};

const qualityTitle = {
  margin: 0,
  color: "#fff",
  fontSize: 20,
};

const qualityText = {
  margin: 0,
  color: "#afb2b8",
  lineHeight: 1.7,
};

const veteranPanel = {
  marginTop: 28,
  padding: "clamp(24px, 5vw, 36px)",
  display: "grid",
  gridTemplateColumns: "260px minmax(0, 1fr)",
  gap: 28,
  alignItems: "center",
  border: "1px solid rgba(0,255,153,.32)",
  borderRadius: 22,
  background:
    "linear-gradient(135deg, rgba(0,255,153,.08), rgba(0,217,255,.05), rgba(255,69,216,.06))",
};

const veteranVisual = {
  minHeight: 220,
  padding: 24,
  display: "grid",
  alignContent: "center",
  justifyItems: "center",
  textAlign: "center" as const,
  gap: 14,
  border: "1px solid rgba(0,255,153,.38)",
  borderRadius: 18,
  background:
    "linear-gradient(145deg, rgba(0,255,153,.08), rgba(0,0,0,.20))",
};

const veteranFlagLine = {
  display: "flex",
  gap: 10,
  color: "#7df9ff",
  fontSize: 18,
};

const veteranBadge = {
  color: "#00ff99",
  fontSize: 24,
  fontWeight: 900,
  letterSpacing: ".08em",
};

const veteranSubtext = {
  margin: 0,
  color: "#aeb4b8",
  fontSize: 13,
  lineHeight: 1.6,
};

const supportPanel = {
  marginTop: 28,
  padding: "clamp(24px, 5vw, 36px)",
  border: "1px solid rgba(255,69,216,.22)",
  borderRadius: 22,
  background:
    "linear-gradient(145deg, rgba(15,6,18,.92), rgba(5,7,10,.96))",
};

const supportHeader = {
  maxWidth: 900,
};

const supportGrid = {
  marginTop: 20,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
  gap: 14,
};

const supportCard = {
  padding: 18,
  display: "grid",
  gridTemplateColumns: "42px minmax(0, 1fr)",
  gap: 14,
  alignItems: "start",
  border: "1px solid rgba(255,255,255,.09)",
  borderRadius: 15,
  background: "rgba(0,0,0,.24)",
};

const supportIcon = {
  width: 38,
  height: 38,
  display: "grid",
  placeItems: "center",
  border: "1px solid rgba(0,255,153,.38)",
  borderRadius: 999,
  color: "#00ff99",
  background: "rgba(0,255,153,.06)",
  fontWeight: 900,
};

const supportTitle = {
  margin: 0,
  color: "#fff",
  fontSize: 19,
};

const supportText = {
  margin: "7px 0 0",
  color: "#aeb0b7",
  lineHeight: 1.7,
};

const compliancePanel = {
  marginTop: 28,
  padding: "clamp(22px, 4vw, 32px)",
  border: "1px solid rgba(255,204,0,.26)",
  borderRadius: 20,
  background:
    "linear-gradient(145deg, rgba(12,10,4,.94), rgba(8,8,12,.95))",
};

const complianceGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 16,
};

const complianceCard = {
  padding: 20,
  border: "1px solid rgba(255,255,255,.10)",
  borderRadius: 15,
  background: "rgba(0,0,0,.25)",
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

const complianceNote = {
  margin: "18px 0 0",
  paddingTop: 18,
  borderTop: "1px solid rgba(255,255,255,.08)",
  color: "#8f9198",
  fontSize: 13,
  lineHeight: 1.7,
};

const closing = {
  maxWidth: 1000,
  margin: "clamp(46px, 8vw, 86px) auto 0",
  padding: "clamp(28px, 5vw, 46px)",
  border: "1px solid rgba(0,217,255,.22)",
  borderRadius: 24,
  background:
    "linear-gradient(145deg, rgba(0,217,255,.05), rgba(255,69,216,.05), rgba(0,255,153,.04))",
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
  fontSize: "clamp(36px, 6vw, 56px)",
  lineHeight: 1.1,
};

const closingText = {
  maxWidth: 780,
  margin: "17px auto 0",
  color: "#c5c5cc",
  fontSize: 19,
  lineHeight: 1.75,
};

const responsiveStyle = `
  @media (max-width: 820px) {
    .veteran-panel {
      grid-template-columns: minmax(0, 1fr) !important;
    }
  }

  @media (max-width: 760px) {
    .hero-actions {
      flex-direction: column !important;
      align-items: stretch !important;
    }
  }

  @media (max-width: 700px) {
    section[style*="grid-template-columns: minmax(0, 1.4fr)"] {
      grid-template-columns: minmax(0, 1fr) !important;
    }
  }
`;