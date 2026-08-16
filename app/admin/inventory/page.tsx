"use client";

import { useEffect, useMemo, useState } from "react";
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
  storage?: string | null;
  category: string;
  is_active: boolean;
  deleted_at?: string | null;
};

type Option = {
  id: string;
  product_slug: string;
  dosage: string;
  purchase_type: string;
  price: number;
  cost: number;
  status: string;
  sale_active: boolean;
  sale_percent: number;
  is_active: boolean;
  archived_at?: string | null;
  bundle_discount_enabled: boolean;
  bundle_qty_1: number;
  bundle_discount_1: number;
  bundle_qty_2: number;
  bundle_discount_2: number;
  bundle_qty_3: number;
  bundle_discount_3: number;
};

type PricingDraft = {
  price: string;
  cost: string;
  salePercent: string;
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
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [deletedProducts, setDeletedProducts] = useState<Product[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Partial<Product>>({});

  const [options, setOptions] = useState<Option[]>([]);
  const [pricingDrafts, setPricingDrafts] = useState<Record<string, PricingDraft>>({});
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [showAddOption, setShowAddOption] = useState(false);

  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [imageUploading, setImageUploading] = useState(false);


  const emptyNewOption = {
    dosage: "",
    purchase_type: "single",
    price: "",
    cost: "",
    status: "in stock",
    quantity: "",
  };

  const [newProduct, setNewProduct] = useState({
  name: "",
  slug: "",
  color: "#ff45d8",
  image: "",
  short_description: "",
  description: "",
  storage: "",
  category: "peptide",
  is_active: true,
});

  const [newOption, setNewOption] = useState(emptyNewOption);

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

  function getSingleStatus(quantity: number) {
    return quantity > 0 ? "in stock" : "out of stock";
  }

  function getKitStatus(quantity: number) {
    return quantity >= 10 ? "in stock" : "pre-sale";
  }

  async function loadProducts() {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .is("deleted_at", null)
      .order("name", { ascending: true });

    if (error) alert(error.message);
    else setProducts(data || []);
  }

  async function loadDeletedProducts() {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .not("deleted_at", "is", null)
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

    if (error) {
      alert(error.message);
      return;
    }

    const rows = (data || []) as Option[];

    setOptions(rows);

    setPricingDrafts(
      Object.fromEntries(
        rows.map((option) => [
          option.id,
          {
            price: String(option.price ?? 0),
            cost: String(option.cost ?? 0),
            salePercent: String(option.sale_percent ?? 0),
          },
        ])
      )
    );
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

  async function uploadProductImage(file: File) {
    if (!selectedProduct.id || !selectedProduct.slug) {
      alert("Select a product first.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }

    const maxFileSize = 5 * 1024 * 1024;

    if (file.size > maxFileSize) {
      alert("Product images must be 5 MB or smaller.");
      return;
    }

    setImageUploading(true);

    try {
      const extension =
        file.name.split(".").pop()?.toLowerCase() || "png";

      const safeSlug = String(selectedProduct.slug)
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/g, "-")
        .replace(/^-+|-+$/g, "");

      const objectPath =
        `products/${safeSlug}-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(objectPath, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(objectPath);

      const publicUrl = publicUrlData.publicUrl;

      if (!publicUrl) {
        throw new Error("Supabase did not return a public image URL.");
      }

      const { error: productError } = await supabase
        .from("products")
        .update({
          image: publicUrl,
        })
        .eq("id", selectedProduct.id);

      if (productError) {
        throw productError;
      }

      setSelectedProduct((previous) => ({
        ...previous,
        image: publicUrl,
      }));

      setProducts((previous) =>
        previous.map((product) =>
          product.id === selectedProduct.id
            ? {
                ...product,
                image: publicUrl,
              }
            : product
        )
      );

      setNotice("Product image uploaded and updated on the website.");
    } catch (error) {
      console.error("Product image upload failed:", error);

      alert(
        error instanceof Error
          ? error.message
          : "The product image could not be uploaded."
      );
    } finally {
      setImageUploading(false);
    }
  }

  async function saveProductChanges() {
    if (!selectedProduct.id) return alert("Select a product first.");

    const { error } = await supabase
      .from("products")
      .update({
  name: selectedProduct.name,
  slug: selectedProduct.slug,
  category: selectedProduct.category,
  color: selectedProduct.color,
  image: selectedProduct.image,
  short_description: selectedProduct.short_description,
  description: selectedProduct.description,
})
      .eq("id", selectedProduct.id);

    if (error) {
      alert(error.message);
      return;
    }

    setNotice("Product updated.");
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

    setNotice("Product created.");

    setNewProduct({
  name: "",
  slug: "",
  color: "#ff45d8",
  image: "",
  short_description: "",
  description: "",
  storage: "",
  category: "peptide",
  is_active: true,
});
    setShowAddProduct(false);
    await loadProducts();
  }

  async function restoreProduct(productId: string) {
    const { error } = await supabase
      .from("products")
      .update({
        deleted_at: null,
        is_active: true,
      })
      .eq("id", productId);

    if (error) {
      alert(error.message);
      return;
    }

    setNotice("Archived product restored.");

    await loadProducts();
    await loadDeletedProducts();
  }

  function updatePricingDraft(
    optionId: string,
    patch: Partial<PricingDraft>
  ) {
    setPricingDrafts((previous) => ({
      ...previous,
      [optionId]: {
        price: previous[optionId]?.price ?? "0",
        cost: previous[optionId]?.cost ?? "0",
        salePercent: previous[optionId]?.salePercent ?? "0",
        ...patch,
      },
    }));
  }

  function updateOptionLocal(
    optionId: string,
    patch: Partial<Option>
  ) {
    setOptions((previous) =>
      previous.map((row) =>
        row.id === optionId
          ? {
              ...row,
              ...patch,
            }
          : row
      )
    );
  }

  async function setOptionActive(
    optionId: string,
    nextActive: boolean
  ) {
    const option = options.find((row) => row.id === optionId);

    if (!option) {
      alert("Option not found.");
      return;
    }

    if (option.archived_at) {
      alert("Restore this option before making it active.");
      return;
    }

    updateOptionLocal(optionId, {
      is_active: nextActive,
    });

    const { error } = await supabase
      .from("product_options")
      .update({ is_active: nextActive })
      .eq("id", optionId);

    if (error) {
      alert(error.message);
      await loadOptions(selectedSlug);
      return;
    }

    setNotice(
      nextActive
        ? `${option.dosage} ${option.purchase_type} is active and visible to customers.`
        : `${option.dosage} ${option.purchase_type} is inactive and hidden from customers.`
    );
  }

  async function archiveOption(optionId: string) {
    const option = options.find((row) => row.id === optionId);

    if (!option) {
      alert("Option not found.");
      return;
    }

    const confirmed = window.confirm(
      `Archive ${option.dosage} ${option.purchase_type}?\n\nOnly this exact option will be archived. Other dosages, singles, and kits will not be changed.`
    );

    if (!confirmed) return;

    const archivedAt = new Date().toISOString();

    const { error } = await supabase
      .from("product_options")
      .update({
        is_active: false,
        archived_at: archivedAt,
        sale_active: false,
      })
      .eq("id", optionId);

    if (error) {
      alert(error.message);
      return;
    }

    updateOptionLocal(optionId, {
      is_active: false,
      archived_at: archivedAt,
      sale_active: false,
    });

    setNotice(
      `${option.dosage} ${option.purchase_type} archived. No other option was changed.`
    );
  }

  async function restoreOption(optionId: string) {
    const option = options.find((row) => row.id === optionId);

    if (!option) {
      alert("Option not found.");
      return;
    }

    const { error } = await supabase
      .from("product_options")
      .update({
        archived_at: null,
        is_active: false,
      })
      .eq("id", optionId);

    if (error) {
      alert(error.message);
      return;
    }

    updateOptionLocal(optionId, {
      archived_at: null,
      is_active: false,
    });

    setNotice(
      `${option.dosage} ${option.purchase_type} restored. Check Active Product when you want it visible to customers.`
    );
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

    const inventoryRow = inventory.find((row) => row.id === id);

    if (!inventoryRow) {
      alert("Inventory row not found.");
      return;
    }

    const singleStatus = getSingleStatus(safeQuantity);
    const kitStatus = getKitStatus(safeQuantity);

    const { error: inventoryError } = await supabase
      .from("inventory")
      .update({
        quantity: safeQuantity,
        status: singleStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (inventoryError) {
      alert(inventoryError.message);
      return;
    }

    const { error: singleError } = await supabase
      .from("product_options")
      .update({ status: singleStatus })
      .eq("product_slug", inventoryRow.product_slug)
      .eq("dosage", inventoryRow.dosage)
      .eq("purchase_type", "single");

    if (singleError) {
      alert(singleError.message);
      return;
    }

    const { error: kitError } = await supabase
      .from("product_options")
      .update({ status: kitStatus })
      .eq("product_slug", inventoryRow.product_slug)
      .eq("dosage", inventoryRow.dosage)
      .eq("purchase_type", "kit");

    if (kitError) {
      alert(kitError.message);
      return;
    }

    if (selectedSlug) {
      await loadOptions(selectedSlug);
      await loadInventory(selectedSlug);
    }
  }

  async function addOptionAndInventory() {
    if (!selectedSlug) {
      alert("Select a product first.");
      return;
    }

    if (!newOption.dosage || !newOption.price) {
      alert("Dosage and price are required.");
      return;
    }

    const qty = Math.max(0, Number(newOption.quantity || 0));

    const autoStatus =
      newOption.purchase_type === "kit"
        ? getKitStatus(qty)
        : getSingleStatus(qty);

    const { error: optionError } = await supabase.from("product_options").insert({
      product_slug: selectedSlug,
      dosage: newOption.dosage,
      purchase_type: newOption.purchase_type,
      price: Number(newOption.price),
      cost: Number(newOption.cost || 0),
      status: autoStatus,
      sale_active: false,
      sale_percent: 0,
      is_active: true,
      archived_at: null,
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
        quantity: qty,
        status: getSingleStatus(qty),
      });

      if (inventoryError) {
        alert(inventoryError.message);
        return;
      }

      await supabase
        .from("product_options")
        .update({ status: getKitStatus(qty) })
        .eq("product_slug", selectedSlug)
        .eq("dosage", newOption.dosage)
        .eq("purchase_type", "kit");
    }

    setNewOption(emptyNewOption);
    setShowAddOption(false);

    await loadOptions(selectedSlug);
    await loadInventory(selectedSlug);
  }

  function getInventoryForOption(option: Option) {
    return inventory.find(
      (row) =>
        row.product_slug === option.product_slug &&
        row.dosage === option.dosage &&
        row.purchase_type === "single"
    );
  }

  const filteredProducts = products.filter((product) => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return true;
    }

    return (
      product.name.toLowerCase().includes(query) ||
      product.slug.toLowerCase().includes(query) ||
      String(product.category || "").toLowerCase().includes(query)
    );
  });

  const totalOptions = options.length;

  const totalSingleInventory = inventory.reduce(
    (sum, row) => sum + Math.max(0, Number(row.quantity || 0)),
    0
  );

  const preSaleOptions = options.filter(
    (option) => option.status === "pre-sale"
  ).length;

  const saleOptions = options.filter(
    (option) =>
      option.is_active !== false &&
      !option.archived_at &&
      option.sale_active &&
      Number(option.sale_percent || 0) > 0
  ).length;

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
      <div style={container}>
        <header style={pageHeader}>
          <div>
            <p style={eyebrow}>CONTROL CENTER</p>

            <h1 style={pageTitle}>
              Laboratory Inventory
            </h1>

            <p style={subtitle}>
              Manage compounds, pricing, costs, availability, and inventory from one workspace.
            </p>
          </div>

          <div style={headerActions}>
            <button
              type="button"
              onClick={() => setShowAddProduct((current) => !current)}
              style={primaryButton}
            >
              + New Product
            </button>

            <button
              type="button"
              onClick={() => setShowDeleted((current) => !current)}
              style={secondaryButton}
            >
              Archived Products
            </button>
          </div>
        </header>

        {notice && (
          <div style={noticeBanner}>
            <span>{notice}</span>

            <button
              type="button"
              onClick={() => setNotice("")}
              style={noticeClose}
            >
              ×
            </button>
          </div>
        )}

        <section style={statsGrid}>
          <StatCard
            label="Active Products"
            value={String(products.filter((product) => product.is_active).length)}
            accent="#00d9ff"
          />

          <StatCard
            label="Archived Products"
            value={String(deletedProducts.length)}
            accent="#b8bcc4"
          />

          <StatCard
            label="Selected Options"
            value={String(totalOptions)}
            accent="#ff45d8"
          />

          <StatCard
            label="Single Units"
            value={String(totalSingleInventory)}
            accent="#00ff99"
          />

          <StatCard
            label="Pre-Sale Options"
            value={String(preSaleOptions)}
            accent="#ffcc00"
          />

          <StatCard
            label="Sale Options"
            value={String(saleOptions)}
            accent="#ff75df"
          />
        </section>

        <div className="inventory-layout" style={workspace}>
          <aside style={sidebar}>
            <div style={sidebarHeader}>
              <div>
                <p style={sectionEyebrow}>CATALOG</p>
                <h2 style={sectionTitle}>Products</h2>
              </div>

              <span style={countBadge}>
                {filteredProducts.length}
              </span>
            </div>

            <input
              type="search"
              placeholder="Search products..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={searchInput}
            />

            <div style={productList}>
              {filteredProducts.length === 0 ? (
                <p style={muted}>No matching products found.</p>
              ) : (
                filteredProducts.map((product) => {
                  const selected = selectedSlug === product.slug;

                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => {
                        void selectProduct(product.slug);
                      }}
                      style={{
                        ...productListItem,
                        borderColor: selected
                          ? product.color || "#00d9ff"
                          : "rgba(255,255,255,.10)",
                        background: selected
                          ? `${product.color || "#00d9ff"}12`
                          : "rgba(255,255,255,.025)",
                        boxShadow: selected
                          ? `0 0 16px ${product.color || "#00d9ff"}22`
                          : "none",
                      }}
                    >
                      <span
                        style={{
                          ...productColorDot,
                          background: product.color || "#ff45d8",
                          boxShadow: `0 0 10px ${product.color || "#ff45d8"}66`,
                        }}
                      />

                      <span style={productListCopy}>
                        <strong>{product.name}</strong>
                        <small>{product.slug}</small>
                      </span>

                      <span
                        style={{
                          ...productCategory,
                          color: product.is_active
                            ? "#8f8f98"
                            : "#ffcc00",
                        }}
                      >
                        {product.is_active
                          ? product.category === "lab-material"
                            ? "Material"
                            : "Compound"
                          : "HIDDEN"}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <section style={contentStack}>
            {showDeleted && (
              <section style={panel}>
                <div style={panelHeader}>
                  <div>
                    <p style={sectionEyebrow}>ARCHIVE</p>
                    <h2 style={sectionTitle}>Archived Products</h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowDeleted(false)}
                    style={closeButton}
                  >
                    Close
                  </button>
                </div>

                {deletedProducts.length === 0 ? (
                  <p style={muted}>No archived products found.</p>
                ) : (
                  <div style={restoreGrid}>
                    {deletedProducts.map((product) => (
                      <div key={product.id} style={restoreCard}>
                        <div>
                          <strong style={restoreName}>{product.name}</strong>
                          <span style={restoreSlug}>{product.slug}</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            void restoreProduct(product.id);
                          }}
                          style={secondaryButton}
                        >
                          Restore
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {showAddProduct && (
              <section style={panel}>
                <div style={panelHeader}>
                  <div>
                    <p style={sectionEyebrow}>NEW PRODUCT</p>
                    <h2 style={sectionTitle}>Create Product</h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAddProduct(false)}
                    style={closeButton}
                  >
                    Close
                  </button>
                </div>

                <div style={formGrid}>
                  <Field label="Product Name">
                    <input
                      value={newProduct.name}
                      onChange={(event) =>
                        setNewProduct({
                          ...newProduct,
                          name: event.target.value,
                        })
                      }
                      style={input}
                    />
                  </Field>

                  <Field label="Slug">
                    <input
                      value={newProduct.slug}
                      onChange={(event) =>
                        setNewProduct({
                          ...newProduct,
                          slug: event.target.value,
                        })
                      }
                      style={input}
                    />
                  </Field>

                  <Field label="Product Type">
                    <select
                      value={newProduct.category}
                      onChange={(event) =>
                        setNewProduct({
                          ...newProduct,
                          category: event.target.value,
                        })
                      }
                      style={input}
                    >
                      <option value="peptide">Compound</option>
                      <option value="lab-material">Lab Material</option>
                    </select>
                  </Field>

                  <Field label="Image Path">
                    <input
                      value={newProduct.image}
                      onChange={(event) =>
                        setNewProduct({
                          ...newProduct,
                          image: event.target.value,
                        })
                      }
                      style={input}
                    />
                  </Field>

                  <Field label="Accent Color">
                    <input
                      type="color"
                      value={newProduct.color}
                      onChange={(event) =>
                        setNewProduct({
                          ...newProduct,
                          color: event.target.value,
                        })
                      }
                      style={colorInput}
                    />
                  </Field>

                  <Field label="Short Description" wide>
                    <textarea
                      value={newProduct.short_description}
                      onChange={(event) =>
                        setNewProduct({
                          ...newProduct,
                          short_description: event.target.value,
                        })
                      }
                      style={textarea}
                    />
                  </Field>

                  <Field label="Full Description" wide>
                    <textarea
                      value={newProduct.description}
                      onChange={(event) =>
                        setNewProduct({
                          ...newProduct,
                          description: event.target.value,
                        })
                      }
                      style={bigTextarea}
                    />
                  </Field>

                  <Field label="Storage Instructions" wide>
                    <textarea
                      value={selectedProduct.storage || ""}
                      onChange={(event) =>
                        updateProductField("storage", event.target.value)
                      }
                      rows={5}
                      style={textarea}
                      placeholder="Example: Store refrigerated at 2–8°C. Protect from light."
                    />
                  </Field>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    void createProduct();
                  }}
                  style={primaryButton}
                >
                  Save New Product
                </button>
              </section>
            )}

            <section style={panel}>
              <div style={panelHeader}>
                <div>
                  <p style={sectionEyebrow}>PRICING & STOCK</p>
                  <h2 style={sectionTitle}>
                    {selectedProduct.name || "Select a Product"}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddOption((current) => !current)}
                  disabled={!selectedSlug}
                  style={{
                    ...primaryButton,
                    opacity: selectedSlug ? 1 : 0.5,
                    cursor: selectedSlug ? "pointer" : "not-allowed",
                  }}
                >
                  + Add Dosage
                </button>
              </div>

              {!selectedSlug ? (
                <div style={emptyState}>
                  <div style={emptyIcon}>🧪</div>
                  <p style={muted}>
                    Select a product from the catalog to manage pricing and inventory.
                  </p>
                </div>
              ) : (
                <>
                  {showAddOption && (
                    <div style={addOptionPanel}>
                      <div style={formGrid}>
                        <Field label="Dosage">
                          <input
                            value={newOption.dosage}
                            onChange={(event) =>
                              setNewOption({
                                ...newOption,
                                dosage: event.target.value,
                              })
                            }
                            style={input}
                          />
                        </Field>

                        <Field label="Purchase Type">
                          <select
                            value={newOption.purchase_type}
                            onChange={(event) =>
                              setNewOption({
                                ...newOption,
                                purchase_type: event.target.value,
                              })
                            }
                            style={input}
                          >
                            <option value="single">Single</option>
                            <option value="kit">Kit</option>
                          </select>
                        </Field>

                        <Field label="Price">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={newOption.price}
                            onChange={(event) =>
                              setNewOption({
                                ...newOption,
                                price: event.target.value,
                              })
                            }
                            style={input}
                          />
                        </Field>

                        <Field label="Cost">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={newOption.cost}
                            onChange={(event) =>
                              setNewOption({
                                ...newOption,
                                cost: event.target.value,
                              })
                            }
                            style={input}
                          />
                        </Field>

                        <Field label="Single Inventory">
                          <input
                            type="number"
                            min="0"
                            value={newOption.quantity}
                            onChange={(event) =>
                              setNewOption({
                                ...newOption,
                                quantity: event.target.value,
                              })
                            }
                            style={input}
                          />
                        </Field>
                      </div>

                      <div style={actionRow}>
                        <button
                          type="button"
                          onClick={() => {
                            void addOptionAndInventory();
                          }}
                          style={primaryButton}
                        >
                          Save New Option
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowAddOption(false)}
                          style={secondaryButton}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  <p style={helperText}>
                    Single inventory automatically controls both single and kit availability.
                    Kits become pre-sale when fewer than 10 single units are available.
                  </p>

                  {options.length === 0 ? (
                    <div style={emptyState}>
                      <p style={muted}>No pricing options found.</p>
                    </div>
                  ) : (
                    <div style={optionCards}>
                      {options.map((option) => {
                        const inv = getInventoryForOption(option);
                        const isArchived = Boolean(option.archived_at);
                        const quantity = inv
                          ? Number(inv.quantity || 0)
                          : 0;

                        const autoStatus =
                          option.purchase_type === "kit"
                            ? getKitStatus(quantity)
                            : getSingleStatus(quantity);

                        const draft =
                          pricingDrafts[option.id] || {
                            price: String(option.price ?? 0),
                            cost: String(option.cost ?? 0),
                            salePercent: String(option.sale_percent ?? 0),
                          };

                        const regularPrice = Math.max(
                          0,
                          Number(draft.price || 0)
                        );

                        const cost = Math.max(
                          0,
                          Number(draft.cost || 0)
                        );

                        const salePercent = Math.min(
                          100,
                          Math.max(
                            0,
                            Number(draft.salePercent || 0)
                          )
                        );

                        /*
                         * Profit and Margin ALWAYS preview the typed
                         * Sale Percent. Sale Active is deliberately
                         * NOT part of this calculation.
                         */
                        const previewPrice =
                          regularPrice *
                          (1 - salePercent / 100);

                        const profit =
                          previewPrice - cost;

                        const margin =
                          previewPrice > 0
                            ? (profit / previewPrice) * 100
                            : 0;

                        return (
                          <article
                            key={option.id}
                            style={{
                              ...optionCard,
                              opacity: isArchived ? 0.62 : 1,
                              border: isArchived
                                ? "1px solid rgba(255,204,0,.42)"
                                : optionCard.border,
                            }}
                          >
                            <div style={optionHeader}>
                              <div>
                                <input
                                  defaultValue={option.dosage}
                                  onBlur={(event) => {
                                    void updateOption(
                                      option.id,
                                      "dosage",
                                      event.target.value
                                    );
                                  }}
                                  style={optionTitleInput}
                                />

                                <select
                                  defaultValue={option.purchase_type}
                                  onChange={(event) => {
                                    void updateOption(
                                      option.id,
                                      "purchase_type",
                                      event.target.value
                                    );
                                  }}
                                  style={compactSelect}
                                >
                                  <option value="single">Single</option>
                                  <option value="kit">Kit</option>
                                </select>
                              </div>

                              <StatusBadge status={autoStatus} />
                            </div>

                            <div style={optionMetricGrid}>
                              <OptionMetric
                                label={
                                  salePercent > 0
                                    ? "Sale Price Preview"
                                    : "Price"
                                }
                                value={`$${previewPrice.toFixed(2)}`}
                              />

                              <OptionMetric
                                label="Cost"
                                value={`$${Number(option.cost || 0).toFixed(2)}`}
                              />

                              <OptionMetric
                                label="Profit"
                                value={`$${profit.toFixed(2)}`}
                                accent={profit >= 0 ? "#00ff99" : "#ff6f6f"}
                              />

                              <OptionMetric
                                label="Margin"
                                value={`${margin.toFixed(1)}%`}
                              />

                              <OptionMetric
                                label="Single Units"
                                value={String(quantity)}
                                accent="#00d9ff"
                              />

                              <OptionMetric
                                label="Available Kits"
                                value={String(Math.floor(quantity / 10))}
                                accent="#ffcc00"
                              />
                            </div>

                            <div style={optionEditorGrid}>
                              <Field label="Price">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={draft.price}
                                  onChange={(event) => {
                                    updatePricingDraft(option.id, {
                                      price: event.target.value,
                                    });
                                  }}
                                  onBlur={() => {
                                    void updateOption(
                                      option.id,
                                      "price",
                                      Math.max(
                                        0,
                                        Number(draft.price || 0)
                                      )
                                    );
                                  }}
                                  style={input}
                                />
                              </Field>

                              <Field label="Cost">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={draft.cost}
                                  onChange={(event) => {
                                    updatePricingDraft(option.id, {
                                      cost: event.target.value,
                                    });
                                  }}
                                  onBlur={() => {
                                    void updateOption(
                                      option.id,
                                      "cost",
                                      Math.max(
                                        0,
                                        Number(draft.cost || 0)
                                      )
                                    );
                                  }}
                                  style={input}
                                />
                              </Field>

                              <Field label="Sale Percent">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.1"
                                  value={draft.salePercent}
                                  onChange={(event) => {
                                    updatePricingDraft(option.id, {
                                      salePercent: event.target.value,
                                    });
                                  }}
                                  onBlur={() => {
                                    const nextSalePercent = Math.min(
                                      100,
                                      Math.max(
                                        0,
                                        Number(draft.salePercent || 0)
                                      )
                                    );

                                    /*
                                     * Leaving this field ONLY saves the
                                     * percentage. It never changes sale_active.
                                     */
                                    void updateOption(
                                      option.id,
                                      "sale_percent",
                                      nextSalePercent
                                    );
                                  }}
                                  style={input}
                                />
                              </Field>

                              <div
                                style={{
                                  minHeight: 52,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 18,
                                  flexWrap: "wrap",
                                }}
                              >
                                <label style={saleToggle}>
                                  <input
                                    type="checkbox"
                                    checked={option.sale_active || false}
                                    onChange={(event) => {
                                      const checked = event.target.checked;

                                      updateOptionLocal(option.id, {
                                        sale_active: checked,
                                      });

                                      /*
                                       * This is the ONLY control that
                                       * activates the customer-facing sale.
                                       */
                                      void updateOption(
                                        option.id,
                                        "sale_active",
                                        checked
                                      );
                                    }}
                                  />

                                  Sale Active
                                </label>

                                <label style={saleToggle}>
                                  <input
                                    type="checkbox"
                                    checked={option.is_active !== false}
                                    disabled={isArchived}
                                    onChange={(event) => {
                                      void setOptionActive(
                                        option.id,
                                        event.target.checked
                                      );
                                    }}
                                  />

                                  Active Product
                                </label>

                                <label style={saleToggle}>
                                  <input
                                    type="checkbox"
                                    checked={option.bundle_discount_enabled !== false}
                                    onChange={(event) => {
                                      const checked = event.target.checked;
                                      updateOptionLocal(option.id, {
                                        bundle_discount_enabled: checked,
                                      });
                                      void updateOption(
                                        option.id,
                                        "bundle_discount_enabled",
                                        checked
                                      );
                                    }}
                                  />

                                  Bundle Savings
                                </label>

                                {isArchived && (
                                  <span
                                    style={{
                                      color: "#ffcc00",
                                      fontSize: 12,
                                      fontWeight: 900,
                                    }}
                                  >
                                    ARCHIVED
                                  </span>
                                )}
                              </div>
                            </div>

                            <div style={bundleEditor}>
                              <div style={bundleEditorHeader}>
                                <div>
                                  <strong style={{ color: "#00d9ff" }}>
                                    Bundle Quantity Discounts
                                  </strong>
                                  <p style={bundleEditorHelp}>
                                    These tiers apply only when this option has no active manual or campaign sale.
                                  </p>
                                </div>
                              </div>

                              <div style={bundleEditorGrid}>
                                {[
                                  ["Tier 1", "bundle_qty_1", "bundle_discount_1"],
                                  ["Tier 2", "bundle_qty_2", "bundle_discount_2"],
                                  ["Tier 3", "bundle_qty_3", "bundle_discount_3"],
                                ].map(([label, qtyField, discountField]) => (
                                  <div key={label} style={bundleTierAdminCard}>
                                    <strong>{label}</strong>

                                    <Field label="Quantity">
                                      <input
                                        type="number"
                                        min="1"
                                        value={Number(option[qtyField as keyof Option] || 0)}
                                        onChange={(event) =>
                                          updateOptionLocal(option.id, {
                                            [qtyField]: Math.max(1, Number(event.target.value || 1)),
                                          } as Partial<Option>)
                                        }
                                        onBlur={() =>
                                          void updateOption(
                                            option.id,
                                            qtyField,
                                            Math.max(
                                              1,
                                              Number(option[qtyField as keyof Option] || 1)
                                            )
                                          )
                                        }
                                        style={input}
                                      />
                                    </Field>

                                    <Field label="Discount %">
                                      <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.1"
                                        value={Number(option[discountField as keyof Option] || 0)}
                                        onChange={(event) =>
                                          updateOptionLocal(option.id, {
                                            [discountField]: Math.min(
                                              100,
                                              Math.max(0, Number(event.target.value || 0))
                                            ),
                                          } as Partial<Option>)
                                        }
                                        onBlur={() =>
                                          void updateOption(
                                            option.id,
                                            discountField,
                                            Math.min(
                                              100,
                                              Math.max(
                                                0,
                                                Number(option[discountField as keyof Option] || 0)
                                              )
                                            )
                                          )
                                        }
                                        style={input}
                                      />
                                    </Field>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {inv ? (
                              <div style={inventoryEditor}>
                                <div>
                                  <span style={fieldLabel}>Inventory Quantity</span>

                                  <input
                                    type="number"
                                    min="0"
                                    value={inv.quantity}
                                    onChange={(event) =>
                                      setInventory((previous) =>
                                        previous.map((row) =>
                                          row.id === inv.id
                                            ? {
                                                ...row,
                                                quantity: Number(event.target.value),
                                              }
                                            : row
                                        )
                                      )
                                    }
                                    style={inventoryInput}
                                  />
                                </div>

                                <div style={inventoryActions}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      void updateInventory(inv.id, inv.quantity - 1);
                                    }}
                                    style={dangerButton}
                                  >
                                    −1
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      void updateInventory(inv.id, inv.quantity + 1);
                                    }}
                                    style={successButton}
                                  >
                                    +1
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      void updateInventory(inv.id, inv.quantity);
                                    }}
                                    style={primaryButton}
                                  >
                                    Save Inventory
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (isArchived) {
                                        void restoreOption(option.id);
                                      } else {
                                        void archiveOption(option.id);
                                      }
                                    }}
                                    style={
                                      isArchived
                                        ? secondaryButton
                                        : dangerButton
                                    }
                                  >
                                    {isArchived
                                      ? "Restore Option"
                                      : "Archive Product"}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: 12,
                                  flexWrap: "wrap",
                                }}
                              >
                                <p style={{ ...muted, margin: 0 }}>
                                  This kit uses the matching single-unit inventory.
                                </p>

                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isArchived) {
                                      void restoreOption(option.id);
                                    } else {
                                      void archiveOption(option.id);
                                    }
                                  }}
                                  style={
                                    isArchived
                                      ? secondaryButton
                                      : dangerButton
                                  }
                                >
                                  {isArchived
                                    ? "Restore Option"
                                    : "Archive Product"}
                                </button>
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </section>

            {selectedSlug && (
              <section style={panel}>
                <div style={panelHeader}>
                  <div>
                    <p style={sectionEyebrow}>PRODUCT DETAILS</p>
                    <h2 style={sectionTitle}>Edit Product</h2>
                  </div>

                  <a
                    href={`/products/${selectedSlug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={secondaryLink}
                  >
                    View Live Page
                  </a>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(180px, 280px) minmax(0, 1fr)",
                    gap: 22,
                    marginBottom: 24,
                    padding: 18,
                    border: "1px solid rgba(0,217,255,.26)",
                    borderRadius: 16,
                    background:
                      "linear-gradient(145deg, rgba(0,217,255,.055), rgba(255,69,216,.035))",
                  }}
                >
                  <div>
                    <p style={sectionEyebrow}>PRODUCT IMAGE</p>

                    <div
                      style={{
                        marginTop: 10,
                        padding: 10,
                        border: "1px solid rgba(255,255,255,.12)",
                        borderRadius: 14,
                        background: "#050505",
                      }}
                    >
                      <img
                        src={
                          selectedProduct.image ||
                          "/pugpep-logo.png"
                        }
                        alt={
                          selectedProduct.name ||
                          "Product preview"
                        }
                        style={{
                          display: "block",
                          width: "100%",
                          aspectRatio: "1 / 1",
                          objectFit: "contain",
                          borderRadius: 10,
                        }}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      gap: 12,
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          margin: 0,
                          color: "#fff",
                          fontSize: 20,
                        }}
                      >
                        Change Website Photo
                      </h3>

                      <p
                        style={{
                          ...helperText,
                          marginTop: 7,
                          marginBottom: 0,
                        }}
                      >
                        Choose a PNG, JPG, or WebP image up to 5 MB.
                        The new image is uploaded to Supabase Storage and
                        becomes the website image automatically.
                      </p>
                    </div>

                    <label
                      style={{
                        ...primaryButton,
                        display: "inline-flex",
                        width: "fit-content",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: imageUploading
                          ? "wait"
                          : "pointer",
                        opacity: imageUploading
                          ? 0.6
                          : 1,
                      }}
                    >
                      {imageUploading
                        ? "Uploading Image..."
                        : "Choose New Product Image"}

                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        disabled={imageUploading}
                        onChange={(event) => {
                          const file =
                            event.target.files?.[0];

                          if (file) {
                            void uploadProductImage(file);
                          }

                          event.currentTarget.value = "";
                        }}
                        style={{
                          display: "none",
                        }}
                      />
                    </label>

                    <span
                      style={{
                        color: "#777",
                        fontSize: 12,
                        overflowWrap: "anywhere",
                      }}
                    >
                      Current image:{" "}
                      {selectedProduct.image ||
                        "No image selected"}
                    </span>
                  </div>
                </div>

                <div style={formGrid}>
                  <Field label="Name">
                    <input
                      value={selectedProduct.name || ""}
                      onChange={(event) =>
                        updateProductField("name", event.target.value)
                      }
                      style={input}
                    />
                  </Field>

                  <Field label="Slug">
                    <input
                      value={selectedProduct.slug || ""}
                      onChange={(event) =>
                        updateProductField("slug", event.target.value)
                      }
                      style={input}
                    />
                  </Field>

                  <Field label="Image Path">
                    <input
                      value={selectedProduct.image || ""}
                      onChange={(event) =>
                        updateProductField("image", event.target.value)
                      }
                      style={input}
                    />
                  </Field>

                  <Field label="Product Type">
                    <select
                      value={selectedProduct.category || "peptide"}
                      onChange={(event) =>
                        updateProductField(
                          "category" as keyof Product,
                          event.target.value
                        )
                      }
                      style={input}
                    >
                      <option value="peptide">Compound</option>
                      <option value="lab-material">Lab Material</option>
                    </select>
                  </Field>

                  <Field label="Accent Color">
                    <input
                      type="color"
                      value={selectedProduct.color || "#ff45d8"}
                      onChange={(event) =>
                        updateProductField("color", event.target.value)
                      }
                      style={colorInput}
                    />
                  </Field>

                  <Field label="Short Description" wide>
                    <textarea
                      value={selectedProduct.short_description || ""}
                      onChange={(event) =>
                        updateProductField(
                          "short_description",
                          event.target.value
                        )
                      }
                      style={textarea}
                    />
                  </Field>

                  <Field label="Full Description" wide>
                    <textarea
                      value={selectedProduct.description || ""}
                      onChange={(event) =>
                        updateProductField(
                          "description",
                          event.target.value
                        )
                      }
                      style={bigTextarea}
                    />
                  </Field>
                </div>

                <div style={actionRow}>
                  <button
                    type="button"
                    onClick={() => {
                      void saveProductChanges();
                    }}
                    style={primaryButton}
                  >
                    Save Product Changes
                  </button>
                </div>
              </section>
            )}
          </section>
        </div>

        <style jsx>{`
          @media (max-width: 1040px) {
            .inventory-layout {
              grid-template-columns: minmax(0, 1fr) !important;
            }
          }

          @media (max-width: 720px) {
            .inventory-layout {
              gap: 16px !important;
            }

            button,
            input,
            select,
            textarea {
              font-size: 16px !important;
            }
          }
        `}</style>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div
      style={{
        ...statCard,
        borderColor: `${accent}55`,
        boxShadow: `0 0 18px ${accent}18`,
      }}
    >
      <span style={{ ...statLabel, color: accent }}>{label}</span>
      <strong style={statValue}>{value}</strong>
    </div>
  );
}

