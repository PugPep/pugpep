"use client";

import type { PaymentMethod } from "../../lib/payment/types";
import { paymentCard } from "./paymentTheme";
import { CryptoPayment } from "./CryptoPayment";
import { PaymentInstructions } from "./PaymentInstructions";
import { ZellePayment } from "./ZellePayment";

export function PaymentPanel({ method, amount, orderNumber }: {
  method: PaymentMethod;
  amount: number;
  orderNumber: string;
}) {
  if (method === "credit_card" || method === "debit_card") {
    return (
      <div style={{ ...paymentCard, borderColor: "rgba(125,249,255,.45)" }}>
        <h2 style={{ color: "#7df9ff", marginTop: 0 }}>
          {method === "credit_card" ? "Credit Card" : "Debit Card"}
        </h2>
        <p style={{ color: "#ffffff", fontSize: 19, fontWeight: 800, marginBottom: 8 }}>Coming Soon</p>
        <p style={{ color: "#ffffff", lineHeight: 1.6 }}>
          Secure card payments are not available yet. Please choose another payment method to complete your order.
        </p>
      </div>
    );
  }
  return (
    <div style={paymentCard}>
      {method === "cashapp" && (
        <PaymentInstructions
          title="Cash App" accent="#31d86f" amount={amount}
          paymentInfo="$PugPep1111"
          message="IMPORTANT: Include ONLY your First and Last Name in the memo or note section. Do not include the order number, product name, or any other order details."
        />
      )}
      {method === "venmo" && (
        <PaymentInstructions
          title="Venmo" accent="#00bfff" amount={amount}
          paymentInfo="@PugPep1111"
          message="IMPORTANT: Friends & Family preferred. Include ONLY your First and Last Name in the note section. Do not include the order number, product name, or any other order details."
        />
      )}
      {method === "zelle" && <ZellePayment amount={amount} />}
      {method === "crypto" && <CryptoPayment orderNumber={orderNumber} total={amount} />}
    </div>
  );
}
