import type { CSSProperties } from "react";

export const contactLinks = [
  {
    label: "Join Discord",
    href: "https://discord.gg/yas8DetFz",
  },
  {
    label: "Telegram",
    href: "https://t.me/PugPeps",
  },
  {
    label: "Email Us",
    href: "mailto:support@pugpep.com",
  },
];

export const page: CSSProperties = {
  minHeight: "100vh",
  overflowX: "hidden",
  padding:
    "clamp(16px, 3vw, 32px)",
  background:
    "radial-gradient(circle at 12% 0%, rgba(255,47,208,.15), transparent 27%), radial-gradient(circle at 88% 4%, rgba(0,217,255,.15), transparent 30%), radial-gradient(circle at 50% 100%, rgba(0,255,153,.06), transparent 36%), #000",
  color: "#ffffff",
};

export const container: CSSProperties = {
  width: "100%",
  maxWidth: 1240,
  margin: "0 auto",
};

export const header: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 18,
  flexWrap: "wrap",
  marginBottom: 22,
};

export const eyebrow: CSSProperties = {
  margin: 0,
  color: "#7df9ff",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: "0.14em",
};

export const title: CSSProperties = {
  margin: "6px 0 0",
  color: "#ff45d8",
  fontSize:
    "clamp(34px, 7vw, 52px)",
  textShadow:
    "0 0 16px rgba(255,47,208,.28)",
};

export const subtitle: CSSProperties = {
  maxWidth: 660,
  margin: "8px 0 0",
  color: "#b8b8b8",
  lineHeight: 1.6,
};

export const orderBadge: CSSProperties = {
  minWidth: 160,
  padding: "11px 15px",
  display: "grid",
  gap: 3,
  border:
    "1px solid #00d9ff",
  borderRadius: 12,
  background:
    "linear-gradient(135deg, rgba(0,217,255,.12), rgba(255,47,208,.08))",
  color: "#ffffff",
  boxShadow:
    "0 0 17px rgba(0,217,255,.16)",
};

export const orderBadgeLabel: CSSProperties = {
  color: "#7df9ff",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: ".14em",
};

export const progressBar: CSSProperties = {
  marginBottom: 24,
  padding: "14px 18px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 12,
  border:
    "1px solid rgba(0,217,255,.28)",
  borderRadius: 14,
  background:
    "rgba(8,8,12,.82)",
};

export const progressStep: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 7,
  minWidth: 0,
};

export const progressCircle: CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: "50%",
  border: "1px solid #444",
  display: "grid",
  placeItems: "center",
  flexShrink: 0,
  fontSize: 12,
  fontWeight: 900,
};

export const progressLine: CSSProperties = {
  height: 1,
  width: "clamp(18px, 8vw, 90px)",
  background:
    "linear-gradient(90deg, rgba(0,217,255,.7), rgba(255,47,208,.35))",
};

export const layout: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "minmax(0, 1.12fr) minmax(340px, .88fr)",
  gap: 22,
  alignItems: "start",
};

export const stack: CSSProperties = {
  display: "grid",
  gap: 18,
};

export const reviewColumn: CSSProperties = {
  display: "grid",
  gap: 14,
};

export const card: CSSProperties = {
  padding:
    "clamp(18px, 3vw, 26px)",
  border:
    "1px solid rgba(0,217,255,.32)",
  borderRadius: 18,
  background:
    "linear-gradient(145deg, rgba(8,8,12,.96), rgba(14,8,17,.95))",
  boxShadow:
    "0 0 26px rgba(0,217,255,.07)",
};

export const sectionHeading: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 12,
  marginBottom: 18,
};

export const sectionNumber: CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: "50%",
  display: "grid",
  placeItems: "center",
  flexShrink: 0,
  border:
    "1px solid #ff45d8",
  color: "#ff75df",
  fontSize: 12,
  fontWeight: 900,
  background:
    "rgba(255,47,208,.09)",
};

export const sectionTitle: CSSProperties = {
  margin: 0,
  color: "#7df9ff",
  fontSize:
    "clamp(20px, 4vw, 27px)",
};

export const sectionHelper: CSSProperties = {
  margin: "4px 0 0",
  color: "#929292",
  fontSize: 13,
  lineHeight: 1.5,
};

export const infoRow: CSSProperties = {
  padding: "11px 0",
  display: "grid",
  gridTemplateColumns:
    "minmax(110px, .42fr) minmax(0, 1fr)",
  gap: 14,
  borderBottom:
    "1px solid rgba(255,255,255,.07)",
};

export const infoLabel: CSSProperties = {
  color: "#838383",
  fontSize: 12,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: ".05em",
};

export const infoValue: CSSProperties = {
  color: "#f1f1f1",
  overflowWrap: "anywhere",
};

export const methodGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(4, minmax(0, 1fr))",
  gap: 10,
};

export const methodButton: CSSProperties = {
  minHeight: 94,
  padding: 12,
  position: "relative",
  display: "grid",
  placeItems: "center",
  gap: 7,
  border:
    "1px solid rgba(0,217,255,.28)",
  borderRadius: 14,
  color: "#ffffff",
  fontWeight: 900,
  cursor: "pointer",
  transition: "all .18s ease",
};

