"use client";

import { useEffect, useMemo, useState } from "react";

import { createClient } from "../../lib/supabaseClient";
import { useCart } from "../../app/cartContext";
import CompoundCard from "../ui/CompoundCard";

type ProductRow = {
  name: string;
  slug: string;
  image: string | null;
  is_active: boolean;
};

type ProductOptionRow = {
  id: string;
  product_slug: string;
  dosage: string;
  purchase_type: string;
  price: number;
  status: string | null;
  cost: number | null;
};

type FeaturedItem = {
  product: ProductRow;
  option: ProductOptionRow;
};

export default function FeaturedCompounds() {
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const { addToCart } =
    useCart();

  const [
    items,
    setItems,
  ] =
    useState<FeaturedItem[]>([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadFeatured() {
      setLoading(true);
      setError("");

      try {
        const {
          data: products,
          error: productError,
        } =
          await supabase
            .from("products")
            .select(
              "name,slug,image,is_active"
            )
            .eq(
              "is_active",
              true
            )
            .order(
              "name",
              {
                ascending:
                  true,
              }
            )
            .limit(12);

        if (productError) {
          throw productError;
        }

        const activeProducts =
          (
            products ||
            []
          ) as ProductRow[];

        if (
          activeProducts.length ===
          0
        ) {
          if (!cancelled) {
            setItems([]);
          }

          return;
        }

        const slugs =
          activeProducts.map(
            (product) =>
              product.slug
          );

        const {
          data: options,
          error: optionError,
        } =
          await supabase
            .from(
              "product_options"
            )
            .select(
              "id,product_slug,dosage,purchase_type,price,status,cost"
            )
            .in(
              "product_slug",
              slugs
            )
            .eq(
              "purchase_type",
              "single"
            )
            .order(
              "price",
              {
                ascending:
                  true,
              }
            );

        if (optionError) {
          throw optionError;
        }

        const optionRows =
          (
            options ||
            []
          ) as ProductOptionRow[];

        const firstOptionBySlug =
          new Map<
            string,
            ProductOptionRow
          >();

        for (
          const option
          of optionRows
        ) {
          if (
            !firstOptionBySlug.has(
              option.product_slug
            )
          ) {
            firstOptionBySlug.set(
              option.product_slug,
              option
            );
          }
        }

        const featured =
          activeProducts
            .map(
              (product) => {
                const option =
                  firstOptionBySlug.get(
                    product.slug
                  );

                return option
                  ? {
                      product,
                      option,
                    }
                  : null;
              }
            )
            .filter(
              (
                item
              ): item is FeaturedItem =>
                item !== null
            )
            .slice(0, 8);

        if (!cancelled) {
          setItems(
            featured
          );
        }
      } catch (loadError) {
        console.error(
          "Unable to load featured compounds:",
          loadError
        );

        if (!cancelled) {
          setError(
            "Featured compounds could not be loaded right now."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadFeatured();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  function quickAdd(
    item: FeaturedItem
  ) {
    const {
      product,
      option,
    } = item;

    const status =
      String(
        option.status ||
          "in stock"
      );

    if (
      status
        .trim()
        .toLowerCase() ===
      "out of stock"
    ) {
      return;
    }

    addToCart(
      {
        productOptionId:
          option.id,

        name:
          product.name,

        slug:
          product.slug,

        image:
          product.image ||
          "/pugpep-logo.png",

        dosage:
          option.dosage,

        purchaseType:
          "single",

        price:
          Number(
            option.price ||
              0
          ),

        regularPrice:
          Number(
            option.price ||
              0
          ),

        salePrice:
          Number(
            option.price ||
              0
          ),

        wasOnSale:
          false,

        salePercent:
          0,

        status,

        cost:
          Number(
            option.cost ||
              0
          ),
      },
      1
    );
  }

  return (
    <section
      id="featured-compounds"
      aria-labelledby="featured-compounds-title"
      style={section}
    >
      <div style={container}>
        <header style={header}>
          <div>
            <p style={eyebrow}>
              FEATURED COMPOUNDS
            </p>

            <h2
              id="featured-compounds-title"
              style={title}
            >
              Trending in the Lab
            </h2>

            <p style={subtitle}>
              Explore a curated selection of currently available compounds.
            </p>
          </div>

          <a
            href="/#laboratory"
            style={viewAllButton}
          >
            View Full Library
          </a>
        </header>

        {loading ? (
          <div style={grid}>
            {Array.from({
              length: 4,
            }).map(
              (
                _,
                index
              ) => (
                <div
                  key={index}
                  style={skeleton}
                />
              )
            )}
          </div>
        ) : error ? (
          <div style={messageCard}>
            {error}
          </div>
        ) : items.length === 0 ? (
          <div style={messageCard}>
            No featured compounds are available right now.
          </div>
        ) : (
          <div style={grid}>
            {items.map(
              (
                item,
                index
              ) => (
                <CompoundCard
                  key={
                    item.option.id
                  }
                  name={
                    item.product
                      .name
                  }
                  slug={
                    item.product
                      .slug
                  }
                  image={
                    item.product
                      .image ||
                    "/pugpep-logo.png"
                  }
                  dosage={
                    item.option
                      .dosage
                  }
                  price={
                    Number(
                      item.option
                        .price ||
                        0
                    )
                  }
                  status={
                    item.option
                      .status ||
                    "In Stock"
                  }
                  coaAvailable
                  pointsEarned={
                    Math.max(
                      0,
                      Math.floor(
                        Number(
                          item.option
                            .price ||
                            0
                        )
                      )
                    )
                  }
                  badge={
                    index ===
                    0
                      ? "TRENDING"
                      : index ===
                        1
                      ? "POPULAR"
                      : null
                  }
                  onAdd={() =>
                    quickAdd(
                      item
                    )
                  }
                />
              )
            )}
          </div>
        )}
      </div>
    </section>
  );
}

const section = {
  padding:
    "clamp(68px, 9vw, 112px) clamp(18px, 4vw, 52px)",
  background:
    "radial-gradient(circle at 85% 15%, rgba(255,47,208,.08), transparent 30%), linear-gradient(180deg, #060609 0%, #020203 100%)",
  color: "#ffffff",
};

const container = {
  width: "100%",
  maxWidth: 1320,
  margin: "0 auto",
};

const header = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "end",
  gap: 24,
  flexWrap: "wrap" as const,
  marginBottom: 28,
};

const eyebrow = {
  margin: 0,
  color: "#00d9ff",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: ".15em",
};

const title = {
  margin: "7px 0 0",
  color: "#ffffff",
  fontSize:
    "clamp(32px, 6vw, 52px)",
  letterSpacing: "-.035em",
};

const subtitle = {
  maxWidth: 650,
  margin: "10px 0 0",
  color: "#a7a7af",
  fontSize: 16,
  lineHeight: 1.65,
};

const viewAllButton = {
  minHeight: 48,
  padding: "11px 16px",
  display: "grid",
  placeItems: "center",
  border:
    "1px solid rgba(0,217,255,.48)",
  borderRadius: 11,
  background:
    "rgba(0,217,255,.06)",
  color: "#7df9ff",
  textDecoration: "none",
  fontWeight: 900,
};

const grid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
  gap: 18,
};

const skeleton = {
  minHeight: 410,
  border:
    "1px solid rgba(255,255,255,.08)",
  borderRadius: 18,
  background:
    "linear-gradient(110deg, #0b0b0f 8%, #121218 18%, #0b0b0f 33%)",
  backgroundSize:
    "200% 100%",
};

const messageCard = {
  padding: 24,
  border:
    "1px solid rgba(0,217,255,.28)",
  borderRadius: 14,
  background:
    "rgba(0,217,255,.04)",
  color: "#bcbcc4",
  textAlign: "center" as const,
};