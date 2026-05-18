import Link from "next/link";
import Image from "next/image";

const products = [
  { name: "Tirzepatide", slug: "tirzepatide" },
  { name: "Retatrutide", slug: "retatrutide" },
  { name: "KLOW", slug: "klow", sub: "BPC-157 / TB-500 / GHK-CU / KPV" },
  { name: "Tesamorelin", slug: "tesamorelin" },
  { name: "Ipamorelin", slug: "ipamorelin" },
  { name: "SS-31", slug: "ss-31" },
  { name: "Selank", slug: "selank" },
  { name: "Semax", slug: "semax" },
  { name: "MOTS-C", slug: "mots-c" },
  { name: "Bac Water", slug: "bac-water" },
];

export default function ProductsPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#000", color: "#fff", padding: "40px 30px" }}>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <Image src="/pugpep-logo.png" alt="PUGPEP Logo" width={150} height={150} />
        <h1 style={{ fontSize: 48, margin: "10px 0", textShadow: "0 0 18px #ff35d5" }}>
          PUGPEP Products
        </h1>
        <p style={{ color: "#ccc" }}>Research-use products only. Not for human consumption.</p>
      </div>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
          gap: 30,
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        {products.map((product) => (
          <Link key={product.slug} href={`/products/${product.slug}`} style={{ textDecoration: "none", color: "#fff" }}>
            <div
              style={{
                border: "1px solid #7d2cff",
                borderRadius: 16,
                padding: 20,
                background: "radial-gradient(circle at top, rgba(255,45,210,.22), transparent 35%), #050505",
                boxShadow: "0 0 25px rgba(255,45,210,.18)",
                textAlign: "center",
              }}
            >
              <Vial name={product.name} />

              <h2 style={{ marginTop: 18, marginBottom: 5, color: "#ff45d8", fontSize: 24 }}>
                {product.name}
              </h2>

              {product.sub && <p style={{ color: "#9be8ff", fontSize: 13 }}>{product.sub}</p>}

              <p style={{ color: "#bbb", fontSize: 14 }}>Click vial to view options</p>
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}

function Vial({ name }: { name: string }) {
  return (
    <div style={{ position: "relative", width: 140, height: 250, margin: "0 auto" }}>
      <div style={{ position: "absolute", top: 0, left: 25, width: 90, height: 28, background: "linear-gradient(#ff5edc, #a60073)", borderRadius: "12px 12px 4px 4px", boxShadow: "0 0 18px #ff35d5", zIndex: 3 }} />

      <div style={{ position: "absolute", top: 26, left: 34, width: 72, height: 32, background: "linear-gradient(#f1f1f1, #777)", borderRadius: 4, zIndex: 2 }} />

      <div
        style={{
          position: "absolute",
          top: 52,
          left: 18,
          width: 104,
          height: 185,
          borderRadius: "24px 24px 18px 18px",
          border: "2px solid rgba(255,255,255,.35)",
          background: "linear-gradient(90deg, rgba(255,255,255,.2), rgba(0,200,255,.08), rgba(255,255,255,.25))",
          boxShadow: "inset 0 0 25px rgba(255,255,255,.15), 0 0 22px rgba(0,190,255,.25)",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: 108,
          left: "50%",
          transform: "translateX(-50%)",
          width: 90,
          height: 76,
          background: "#020202",
          borderTop: "1px solid #555",
          borderBottom: "1px solid #555",
          borderRadius: 4,
          boxShadow: "0 0 14px rgba(255,45,210,.55)",
          zIndex: 5,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 4,
        }}
      >
        <Image src="/pugpep-logo.png" alt="PUGPEP Logo" width={30} height={30} />

        <div
          style={{
            marginTop: 4,
            color: "#00d9ff",
            fontSize: name.length > 10 ? 8 : 10,
            fontWeight: "bold",
            textTransform: "uppercase",
            textShadow: "0 0 8px #00d9ff",
            lineHeight: 1,
            textAlign: "center",
          }}
        >
          {name}
        </div>
      </div>

      <div style={{ position: "absolute", bottom: 0, left: 25, width: 90, height: 12, borderRadius: "50%", background: "rgba(255,45,210,.4)", filter: "blur(8px)" }} />
    </div>
  );
}