"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabaseClient";

const ADMIN_EMAIL = "pugpep99@gmail.com";

const tierBenefits: Record<string, string[]> = {
  Stone: [
    "Earn reward points",
    "Access to promotions",
  ],

  Iron: [
    "Birthday promo code",
    "Early promotion access",
  ],

  Bronze: [
    "Priority support",
    "Exclusive promo access",
  ],

  Silver: [
    "VIP Discord access",
    "Free shipping weekends",
  ],

  Gold: [
    "Discounted shipping",
    "Early access to new products",
  ],

  Platinum: [
    "Free shipping on all orders",
    "Priority processing",
  ],

  Emerald: [
    "VIP-only promo events",
    "Highest inventory priority",
  ],

  Sapphire: [
    "Exclusive limited products",
    "Private VIP announcements",
  ],

  Ruby: [
    "Custom discount events",
    "First-access product drops",
  ],

  Diamond: [
    "Highest fulfillment priority",
    "Maximum rewards multiplier",
    "Personal VIP support",
  ],
};

const tierOrder = [
  "Diamond",
  "Ruby",
  "Sapphire",
  "Emerald",
  "Platinum",
  "Gold",
  "Silver",
  "Bronze",
  "Iron",
  "Stone",
];

export default function VIPCustomersPage() {
  const supabase = createClient();

  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<any[]>([]);

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();

      const email = data.user?.email;

      if (
        !email ||
        email.toLowerCase() !==
          ADMIN_EMAIL.toLowerCase()
      ) {
        setAuthorized(false);
        setLoading(false);
        return;
      }

      setAuthorized(true);

      const { data: customerData } = await supabase
        .from("customer_profiles")
        .select("*")
        .order("lifetime_spend", {
          ascending: false,
        });

      setCustomers(customerData || []);

      setLoading(false);
    }

    init();
  }, []);

  if (loading) {
    return (
      <main style={page}>
        Loading VIP customers...
      </main>
    );
  }

  if (!authorized) {
    return (
      <main style={page}>
        <h1 style={{ color: "#ff45d8" }}>
          Access Denied
        </h1>
      </main>
    );
  }

  return (
    <main style={page}>
      <h1 style={{ color: "#ff45d8" }}>
        VIP Customers
      </h1>

      {tierOrder.map((tier) => {
        const tierCustomers = customers.filter(
          (customer) =>
            (customer.vip_tier || "Stone") === tier
        );

        return (
          <section key={tier} style={box}>
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                marginBottom: 20,
                flexWrap: "wrap",
                gap: 20,
              }}
            >
              <div>
                <h2
                  style={{
                    color: "#00d9ff",
                    margin: 0,
                  }}
                >
                  {tier} Tier
                </h2>

                <p
                  style={{
                    color: "#888",
                    marginTop: 6,
                  }}
                >
                  {tierCustomers.length} customer(s)
                </p>
              </div>

              <div
                style={{
                  maxWidth: 420,
                }}
              >
                <strong
                  style={{
                    color: "#00ff99",
                  }}
                >
                  Tier Benefits
                </strong>

                <ul
                  style={{
                    color: "#ccc",
                    marginTop: 10,
                    lineHeight: 1.7,
                  }}
                >
                  {tierBenefits[tier].map(
                    (benefit) => (
                      <li key={benefit}>
                        {benefit}
                      </li>
                    )
                  )}
                </ul>
              </div>
            </div>

            {tierCustomers.length === 0 ? (
              <p style={{ color: "#666" }}>
                No customers in this tier.
              </p>
            ) : (
              <div style={tableWrapper}>
                <table style={table}>
                  <thead>
                    <tr>
                      <th style={th}>Name</th>
                      <th style={th}>Email</th>
                      <th style={th}>
                        Lifetime Spend
                      </th>
                      <th style={th}>
                        Reward Points
                      </th>
                      <th style={th}>
                        Free Shipping
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {tierCustomers.map(
                      (customer) => (
                        <tr
                          key={customer.id}
                          style={{
                            borderBottom:
                              "1px solid #222",
                          }}
                        >
                          <td style={td}>
                            {customer.full_name ||
                              "-"}
                          </td>

                          <td style={td}>
                            {customer.email ||
                              "-"}
                          </td>

                          <td style={td}>
                            $
                            {Number(
                              customer.lifetime_spend ||
                                0
                            ).toFixed(2)}
                          </td>

                          <td style={td}>
                            {Number(
                              customer.reward_points ||
                                0
                            )}
                          </td>

                          <td style={td}>
                            {customer.has_lifetime_free_shipping ? (
                              <span
                                style={{
                                  color:
                                    "#00ff99",
                                  fontWeight:
                                    "bold",
                                }}
                              >
                                YES
                              </span>
                            ) : (
                              <span
                                style={{
                                  color: "#888",
                                }}
                              >
                                NO
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}
    </main>
  );
}

const page = {
  minHeight: "100vh",
  background: "#000",
  color: "#fff",
  padding: 35,
};

const box = {
  marginTop: 30,
  padding: 24,
  borderRadius: 16,
  border: "1px solid #333",
  background: "#080808",
};

const tableWrapper = {
  overflowX: "auto" as const,
};

const table = {
  width: "100%",
  borderCollapse: "collapse" as const,
};

const th = {
  textAlign: "left" as const,
  padding: 12,
  color: "#00d9ff",
};

const td = {
  padding: 12,
  color: "#ddd",
};