function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <label
      style={{
        ...field,
        gridColumn: wide ? "1 / -1" : undefined,
      }}
    >
      <span style={fieldLabel}>{label}</span>
      {children}
    </label>
  );
}

function OptionMetric({
  label,
  value,
  accent = "#ffffff",
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div style={optionMetric}>
      <span style={metricLabel}>{label}</span>
      <strong style={{ color: accent }}>{value}</strong>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const theme =
    status === "in stock"
      ? {
          color: "#00ff99",
          border: "rgba(0,255,153,.48)",
          background: "rgba(0,255,153,.08)",
        }
      : status === "pre-sale"
        ? {
            color: "#ffcc00",
            border: "rgba(255,204,0,.48)",
            background: "rgba(255,204,0,.08)",
          }
        : {
            color: "#ff6f6f",
            border: "rgba(255,111,111,.48)",
            background: "rgba(255,111,111,.08)",
          };

  return (
    <span
      style={{
        ...statusBadge,
        color: theme.color,
        borderColor: theme.border,
        background: theme.background,
      }}
    >
      {status.toUpperCase()}
    </span>
  );
}

const page = {
  minHeight: "100vh",
  fontSize: 16,
  lineHeight: 1.5,
  padding: "clamp(18px, 4vw, 34px)",
  background:
    "radial-gradient(circle at 12% 0%, rgba(255,69,216,.12), transparent 30%), radial-gradient(circle at 88% 4%, rgba(0,217,255,.12), transparent 32%), #000000",
  color: "#ffffff",
};

const container = {
  width: "100%",
  maxWidth: 1480,
  margin: "0 auto",
};

const pageHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 20,
  flexWrap: "wrap" as const,
};

