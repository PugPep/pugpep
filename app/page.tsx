"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "../lib/supabaseClient";

type Product = {
  id: string;
  name: string;
  slug: string;
  color: string;
  image: string;
};

export default function HomePage() {
  const supabase = createClient();

  const [ageVerified, setAgeVerified] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [saleMap, setSaleMap] = useState<Record<string, number>>({});
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
      .select("id, name, slug, color, image")
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
      

      <section style={productsGrid}>
        {products.map((product) => {
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
    typeof product.image === "string" && product.image.length > 0
      ? product.image
      : "/pugpep-logo.png"
  }
  alt={product.name}
  width={280}
  height={280}
  style={{
    width: "100%",
    height: 360,
    objectFit: "cover" as const,
    borderRadius: 14,
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
  <QualityItem icon="🔒" title="SECURE PACKAGING" text="Discreet & professional" />

  <QualityItem
    icon="🚚"
    title="FAST DISCREET & TRACKED SHIPPING"
    text="Quick & reliable delivery"
  />

  <QualityItem
    icon="💳"
    title="EASY PAYMENT"
    text="Cash App, Venmo, Apple Pay, or Crypto"
  />

  <QualityItem
    icon="✅"
    title="SATISFACTION FOCUSED"
    text="Quality you can trust"
  />
</section>
<section style={testimonialSection}>
  <h2 style={{ color: "#ff45d8", textAlign: "center" }}>
    Verified Customer Feedback
  </h2>

  <div style={testimonialTicker}>
    <div style={testimonialTrack}>
      <Testimonial
        name="MasonDixon78"
        text="The product quality is unmatched. This batch was exceptional and you can tell no corners were cut in production."
      />

      <Testimonial
        name="SugarNSpice"
        text="I was skeptical at first, but the quality blew me away. It performs perfectly and meets every single specification promised."
      />

      <Testimonial
        name="Shaquille.Oatmeal"
        text="Pure pressure! 💎 These peptides are elite quality and are exactly what I was looking for. Fr fr! 🧬🔥"
      />

      <Testimonial
        name="LaunaRodgers"
        text="Literally screaming right now!! 😱 I am completely obsessed with these peptides! High quality, lightning-fast shipping, and a support team that treats you like absolute royalty! Seriously, shut up and take my money! 👑🛒✨"
      />

      {/* DUPLICATE FOR LOOP */}
      <Testimonial
        name="MoleculeManiac"
        text="Actual footage of me using this product: 🤯! It functions perfectly, looks gorgeous, and the shipping speed was genuinely terrifying in the best way possible. If you don't buy this, you are seriously missing out!"
      />
    

      <Testimonial
        name="HomeLabHero27"
        text="Pleasently surprised, which honestly shouldn't feel like a miracle in 2026, but here we are. Fast shipping, great communication, and zero headache. 10/10, no notes."
      />

      <Testimonial
        name="RopedAngel89"
        text="I am officially obsessed!! 💅💥 Usually online shopping is a total gamble, but this is pure luxury! 💎 Fast shipping, a support team that treats you like royalty, and a product that actually High-Purity! 👑👑"
        
      />
      <Testimonial
        name="JohnBond007"
        text="A perfect transaction. Superior product quality, flawless communication, helpful support, and incredibly fast delivery. Will absolutely buy again."
        
      /><Testimonial
        name="SophisticatedLabs"
        text="Blown away by how fast this arrived. Ordered it, got a tracking number immediately, and it was at my door in no time."
        />
      <Testimonial
        name="CrimsonVixen"
        text="These peptides are giving pure main character energy! High quality, instant delivery, and perfect communication from start to finish. 10/10, everyone! 🎯🥳"
      />
      <Testimonial
        name="CassandraRamerez"
        text="Customer service is keeping it 100! 🗣️ Super helpful updates, they are genuinely the GOATs. Gracias! 🐐❤️"
        
      /><Testimonial
        name="EpicDiscoveries"
        text="If you love items that actually work, customer service reps who treat you like a human, and shipping speeds that defy physics, buy this right now. If you love stress and regret, shop elsewhere."
        
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
        VERIFIED BUYER
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

const qualityBar = {
  maxWidth: 1320,
  margin: "18px auto",
  padding: 18,
  border: "1px solid #333",
  borderRadius: 16,
  background: "rgba(10,10,10,.95)",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 18,
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
  display: "block",

};