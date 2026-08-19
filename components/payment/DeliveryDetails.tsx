import type { PendingOrder } from "../../lib/payment/types";
import { money } from "../../lib/payment/utils";

import {
  card,
  infoLabel,
  infoRow,
  infoValue,
  sectionHeading,
  sectionHelper,
  sectionNumber,
  sectionTitle,
} from "./paymentTheme";

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={infoRow}>
      <span style={infoLabel}>
        {label}
      </span>

      <strong style={infoValue}>
        {value}
      </strong>
    </div>
  );
}

export function DeliveryDetails({
  order,
  deliveryLabel,
  deliveryAmount,
}: {
  order: PendingOrder;
  deliveryLabel: string;
  deliveryAmount: number;
}) {
  return (
    <div style={card}>
      <div style={sectionHeading}>
        <span style={sectionNumber}>
          1
        </span>

        <div>
          <h2 style={sectionTitle}>
            Delivery Details
          </h2>

          <p style={sectionHelper}>
            Confirm where your order is going.
          </p>
        </div>
      </div>

      <InfoRow
        label="Organization"
        value={
          order.customer.organization
        }
      />

      <InfoRow
        label="Name"
        value={
          order.customer.name
        }
      />

      <InfoRow
        label="Email"
        value={
          order.customer.email
        }
      />

      <InfoRow
        label="Delivery Address"
        value={`${order.customer.address}, ${order.customer.city}, ${order.customer.state} ${order.customer.zip}`}
      />

      <InfoRow
        label="Delivery Method"
        value={
          deliveryAmount === 0
            ? `${deliveryLabel} — Free`
            : `${deliveryLabel} — ${money(deliveryAmount)}`
        }
      />
    </div>
  );
}