const eyebrow = {
  margin: 0,
  color: "#00d9ff",
  fontSize: 13,
  fontWeight: 900,
  letterSpacing: ".15em",
};

const pageTitle = {
  margin: "7px 0 0",
  color: "#ff45d8",
  fontSize: "clamp(44px, 7vw, 64px)",
  letterSpacing: "-.035em",
  textShadow: "0 0 18px rgba(255,69,216,.22)",
};

const subtitle = {
  maxWidth: 820,
  margin: "12px 0 0",
  color: "#c2c2ca",
  fontSize: 18,
  lineHeight: 1.7,
};

const headerActions = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap" as const,
};

const noticeBanner = {
  marginTop: 18,
  padding: "12px 14px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 15,
  border: "1px solid rgba(0,255,153,.45)",
  borderRadius: 11,
  background: "rgba(0,255,153,.08)",
  color: "#00ff99",
  fontWeight: 800,
};

const noticeClose = {
  border: 0,
  background: "transparent",
  color: "#00ff99",
  fontSize: 25,
  cursor: "pointer",
};

const statsGrid = {
  marginTop: 22,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 16,
};

const statCard = {
  padding: 21,
  display: "grid",
  gap: 7,
  border: "1px solid",
  borderRadius: 18,
  background:
    "linear-gradient(145deg, rgba(12,12,17,.95), rgba(6,6,9,.96))",
};

