"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { createClient } from "../lib/supabaseClient";

type Product = {
  id: string;
  name: string;
  slug: string;
  image: string;
  color: string;
  category: string;
};

export default function HomePage() {
  const supabase = createClient();

  const [ageVerified, setAgeVerified] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [saleMap, setSaleMap] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
const [filter, setFilter] = useState("all");
const [isMobile, setIsMobile] = useState<boolean | null>(null);
  
  useEffect(() => {
  const accepted = localStorage.getItem("pugpep_age_verified");
  setAgeVerified(accepted === "yes");
  loadProducts();

  const mediaQuery = window.matchMedia("(max-width: 768px)");

  const updateMobile = () => {
    setIsMobile(mediaQuery.matches);
  };

  updateMobile();

  mediaQuery.addEventListener("change", updateMobile);

  return () => {
    mediaQuery.removeEventListener("change", updateMobile);
  };
}, []);

  async function loadProducts() {
    const { data: productData } = await supabase
  .from("products")
  .select("id, name, slug, color, image, category")
      .eq("is_active", true)
      .order("name", { ascending: true });

    setProducts(productData || []);

    const { data: saleData } = await supabase
      .from("product_options")
      .select("product_slug, sale_active, sale_percent")
      .eq("sale_active", true);

    const sales: Record<string, number> = {};

    (saleData || []).forEach((item: any) => {
      if (Number(item.sale_percent || 0) > 0) {
        sales[item.product_slug] = Math.max(
          sales[item.product_slug] || 0,
          Number(item.sale_percent)
        );
      }
    });

    setSaleMap(sales);
  }

  return (
    <main style={page}>
      <style>{`
  @keyframes tickerScroll {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }

  @keyframes testimonialScroll {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
`}</style>
      {!ageVerified && (
        <div style={overlay}>
          <div style={modal}>
            <Image src="/pugpep-logo.png" alt="PUGPEP" width={150} height={150} />

            <h1 style={{ color: "#ff45d8" }}>PUGPEP Disclaimer</h1>

            <p style={{ color: "#ddd", lineHeight: 1.6 }}>
              You must be 21+ to enter. By clicking "I Agree & Enter", you certify that you are an authorized laboratory representative procurement agent purchasing reagents solely for in-vitro evaluation.
              All products are for research purposes only and not for human or veterinary use. 
              By clicking "I Agree & Enter",you confirm that you understand and accept these terms.
            </p>

            <button
              onClick={() => {
                localStorage.setItem("pugpep_age_verified", "yes");
                setAgeVerified(true);
              }}
              style={mainButton}
            >
              I Agree & Enter
            </button>
          </div>
        </div>
      )}

<section style={heroVideoSection}>
  {isMobile !== null && (
    <video
      key={isMobile ? "mobile-video" : "desktop-video"}
      autoPlay
      muted
      loop
      playsInline
      style={heroVideo}
      src={isMobile ? "/hero-mobile.mp4" : "/hero-desktop.mp4"}
    />
  )}

  <div style={heroOverlay}>
    <div style={researchBadge}>
      🧪 FOR RESEARCH PURPOSES ONLY
      <br />
      <span style={{ color: "#00ff99" }}>
        NOT FOR HUMAN OR VETERINARY USE
      </span>
    </div>
  </div>
</section>
<section style={discoverBanner}>
  <h2 style={discoverTitle}>
    Discover the Full Line of PUGPEP Products
  </h2>

  <p style={discoverText}>
    PUGPEP provides high-purity research chemicals and peptides at
    competitive pricing, backed by verified COAs, fast shipping,
    and trusted quality standards.
  </p>
</section>
      <section
  style={{
    maxWidth: 1320,
    margin: "0 auto 25px",
    padding: "0 14px",
    display: "grid",
    gap: 14,
  }}
>
  <input
    placeholder="Search products..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    style={{
      width: "100%",
      padding: 14,
      borderRadius: 10,
      border: "1px solid #333",
      background: "#111",
      color: "#fff",
      fontSize: 16,
    }}
  />

  <div
    style={{
      display: "flex",
      gap: 10,
      flexWrap: "wrap",
      justifyContent: "center",
    }}
  >
    {["all", "sale", "peptides", "lab materials"].map((item) => (
      <button
        key={item}
        onClick={() => setFilter(item)}
        style={{
          padding: "10px 14px",
          borderRadius: 999,
          background: "#111",
          border:
            filter === item
              ? "1px solid #00ff99"
              : "1px solid #333",
          color:
            filter === item
              ? "#00ff99"
              : "#ccc",
          cursor: "pointer",
          fontWeight: "bold",
        }}
      >
        {item.toUpperCase()}
      </button>
    ))}
  </div>
