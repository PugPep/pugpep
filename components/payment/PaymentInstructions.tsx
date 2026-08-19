import { money } from "../../lib/payment/utils";

import {
  contactButton,
  contactGrid,
  contactLinks,
  paymentInfoBox,
  paymentInfoLabel,
  paymentInfoText,
  paymentMessage,
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
  return (
    <>
      <h2 style={{ color: accent }}>
        {title}
      </h2>

      <p style={paymentMessage}>
        {message}
      </p>

      {paymentInfo && (
        <div
          style={{
            ...paymentInfoBox,
            border:
              `2px solid ${accent}`,
          }}
        >
          <div style={paymentInfoLabel}>
            SEND PAYMENT TO
          </div>

          <div
            style={{
              ...paymentInfoText,
              color: accent,
            }}
          >
            {paymentInfo}
          </div>
        </div>
      )}

      <p>
        Amount due:{" "}
        <strong
          style={{
            color: "#00d9ff",
          }}
        >
          {money(amount)}
        </strong>
      </p>

      <div style={contactGrid}>
        {contactLinks.map(
          (link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              style={contactButton}
            >
              {link.label}
            </a>
          )
        )}
      </div>
    </>
  );
}