"use client";

import type { Dispatch, SetStateAction } from "react";
import type { NewProductDraft } from "../../../lib/admin/productTypes";

type Props = {
  newProduct: NewProductDraft;
  setNewProduct: Dispatch<SetStateAction<NewProductDraft>>;
  onClose: () => void;
  createProduct: () => Promise<void>;
};

export default function AddProductPanel({
  newProduct,
  setNewProduct,
  onClose,
  createProduct,
}: Props) {
  return (
    <section style={panel}>
      <div style={panelHeader}>
        <div>
          <p style={sectionEyebrow}>NEW PRODUCT</p>
          <h2 style={sectionTitle}>Create Product</h2>
        </div>

        <button type="button" onClick={onClose} style={closeButton}>
          Close
        </button>
      </div>

      <div style={formGrid}>
        <Field label="Product Name">
          <input
            value={newProduct.name}
            onChange={(event) =>
              setNewProduct({ ...newProduct, name: event.target.value })
            }
            style={input}
          />
        </Field>

        <Field label="Slug">
          <input
            value={newProduct.slug}
            onChange={(event) =>
              setNewProduct({ ...newProduct, slug: event.target.value })
            }
            style={input}
          />
        </Field>

        <Field label="Product Type">
          <select
            value={newProduct.category}
            onChange={(event) =>
              setNewProduct({ ...newProduct, category: event.target.value })
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
              setNewProduct({ ...newProduct, image: event.target.value })
            }
            style={input}
          />
        </Field>

        <Field label="Accent Color">
          <input
            type="color"
            value={newProduct.color}
            onChange={(event) =>
              setNewProduct({ ...newProduct, color: event.target.value })
            }
            style={colorInput}
          />
        </Field>

        <Field label="Coming Soon">
          <label style={inlineToggle}>
            <input
              type="checkbox"
              checked={newProduct.is_coming_soon}
              onChange={(event) =>
                setNewProduct({
                  ...newProduct,
                  is_coming_soon: event.target.checked,
                  coming_soon_date: event.target.checked
                    ? newProduct.coming_soon_date
                    : null,
                })
              }
            />
            Show COMING SOON badge
          </label>
        </Field>

        {newProduct.is_coming_soon && (
          <Field label="Expected Launch Date">
            <input
              type="date"
              value={newProduct.coming_soon_date || ""}
              onChange={(event) =>
                setNewProduct({
                  ...newProduct,
                  coming_soon_date: event.target.value || null,
                })
              }
              style={input}
            />
          </Field>
        )}

        <Field label="New Product">
          <label style={inlineToggle}>
            <input
              type="checkbox"
              checked={newProduct.is_new}
              onChange={(event) =>
                setNewProduct({
                  ...newProduct,
                  is_new: event.target.checked,
                })
              }
            />
            Show NEW badge
          </label>
        </Field>

        <Field label="NEW Until">
          <input
            type="date"
            value={newProduct.new_until || ""}
            onChange={(event) =>
              setNewProduct({
                ...newProduct,
                new_until: event.target.value || null,
              })
            }
            style={input}
          />
        </Field>

        <Field label="Homepage">
          <label style={inlineToggle}>
            <input
              type="checkbox"
              checked={newProduct.feature_on_homepage}
              onChange={(event) =>
                setNewProduct({
                  ...newProduct,
                  feature_on_homepage: event.target.checked,
                })
              }
            />
            Feature on homepage
          </label>
        </Field>

        <Field label="Homepage Order">
          <input
            type="number"
            min="1"
            value={newProduct.homepage_feature_order ?? ""}
            onChange={(event) =>
              setNewProduct({
                ...newProduct,
                homepage_feature_order: event.target.value
                  ? Number(event.target.value)
                  : null,
              })
            }
            style={input}
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
      </div>

      <button
        type="button"
        onClick={() => void createProduct()}
        style={primaryButton}
      >
        Save New Product
      </button>
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

const primaryButton = {
  minHeight: 54,
  fontSize: 16,
  marginTop: 16,
  padding: "13px 18px",
  border: "1px solid #45d97a",
  borderRadius: 9,
  background: "linear-gradient(180deg, #2eea6f, #19b857)",
  color: "#ffffff",
  fontWeight: 900,
  cursor: "pointer",
};
