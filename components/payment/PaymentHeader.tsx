import {
  eyebrow,
  header,
  orderBadge,
  orderBadgeLabel,
  subtitle,
  title,
} from "./paymentTheme";

export function PaymentHeader({
  orderNumber,
}: {
  orderNumber: string;
}) {
  return (
    <header style={header}>
      <div>
        <p style={eyebrow}>
          SECURE CHECKOUT
        </p>

        <h1 style={title}>
          Complete Your Order
        </h1>

        <p style={subtitle}>
          Choose your payment method, review the details, and submit when everything looks right.
        </p>
      </div>

      <div style={orderBadge}>
        <span style={orderBadgeLabel}>
          ORDER
        </span>

        <strong>
          {orderNumber}
        </strong>
      </div>
    </header>
  );
}