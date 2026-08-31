

import type { useAdminInventory } from "../../../hooks/admin/useAdminInventory";
import type { Product } from "../../../lib/admin/inventoryTypes";

type AdminInventory = ReturnType<typeof useAdminInventory>;

export default function ProductDetailsPanel({
  admin,
}: {
  admin: AdminInventory;
}) {
  const {
    selectedSlug,
    selectedProduct,
    setSelectedProduct,
    imageUploading,
    uploadProductImage,
    updateProductField,
    setProductActive,
    saveProductChanges,
    archiveProduct,
  } = admin;

  if (!selectedSlug) return null;

  return (
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

                <section
                  style={{
                    ...visibilityPanel,
                    borderColor:
                      selectedProduct.is_active === false
                        ? "rgba(255,204,0,.42)"
                        : "rgba(0,255,153,.38)",
                    background:
                      selectedProduct.is_active === false
                        ? "linear-gradient(145deg, rgba(255,204,0,.07), rgba(255,69,216,.025))"
                        : "linear-gradient(145deg, rgba(0,255,153,.07), rgba(0,217,255,.025))",
                  }}
                >
                  <div>
                    <p style={visibilityEyebrow}>
                      PRODUCT VISIBILITY
                    </p>

                    <h3 style={visibilityTitle}>
                      {selectedProduct.is_active === false
                        ? "Hidden From Website"
                        : "Visible On Website"}
                    </h3>

                    <p style={visibilityText}>
                      {selectedProduct.is_active === false
                        ? "This product remains in Admin Inventory but is hidden from customers."
                        : "This product is active and can appear on the customer website."}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      void setProductActive(
                        selectedProduct.is_active === false
                      );
                    }}
                    style={{
                      ...visibilityButton,
                      borderColor:
                        selectedProduct.is_active === false
                          ? "rgba(0,255,153,.55)"
                          : "rgba(255,204,0,.55)",
                      background:
                        selectedProduct.is_active === false
                          ? "rgba(0,255,153,.10)"
                          : "rgba(255,204,0,.08)",
                      color:
                        selectedProduct.is_active === false
                          ? "#00ff99"
                          : "#ffcc00",
                    }}
                  >
                    {selectedProduct.is_active === false
                      ? "SHOW ON WEBSITE"
                      : "HIDE FROM WEBSITE"}
                  </button>
                </section>

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
                      <option value="nasal-spray">Spray</option>
                      <option value="lab-material">Lab Material</option>
                    </select>
                  </Field>

                  <Field label="Coming Soon">
                    <label style={toggleCard}>
                      <input
                        type="checkbox"
                        checked={Boolean(selectedProduct.is_coming_soon)}
                        onChange={(event) =>
                          setSelectedProduct((previous: Partial<Product>) => ({
                            ...previous,
                            is_coming_soon: event.target.checked,
                            coming_soon_date: event.target.checked
                              ? previous.coming_soon_date || null
                              : null,
                          }))
                        }
                      />
                      <span>Show a COMING SOON badge for this product</span>
                    </label>
                  </Field>

                  {selectedProduct.is_coming_soon && (
                    <Field label="Expected Launch Date">
                      <input
                        type="date"
                        value={selectedProduct.coming_soon_date || ""}
                        onChange={(event) =>
                          setSelectedProduct((previous: Partial<Product>) => ({
                            ...previous,
                            coming_soon_date: event.target.value || null,
                          }))
                        }
                        style={input}
                      />
                    </Field>
                  )}

                  <Field label="New Product">
                    <label style={toggleCard}>
                      <input
                        type="checkbox"
                        checked={Boolean(selectedProduct.is_new)}
                        onChange={(event) =>
                          updateProductField("is_new", event.target.checked)
                        }
                      />
                      <span>Show a NEW badge for this product</span>
                    </label>
                  </Field>

                  <Field label="Feature on Homepage">
                    <label style={toggleCard}>
                      <input
                        type="checkbox"
                        checked={Boolean(selectedProduct.feature_on_homepage)}
                        onChange={(event) =>
                          updateProductField(
                            "feature_on_homepage",
                            event.target.checked
                          )
                        }
                      />
                      <span>Include in the New Products homepage section</span>
                    </label>
                  </Field>

                  <Field label="New Until">
                    <input
                      type="date"
                      value={selectedProduct.new_until || ""}
                      onChange={(event) =>
                        updateProductField("new_until", event.target.value)
                      }
                      style={input}
                    />
                  </Field>

                  <Field label="Homepage Display Order">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={selectedProduct.homepage_feature_order ?? ""}
                      onChange={(event) =>
                        setSelectedProduct((previous: Partial<Product>) => ({
                          ...previous,
                          homepage_feature_order:
                            event.target.value === ""
                              ? null
                              : Number(event.target.value),
                        }))
                      }
                      placeholder="1 = first"
                      style={input}
                    />
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

                  <Field label="Storage Instructions" wide>
                    <textarea
                      value={selectedProduct.storage || ""}
                      onChange={(event) =>
                        updateProductField(
                          "storage",
                          event.target.value
                        )
                      }
                      placeholder="Example: Store refrigerated at 2–8°C. Protect from light."
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

                  <button
                    type="button"
                    onClick={() => {
                      void archiveProduct();
                    }}
                    style={dangerButton}
                  >
                    Archive Product
                  </button>
                </div>
              </section>
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

const panelHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 14,
  flexWrap: "wrap" as const,
  marginBottom: 16,
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

const toggleCard = {
  minHeight: 54,
  boxSizing: "border-box" as const,
  padding: "13px 14px",
  display: "flex",
  alignItems: "center",
  gap: 10,
  border: "1px solid rgba(255,255,255,.16)",
  borderRadius: 9,
  background: "#050507",
  color: "#ffffff",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 800,
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

const dangerButton = {
  minHeight: 54,
  fontSize: 16,
  padding: "13px 18px",
  border: "1px solid rgba(255,111,111,.58)",
  borderRadius: 9,
  background: "rgba(255,111,111,.08)",
  color: "#ff8a8a",
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

const actionRow = {
  marginTop: 16,
  display: "flex",
  gap: 12,
  flexWrap: "wrap" as const,
};

const helperText = {
  margin: "0 0 18px",
  color: "#b1b1ba",
  fontSize: 16,
  lineHeight: 1.7,
};

const visibilityPanel = {
  marginBottom: 20,
  padding: "16px 18px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  flexWrap: "wrap" as const,
  border: "1px solid",
  borderRadius: 14,
};

const visibilityEyebrow = {
  margin: 0,
  color: "#7df9ff",
  fontSize: 11,
  fontWeight: 950,
  letterSpacing: ".12em",
};

const visibilityTitle = {
  margin: "4px 0 0",
  color: "#ffffff",
  fontSize: 20,
};

const visibilityText = {
  margin: "6px 0 0",
  maxWidth: 720,
  color: "#aeb1b7",
  fontSize: 14,
  lineHeight: 1.55,
};

const visibilityButton = {
  minHeight: 44,
  padding: "10px 14px",
  border: "1px solid",
  borderRadius: 9,
  fontSize: 12,
  fontWeight: 950,
  letterSpacing: ".05em",
  cursor: "pointer",
};

const panel = {
  padding: "clamp(18px, 3vw, 24px)",
  border: "1px solid rgba(0,217,255,.32)",
  borderRadius: 18,
  background:
    "linear-gradient(145deg, rgba(8,8,12,.96), rgba(15,8,18,.94))",
  boxShadow: "0 0 20px rgba(0,217,255,.07)",
};
