"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "../cartContext";
import { createClient } from "../../lib/supabaseClient";
import { confirmOrderTransaction } from "../../lib/payment/confirmOrder";
import type { PaymentMethod, PendingOrder } from "../../lib/payment/types";
import { getErrorMessage } from "../../lib/payment/utils";
import { DeliveryDetails } from "../../components/payment/DeliveryDetails";
import { OrderSummary } from "../../components/payment/OrderSummary";
import { PaymentHeader } from "../../components/payment/PaymentHeader";
import { PaymentMethodSelector } from "../../components/payment/PaymentMethodSelector";
import { PaymentPanel } from "../../components/payment/PaymentPanel";
import {
  PRISM_SDK_PATH_RE,
  type PrismClientConfig,
  type PrismOrderReceipt,
  type PrismQuoteData,
  type PrismSdkState,
} from "../../components/payment/PrismCardPayment";
import { ProgressSteps } from "../../components/payment/ProgressSteps";
import {
  container, emptyIcon, emptyState, layout, loadingCard, loadingOrb, muted,
  page, returnButton, reviewColumn, stack, title,
} from "../../components/payment/paymentTheme";

const SAVED_PROMO_KEY = "pugpep_saved_promo_code";
const LEGACY_PENDING_PROMO_KEY = "pugpep_pending_promo";
const INITIAL_CARD_STATE: PrismSdkState = {
  busy: false,
  pending: false,
  completed: false,
  ready: false,
};

