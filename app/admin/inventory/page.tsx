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

type Option = {
  id: string;
  product_slug: string;
  dosage: string;
  purchase_type: string;
  price: number;
  status: string;

  sale_active: boolean;
  sale_percent: number;
};

type InventoryItem = {
  id: string;
  product_slug: string;
  dosage: string;
  purchase_type: string;
  quantity: number;
  status: string;
};

export default function InventoryManagerPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [deletedProducts, setDeletedProducts] = useState<Product[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Partial<Product>>({});

  const [options, setOptions] = useState<Option[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [showAddOption, setShowAddOption] = useState(false);

  const [newProduct, setNewProduct] = useState({
    name: "",
    slug: "",
    color: "#ff45d8",
    image: "",
    short_description: "",
    description: "",
    is_active: true,
  });

  const [newOption, setNewOption] = useState({
    dosage: "",
    purchase_type: "single",
    price: "",
    status: "in stock",
    quantity: "",
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
      await loadDeletedProducts();
      setLoading(false);
    }

    init();
  }, []);

  async function loadProducts() {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) alert(error.message);
    else setProducts(data || []);
  }

  async function loadDeletedProducts() {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", false)
      .order("name", { ascending: true });

    if (error) alert(error.message);
    else setDeletedProducts(data || []);
  }

  async function selectProduct(slug: string) {
    setSelectedSlug(slug);

    const found = products.find((p) => p.slug === slug);
    setSelectedProduct(found || {});

    if (!slug) {
      setOptions([]);
      setInventory([]);
      return;
    }

    await loadOptions(slug);
    await loadInventory(slug);
  }

  async function loadOptions(slug: string) {
    const { data, error } = await supabase
      .from("product_options")
      .select("*")
      .eq("product_slug", slug)
      .order("dosage", { ascending: true });

    if (error) alert(error.message);
    else setOptions(data || []);
  }

  async function loadInventory(slug: string) {
    const { data, error } = await supabase
      .from("inventory")
      .select("*")
      .eq("product_slug", slug)
      .order("dosage", { ascending: true });

    if (error) alert(error.message);
    else setInventory(data || []);
  }

  function updateProductField(field: keyof Product, value: string | boolean) {
    setSelectedProduct((prev) => ({ ...prev, [field]: value }));
  }

  async function saveProductChanges() {
    if (!selectedProduct.id) return alert("Select a product first.");

    const { error } = await supabase
      .from("products")
      .update({
        name: selectedProduct.name,
        slug: selectedProduct.slug,
        color: selectedProduct.color,
        image: selectedProduct.image,
        short_description: selectedProduct.short_description,
        description: selectedProduct.description,
        is_active: selectedProduct.is_active,
      })
      .eq("id", selectedProduct.id);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Product updated.");
    await loadProducts();
  }

  async function createProduct() {
    if (!newProduct.name || !newProduct.slug) {
      alert("Product name and slug are required.");
      return;
    }

    const { error } = await supabase.from("products").insert(newProduct);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Product created.");

    setNewProduct({
      name: "",
      slug: "",
      color: "#ff45d8",
      image: "",
      short_description: "",
      description: "",
      is_active: true,
    });

    setShowAddProduct(false);
    await loadProducts();
  }

  async function deleteProduct() {
    if (!selectedProduct.id || !selectedSlug) {
      alert("Select a product first.");
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${selectedProduct.name}? You can restore it later using Undo Delete.`
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("products")
      .update({ is_active: false })
      .eq("id", selectedProduct.id);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Product deleted. You can restore it from Undo Delete.");

    setSelectedSlug("");
    setSelectedProduct({});
    setOptions([]);
    setInventory([]);

    await loadProducts();
    await loadDeletedProducts();
  }

  async function restoreProduct(productId: string) {
    const { error } = await supabase
      .from("products")
      .update({ is_active: true })
      .eq("id", productId);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Product restored.");

    await loadProducts();
    await loadDeletedProducts();
  }

 async function updateOption(
  id: string,
  field: string,
  value: string | number | boolean
) {
    const { error } = await supabase
      .from("product_options")
      .update({ [field]: value })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    if (selectedSlug) await loadOptions(selectedSlug);
  }

  async function updateInventory(id: string, quantity: number) {
    const safeQuantity = Math.max(0, Number(quantity));

    const { error } = await supabase
      .from("inventory")
      .update({
        quantity: safeQuantity,
        status: safeQuantity > 0 ? "in stock" : "pre-sale",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    if (selectedSlug) await loadInventory(selectedSlug);
  }

  async function addOptionAndInventory() {
    if (!selectedSlug) return alert("Select a product first.");

    if (!newOption.dosage || !newOption.price) {
      alert("Dosage and price are required.");
      return;
    }

    const { error: optionError } = await supabase.from("product_options").insert({
      product_slug: selectedSlug,
      dosage: newOption.dosage,
      purchase_type: newOption.purchase_type,
      price: Number(newOption.price),
      status: newOption.status,
    });

    if (optionError) {
      alert(optionError.message);
      return;
    }

    if (newOption.purchase_type === "single") {
      const { error: inventoryError } = await supabase.from("inventory").insert({
        product_slug: selectedSlug,
        dosage: newOption.dosage,
        purchase_type: "single",
        quantity: Number(newOption.quantity || 0),
        status:
          Number(newOption.quantity || 0) > 0 ? "in stock" : "pre-sale",
      });

      if (inventoryError) {
        alert(inventoryError.message);
        return;
      }
    }

    setNewOption({
      dosage: "",
      purchase_type: "single",
      price: "",
      status: "in stock",
      quantity: "",
    });

    setShowAddOption(false);

    await loadOptions(selectedSlug);
    await loadInventory(selectedSlug);
  }

  function getInventoryForOption(option: Option) {
  return inventory.find(
    (row) =>
      row.product_slug === option.product_slug &&
      row.dosage === option.dosage &&
      (row.purchase_type === "single" || row.purchase_type === "kit")
  );
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
      <h1 style={{ color: "#ff45d8" }}>Inventory / Products / Pricing</h1>

      <section style={box}>
        <div style={topControls}>
          <div style={{ flex: 1 }}>
            <h2 style={{ color: "#00d9ff" }}>Select Product</h2>

            <select
              value={selectedSlug}
              onChange={(e) => selectProduct(e.target.value)}
              style={input}
            >
              <option value="">-- Select Product --</option>
              {products.map((product) => (
                <option key={product.id} value={product.slug}>
                  {product.name} / {product.slug}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setShowAddProduct(!showAddProduct)}
            style={plusButton}
          >
            + Add Product
          </button>

          <button
            type="button"
            onClick={() => setShowDeleted(!showDeleted)}
            style={restoreButton}
          >
            Undo Delete
          </button>
        </div>
      </section>

      {showDeleted && (
        <section style={box}>
          <h2 style={{ color: "#00d9ff" }}>Restore Deleted Products</h2>

          {deletedProducts.length === 0 ? (
            <p style={{ color: "#ccc" }}>No deleted products found.</p>
          ) : (
            deletedProducts.map((product) => (
              <div key={product.id} style={restoreRow}>
                <span>
                  {product.name} / {product.slug}
                </span>

                <button
                  type="button"
                  onClick={() => restoreProduct(product.id)}
                  style={restoreButton}
                >
                  Restore
                </button>
              </div>
            ))
          )}
        </section>
      )}

      {showAddProduct && (
        <section style={box}>
          <h2 style={{ color: "#00d9ff" }}>Add New Product</h2>

          <input
            placeholder="Product Name"
            value={newProduct.name}
            onChange={(e) =>
              setNewProduct({ ...newProduct, name: e.target.value })
            }
            style={input}
          />

          <input
            placeholder="Slug example: tirzepatide"
            value={newProduct.slug}
            onChange={(e) =>
              setNewProduct({ ...newProduct, slug: e.target.value })
            }
            style={input}
          />

          <input
            placeholder="Image Path example: /tirzepatide.png"
            value={newProduct.image}
            onChange={(e) =>
              setNewProduct({ ...newProduct, image: e.target.value })
            }
            style={input}
          />

          <label style={label}>Color</label>
          <input
            type="color"
            value={newProduct.color}
            onChange={(e) =>
              setNewProduct({ ...newProduct, color: e.target.value })
            }
            style={colorInput}
          />

          <textarea
            placeholder="Short Description"
            value={newProduct.short_description}
            onChange={(e) =>
              setNewProduct({
                ...newProduct,
                short_description: e.target.value,
              })
            }
            style={textarea}
          />

          <textarea
            placeholder="Full Description"
            value={newProduct.description}
            onChange={(e) =>
              setNewProduct({ ...newProduct, description: e.target.value })
            }
            style={bigTextarea}
          />

          <button type="button" onClick={createProduct} style={button}>
            Save New Product
          </button>
        </section>
      )}
<section style={box}>
            <div style={tableHeader}>
              <h2 style={{ color: "#00d9ff", margin: 0 }}>
                Pricing / Inventory
              </h2>

              <button
                type="button"
                onClick={() => setShowAddOption(!showAddOption)}
                style={plusButton}
              >
                + Add Dosage
              </button>
            </div>

            {showAddOption && (
              <div style={addOptionBox}>
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

                <input
                  placeholder="Inventory Qty"
                  type="number"
                  value={newOption.quantity}
                  onChange={(e) =>
                    setNewOption({ ...newOption, quantity: e.target.value })
                  }
                  style={input}
                />

                <button
                  type="button"
                  onClick={addOptionAndInventory}
                  style={button}
                >
                  Save New Option
                </button>
              </div>
            )}

            <p style={{ color: "#aaa" }}>
              Kit availability is calculated from single vial inventory. Example:
              25 vials = 2 kits available.
            </p>

            {options.length === 0 ? (
              <p style={{ color: "#ccc" }}>No pricing options found.</p>
            ) : (
              <div style={tableWrapper}>
                <table style={table}>
                  <thead>
                    <tr>
                      <th style={th}>Dosage</th>
                      <th style={th}>Type</th>
                      <th style={th}>Price</th>
                      <th style={th}>Status</th>
<th style={th}>Sale Active</th>
<th style={th}>Sale %</th>
<th style={th}>Inventory</th>
                      <th style={th}>Kits</th>
                      <th style={th}>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {options.map((option) => {
                      const inv = getInventoryForOption(option);

                      return (
                        <tr
                          key={option.id}
                          style={{ borderBottom: "1px solid #333" }}
                        >
                          <td style={td}>
                            <input
                              defaultValue={option.dosage}
                              onBlur={(e) =>
                                updateOption(
                                  option.id,
                                  "dosage",
                                  e.target.value
                                )
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
                                updateOption(
                                  option.id,
                                  "status",
                                  e.target.value
                                )
                              }
                              style={smallInput}
                            >
                              <option value="in stock">in stock</option>
                              <option value="pre-sale">pre-sale</option>
                              
                            </select>
                          </td>
<td style={td}>
  <input
    type="checkbox"
    checked={option.sale_active || false}
    onChange={(e) =>
      updateOption(
        option.id,
        "sale_active",
        e.target.checked,
      )
    }
  />
</td>

<td style={td}>
  <input
    type="number"
    defaultValue={option.sale_percent || 0}
    onBlur={(e) =>
      updateOption(
        option.id,
        "sale_percent",
        Number(e.target.value)
      )
    }
    style={smallInput}
  />
</td>
                          <td style={td}>
                            {inv ? (
                              <input
                                type="number"
                                value={inv.quantity}
                                onChange={(e) =>
                                  setInventory((prev) =>
                                    prev.map((row) =>
                                      row.id === inv.id
                                        ? {
                                            ...row,
                                            quantity: Number(e.target.value),
                                          }
                                        : row
                                    )
                                  )
                                }
                                style={smallInput}
                              />
                            ) : (
                              <span style={{ color: "#888" }}>
                                No inventory row
                              </span>
                            )}
                          </td>

                          <td style={td}>
                            {inv ? Math.floor(inv.quantity / 10) : "-"}
                          </td>

                          <td style={td}>
                            {inv ? (
                              <>
                                <button
                                  type="button"
                                  style={button}
                                  onClick={() =>
                                    updateInventory(inv.id, inv.quantity)
                                  }
                                >
                                  Save
                                </button>

                                <button
                                  type="button"
                                  style={minusButton}
                                  onClick={() =>
                                    updateInventory(inv.id, inv.quantity - 1)
                                  }
                                >
                                  -1
                                </button>

                                <button
                                  type="button"
                                  style={plusButtonSmall}
                                  onClick={() =>
                                    updateInventory(inv.id, inv.quantity + 1)
                                  }
                                >
                                  +1
                                </button>
                              </>
                            ) : (
                              <span style={{ color: "#888" }}>N/A</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
      {selectedSlug && (
        <>
          <section style={box}>
            <h2 style={{ color: "#00d9ff" }}>Edit Product Details</h2>

            <input
              value={selectedProduct.name || ""}
              onChange={(e) => updateProductField("name", e.target.value)}
              style={input}
            />

            <input
              value={selectedProduct.slug || ""}
              onChange={(e) => updateProductField("slug", e.target.value)}
              style={input}
            />

            <input
              value={selectedProduct.image || ""}
              onChange={(e) => updateProductField("image", e.target.value)}
              style={input}
            />

            <label style={label}>Color</label>
            <input
              type="color"
              value={selectedProduct.color || "#ff45d8"}
              onChange={(e) => updateProductField("color", e.target.value)}
              style={colorInput}
            />

            <textarea
              value={selectedProduct.short_description || ""}
              onChange={(e) =>
                updateProductField("short_description", e.target.value)
              }
              style={textarea}
            />

            <textarea
              value={selectedProduct.description || ""}
              onChange={(e) =>
                updateProductField("description", e.target.value)
              }
              style={bigTextarea}
            />

            <label style={checkboxRow}>
              <input
                type="checkbox"
                checked={selectedProduct.is_active ?? true}
                onChange={(e) =>
                  updateProductField("is_active", e.target.checked)
                }
              />
              Active / show on site
            </label>

            <button type="button" onClick={saveProductChanges} style={button}>
              Save Product Changes
            </button>

            <button type="button" onClick={deleteProduct} style={deleteButton}>
              Delete Product
            </button>
          </section>

          
        </>
      )}
    </main>
  );
}

const page = {
  minHeight: "100vh",
  color: "#fff",
  padding: 35,
  backgroundImage:
    "linear-gradient(rgba(0,0,0,.62), rgba(0,0,0,.78)), url('/admin-bg.png')",
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundAttachment: "fixed",
};

const box = {
  marginTop: 25,
  padding: 22,
  border: "1px solid rgba(255,255,255,.18)",
  borderRadius: 16,
  background: "rgba(0,0,0,.58)",
  backdropFilter: "blur(8px)",
  boxShadow: "0 0 28px rgba(0,217,255,.14)",
};

const topControls = {
  display: "flex",
  justifyContent: "space-between",
  gap: 15,
  alignItems: "flex-end",
  flexWrap: "wrap" as const,
};

const tableHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 15,
  marginBottom: 15,
};

const addOptionBox = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 14,
  marginBottom: 20,
  padding: 16,
  border: "1px solid rgba(255,255,255,.18)",
  borderRadius: 12,
  background: "rgba(255,255,255,.04)",
};

const input = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: 12,
  marginBottom: 12,
  background: "rgba(0,0,0,.62)",
  color: "#fff",
  border: "1px solid rgba(255,255,255,.22)",
  borderRadius: 8,
};

const colorInput = {
  width: "100%",
  height: 55,
  marginBottom: 12,
  background: "rgba(0,0,0,.62)",
  border: "1px solid rgba(255,255,255,.22)",
  borderRadius: 8,
};

const textarea = {
  width: "100%",
  boxSizing: "border-box" as const,
  minHeight: 100,
  marginBottom: 12,
  padding: 12,
  background: "rgba(0,0,0,.62)",
  color: "#fff",
  border: "1px solid rgba(255,255,255,.22)",
  borderRadius: 8,
};

const bigTextarea = {
  ...textarea,
  minHeight: 220,
};

const label = {
  display: "block",
  color: "#ccc",
  marginBottom: 6,
};

const checkboxRow = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  marginBottom: 18,
  color: "#ccc",
};

const button = {
  padding: "10px 14px",
  marginRight: 8,
  borderRadius: 8,
  border: "1px solid #00d9ff",
  background: "rgba(0,27,34,.85)",
  color: "#00d9ff",
  fontWeight: "bold",
  cursor: "pointer",
};

const plusButton = {
  padding: "12px 18px",
  borderRadius: 10,
  border: "1px solid #00ff99",
  background: "rgba(0,34,0,.85)",
  color: "#00ff99",
  fontWeight: "bold",
  cursor: "pointer",
};

const restoreButton = {
  padding: "12px 18px",
  borderRadius: 10,
  border: "1px solid #cfd3d8",
  background: "rgba(20,20,20,.85)",
  color: "#cfd3d8",
  fontWeight: "bold",
  cursor: "pointer",
};

const plusButtonSmall = {
  ...button,
  border: "1px solid #00ff99",
  background: "rgba(0,34,0,.85)",
  color: "#00ff99",
};

const minusButton = {
  ...button,
  border: "1px solid #ff4d4d",
  background: "rgba(34,0,0,.85)",
  color: "#ff4d4d",
};

const deleteButton = {
  ...button,
  border: "1px solid #ff4d4d",
  background: "rgba(34,0,0,.85)",
  color: "#ff4d4d",
};

const tableWrapper = {
  width: "100%",
  overflowX: "auto" as const,
};

const table = {
  width: "100%",
  minWidth: 980,
  borderCollapse: "collapse" as const,
};

const th = {
  textAlign: "left" as const,
  color: "#00d9ff",
  padding: 10,
};

const td = {
  padding: 10,
  verticalAlign: "middle" as const,
};

const smallInput = {
  width: "100%",
  minWidth: 110,
  boxSizing: "border-box" as const,
  padding: 8,
  background: "rgba(0,0,0,.65)",
  color: "#fff",
  border: "1px solid rgba(255,255,255,.22)",
  borderRadius: 6,
};

const restoreRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  padding: "12px 0",
  borderBottom: "1px solid rgba(255,255,255,.18)",
};