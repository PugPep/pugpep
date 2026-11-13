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
      {!isVenmo && !isCashApp && <p style={paymentMessageFallback}>{message}</p>}
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
const amountDueText = { marginTop: 18, marginBottom: 16, color: "#ffffff", fontSize: 17, fontWeight: 700 };