const statLabel = {
  fontSize: 14,
  fontWeight: 900,
  letterSpacing: ".1em",
  textTransform: "uppercase" as const,
};

const statValue = {
  fontSize: 34,
};

const workspace = {
  marginTop: 22,
  display: "grid",
  gridTemplateColumns: "320px minmax(0, 1fr)",
  gap: 20,
  alignItems: "start",
};

const sidebar = {
  padding: 21,
  border: "1px solid rgba(0,217,255,.32)",
  borderRadius: 18,
  background:
    "linear-gradient(145deg, rgba(8,8,12,.96), rgba(15,8,18,.94))",
  boxShadow: "0 0 20px rgba(0,217,255,.07)",
};

const sidebarHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 15,
};

const sectionEyebrow = {
  margin: 0,
  color: "#00d9ff",
  fontSize: 14,
  fontWeight: 900,
  letterSpacing: ".13em",
};

const sectionTitle = {
  margin: "5px 0 0",
  color: "#7df9ff",
  fontSize: 31,
};

const countBadge = {
  padding: "8px 11px",
  border: "1px solid rgba(255,69,216,.44)",
  borderRadius: 999,
  background: "rgba(255,69,216,.07)",
  color: "#ff75df",
  fontSize: 13,
  fontWeight: 900,
};

