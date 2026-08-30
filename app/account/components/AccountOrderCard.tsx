"use client";

import type { AccountOrder } from "../lib/accountTypes";
import { formatDate, money } from "../lib/accountUtils";

export function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={statCard}>
      <span style={statLabel}>
        {label}
      </span>

      <strong style={statValue}>
        {value}
      </strong>
    </div>
  );
}

function getShippingProgress(
  shippingStatus?: string | null
) {
  const normalized = String(
    shippingStatus || "not_shipped"
  )
    .trim()
    .toLowerCase();

  const steps = [
    "ORDER CONFIRMED",
    "PREPARING",
    "SHIPPED",
    "IN TRANSIT",
    "DELIVERED",
  ];

  let activeIndex = 1;

  if (
    normalized === "delivered"
  ) {
    activeIndex = 4;
  } else if (
    normalized === "in_transit" ||
    normalized === "in transit" ||
    normalized === "transit" ||
    normalized === "out_for_delivery" ||
    normalized === "out for delivery"
  ) {
    activeIndex = 3;
  } else if (
    normalized === "shipped" ||
    normalized === "label_created" ||
    normalized === "label created"
  ) {
    activeIndex = 2;
  } else if (
    normalized === "preparing" ||
    normalized === "processing" ||
    normalized === "not_shipped" ||
    normalized === "not shipped" ||
    normalized === "pending"
  ) {
    activeIndex = 1;
  } else if (
    normalized === "confirmed" ||
    normalized === "order_confirmed" ||
    normalized === "order confirmed"
  ) {
    activeIndex = 0;
  }

  return {
    steps,
    activeIndex,
  };
}

export function OrderCard({
  order,
  reorder,
  reordering,
  disabled,
}: {
  order: AccountOrder;
  reorder: () => void;
  reordering: boolean;
  disabled: boolean;
}) {
  const shippingProgress =
    getShippingProgress(
      order.shipping_status
    );

  return (
    <article style={orderCard}>
      <div style={orderHeader}>
        <div>
          <p style={orderNumber}>
            {order.order_number}
          </p>

          <span style={orderDate}>
            {formatDate(
              order.created_at
            )}
          </span>
        </div>

        <strong style={orderTotal}>
          {money(
            Number(
              order.total ||
                0
            )
          )}
        </strong>
      </div>

      <div style={badgeRow}>
        <span
          style={getPaymentBadge(
            order.status ||
              "pending"
          )}
        >
          {order.status ===
          "paid"
            ? "PAID"
            : "PENDING PAYMENT"}
        </span>
      </div>

      <div style={shippingStatusBox}>
        <div style={shippingStatusLabel}>
          SHIPPING STATUS
        </div>

        <div style={shippingStatusRow}>
          <span
            style={getDeliveryBadge(
              order.shipping_status ||
                "not_shipped"
            )}
          >
            {order.shipping_status ===
            "delivered"
              ? "DELIVERED"
              : order.shipping_status ===
                "shipped"
              ? "IN DELIVERY"
              : "PREPARING"}
          </span>

          {order.shipping_method_label && (
            <span style={shippingMethodText}>
              {order.shipping_method_label}
            </span>
          )}
        </div>

        {order.tracking_number ? (
          <p style={trackingText}>
            Tracking:{" "}
            <strong style={trackingNumberText}>
              {order.tracking_number}
            </strong>
          </p>
        ) : (
          <p style={trackingPendingText}>
            Tracking will appear here once the shipment is created.
          </p>
        )}
      </div>

      <div style={shippingTimeline}>
        {shippingProgress.steps.map(
          (step, index) => {
            const isComplete =
              index <
              shippingProgress.activeIndex;

            const isActive =
              index ===
              shippingProgress.activeIndex;

            return (
              <div
                key={step}
                style={shippingStep}
              >
                <div style={shippingStepTop}>
                  <div
                    style={{
                      ...shippingStepDot,
                      ...(isComplete
                        ? shippingStepDotComplete
                        : isActive
                        ? shippingStepDotActive
                        : shippingStepDotPending),
                    }}
                  >
                    {isComplete
                      ? "✓"
                      : index + 1}
                  </div>

                  {index <
                    shippingProgress.steps
                      .length -
                      1 && (
                    <div
                      style={{
                        ...shippingStepLine,
                        ...(index <
                        shippingProgress.activeIndex
                          ? shippingStepLineComplete
                          : shippingStepLinePending),
                      }}
                    />
                  )}
                </div>

                <div
                  style={{
                    ...shippingStepLabel,
                    ...(isActive
                      ? shippingStepLabelActive
                      : isComplete
                      ? shippingStepLabelComplete
                      : shippingStepLabelPending),
                  }}
                >
                  {step}
                </div>
              </div>
            );
          }
        )}
      </div>

      <button
        type="button"
        onClick={reorder}
        disabled={disabled}
        style={{
          ...reorderButton,
          opacity:
            disabled
              ? 0.65
              : 1,
        }}
      >
        {reordering
          ? "Checking Stock..."
          : "Reorder"}
      </button>
    </article>
  );
}

function getPaymentBadge(
  status: string
) {
  return {
    padding: "6px 10px",
    borderRadius: 999,
    fontWeight: 900,
    fontSize: 11,
    background:
      status === "paid"
        ? "rgba(255,191,0,.12)"
        : "rgba(255,77,77,.12)",
    color:
      status === "paid"
        ? "#ffcc00"
        : "#ff6f6f",
    border:
      status === "paid"
        ? "1px solid #ffcc00"
        : "1px solid #ff6f6f",
  };
}

