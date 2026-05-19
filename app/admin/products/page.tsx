"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabaseClient";

const ADMIN_EMAIL = "pugpep99@gmail.com";

type Product = {
  id: string;
  name: string;
  slug: string;
  color: string;
  image: string;
  short_description: string;
  description: string;
  is_active: boolean;
};

type ProductOption = {
  id: string;
  product_slug: string;
  dosage: string;
  purchase_type: string;
  price: number;
  status: string;
};

export default function AdminProductsPage() {
  const supabase = createClient();

  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [product, setProduct] = useState<Partial<Product>>({});
  const [options, setOptions] = useState<ProductOption[]>([]);

  const [newOption, setNewOption] = useState({
    dosage: "",
    purchase_type: "single",
    price: "",
    status: "in stock",
  });

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email;

      if (!email || email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
        setAuthorized(false);
        setLoading(false);
        return;
      }

      setAuthorized(true);
      await loadProducts();
      setLoading(false);
    }

    init();
  }, []);

  async function loadProducts() {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("name", { ascending: true });

    if (error) alert(error.message);
    else setProducts(data || []);
  }

  async function loadOptions(productSlug: string) {
    const { data, error } = await supabase
      .from("product_options")
      .select("*")
      .eq("product_slug", productSlug)
      .order("dosage", { ascending: true });

    if (error) alert(error.message);
    else setOptions(data || []);
  }

  async function selectProduct(id: string) {
    setSelectedId(id);

    const found = products.find((p) => p.id === id);

    if (found) {
      setProduct(found);
      await loadOptions(found.slug);
    } else {
      setProduct({});
      setOptions([]);
    }
  }

  function updateField(field: keyof Product, value: string | boolean) {
    setProduct((prev) => ({ ...prev, [field]: value }));
  }

  async function saveProduct() {
    if (!product.name || !product.slug) {
      alert("Product name and slug are required.");
      return;
    }

    if (selectedId) {
      const { error } = await supabase
        .from("products")
        .update({
          name: product.name,
          slug: product.slug,
          color: product.color,
          image: product.image,
          short_description: product.short_description,
          description: product.description,
          is_active: product.is_active,
        })
        .eq("id", selectedId);

      if (error) {
        alert(error.message);
        return;
      }

      alert("Product updated.");
    } else {
      const { error } = await supabase.from("products").insert({
        name: product.name,
        slug: product.slug,
        color: product.color || "#ff45d8",
        image: product.image || "",
        short_description: product.short_description || "",
        description: product.description || "",
        is_active: product.is_active ?? true,
      });

      if (error) {
        alert(error.message);
        return;
      }

      alert("Product created.");
    }

    setProduct({});
    setSelectedId("");
    setOptions([]);
    await loadProducts();
  }

  async function updateOption(id: string, field: string, value: string | number) {
    const { error } = await supabase
      .from("product_options")
      .update({ [field]: value })
      .eq("id", id);

    if (error) {
      alert(error.message);
    } else if (product.slug) {
      await loadOptions(product.slug);
    }
  }

  async function addOption() {
    if (!product.slug) {
      alert("Select or save a product first.");
      return;
    }

    if (!newOption.dosage || !newOption.price) {
      alert("Enter dosage and price.");
      return;
    }

    const { error } = await supabase.from("product_options").insert({
      product_slug: product.slug,
      dosage: newOption.dosage,
      purchase_type: newOption.purchase_type,
      price: Number(newOption.price),
      status: newOption.status,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setNewOption({
      dosage: "",
      purchase_type: "single",
      price: "",
      status: "in stock",
    });

    await loadOptions(product.slug);
  }

  function newProduct() {
    setSelectedId("");
    setOptions([]);
    setProduct({
      name: "",
      slug: "",
      color: "#ff45d8",
      image: "",
      short_description: "",
      description: "",
      is_active: true,
    });
  }

  if (loading) return <main style={page}>Loading...</main>;

  if (!authorized) {
    return (
      <main style={page}>
        <h1 style={{ color: "#ff45d8" }}>Access Denied</h1>
        <p>You must be logged in as admin.</p>
      </main>
    );
  }

  return (
    <main style={page}>
      <h1 style={{ color: "#ff45d8" }}>Product Manager</h1>

      <section style={box}>
        <h2 style={{ color: "#00d9ff" }}>Select Product</h2>

        <select
          value={selectedId}
          onChange={(e) => selectProduct(e.target.value)}
          style={input}
        >
          <option value="">-- Add New Product --</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} / {p.slug}
            </option>
          ))}
        </select>

        <button onClick={newProduct} style={secondaryButton}>
          Start New Product
        </button>
      </section>

      <section style={box}>
        <h2 style={{ color: "#00d9ff" }}>
          {selectedId ? "Edit Product" : "Add Product"}
        </h2>

        <input
          placeholder="Product Name"
          value={product.name || ""}
          onChange={(e) => updateField("name", e.target.value)}
          style={input}
        />

        <input
          placeholder="Slug, example: tirzepatide"
          value={product.slug || ""}
          onChange={(e) => updateField("slug", e.target.value)}
          style={input}
        />

        <input
          placeholder="Image Path, example: /tirzepatide.png"
          value={product.image || ""}
          onChange={(e) => updateField("image", e.target.value)}
          style={input}
        />

        <label style={{ color: "#ccc" }}>Color</label>
        <input
          type="color"
          value={product.color || "#ff45d8"}
          onChange={(e) => updateField("color", e.target.value)}
          style={colorInput}
        />

        <textarea
          placeholder="Short Description"
          value={product.short_description || ""}
          onChange={(e) => updateField("short_description", e.target.value)}
          style={textarea}
        />

        <textarea
          placeholder="Full Description"
          value={product.description || ""}
          onChange={(e) => updateField("description", e.target.value)}
          style={bigTextarea}
        />

        <label style={checkboxRow}>
          <input
            type="checkbox"
            checked={product.is_active ?? true}
            onChange={(e) => updateField("is_active", e.target.checked)}
          />
          Active / show on site
        </label>

        <button onClick={saveProduct} style={button}>
          {selectedId ? "Save Product Changes" : "Create Product"}
        </button>
      </section>

      <section style={box}>
        <h2 style={{ color: "#00d9ff" }}>Product Pricing / Options</h2>

        {!product.slug ? (
          <p style={{ color: "#ccc" }}>Save or select a product first.</p>
        ) : (
          <>
            <div style={optionGrid}>
              <input
                placeholder="Dosage"
                value={newOption.dosage}
                onChange={(e) =>
                  setNewOption({ ...newOption, dosage: e.target.value })
                }
                style={input}
              />

              <select
                value={newOption.purchase_type}
                onChange={(e) =>
                  setNewOption({
                    ...newOption,
                    purchase_type: e.target.value,
                  })
                }
                style={input}
              >
                <option value="single">single</option>
                <option value="kit">kit</option>
              </select>

              <input
                placeholder="Price"
                type="number"
                value={newOption.price}
                onChange={(e) =>
                  setNewOption({ ...newOption, price: e.target.value })
                }
                style={input}
              />

              <select
                value={newOption.status}
                onChange={(e) =>
                  setNewOption({ ...newOption, status: e.target.value })
                }
                style={input}
              >
                <option value="in stock">in stock</option>
                <option value="pre-sale">pre-sale</option>
                
              </select>

              <button onClick={addOption} style={button}>
                Add Option
              </button>
            </div>

            {options.length === 0 ? (
              <p style={{ color: "#888" }}>No pricing options yet.</p>
            ) : (
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>Dosage</th>
                    <th style={th}>Type</th>
                    <th style={th}>Price</th>
                    <th style={th}>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {options.map((option) => (
                    <tr
                      key={option.id}
                      style={{ borderBottom: "1px solid #333" }}
                    >
                      <td style={td}>
                        <input
                          defaultValue={option.dosage}
                          onBlur={(e) =>
                            updateOption(option.id, "dosage", e.target.value)
                          }
                          style={smallInput}
                        />
                      </td>

                      <td style={td}>
                        <select
                          defaultValue={option.purchase_type}
                          onChange={(e) =>
                            updateOption(
                              option.id,
                              "purchase_type",
                              e.target.value
                            )
                          }
                          style={smallInput}
                        >
                          <option value="single">single</option>
                          <option value="kit">kit</option>
                        </select>
                      </td>

                      <td style={td}>
                        <input
                          type="number"
                          defaultValue={option.price}
                          onBlur={(e) =>
                            updateOption(
                              option.id,
                              "price",
                              Number(e.target.value)
                            )
                          }
                          style={smallInput}
                        />
                      </td>

                      <td style={td}>
                        <select
                          defaultValue={option.status}
                          onChange={(e) =>
                            updateOption(option.id, "status", e.target.value)
                          }
                          style={smallInput}
                        >
                          <option value="in stock">in stock</option>
                          <option value="pre-sale">pre-sale</option>
                          
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </section>
    </main>
  );
}

const page = {
  minHeight: "100vh",
  background: "#000",
  color: "#fff",
  padding: 35,
};

const box = {
  marginTop: 25,
  padding: 22,
  border: "1px solid #333",
  borderRadius: 14,
  background: "#080808",
};

const input = {
  display: "block",
  width: "100%",
  marginBottom: 12,
  padding: 12,
  background: "#111",
  color: "#fff",
  border: "1px solid #333",
  borderRadius: 8,
};

const colorInput = {
  display: "block",
  width: "100%",
  height: 55,
  marginBottom: 12,
  borderRadius: 8,
  border: "1px solid #333",
  background: "#111",
};

const textarea = {
  width: "100%",
  minHeight: 100,
  marginBottom: 12,
  padding: 14,
  borderRadius: 10,
  border: "1px solid #333",
  background: "#111",
  color: "#fff",
};

const bigTextarea = {
  width: "100%",
  minHeight: 220,
  marginBottom: 12,
  padding: 14,
  borderRadius: 10,
  border: "1px solid #333",
  background: "#111",
  color: "#fff",
};

const checkboxRow = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  marginBottom: 18,
  color: "#ccc",
};

const button = {
  padding: "14px 20px",
  border: "none",
  borderRadius: 10,
  background: "linear-gradient(90deg, #00b7ff, #ff2fd0)",
  color: "#fff",
  fontWeight: "bold",
  cursor: "pointer",
};

const secondaryButton = {
  padding: "12px 18px",
  borderRadius: 10,
  background: "#111",
  color: "#00d9ff",
  border: "1px solid #00d9ff",
  cursor: "pointer",
};

const optionGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr 1fr auto",
  gap: 12,
  marginBottom: 20,
};

const table = {
  width: "100%",
  borderCollapse: "collapse" as const,
};

const th = {
  textAlign: "left" as const,
  color: "#00d9ff",
  padding: 10,
};

const td = {
  padding: 10,
};

const smallInput = {
  padding: 8,
  background: "#111",
  color: "#fff",
  border: "1px solid #333",
  borderRadius: 6,
};