const searchInput = {
  width: "100%",
  minHeight: 54,
  fontSize: 16,
  marginTop: 14,
  boxSizing: "border-box" as const,
  padding: "13px 15px",
  border: "1px solid rgba(255,255,255,.15)",
  borderRadius: 9,
  background: "#050507",
  color: "#ffffff",
};

const productList = {
  maxHeight: "68vh",
  marginTop: 12,
  display: "grid",
  gap: 8,
  overflowY: "auto" as const,
};

const productListItem = {
  width: "100%",
  padding: 15,
  display: "grid",
  gridTemplateColumns: "12px minmax(0, 1fr) auto",
  alignItems: "center",
  gap: 12,
  border: "1px solid",
  borderRadius: 10,
  color: "#ffffff",
  textAlign: "left" as const,
  cursor: "pointer",
};

const productColorDot = {
  width: 9,
  height: 9,
  borderRadius: 999,
};

const productListCopy = {
  minWidth: 0,
  display: "grid",
  gap: 3,
};

const productCategory = {
  color: "#8f8f98",
  fontSize: 14,
  fontWeight: 800,
};

const contentStack = {
  display: "grid",
  gap: 18,
};

const panel = {
  padding: "clamp(18px, 3vw, 24px)",
  border: "1px solid rgba(0,217,255,.32)",
  borderRadius: 18,
  background:
    "linear-gradient(145deg, rgba(8,8,12,.96), rgba(15,8,18,.94))",
  boxShadow: "0 0 20px rgba(0,217,255,.07)",
};

const panelHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 14,
  flexWrap: "wrap" as const,
  marginBottom: 16,
};

const closeButton = {
  minHeight: 40,
  padding: "9px 12px",
  border: "1px solid rgba(255,255,255,.18)",
  borderRadius: 9,
  background: "rgba(255,255,255,.04)",
  color: "#ccccd2",
  cursor: "pointer",
  fontWeight: 800,
};

const restoreGrid = {
  display: "grid",
  gap: 12,
};

const restoreCard = {
  padding: 15,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 15,
  border: "1px solid rgba(255,255,255,.10)",
  borderRadius: 10,
  background: "rgba(0,0,0,.24)",
};

const restoreName = {
  display: "block",
  color: "#ffffff",
};

const restoreSlug = {
  display: "block",
  marginTop: 3,
  color: "#8f8f98",
  fontSize: 14,
};

const formGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 15,
};

const field = {
  minWidth: 0,
  display: "grid",
  gap: 6,
};

const fieldLabel = {
  color: "#d0d0d7",
  fontSize: 14,
  fontWeight: 900,
};

const input = {
  width: "100%",
  minWidth: 0,
  minHeight: 54,
  boxSizing: "border-box" as const,
  padding: "14px 16px",
  fontSize: 16,
  border: "1px solid rgba(255,255,255,.16)",
  borderRadius: 9,
  background: "#050507",
  color: "#ffffff",
};

