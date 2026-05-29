"use client";

export default function QualityPage() {
  return (
    <main style={page}>
      <section style={hero}>
        <h1 style={title}>QUALITY & TESTING</h1>

        <p style={subtitle}>
          PUGPEP is committed to transparency, consistency, and research-grade
          quality standards.
        </p>
      </section>

      <section style={box}>
        <h2 style={heading}>Each Product is Thoroughly Tested by our Trusted 3rd Party Independent Laboratories</h2>

        <p style={text}>
          Certificates of Analysis (COAs) for applicable research materials and batch  verification are available upon request.
        </p>

        <p style={text}>
          For questions regarding testing documentation, batch verification,
          or analytical information, please contact PUGPEP support through our
          official communication channels.
        </p>
      </section>
    </main>
  );
}

const page = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top left, rgba(0,217,255,.16), transparent 35%), radial-gradient(circle at top right, rgba(255,45,210,.18), transparent 35%), #000",
  color: "#fff",
  padding: "60px 20px",
};

const hero = {
  maxWidth: 1100,
  margin: "0 auto 40px",
  textAlign: "center" as const,
};

const title = {
  fontSize: 58,
  color: "#ff45d8",
  textShadow: "0 0 25px rgba(255,45,210,.45)",
  marginBottom: 12,
};

const subtitle = {
  color: "#ccc",
  fontSize: 20,
  lineHeight: 1.7,
};

const box = {
  maxWidth: 900,
  margin: "0 auto",
  padding: 30,
  border: "1px solid rgba(255,255,255,.14)",
  borderRadius: 18,
  background: "rgba(0,0,0,.55)",
  backdropFilter: "blur(8px)",
  boxShadow: "0 0 25px rgba(0,217,255,.10)",
};

const heading = {
  color: "#00d9ff",
  marginTop: 0,
};

const text = {
  color: "#ccc",
  lineHeight: 1.8,
  fontSize: 16,
};