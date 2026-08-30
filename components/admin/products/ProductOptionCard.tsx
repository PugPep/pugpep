"use client";

import type { Dispatch, SetStateAction } from "react";
import type {
  InventoryItem,
  PricingDraft,
  ProductOption,
} from "../../../lib/admin/productTypes";

type Props = {
  option: ProductOption;
  pricingDraft: PricingDraft;
  inventoryRow?: InventoryItem;
  setInventory: Dispatch<SetStateAction<InventoryItem[]>>;
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

export default function ProductOptionCard({
  option,
  pricingDraft,
  inventoryRow,
  setInventory,
  updateOption,
  updateOptionLocal,
  updatePricingDraft,
  updateInventory,
}: Props) {
  const quantity = inventoryRow ? Number(inventoryRow.quantity || 0) : 0;

  const autoStatus =
    option.purchase_type === "kit"
      ? quantity >= 10
        ? "in stock"
        : "pre-sale"
      : quantity > 0
      ? "in stock"
      : "out of stock";

  const regularPrice = Math.max(0, Number(pricingDraft.price || 0));
  const cost = Math.max(0, Number(pricingDraft.cost || 0));

  const salePercent = Math.min(
    100,
    Math.max(0, Number(pricingDraft.salePercent || 0))
  );

  const previewPrice = regularPrice * (1 - salePercent / 100);
  const profit = previewPrice - cost;
  const margin = previewPrice > 0 ? (profit / previewPrice) * 100 : 0;

  return (
    <article style={optionCard}>
      <div style={optionHeader}>
        <div>
          <input
            defaultValue={option.dosage}
            onBlur={(event) => {
              void updateOption(option.id, "dosage", event.target.value);
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
          label={salePercent > 0 ? "Sale Price Preview" : "Price"}
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

        <OptionMetric label="Margin" value={`${margin.toFixed(1)}%`} />

        <OptionMetric label="Single Units" value={String(quantity)} accent="#00d9ff" />

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
            value={pricingDraft.price}
            onChange={(event) =>
              updatePricingDraft(option.id, {
                price: event.target.value,
              })
            }
            onBlur={() => {
              void updateOption(
                option.id,
                "price",
                Math.max(0, Number(pricingDraft.price || 0))
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
            value={pricingDraft.cost}
            onChange={(event) =>
              updatePricingDraft(option.id, {
                cost: event.target.value,
              })
            }
            onBlur={() => {
              void updateOption(
                option.id,
                "cost",
                Math.max(0, Number(pricingDraft.cost || 0))
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
            value={pricingDraft.salePercent}
            onChange={(event) =>
              updatePricingDraft(option.id, {
                salePercent: event.target.value,
              })
            }
            onBlur={() => {
              const nextSalePercent = Math.min(
                100,
                Math.max(0, Number(pricingDraft.salePercent || 0))
              );

              void updateOption(
                option.id,
                "sale_percent",
                nextSalePercent
              );
            }}
            style={input}
          />
        </Field>

        <label style={saleToggle}>
          <input
            type="checkbox"
            checked={option.sale_active || false}
            onChange={(event) => {
              const checked = event.target.checked;

              updateOptionLocal(option.id, "sale_active", checked);
              void updateOption(option.id, "sale_active", checked);
            }}
          />
          Sale Active
        </label>
      </div>

      {inventoryRow ? (
        <div style={inventoryEditor}>
          <div>
            <span style={fieldLabel}>Inventory Quantity</span>

            <input
              type="number"
              min="0"
              value={inventoryRow.quantity}
              onChange={(event) =>
                setInventory((previous) =>
                  previous.map((row) =>
                    row.id === inventoryRow.id
                      ? { ...row, quantity: Number(event.target.value) }
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
              onClick={() =>
                void updateInventory(
                  inventoryRow.id,
                  inventoryRow.quantity - 1
                )
              }
              style={dangerButton}
            >
              −1
            </button>

            <button
              type="button"
              onClick={() =>
                void updateInventory(
                  inventoryRow.id,
                  inventoryRow.quantity + 1
                )
              }
              style={successButton}
            >
              +1
            </button>

            <button
              type="button"
              onClick={() =>
                void updateInventory(
                  inventoryRow.id,
                  inventoryRow.quantity
                )
              }
              style={primaryButton}
            >
              Save Inventory
            </button>
          </div>
        </div>
      ) : (
        <p style={muted}>
          This kit uses the matching single-unit inventory.
        </p>
      )}
    </article>
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

const muted = {
  color: "#a9a9b2",
  fontSize: 16,
  lineHeight: 1.7,
};
