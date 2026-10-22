"use client";

import { trackEvent } from "../../lib/trackEvent";
import type { PaymentMethod } from "../../lib/payment/types";
import {
  card, methodButton, methodGrid, sectionHeading,
  sectionHelper, sectionNumber, sectionTitle, selectedDot,
} from "./paymentTheme";

type MethodOption = {
  value: PaymentMethod;
  label: string;
  logo?: string;
  accent: string;
  comingSoon?: boolean;
};

const methods: MethodOption[] = [
  { value: "cashapp", label: "Cash App", logo: "/cashapp.png", accent: "#31d86f" },
  { value: "venmo", label: "Venmo", logo: "/venmo.png", accent: "#00bfff" },
  { value: "zelle", label: "Zelle", logo: "/zelle.png", accent: "#b86cff" },
  { value: "crypto", label: "Crypto", logo: "/aurpay.png", accent: "#f7931a" },
  { value: "credit_card", label: "Credit Card", logo: "/credit.png", accent: "#d4af37", comingSoon: true },
  { value: "debit_card", label: "Debit Card", logo: "/debit.png", accent: "#20c997", comingSoon: true },
];

export function PaymentMethodSelector({ method, setMethod, orderNumber }: {
  method: PaymentMethod;
  setMethod: (method: PaymentMethod) => void;
  orderNumber: string;
}) {
  return (
    <div style={card}>
      <div style={sectionHeading}>
        <span style={sectionNumber}>2</span>
        <div>
          <h2 style={sectionTitle}>Payment Method</h2>
          <p style={{ ...sectionHelper, color: "#ffffff" }}>Select the option you plan to use.</p>
        </div>
      </div>
      <div className="payment-method-grid" style={{ ...methodGrid, gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
        {methods.map(({ value, label, logo, accent, comingSoon }) => {
          const selected = method === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={selected}
              onClick={() => {
                setMethod(value);
                void trackEvent({
                  event_type: "payment_method_selected",
                  payment_method: value,
                  order_number: orderNumber,
                });
              }}
              style={{
                ...methodButton,
                minHeight: 116,
                borderColor: selected ? accent : "rgba(255,255,255,.3)",
                borderWidth: selected ? 2 : 1,
                background: selected ? `linear-gradient(145deg, ${accent}20, #0b0d11)` : "#0b0d11",
                boxShadow: selected ? `0 0 13px ${accent}55` : "none",
                color: "#ffffff",
              }}
            >
              {logo ? (
                <img src={logo} alt={`${label} logo`} style={{
                  width: "100%", maxWidth: 115, height: 40,
                  objectFit: "contain", display: "block",
                }} />
              ) : (
                <span aria-hidden="true" style={{ fontSize: 27, lineHeight: "40px", color: accent }}>▤</span>
              )}
              <span style={{ color: "#ffffff", fontSize: 14, lineHeight: 1.2, textAlign: "center" }}>{label}</span>
              {comingSoon && <span style={{ fontSize: 10, color: "#ffffff", opacity: .9 }}>Coming Soon</span>}
              <span style={{
                ...selectedDot, background: selected ? accent : "transparent",
                borderColor: selected ? accent : "#707070",
              }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