export const methodIcon: CSSProperties = {
  width: 34,
  height: 34,
  display: "grid",
  placeItems: "center",
  border: "1px solid #00d9ff",
  borderRadius: 10,
  fontSize: 17,
  fontWeight: 900,
};

export const selectedDot: CSSProperties = {
  position: "absolute",
  top: 8,
  right: 8,
  width: 9,
  height: 9,
  borderRadius: "50%",
  border: "1px solid #555",
};

export const paymentCard: CSSProperties = {
  ...card,
  borderColor:
    "rgba(255,69,216,.35)",
  minHeight: 185,
};

export const summaryCard: CSSProperties = {
  padding:
    "clamp(18px, 3vw, 24px)",
  border:
    "1px solid rgba(0,255,153,.36)",
  borderRadius: 18,
  background:
    "linear-gradient(145deg, rgba(8,14,11,.98), rgba(10,8,14,.96))",
  boxShadow:
    "0 0 28px rgba(0,255,153,.07)",
};

export const summaryHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap",
  paddingBottom: 14,
  marginBottom: 5,
  borderBottom:
    "1px solid rgba(255,255,255,.08)",
};

export const summaryEyebrow: CSSProperties = {
  margin: 0,
  color: "#00ff99",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: ".14em",
};

export const summaryTitle: CSSProperties = {
  margin: "4px 0 0",
  color: "#ffffff",
  fontSize: 26,
};

export const heroTotal: CSSProperties = {
  color: "#7df9ff",
  fontSize:
    "clamp(26px, 6vw, 36px)",
  textShadow:
    "0 0 14px rgba(0,217,255,.2)",
};

export const summaryRows: CSSProperties = {
  display: "grid",
};

export const summaryRow: CSSProperties = {
  padding: "10px 0",
  display: "flex",
  justifyContent: "space-between",
  gap: 14,
  borderBottom:
    "1px solid rgba(255,255,255,.07)",
  color: "#b8b8b8",
};

export const grandTotalRow: CSSProperties = {
  marginTop: 13,
  padding: "15px 0 2px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 14,
  color: "#ffffff",
  fontSize: 18,
  borderTop:
    "1px solid rgba(0,255,153,.34)",
};

export const detailsCard: CSSProperties = {
  padding: "14px 16px",
  border:
    "1px solid rgba(0,217,255,.25)",
  borderRadius: 14,
  background:
    "rgba(8,8,12,.88)",
};

export const detailsSummary: CSSProperties = {
  color: "#7df9ff",
  fontWeight: 900,
  cursor: "pointer",
};

export const stepList: CSSProperties = {
  display: "grid",
  marginTop: 12,
};

export const stepRow: CSSProperties = {
  padding: "8px 0",
  borderBottom:
    "1px solid rgba(255,255,255,.07)",
  color: "#b6b6b6",
  fontSize: 13,
  lineHeight: 1.5,
};

export const trustCard: CSSProperties = {
  padding: 14,
  display: "grid",
  gap: 9,
  border:
    "1px solid rgba(255,255,255,.09)",
  borderRadius: 14,
  background:
    "rgba(8,8,12,.78)",
};

export const trustItem: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 9,
  color: "#b6b6b6",
  fontSize: 12,
};

export const trustIcon: CSSProperties = {
  width: 20,
  height: 20,
  borderRadius: "50%",
  display: "grid",
  placeItems: "center",
  flexShrink: 0,
  background:
    "rgba(0,255,153,.09)",
  border:
    "1px solid rgba(0,255,153,.35)",
  color: "#00ff99",
};

export const confirmButton: CSSProperties = {
  width: "100%",
  minHeight: 62,
  padding: "13px 18px",
  border: "none",
  borderRadius: 14,
  background:
    "linear-gradient(180deg,#2eea6f,#19b857)",
  color: "#00170a",
  fontSize: 18,
  fontWeight: 950,
  boxShadow:
    "0 0 18px rgba(46,234,111,.30), 0 0 36px rgba(46,234,111,.12)",
};

export const confirmNotice: CSSProperties = {
  margin: "9px 0 0",
  color: "#838383",
  fontSize: 11,
  textAlign: "center",
  lineHeight: 1.5,
};

export const paymentMessage: CSSProperties = {
  color: "#b7b7b7",
  lineHeight: 1.6,
};

export const paymentInfoBox: CSSProperties = {
  margin: "15px 0",
  padding: "15px",
  borderRadius: 13,
  background: "#090909",
  textAlign: "center",
};

export const paymentInfoLabel: CSSProperties = {
  color: "#858585",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: ".12em",
};

export const paymentInfoText: CSSProperties = {
  marginTop: 5,
  fontSize: 24,
  fontWeight: 950,
  overflowWrap: "anywhere",
};

