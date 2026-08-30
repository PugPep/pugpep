"use client";

import type {
  PaymentMethod,
} from "../../lib/payment/types";

import {
  paymentCard,
} from "./paymentTheme";

import { CryptoPayment } from "./CryptoPayment";
import { PaymentInstructions } from "./PaymentInstructions";
import { ZellePayment } from "./ZellePayment";

export function PaymentPanel({
  method,
  amount,
  orderNumber,
}: {
  method: PaymentMethod;
  amount: number;
  orderNumber: string;
}) {
  return (
    <div style={paymentCard}>
      {method === "cashapp" && (
        <PaymentInstructions
          title="Cash App"
          accent="#31d86f"
          amount={amount}
          paymentInfo="$PugPep1111"
          message="IMPORTANT: Include ONLY your First and Last Name in the memo or note section. Do not include the order number, product name, or any other order details."
        />
      )}

      {method === "venmo" && (
        <PaymentInstructions
          title="Venmo"
          accent="#00d9ff"
          amount={amount}
          paymentInfo="@PugPep1111"
          message="IMPORTANT: Friends & Family preferred. Include ONLY your First and Last Name in the note section. Do not include the order number, product name, or any other order details."
        />
      )}

      {method === "zelle" && (
        <ZellePayment
          amount={amount}
        />
      )}

      {method === "crypto" && (
        <CryptoPayment
          orderNumber={orderNumber}
          total={amount}
        />
      )}
    </div>
  );
}