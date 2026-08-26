export default function ContactPage() {
  return (
    <main style={page}>
      <section style={container}>
        <div style={heroSection}>
          <div style={eyebrow}>🇺🇸 VETERAN-OWNED • U.S.-BASED SUPPORT</div>

          <h1 style={title}>Real People. Real Support.</h1>

          <p style={heroText}>
            At PUGPEP, customer support is built around real human connection.
            When you reach out to us, you are connecting with a real member of
            our U.S.-based team — not an AI chatbot or an outsourced overseas
            call center.
          </p>

          <div style={supportGrid}>
            <SupportItem
              icon="👤"
              title="100% Human Support"
              text="Real conversations with real people who are here to help."
            />

            <SupportItem
              icon="🇺🇸"
              title="U.S.-Based Team"
              text="Customer support built for the customers and communities we serve."
            />

            <SupportItem
              icon="🗣️"
              title="Clear Communication"
              text="Natural, easy-to-understand English without frustrating call-center scripts."
            />

            <SupportItem
              icon="🎖️"
              title="Veteran-Owned"
              text="Built around service, accountability, integrity, and respect for our customers."
            />
          </div>

          <div style={humanPromise}>
            <h2 style={humanPromiseTitle}>Human-Centered Customer Service</h2>

            <p style={humanPromiseText}>
              Technology can make business more efficient, but we do not believe
              it should replace genuine human connection. Whether you need help
              with an order, payment, shipping update, your account, or general
              support, our goal is to give you personal assistance from someone
              who can understand the situation and actually help.
            </p>

            <div style={promiseLine}>
              🇺🇸 Veteran-Owned&nbsp;&nbsp;•&nbsp;&nbsp;U.S.-Based
              &nbsp;&nbsp;•&nbsp;&nbsp;Human-First
            </div>
          </div>
        </div>

        <div style={discordBox}>
          <div style={discordEyebrow}>PUGPEP COMMUNITY SUPPORT</div>

          <h2 style={discordTitle}>Join Our Discord Community</h2>

          <p style={discordText}>
            Need help with an order, payment, shipping update, product
            information, promotions, or general support?
            <br />
            <br />
            Join the official PUGPEP Discord server and open a support ticket.
            A real member of our team will be available to assist you.
          </p>

          <div style={benefitsGrid}>
            <Benefit text="🚀 Exclusive promotions" />
            <Benefit text="📦 Shipping updates" />
            <Benefit text="💬 Human customer support" />
            <Benefit text="🎁 Giveaways and announcements" />
            <Benefit text="🔬 Product discussions" />
            <Benefit text="🇺🇸 U.S.-based support team" />
          </div>

          <div style={contactButtons}>
            <a
              href="https://discord.gg/yas8DetFz"
              target="_blank"
              rel="noopener noreferrer"
              style={discordButton}
            >
              Join Discord & Get Support
            </a>

            <a
              href="mailto:support@pugpep.com?subject=PUGPEP%20Customer%20Support"
              style={emailButton}
            >
              ✉️ Email Support
            </a>
          </div>
        </div>

        <div style={noticeBox}>
          <h2 style={noticeTitle}>Important Notice</h2>

          <p style={noticeText}>
            All PUGPEP products are intended for laboratory research purposes
            only and are not for human or veterinary use. Please include your
            order details when contacting us for support so our team can assist
            you as efficiently as possible.
          </p>
        </div>
      </section>
    </main>
  );
}

function SupportItem({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <div style={supportCard}>
      <div style={supportIcon}>{icon}</div>
      <h3 style={supportTitle}>{title}</h3>
      <p style={supportText}>{text}</p>
    </div>
  );
}

function Benefit({ text }: { text: string }) {
  return <div style={benefitItem}>{text}</div>;
}

const page = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top left, rgba(0,217,255,.18), transparent 35%), radial-gradient(circle at top right, rgba(255,45,210,.22), transparent 35%), #000",
  color: "#fff",
  padding: "clamp(40px, 6vw, 70px) clamp(18px, 4vw, 30px)",
};

const container = {
  maxWidth: 1100,
  margin: "0 auto",
  textAlign: "center" as const,
};

const heroSection = {
  padding: "clamp(28px, 5vw, 48px)",
  border: "1px solid rgba(0,255,153,.34)",
  borderRadius: 24,
  background:
    "linear-gradient(135deg, rgba(0,255,153,.07), rgba(0,217,255,.06), rgba(255,45,210,.07)), #050505",
  boxShadow:
    "0 0 38px rgba(0,255,153,.10), inset 0 0 28px rgba(255,255,255,.015)",
};