export const contactGrid: CSSProperties = {
  marginTop: 16,
  display: "grid",
  gridTemplateColumns:
    "repeat(3, minmax(0, 1fr))",
  gap: 9,
};

export const contactButton: CSSProperties = {
  padding: "10px 12px",
  border:
    "1px solid rgba(0,217,255,.32)",
  borderRadius: 10,
  background:
    "rgba(0,217,255,.06)",
  color: "#7df9ff",
  textDecoration: "none",
  textAlign: "center",
  fontSize: 12,
  fontWeight: 900,
};

export const cryptoWrap: CSSProperties = {
  display: "grid",
  gap: 9,
};

export const cryptoBanner: CSSProperties = {
  width: "100%",
  height: "auto",
  marginTop: 14,
  borderRadius: 12,
  border:
    "1px solid rgba(255,255,255,.10)",
};

export const notice: CSSProperties = {
  margin: 0,
  padding: "10px 12px",
  border:
    "1px solid rgba(255,204,102,.24)",
  borderRadius: 10,
  background:
    "rgba(255,204,102,.05)",
  color: "#c7b47c",
  fontSize: 12,
};

export const muted: CSSProperties = {
  color: "#999",
};

export const loadingCard: CSSProperties = {
  minHeight: 360,
  padding: 28,
  display: "grid",
  placeItems: "center",
  alignContent: "center",
  gap: 12,
  textAlign: "center",
  border:
    "1px solid rgba(0,217,255,.30)",
  borderRadius: 18,
  background:
    "rgba(8,8,12,.94)",
};

export const loadingOrb: CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: "50%",
  border:
    "3px solid rgba(0,217,255,.18)",
  borderTopColor:
    "#00d9ff",
};

export const emptyState: CSSProperties = {
  minHeight: 380,
  padding: 28,
  display: "grid",
  placeItems: "center",
  alignContent: "center",
  gap: 12,
  textAlign: "center",
  border:
    "1px solid rgba(255,69,216,.30)",
  borderRadius: 18,
  background:
    "rgba(8,8,12,.94)",
};

export const emptyIcon: CSSProperties = {
  fontSize: 44,
};

export const returnButton: CSSProperties = {
  display: "inline-block",
  marginTop: 7,
  padding: "11px 16px",
  border:
    "1px solid #00d9ff",
  borderRadius: 10,
  background:
    "rgba(0,217,255,.07)",
  color: "#7df9ff",
  textDecoration: "none",
  fontWeight: 900,
};

export const zelleWrap: CSSProperties = {
  display: "grid",
  gap: 18,
};

export const zelleHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 18,
  flexWrap: "wrap",
};

export const zelleEyebrow: CSSProperties = {
  margin: 0,
  color: "#b86cff",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: ".14em",
};

export const zelleTitle: CSSProperties = {
  margin: "5px 0 0",
  color: "#ffffff",
  fontSize: 26,
};

export const zelleAmountBox: CSSProperties = {
  minWidth: 150,
  padding: "12px 15px",
  border:
    "1px solid rgba(0,255,153,.42)",
  borderRadius: 12,
  background:
    "rgba(0,255,153,.06)",
  display: "grid",
  gap: 4,
  textAlign: "right",
};

export const zelleAmountLabel: CSSProperties = {
  color: "#8e8e8e",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: ".1em",
};

export const zelleAmount: CSSProperties = {
  color: "#00ff99",
  fontSize: 25,
};

export const zelleQrCard: CSSProperties = {
  width: "100%",
  maxWidth: 430,
  margin: "0 auto",
  padding:
    "clamp(16px, 3vw, 24px)",
  border:
    "1px solid rgba(184,108,255,.48)",
  borderRadius: 18,
  background:
    "linear-gradient(145deg, rgba(255,255,255,.98), rgba(247,243,255,.98))",
  boxShadow:
    "0 0 28px rgba(123,44,255,.15)",
  display: "grid",
  justifyItems: "center",
  gap: 14,
};

export const zelleQrImage: CSSProperties = {
  display: "block",
  width: "100%",
  maxWidth: 320,
  height: "auto",
  borderRadius: 12,
};

export const zelleTagBox: CSSProperties = {
  minWidth: 190,
  padding: "10px 16px",
  border:
    "1px solid rgba(102,34,255,.28)",
  borderRadius: 12,
  background: "#ffffff",
  textAlign: "center",
};

export const zelleTagLabel: CSSProperties = {
  display: "block",
  color: "#6f6f78",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: ".12em",
};

export const zelleTag: CSSProperties = {
  display: "block",
  marginTop: 3,
  color: "#6d24e8",
  fontSize: 24,
};

export const zelleNotice: CSSProperties = {
  padding: "13px 15px",
  border:
    "1px solid rgba(184,108,255,.32)",
  borderRadius: 12,
  background:
    "rgba(184,108,255,.07)",
  color: "#c9c9c9",
  lineHeight: 1.6,
};

export const zelleMemoText: CSSProperties = {
  margin: 0,
  color: "#9f9f9f",
  fontSize: 13,
  lineHeight: 1.6,
  textAlign: "center",
};