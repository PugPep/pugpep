"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PaymentMethod, PendingOrder } from "../../lib/payment/types";
import { paymentCard } from "./paymentTheme";
import { CryptoPayment } from "./CryptoPayment";
import { PaymentInstructions } from "./PaymentInstructions";
import {
  PrismCardPayment,
  type PrismClientConfig,
  type PrismOrderReceipt,
  type PrismQuoteData,
  type PrismSdkState,
} from "./PrismCardPayment";
import { ZellePayment } from "./ZellePayment";

export function PaymentPanel({
  method,
  amount,
  orderNumber,
  prismConfig,
  order,
  supabase,
  cardError,
  onCardStateChange,
  onCardQuoteChange,
  onCardErrorChange,
  onRegisterCardSubmit,
  onCardComplete,
}: {
  method: PaymentMethod;
  amount: number;
  orderNumber: string;
  prismConfig?: PrismClientConfig | null;
  order?: PendingOrder;
  supabase?: SupabaseClient;
  cardError?: string | null;
  onCardStateChange?: (state: PrismSdkState) => void;
  onCardQuoteChange?: (quote: PrismQuoteData | null) => void;
  onCardErrorChange?: (message: string | null) => void;
  onRegisterCardSubmit?: (submitFn: (() => Promise<void>) | null) => void;
  onCardComplete?: (receipt: PrismOrderReceipt) => void;
}) {
  if (method === "credit_card" && prismConfig?.enabled === true && order && supabase) {
    return (
      <div style={{ ...paymentCard, borderColor: "rgba(125,249,255,.45)" }}>
        <PrismCardPayment
          config={prismConfig}
          order={order}
          supabase={supabase}
          errorMessage={cardError ?? null}
          onStateChange={onCardStateChange ?? (() => {})}
          onQuoteChange={onCardQuoteChange ?? (() => {})}
          onErrorChange={onCardErrorChange ?? (() => {})}
          onRegisterSubmit={onRegisterCardSubmit ?? (() => {})}
          onComplete={onCardComplete ?? (() => {})}
        />
      </div>
    );
  }

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
          accent="#00bfff"
          amount={amount}
          paymentInfo="@PugPep1111"
          message="IMPORTANT: Friends & Family preferred. Include ONLY your First and Last Name in the note section. Do not include the order number, product name, or any other order details."
        />
      )}
      {method === "zelle" && <ZellePayment amount={amount} />}
      {method === "crypto" && <CryptoPayment orderNumber={orderNumber} total={amount} />}
    </div>
  );
}
