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
          message="Include only your name in the memo or note section."
        />
      )}

      {method === "venmo" && (
        <PaymentInstructions
          title="Venmo"
          accent="#00d9ff"
          amount={amount}
          paymentInfo="@PugPep1111"
          message="Friends & Family preferred. Include only your name in the note section."
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