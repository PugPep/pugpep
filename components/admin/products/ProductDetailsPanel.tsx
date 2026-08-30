"use client";

import type { Dispatch, SetStateAction } from "react";
import type { Product } from "../../../lib/admin/productTypes";

type Props = {
  selectedSlug: string;
  selectedProduct: Partial<Product>;
  setSelectedProduct: Dispatch<SetStateAction<Partial<Product>>>;
  updateProductField: (
    field: keyof Product,
    value: string | boolean
  ) => void;
  setProductActive: (nextActive: boolean) => Promise<void>;
  saveProductChanges: () => Promise<void>;
  deleteProduct: () => Promise<void>;
};

export default function ProductDetailsPanel({
  selectedSlug,
  selectedProduct,
  setSelectedProduct,
  updateProductField,
  setProductActive,
  saveProductChanges,
  deleteProduct,
}: Props) {
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
              updateProductField("category", event.target.value)
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

        <Field label="Launch Status">
          <label style={inlineToggle}>
            <input
              type="checkbox"
              checked={selectedProduct.is_coming_soon ?? false}
              onChange={(event) =>
                updateProductField(
                  "is_coming_soon",
                  event.target.checked
                )
              }
            />
            Coming Soon
          </label>
        </Field>

        <Field label="Coming Soon Date">
          <input
            type="date"
            value={selectedProduct.coming_soon_date || ""}
            onChange={(event) =>
              updateProductField(
                "coming_soon_date",
                event.target.value
              )
            }
            style={input}
          />
        </Field>

        <Field label="New Product">
          <label style={inlineToggle}>
            <input
              type="checkbox"
              checked={selectedProduct.is_new ?? false}
              onChange={(event) =>
                updateProductField("is_new", event.target.checked)
              }
            />
            Show NEW badge
          </label>
        </Field>

        <Field label="NEW Until">
          <input
            type="date"
            value={selectedProduct.new_until || ""}
            onChange={(event) =>
              updateProductField("new_until", event.target.value)
            }
            style={input}
          />
        </Field>

        <Field label="Homepage">
          <label style={inlineToggle}>
            <input
              type="checkbox"
              checked={selectedProduct.feature_on_homepage ?? false}
              onChange={(event) =>
                updateProductField(
                  "feature_on_homepage",
                  event.target.checked
                )
              }
            />
            Feature on homepage
          </label>
        </Field>

        <Field label="Homepage Order">
          <input
            type="number"
            min="1"
            value={selectedProduct.homepage_feature_order ?? ""}
            onChange={(event) =>
              setSelectedProduct((previous) => ({
                ...previous,
                homepage_feature_order: event.target.value
                  ? Number(event.target.value)
                  : null,
              }))
            }
            style={input}
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
              updateProductField("description", event.target.value)
            }
            style={bigTextarea}
          />
        </Field>
      </div>

      <div style={storefrontSummary}>
        <Summary
          label="CUSTOMER STATUS"
          value={
            !selectedProduct.is_active
              ? "HIDDEN"
              : selectedProduct.is_coming_soon
              ? "COMING SOON"
              : "LIVE"
          }
        />

        <Summary
          label="NEW BADGE"
          value={
            selectedProduct.is_new
              ? selectedProduct.new_until
                ? `UNTIL ${selectedProduct.new_until}`
                : "ON"
              : "OFF"
          }
        />

        <Summary
          label="HOMEPAGE"
          value={
            selectedProduct.feature_on_homepage
              ? `FEATURED #${selectedProduct.homepage_feature_order ?? "—"}`
              : "NOT FEATURED"
          }
        />

        <Summary
          label="PURCHASING"
          value={
            selectedProduct.is_active &&
            !selectedProduct.is_coming_soon
              ? "ENABLED"
              : "DISABLED"
          }
        />
      </div>

      <div style={activeBox}>
        <label style={activeToggle}>
          <input
            type="checkbox"
            checked={selectedProduct.is_active ?? true}
            onChange={(event) =>
              void setProductActive(event.target.checked)
            }
          />

          <span>
            <strong style={{ color: "#ffffff" }}>
              Active Product
            </strong>

            <small
              style={{
                display: "block",
                marginTop: 3,
                color: selectedProduct.is_active
                  ? "#00ff99"
                  : "#ffcc00",
              }}
            >
              {selectedProduct.is_active
                ? "Visible to customers"
                : "Hidden from customers but kept in the database"}
            </small>
          </span>
        </label>
      </div>

      <div style={actionRow}>
        <button
          type="button"
          onClick={() => void saveProductChanges()}
          style={primaryButton}
        >
          Save Product Changes
        </button>

        <button
          type="button"
          onClick={() => void deleteProduct()}
          style={dangerButton}
        >
          Delete Product
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

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span style={summaryLabel}>{label}</span>
      <strong style={summaryValue}>{value}</strong>
    </div>
  );
}

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

const inlineToggle = {
  minHeight: 54,
  padding: "12px 14px",
  display: "flex",
  alignItems: "center",
  gap: 9,
  border: "1px solid rgba(255,255,255,.16)",
  borderRadius: 9,
  background: "#050507",
  color: "#ffffff",
  fontWeight: 800,
};

const storefrontSummary = {
  marginTop: 18,
  padding: 14,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 10,
  border: "1px solid rgba(0,217,255,.24)",
  borderRadius: 11,
  background: "rgba(0,217,255,.035)",
};

const summaryLabel = {
  display: "block",
  color: "#838992",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: ".08em",
};

const summaryValue = {
  display: "block",
  marginTop: 4,
  color: "#ffffff",
  fontSize: 13,
};

const activeBox = {
  marginTop: 18,
  padding: 14,
  border: "1px solid rgba(0,255,153,.28)",
  borderRadius: 11,
  background: "rgba(0,255,153,.04)",
};

const activeToggle = {
  display: "flex",
  alignItems: "center",
  gap: 9,
  color: "#d0d0d6",
  fontWeight: 800,
};

const actionRow = {
  marginTop: 16,
  display: "flex",
  gap: 12,
  flexWrap: "wrap" as const,
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
  border: "1px solid rgba(255,93,93,.56)",
  borderRadius: 9,
  background: "rgba(255,93,93,.07)",
  color: "#ff8585",
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
