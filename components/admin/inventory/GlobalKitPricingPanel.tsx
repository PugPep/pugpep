"use client";

import type { useAdminInventory } from "../../../hooks/admin/useAdminInventory";

type AdminInventory = ReturnType<typeof useAdminInventory>;

export default function GlobalKitPricingPanel({
  admin,
}: {
  admin: AdminInventory;
}) {
  const {
    globalKitDiscount,
    setGlobalKitDiscount,
    updatingAllKits,
    applyGlobalKitDiscount,
  } = admin;

  return (
        <section style={globalKitPanel}>
          <div style={globalKitHeader}>
            <div>
              <p style={sectionEyebrow}>GLOBAL KIT PRICING</p>
              <h2 style={sectionTitle}>10-Vial Kit Discount</h2>

              <p style={globalKitHelp}>
                Kit prices are calculated from 10 × the matching single-vial price.
                This updates every active kit at once. Single-vial bundle savings remain
                separate at 3+ = 2%, 5+ = 4%, and 8+ = 7%.
              </p>
            </div>

            <div style={globalKitControls}>
              <label style={globalKitInputWrap}>
                <span style={globalKitLabel}>Kit Discount %</span>

                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={globalKitDiscount}
                  onChange={(event) =>
                    setGlobalKitDiscount(event.target.value)
                  }
                  style={globalKitInput}
                />
              </label>

              <button
                type="button"
                onClick={() => void applyGlobalKitDiscount()}
                disabled={updatingAllKits}
                style={{
                  ...primaryButton,
                  minWidth: 220,
                  opacity: updatingAllKits ? 0.65 : 1,
                }}
              >
                {updatingAllKits
                  ? "Updating All Kits..."
                  : "Apply to All Active Kits"}
              </button>
            </div>
          </div>
        </section>
  );
}

const globalKitPanel = {
  marginTop: 18,
  padding: "clamp(18px, 3vw, 24px)",
  border: "1px solid rgba(0,255,153,.32)",
  borderRadius: 16,
  background:
    "linear-gradient(145deg, rgba(0,255,153,.055), rgba(0,0,0,.35))",
};

const globalKitHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: 20,
  flexWrap: "wrap" as const,
};

const globalKitHelp = {
  maxWidth: 760,
  margin: "8px 0 0",
  color: "#9c9ca6",
  lineHeight: 1.6,
};

const globalKitControls = {
  display: "flex",
  alignItems: "flex-end",
  gap: 10,
  flexWrap: "wrap" as const,
};

const globalKitInputWrap = {
  display: "grid",
  gap: 6,
};

const globalKitLabel = {
  color: "#a7a7af",
  fontSize: 11,
  fontWeight: 900,
  textTransform: "uppercase" as const,
};

const globalKitInput = {
  width: 130,
  minHeight: 46,
  boxSizing: "border-box" as const,
  padding: "0 12px",
  border: "1px solid rgba(0,255,153,.35)",
  borderRadius: 9,
  background: "#050505",
  color: "#fff",
  fontSize: 16,
  fontWeight: 900,
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