const eyebrow = {
  display: "inline-block",
  marginBottom: 14,
  padding: "8px 14px",
  border: "1px solid rgba(0,255,153,.55)",
  borderRadius: 999,
  background: "rgba(0,255,153,.07)",
  color: "#00ff99",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: ".12em",
};

const title = {
  margin: "0 0 18px",
  fontSize: "clamp(42px, 7vw, 68px)",
  lineHeight: 1.02,
  color: "#ff45d8",
  textShadow: "0 0 24px rgba(255,45,216,.48)",
  textTransform: "uppercase" as const,
};

const heroText = {
  maxWidth: 850,
  margin: "0 auto",
  color: "#ddd",
  fontSize: "clamp(17px, 2.2vw, 20px)",
  lineHeight: 1.75,
};

const supportGrid = {
  marginTop: 36,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: 18,
};

const supportCard = {
  padding: "24px 20px",
  border: "1px solid rgba(255,255,255,.12)",
  borderRadius: 18,
  background: "rgba(0,0,0,.58)",
  boxShadow: "0 0 22px rgba(0,217,255,.06)",
};

const supportIcon = {
  fontSize: 34,
  marginBottom: 10,
};

const supportTitle = {
  margin: "0 0 8px",
  color: "#00d9ff",
  fontSize: 18,
  fontWeight: 900,
  textTransform: "uppercase" as const,
};

const supportText = {
  margin: 0,
  color: "#bdbdc5",
  fontSize: 14,
  lineHeight: 1.6,
};

const humanPromise = {
  marginTop: 34,
  padding: "26px 24px",
  borderTop: "1px solid rgba(255,255,255,.10)",
  borderBottom: "1px solid rgba(255,255,255,.10)",
};

const humanPromiseTitle = {
  margin: "0 0 10px",
  color: "#fff",
  fontSize: "clamp(24px, 4vw, 34px)",
};

const humanPromiseText = {
  maxWidth: 860,
  margin: "0 auto",
  color: "#cfcfd5",
  fontSize: 16,
  lineHeight: 1.75,
};

const promiseLine = {
  marginTop: 18,
  color: "#00ff99",
  fontSize: 14,
  fontWeight: 900,
  letterSpacing: ".05em",
};

const discordBox = {
  marginTop: 38,
  padding: "clamp(28px, 5vw, 42px)",
  border: "1px solid #5865F2",
  borderRadius: 22,
  background:
    "linear-gradient(135deg, rgba(88,101,242,.10), rgba(255,45,210,.07)), #070707",
  boxShadow: "0 0 34px rgba(88,101,242,.28)",
};

const discordEyebrow = {
  color: "#00ff99",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: ".12em",
  marginBottom: 10,
};

const discordTitle = {
  color: "#7d86ff",
  fontSize: "clamp(30px, 5vw, 42px)",
  marginTop: 0,
  marginBottom: 15,
};

const discordText = {
  maxWidth: 800,
  margin: "0 auto 26px",
  color: "#ccc",
  fontSize: 18,
  lineHeight: 1.8,
};

const benefitsGrid = {
  maxWidth: 820,
  margin: "0 auto 30px",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
};

const benefitItem = {
  padding: "12px 14px",
  border: "1px solid rgba(0,255,153,.18)",
  borderRadius: 12,
  background: "rgba(0,255,153,.045)",
  color: "#00ff99",
  fontWeight: 800,
};

const discordButton = {
  display: "inline-block",
  padding: "16px 30px",
  background: "linear-gradient(90deg, #5865F2, #ff2fd0)",
  color: "#fff",
  textDecoration: "none",
  borderRadius: 12,
  fontWeight: 900,
  fontSize: 18,
  boxShadow: "0 0 24px rgba(88,101,242,.25)",
};


const contactButtons = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: 14,
  flexWrap: "wrap" as const,
};

const emailButton = {
  display: "inline-block",
  padding: "16px 30px",
  border: "1px solid #00ff99",
  background:
    "linear-gradient(90deg, rgba(0,255,153,.14), rgba(0,217,255,.14))",
  color: "#00ff99",
  textDecoration: "none",
  borderRadius: 12,
  fontWeight: 900,
  fontSize: 18,
  boxShadow: "0 0 24px rgba(0,255,153,.14)",
};

const noticeBox = {
  marginTop: 38,
  padding: 26,
  border: "1px solid #7d2cff",
  borderRadius: 16,
  background: "#080808",
  boxShadow: "0 0 25px rgba(255,45,210,.18)",
};

const noticeTitle = {
  margin: "0 0 10px",
  color: "#00d9ff",
};

const noticeText = {
  maxWidth: 850,
  margin: "0 auto",
  color: "#ccc",
  lineHeight: 1.7,
};