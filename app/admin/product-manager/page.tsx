"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createClient } from "../../../lib/supabaseClient";

type Product = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  category: string | null;
  product_family: string | null;
  color: string | null;
  short_description: string | null;
  description: string | null;
  storage: string | null;
  is_active: boolean | null;
  is_new: boolean | null;
  feature_on_homepage: boolean | null;
  homepage_feature_order: number | null;
  new_until: string | null;
  is_coming_soon: boolean | null;
  coming_soon_date: string | null;
};

type ProductOption = {
  id: string;
  product_slug: string;
  dosage: string;
  purchase_type: string;
  is_active: boolean | null;
  archived_at: string | null;
};

type InventoryRow = {
  id: string;
  product_slug: string;
  dosage: string;
  purchase_type: string;
  quantity: number | null;
  status: string | null;
};

type CurrentCoa = {
  id: string;
  product_slug: string;
  product_name: string;
  dosage: string | null;
  lot_number: string | null;
  lab_name: string | null;
  test_date: string | null;
  purity_percent: number | null;
  file_path: string;
  file_name: string;
  storage_bucket: string;
};

type Tab = "general" | "images" | "coas";

function normalize(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

const PRODUCT_FAMILIES = [
  { value: "metabolism-research", label: "Metabolism Research" },
  { value: "brain-nerve-research", label: "Brain & Nerve Research" },
  { value: "cell-energy-research", label: "Cell & Energy Research" },
  { value: "peptide-molecular-research", label: "Peptide & Molecular Research" },
  { value: "hormone-signaling-research", label: "Hormone & Signaling Research" },
] as const;

export default function ProductManagerPage() {
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [notice, setNotice] = useState("");

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [product, setProduct] = useState<Product | null>(null);

  const [options, setOptions] = useState<ProductOption[]>([]);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [currentCoas, setCurrentCoas] = useState<CurrentCoa[]>([]);
  const [selectedDosage, setSelectedDosage] = useState("");

  const [activeTab, setActiveTab] = useState<Tab>("general");
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  const [showAddProduct, setShowAddProduct] = useState(false);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    slug: "",
    image: "",
    category: "peptide",
    product_family: "",
    color: "#ff45d8",
    short_description: "",
    description: "",
    storage: "",
    is_active: true,
    is_new: false,
    feature_on_homepage: false,
    homepage_feature_order: "",
    new_until: "",
    is_coming_soon: false,
    coming_soon_date: "",
  });

  useEffect(() => {
    let mounted = true;

    async function boot() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (!user) {
        setLoading(false);
        return;
      }

      const { data: adminAccess, error: adminError } =
        await supabase.rpc("is_pugpep_admin");

      if (!mounted) return;

      if (adminError || !adminAccess) {
        setNotice(adminError?.message || "Admin access required.");
        setLoading(false);
        return;
      }

      setAuthorized(true);

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .is("deleted_at", null)
        .order("name", { ascending: true });

      if (!mounted) return;

      if (error) {
        setNotice(error.message);
        setLoading(false);
        return;
      }

      const loaded = (data || []) as Product[];
      setProducts(loaded);

      const params = new URLSearchParams(window.location.search);
      const requestedProduct = params.get("product") || "";
      const requestedDosage = params.get("dosage") || "";
      const requestedTab = params.get("tab") as Tab | null;

      const initialProduct =
        loaded.find((item) => item.slug === requestedProduct) ||
        loaded[0] ||
        null;

      setSelectedSlug(initialProduct?.slug || "");
      setProduct(initialProduct);

      if (requestedDosage) setSelectedDosage(requestedDosage);
      if (requestedTab && ["general", "images", "coas"].includes(requestedTab)) {
        setActiveTab(requestedTab);
      }

      setLoading(false);
    }

    void boot();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  useEffect(() => {
    if (!selectedSlug) {
      setProduct(null);
      setOptions([]);
      setInventory([]);
      setCurrentCoas([]);
      setSelectedDosage("");
      return;
    }

    const selected = products.find((item) => item.slug === selectedSlug) || null;
    setProduct(selected);

    let cancelled = false;

    async function loadProductWorkspace() {
      const [optionResult, inventoryResult, coaResult] = await Promise.all([
        supabase
          .from("product_options")
          .select("id,product_slug,dosage,purchase_type,is_active,archived_at")
          .eq("product_slug", selectedSlug)
          .order("dosage", { ascending: true }),
        supabase
          .from("inventory")
          .select("id,product_slug,dosage,purchase_type,quantity,status")
          .eq("product_slug", selectedSlug)
          .order("dosage", { ascending: true }),
        supabase
          .from("current_product_coas")
          .select("*")
          .eq("product_slug", selectedSlug),
      ]);

      if (cancelled) return;

      if (optionResult.error) {
        setNotice(`Unable to load product options: ${optionResult.error.message}`);
      }

      if (inventoryResult.error) {
        setNotice(`Unable to load inventory: ${inventoryResult.error.message}`);
      }

      if (coaResult.error) {
        setNotice(`Unable to load current COAs: ${coaResult.error.message}`);
      }

      const nextOptions = (optionResult.data || []) as ProductOption[];
      const nextInventory = (inventoryResult.data || []) as InventoryRow[];
      const nextCoas = (coaResult.data || []) as CurrentCoa[];

      setOptions(nextOptions);
      setInventory(nextInventory);
      setCurrentCoas(nextCoas);

      const dosages = Array.from(
        new Set(
          nextOptions
            .filter((row) => !row.archived_at)
            .map((row) => row.dosage)
            .filter(Boolean)
        )
      );

      setSelectedDosage((current) =>
        current && dosages.includes(current) ? current : dosages[0] || ""
      );
    }

    void loadProductWorkspace();

    return () => {
      cancelled = true;
    };
  }, [selectedSlug, products, supabase]);

  useEffect(() => {
    if (!selectedSlug) return;

    const params = new URLSearchParams(window.location.search);
    params.set("product", selectedSlug);

    if (selectedDosage) params.set("dosage", selectedDosage);
    else params.delete("dosage");

    params.set("tab", activeTab);

    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}?${params.toString()}`
    );
  }, [selectedSlug, selectedDosage, activeTab]);

  const dosages = Array.from(
    new Set(
      options
        .filter((row) => !row.archived_at)
        .map((row) => row.dosage)
        .filter(Boolean)
    )
  );

  const matchingInventory = inventory.find(
    (row) =>
      normalize(row.dosage) === normalize(selectedDosage) &&
      row.purchase_type === "single"
  );

  const matchingCoa = currentCoas.find(
    (row) => normalize(row.dosage) === normalize(selectedDosage)
  );

  const imageReady = Boolean(product?.image);
  const coaReady = Boolean(matchingCoa);
  const lotReady = Boolean(matchingCoa?.lot_number);
  const inventoryQuantity = Number(matchingInventory?.quantity || 0);

  const imageEngineHref = selectedSlug
    ? `/admin/product-images?product=${encodeURIComponent(selectedSlug)}&family=${encodeURIComponent(
        product?.category === "nasal-spray"
          ? "sprays"
          : product?.category === "lab-material"
          ? "lab-materials"
          : "peptides"
      )}`
    : "/admin/product-images";

  const coaEngineHref = selectedSlug
    ? `/admin/coas?product=${encodeURIComponent(selectedSlug)}${
        selectedDosage ? `&dosage=${encodeURIComponent(selectedDosage)}` : ""
      }`
    : "/admin/coas";

  function updateProduct<K extends keyof Product>(key: K, value: Product[K]) {
    setProduct((current) =>
      current ? { ...current, [key]: value } : current
    );
  }

  async function saveGeneral() {
    if (!product || saving) return;

    setSaving(true);
    setNotice("");

    try {
      const { error } = await supabase
        .from("products")
        .update({
          name: product.name,
          category: product.category,
          product_family: product.product_family || null,
          color: product.color,
          short_description: product.short_description,
          description: product.description,
          storage: product.storage,
          is_active: product.is_active ?? true,
          is_new: product.is_new ?? false,
          feature_on_homepage: product.feature_on_homepage ?? false,
          homepage_feature_order: product.homepage_feature_order,
          new_until: product.new_until || null,
          is_coming_soon: product.is_coming_soon ?? false,
          coming_soon_date: product.coming_soon_date || null,
        })
        .eq("id", product.id);

      if (error) {
        setNotice(`Save failed: ${error.message}`);
        return;
      }

      setProducts((current) =>
        current.map((row) => (row.id === product.id ? product : row))
      );
      setNotice("Product details saved.");
    } finally {
      setSaving(false);
    }
  }

  async function createProduct() {
    if (creatingProduct) return;

    const name = newProduct.name.trim();
    const slug = newProduct.slug.trim();

    if (!name || !slug) {
      setNotice("Product name and slug are required.");
      return;
    }

    setCreatingProduct(true);
    setNotice("");

    try {
      const { data, error } = await supabase
        .from("products")
        .insert({
          name,
          slug,
          image: newProduct.image.trim(),
          category: newProduct.category,
          product_family: newProduct.product_family || null,
          color: newProduct.color,
          short_description: newProduct.short_description.trim(),
          description: newProduct.description.trim(),
          storage: newProduct.storage.trim(),
          is_active: newProduct.is_active,
          is_new: newProduct.is_new,
          feature_on_homepage: newProduct.feature_on_homepage,
          homepage_feature_order:
            newProduct.homepage_feature_order === ""
              ? null
              : Number(newProduct.homepage_feature_order),
          new_until: newProduct.new_until || null,
          is_coming_soon: newProduct.is_coming_soon,
          coming_soon_date: newProduct.coming_soon_date || null,
        })
        .select("*")
        .single();

      if (error) {
        setNotice(`Product creation failed: ${error.message}`);
        return;
      }

      const created = data as Product;

      setProducts((current) =>
        [...current, created].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      );

      setSelectedSlug(created.slug);
      setProduct(created);
      setSelectedDosage("");
      setActiveTab("general");
      setShowAddProduct(false);

      setNewProduct({
        name: "",
        slug: "",
        image: "",
        category: "peptide",
        product_family: "",
        color: "#ff45d8",
        short_description: "",
        description: "",
        storage: "",
        is_active: true,
        is_new: false,
        feature_on_homepage: false,
        homepage_feature_order: "",
        new_until: "",
        is_coming_soon: false,
        coming_soon_date: "",
      });

      setNotice(
        "Product created and selected. Add its dosages and stock in Inventory Manager."
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Product creation failed."
      );
    } finally {
      setCreatingProduct(false);
    }
  }

  async function uploadManualImage(file: File) {
    if (!product) return;

    if (!file.type.startsWith("image/")) {
      setNotice("Please choose an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setNotice("Product images must be 5 MB or smaller.");
      return;
    }

    setImageUploading(true);
    setNotice("");

    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "png";
      const safeSlug = product.slug
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/g, "-")
        .replace(/^-+|-+$/g, "");

      const objectPath = `products/${safeSlug}-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(objectPath, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const publicUrl = supabase.storage
        .from("product-images")
        .getPublicUrl(objectPath).data.publicUrl;

      const { error: updateError } = await supabase
        .from("products")
        .update({ image: publicUrl })
        .eq("id", product.id);

      if (updateError) throw updateError;

      const updated = { ...product, image: publicUrl };
      setProduct(updated);
      setProducts((current) =>
        current.map((row) => (row.id === product.id ? updated : row))
      );
      setNotice("Manual product image uploaded and published.");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Image upload failed."
      );
    } finally {
      setImageUploading(false);
    }
  }

  function openManager(tab: Tab) {
    setActiveTab(tab);

    requestAnimationFrame(() => {
      document
        .getElementById("product-manager-inline-manager")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    });
  }

  if (loading) {
    return <main style={page}><div style={shell}>Loading Product Manager...</div></main>;
  }

  if (!authorized) {
    return (
      <main style={page}>
        <div style={shell}>
          <section style={panel}>
            <h1 style={{ color: "#ff45d8" }}>Access Denied</h1>
            <p style={muted}>{notice || "Admin access required."}</p>
            <Link href="/login" style={primaryLink}>Go to Login</Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main style={page}>
      <style jsx global>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #050507; }
        input, select, textarea, button { font: inherit; }

        @media (max-width: 850px) {
          .pm-selector-grid,
          .pm-general-grid,
          .pm-image-grid {
            grid-template-columns: 1fr !important;
          }

          .pm-status-bar {
            flex-direction: column !important;
            align-items: stretch !important;
          }

          .pm-action-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <div style={shell}>
        <header style={hero}>
          <div>
            <div style={heroBadges}>
              <span style={pinkPill}>PUGPEP ADMIN</span>
              <span style={greenText}>● PRODUCT WORKSPACE ONLINE</span>
            </div>

            <p style={eyebrow}>SELECT ONCE • MANAGE WHAT NEEDS ATTENTION</p>
            <h1 style={title}>Product Manager</h1>

            <p style={subtitle}>
              Create products and manage their storefront details, quality
              documents, and images here. Inventory Manager stays focused on
              dosages, pricing, stock, and procurement.
            </p>
          </div>

          <div style={heroActions}>
            <button
              type="button"
              onClick={() =>
                setShowAddProduct((current) => !current)
              }
              style={heroActionButton}
            >
              {showAddProduct ? "Close New Product" : "+ New Product"}
            </button>

            <Link
              href={
                selectedSlug
                  ? `/admin/inventory?product=${encodeURIComponent(selectedSlug)}`
                  : "/admin/inventory"
              }
              style={heroActionLink}
            >
              Inventory Manager
            </Link>
          </div>
        </header>

        {notice && (
          <div style={noticeBox}>
            <span>{notice}</span>
            <button onClick={() => setNotice("")} style={closeButton}>×</button>
          </div>
        )}

        {showAddProduct && (
          <section style={newProductPanel}>
            <div style={sectionHead}>
              <div>
                <p style={sectionEyebrow}>NEW PRODUCT</p>
                <h2 style={sectionTitle}>Create Product</h2>
              </div>

              <button
                type="button"
                onClick={() => setShowAddProduct(false)}
                style={smallNavButton}
              >
                Close
              </button>
            </div>

            <p style={newProductHelp}>
              Create the product record here. After creation, use Inventory
              Manager to add dosages, prices, costs, and stock quantities.
            </p>

            <div className="pm-general-grid" style={generalGrid}>
              <Field label="Product Name">
                <input
                  value={newProduct.name}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      name: e.target.value,
                    })
                  }
                  style={input}
                />
              </Field>

              <Field label="Slug">
                <input
                  value={newProduct.slug}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      slug: e.target.value,
                    })
                  }
                  style={input}
                />
              </Field>

              <Field label="Product Type">
                <select
                  value={newProduct.category}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      category: e.target.value,
                    })
                  }
                  style={input}
                >
                  <option value="peptide">Compound</option>
                  <option value="nasal-spray">Spray</option>
                  <option value="lab-material">Lab Material</option>
                </select>
              </Field>

              <Field label="Product Family">
                <select
                  value={newProduct.product_family}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      product_family: e.target.value,
                    })
                  }
                  style={input}
                >
                  <option value="">Unassigned</option>
                  {PRODUCT_FAMILIES.map((family) => (
                    <option key={family.value} value={family.value}>
                      {family.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Accent Color">
                <input
                  type="color"
                  value={newProduct.color}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      color: e.target.value,
                    })
                  }
                  style={colorInput}
                />
              </Field>

              <Field label="Initial Image URL" wide>
                <input
                  value={newProduct.image}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      image: e.target.value,
                    })
                  }
                  placeholder="Optional — you can add/generate the image after creation"
                  style={input}
                />
              </Field>

              <Field label="Short Description" wide>
                <textarea
                  value={newProduct.short_description}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      short_description: e.target.value,
                    })
                  }
                  style={textarea}
                />
              </Field>

              <Field label="Full Description" wide>
                <textarea
                  value={newProduct.description}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      description: e.target.value,
                    })
                  }
                  style={bigTextarea}
                />
              </Field>

              <Field label="Storage Instructions" wide>
                <textarea
                  value={newProduct.storage}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      storage: e.target.value,
                    })
                  }
                  style={textarea}
                />
              </Field>

              <Field label="Website Visibility">
                <label style={toggleCard}>
                  <input
                    type="checkbox"
                    checked={newProduct.is_active}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        is_active: e.target.checked,
                      })
                    }
                  />
                  <span>Visible on website</span>
                </label>
              </Field>

              <Field label="New Product">
                <label style={toggleCard}>
                  <input
                    type="checkbox"
                    checked={newProduct.is_new}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        is_new: e.target.checked,
                      })
                    }
                  />
                  <span>Show NEW badge</span>
                </label>
              </Field>

              <Field label="Feature on Homepage">
                <label style={toggleCard}>
                  <input
                    type="checkbox"
                    checked={newProduct.feature_on_homepage}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        feature_on_homepage: e.target.checked,
                      })
                    }
                  />
                  <span>Include in New Products section</span>
                </label>
              </Field>

              <Field label="Coming Soon">
                <label style={toggleCard}>
                  <input
                    type="checkbox"
                    checked={newProduct.is_coming_soon}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        is_coming_soon: e.target.checked,
                      })
                    }
                  />
                  <span>Show COMING SOON badge</span>
                </label>
              </Field>

              <Field label="Homepage Display Order">
                <input
                  type="number"
                  min="0"
                  value={newProduct.homepage_feature_order}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      homepage_feature_order: e.target.value,
                    })
                  }
                  style={input}
                />
              </Field>

              <Field label="NEW Badge Through">
                <input
                  type="date"
                  value={newProduct.new_until}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      new_until: e.target.value,
                    })
                  }
                  style={input}
                />
              </Field>

              <Field label="Coming Soon Date">
                <input
                  type="date"
                  value={newProduct.coming_soon_date}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      coming_soon_date: e.target.value,
                    })
                  }
                  style={input}
                />
              </Field>
            </div>

            <div style={newProductActions}>
              <button
                type="button"
                disabled={creatingProduct}
                onClick={() => void createProduct()}
                style={{
                  ...primaryButton,
                  opacity: creatingProduct ? 0.6 : 1,
                  cursor: creatingProduct ? "wait" : "pointer",
                }}
              >
                {creatingProduct ? "Creating..." : "Create Product"}
              </button>
            </div>
          </section>
        )}

        <section style={summaryPanel}>
          <div style={combinedSelectionHeader}>
            <div className="pm-selector-grid" style={combinedSelectorGrid}>
              <label style={field}>
                <span style={label}>PRODUCT</span>
                <select
                  value={selectedSlug}
                  onChange={(event) => {
                    setSelectedSlug(event.target.value);
                    setSelectedDosage("");
                  }}
                  style={input}
                >
                  {products.map((row) => (
                    <option key={row.id} value={row.slug}>
                      {row.name}
                    </option>
                  ))}
                </select>
              </label>

              <label style={field}>
                <span style={label}>STRENGTH</span>
                <select
                  value={selectedDosage}
                  onChange={(event) => setSelectedDosage(event.target.value)}
                  style={input}
                >
                  {dosages.length === 0 && (
                    <option value="">No dosages yet</option>
                  )}

                  {dosages.map((dosage) => (
                    <option key={dosage} value={dosage}>
                      {dosage}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div style={selectionActions}>
              <div className="pm-status-bar" style={statusBar}>
                <StatusPill
                  label="Stock"
                  value={selectedDosage ? String(inventoryQuantity) : "—"}
                  accent={inventoryQuantity > 0 ? "#00ff99" : "#ffcc00"}
                />

                <StatusPill
                  label="COA"
                  value={coaReady ? "✓ Current" : "Needs COA"}
                  accent={coaReady ? "#00d9ff" : "#ffcc00"}
                />

                <StatusPill
                  label="Lot"
                  value={matchingCoa?.lot_number || "Not Set"}
                  accent={lotReady ? "#00ff99" : "#ffcc00"}
                />

                <StatusPill
                  label="Image"
                  value={imageReady ? "✓ Live" : "Missing"}
                  accent={imageReady ? "#ff45d8" : "#ffcc00"}
                />
              </div>

              {product && (
                <a
                  href={`/products/${product.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  style={secondaryLink}
                >
                  View Live Page
                </a>
              )}
            </div>
          </div>
        </section>

        <section style={actionPanel}>
          <div style={actionHeading}>
            <p style={sectionEyebrow}>WHAT DO YOU WANT TO DO?</p>
            <h2 style={sectionTitle}>Choose one section</h2>
          </div>

          <div className="pm-action-grid" style={actionGrid}>
            <ActionCard
              title="Edit Product"
              text="Storefront details, visibility, homepage settings, descriptions, and storage instructions."
              accent="#00d9ff"
              active={activeTab === "general"}
              onClick={() => openManager("general")}
            />

            <ActionCard
              title="Manage COA / Lot"
              text={
                lotReady
                  ? `Current lot: ${matchingCoa?.lot_number}`
                  : "Verify a certificate and set the current lot for this strength."
              }
              accent={lotReady ? "#00ff99" : "#ffcc00"}
              active={activeTab === "coas"}
              onClick={() => openManager("coas")}
            />

            <ActionCard
              title="Manage Product Image"
              text={
                imageReady
                  ? "View the live image, manually replace it, or open the image generator."
                  : "Add or generate the website image for this product."
              }
              accent="#ff45d8"
              active={activeTab === "images"}
              onClick={() => openManager("images")}
            />
          </div>
        </section>

        {activeTab === "general" && product && (
          <section id="product-manager-inline-manager" style={panel}>
            <div style={sectionHead}>
              <div>
                <p style={sectionEyebrow}>EDIT PRODUCT</p>
                <h2 style={sectionTitle}>{product.name}</h2>
              </div>

              <button
                type="button"
                onClick={() => openManager("images")}
                style={smallNavButton}
              >
                Next: Image →
              </button>
            </div>

            <div className="pm-general-grid" style={generalGrid}>
              <Field label="Name">
                <input
                  value={product.name}
                  onChange={(e) => updateProduct("name", e.target.value)}
                  style={input}
                />
              </Field>

              <Field label="Product Type">
                <select
                  value={product.category || "peptide"}
                  onChange={(e) =>
                    updateProduct("category", e.target.value)
                  }
                  style={input}
                >
                  <option value="peptide">Compound</option>
                  <option value="nasal-spray">Spray</option>
                  <option value="lab-material">Lab Material</option>
                </select>
              </Field>

              <Field label="Product Family">
                <select
                  value={product.product_family || ""}
                  onChange={(e) =>
                    updateProduct("product_family", e.target.value || null)
                  }
                  style={input}
                >
                  <option value="">Unassigned</option>
                  {PRODUCT_FAMILIES.map((family) => (
                    <option key={family.value} value={family.value}>
                      {family.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Accent Color">
                <input
                  type="color"
                  value={product.color || "#ff45d8"}
                  onChange={(e) =>
                    updateProduct("color", e.target.value)
                  }
                  style={colorInput}
                />
              </Field>

              <Field label="Website Visibility">
                <label style={toggleCard}>
                  <input
                    type="checkbox"
                    checked={product.is_active !== false}
                    onChange={(e) =>
                      updateProduct("is_active", e.target.checked)
                    }
                  />
                  <span>
                    {product.is_active !== false
                      ? "Visible on website"
                      : "Hidden from website"}
                  </span>
                </label>
              </Field>

              <Field label="New Product">
                <label style={toggleCard}>
                  <input
                    type="checkbox"
                    checked={Boolean(product.is_new)}
                    onChange={(e) =>
                      updateProduct("is_new", e.target.checked)
                    }
                  />
                  <span>Show NEW badge</span>
                </label>
              </Field>

              <Field label="Feature on Homepage">
                <label style={toggleCard}>
                  <input
                    type="checkbox"
                    checked={Boolean(product.feature_on_homepage)}
                    onChange={(e) =>
                      updateProduct(
                        "feature_on_homepage",
                        e.target.checked
                      )
                    }
                  />
                  <span>Include in New Products section</span>
                </label>
              </Field>

              <Field label="Coming Soon">
                <label style={toggleCard}>
                  <input
                    type="checkbox"
                    checked={Boolean(product.is_coming_soon)}
                    onChange={(e) =>
                      updateProduct(
                        "is_coming_soon",
                        e.target.checked
                      )
                    }
                  />
                  <span>Show COMING SOON badge</span>
                </label>
              </Field>

              <Field label="Homepage Display Order">
                <input
                  type="number"
                  min="0"
                  value={product.homepage_feature_order ?? ""}
                  onChange={(e) =>
                    updateProduct(
                      "homepage_feature_order",
                      e.target.value === ""
                        ? null
                        : Number(e.target.value)
                    )
                  }
                  style={input}
                />
              </Field>

              <Field label="Short Description" wide>
                <textarea
                  value={product.short_description || ""}
                  onChange={(e) =>
                    updateProduct(
                      "short_description",
                      e.target.value
                    )
                  }
                  style={textarea}
                />
              </Field>

              <Field label="Full Description" wide>
                <textarea
                  value={product.description || ""}
                  onChange={(e) =>
                    updateProduct(
                      "description",
                      e.target.value
                    )
                  }
                  style={bigTextarea}
                />
              </Field>

              <Field label="Storage Instructions" wide>
                <textarea
                  value={product.storage || ""}
                  onChange={(e) =>
                    updateProduct("storage", e.target.value)
                  }
                  style={textarea}
                />
              </Field>
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={() => void saveGeneral()}
              style={primaryButton}
            >
              {saving ? "Saving..." : "Save Product Details"}
            </button>
          </section>
        )}

        {activeTab === "coas" && product && (
          <section id="product-manager-inline-manager" style={embeddedManagerPanel}>
            <div style={embeddedManagerHeader}>
              <div>
                <p style={sectionEyebrow}>MANAGE COA / LOT</p>
                <h2 style={sectionTitle}>
                  COA Manager • {product.name}
                  {selectedDosage ? ` • ${selectedDosage}` : ""}
                </h2>
              </div>

              <Link href={coaEngineHref} style={primaryLink}>
                Open Full Page ↗
              </Link>
            </div>

            <iframe
              key={coaEngineHref}
              src={coaEngineHref}
              title={`COA Manager for ${product.name}`}
              style={embeddedManagerFrame}
            />
          </section>
        )}

        {activeTab === "images" && product && (
          <section id="product-manager-inline-manager" style={embeddedManagerPanel}>
            <div style={embeddedManagerHeader}>
              <div>
                <p style={sectionEyebrow}>MANAGE PRODUCT IMAGE</p>
                <h2 style={sectionTitle}>
                  Product Image Engine • {product.name}
                </h2>
              </div>

              <Link href={imageEngineHref} style={primaryLink}>
                Open Full Page ↗
              </Link>
            </div>

            <iframe
              key={imageEngineHref}
              src={imageEngineHref}
              title={`Product Image Engine for ${product.name}`}
              style={embeddedImageManagerFrame}
            />
          </section>
        )}
      </div>
    </main>
  );
}


function StatusPill({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div style={statusPill}>
      <span style={statusPillLabel}>{label}</span>
      <strong style={{ color: accent }}>{value}</strong>
    </div>
  );
}

function ActionCard({
  title,
  text,
  accent,
  active,
  onClick,
}: {
  title: string;
  text: string;
  accent: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...actionCard,
        borderColor: active ? accent : `${accent}55`,
        background: active
          ? `${accent}12`
          : "rgba(255,255,255,.025)",
      }}
    >
      <span style={{ ...actionCardTitle, color: accent }}>
        {title}
      </span>
      <span style={actionCardText}>{text}</span>
    </button>
  );
}

function Summary({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div style={summaryCard}>
      <span style={statusLabel}>{label}</span>
      <strong style={{ color: accent || "#ffffff" }}>{value}</strong>
    </div>
  );
}

function Field({
  label: fieldLabelText,
  children,
  wide = false,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <label style={{ ...field, gridColumn: wide ? "1 / -1" : undefined }}>
      <span style={label}>{fieldLabelText.toUpperCase()}</span>
      {children}
    </label>
  );
}

const page = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at 12% 0%, rgba(255,69,216,.08), transparent 28%), radial-gradient(circle at 88% 0%, rgba(0,217,255,.08), transparent 30%), #050507",
  color: "#ffffff",
  padding: "32px 18px 72px",
};

const shell = {
  width: "min(1450px, 100%)",
  margin: "0 auto",
};

const hero = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 24,
  flexWrap: "wrap" as const,
  padding: 30,
  borderRadius: 24,
  border: "1px solid rgba(255,255,255,.12)",
  background:
    "linear-gradient(135deg, rgba(15,15,20,.98), rgba(8,8,11,.96))",
};

const heroBadges = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap" as const,
  marginBottom: 16,
};

const pinkPill = {
  padding: "7px 10px",
  borderRadius: 999,
  border: "1px solid rgba(255,69,216,.45)",
  color: "#ff75df",
  background: "rgba(255,69,216,.08)",
  fontWeight: 900,
  fontSize: 11,
  letterSpacing: ".12em",
};

const greenText = {
  color: "#00ff99",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: ".08em",
};

const eyebrow = {
  margin: "0 0 8px",
  color: "#7df9ff",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: ".16em",
};

const title = {
  margin: 0,
  fontSize: "clamp(38px, 5vw, 62px)",
  lineHeight: 1,
  fontWeight: 950,
  letterSpacing: "-.04em",
};

const subtitle = {
  margin: "14px 0 0",
  maxWidth: 780,
  color: "#a9abb3",
  fontSize: 15,
  lineHeight: 1.7,
};

const heroActions = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap" as const,
};

const newProductPanel = {
  ...{
    marginTop: 18,
    padding: "clamp(18px, 3vw, 28px)",
    borderRadius: 20,
    border: "1px solid rgba(0,255,153,.34)",
    background:
      "linear-gradient(145deg, rgba(0,255,153,.055), rgba(8,8,12,.96))",
    boxShadow: "0 18px 45px rgba(0,0,0,.32)",
  },
};

const newProductHelp = {
  margin: "0 0 18px",
  color: "#aaaab3",
  lineHeight: 1.65,
};

const newProductActions = {
  marginTop: 18,
  display: "flex",
  justifyContent: "flex-end",
};

const panel = {
  marginTop: 18,
  padding: 24,
  borderRadius: 20,
  border: "1px solid rgba(255,255,255,.10)",
  background: "rgba(12,12,16,.95)",
};

const selectorGrid = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 2fr) minmax(220px, 1fr)",
  gap: 14,
};

const combinedSelectionHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: 16,
  flexWrap: "wrap" as const,
};

const combinedSelectorGrid = {
  display: "grid",
  gridTemplateColumns: "minmax(260px, 2fr) minmax(180px, 1fr)",
  gap: 14,
  flex: "1 1 620px",
};

const selectionActions = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 12,
  flexWrap: "wrap" as const,
  flex: "1 1 420px",
};

const summaryPanel = {
  ...panel,
  background:
    "linear-gradient(135deg, rgba(0,217,255,.045), rgba(255,69,216,.035))",
};

const summaryHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 14,
  flexWrap: "wrap" as const,
  marginBottom: 16,
};

const statusBar = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  flexWrap: "wrap" as const,
};

const statusPill = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  minHeight: 38,
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,.12)",
  background: "rgba(255,255,255,.035)",
};

const statusPillLabel = {
  color: "#8e9098",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: ".08em",
  textTransform: "uppercase" as const,
};

const actionPanel = {
  ...panel,
  padding: 20,
};

const actionHeading = {
  marginBottom: 14,
};

const actionGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 12,
};

const actionCard = {
  minHeight: 150,
  padding: 18,
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "flex-start",
  textAlign: "left" as const,
  border: "1px solid",
  borderRadius: 15,
  cursor: "pointer",
};

const actionCardTitle = {
  fontSize: 19,
  fontWeight: 950,
};

const actionCardText = {
  marginTop: 8,
  color: "#9597a0",
  lineHeight: 1.55,
  fontSize: 13,
};

const sectionHead = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "center",
  flexWrap: "wrap" as const,
  marginBottom: 18,
};

const sectionEyebrow = {
  margin: 0,
  color: "#ff75df",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: ".14em",
};

const sectionTitle = {
  margin: "5px 0 0",
  fontSize: 27,
  fontWeight: 950,
};

const generalGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 14,
  marginBottom: 18,
};

const field = {
  minWidth: 0,
  display: "grid",
  gap: 6,
};

const label = {
  color: "#cfd0d6",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: ".09em",
};

const input = {
  width: "100%",
  minWidth: 0,
  minHeight: 50,
  boxSizing: "border-box" as const,
  padding: "12px 14px",
  border: "1px solid rgba(255,255,255,.15)",
  borderRadius: 10,
  background: "#050507",
  color: "#ffffff",
};

const colorInput = {
  ...input,
  padding: 6,
};

const toggleCard = {
  minHeight: 50,
  padding: "12px 14px",
  display: "flex",
  alignItems: "center",
  gap: 10,
  border: "1px solid rgba(255,255,255,.15)",
  borderRadius: 10,
  background: "#050507",
};

const textarea = {
  ...input,
  minHeight: 120,
  resize: "vertical" as const,
};

const bigTextarea = {
  ...textarea,
  minHeight: 220,
};

const primaryButton = {
  minHeight: 48,
  padding: "11px 16px",
  borderRadius: 10,
  border: "1px solid #00ff99",
  background: "rgba(0,255,153,.11)",
  color: "#00ff99",
  fontWeight: 950,
  cursor: "pointer",
};

const heroActionButton = {
  ...primaryButton,
  minWidth: 170,
  minHeight: 48,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center" as const,
};

const heroActionLink = {
  ...heroActionButton,
  textDecoration: "none",
  border: "1px solid rgba(0,217,255,.72)",
  background: "rgba(0,217,255,.10)",
  color: "#7df9ff",
};

const smallNavButton = {
  minHeight: 40,
  padding: "9px 12px",
  borderRadius: 9,
  border: "1px solid rgba(0,217,255,.35)",
  background: "rgba(0,217,255,.05)",
  color: "#7df9ff",
  fontWeight: 900,
  cursor: "pointer",
};

const primaryLink = {
  display: "inline-flex",
  width: "fit-content",
  alignItems: "center",
  minHeight: 44,
  padding: "10px 14px",
  borderRadius: 10,
  textDecoration: "none",
  border: "1px solid rgba(0,255,153,.55)",
  background: "rgba(0,255,153,.08)",
  color: "#00ff99",
  fontWeight: 950,
};

const secondaryLink = {
  display: "inline-flex",
  width: "fit-content",
  alignItems: "center",
  minHeight: 44,
  padding: "10px 14px",
  borderRadius: 10,
  textDecoration: "none",
  border: "1px solid rgba(0,217,255,.45)",
  background: "rgba(0,217,255,.06)",
  color: "#7df9ff",
  fontWeight: 900,
};

const noticeBox = {
  marginTop: 18,
  padding: "12px 14px",
  display: "flex",
  justifyContent: "space-between",
  gap: 14,
  alignItems: "center",
  border: "1px solid rgba(0,255,153,.40)",
  borderRadius: 11,
  background: "rgba(0,255,153,.07)",
  color: "#00ff99",
};

const closeButton = {
  border: 0,
  background: "transparent",
  color: "#00ff99",
  fontSize: 24,
  cursor: "pointer",
};

const muted = {
  color: "#94969f",
  lineHeight: 1.6,
};

const imageGrid = {
  display: "grid",
  gridTemplateColumns: "minmax(220px, 360px) minmax(0, 1fr)",
  gap: 20,
  alignItems: "start",
};

const imagePreviewCard = {
  padding: 12,
  border: "1px solid rgba(255,255,255,.10)",
  borderRadius: 15,
  background: "#050505",
};

const productImage = {
  display: "block",
  width: "100%",
  aspectRatio: "1 / 1",
  objectFit: "contain" as const,
  borderRadius: 10,
};

const imageActions = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 12,
  alignItems: "flex-start",
};

const embeddedManagerPanel = {
  marginTop: 18,
  padding: 0,
  overflow: "hidden",
  borderRadius: 20,
  border: "1px solid rgba(255,255,255,.10)",
  background: "rgba(12,12,16,.95)",
};

const embeddedManagerHeader = {
  padding: "18px 20px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 14,
  flexWrap: "wrap" as const,
  borderBottom: "1px solid rgba(255,255,255,.08)",
  background: "linear-gradient(135deg, rgba(0,217,255,.035), rgba(255,69,216,.025))",
};

const embeddedManagerFrame = {
  display: "block",
  width: "100%",
  height: "1250px",
  border: 0,
  background: "#050507",
};

const embeddedImageManagerFrame = {
  ...embeddedManagerFrame,
  height: "1650px",
};

const warningBox = {
  padding: 14,
  border: "1px solid rgba(255,204,0,.35)",
  borderRadius: 11,
  background: "rgba(255,204,0,.055)",
  color: "#ffcc00",
  lineHeight: 1.55,
};

const coaSummary = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 12,
};

const statusLabel = {
  display: "block",
  marginBottom: 6,
  color: "#8e9098",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: ".10em",
  textTransform: "uppercase" as const,
};

const summaryCard = {
  padding: 14,
  border: "1px solid rgba(255,255,255,.09)",
  borderRadius: 12,
  background: "rgba(255,255,255,.025)",
  minWidth: 0,
};
