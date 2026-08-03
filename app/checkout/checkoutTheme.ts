import type { CSSProperties } from "react";
import type { TierTheme } from "./checkoutTypes";

export function money(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

export function getTierTheme(tier: string): TierTheme {
  const normalized = tier.trim().toLowerCase();

  const themes: Record<string, TierTheme> = {
    stone: {
      color: "#b8bcc4",
      glow: "rgba(184,188,196,.45)",
      background:
        "linear-gradient(135deg, rgba(184,188,196,.16), rgba(0,217,255,.08))",
      border: "#b8bcc4",
    },
    iron: {
      color: "#8f9aa8",
      glow: "rgba(143,154,168,.5)",
      background:
        "linear-gradient(135deg, rgba(143,154,168,.2), rgba(0,217,255,.08))",
      border: "#8f9aa8",
    },
    bronze: {
      color: "#cd7f32",
      glow: "rgba(205,127,50,.55)",
      background:
        "linear-gradient(135deg, rgba(205,127,50,.22), rgba(255,47,208,.08))",
      border: "#cd7f32",
    },
    silver: {
      color: "#d8dde6",
      glow: "rgba(216,221,230,.55)",
      background:
        "linear-gradient(135deg, rgba(216,221,230,.2), rgba(0,217,255,.1))",
      border: "#d8dde6",
    },
    gold: {
      color: "#ffd700",
      glow: "rgba(255,215,0,.6)",
      background:
        "linear-gradient(135deg, rgba(255,215,0,.24), rgba(255,47,208,.1))",
      border: "#ffd700",
    },
    platinum: {
      color: "#e5e4e2",
      glow: "rgba(229,228,226,.62)",
      background:
        "linear-gradient(135deg, rgba(229,228,226,.22), rgba(0,217,255,.12))",
      border: "#e5e4e2",
    },
    emerald: {
      color: "#00ff99",
      glow: "rgba(0,255,153,.6)",
      background:
        "linear-gradient(135deg, rgba(0,255,153,.22), rgba(0,217,255,.1))",
      border: "#00ff99",
    },
    sapphire: {
      color: "#2f80ff",
      glow: "rgba(47,128,255,.62)",
      background:
        "linear-gradient(135deg, rgba(47,128,255,.24), rgba(255,47,208,.1))",
      border: "#2f80ff",
    },
    ruby: {
      color: "#ff3b5c",
      glow: "rgba(255,59,92,.62)",
      background:
        "linear-gradient(135deg, rgba(255,59,92,.24), rgba(255,47,208,.12))",
      border: "#ff3b5c",
    },
    diamond: {
      color: "#7df9ff",
      glow: "rgba(125,249,255,.7)",
      background:
        "linear-gradient(135deg, rgba(125,249,255,.24), rgba(255,47,208,.14))",
      border: "#7df9ff",
    },
  };

  return (
    themes[normalized] || {
      color: "#ff45d8",
      glow: "rgba(255,69,216,.55)",
      background:
        "linear-gradient(135deg, rgba(255,69,216,.18), rgba(0,217,255,.12))",
      border: "#ff45d8",
    }
  );
}

export const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    overflowX: "hidden",
    padding: "clamp(16px, 3vw, 32px)",
    background:
      "radial-gradient(circle at 15% 0%, rgba(255,47,208,.16), transparent 28%), radial-gradient(circle at 85% 5%, rgba(0,217,255,.16), transparent 30%), radial-gradient(circle at 50% 100%, rgba(0,255,153,.08), transparent 35%), #000",
    color: "#fff",
  },
  content: {
    width: "100%",
    maxWidth: 1240,
    margin: "0 auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 18,
    flexWrap: "wrap",
    marginBottom: 18,
  },
  eyebrow: {
    margin: 0,
    color: "#8f8f8f",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: ".14em",
  },
  title: {
    margin: "6px 0 0",
    color: "#ff45d8",
    fontSize: "clamp(34px, 7vw, 52px)",
    textShadow: "0 0 16px rgba(255,47,208,.28)",
  },
  freeShipping: {
    padding: "12px 16px",
    border: "1px solid #00d9ff",
    borderRadius: 12,
    background:
      "linear-gradient(90deg, rgba(0,217,255,.16), rgba(0,255,153,.12))",
    color: "#7df9ff",
    fontWeight: 800,
    boxShadow: "0 0 16px rgba(0,217,255,.22)",
  },
  notice: {
    marginBottom: 18,
    padding: 14,
    border: "1px solid rgba(255,204,102,.7)",
    borderRadius: 11,
    background: "rgba(255,204,102,.08)",
    color: "#ffdd99",
    lineHeight: 1.55,
  },
  error: {
    marginBottom: 18,
    padding: 14,
    border: "1px solid #ff5a5a",
    borderRadius: 11,
    background: "rgba(255,77,77,.08)",
    color: "#ff8b8b",
    lineHeight: 1.55,
  },
  statusBand: {
    padding: "16px 20px",
    display: "grid",
    gridTemplateColumns: "minmax(220px,.9fr) minmax(0,1.4fr)",
    gap: 18,
    alignItems: "center",
    border: "1px solid",
    borderRadius: 16,
  },
  tierEyebrow: {
    margin: 0,
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: ".13em",
  },
  tierTitle: {
    margin: "5px 0",
    fontSize: "clamp(24px,4vw,32px)",
  },
  tierDescription: {
    margin: 0,
    color: "#bbb",
    lineHeight: 1.5,
  },
  tierBenefits: {
    display: "grid",
    gridTemplateColumns: "repeat(3,minmax(0,1fr))",
    gap: 8,
  },
  tierBenefit: {
    minWidth: 0,
    padding: "10px 9px",
    display: "grid",
    gap: 5,
    border: "1px solid",
    borderRadius: 10,
    background: "rgba(0,0,0,.34)",
    color: "#ccc",
    fontSize: 12,
  },
  tierBenefitValue: {
    color: "#fff",
    fontSize: 15,
  },
  balancedGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2,minmax(0,1fr))",
    gap: 24,
    alignItems: "start",
    marginTop: 22,
  },
  column: {
    display: "grid",
    gap: 18,
  },
  card: {
    padding: "clamp(16px,3vw,22px)",
    border: "1px solid rgba(0,217,255,.48)",
    borderRadius: 16,
    background:
      "linear-gradient(145deg, rgba(8,8,12,.96), rgba(15,8,18,.94))",
    boxShadow:
      "0 0 18px rgba(0,217,255,.11), inset 0 0 18px rgba(255,47,208,.035)",
  },
  headingRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  stepBadge: {
    width: 30,
    height: 30,
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
    border: "1px solid #ff45d8",
    borderRadius: 999,
    background:
      "linear-gradient(135deg, rgba(255,47,208,.25), rgba(0,217,255,.18))",
    color: "#fff",
    fontSize: 13,
    fontWeight: 900,
  },
  sectionTitle: {
    margin: 0,
    color: "#7df9ff",
    fontSize: "clamp(21px,4vw,27px)",
    textShadow: "0 0 10px rgba(0,217,255,.35)",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(min(100%,210px),1fr))",
    gap: 12,
  },
  label: {
    display: "grid",
    gap: 7,
    color: "#ddd",
    fontSize: 14,
    fontWeight: 700,
  },
  input: {
    width: "100%",
    minHeight: 48,
    boxSizing: "border-box",
    padding: "11px 12px",
    border: "1px solid rgba(255,47,208,.38)",
    borderRadius: 9,
    background: "linear-gradient(145deg,#080808,#110912)",
    color: "#fff",
    fontSize: 16,
  },
  shippingGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(min(100%,220px),1fr))",
    gap: 12,
  },
  shippingButton: {
    width: "100%",
    minHeight: 154,
    padding: 15,
    display: "grid",
    alignContent: "start",
    gap: 9,
    border: "1px solid",
    borderRadius: 12,
    color: "#fff",
    textAlign: "left",
    cursor: "pointer",
  },
  promoRow: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: 10,
  },
  secondaryButton: {
    minWidth: 110,
    minHeight: 48,
    padding: "10px 15px",
    border: "1px solid #00d9ff",
    borderRadius: 9,
    background: "#101010",
    color: "#00d9ff",
    fontWeight: 800,
    cursor: "pointer",
  },
  textButton: {
    padding: 0,
    border: 0,
    background: "transparent",
    color: "#fff",
    textDecoration: "underline",
    cursor: "pointer",
  },
  cartList: {
    display: "grid",
    gap: 12,
  },
  cartItem: {
    display: "grid",
    gridTemplateColumns: "88px minmax(0,1fr) auto",
    gap: 13,
    padding: 14,
    border: "1px solid rgba(0,217,255,.28)",
    borderRadius: 13,
    background: "rgba(0,0,0,.32)",
    alignItems: "center",
  },
  image: {
    width: 88,
    height: 88,
    objectFit: "cover",
    borderRadius: 11,
    border: "1px solid rgba(255,47,208,.4)",
  },
  qtyButton: {
    width: 38,
    height: 38,
    border: "1px solid #00d9ff",
    borderRadius: 8,
    background: "#101010",
    color: "#00d9ff",
    fontWeight: 900,
    cursor: "pointer",
  },
  removeButton: {
    minHeight: 38,
    padding: "7px 11px",
    border: "1px solid #ff5a5a",
    borderRadius: 8,
    background: "#210000",
    color: "#ff7777",
    fontWeight: 700,
    cursor: "pointer",
  },
  summaryRow: {
    minHeight: 45,
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "center",
    borderBottom: "1px solid rgba(255,255,255,.1)",
  },
  details: {
    padding: 17,
    border: "1px solid rgba(255,47,208,.5)",
    borderRadius: 14,
    background:
      "linear-gradient(145deg,rgba(10,10,12,.96),rgba(18,5,18,.94))",
  },
  finalCard: {
    marginTop: 24,
    padding: "clamp(18px,3vw,26px)",
    border: "1px solid rgba(255,47,208,.62)",
    borderRadius: 18,
    background:
      "linear-gradient(135deg,rgba(255,47,208,.11),rgba(0,217,255,.09),rgba(0,255,153,.05))",
    boxShadow: "0 0 24px rgba(255,47,208,.14)",
  },
  finalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
    marginBottom: 18,
  },
  finalGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0,1.25fr) minmax(280px,.75fr)",
    gap: 22,
    alignItems: "start",
  },
  totalBadge: {
    minWidth: 180,
    padding: "13px 16px",
    display: "grid",
    gap: 4,
    border: "1px solid #ff45d8",
    borderRadius: 12,
    background:
      "linear-gradient(135deg,rgba(255,47,208,.19),rgba(0,217,255,.12))",
    color: "#fff",
    textAlign: "right",
    boxShadow: "0 0 18px rgba(255,47,208,.2)",
  },
  actionPanel: {
    padding: 18,
    border: "1px solid rgba(0,217,255,.58)",
    borderRadius: 14,
    background:
      "linear-gradient(145deg,rgba(7,14,18,.96),rgba(18,7,18,.96))",
  },
  primaryButton: {
    minHeight: 58,
    width: "100%",
    padding: "14px 20px",
    border: 0,
    borderRadius: 11,
    background: "linear-gradient(90deg,#00b7ff,#ff2fd0)",
    color: "#fff",
    fontWeight: 900,
    fontSize: 17,
    cursor: "pointer",
    boxShadow: "0 0 18px rgba(255,47,208,.2)",
  },
};