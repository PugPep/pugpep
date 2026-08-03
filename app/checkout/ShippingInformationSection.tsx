"use client";

import type { CustomerForm } from "./checkoutTypes";
import { styles } from "./checkoutTheme";

export function ShippingInformationSection({
  customer,
  updateField,
}: {
  customer: CustomerForm;
  updateField: (
    field: keyof CustomerForm,
    value: string
  ) => void;
}) {
  return (
    <section style={styles.card}>
      <div style={styles.headingRow}>
        <span style={styles.stepBadge}>1</span>

        <h2 style={styles.sectionTitle}>
          Delivery Information
        </h2>
      </div>

      <div
        className="checkout-form-grid"
        style={styles.formGrid}
      >
        <Field
          label="Organization / Lab Name"
          value={customer.organization}
          onChange={(value) =>
            updateField("organization", value)
          }
        />

        <Field
          label="Full Name"
          value={customer.name}
          onChange={(value) =>
            updateField("name", value)
          }
        />

        <Field
          label="Email"
          type="email"
          value={customer.email}
          onChange={(value) =>
            updateField("email", value)
          }
        />

        <Field
          label="Phone Number"
          type="tel"
          value={customer.phone}
          onChange={(value) =>
            updateField("phone", value)
          }
        />

        <Field
          label="Delivery Address"
          value={customer.address}
          onChange={(value) =>
            updateField("address", value)
          }
          full
        />

        <Field
          label="City"
          value={customer.city}
          onChange={(value) =>
            updateField("city", value)
          }
        />

        <Field
          label="State"
          value={customer.state}
          maxLength={2}
          onChange={(value) =>
            updateField("state", value.toUpperCase())
          }
        />

        <Field
          label="ZIP Code"
          value={customer.zip}
          onChange={(value) =>
            updateField("zip", value)
          }
        />
      </div>

      
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  maxLength,
  full = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  maxLength?: number;
  full?: boolean;
}) {
  return (
    <label
      style={{
        ...styles.label,
        ...(full
          ? { gridColumn: "1 / -1" }
          : {}),
      }}
    >
      {label}

      <input
        required
        type={type}
        maxLength={maxLength}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        style={styles.input}
      />
    </label>
  );
}