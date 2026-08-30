"use client";

import { useEffect, useMemo, useState } from "react";
import type { useAdminInventory } from "../../../hooks/admin/useAdminInventory";
import type { InventoryOption } from "../../../lib/admin/inventoryTypes";
import AddDosagePanel from "./AddDosagePanel";
import InventoryOptionCard from "./InventoryOptionCard";

type AdminInventory = ReturnType<typeof useAdminInventory>;

function dosageNumber(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

export default function DosageAccordion({
  admin,
}: {
  admin: AdminInventory;
}) {
  const {
    selectedSlug,
    selectedProduct,
    options,
    setShowAddOption,
  } = admin;

  const [expandedDosage, setExpandedDosage] = useState<string | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  useEffect(() => {
    setExpandedDosage(null);
    setSelectedOptionId(null);
  }, [selectedSlug]);

  const grouped = useMemo(() => {
    const groups = new Map<string, InventoryOption[]>();

    for (const option of options) {
      const dosage = option.dosage || "Unspecified";
      const current = groups.get(dosage) || [];
      current.push(option);
      groups.set(dosage, current);
    }

    return Array.from(groups.entries())
      .sort(([a], [b]) => dosageNumber(a) - dosageNumber(b))
      .map(([dosage, dosageOptions]) => ({
        dosage,
        options: dosageOptions.slice().sort((a, b) => {
          if (a.purchase_type === b.purchase_type) return 0;
          return a.purchase_type === "single" ? -1 : 1;
        }),
      }));
  }, [options]);

  return (
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
          <AddDosagePanel admin={admin} />

          <p style={helperText}>
            Select a dosage to load its Single Vial and Kit controls. Detailed
            option cards are not mounted until you open that dosage.
          </p>

          {grouped.length === 0 ? (
            <div style={emptyState}>
              <p style={muted}>No pricing options found.</p>
            </div>
          ) : (
            <div style={dosageList}>
              {grouped.map((group) => {
                const expanded = expandedDosage === group.dosage;

                return (
                  <section key={group.dosage} style={dosageGroup}>
                    <button
                      type="button"
                      onClick={() => {
                        setExpandedDosage((current) => {
                          const next =
                            current === group.dosage ? null : group.dosage;

                          if (next !== current) {
                            setSelectedOptionId(null);
                          }

                          return next;
                        });
                      }}
                      style={dosageButton}
                      aria-expanded={expanded}
                    >
                      <div style={dosageLabelWrap}>
                        <strong style={dosageTitle}>{group.dosage}</strong>
                        <span style={optionCount}>
                          {group.options.length}{" "}
                          {group.options.length === 1 ? "OPTION" : "OPTIONS"}
                        </span>
                      </div>

                      <span
                        style={{
                          ...chevron,
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
                        <div style={optionChoiceGrid}>
                          {group.options.map((option) => {
                            const selected =
                              selectedOptionId === option.id;

                            return (
                              <button
                                key={option.id}
                                type="button"
                                onClick={() =>
                                  setSelectedOptionId((current) =>
                                    current === option.id
                                      ? null
                                      : option.id
                                  )
                                }
                                style={{
                                  ...optionChoiceButton,
                                  borderColor: selected
                                    ? "#00ff99"
                                    : "rgba(255,255,255,.14)",
                                  background: selected
                                    ? "rgba(0,255,153,.08)"
                                    : "rgba(255,255,255,.025)",
                                  color: selected
                                    ? "#00ff99"
                                    : "#ffffff",
                                }}
                                aria-expanded={selected}
                              >
                                <span style={optionChoiceTitle}>
                                  {option.purchase_type === "kit"
                                    ? "Kit"
                                    : "Single Vial"}
                                </span>

                                <span style={optionChoiceChevron}>
                                  {selected ? "▲" : "▼"}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {group.options.map((option) =>
                          selectedOptionId === option.id ? (
                            <div key={option.id} style={optionShell}>
                              <div style={optionHeading}>
                                {option.dosage} —{" "}
                                {option.purchase_type === "kit"
                                  ? "Kit"
                                  : "Single Vial"}
                              </div>

                              <InventoryOptionCard
                                admin={admin}
                                option={option}
                              />
                            </div>
                          ) : null
                        )}
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

const emptyIcon = { fontSize: 36 };

const muted = {
  color: "#a9a9b2",
  fontSize: 16,
  lineHeight: 1.7,
};

const dosageList = {
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
  minHeight: 64,
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

const dosageLabelWrap = {
  display: "flex",
  alignItems: "center",
  gap: 11,
  flexWrap: "wrap" as const,
};

const dosageTitle = {
  color: "#ff75df",
  fontSize: 22,
  fontWeight: 950,
};

const optionCount = {
  padding: "4px 8px",
  border: "1px solid rgba(0,217,255,.30)",
  borderRadius: 999,
  color: "#7df9ff",
  fontSize: 10,
  fontWeight: 900,
};

const chevron = {
  color: "#00ff99",
  fontSize: 15,
  transition: "transform .16s ease",
};

const dosageBody = {
  padding: 12,
  display: "grid",
  gap: 14,
  borderTop: "1px solid rgba(255,255,255,.08)",
};

const optionChoiceGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10,
};

const optionChoiceButton = {
  minHeight: 52,
  padding: "11px 13px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  border: "1px solid",
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 900,
  cursor: "pointer",
};

const optionChoiceTitle = {
  fontWeight: 900,
};

const optionChoiceChevron = {
  flexShrink: 0,
  fontSize: 12,
};

const optionShell = {
  display: "grid",
  gap: 7,
};

const optionHeading = {
  paddingLeft: 4,
  color: "#00d9ff",
  fontSize: 14,
  fontWeight: 900,
};
