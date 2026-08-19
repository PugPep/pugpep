import { trackEvent } from "../../lib/trackEvent";
import type {
  PaymentMethod,
} from "../../lib/payment/types";

import {
  card,
  methodButton,
  methodGrid,
  methodIcon,
  sectionHeading,
  sectionHelper,
  sectionNumber,
  sectionTitle,
  selectedDot,
} from "./paymentTheme";

const methods: [
  PaymentMethod,
  string,
  string
][] = [
  ["cashapp", "Cash App", "$"],
  ["venmo", "Venmo", "V"],
  ["zelle", "Zelle", "Z"],
  ["crypto", "Crypto", "₿"],
];

export function PaymentMethodSelector({
  method,
  setMethod,
  orderNumber,
}: {
  method: PaymentMethod;
  setMethod: (
    method: PaymentMethod
  ) => void;
  orderNumber: string;
}) {
  return (
    <div style={card}>
      <div style={sectionHeading}>
        <span style={sectionNumber}>
          2
        </span>

        <div>
          <h2 style={sectionTitle}>
            Payment Method
          </h2>

          <p style={sectionHelper}>
            Select the option you plan to use.
          </p>
        </div>
      </div>

      <div
        className="payment-method-grid"
        style={methodGrid}
      >
        {methods.map(
          ([
            value,
            label,
            icon,
          ]) => {
            const selected =
              method === value;

            return (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setMethod(
                    value
                  );

                  void trackEvent({
                    event_type:
                      "payment_method_selected",

                    payment_method:
                      value,

                    order_number:
                      orderNumber,
                  });
                }}
                style={{
                  ...methodButton,

                  borderColor:
                    selected
                      ? "#ff45d8"
                      : "rgba(0,217,255,.28)",

                  background:
                    selected
                      ? "linear-gradient(145deg, rgba(255,47,208,.18), rgba(0,217,255,.11))"
                      : "linear-gradient(145deg, rgba(8,8,12,.96), rgba(14,8,17,.94))",

                  boxShadow:
                    selected
                      ? "0 0 18px rgba(255,47,208,.22)"
                      : "none",
                }}
              >
                <span
                  style={{
                    ...methodIcon,

                    color:
                      selected
                        ? "#ff75df"
                        : "#7df9ff",

                    borderColor:
                      selected
                        ? "#ff45d8"
                        : "#00d9ff",
                  }}
                >
                  {icon}
                </span>

                <span>
                  {label}
                </span>

                <span
                  style={{
                    ...selectedDot,

                    background:
                      selected
                        ? "#00ff99"
                        : "transparent",

                    borderColor:
                      selected
                        ? "#00ff99"
                        : "#555",
                  }}
                />
              </button>
            );
          }
        )}
      </div>
    </div>
  );
}