const colorInput = {
  width: "100%",
  height: 48,
  border: "1px solid rgba(255,255,255,.16)",
  borderRadius: 9,
  background: "#050507",
};

const textarea = {
  width: "100%",
  minHeight: 130,
  boxSizing: "border-box" as const,
  padding: 15,
  border: "1px solid rgba(255,255,255,.16)",
  borderRadius: 9,
  background: "#050507",
  color: "#ffffff",
  resize: "vertical" as const,
};

const bigTextarea = {
  ...textarea,
  minHeight: 280,
};

const primaryButton = {
  minHeight: 54,
  fontSize: 16,
  padding: "13px 18px",
  border: "1px solid #45d97a",
  borderRadius: 9,
  background: "linear-gradient(180deg, #2eea6f, #19b857)",
  color: "#ffffff",
  fontWeight: 900,
  cursor: "pointer",
};

const secondaryButton = {
  minHeight: 54,
  fontSize: 16,
  padding: "13px 18px",
  border: "1px solid rgba(0,217,255,.46)",
  borderRadius: 9,
  background: "rgba(0,217,255,.06)",
  color: "#7df9ff",
  fontWeight: 900,
  cursor: "pointer",
};

const secondaryLink = {
  minHeight: 42,
  padding: "9px 13px",
  display: "grid",
  placeItems: "center",
  border: "1px solid rgba(0,217,255,.46)",
  borderRadius: 9,
  background: "rgba(0,217,255,.06)",
  color: "#7df9ff",
  textDecoration: "none",
  fontWeight: 900,
};

