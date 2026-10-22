import { money } from "../../lib/payment/utils";
import { contactButton, contactGrid, contactLinks, paymentInfoBox, paymentInfoLabel, paymentInfoText } from "./paymentTheme";

export function PaymentInstructions({ title, accent, amount, message, paymentInfo }: {
  title: string; accent: string; amount: number; message: string; paymentInfo?: string;
}) {
  const isVenmo = title === "Venmo";
  const isCashApp = title === "Cash App";
  return (
    <>
      <h2 style={{ color: accent, marginBottom: 14, textShadow: "none" }}>{title}</h2>
      {(isVenmo || isCashApp) ? (
        <div style={{ ...importantNoteBox, border: `2px solid ${accent}` }}>
          <div style={{ ...importantNoteHeader, color: accent }}>⚠ IMPORTANT PAYMENT NOTE</div>
          {isVenmo && <>
            <div style={importantLineStrong}>Friends &amp; Family preferred</div>
            <div style={importantLine}>Include <strong>ONLY your First and Last Name</strong> in the note section.</div>
            <div style={importantLineDanger}>Do NOT include the order number, product name, or any other order details.</div>
          </>}
          {isCashApp && <>
            <div style={importantLineStrong}>Include <strong>ONLY your First and Last Name</strong> in the memo or note section.</div>
            <div style={importantLineDanger}>Do NOT include the order number, product name, or any other order details.</div>
          </>}
        </div>
      ) : <p style={paymentMessageFallback}>{message}</p>}
      {paymentInfo && <div style={{ ...paymentInfoBox, border: `2px solid ${accent}`, boxShadow: "none" }}>
        <div style={{ ...paymentInfoLabel, color: "#ffffff" }}>SEND PAYMENT TO</div>
        <div style={{ ...paymentInfoText, color: "#ffffff", textShadow: "none" }}>{paymentInfo}</div>
      </div>}
      <p style={amountDueText}>Amount due: <strong style={{ color: accent, textShadow: "none" }}>{money(amount)}</strong></p>
      <div style={contactGrid}>{contactLinks.map((link) => (
        <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer"
          style={{ ...contactButton, color: "#ffffff" }}>{link.label}</a>
      ))}</div>
    </>
  );
}
const paymentMessageFallback = { color: "#ffffff", fontSize: 16, lineHeight: 1.7, marginBottom: 16 };
const importantNoteBox = { marginBottom: 18, padding: "16px 18px", borderRadius: 14, background: "linear-gradient(180deg, rgba(0,0,0,.55), rgba(12,12,18,.9))" };
const importantNoteHeader = { marginBottom: 12, fontSize: 16, fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase" as const };
const importantLineStrong = { marginBottom: 10, color: "#ffffff", fontSize: 18, fontWeight: 900, lineHeight: 1.5 };
const importantLine = { marginBottom: 10, color: "#ffffff", fontSize: 16, fontWeight: 700, lineHeight: 1.65 };
const importantLineDanger = { color: "#ffffff", fontSize: 16, fontWeight: 900, lineHeight: 1.65 };
const amountDueText = { marginTop: 18, marginBottom: 16, color: "#ffffff", fontSize: 17, fontWeight: 700 };
