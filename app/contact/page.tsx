export default function ContactPage() {
  return (
    <main style={page}>
      <section style={container}>
        <h1 style={title}>Contact PUGPEP</h1>

        <p style={subtitle}>
          Join the official PUGPEP Discord community for order support, shipping
          assistance, product discussions, promotions, and announcements.
        </p>

        <div style={discordBox}>
          <h2 style={discordTitle}>Join Our Discord Community</h2>

          <p style={discordText}>
            Need help with an order, payment, shipping update, product
            information, promotions, or general support?
            <br />
            <br />
            Join the official PUGPEP Discord server and open a support ticket.
            Our staff and community are available to assist you.
          </p>

          <div style={benefits}>
            <p>🚀 Exclusive promotions</p>
            <p>📦 Shipping updates</p>
            <p>💬 Community support</p>
            <p>🎁 Giveaways and announcements</p>
            <p>🔬 Product discussions</p>
          </div>

          <a
            href="https://discord.gg/yas8DetFz"
            target="_blank"
            rel="noopener noreferrer"
            style={discordButton}
          >
            Join Discord
          </a>
        </div>

        <div style={noticeBox}>
          <h2 style={{ color: "#00d9ff" }}>Important Notice</h2>

          <p style={{ color: "#ccc", lineHeight: 1.6 }}>
            All PUGPEP products are intended for research purposes only and are
            not for human consumption. Please include your order details when
            contacting us for support.
          </p>
        </div>
      </section>
    </main>
  );
}

const page = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top left, rgba(0,217,255,.18), transparent 35%), radial-gradient(circle at top right, rgba(255,45,210,.22), transparent 35%), #000",
  color: "#fff",
  padding: "60px 30px",
};

const container = {
  maxWidth: 1000,
  margin: "0 auto",
  textAlign: "center" as const,
};

const title = {
  fontSize: 56,
  color: "#ff45d8",
  textShadow: "0 0 20px rgba(255,45,216,.55)",
};

const subtitle = {
  color: "#ccc",
  fontSize: 20,
  lineHeight: 1.6,
};

const discordBox = {
  marginTop: 45,
  padding: 35,
  border: "1px solid #5865F2",
  borderRadius: 20,
  background: "#070707",
  boxShadow: "0 0 30px rgba(88,101,242,.35)",
};

const discordTitle = {
  color: "#5865F2",
  fontSize: 36,
  marginTop: 0,
  marginBottom: 15,
};

const discordText = {
  color: "#ccc",
  fontSize: 18,
  lineHeight: 1.8,
  marginBottom: 25,
};

const benefits = {
  color: "#00ff99",
  fontWeight: "bold",
  lineHeight: 1.8,
  marginBottom: 28,
};

const discordButton = {
  display: "inline-block",
  padding: "16px 28px",
  background: "linear-gradient(90deg, #5865F2, #ff2fd0)",
  color: "#fff",
  textDecoration: "none",
  borderRadius: 12,
  fontWeight: "bold",
  fontSize: 18,
};

const noticeBox = {
  marginTop: 45,
  padding: 24,
  border: "1px solid #7d2cff",
  borderRadius: 16,
  background: "#080808",
  boxShadow: "0 0 25px rgba(255,45,210,.18)",
};