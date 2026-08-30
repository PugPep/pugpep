"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import type {
  InventoryItem,
  NewOptionDraft,
  PricingDraft,
  ProductOption,
} from "../../../lib/admin/productTypes";
import ProductOptionCard from "./ProductOptionCard";

type Props = {
  selectedSlug: string;
  selectedProductName?: string;
  showAddOption: boolean;
  setShowAddOption: Dispatch<SetStateAction<boolean>>;
  newOption: NewOptionDraft;
  setNewOption: Dispatch<SetStateAction<NewOptionDraft>>;
  options: ProductOption[];
  pricingDrafts: Record<string, PricingDraft>;
  inventory: InventoryItem[];
  setInventory: Dispatch<SetStateAction<InventoryItem[]>>;
  addOptionAndInventory: () => Promise<void>;
  updateOption: (
    id: string,
    field: string,
    value: string | number | boolean
  ) => Promise<void>;
  updateOptionLocal: (
    id: string,
    field: keyof ProductOption,
    value: string | number | boolean
  ) => void;
  updatePricingDraft: (
    optionId: string,
    patch: Partial<PricingDraft>
  ) => void;
  updateInventory: (id: string, quantity: number) => Promise<void>;
};

export default function PricingStockPanel({
  selectedSlug,
  selectedProductName,
  showAddOption,
  setShowAddOption,
  newOption,
  setNewOption,
  options,
  pricingDrafts,
  inventory,
  setInventory,
  addOptionAndInventory,
  updateOption,
  updateOptionLocal,
  updatePricingDraft,
  updateInventory,
}: Props) {
  const [expandedDosages, setExpandedDosages] = useState<Record<string, boolean>>({});

  function getInventoryForOption(option: ProductOption) {
    return inventory.find(
      (row) =>
        row.product_slug === option.product_slug &&
        row.dosage === option.dosage &&
        row.purchase_type === "single"
    );
  }

  return (
    <section style={panel}>
      <div style={panelHeader}>
        <div>
          <p style={sectionEyebrow}>PRICING & STOCK</p>
          <h2 style={sectionTitle}>
            {selectedProductName || "Select a Product"}
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
                  onClick={() => void addOptionAndInventory()}
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
            Single inventory automatically controls both single and kit
            availability. Kits become pre-sale when fewer than 10 single units
            are available.
          </p>

          {options.length === 0 ? (
            <div style={emptyState}>
              <p style={muted}>No pricing options found.</p>
            </div>
          ) : (
            <div style={dosageGroups}>
              {Array.from(
                options.reduce((map, option) => {
                  const dosage = option.dosage || "Unspecified";
                  const existing = map.get(dosage) || [];
                  existing.push(option);
                  map.set(dosage, existing);
                  return map;
                }, new Map<string, ProductOption[]>())
              ).map(([dosage, dosageOptions]) => {
                const expanded = Boolean(expandedDosages[dosage]);

                return (
                  <section key={dosage} style={dosageGroup}>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedDosages((current) => ({
                          ...current,
                          [dosage]: !current[dosage],
                        }))
                      }
                      style={dosageButton}
                      aria-expanded={expanded}
                    >
                      <div style={dosageButtonLeft}>
                        <strong style={dosageTitle}>{dosage}</strong>
                        <span style={dosageCount}>
                          {dosageOptions.length}{" "}
                          {dosageOptions.length === 1 ? "OPTION" : "OPTIONS"}
                        </span>
                      </div>

                      <span
                        style={{
                          ...dosageChevron,
                          transform: expanded
                            ? "rotate(180deg)"
                            : "rotate(0deg)",
                        }}
                      >
                        ▼
                      </span>
                    </button>

                    {expanded && (
                      <div style={dosageBody}>
                        {dosageOptions
                          .slice()
                          .sort((a, b) => {
                            if (
                              a.purchase_type === b.purchase_type
                            ) {
                              return 0;
                            }

                            return a.purchase_type === "single"
                              ? -1
                              : 1;
                          })
                          .map((option) => (
                            <div key={option.id} style={optionWrap}>
                              <div style={optionTypeHeading}>
                                {option.dosage} —{" "}
                                {option.purchase_type === "kit"
                                  ? "Kit"
                                  : "Single Vial"}
                              </div>

                              <ProductOptionCard
                                option={option}
                                pricingDraft={
                                  pricingDrafts[option.id] || {
                                    price: String(option.price ?? 0),
                                    cost: String(option.cost ?? 0),
                                    salePercent: String(
                                      option.sale_percent ?? 0
                                    ),
                                  }
                                }
                                inventoryRow={getInventoryForOption(option)}
                                setInventory={setInventory}
                                updateOption={updateOption}
                                updateOptionLocal={updateOptionLocal}
                                updatePricingDraft={updatePricingDraft}
                                updateInventory={updateInventory}
                              />
                            </div>
                          ))}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={field}>
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

const addOptionPanel = {
  marginBottom: 16,
  padding: 21,
  border: "1px solid rgba(255,69,216,.28)",
  borderRadius: 12,
  background: "rgba(255,69,216,.04)",
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

const dosageGroups = {
  display: "grid",
  gap: 10,
};

const dosageGroup = {
  overflow: "hidden",
  border: "1px solid rgba(255,255,255,.12)",
  borderRadius: 14,
  background: "rgba(0,0,0,.24)",
};

const dosageButton = {
  width: "100%",
  minHeight: 62,
  padding: "14px 16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 14,
  border: "none",
  background: "rgba(255,255,255,.025)",
  color: "#ffffff",
  textAlign: "left" as const,
  cursor: "pointer",
};

const dosageButtonLeft = {
  minWidth: 0,
  display: "flex",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap" as const,
};

const dosageTitle = {
  color: "#ff75df",
  fontSize: 22,
  fontWeight: 950,
};

const dosageCount = {
  padding: "4px 8px",
  border: "1px solid rgba(0,217,255,.28)",
  borderRadius: 999,
  background: "rgba(0,217,255,.05)",
  color: "#7df9ff",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: ".06em",
};

const dosageChevron = {
  flexShrink: 0,
  color: "#00ff99",
  fontSize: 15,
  transition: "transform .16s ease",
};

const dosageBody = {
  padding: 12,
  display: "grid",
  gap: 12,
  borderTop: "1px solid rgba(255,255,255,.08)",
};

const optionWrap = {
  display: "grid",
  gap: 7,
};

const optionTypeHeading = {
  paddingLeft: 4,
  color: "#00d9ff",
  fontSize: 14,
  fontWeight: 900,
};
