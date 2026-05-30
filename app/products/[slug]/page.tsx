"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabaseClient";
import { useCart } from "../../cartContext";

type Product = {
  id: string;
  name: string;
  slug: string;
  color: string;
  image: string;
  short_description: string;
  description: string;
  category: string;
is_active: boolean;
};

type ProductOption = {
  id: string;
  product_slug: string;
  dosage: string;
  purchase_type: string;
  price: number;
  status: string;
  sale_active: boolean;
sale_percent: number;
cost: number;
};

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const supabase = createClient();
  const { addToCart } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [selectedOption, setSelectedOption] = useState<ProductOption | null>(null);
  const [loading, setLoading] = useState(true);
const [quantity, setQuantity] = useState(1);
  useEffect(() => {
    async function loadProduct() {
      setLoading(true);

      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .single();

      if (productError || !productData) {
        setProduct(null);
        setLoading(false);
        return;
      }

      setProduct(productData);

      const { data: optionData } = await supabase
        .from("product_options")
        .select("*")
        .eq("product_slug", slug)
        .order("dosage", { ascending: true });

      const sortedOptions = (optionData || []).sort((a, b) => {
  if (a.purchase_type !== b.purchase_type) {
    return a.purchase_type === "single" ? -1 : 1;
  }

  const aMg = parseFloat(a.dosage);
  const bMg = parseFloat(b.dosage);

  return aMg - bMg;
});

setOptions(sortedOptions);

      const { data: inventoryData } = await supabase
        .from("inventory")
        .select("*")
        .eq("product_slug", slug);

      setInventory(inventoryData || []);
      setLoading(false);
    }

    loadProduct();
  }, [slug]);

  useEffect(() => {
    if (options.length === 0) return;

    const firstAvailable =
      options.find((option) => isOptionAvailable(option)) || options[0];

    setSelectedOption(firstAvailable);
  }, [options, inventory]);

  function getAvailableQuantity(option: ProductOption) {
    const inventoryItem = inventory.find(
      (item) =>
        item.dosage === option.dosage &&
        item.purchase_type === "single"
    );

    return inventoryItem?.quantity || 0;
  }

 function isOptionAvailable(option: ProductOption) {
  const availableQuantity = getAvailableQuantity(option);

  if (option.purchase_type === "single") {
    return availableQuantity >= 1 && option.status !== "out of stock";
  }

  if (option.purchase_type === "kit") {
    if (option.status === "pre-sale") return true;
    if (option.status === "out of stock") return false;
    return availableQuantity >= 10;
  }

  return false;
}
function getPurchaseLabel(purchaseType: string) {
  if (product?.category === "lab-material") {
    return purchaseType === "kit" ? "10 Pack" : "Single Item";
  }

  return purchaseType === "kit" ? "Full Kit of 10" : "Single Vial";
}
  function handleAddToCart() {
  if (!product || !selectedOption) return;

  const availableQuantity =
    getAvailableQuantity(selectedOption);

  const maxKits = Math.floor(
    availableQuantity / 10
  );

  // SINGLE VIAL RULES
  if (selectedOption.purchase_type === "single") {
    if (quantity > availableQuantity) {
      alert(
        `Only ${availableQuantity} vial(s) currently available.`
      );
      return;
    }
  }

  // KIT RULES
  const isKitPresale =
    selectedOption.purchase_type === "kit" &&
    quantity > maxKits;

  addToCart(
    {
      name: product.name,
      slug: product.slug,
      image: product.image,
      dosage: selectedOption.dosage,
      price:
        selectedOption.sale_active &&
        Number(selectedOption.sale_percent || 0) > 0
          ? Number(selectedOption.price) -
            Number(selectedOption.price) *
              (Number(selectedOption.sale_percent) / 100)
          : Number(selectedOption.price),
cost: (selectedOption.cost || 0),
      purchaseType:
        selectedOption.purchase_type as
          | "single"
          | "kit",

      status: isKitPresale
        ? "pre-sale"
        : selectedOption.status,
        maxAvailable: availableQuantity,
    },
    quantity
  );

  if (isKitPresale) {
    alert(
      "Some kits in this order will be fulfilled as pre-sale and may take up to 2 weeks."
    );
  } else {
    alert(`${product.name} added to cart.`);
  }
}

  if (loading) {
    return <main style={pageStyle}>Loading product...</main>;
  }

  if (!product) {
    return (
      <main style={pageStyle}>
        <h1 style={{ color: "#ff45d8" }}>Product Not Found</h1>
        <button
  onClick={() => window.history.back()}
  style={{
    background: "none",
    border: "none",
    color: "#00d9ff",
    cursor: "pointer",
    fontSize: 16,
    padding: 0,
    marginBottom: 20,
  }}
>
  ← Go Back
</button>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <Link href="/" style={{ color: "#00d9ff", textDecoration: "none" }}>
        ← Back to Home
      </Link>

      <section style={productLayout}>
        <div style={imageBox}>
          <Image
            src={product.image}
            alt={product.name}
            width={650}
            height={650}
            priority
            style={{
              width: "100%",
              height: "auto",
              borderRadius: 18,
              border: "1px solid #cfd3d8",
              boxShadow: "0 0 40px rgba(207,211,216,.45)",
            }}
          />
        </div>

        <div>
          <h1
            style={{
              color: "#cfd3d8",
              fontSize: 52,
              marginBottom: 10,
            }}
          >
            {product.name}
          </h1>

          <p style={{ color: "#ccc", lineHeight: 1.7, fontSize: 17 }}>
            {product.description}
          </p>

          <div style={disclaimerBox}>
            For research purposes only. Not for human or veterinary use.
          </div>
{selectedOption?.status === "pre-sale" && (
  <div
    style={{
      marginTop: 16,
      padding: 16,
      border: "1px solid #ffbf00",
      borderRadius: 10,
      background: "rgba(255,191,0,.08)",
      color: "#ffcc66",
      fontWeight: "bold",
      lineHeight: 1.6,
    }}
  >
    ⚠️ PRE-SALE ITEM
    <br />
    Estimated delivery time may take up to 2 weeks.
  </div>
)}
          <h2 style={{ color: "#00d9ff", marginTop: 30 }}>
            Select Option
          </h2>

          <div style={{ display: "grid", gap: 12 }}>
            {options.map((option) => {
              const canBuy = isOptionAvailable(option);
              const availableQuantity = getAvailableQuantity(option);
              const maxKits = Math.floor(availableQuantity / 10);

              return (
                <button
                  key={option.id}
                  onClick={() => setSelectedOption(option)}
                  disabled={!canBuy}
                  style={{
                    padding: 14,
                    borderRadius: 10,
                    cursor: canBuy ? "pointer" : "not-allowed",
                    background:
                      selectedOption?.id === option.id ? "#1b0016" : "#111",
                    color: "#fff",
                    border:
                      selectedOption?.id === option.id
                        ? `2px solid ${product.color || "#ff45d8"}`
                        : "1px solid #333",
                    opacity: canBuy ? 1 : 0.45,
                    textAlign: "left",
                    wordBreak: "break-word" as const,
                  }}
                >
                  <strong>{option.dosage}</strong> —{" "}
                  {getPurchaseLabel(option.purchase_type)}{" "}
                  — {option.sale_active && Number(option.sale_percent || 0) > 0 ? (
  <>
    <span
      style={{
        textDecoration: "line-through",
        color: "#888",
        marginRight: 8,
      }}
    >{option.sale_active && Number(option.sale_percent || 0) > 0 && (
  <div
    style={{
      display: "inline-block",
      marginBottom: 8,
      padding: "4px 10px",
      borderRadius: 999,
      background: "#00ff99",
      color: "#000",
      fontWeight: "bold",
      fontSize: 12,
    }}
  >
    SALE {option.sale_percent}% OFF
  </div>
)}
      ${Number(option.price).toFixed(2)}
    </span>

    <span style={{ color: "#00ff99", fontWeight: "bold" }}>
      $
      {(
        Number(option.price) -
        Number(option.price) * (Number(option.sale_percent) / 100)
      ).toFixed(2)}
    </span>
  </>
) : (
  <>${Number(option.price).toFixed(2)}</>
)}

                  <span
                    style={{
                      display: "block",
                      marginTop: 6,
                      color: canBuy ? "#00ff99" : "#ff4d4d",
                    }}
                  >
                    {option.purchase_type === "single"
  ? availableQuantity >= 1
    ? `${availableQuantity} vial(s) available`
    : "out of stock"
  : option.status === "pre-sale"
  ? "pre-sale"
  : `${maxKits} kit(s) available`}
                  </span>
                </button>
              );
            })}
          </div>

          <div
  style={{
    display: "flex",
    gap: 12,
    alignItems: "center",
    marginTop: 25,
  }}
>
  <button
    onClick={() =>
      setQuantity((prev) => Math.max(1, prev - 1))
    }
    style={qtyButton}
  >
    -
  </button>

  <span
    style={{
      minWidth: 40,
      textAlign: "center",
      fontWeight: "bold",
      fontSize: 18,
    }}
  >
    {quantity}
  </span>

  <button
    onClick={() => setQuantity((prev) => prev + 1)}
    style={qtyButton}
  >
    +
  </button>
</div>
{selectedOption && (
  <div
    style={{
      marginTop: 16,
      padding: 14,
      borderRadius: 10,
      border: "1px solid rgba(255,255,255,.18)",
      background: "rgba(255,255,255,.05)",
      color: "#ccc",
      lineHeight: 1.6,
      fontWeight: "bold",
    }}
  >
    {selectedOption.purchase_type === "single" ? (
      quantity > getAvailableQuantity(selectedOption) ? (
        <span style={{ color: "#ff4d4d" }}>
          Only {getAvailableQuantity(selectedOption)} vial(s) currently available.
          Please reduce quantity.
        </span>
      ) : (
        <span style={{ color: "#00ff99" }}>
          {getAvailableQuantity(selectedOption)} vial(s) currently available.
        </span>
      )
    ) : quantity > Math.floor(getAvailableQuantity(selectedOption) / 10) ? (
      <span style={{ color: "#ffcc66" }}>
        {Math.floor(getAvailableQuantity(selectedOption) / 10)} kit(s) currently in stock.
        Additional kits will be fulfilled as pre-sale and may take up to 2 weeks.
      </span>
    ) : (
      <span style={{ color: "#00ff99" }}>
        {Math.floor(getAvailableQuantity(selectedOption) / 10)} kit(s) currently available.
      </span>
    )}
  </div>
)}
<button
  onClick={handleAddToCart}
  style={addButton}
>
  Add to Cart
</button>
        </div>
      </section>
    </main>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: "#000",
  color: "#fff",
  padding: 35,
};

const productLayout = {
  maxWidth: 1300,
  margin: "35px auto",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 45,
  alignItems: "center",
};

const imageBox = {
  background: "#050505",
  borderRadius: 22,
  padding: 20,
};

const disclaimerBox = {
  marginTop: 20,
  padding: 15,
  border: "1px solid #ff45d8",
  borderRadius: 10,
  color: "#ffccff",
  background: "rgba(255,45,216,.08)",
  fontWeight: "bold",
};
const qtyButton = {
  width: 40,
  height: 40,
  borderRadius: 8,
  border: "1px solid #00d9ff",
  background: "#111",
  color: "#00d9ff",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: 18,
};
const addButton = {
  marginTop: 25,
  width: "100%",
  padding: "16px 22px",
  border: "none",
  borderRadius: 12,
  background: "linear-gradient(90deg, #00b7ff, #ff2fd0)",
  color: "#fff",
  fontWeight: "bold",
  fontSize: 18,
  cursor: "pointer",
};