</section>

     <section style={productsGrid}>
  {products
    .filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.slug.toLowerCase().includes(search.toLowerCase());

     

const category = String(product.category || "")
  .toLowerCase()
  .trim();

const matchesFilter =
  filter === "all"
    ? true
    : filter === "sale"
    ? saleMap[product.slug] > 0
    : filter === "peptides"
    ? category === "peptide"
    : filter === "lab materials"
    ? category === "lab-material"
    : true;

      return matchesSearch && matchesFilter;
    })
.sort((a, b) => {
  if (a.category === b.category) {
    return a.name.localeCompare(b.name);
  }

  if (a.category === "peptide") return -1;
  if (b.category === "peptide") return 1;

  return 0;
})
.map((product) => {
      const salePercent = saleMap[product.slug];

      return (
        <Link
          key={product.slug}
          href={`/products/${product.slug}`}
          style={{ textDecoration: "none" }}
        >
          <div
            style={{
              ...productCard,
              border: `1px solid ${product.color || "#ff45d8"}`,
              boxShadow: `0 0 26px ${product.color || "#ff45d8"}55`,
            }}
          >
            {salePercent > 0 && (
              <div style={saleBadge}>SALE {salePercent}% OFF</div>
            )}

           <Image
  src={
    typeof product.image === "string" &&
    product.image.length > 0
      ? product.image
      : "/pugpep-logo.png"
  }
  alt={product.name}
  width={280}
  height={280}
  style={{
    width: "100%",
    height: 360,

    objectFit:
      product.slug === "compoundmicroscope"
        ? "fill"
        : "cover",

    transform:
      product.slug === "compoundmicroscope"
        ? "scale(1)"
        : "none",

    borderRadius: 12,
  }}
/>

            <h2
              style={{
                ...productName,
                color: product.color || "#ff45d8",
              }}
            >
              {product.name}
            </h2>

            <div
              style={{
                ...viewButton,
                background: product.color || "#ff45d8",
              }}
            >
              VIEW PRODUCT
            </div>
          </div>
        </Link>
      );
    })}
</section>

      <section style={bottomBar}>
  <QualityItem icon="🔒" title="SECURE PACKAGING" text="secure, safe & professional" />

  <QualityItem
    icon="🚚"
    title="FAST & TRACKED SHIPPING"
    text="Quick & reliable delivery"
  />

  <QualityItem
    icon="💳"
    title="EASY PAYMENT"
    text="Multiple secure options"
  />

  <QualityItem
    icon="✅"
    title="SATISFACTION FOCUSED"
    text="Quality you can trust"
  />
