"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabaseClient";

type Product = {
  id: string;
  name: string;
  slug: string;
  image?: string;
  short_description?: string;
  is_active: boolean;
};

type Option = {
  product_slug: string;
  purchase_type: string;
  status: string;
};

export default function ProductsPage() {
  const supabase = createClient();

  const [products, setProducts] = useState<Product[]>([]);
  const [options, setOptions] = useState<Option[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    async function loadProducts() {
      const { data: productData } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true });

      const { data: optionData } = await supabase
        .from("product_options")
        .select("product_slug, purchase_type, status");

      setProducts(productData || []);
      setOptions(optionData || []);
    }

    loadProducts();
  }, []);

  function productMatchesFilter(product: Product) {
    const productOptions = options.filter(
      (option) => option.product_slug === product.slug
    );

    if (filter === "all") return true;

    if (filter === "single") {
      return productOptions.some((o) => o.purchase_type === "single");
    }

    if (filter === "kit") {
      return productOptions.some((o) => o.purchase_type === "kit");
    }

    if (filter === "in stock") {
      return productOptions.some((o) => o.status === "in stock");
    }

    if (filter === "pre-sale") {
      return productOptions.some((o) => o.status === "pre-sale");
    }

    return true;
  }

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.slug.toLowerCase().includes(search.toLowerCase()) ||
      product.short_description?.toLowerCase().includes(search.toLowerCase());

    return matchesSearch && productMatchesFilter(product);
  });

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#000",
        color: "#fff",
        padding: "40px 30px",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 35 }}>
        <Image
          src="/pugpep-logo.png"
          alt="PUGPEP Logo"
          width={150}
          height={150}
        />

        <h1
          style={{
            fontSize: 48,
            margin: "10px 0",
            textShadow: "0 0 18px #ff35d5",
          }}
        >
          PUGPEP Products
        </h1>

        <p style={{ color: "#ccc" }}>
          Research-use products only. Not for human consumption.
        </p>
      </div>

      <section
        style={{
          maxWidth: 1200,
          margin: "0 auto 35px",
          display: "grid",
          gap: 14,
        }}
      >
        <input
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={searchInput}
        />

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {["all", "single", "kit", "in stock", "pre-sale"].map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              style={{
                ...filterButton,
                border:
                  filter === item
                    ? "1px solid #00ff99"
                    : "1px solid #333",
                color: filter === item ? "#00ff99" : "#ccc",
              }}
            >
              {item.toUpperCase()}
            </button>
          ))}
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
          gap: 30,
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        {filteredProducts.map((product) => (
          <Link
            key={product.slug}
            href={`/products/${product.slug}`}
            style={{ textDecoration: "none", color: "#fff" }}
          >
            <div style={card}>
              <Vial name={product.name} />

              <h2
                style={{
                  marginTop: 18,
                  marginBottom: 5,
                  color: "#ff45d8",
                  fontSize: 24,
                }}
              >
                {product.name}
              </h2>

              {product.short_description && (
                <p style={{ color: "#9be8ff", fontSize: 13 }}>
                  {product.short_description}
                </p>
              )}

              <p style={{ color: "#bbb", fontSize: 14 }}>
                Click vial to view options
              </p>
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
      <div style={{ position: "absolute", top: 52, left: 18, width: 104, height: 185, borderRadius: "24px 24px 18px 18px", border: "2px solid rgba(255,255,255,.35)", background: "linear-gradient(90deg, rgba(255,255,255,.2), rgba(0,200,255,.08), rgba(255,255,255,.25))", boxShadow: "inset 0 0 25px rgba(255,255,255,.15), 0 0 22px rgba(0,190,255,.25)" }} />

      <div style={{ position: "absolute", top: 108, left: "50%", transform: "translateX(-50%)", width: 90, height: 76, background: "#020202", borderTop: "1px solid #555", borderBottom: "1px solid #555", borderRadius: 4, boxShadow: "0 0 14px rgba(255,45,210,.55)", zIndex: 5, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 4 }}>
        <Image src="/pugpep-logo.png" alt="PUGPEP Logo" width={30} height={30} />
        <div style={{ marginTop: 4, color: "#00d9ff", fontSize: name.length > 10 ? 8 : 10, fontWeight: "bold", textTransform: "uppercase", textShadow: "0 0 8px #00d9ff", lineHeight: 1, textAlign: "center" }}>
          {name}
        </div>
      </div>

      <div style={{ position: "absolute", bottom: 0, left: 25, width: 90, height: 12, borderRadius: "50%", background: "rgba(255,45,210,.4)", filter: "blur(8px)" }} />
    </div>
  );
}

const searchInput = {
  width: "100%",
  padding: 14,
  borderRadius: 10,
  border: "1px solid #333",
  background: "#111",
  color: "#fff",
  fontSize: 16,
};

const filterButton = {
  padding: "10px 14px",
  borderRadius: 999,
  background: "#111",
  cursor: "pointer",
  fontWeight: "bold",
};

const card = {
  border: "1px solid #7d2cff",
  borderRadius: 16,
  padding: 20,
  background:
    "radial-gradient(circle at top, rgba(255,45,210,.22), transparent 35%), #050505",
  boxShadow: "0 0 25px rgba(255,45,210,.18)",
  textAlign: "center" as const,
};