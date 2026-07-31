"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../../lib/supabaseClient";

const ADMIN_EMAIL = "pugpep99@gmail.com";

type Customer = {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string | null;
  lifetime_spend: number | null;
  reward_points: number | null;
  vip_tier: string | null;
  has_lifetime_free_shipping: boolean | null;

  total_order_count: number;
  paid_order_count: number;
  pending_order_count: number;
  last_order_at: string | null;
};

type OrderRecord = {
  id: string;
  user_id: string | null;
  status: string | null;
  created_at: string | null;
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

function getTier(customer: Customer) {
  const tier = customer.vip_tier || "Stone";

  return tierOrder.includes(tier)
    ? tier
    : "Stone";
}

function hasCustomerName(customer: Customer) {
  return Boolean(
    customer.full_name &&
      customer.full_name.trim()
  );
}

function getErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "An unexpected error occurred.";
}

export default function AdminCustomersPage() {
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [authorized, setAuthorized] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [search, setSearch] =
    useState("");

  const [tierFilter, setTierFilter] =
    useState("all");

  const [
    shippingFilter,
    setShippingFilter,
  ] = useState("all");

  const [
    accountFilter,
    setAccountFilter,
  ] = useState("all");

  const [copied, setCopied] =
    useState("");

  const [
    updatingCustomerId,
    setUpdatingCustomerId,
  ] = useState<string | null>(null);

  useEffect(() => {
    async function initializePage() {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error(
          "Unable to verify administrator:",
          userError
        );
      }

      const email = user?.email;

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

      await loadCustomers();

      setLoading(false);
    }

    void initializePage();
  }, [supabase]);

  async function loadCustomers() {
    const [
      customerResult,
      orderResult,
    ] = await Promise.all([
      supabase
        .from("customer_profiles")
        .select(
          `
            id,
            full_name,
            email,
            created_at,
            lifetime_spend,
            reward_points,
            vip_tier,
            has_lifetime_free_shipping
          `
        )
        .order("lifetime_spend", {
          ascending: false,
        }),

      supabase
        .from("orders")
        .select(
          `
            id,
            user_id,
            status,
            created_at
          `
        )
        .order("created_at", {
          ascending: false,
        }),
    ]);

    if (customerResult.error) {
      alert(customerResult.error.message);
      return;
    }

    if (orderResult.error) {
      alert(orderResult.error.message);
      return;
    }

    const orderStatistics = new Map<
      string,
      {
        total: number;
        paid: number;
        pending: number;
        lastOrderAt: string | null;
      }
    >();

    const orders = Array.isArray(
      orderResult.data
    )
      ? (orderResult.data as OrderRecord[])
      : [];

    orders.forEach((order) => {
      if (!order.user_id) {
        return;
      }

      const existing =
        orderStatistics.get(order.user_id) || {
          total: 0,
          paid: 0,
          pending: 0,
          lastOrderAt: null,
        };

      existing.total += 1;

      if (
        String(order.status || "")
          .toLowerCase() === "paid"
      ) {
        existing.paid += 1;
      }

      if (
        String(order.status || "")
          .toLowerCase() === "pending"
      ) {
        existing.pending += 1;
      }

      if (
        order.created_at &&
        (!existing.lastOrderAt ||
          new Date(order.created_at) >
            new Date(existing.lastOrderAt))
      ) {
        existing.lastOrderAt =
          order.created_at;
      }

      orderStatistics.set(
        order.user_id,
        existing
      );
    });

    const customerRows = Array.isArray(
      customerResult.data
    )
      ? customerResult.data
      : [];

    const combinedCustomers =
      customerRows.map((customer) => {
        const statistics =
          orderStatistics.get(customer.id);

        return {
          ...customer,

          total_order_count:
            statistics?.total || 0,

          paid_order_count:
            statistics?.paid || 0,

          pending_order_count:
            statistics?.pending || 0,

          last_order_at:
            statistics?.lastOrderAt ||
            null,
        } as Customer;
      });

    setCustomers(combinedCustomers);
  }

  const filteredCustomers = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLowerCase();

    return customers.filter((customer) => {
      const name = (
        customer.full_name || ""
      ).toLowerCase();

      const email = (
        customer.email || ""
      ).toLowerCase();

      const tier = getTier(customer);

      const freeShipping = Boolean(
        customer.has_lifetime_free_shipping
      );

      const hasName =
        hasCustomerName(customer);

      const hasPaidPurchase =
        customer.paid_order_count > 0;

      const matchesSearch =
        !normalizedSearch ||
        name.includes(normalizedSearch) ||
        email.includes(normalizedSearch);

      const matchesTier =
        tierFilter === "all" ||
        tier === tierFilter;

      const matchesShipping =
        shippingFilter === "all" ||
        (shippingFilter === "active" &&
          freeShipping) ||
        (shippingFilter === "inactive" &&
          !freeShipping);

      let matchesAccountStatus = true;

      if (
        accountFilter ===
        "lifetime_no_name_no_purchase"
      ) {
        matchesAccountStatus =
          freeShipping &&
          !hasName &&
          !hasPaidPurchase;
      }

      if (
        accountFilter ===
        "lifetime_no_purchase"
      ) {
        matchesAccountStatus =
          freeShipping &&
          !hasPaidPurchase;
      }

      if (
        accountFilter ===
        "lifetime_with_purchase"
      ) {
        matchesAccountStatus =
          freeShipping &&
          hasPaidPurchase;
      }

      if (
        accountFilter === "missing_name"
      ) {
        matchesAccountStatus = !hasName;
      }

      if (
        accountFilter === "no_purchase"
      ) {
        matchesAccountStatus =
          !hasPaidPurchase;
      }

      if (
        accountFilter === "paid_customer"
      ) {
        matchesAccountStatus =
          hasPaidPurchase;
      }

      return (
        matchesSearch &&
        matchesTier &&
        matchesShipping &&
        matchesAccountStatus
      );
    });
  }, [
    customers,
    search,
    tierFilter,
    shippingFilter,
    accountFilter,
  ]);

  const uniqueVisibleCustomers =
    useMemo(() => {
      const seenEmails =
        new Set<string>();

      return filteredCustomers.filter(
        (customer) => {
          const email = (
            customer.email || ""
          )
            .trim()
            .toLowerCase();

          if (
            !email ||
            seenEmails.has(email)
          ) {
            return false;
          }

          seenEmails.add(email);
          return true;
        }
      );
    }, [filteredCustomers]);

  const commaSeparatedEmails =
    useMemo(() => {
      return uniqueVisibleCustomers
        .map((customer) =>
          customer.email?.trim()
        )
        .filter(
          (email): email is string =>
            Boolean(email)
        )
        .join(", ");
    }, [uniqueVisibleCustomers]);

  const bccSeparatedEmails =
    useMemo(() => {
      return uniqueVisibleCustomers
        .map((customer) =>
          customer.email?.trim()
        )
        .filter(
          (email): email is string =>
            Boolean(email)
        )
        .join("; ");
    }, [uniqueVisibleCustomers]);

  const lifetimeShippingCount =
    customers.filter((customer) =>
      Boolean(
        customer.has_lifetime_free_shipping
      )
    ).length;

  const unusedLifetimeAccountCount =
    customers.filter(
      (customer) =>
        Boolean(
          customer.has_lifetime_free_shipping
        ) &&
        !hasCustomerName(customer) &&
        customer.paid_order_count === 0
    ).length;

  const lifetimeNoPurchaseCount =
    customers.filter(
      (customer) =>
        Boolean(
          customer.has_lifetime_free_shipping
        ) &&
        customer.paid_order_count === 0
    ).length;

  const vipCustomerCount =
    customers.filter(
      (customer) =>
        getTier(customer) !== "Stone"
    ).length;

  const totalLifetimeSpend =
    customers.reduce(
      (sum, customer) =>
        sum +
        Number(
          customer.lifetime_spend || 0
        ),
      0
    );

  async function toggleLifetimeShipping(
    customer: Customer
  ) {
    if (updatingCustomerId) {
      return;
    }

    const newStatus = !Boolean(
      customer.has_lifetime_free_shipping
    );

    const actionText = newStatus
      ? "enable"
      : "disable";

    const customerLabel =
      customer.full_name?.trim() ||
      customer.email ||
      "this customer";

    const confirmed = window.confirm(
      `Are you sure you want to ${actionText} lifetime free shipping for ${customerLabel}?`
    );

    if (!confirmed) {
      return;
    }

    setUpdatingCustomerId(customer.id);

    try {
      const { data, error } = await supabase
        .from("customer_profiles")
        .update({
          has_lifetime_free_shipping:
            newStatus,
        })
        .eq("id", customer.id)
        .select(
          "id, has_lifetime_free_shipping"
        )
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error(
          "The customer account was not updated."
        );
      }

      setCustomers((current) =>
        current.map((item) =>
          item.id === customer.id
            ? {
                ...item,
                has_lifetime_free_shipping:
                  newStatus,
              }
            : item
        )
      );
    } catch (error) {
      console.error(
        "Lifetime shipping update failed:",
        error
      );

      alert(getErrorMessage(error));
    } finally {
      setUpdatingCustomerId(null);
    }
  }

  async function copyText(
    text: string,
    type: string
  ) {
    if (!text) {
      alert(
        "There are no visible customer emails to copy."
      );

      return;
    }

    try {
      await navigator.clipboard.writeText(
        text
      );

      setCopied(type);

      window.setTimeout(() => {
        setCopied("");
      }, 2500);
    } catch {
      alert(
        "Unable to copy the email list."
      );
    }
  }

  function downloadCsv() {
    if (
      uniqueVisibleCustomers.length === 0
    ) {
      alert(
        "There are no visible customers to download."
      );

      return;
    }

    const rows = [
      [
        "Customer Name",
        "Email",
        "VIP Tier",
        "Lifetime Spend",
        "Reward Points",
        "Lifetime Free Shipping",
        "Paid Orders",
        "Pending Orders",
        "Total Orders",
        "Last Order Date",
        "Created Date",
      ],

      ...uniqueVisibleCustomers.map(
        (customer) => [
          customer.full_name || "",
          customer.email || "",
          getTier(customer),

          Number(
            customer.lifetime_spend || 0
          ).toFixed(2),

          String(
            Number(
              customer.reward_points || 0
            )
          ),

          customer.has_lifetime_free_shipping
            ? "Yes"
            : "No",

          String(
            customer.paid_order_count
          ),

          String(
            customer.pending_order_count
          ),

          String(
            customer.total_order_count
          ),

          customer.last_order_at
            ? new Date(
                customer.last_order_at
              ).toLocaleDateString()
            : "",

          customer.created_at
            ? new Date(
                customer.created_at
              ).toLocaleDateString()
            : "",
        ]
      ),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((value) => {
            const escaped = String(
              value
            ).replace(/"/g, '""');

            return `"${escaped}"`;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8",
    });

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;
    link.download =
      "pugpep-customers.csv";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  function showUnusedLifetimeAccounts() {
    setSearch("");
    setTierFilter("all");
    setShippingFilter("all");

    setAccountFilter(
      "lifetime_no_name_no_purchase"
    );
  }

  function clearFilters() {
    setSearch("");
    setTierFilter("all");
    setShippingFilter("all");
    setAccountFilter("all");
  }

  if (loading) {
    return (
      <main style={styles.page}>
        Loading customers...
      </main>
    );
  }

  if (!authorized) {
    return (
      <main style={styles.page}>
        <h1 style={styles.title}>
          Access Denied
        </h1>

        <p>
          You must be logged in as the
          administrator.
        </p>

        <Link
          href="/login"
          style={styles.link}
        >
          Go to Login
        </Link>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <Link
        href="/admin"
        style={styles.link}
      >
        ← Back to Admin
      </Link>

      <h1 style={styles.title}>
        Customers
      </h1>

      <p style={styles.helpText}>
        Manage customer accounts, VIP
        information, email lists, purchase
        history, reward balances, and lifetime
        free shipping from one page.
      </p>

      <section style={styles.summaryGrid}>
        <SummaryCard
          label="Total Customers"
          value={String(customers.length)}
        />

        <SummaryCard
          label="VIP Customers"
          value={String(vipCustomerCount)}
          accent="#ff45d8"
        />

        <SummaryCard
          label="Lifetime Free Shipping"
          value={`${lifetimeShippingCount} / 100`}
          accent="#00ff99"
        />

        <SummaryCard
          label="Unused Lifetime Accounts"
          value={String(
            unusedLifetimeAccountCount
          )}
          accent="#ff4d4d"
        />

        <SummaryCard
          label="Lifetime With No Purchase"
          value={String(
            lifetimeNoPurchaseCount
          )}
          accent="#ffcc00"
        />

        <SummaryCard
          label="Lifetime Revenue"
          value={`$${totalLifetimeSpend.toFixed(
            2
          )}`}
        />
      </section>

      <section style={styles.attentionBox}>
        <div>
          <h2 style={styles.attentionHeading}>
            Lifetime Account Review
          </h2>

          <p style={styles.attentionText}>
            These are lifetime free shipping
            accounts with no customer name and no
            paid orders. Filter them, copy their
            email addresses, and contact them
            before disabling the privilege.
          </p>
        </div>

        <button
          type="button"
          onClick={showUnusedLifetimeAccounts}
          style={styles.reviewButton}
        >
          Review {unusedLifetimeAccountCount} Accounts
        </button>
      </section>

      <section style={styles.section}>
        <h2 style={styles.heading}>
          Search and Filter
        </h2>

        <div style={styles.filterGrid}>
          <label style={styles.label}>
            Search customers
            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search by name or email"
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Account status
            <select
              value={accountFilter}
              onChange={(event) =>
                setAccountFilter(
                  event.target.value
                )
              }
              style={styles.input}
            >
              <option value="all">
                All customer accounts
              </option>

              <option value="lifetime_no_name_no_purchase">
                Lifetime shipping — no name and no paid orders
              </option>

              <option value="lifetime_no_purchase">
                Lifetime shipping — no paid orders
              </option>

              <option value="lifetime_with_purchase">
                Lifetime shipping — has paid orders
              </option>

              <option value="missing_name">
                Missing customer name
              </option>

              <option value="no_purchase">
                No paid orders
              </option>

              <option value="paid_customer">
                Has paid orders
              </option>
            </select>
          </label>

          <label style={styles.label}>
            VIP tier
            <select
              value={tierFilter}
              onChange={(event) =>
                setTierFilter(
                  event.target.value
                )
              }
              style={styles.input}
            >
              <option value="all">
                All tiers
              </option>

              {tierOrder.map((tier) => (
                <option
                  key={tier}
                  value={tier}
                >
                  {tier}
                </option>
              ))}
            </select>
          </label>

          <label style={styles.label}>
            Lifetime free shipping
            <select
              value={shippingFilter}
              onChange={(event) =>
                setShippingFilter(
                  event.target.value
                )
              }
              style={styles.input}
            >
              <option value="all">
                All customers
              </option>

              <option value="active">
                Active
              </option>

              <option value="inactive">
                Inactive
              </option>
            </select>
          </label>
        </div>

        <button
          type="button"
          onClick={clearFilters}
          style={styles.clearButton}
        >
          Clear Filters
        </button>
      </section>

      <section style={styles.section}>
        <h2 style={styles.heading}>
          Customer Email Tools
        </h2>

        <p style={styles.helpText}>
          These actions use only the customers
          currently visible after applying your
          filters. This lets you contact the
          unused lifetime account holders before
          disabling their free shipping.
        </p>

        <div style={styles.buttonRow}>
          <button
            type="button"
            onClick={() =>
              void copyText(
                commaSeparatedEmails,
                "emails"
              )
            }
            style={styles.emailButton}
          >
            {copied === "emails"
              ? "Emails Copied!"
              : `Copy ${uniqueVisibleCustomers.length} Visible Emails`}
          </button>

          <button
            type="button"
            onClick={() =>
              void copyText(
                bccSeparatedEmails,
                "bcc"
              )
            }
            style={styles.bccButton}
          >
            {copied === "bcc"
              ? "BCC List Copied!"
              : "Copy Visible for BCC"}
          </button>

          <button
            type="button"
            onClick={downloadCsv}
            style={styles.downloadButton}
          >
            Download Visible CSV
          </button>
        </div>

        <label style={styles.label}>
          Visible email list
          <textarea
            readOnly
            value={commaSeparatedEmails}
            style={styles.textarea}
          />
        </label>

        <div style={styles.warning}>
          Put customer addresses in the BCC
          field instead of To or CC so recipients
          cannot see one another’s email
          addresses. Contact customers before
          removing lifetime free shipping.
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.heading}>
          Customer Accounts
        </h2>

        <p style={styles.visibleCount}>
          Showing {filteredCustomers.length} of{" "}
          {customers.length} customers
        </p>

        {filteredCustomers.length === 0 ? (
          <p>
            No customers match the selected
            filters.
          </p>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>
                    Customer
                  </th>

                  <th style={styles.th}>
                    Email
                  </th>

                  <th style={styles.th}>
                    VIP Tier
                  </th>

                  <th style={styles.th}>
                    Lifetime Spend
                  </th>

                  <th style={styles.th}>
                    Orders
                  </th>

                  <th style={styles.th}>
                    Last Order
                  </th>

                  <th style={styles.th}>
                    Reward Points
                  </th>

                  <th style={styles.th}>
                    Free Shipping
                  </th>

                  <th style={styles.th}>
                    Created
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredCustomers.map(
                  (customer) => {
                    const tier =
                      getTier(customer);

                    const freeShipping =
                      Boolean(
                        customer.has_lifetime_free_shipping
                      );

                    const isUpdating =
                      updatingCustomerId ===
                      customer.id;

                    const hasName =
                      hasCustomerName(
                        customer
                      );

                    return (
                      <tr
                        key={customer.id}
                        style={styles.row}
                      >
                        <td style={styles.td}>
                          <strong
                            style={{
                              color: hasName
                                ? "#ff45d8"
                                : "#ffcc00",
                            }}
                          >
                            {hasName
                              ? customer.full_name
                              : "NAME MISSING"}
                          </strong>

                          <div
                            style={
                              styles.customerId
                            }
                          >
                            {customer.id}
                          </div>
                        </td>

                        <td style={styles.td}>
                          {customer.email ? (
                            <a
                              href={`mailto:${customer.email}`}
                              style={
                                styles.link
                              }
                            >
                              {
                                customer.email
                              }
                            </a>
                          ) : (
                            <span
                              style={{
                                color:
                                  "#777777",
                              }}
                            >
                              No email
                            </span>
                          )}
                        </td>

                        <td style={styles.td}>
                          <span
                            style={
                              styles.tierBadge
                            }
                          >
                            {tier}
                          </span>

                          <div
                            style={
                              styles.benefits
                            }
                          >
                            {tierBenefits[
                              tier
                            ].join(" • ")}
                          </div>
                        </td>

                        <td style={styles.td}>
                          $
                          {Number(
                            customer.lifetime_spend ||
                              0
                          ).toFixed(2)}
                        </td>

                        <td style={styles.td}>
                          <div>
                            <strong
                              style={{
                                color:
                                  customer.paid_order_count >
                                  0
                                    ? "#00ff99"
                                    : "#ff4d4d",
                              }}
                            >
                              {
                                customer.paid_order_count
                              }{" "}
                              paid
                            </strong>
                          </div>

                          <div
                            style={
                              styles.orderSubtext
                            }
                          >
                            {
                              customer.pending_order_count
                            }{" "}
                            pending ·{" "}
                            {
                              customer.total_order_count
                            }{" "}
                            total
                          </div>
                        </td>

                        <td style={styles.td}>
                          {customer.last_order_at
                            ? new Date(
                                customer.last_order_at
                              ).toLocaleDateString()
                            : "Never"}
                        </td>

                        <td style={styles.td}>
                          {Number(
                            customer.reward_points ||
                              0
                          )}
                        </td>

                        <td style={styles.td}>
                          <label
                            style={
                              styles.toggleRow
                            }
                          >
                            <input
                              type="checkbox"
                              checked={
                                freeShipping
                              }
                              disabled={
                                Boolean(
                                  updatingCustomerId
                                )
                              }
                              onChange={() =>
                                void toggleLifetimeShipping(
                                  customer
                                )
                              }
                              style={
                                styles.checkbox
                              }
                            />

                            <span
                              style={{
                                color:
                                  freeShipping
                                    ? "#00ff99"
                                    : "#888888",
                                fontWeight:
                                  "bold",
                              }}
                            >
                              {isUpdating
                                ? "Updating..."
                                : freeShipping
                                ? "ACTIVE"
                                : "INACTIVE"}
                            </span>
                          </label>
                        </td>

                        <td style={styles.td}>
                          {customer.created_at
                            ? new Date(
                                customer.created_at
                              ).toLocaleDateString()
                            : "-"}
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  accent = "#00d9ff",
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div style={styles.summaryCard}>
      <span style={styles.summaryLabel}>
        {label}
      </span>

      <strong
        style={{
          ...styles.summaryValue,
          color: accent,
        }}
      >
        {value}
      </strong>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "30px",
    background: "#000000",
    color: "#ffffff",
  },

  title: {
    color: "#ff45d8",
    marginTop: "20px",
  },

  heading: {
    color: "#00d9ff",
    marginTop: 0,
  },

  helpText: {
    color: "#aaaaaa",
    lineHeight: 1.6,
    maxWidth: "1000px",
  },

  summaryGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(185px, 1fr))",
    gap: "14px",
    marginTop: "24px",
  },

  summaryCard: {
    padding: "18px",
    border: "1px solid #333333",
    borderRadius: "14px",
    background: "#111111",
    display: "grid",
    gap: "8px",
  },

  summaryLabel: {
    color: "#aaaaaa",
    fontSize: "13px",
    textTransform:
      "uppercase" as const,
    letterSpacing: "0.6px",
  },

  summaryValue: {
    fontSize: "25px",
  },

  attentionBox: {
    marginTop: "25px",
    padding: "20px",
    border: "1px solid #ff4d4d",
    borderRadius: "14px",
    background:
      "rgba(255,77,77,.08)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "18px",
    flexWrap: "wrap" as const,
  },

  attentionHeading: {
    color: "#ff4d4d",
    marginTop: 0,
    marginBottom: "8px",
  },

  attentionText: {
    color: "#dddddd",
    margin: 0,
    lineHeight: 1.6,
    maxWidth: "800px",
  },

  reviewButton: {
    padding: "12px 18px",
    borderRadius: "10px",
    border: "1px solid #ff4d4d",
    background: "#220000",
    color: "#ff6666",
    fontWeight: "bold",
    cursor: "pointer",
  },

  section: {
    marginTop: "25px",
    padding: "20px",
    border: "1px solid #333333",
    borderRadius: "14px",
    background: "#111111",
  },

  filterGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "14px",
  },

  label: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
  },

  input: {
    width: "100%",
    boxSizing: "border-box" as const,
    padding: "12px",
    background: "#080808",
    color: "#ffffff",
    border: "1px solid #444444",
    borderRadius: "8px",
  },

  clearButton: {
    marginTop: "15px",
    padding: "10px 15px",
    borderRadius: "9px",
    border: "1px solid #888888",
    background: "#151515",
    color: "#dddddd",
    fontWeight: "bold",
    cursor: "pointer",
  },

  buttonRow: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "10px",
    margin: "15px 0",
  },

  emailButton: {
    padding: "11px 16px",
    borderRadius: "9px",
    border: "1px solid #00d9ff",
    background: "#001b22",
    color: "#00d9ff",
    fontWeight: "bold",
    cursor: "pointer",
  },

  bccButton: {
    padding: "11px 16px",
    borderRadius: "9px",
    border: "1px solid #ff45d8",
    background: "#22001c",
    color: "#ff45d8",
    fontWeight: "bold",
    cursor: "pointer",
  },

  downloadButton: {
    padding: "11px 16px",
    borderRadius: "9px",
    border: "1px solid #65ff8a",
    background: "#07170c",
    color: "#65ff8a",
    fontWeight: "bold",
    cursor: "pointer",
  },

  textarea: {
    minHeight: "130px",
    padding: "12px",
    resize: "vertical" as const,
    background: "#080808",
    color: "#ffffff",
    border: "1px solid #444444",
    borderRadius: "8px",
    lineHeight: 1.6,
  },

  warning: {
    marginTop: "15px",
    padding: "14px",
    border: "1px solid #ffcc00",
    borderRadius: "10px",
    background: "#221d00",
    color: "#ffdd66",
    lineHeight: 1.5,
  },

  visibleCount: {
    color: "#aaaaaa",
    marginBottom: "15px",
  },

  tableWrapper: {
    overflowX: "auto" as const,
  },

  table: {
    width: "100%",
    minWidth: "1450px",
    borderCollapse:
      "collapse" as const,
  },

  th: {
    padding: "12px",
    textAlign: "left" as const,
    color: "#00d9ff",
    borderBottom:
      "1px solid #444444",
  },

  row: {
    borderBottom:
      "1px solid #333333",
  },

  td: {
    padding: "12px",
    verticalAlign: "top" as const,
  },

  customerId: {
    marginTop: "5px",
    color: "#666666",
    fontSize: "11px",
    wordBreak:
      "break-all" as const,
  },

  tierBadge: {
    display: "inline-block",
    padding: "5px 9px",
    borderRadius: "999px",
    border: "1px solid #00d9ff",
    background:
      "rgba(0,217,255,.10)",
    color: "#00d9ff",
    fontWeight: "bold",
    fontSize: "12px",
  },

  benefits: {
    marginTop: "7px",
    maxWidth: "280px",
    color: "#888888",
    fontSize: "11px",
    lineHeight: 1.5,
  },

  orderSubtext: {
    marginTop: "5px",
    color: "#888888",
    fontSize: "12px",
  },

  toggleRow: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    cursor: "pointer",
  },

  checkbox: {
    width: "19px",
    height: "19px",
    accentColor: "#00ff99",
    cursor: "pointer",
  },

  link: {
    color: "#00d9ff",
    textDecoration: "none",
  },
};