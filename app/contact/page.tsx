export default function ContactPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, rgba(0,217,255,.18), transparent 35%), radial-gradient(circle at top right, rgba(255,45,210,.22), transparent 35%), #000",
        color: "#fff",
        padding: "60px 30px",
      }}
    >
      <section style={{ maxWidth: 1000, margin: "0 auto", textAlign: "center" }}>
        <h1
          style={{
            fontSize: 56,
            color: "#ff45d8",
            textShadow: "0 0 20px rgba(255,45,216,.55)",
          }}
        >
          Contact PUGPEP
        </h1>

        <p style={{ color: "#ccc", fontSize: 20, lineHeight: 1.6 }}>
          Have questions about products, orders, payments, or checkout?
          Reach us through our official community and social channels.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 22,
            marginTop: 45,
          }}
        >
          

          <ContactCard
            title="Telegram"
            text="Follow PUGPEP for a daily dose of updates & sales! 📲Level up with our educational content. Welcome to a community that truly cares. ❤️"
            link="https://t.me/PugPeps"
            button="Join Telegram"
            color="#1877F2"
          />

          <ContactCard
            title="Email Us"
            text="Message us for order support, product inquiries, or any questions you have. We're here to help and ensure you have the best experience with PUGPEP!"
            link="https://www.Support.PUGPEP.com"
            button="Email Us"
            color="#d033ae"
          />
        </div>

        <div
          style={{
            marginTop: 45,
            padding: 24,
            border: "1px solid #7d2cff",
            borderRadius: 16,
            background: "#080808",
            boxShadow: "0 0 25px rgba(255,45,210,.18)",
          }}
        >
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

function ContactCard({
  title,
  text,
  link,
  button,
  color,
}: {
  title: string;
  text: string;
  link: string;
  button: string;
  color: string;
}) {
  return (
    <div
      style={{
        padding: 25,
        border: `1px solid ${color}`,
        borderRadius: 18,
        background: "#070707",
        boxShadow: `0 0 24px ${color}55`,
        textAlign: "left",
      }}
    >
      <h2 style={{ color, marginTop: 0 }}>{title}</h2>

      <p style={{ color: "#ccc", lineHeight: 1.6 }}>{text}</p>

      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-block",
          marginTop: 15,
          padding: "12px 18px",
          background: `linear-gradient(90deg, ${color}, #ff2fd0)`,
          color: "#fff",
          textDecoration: "none",
          borderRadius: 10,
          fontWeight: "bold",
        }}
      >
        {button}
      </a>
    </div>
  );
}