"use client";

import type { useAdminInventory } from "../../../hooks/admin/useAdminInventory";
import type { InventoryOption } from "../../../lib/admin/inventoryTypes";

type AdminInventory = ReturnType<typeof useAdminInventory>;

export default function InventoryOptionCard({
  admin,
  option,
}: {
  admin: AdminInventory;
  option: InventoryOption;
}) {
  const {
    pricingDrafts,
    setInventory,
    updateInventory,
    updatePricingDraft,
    updateOption,
    updateOptionLocal,
    setOptionActive,
    archiveOption,
    restoreOption,
    getInventoryForOption,
    getKitSavings,
    getKitStatus,
    getSingleStatus,
  } = admin;

  const inv = getInventoryForOption(option);
  const isArchived = Boolean(option.archived_at);
  const quantity = inv ? Number(inv.quantity || 0) : 0;

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

  const regularPrice = Math.max(0, Number(draft.price || 0));
  const cost = Math.max(0, Number(draft.cost || 0));
  const salePercent = Math.min(
    100,
    Math.max(0, Number(draft.salePercent || 0))
  );
  const previewPrice = regularPrice * (1 - salePercent / 100);
  const profit = previewPrice - cost;
  const margin = previewPrice > 0 ? (profit / previewPrice) * 100 : 0;
  const kitSavings =
    option.purchase_type === "kit" ? getKitSavings(option) : null;

  return (
                          <article
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

                            {kitSavings && (
                              <div style={kitSavingsAdminCard}>
                                <div>
                                  <span style={kitSavingsAdminEyebrow}>
                                    BUILT-IN KIT SAVINGS
                                  </span>

                                  <strong style={kitSavingsAdminTitle}>
                                    {kitSavings.savingsPercent.toFixed(2)}% OFF
                                  </strong>
                                </div>

                                <div style={kitSavingsAdminMetrics}>
                                  <span>
                                    Single vial{" "}
                                    <strong>
                                      ${kitSavings.singlePrice.toFixed(2)}
                                    </strong>
                                  </span>

                                  <span>
                                    10 singles{" "}
                                    <strong>
                                      ${kitSavings.tenSingleValue.toFixed(2)}
                                    </strong>
                                  </span>

                                  <span>
                                    Kit{" "}
                                    <strong>
                                      ${kitSavings.kitPrice.toFixed(2)}
                                    </strong>
                                  </span>

                                  <span style={{ color: "#00ff99" }}>
                                    Saves{" "}
                                    <strong>
                                      ${kitSavings.savingsAmount.toFixed(2)}
                                    </strong>
                                  </span>
                                </div>
                              </div>
                            )}

                            {option.purchase_type === "kit" &&
                              !kitSavings && (
                                <div style={kitSavingsMissing}>
                                  Add an active matching single-vial option for this
                                  dosage to calculate the kit discount.
                                </div>
                              )}

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

                                {option.purchase_type === "single" ? (
                                  <label style={saleToggle}>
                                    <input
                                      type="checkbox"
                                      checked={
                                        option.bundle_discount_enabled !== false
                                      }
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
                                ) : (
                                  <span style={kitPricingBadge}>
                                    KIT PRICING · NO BUNDLE TIERS
                                  </span>
                                )}

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

                            {option.purchase_type === "single" && (
                              <div style={bundleEditor}>
                                <div style={bundleEditorHeader}>
                                  <div>
                                    <strong style={{ color: "#00d9ff" }}>
                                      Single-Vial Bundle Savings
                                    </strong>

                                    <p style={bundleEditorHelp}>
                                      Standard structure: 3+ vials = 2% off,
                                      5+ vials = 4% off, and 8+ vials = 7% off.
                                      Bundle savings pause whenever a manual or
                                      campaign sale is active. At 10 vials,
                                      customers should choose the 10-vial kit.
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
                                          max="9"
                                          value={Number(
                                            option[qtyField as keyof InventoryOption] || 0
                                          )}
                                          onChange={(event) =>
                                            updateOptionLocal(option.id, {
                                              [qtyField]: Math.min(
                                                9,
                                                Math.max(
                                                  1,
                                                  Number(
                                                    event.target.value || 1
                                                  )
                                                )
                                              ),
                                            } as Partial<InventoryOption>)
                                          }
                                          onBlur={() =>
                                            void updateOption(
                                              option.id,
                                              qtyField,
                                              Math.min(
                                                9,
                                                Math.max(
                                                  1,
                                                  Number(
                                                    option[
                                                      qtyField as keyof InventoryOption
                                                    ] || 1
                                                  )
                                                )
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
                                          value={Number(
                                            option[
                                              discountField as keyof InventoryOption
                                            ] || 0
                                          )}
                                          onChange={(event) =>
                                            updateOptionLocal(option.id, {
                                              [discountField]: Math.min(
                                                100,
                                                Math.max(
                                                  0,
                                                  Number(
                                                    event.target.value || 0
                                                  )
                                                )
                                              ),
                                            } as Partial<InventoryOption>)
                                          }
                                          onBlur={() =>
                                            void updateOption(
                                              option.id,
                                              discountField,
                                              Math.min(
                                                100,
                                                Math.max(
                                                  0,
                                                  Number(
                                                    option[
                                                      discountField as keyof InventoryOption
                                                    ] || 0
                                                  )
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
                            )}

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

function StatusBadge({ status }: { status: string }) {
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

const kitSavingsAdminCard = {
  marginTop: 12,
  padding: 14,
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  flexWrap: "wrap" as const,
  border: "1px solid rgba(0,255,153,.32)",
  borderRadius: 11,
  background: "rgba(0,255,153,.055)",
};

const kitSavingsAdminEyebrow = {
  display: "block",
  color: "#8d8d96",
  fontSize: 9,
  fontWeight: 900,
  letterSpacing: ".12em",
};

const kitSavingsAdminTitle = {
  display: "block",
  marginTop: 4,
  color: "#00ff99",
  fontSize: 22,
};

const kitSavingsAdminMetrics = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 14,
  flexWrap: "wrap" as const,
  color: "#c6c6cd",
  fontSize: 12,
};

const kitSavingsMissing = {
  marginTop: 12,
  padding: "10px 12px",
  border: "1px solid rgba(255,204,0,.30)",
  borderRadius: 9,
  background: "rgba(255,204,0,.05)",
  color: "#ffcc66",
  fontSize: 12,
};

const kitPricingBadge = {
  padding: "5px 8px",
  borderRadius: 999,
  border: "1px solid rgba(0,255,153,.30)",
  background: "rgba(0,255,153,.05)",
  color: "#00ff99",
  fontSize: 10,
  fontWeight: 900,
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
  minHeight: 46,
  padding: "10px 14px",
  border: "1px solid rgba(0,217,255,.46)",
  borderRadius: 9,
  background: "rgba(0,217,255,.06)",
  color: "#7df9ff",
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

const muted = {
  color: "#a9a9b2",
  fontSize: 16,
  lineHeight: 1.7,
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