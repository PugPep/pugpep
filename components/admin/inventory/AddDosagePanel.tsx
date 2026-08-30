"use client";

import type { useAdminInventory } from "../../../hooks/admin/useAdminInventory";

type AdminInventory = ReturnType<typeof useAdminInventory>;

export default function AddDosagePanel({
  admin,
}: {
  admin: AdminInventory;
}) {
  const {
    showAddOption,
    newOption,
    setNewOption,
    setShowAddOption,
    addOptionAndInventory,
  } = admin;

  if (!showAddOption) return null;

  return (
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