const dangerButton = {
  minHeight: 54,
  fontSize: 16,
  padding: "13px 18px",
  border: "1px solid rgba(255,93,93,.56)",
  borderRadius: 9,
  background: "rgba(255,93,93,.07)",
  color: "#ff8585",
  fontWeight: 900,
  cursor: "pointer",
};

const successButton = {
  minHeight: 54,
  fontSize: 16,
  padding: "13px 18px",
  border: "1px solid rgba(0,255,153,.50)",
  borderRadius: 9,
  background: "rgba(0,255,153,.07)",
  color: "#00ff99",
  fontWeight: 900,
  cursor: "pointer",
};

const actionRow = {
  marginTop: 16,
  display: "flex",
  gap: 12,
  flexWrap: "wrap" as const,
};

const addOptionPanel = {
  marginBottom: 16,
  padding: 21,
  border: "1px solid rgba(255,69,216,.28)",
  borderRadius: 12,
  background: "rgba(255,69,216,.04)",
};

const helperText = {
  margin: "0 0 18px",
  color: "#b1b1ba",
  fontSize: 16,
  lineHeight: 1.7,
};

const emptyState = {
  padding: 28,
  display: "grid",
  justifyItems: "center",
  gap: 12,
  border: "1px dashed rgba(0,217,255,.30)",
  borderRadius: 12,
  textAlign: "center" as const,
};

const emptyIcon = {
  fontSize: 36,
};

const muted = {
  color: "#a9a9b2",
  fontSize: 16,
  lineHeight: 1.7,
};

const optionCards = {
  display: "grid",
  gap: 14,
};

const optionCard = {
  padding: 21,
  border: "1px solid rgba(255,255,255,.12)",
  borderRadius: 18,
  background: "rgba(0,0,0,.25)",
};

const optionHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 15,
  flexWrap: "wrap" as const,
};

const optionTitleInput = {
  display: "block",
  minWidth: 220,
  padding: "6px 8px",
  border: "1px solid transparent",
  borderRadius: 7,
  background: "transparent",
  color: "#ff75df",
  fontSize: 25,
  fontWeight: 900,
};

const compactSelect = {
  marginTop: 5,
  padding: "6px 8px",
  border: "1px solid rgba(255,255,255,.14)",
  borderRadius: 7,
  background: "#050507",
  color: "#ccccd2",
};

const statusBadge = {
  padding: "6px 9px",
  border: "1px solid",
  borderRadius: 999,
  fontSize: 14,
  fontWeight: 900,
};

const optionMetricGrid = {
  marginTop: 14,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
  gap: 9,
};

const optionMetric = {
  padding: 10,
  display: "grid",
  gap: 4,
  border: "1px solid rgba(255,255,255,.08)",
  borderRadius: 9,
  background: "rgba(255,255,255,.025)",
};

const metricLabel = {
  color: "#8f8f98",
  fontSize: 11,
  fontWeight: 900,
  textTransform: "uppercase" as const,
};

const optionEditorGrid = {
  marginTop: 14,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 12,
  alignItems: "end",
};

const saleToggle = {
  minHeight: 52,
  display: "flex",
  alignItems: "center",
  gap: 8,
  color: "#d0d0d6",
  fontWeight: 800,
};

const bundleEditor = {
  marginTop: 14,
  padding: 14,
  border: "1px solid rgba(0,217,255,.22)",
  borderRadius: 12,
  background: "rgba(0,217,255,.035)",
};

const bundleEditorHeader = {
  marginBottom: 12,
};

const bundleEditorHelp = {
  margin: "5px 0 0",
  color: "#888",
  fontSize: 12,
  lineHeight: 1.45,
};

const bundleEditorGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 10,
};

const bundleTierAdminCard = {
  display: "grid",
  gap: 8,
  padding: 10,
  border: "1px solid rgba(255,255,255,.1)",
  borderRadius: 10,
  background: "#0b0b0b",
};

const inventoryEditor = {
  marginTop: 14,
  paddingTop: 14,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "end",
  gap: 14,
  flexWrap: "wrap" as const,
  borderTop: "1px solid rgba(255,255,255,.09)",
};

const inventoryInput = {
  width: 190,
  minHeight: 54,
  fontSize: 17,
  padding: "13px 15px",
  border: "1px solid rgba(0,217,255,.35)",
  borderRadius: 9,
  background: "#050507",
  color: "#ffffff",
};

const inventoryActions = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap" as const,
};

const activeToggle = {
  marginTop: 15,
  display: "flex",
  alignItems: "center",
  gap: 9,
  color: "#d0d0d6",
  fontWeight: 800,
};