function getDeliveryBadge(
  status: string
) {
  return {
    padding: "6px 10px",
    borderRadius: 999,
    fontWeight: 900,
    fontSize: 11,
    background:
      status === "delivered"
        ? "rgba(0,255,153,.12)"
        : status === "shipped"
        ? "rgba(0,217,255,.12)"
        : "rgba(255,255,255,.07)",
    color:
      status === "delivered"
        ? "#00ff99"
        : status === "shipped"
        ? "#00d9ff"
        : "#aaaaaa",
    border:
      status === "delivered"
        ? "1px solid #00ff99"
        : status === "shipped"
        ? "1px solid #00d9ff"
        : "1px solid #444",
  };
}

const statCard = {
  minWidth: 0,
  padding: 14,
  display: "grid",
  gap: 5,
  border:
    "1px solid rgba(255,255,255,.15)",
  borderRadius: 12,
  background:
    "rgba(0,0,0,.28)",
};

const statLabel = {
  color: "#9e9e9e",
  fontSize: 11,
  fontWeight: 900,
  textTransform:
    "uppercase" as const,
};

const statValue = {
  color: "#ffffff",
  fontSize:
    "clamp(17px, 3vw, 22px)",
  overflowWrap:
    "anywhere" as const,
};

const orderCard = {
  padding: 15,
  border:
    "1px solid rgba(255,255,255,.12)",
  borderRadius: 13,
  background:
    "rgba(0,0,0,.28)",
};

const shippingStatusBox = {
  marginTop: 14,
  padding: 13,
  border:
    "1px solid rgba(0,217,255,.22)",
  borderRadius: 11,
  background:
    "linear-gradient(135deg, rgba(0,217,255,.055), rgba(0,255,153,.035))",
};

const shippingStatusLabel = {
  marginBottom: 8,
  color: "#7df9ff",
  fontSize: 10,
  fontWeight: 1000,
  letterSpacing: ".12em",
};

const shippingStatusRow = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap" as const,
};

const shippingMethodText = {
  color: "#bfc4cb",
  fontSize: 12,
  fontWeight: 700,
};

const trackingNumberText = {
  color: "#00d9ff",
  overflowWrap: "anywhere" as const,
};

const trackingPendingText = {
  margin: "9px 0 0",
  color: "#7f858d",
  fontSize: 12,
  lineHeight: 1.5,
};

const shippingTimeline = {
  marginTop: 15,
  display: "grid",
  gridTemplateColumns:
    "repeat(5, minmax(0, 1fr))",
  gap: 0,
  alignItems: "start",
};

const shippingStep = {
  minWidth: 0,
  display: "grid",
  gap: 7,
};

const shippingStepTop = {
  display: "flex",
  alignItems: "center",
  minWidth: 0,
};

const shippingStepDot = {
  width: 24,
  height: 24,
  flex: "0 0 24px",
  display: "grid",
  placeItems: "center",
  borderRadius: 999,
  fontSize: 10,
  fontWeight: 1000,
  boxSizing: "border-box" as const,
};

const shippingStepDotComplete = {
  border: "1px solid #00ff99",
  background: "rgba(0,255,153,.16)",
  color: "#00ff99",
  boxShadow:
    "0 0 12px rgba(0,255,153,.20)",
};

const shippingStepDotActive = {
  border: "1px solid #00d9ff",
  background: "rgba(0,217,255,.16)",
  color: "#7df9ff",
  boxShadow:
    "0 0 14px rgba(0,217,255,.30)",
};

const shippingStepDotPending = {
  border: "1px solid rgba(255,255,255,.18)",
  background: "rgba(255,255,255,.04)",
  color: "#777d85",
};

const shippingStepLine = {
  height: 2,
  flex: 1,
  minWidth: 8,
  margin: "0 4px",
  borderRadius: 999,
};

const shippingStepLineComplete = {
  background:
    "linear-gradient(90deg, #00ff99, #00d9ff)",
  boxShadow:
    "0 0 8px rgba(0,255,153,.18)",
};

const shippingStepLinePending = {
  background:
    "rgba(255,255,255,.12)",
};

const shippingStepLabel = {
  paddingRight: 4,
  fontSize: 9,
  fontWeight: 900,
  letterSpacing: ".06em",
  lineHeight: 1.3,
  overflowWrap: "anywhere" as const,
};

const shippingStepLabelComplete = {
  color: "#00ff99",
};

const shippingStepLabelActive = {
  color: "#7df9ff",
};

const shippingStepLabelPending = {
  color: "#6f747b",
};

const orderHeader = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "start",
  gap: 12,
};

const orderNumber = {
  margin: 0,
  color: "#ff45d8",
  fontWeight: 900,
  overflowWrap:
    "anywhere" as const,
};

const orderDate = {
  display: "block",
  marginTop: 4,
  color: "#8f8f8f",
  fontSize: 12,
};

const orderTotal = {
  color: "#00ff99",
  fontSize: 19,
};

const badgeRow = {
  marginTop: 12,
  display: "flex",
  gap: 9,
  flexWrap: "wrap" as const,
};

const trackingText = {
  margin: "11px 0 0",
  color: "#cfcfcf",
  fontSize: 13,
};

const reorderButton = {
  marginTop: 13,
  minHeight: 42,
  padding: "10px 14px",
  border:
    "1px solid #00ff99",
  borderRadius: 9,
  background:
    "rgba(0,255,153,.07)",
  color: "#00ff99",
  fontWeight: 900,
  cursor: "pointer",
};