</section>
<section style={testimonialSection}>
  <h2 style={{ color: "#ff45d8", textAlign: "center" }}>
    Verified Laboratory Feedback
  </h2>

  <div style={testimonialTicker}>
    <div style={testimonialTrack}>
      <Testimonial
        name="BrownCoatLabs"
        text="The batch-to-batch consistency is outstanding. We have noted zero variance in our baseline assay metrics across multiple lot numbers."
      />

      <Testimonial
        name="RebelAllianceResearchGroup"
        text="Highly reliable supplier for custom synthesis. Turnaround times are rapid, and the packaging ensures total peptide integrity during transport."
      />

      <Testimonial
        name="Brotherhood1984 Innovation Assoiciates "
        text="Excellent structural stability. The compound remains completely stable in solution during extended in vitro observation windows."
      />

      <Testimonial
        name="LaunaRodgers.PHD"
        text="Zero precipitate or cloudiness. It forms a perfectly clear, homogenous stock solution at high concentrations."
      />

      {/* DUPLICATE FOR LOOP */}
      <Testimonial
        name="MoleculeManiacLabs"
        text="The peptide exhibits optimal hydrophilic properties, dissolving completely in standard phosphate-buffered saline within seconds."
      />
    

      <Testimonial
        name="HomeLabHero27"
        text="Pleasently surprised, which honestly shouldn't feel like a miracle in 2026, but here we are. Fast shipping, great communication, and zero headache. 10/10, no notes."
      />

      <Testimonial
        name="DataRunnersAnalytics"
        text="The lyophilizate features a perfect vacuum seal and re-establishes without any visible aggregation."
        
      />
      <Testimonial
        name="UndergroundInnovatorsCollective"
        text="Excellent purity profiles. Verifiable COAs. Our in-house HPLC testing consistently verifies the $99\%+$ purity claims on every batch of lyophilized peptides."
        
      /><Testimonial
        name="SophisticatedLabs"
        text="The peak identity on the mass spec data perfectly aligns with reference standards. Zero detectable structural anomalies or truncation fragments."
        />
      <Testimonial
        name="The Marquis R&D"
        text="Independent HPLC verification confirmed a $99.4\%$ purity profile with an exceptionally clean baseline. Excellent chemical integrity."
      /><Testimonial
        name="District13 Biotech"
        text="That perfect, instant solubility is exactly what you want to see, it means the lyophilization cycle was dialed in just right, the cake structure was highly porous, and the moisture content is low."
        
      /><Testimonial
        name="The Aldecaldos Research Syndicate"
        text="Data replication just got a whole lot easier! Our baseline metrics have remained perfectly flat across three independent lot numbers. The synthesis consistency is phenomenal."
        
      />
    </div>
  </div>
</section>
<footer style={footer}>
  <p style={{ marginBottom: 18, color: "#00d9ff", fontWeight: "bold" }}>
    PUGPEP © 2026 All Rights Reserved
  </p>
 <a href="/terms" style={{ color: "#00d9ff", textDecoration: "none" }}>
    Terms & Conditions
  </a>
  <p style={footerText}>
    All products are sold for research, laboratory, or analytical purposes
    only, and are not for human consumption. The statements made within
    this website have not been evaluated by the US Food and Drug
    Administration. The statements and the products of this company are
    not intended to diagnose, treat, cure or prevent any disease.
  </p>

  <p style={footerText}>
    PUGPEP is a chemical supplier. PUGPEP is not a compounding pharmacy
    or chemical compounding facility as defined under 503A of the Federal
    Food, Drug, and Cosmetic Act. PUGPEP is not an outsourcing facility
    as defined under 503B of the Federal Food, Drug, and Cosmetic Act.
  </p>
  <p>
 
</p>
</footer>


    </main>
  );
}

function QualityItem({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div style={qualityItem}>
      <div style={{ fontSize: 28 }}>{icon}</div>
      <div>
        <h3 style={{ margin: 0, color: "#00d9ff" }}>{title}</h3>
        <p style={{ margin: "6px 0 0", color: "#ccc", lineHeight: 1.4 }}>
          {text}
        </p>
      </div>
    </div>
  );
}
function Testimonial({ name, text }: { name: string; text: string }) {
  return (
    <div style={testimonialCard}>
      <div style={{ color: "#ffbf00", fontSize: 20 }}>★★★★★</div>

      <div
        style={{
          display: "inline-block",
          margin: "8px 0",
          padding: "4px 10px",
          borderRadius: 999,
          background: "rgba(0,255,153,.12)",
          color: "#00ff99",
          fontWeight: "bold",
          fontSize: 12,
        }}
      >
        VERIFIED Research Facility Feedback
      </div>

      <p style={{ color: "#ddd", lineHeight: 1.5 }}>{text}</p>

      <strong style={{ color: "#00d9ff" }}>{name}</strong>
    </div>
  );
}
const page = {
  minHeight: "100vh",
  background: "#000",
  color: "#fff",
};

const heroVideoSection = {
  width: "100%",
  background: "#000",
  marginTop: 90,
};


const researchBadge = {
  display: "inline-block",
  marginTop: 20,
  padding: "15px 24px",
  border: "1px solid #ff2fbf",
  borderRadius: 12,
  background: "rgba(0,0,0,.45)",
  fontWeight: "bold",
  boxShadow: "0 0 18px rgba(255,45,210,.35)",
};