export default function PaymentPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { clearCart } = useCart();
  const [method, setMethod] = useState<PaymentMethod>("venmo");
  const [order, setOrder] = useState<PendingOrder | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [loadingOrder, setLoadingOrder] = useState(true);

  const [prismConfig, setPrismConfig] = useState<PrismClientConfig | null>(null);
  const [cardSdkState, setCardSdkState] = useState<PrismSdkState>(INITIAL_CARD_STATE);
  const [cardQuote, setCardQuote] = useState<PrismQuoteData | null>(null);
  const [cardError, setCardError] = useState<string | null>(null);
  const cardSubmitRef = useRef<(() => Promise<void>) | null>(null);

  const registerCardSubmit = useCallback((fn: (() => Promise<void>) | null) => {
    cardSubmitRef.current = fn;
  }, []);

  const cardCheckoutActive = Boolean(prismConfig && method === "credit_card");
  const cardPaymentsUnavailable = !prismConfig && (method === "credit_card" || method === "debit_card");

  useEffect(() => {
    try {
      const savedOrder = localStorage.getItem("pugpep_order");
      if (savedOrder) setOrder(JSON.parse(savedOrder) as PendingOrder);
    } catch (error) {
      console.error("Unable to load pending order:", error);
    } finally {
      setLoadingOrder(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/prism/config", {
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) return null;
        const data = (await res.json().catch(() => null)) as {
          enabled?: unknown;
          apiBase?: unknown;
          moduleUrl?: unknown;
        } | null;
        if (
          data?.enabled === true &&
          data.apiBase === "/api/prism" &&
          typeof data.moduleUrl === "string" &&
          PRISM_SDK_PATH_RE.test(data.moduleUrl)
        ) {
          return {
            enabled: true as const,
            apiBase: "/api/prism",
            moduleUrl: data.moduleUrl,
          };
        }
        return null;
      })
      .then((cfg) => {
        if (!controller.signal.aborted) {
          setPrismConfig(cfg);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setPrismConfig(null);
        }
      });
    return () => controller.abort();
  }, []);

  const handleCardComplete = useCallback(
    (receipt: PrismOrderReceipt) => {
      if (!order) return;
      const confirmedOrder: PendingOrder = {
        ...order,
        id: receipt.id || order.id,
        orderNumber: receipt.order_number || order.orderNumber,
        paymentMethod: "credit_card",
        confirmed: true,
      };
      try {
        localStorage.setItem("pugpep_order", JSON.stringify(confirmedOrder));
        localStorage.removeItem(SAVED_PROMO_KEY);
        localStorage.removeItem(LEGACY_PENDING_PROMO_KEY);
      } catch (storageError) {
        console.warn("Order confirmed, but local cleanup failed:", storageError);
      }
      setOrder(confirmedOrder);
      clearCart();
      router.replace(`/order-confirmed?order=${encodeURIComponent(confirmedOrder.orderNumber)}`);
    },
    [clearCart, order, router],
  );

  async function submitCardOrder() {
    if (!order || confirming || !cardCheckoutActive) return;
    if (order.confirmed) {
      router.replace(`/order-confirmed?order=${encodeURIComponent(order.orderNumber)}`);
      return;
    }
    if (!cardSubmitRef.current) {
      setCardError("The secure card form is still loading. Please try again in a moment.");
      return;
    }
    setConfirming(true);
    setCardError(null);
    try {
      await cardSubmitRef.current();
    } catch (error: unknown) {
      const message = getErrorMessage(error, "Card payment could not be completed. Your cart was not cleared.");
      setCardError(message);
    } finally {
      setConfirming(false);
    }
  }

  async function confirmOrder() {
    if (!order || confirming || cardPaymentsUnavailable || cardCheckoutActive) return;
    if (order.confirmed) {
      router.replace(`/order-confirmed?order=${encodeURIComponent(order.orderNumber)}`);
      return;
    }
    setConfirming(true);
    try {
      const { confirmedOrder } = await confirmOrderTransaction({ supabase, order, method });
      localStorage.setItem("pugpep_order", JSON.stringify(confirmedOrder));
      try {
        localStorage.removeItem(SAVED_PROMO_KEY);
        localStorage.removeItem(LEGACY_PENDING_PROMO_KEY);
      } catch (promoStorageError) {
        console.warn("Order confirmed, but saved promo cleanup failed:", promoStorageError);
      }
      setOrder(confirmedOrder);
      clearCart();
      router.replace(`/order-confirmed?order=${encodeURIComponent(confirmedOrder.orderNumber)}`);
    } catch (error: unknown) {
      const message = getErrorMessage(error, "The order could not be confirmed. Your cart was not cleared.");
      console.error("Order confirmation error:", error);
      alert(message);
    } finally {
      setConfirming(false);
    }
  }

  useEffect(() => {
    function handlePaymentEnter(event: KeyboardEvent) {
      if (
        event.key !== "Enter" ||
        event.defaultPrevented ||
        confirming ||
        !order ||
        Boolean(order.confirmed) ||
        cardPaymentsUnavailable ||
        cardCheckoutActive
      ) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target?.closest("button, a, input, select, textarea, [role='button']")) return;
      event.preventDefault();
      void confirmOrder();
    }
    window.addEventListener("keydown", handlePaymentEnter);
    return () => window.removeEventListener("keydown", handlePaymentEnter);
  }, [confirming, order, cardPaymentsUnavailable, cardCheckoutActive]);

  if (loadingOrder) {
    return (
      <main style={page}>
        <div style={container}>
          <div style={loadingCard}>
            <div style={loadingOrb} />
            <h1 style={title}>Secure Payment</h1>
            <p style={muted}>Preparing your order...</p>
          </div>
        </div>
      </main>
    );
  }
  if (!order) {
    return (
      <main style={page}>
        <div style={container}>
          <div style={emptyState}>
            <div style={emptyIcon}>🧪</div>
            <h1 style={title}>No Order Found</h1>
            <p style={muted}>Return to checkout to prepare your order.</p>
            <a href="/checkout" style={returnButton}>Return to Checkout</a>
          </div>
        </div>
      </main>
    );
  }

  const displayPricing = order.pricing;
  const baseTotal = displayPricing?.accounting.customerTotal ?? Number(order.total || 0);
  const displayTotal =
    cardCheckoutActive && Number.isSafeInteger(cardQuote?.amount_minor) && Number(cardQuote?.amount_minor) > 0
      ? Number(cardQuote!.amount_minor) / 100
      : baseTotal;
  const deliveryLabel = displayPricing?.shipping.shippingMethodLabel || order.shippingMethodLabel || "Delivery";
  const deliveryAmount = displayPricing?.shipping.shippingCollected ?? Number(order.shipping || 0);
  const taxEnabled = Boolean(displayPricing?.tax.enabled);

  return (
    <main style={page}>
      <div style={container}>
        <PaymentHeader orderNumber={order.orderNumber} />
        <ProgressSteps />
        <div className="payment-layout" style={layout}>
          <section style={stack}>
            <DeliveryDetails order={order} deliveryLabel={deliveryLabel} deliveryAmount={deliveryAmount} />
            <PaymentMethodSelector
              method={method}
              setMethod={(next) => {
                setCardError(null);
                if (next !== "credit_card") {
                  setCardSdkState(INITIAL_CARD_STATE);
                  setCardQuote(null);
                }
                setMethod(next);
              }}
              orderNumber={order.orderNumber}
              cardPaymentEnabled={Boolean(prismConfig)}
            />
            <PaymentPanel
              method={method}
              amount={displayTotal}
              orderNumber={order.orderNumber}
              prismConfig={prismConfig}
              order={order}
              supabase={supabase}
              cardError={cardError}
              onCardStateChange={setCardSdkState}
              onCardQuoteChange={setCardQuote}
              onCardErrorChange={setCardError}
              onRegisterCardSubmit={registerCardSubmit}
              onCardComplete={handleCardComplete}
            />
          </section>
          <aside className="payment-review" style={reviewColumn}>
            <OrderSummary
              order={order}
              displayPricing={displayPricing}
              displayTotal={displayTotal}
              taxEnabled={taxEnabled}
              confirming={confirming}
              confirmOrder={() => {
                void confirmOrder();
              }}
              cardPaymentsUnavailable={cardPaymentsUnavailable}
              cardCheckoutActive={cardCheckoutActive}
              cardReady={cardSdkState.ready}
              cardBusy={cardSdkState.busy || cardSdkState.pending}
              submitCardOrder={() => {
                void submitCardOrder();
              }}
            />
          </aside>
        </div>
        <style jsx>{`
          @media (min-width: 941px) {.payment-review {position:sticky;top:18px;align-self:start;}}
          @media (max-width:940px) {.payment-layout {grid-template-columns:minmax(0,1fr)!important;}}
          @media (max-width:640px) {.payment-method-grid {grid-template-columns:repeat(2,minmax(0,1fr))!important;}}
          @media (max-width:430px) {.payment-method-grid {grid-template-columns:minmax(0,1fr)!important;}}
        `}</style>
      </div>
    </main>
  );
}
