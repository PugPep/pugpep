"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { useCart } from "../cartContext";
import { createClient } from "../../lib/supabaseClient";

import { confirmOrderTransaction } from "../../lib/payment/confirmOrder";
import type {
  PaymentMethod,
  PendingOrder,
} from "../../lib/payment/types";
import { getErrorMessage } from "../../lib/payment/utils";

import { DeliveryDetails } from "../../components/payment/DeliveryDetails";
import { OrderSummary } from "../../components/payment/OrderSummary";
import { PaymentHeader } from "../../components/payment/PaymentHeader";
import { PaymentMethodSelector } from "../../components/payment/PaymentMethodSelector";
import { PaymentPanel } from "../../components/payment/PaymentPanel";
import { ProgressSteps } from "../../components/payment/ProgressSteps";

import {
  container,
  emptyIcon,
  emptyState,
  layout,
  loadingCard,
  loadingOrb,
  muted,
  page,
  returnButton,
  reviewColumn,
  stack,
  title,
} from "../../components/payment/paymentTheme";

export default function PaymentPage() {
  const router = useRouter();

  const supabase = useMemo(
    () => createClient(),
    []
  );

  const { clearCart } =
    useCart();

  const [method, setMethod] =
    useState<PaymentMethod>(
      "venmo"
    );

  const [order, setOrder] =
    useState<PendingOrder | null>(
      null
    );

  const [confirming, setConfirming] =
    useState(false);

  const [loadingOrder, setLoadingOrder] =
    useState(true);

  useEffect(() => {
    try {
      const savedOrder =
        localStorage.getItem(
          "pugpep_order"
        );

      if (savedOrder) {
        setOrder(
          JSON.parse(
            savedOrder
          ) as PendingOrder
        );
      }
    } catch (error) {
      console.error(
        "Unable to load pending order:",
        error
      );
    } finally {
      setLoadingOrder(false);
    }
  }, []);

  async function confirmOrder() {
    if (
      !order ||
      confirming
    ) {
      return;
    }

    if (order.confirmed) {
      router.replace(
        `/order-confirmed?order=${encodeURIComponent(
          order.orderNumber
        )}`
      );
      return;
    }

    setConfirming(true);

    try {
      const {
        confirmedOrder,
      } =
        await confirmOrderTransaction({
          supabase,
          order,
          method,
        });

      localStorage.setItem(
        "pugpep_order",
        JSON.stringify(
          confirmedOrder
        )
      );

      setOrder(
        confirmedOrder
      );

      clearCart();

      router.replace(
        `/order-confirmed?order=${encodeURIComponent(
          order.orderNumber
        )}`
      );
    } catch (error: unknown) {
      const message =
        getErrorMessage(
          error,
          "The order could not be confirmed. Your cart was not cleared."
        );

      console.error(
        "Order confirmation error:",
        error
      );

      alert(message);
    } finally {
      setConfirming(false);
    }
  }

  useEffect(() => {
    function handlePaymentEnter(
      event: KeyboardEvent
    ) {
      if (
        event.key !== "Enter" ||
        event.defaultPrevented ||
        confirming ||
        !order ||
        Boolean(order.confirmed)
      ) {
        return;
      }

      const target =
        event.target as HTMLElement | null;

      /*
       * Enter on payment controls should activate the focused
       * control normally, not accidentally confirm the order.
       */
      if (
        target?.closest(
          "button, a, input, select, textarea, [role='button']"
        )
      ) {
        return;
      }

      event.preventDefault();

      void confirmOrder();
    }

    window.addEventListener(
      "keydown",
      handlePaymentEnter
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handlePaymentEnter
      );
    };
  }, [
    confirming,
    order,
  ]);

  if (loadingOrder) {
    return (
      <main style={page}>
        <div style={container}>
          <div style={loadingCard}>
            <div style={loadingOrb} />

            <h1 style={title}>
              Secure Payment
            </h1>

            <p style={muted}>
              Preparing your order...
            </p>
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
            <div style={emptyIcon}>
              🧪
            </div>

            <h1 style={title}>
              No Order Found
            </h1>

            <p style={muted}>
              Return to checkout to prepare your order.
            </p>

            <a
              href="/checkout"
              style={returnButton}
            >
              Return to Checkout
            </a>
          </div>
        </div>
      </main>
    );
  }

  const displayPricing =
    order.pricing;

  const displayTotal =
    displayPricing?.accounting
      .customerTotal ??
    Number(order.total || 0);

  const deliveryLabel =
    displayPricing
      ?.shipping
      .shippingMethodLabel ||
    order.shippingMethodLabel ||
    "Delivery";

  const deliveryAmount =
    displayPricing
      ?.shipping
      .shippingCollected ??
    Number(order.shipping || 0);

  const taxEnabled =
    Boolean(
      displayPricing?.tax.enabled
    );

  return (
    <main style={page}>
      <div style={container}>
        <PaymentHeader
          orderNumber={
            order.orderNumber
          }
        />

        <ProgressSteps />

        <div
          className="payment-layout"
          style={layout}
        >
          <section style={stack}>
            <DeliveryDetails
              order={order}
              deliveryLabel={
                deliveryLabel
              }
              deliveryAmount={
                deliveryAmount
              }
            />

            <PaymentMethodSelector
              method={method}
              setMethod={setMethod}
              orderNumber={
                order.orderNumber
              }
            />

            <PaymentPanel
              method={method}
              amount={displayTotal}
              orderNumber={
                order.orderNumber
              }
            />
          </section>

          <aside
            className="payment-review"
            style={reviewColumn}
          >
            <OrderSummary
              order={order}
              displayPricing={
                displayPricing
              }
              displayTotal={
                displayTotal
              }
              taxEnabled={
                taxEnabled
              }
              confirming={
                confirming
              }
              confirmOrder={() => {
                void confirmOrder();
              }}
            />
          </aside>
        </div>

        <style jsx>{`
          @media (min-width: 941px) {
            .payment-review {
              position: sticky;
              top: 18px;
              align-self: start;
            }
          }

          @media (max-width: 940px) {
            .payment-layout {
              grid-template-columns: minmax(0, 1fr) !important;
            }
          }

          @media (max-width: 640px) {
            .payment-method-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            }
          }

          @media (max-width: 430px) {
            .payment-method-grid {
              grid-template-columns: minmax(0, 1fr) !important;
            }
          }
        `}</style>
      </div>
    </main>
  );
}