const qualityItem = {
  display: "flex",
  gap: 15,
  alignItems: "center",
  padding: 15,
  borderLeft: "1px solid #333",
};

const productsGrid = {
  maxWidth: 1320,
  margin: "25px auto",
  padding: "0 14px",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 18,
};

const productCard = {
  position: "relative" as const,
  padding: 20,
  minHeight: 340,
  borderRadius: 16,
  textAlign: "center" as const,
  background: "#050505",
};

const saleBadge = {
  position: "absolute" as const,
  top: 12,
  right: 12,
  padding: "6px 10px",
  borderRadius: 999,
  background: "#00ff99",
  color: "#000",
  fontWeight: "900",
  fontSize: 12,
  zIndex: 2,
};

const productName = {
  margin: "10px 0",
  fontSize: 22,
  textTransform: "uppercase" as const,

  height: 60,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const viewButton = {
  margin: "10px auto 0",
  padding: "11px 14px",
  borderRadius: 8,
  color: "#fff",
  fontWeight: "bold",
  maxWidth: 150,
};

const bottomBar = {
  maxWidth: 1320,
  margin: "18px auto 60px",
  padding: 18,
  border: "1px solid #333",
  borderRadius: 16,
  background: "rgba(10,10,10,.95)",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 18,
};

const overlay = {
  position: "fixed" as const,
  inset: 0,
  background: "rgba(0,0,0,.96)",
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 25,
};

const modal = {
  maxWidth: 520,
  padding: 30,
  border: "1px solid #ff45d8",
  borderRadius: 18,
  background: "#080808",
  textAlign: "center" as const,
};

const mainButton = {
  marginTop: 20,
  padding: "14px 24px",
  border: "none",
  borderRadius: 10,
  background: "linear-gradient(90deg, #00b7ff, #ff2fd0)",
  color: "#fff",
  fontWeight: "bold",
  cursor: "pointer",
  fontSize: 18,
};const testimonialSection = {
  maxWidth: 1320,
  margin: "18px auto 60px",
  padding: "0 14px",
};

const testimonialTicker = {
  overflow: "hidden",
  width: "100%",
};

const testimonialTrack = {
  display: "flex",
  gap: 18,
  width: "max-content",
  animation: "testimonialScroll 35s linear infinite",
  padding: "15px 0 25px",
};

const testimonialCard = {
  width: 300,
  padding: 20,
  border: "1px solid rgba(255,45,216,.45)",
  borderRadius: 16,
  background: "#080808",
  boxShadow: "0 0 24px rgba(0,217,255,.12)",
  flexShrink: 0,
};
const footer = {
  marginTop: 60,
  padding: "40px 20px",
  borderTop: "1px solid rgba(255,255,255,.12)",
  background: "#050505",
  textAlign: "center" as const,
};

const footerText = {
  maxWidth: 1100,
  margin: "0 auto 18px",
  color: "#888",
  lineHeight: 1.7,
  fontSize: 13,
};
const discoverBanner = {
  maxWidth: 1320,
  margin: "24px auto 18px",
  padding: "30px 24px",
  border: "1px solid rgba(255,45,210,.35)",
  borderRadius: 18,
  background:
    "linear-gradient(135deg, rgba(255,45,210,.10), rgba(0,217,255,.08), rgba(124,255,0,.08))",
  boxShadow: "0 0 30px rgba(255,45,210,.12)",
  textAlign: "center" as const,
};

const discoverTitle = {
  margin: 0,
  fontSize: 38,
  color: "#ff45d8",
  textShadow: "0 0 18px rgba(255,45,210,.35)",
};

const discoverText = {
  maxWidth: 900,
  margin: "16px auto 0",
  color: "#ddd",
  fontSize: 18,
  lineHeight: 1.7,
};
const heroVideo = {
  width: "100%",
  height: "auto",
  display: "block" as const,
};
const heroOverlay = {
  position: "absolute" as const,
  bottom: 25,
  width: "100%",
  display: "flex",
  justifyContent: "center",
  pointerEvents: "none" as const,
};