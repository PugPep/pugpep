import { money } from "../../lib/payment/utils";

import {
  contactButton,
  contactGrid,
  contactLinks,
  paymentMessage,
  zelleAmount,
  zelleAmountBox,
  zelleAmountLabel,
  zelleEyebrow,
  zelleHeader,
  zelleMemoText,
  zelleNotice,
  zelleQrCard,
  zelleQrImage,
  zelleTag,
  zelleTagBox,
  zelleTagLabel,
  zelleTitle,
  zelleWrap,
} from "./paymentTheme";

export function ZellePayment({
  amount,
}: {
  amount: number;
}) {
  return (
    <div style={zelleWrap}>
      <div style={zelleHeader}>
        <div>
          <p
            style={{
              ...zelleEyebrow,
              color: "#B86CFF",
            }}
          >
            ZELLE PAYMENT
          </p>

          <h2
            style={{
              ...zelleTitle,
              color: "#B86CFF",
            }}
          >
            Scan to Pay PugPep
          </h2>

          <p
            style={{
              ...paymentMessage,
              color: "#FFFFFF",
            }}
          >
            Use your bank&apos;s Zelle feature to scan the QR code below.
            Verify that the recipient displays as PUGPEP LLC before sending.
          </p>
        </div>

        <div
          style={{
            ...zelleAmountBox,
            border: "1px solid rgba(184,108,255,.55)",
            background: "rgba(184,108,255,.08)",
          }}
        >
          <span
            style={{
              ...zelleAmountLabel,
              color: "#FFFFFF",
            }}
          >
            AMOUNT DUE
          </span>

          <strong
            style={{
              ...zelleAmount,
              color: "#B86CFF",
            }}
          >
            {money(amount)}
          </strong>
        </div>
      </div>

      <div style={zelleQrCard}>
        <img
          src="/zelle-pugpep-qr.png"
          alt="PugPep LLC Zelle payment QR code"
          style={zelleQrImage}
        />

        <div style={zelleTagBox}>
          <span style={zelleTagLabel}>
            ZELLE TAG
          </span>

          <strong style={zelleTag}>
            PugPepLLC
          </strong>
        </div>
      </div>

      <div
        style={{
          ...zelleNotice,
          color: "#FFFFFF",
          border: "1px solid rgba(184,108,255,.5)",
          background: "rgba(184,108,255,.09)",
        }}
      >
        <strong style={{ color: "#FFFFFF" }}>
          Before sending:
        </strong>{" "}
        confirm the recipient name is{" "}
        <strong style={{ color: "#B86CFF" }}>
          PUGPEP LLC
        </strong>{" "}
        and send exactly{" "}
        <strong style={{ color: "#B86CFF" }}>
          {money(amount)}
        </strong>.
      </div>

      <p
        style={{
          ...zelleMemoText,
          color: "#FFFFFF",
        }}
      >
        If your bank provides a memo or note field, include only your first
        and last name. Do not include product names or order details.
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
    </div>
  );
}
