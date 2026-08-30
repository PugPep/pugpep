import { money } from "../../lib/payment/utils";

import {
  contactButton,
  contactGrid,
  contactLinks,
  paymentInfoBox,
  paymentInfoLabel,
  paymentInfoText,
} from "./paymentTheme";

export function PaymentInstructions({
  title,
  accent,
  amount,
  message,
  paymentInfo,
}: {
  title: string;
  accent: string;
  amount: number;
  message: string;
  paymentInfo?: string;
}) {
  const isVenmo = title === "Venmo";
  const isCashApp = title === "Cash App";
  const showImportantNote =
    isVenmo || isCashApp;

  return (
    <>
      <h2
        style={{
          color: accent,
          marginBottom: 14,
          textShadow: `0 0 12px ${accent}`,
        }}
      >
        {title}
      </h2>

      {showImportantNote ? (
        <div
          style={{
            ...importantNoteBox,
            border: `2px solid ${accent}`,
            boxShadow: `0 0 18px ${accent}55, inset 0 0 14px ${accent}22`,
          }}
        >
          <div
            style={{
              ...importantNoteHeader,
              color: accent,
              textShadow: `0 0 10px ${accent}`,
            }}
          >
            ⚠ IMPORTANT PAYMENT NOTE
          </div>

          {isVenmo && (
            <>
              <div style={importantLineStrong}>
                Friends & Family preferred
              </div>

              <div style={importantLine}>
                Include <strong>ONLY your First and Last Name</strong> in the
                note section.
              </div>

              <div style={importantLineDanger}>
                Do NOT include the order number, product name, or any other
                order details.
              </div>
            </>
          )}

          {isCashApp && (
            <>
              <div style={importantLineStrong}>
                Include <strong>ONLY your First and Last Name</strong> in the
                memo or note section.
              </div>

              <div style={importantLineDanger}>
                Do NOT include the order number, product name, or any other
                order details.
              </div>
            </>
          )}
        </div>
      ) : (
        <p style={paymentMessageFallback}>
          {message}
        </p>
      )}

      {paymentInfo && (
        <div
          style={{
            ...paymentInfoBox,
            border: `2px solid ${accent}`,
            boxShadow: `0 0 18px ${accent}33`,
          }}
        >
          <div style={paymentInfoLabel}>
            SEND PAYMENT TO
          </div>

          <div
            style={{
              ...paymentInfoText,
              color: accent,
              textShadow: `0 0 10px ${accent}`,
            }}
          >
            {paymentInfo}
          </div>
        </div>
      )}

      <p style={amountDueText}>
        Amount due:{" "}
        <strong
          style={{
            color: "#00d9ff",
            textShadow:
              "0 0 10px rgba(0, 217, 255, 0.9)",
          }}
        >
          {money(amount)}
        </strong>
      </p>

      <div style={contactGrid}>
        {contactLinks.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            style={contactButton}
          >
            {link.label}
          </a>
        ))}
      </div>
    </>
  );
}

const paymentMessageFallback = {
  color: "#d7d7df",
  fontSize: 16,
  lineHeight: 1.7,
  marginBottom: 16,
};

const importantNoteBox = {
  marginBottom: 18,
  padding: "16px 18px",
  borderRadius: 14,
  background:
    "linear-gradient(180deg, rgba(0,0,0,.55), rgba(12,12,18,.9))",
};

const importantNoteHeader = {
  marginBottom: 12,
  fontSize: 16,
  fontWeight: 900,
  letterSpacing: ".08em",
  textTransform: "uppercase" as const,
};

const importantLineStrong = {
  marginBottom: 10,
  color: "#ffffff",
  fontSize: 18,
  fontWeight: 900,
  lineHeight: 1.5,
};

const importantLine = {
  marginBottom: 10,
  color: "#e9e9ef",
  fontSize: 16,
  fontWeight: 700,
  lineHeight: 1.65,
};

const importantLineDanger = {
  color: "#ff8fb8",
  fontSize: 16,
  fontWeight: 900,
  lineHeight: 1.65,
  textShadow:
    "0 0 10px rgba(255, 95, 160, 0.35)",
};

const amountDueText = {
  marginTop: 18,
  marginBottom: 16,
  color: "#f3f3f7",
  fontSize: 17,
  fontWeight: 700,
};