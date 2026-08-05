"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "../../../lib/supabaseClient";

const ADMIN_EMAIL =
  "pugpep99@gmail.com";

type Customer = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone?: string | null;
  organization?: string | null;
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
  order_number?: string | null;
  status: string | null;
  total?: number | null;
  created_at: string | null;
  deleted_at?: string | null;
};

type PromoCode = {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  is_active: boolean;
};

type PromoAssignment = {
  id: string;
  customer_id: string;
  promo_code_id: string;
  is_active: boolean;
  assigned_at: string;
  promo_codes?: PromoCode | null;
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

function getTier(
  customer: Customer
) {
  const tier =
    customer.vip_tier ||
    "Stone";

  return tierOrder.includes(
    tier
  )
    ? tier
    : "Stone";
}

function getDisplayName(
  customer: Customer
) {
  return (
    customer.full_name?.trim() ||
    customer.email ||
    "Unnamed Customer"
  );
}

function getErrorMessage(
  error: unknown
) {
  if (
    error &&
    typeof error ===
      "object" &&
    "message" in error &&
    typeof error.message ===
      "string"
  ) {
    return error.message;
  }

  return "An unexpected error occurred.";
}

export default function AdminCustomersPage() {
  const supabase =
    useMemo(
      () => createClient(),
      []
    );

  const [
    authorized,
    setAuthorized,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    customers,
    setCustomers,
  ] =
    useState<
      Customer[]
    >([]);

  const [
    orders,
    setOrders,
  ] =
    useState<
      OrderRecord[]
    >([]);

  const [
    promoCodes,
    setPromoCodes,
  ] =
    useState<
      PromoCode[]
    >([]);

  const [
    assignments,
    setAssignments,
  ] =
    useState<
      PromoAssignment[]
    >([]);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    tierFilter,
    setTierFilter,
  ] = useState("all");

  const [
    lifetimeShippingOnly,
    setLifetimeShippingOnly,
  ] = useState(false);

  const [
    selectedCustomer,
    setSelectedCustomer,
  ] =
    useState<
      Customer | null
    >(null);

  const [
    rewardAmount,
    setRewardAmount,
  ] = useState("");

  const [
    rewardMode,
    setRewardMode,
  ] =
    useState<
      "add" | "remove"
    >("add");

  const [
    rewardReason,
    setRewardReason,
  ] = useState("");

  const [
    selectedPromoId,
    setSelectedPromoId,
  ] = useState("");

  const [
    savingCustomer,
    setSavingCustomer,
  ] = useState(false);

  const [
    notice,
    setNotice,
  ] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      setLoading(true);

      const {
        data: { user },
        error,
      } =
        await supabase.auth.getUser();

      if (
        cancelled
      ) {
        return;
      }

      if (error) {
        setNotice(
          error.message
        );
      }

      const email =
        user?.email;

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
      await loadAll();

      if (
        !cancelled
      ) {
        setLoading(false);
      }
    }

    void initialize();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function loadAll() {
    setNotice("");

    const [
      customerResult,
      orderResult,
      promoResult,
      assignmentResult,
    ] =
      await Promise.all([
        supabase
          .from(
            "customer_profiles"
          )
          .select(
            [
              "id",
              "full_name",
              "email",
              "phone",
              "organization",
              "created_at",
              "lifetime_spend",
              "reward_points",
              "vip_tier",
              "has_lifetime_free_shipping",
            ].join(",")
          )
          .order(
            "lifetime_spend",
            {
              ascending: false,
            }
          ),

        supabase
          .from(
            "orders"
          )
          .select(
            [
              "id",
              "user_id",
              "order_number",
              "status",
              "total",
              "created_at",
              "deleted_at",
            ].join(",")
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          ),

        supabase
          .from(
            "promo_codes"
          )
          .select(
            [
              "id",
              "code",
              "discount_type",
              "discount_value",
              "is_active",
            ].join(",")
          )
          .eq(
            "is_active",
            true
          )
          .order(
            "code",
            {
              ascending: true,
            }
          ),

        supabase
          .from(
            "customer_promo_assignments"
          )
          .select(
            `
              id,
              customer_id,
              promo_code_id,
              is_active,
              assigned_at,
              promo_codes (
                id,
                code,
                discount_type,
                discount_value,
                is_active
              )
            `
          )
          .eq(
            "is_active",
            true
          )
          .order(
            "assigned_at",
            {
              ascending: false,
            }
          ),
      ]);

    if (
      customerResult.error
    ) {
      setNotice(
        customerResult.error.message
      );
      return;
    }

    if (
      orderResult.error
    ) {
      setNotice(
        orderResult.error.message
      );
      return;
    }

    if (
      promoResult.error
    ) {
      setNotice(
        promoResult.error.message
      );
    }

    if (
      assignmentResult.error
    ) {
      setNotice(
        assignmentResult.error.message
      );
    }

    const orderRows =
      Array.isArray(
        orderResult.data
      )
        ? (orderResult.data as unknown as OrderRecord[])
        : [];

    setOrders(
      orderRows
    );

    const statistics =
      new Map<
        string,
        {
          total: number;
          paid: number;
          pending: number;
          lastOrderAt:
            | string
            | null;
        }
      >();

    for (
      const order
      of orderRows
    ) {
      if (
        !order.user_id ||
        order.deleted_at
      ) {
        continue;
      }

      const existing =
        statistics.get(
          order.user_id
        ) || {
          total: 0,
          paid: 0,
          pending: 0,
          lastOrderAt:
            null,
        };

      existing.total +=
        1;

      if (
        order.status ===
        "paid"
      ) {
        existing.paid +=
          1;
      }

      if (
        order.status ===
        "pending"
      ) {
        existing.pending +=
          1;
      }

      if (
        order.created_at &&
        (!existing.lastOrderAt ||
          new Date(
            order.created_at
          ) >
            new Date(
              existing.lastOrderAt
            ))
      ) {
        existing.lastOrderAt =
          order.created_at;
      }

      statistics.set(
        order.user_id,
        existing
      );
    }

    const customerRows: Customer[] =
      Array.isArray(
        customerResult.data
      )
        ? (customerResult.data as unknown as Customer[])
        : [];

    setCustomers(
      customerRows.map(
        (
          customer
        ) => {
          const stats =
            statistics.get(
              customer.id
            );

          return {
            ...customer,
            total_order_count:
              stats?.total ||
              0,
            paid_order_count:
              stats?.paid ||
              0,
            pending_order_count:
              stats?.pending ||
              0,
            last_order_at:
              stats?.lastOrderAt ||
              null,
          };
        }
      )
    );

    setPromoCodes(
      (promoResult.data ||
        []) as unknown as PromoCode[]
    );

    setAssignments(
      (assignmentResult.data ||
        []) as unknown as PromoAssignment[]
    );
  }

  const filteredCustomers =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return customers.filter(
        (
          customer
        ) => {
          const matchesSearch =
            !query ||
            String(
              customer.full_name ||
                ""
            )
              .toLowerCase()
              .includes(
                query
              ) ||
            String(
              customer.email ||
                ""
            )
              .toLowerCase()
              .includes(
                query
              ) ||
            String(
              customer.phone ||
                ""
            )
              .toLowerCase()
              .includes(
                query
              ) ||
            String(
              customer.organization ||
                ""
            )
              .toLowerCase()
              .includes(
                query
              ) ||
            customer.id
              .toLowerCase()
              .includes(
                query
              ) ||
            getTier(
              customer
            )
              .toLowerCase()
              .includes(
                query
              );

          const matchesTier =
            tierFilter ===
              "all" ||
            getTier(
              customer
            ) ===
              tierFilter;

          const matchesLifetimeShipping =
            !lifetimeShippingOnly ||
            Boolean(
              customer.has_lifetime_free_shipping
            );

          return (
            matchesSearch &&
            matchesTier &&
            matchesLifetimeShipping
          );
        }
      );
    }, [
      customers,
      search,
      tierFilter,
      lifetimeShippingOnly,
    ]);

  const autocompleteResults =
    useMemo(() => {
      if (
        !search.trim()
      ) {
        return [];
      }

      return filteredCustomers.slice(
        0,
        6
      );
    }, [
      search,
      filteredCustomers,
    ]);

  const customerOrders =
    useMemo(() => {
      if (
        !selectedCustomer
      ) {
        return [];
      }

      return orders.filter(
        (
          order
        ) =>
          order.user_id ===
            selectedCustomer.id &&
          !order.deleted_at
      );
    }, [
      orders,
      selectedCustomer,
    ]);

  const customerAssignments =
    useMemo(() => {
      if (
        !selectedCustomer
      ) {
        return [];
      }

      return assignments.filter(
        (
          assignment
        ) =>
          assignment.customer_id ===
          selectedCustomer.id
      );
    }, [
      assignments,
      selectedCustomer,
    ]);

  const totalLifetimeSpend =
    customers.reduce(
      (
        sum,
        customer
      ) =>
        sum +
        Number(
          customer.lifetime_spend ||
            0
        ),
      0
    );

  const totalPugPoints =
    customers.reduce(
      (
        sum,
        customer
      ) =>
        sum +
        Number(
          customer.reward_points ||
            0
        ),
      0
    );

  const vipCount =
    customers.filter(
      (
        customer
      ) =>
        getTier(
          customer
        ) !==
        "Stone"
    ).length;

  const lifetimeShippingCount =
    customers.filter(
      (
        customer
      ) =>
        Boolean(
          customer.has_lifetime_free_shipping
        )
    ).length;

  async function toggleLifetimeShipping(
    customer: Customer
  ) {
    if (
      savingCustomer
    ) {
      return;
    }

    setSavingCustomer(
      true
    );

    setNotice("");

    try {
      const next =
        !Boolean(
          customer.has_lifetime_free_shipping
        );

      const {
        error,
      } =
        await supabase
          .from(
            "customer_profiles"
          )
          .update({
            has_lifetime_free_shipping:
              next,
          })
          .eq(
            "id",
            customer.id
          );

      if (error) {
        throw error;
      }

      setCustomers(
        (
          current
        ) =>
          current.map(
            (
              item
            ) =>
              item.id ===
              customer.id
                ? {
                    ...item,
                    has_lifetime_free_shipping:
                      next,
                  }
                : item
          )
      );

      setSelectedCustomer(
        (
          current
        ) =>
          current?.id ===
          customer.id
            ? {
                ...current,
                has_lifetime_free_shipping:
                  next,
              }
            : current
      );

      setNotice(
        `Lifetime free shipping ${
          next
            ? "enabled"
            : "disabled"
        }.`
      );
    } catch (
      error
    ) {
      setNotice(
        getErrorMessage(
          error
        )
      );
    } finally {
      setSavingCustomer(
        false
      );
    }
  }

  async function adjustRewards() {
    if (
      !selectedCustomer ||
      savingCustomer
    ) {
      return;
    }

    const amount =
      Math.max(
        0,
        Math.floor(
          Number(
            rewardAmount ||
              0
          )
        )
      );

    if (
      amount <= 0
    ) {
      setNotice(
        "Enter a PugPoint amount greater than zero."
      );
      return;
    }

    const current =
      Math.max(
        0,
        Math.floor(
          Number(
            selectedCustomer.reward_points ||
              0
          )
        )
      );

    const next =
      rewardMode ===
      "add"
        ? current +
          amount
        : Math.max(
            0,
            current -
              amount
          );

    setSavingCustomer(
      true
    );

    setNotice("");

    try {
      const {
        error,
      } =
        await supabase
          .from(
            "customer_profiles"
          )
          .update({
            reward_points:
              next,
          })
          .eq(
            "id",
            selectedCustomer.id
          );

      if (error) {
        throw error;
      }

      await supabase
        .from(
          "reward_transactions"
        )
        .insert({
          customer_id:
            selectedCustomer.id,
          points:
            rewardMode ===
            "add"
              ? amount
              : -amount,
          transaction_type:
            "admin_adjustment",
          description:
            rewardReason.trim() ||
            `Manual ${
              rewardMode ===
              "add"
                ? "addition"
                : "deduction"
            }`,
        });

      setCustomers(
        (
          currentCustomers
        ) =>
          currentCustomers.map(
            (
              customer
            ) =>
              customer.id ===
              selectedCustomer.id
                ? {
                    ...customer,
                    reward_points:
                      next,
                  }
                : customer
          )
      );

      setSelectedCustomer(
        {
          ...selectedCustomer,
          reward_points:
            next,
        }
      );

      setRewardAmount(
        ""
      );

      setRewardReason(
        ""
      );

      setNotice(
        `${
          amount
        } PugPoints ${
          rewardMode ===
          "add"
            ? "added"
            : "removed"
        }.`
      );
    } catch (
      error
    ) {
      setNotice(
        getErrorMessage(
          error
        )
      );
    } finally {
      setSavingCustomer(
        false
      );
    }
  }

  async function assignPromo() {
    if (
      !selectedCustomer ||
      !selectedPromoId ||
      savingCustomer
    ) {
      return;
    }

    setSavingCustomer(
      true
    );

    setNotice("");

    try {
      const {
        error,
      } =
        await supabase
          .from(
            "customer_promo_assignments"
          )
          .upsert(
            {
              customer_id:
                selectedCustomer.id,
              promo_code_id:
                selectedPromoId,
              is_active:
                true,
            },
            {
              onConflict:
                "customer_id,promo_code_id",
            }
          );

      if (error) {
        throw error;
      }

      setSelectedPromoId(
        ""
      );

      setNotice(
        "Promo code assigned."
      );

      await loadAll();
    } catch (
      error
    ) {
      setNotice(
        getErrorMessage(
          error
        )
      );
    } finally {
      setSavingCustomer(
        false
      );
    }
  }

  async function removePromoAssignment(
    assignmentId: string
  ) {
    if (
      savingCustomer
    ) {
      return;
    }

    setSavingCustomer(
      true
    );

    setNotice("");

    try {
      const {
        error,
      } =
        await supabase
          .from(
            "customer_promo_assignments"
          )
          .update({
            is_active:
              false,
          })
          .eq(
            "id",
            assignmentId
          );

      if (error) {
        throw error;
      }

      setAssignments(
        (
          current
        ) =>
          current.filter(
            (
              assignment
            ) =>
              assignment.id !==
              assignmentId
          )
      );

      setNotice(
        "Promo assignment removed."
      );
    } catch (
      error
    ) {
      setNotice(
        getErrorMessage(
          error
        )
      );
    } finally {
      setSavingCustomer(
        false
      );
    }
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.centerCard}>
          Loading customer CRM...
        </div>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main style={styles.page}>
        <div style={styles.centerCard}>
          <h1 style={styles.title}>
            Access Denied
          </h1>

          <Link
            href="/login"
            style={styles.primaryLink}
          >
            Go to Login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <p style={styles.eyebrow}>
              CUSTOMER RELATIONSHIP MANAGER
            </p>

            <h1 style={styles.title}>
              Customers
            </h1>

            <p style={styles.subtitle}>
              Search, review, reward, and manage customer relationships from one place.
            </p>
          </div>

          <Link
            href="/admin"
            style={styles.backButton}
          >
            ← Operations Center
          </Link>
        </header>

        {notice && (
          <div style={styles.notice}>
            {notice}
          </div>
        )}

        <section style={styles.summaryGrid}>
          <SummaryCard
            label="Total Customers"
            value={String(
              customers.length
            )}
            accent="#00d9ff"
          />

          <SummaryCard
            label="VIP Customers"
            value={String(
              vipCount
            )}
            accent="#ff45d8"
          />

          <SummaryCard
            label="Lifetime Shipping"
            value={String(
              lifetimeShippingCount
            )}
            accent="#00ff99"
            active={
              lifetimeShippingOnly
            }
            onClick={() =>
              setLifetimeShippingOnly(
                (current) =>
                  !current
              )
            }
          />

          <SummaryCard
            label="Lifetime Revenue"
            value={`$${totalLifetimeSpend.toFixed(
              2
            )}`}
            accent="#ffcc00"
          />

          <SummaryCard
            label="Total PugPoints"
            value={totalPugPoints.toLocaleString()}
            accent="#9ea7ff"
          />
        </section>

        <section style={styles.searchPanel}>
          <div style={styles.searchWrap}>
            <label style={styles.label}>
              Live Customer Search

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Start typing a name, email, phone, organization, tier, or customer ID..."
                style={styles.searchInput}
              />
            </label>

            {autocompleteResults.length >
              0 && (
              <div style={styles.autocomplete}>
                {autocompleteResults.map(
                  (
                    customer
                  ) => (
                    <button
                      key={
                        customer.id
                      }
                      type="button"
                      onClick={() => {
                        setSelectedCustomer(
                          customer
                        );

                        setSearch(
                          getDisplayName(
                            customer
                          )
                        );
                      }}
                      style={styles.autocompleteItem}
                    >
                      <strong>
                        {getDisplayName(
                          customer
                        )}
                      </strong>

                      <span style={styles.autocompleteMeta}>
                        {customer.email ||
                          "No email"}{" "}
                        ·{" "}
                        {getTier(
                          customer
                        )}
                      </span>
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          <label style={styles.label}>
            VIP Tier

            <select
              value={tierFilter}
              onChange={(event) =>
                setTierFilter(
                  event.target.value
                )
              }
              style={styles.select}
            >
              <option value="all">
                All Tiers
              </option>

              {tierOrder.map(
                (
                  tier
                ) => (
                  <option
                    key={
                      tier
                    }
                    value={
                      tier
                    }
                  >
                    {tier}
                  </option>
                )
              )}
            </select>
          </label>
        </section>

        <section style={styles.resultsHeader}>
          <div>
            <p style={styles.eyebrow}>
              CUSTOMER DIRECTORY
            </p>

            <h2 style={styles.sectionTitle}>
              {lifetimeShippingOnly
                ? "Lifetime Free Shipping Members"
                : "Customers"}{" "}
              ({filteredCustomers.length})
            </h2>

            {lifetimeShippingOnly && (
              <button
                type="button"
                onClick={() =>
                  setLifetimeShippingOnly(
                    false
                  )
                }
                style={styles.clearLifetimeFilter}
              >
                Show All Customers
              </button>
            )}
          </div>
        </section>

        {filteredCustomers.length ===
        0 ? (
          <div style={styles.emptyState}>
            No customers match your search.
          </div>
        ) : (
          <section style={styles.customerGrid}>
            {filteredCustomers.map(
              (
                customer
              ) => (
                <CustomerCard
                  key={
                    customer.id
                  }
                  customer={
                    customer
                  }
                  onOpen={() =>
                    setSelectedCustomer(
                      customer
                    )
                  }
                />
              )
            )}
          </section>
        )}
      </div>

      {selectedCustomer && (
        <div style={styles.drawerBackdrop}>
          <aside style={styles.drawer}>
            <div style={styles.drawerHeader}>
              <div>
                <p style={styles.eyebrow}>
                  CUSTOMER PROFILE
                </p>

                <h2 style={styles.drawerTitle}>
                  {getDisplayName(
                    selectedCustomer
                  )}
                </h2>

                <p style={styles.drawerEmail}>
                  {selectedCustomer.email ||
                    "No email"}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedCustomer(
                    null
                  )
                }
                style={styles.closeButton}
              >
                ×
              </button>
            </div>

            <div style={styles.drawerScroll}>
              <section style={styles.drawerStats}>
                <MiniStat
                  label="Tier"
                  value={getTier(
                    selectedCustomer
                  )}
                  accent="#ff45d8"
                />

                <MiniStat
                  label="Lifetime Spend"
                  value={`$${Number(
                    selectedCustomer.lifetime_spend ||
                      0
                  ).toFixed(2)}`}
                  accent="#ffcc00"
                />

                <MiniStat
                  label="Orders"
                  value={String(
                    selectedCustomer.total_order_count
                  )}
                  accent="#00d9ff"
                />

                <MiniStat
                  label="PugPoints"
                  value={Number(
                    selectedCustomer.reward_points ||
                      0
                  ).toLocaleString()}
                  accent="#00ff99"
                />
              </section>

              <section style={styles.drawerSection}>
                <h3 style={styles.drawerSectionTitle}>
                  Account Details
                </h3>

                <div style={styles.detailGrid}>
                  <Detail
                    label="Organization"
                    value={
                      selectedCustomer.organization ||
                      "-"
                    }
                  />

                  <Detail
                    label="Phone"
                    value={
                      selectedCustomer.phone ||
                      "-"
                    }
                  />

                  <Detail
                    label="Last Order"
                    value={
                      selectedCustomer.last_order_at
                        ? new Date(
                            selectedCustomer.last_order_at
                          ).toLocaleString()
                        : "Never"
                    }
                  />

                  <Detail
                    label="Customer Since"
                    value={
                      selectedCustomer.created_at
                        ? new Date(
                            selectedCustomer.created_at
                          ).toLocaleDateString()
                        : "-"
                    }
                  />
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void toggleLifetimeShipping(
                      selectedCustomer
                    )
                  }
                  disabled={
                    savingCustomer
                  }
                  style={
                    selectedCustomer.has_lifetime_free_shipping
                      ? styles.dangerButton
                      : styles.successButton
                  }
                >
                  {selectedCustomer.has_lifetime_free_shipping
                    ? "Disable Lifetime Shipping"
                    : "Enable Lifetime Shipping"}
                </button>
              </section>

              <section style={styles.drawerSection}>
                <h3 style={styles.drawerSectionTitle}>
                  PugPoints Manager
                </h3>

                <div style={styles.segmented}>
                  <button
                    type="button"
                    onClick={() =>
                      setRewardMode(
                        "add"
                      )
                    }
                    style={
                      rewardMode ===
                      "add"
                        ? styles.segmentActive
                        : styles.segmentButton
                    }
                  >
                    Add
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setRewardMode(
                        "remove"
                      )
                    }
                    style={
                      rewardMode ===
                      "remove"
                        ? styles.segmentActive
                        : styles.segmentButton
                    }
                  >
                    Remove
                  </button>
                </div>

                <input
                  type="number"
                  min="1"
                  value={rewardAmount}
                  onChange={(event) =>
                    setRewardAmount(
                      event.target.value
                    )
                  }
                  placeholder="PugPoints amount"
                  style={styles.input}
                />

                <input
                  value={rewardReason}
                  onChange={(event) =>
                    setRewardReason(
                      event.target.value
                    )
                  }
                  placeholder="Reason for adjustment"
                  style={styles.input}
                />

                <button
                  type="button"
                  onClick={() =>
                    void adjustRewards()
                  }
                  disabled={
                    savingCustomer
                  }
                  style={styles.successButton}
                >
                  Apply PugPoint Adjustment
                </button>
              </section>

              <section style={styles.drawerSection}>
                <h3 style={styles.drawerSectionTitle}>
                  Promo Code Assignment
                </h3>

                <div style={styles.inlineForm}>
                  <select
                    value={selectedPromoId}
                    onChange={(event) =>
                      setSelectedPromoId(
                        event.target.value
                      )
                    }
                    style={styles.select}
                  >
                    <option value="">
                      Select active promo
                    </option>

                    {promoCodes.map(
                      (
                        promo
                      ) => (
                        <option
                          key={
                            promo.id
                          }
                          value={
                            promo.id
                          }
                        >
                          {promo.code} —{" "}
                          {promo.discount_type ===
                          "percent"
                            ? `${promo.discount_value}%`
                            : `$${promo.discount_value}`}
                        </option>
                      )
                    )}
                  </select>

                  <button
                    type="button"
                    onClick={() =>
                      void assignPromo()
                    }
                    disabled={
                      !selectedPromoId ||
                      savingCustomer
                    }
                    style={styles.primaryButton}
                  >
                    Assign
                  </button>
                </div>

                <div style={styles.assignmentList}>
                  {customerAssignments.length ===
                  0 ? (
                    <p style={styles.muted}>
                      No active promo codes assigned.
                    </p>
                  ) : (
                    customerAssignments.map(
                      (
                        assignment
                      ) => (
                        <div
                          key={
                            assignment.id
                          }
                          style={styles.assignmentRow}
                        >
                          <div>
                            <strong style={styles.promoCode}>
                              {assignment.promo_codes?.code ||
                                "Promo"}
                            </strong>

                            <div style={styles.mutedSmall}>
                              Assigned{" "}
                              {new Date(
                                assignment.assigned_at
                              ).toLocaleDateString()}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              void removePromoAssignment(
                                assignment.id
                              )
                            }
                            style={styles.smallDangerButton}
                          >
                            Remove
                          </button>
                        </div>
                      )
                    )
                  )}
                </div>
              </section>

              <section style={styles.drawerSection}>
                <h3 style={styles.drawerSectionTitle}>
                  Recent Orders
                </h3>

                {customerOrders.length ===
                0 ? (
                  <p style={styles.muted}>
                    No orders found.
                  </p>
                ) : (
                  <div style={styles.orderList}>
                    {customerOrders
                      .slice(
                        0,
                        8
                      )
                      .map(
                        (
                          order
                        ) => (
                          <Link
                            key={
                              order.id
                            }
                            href={`/admin/orders/${order.id}`}
                            style={styles.orderRow}
                          >
                            <div>
                              <strong>
                                {order.order_number ||
                                  order.id}
                              </strong>

                              <div style={styles.mutedSmall}>
                                {order.created_at
                                  ? new Date(
                                      order.created_at
                                    ).toLocaleString()
                                  : "-"}
                              </div>
                            </div>

                            <div style={styles.orderRight}>
                              <span
                                style={{
                                  color:
                                    order.status ===
                                    "paid"
                                      ? "#00ff99"
                                      : "#ffcc00",
                                }}
                              >
                                {order.status ||
                                  "-"}
                              </span>

                              <strong>
                                $
                                {Number(
                                  order.total ||
                                    0
                                ).toFixed(
                                  2
                                )}
                              </strong>
                            </div>
                          </Link>
                        )
                      )}
                  </div>
                )}
              </section>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}

function CustomerCard({
  customer,
  onOpen,
}: {
  customer: Customer;
  onOpen: () => void;
}) {
  return (
    <article style={styles.customerCard}>
      <div style={styles.customerTop}>
        <div style={styles.avatar}>
          {getDisplayName(
            customer
          )
            .charAt(
              0
            )
            .toUpperCase()}
        </div>

        <div>
          <h3 style={styles.customerName}>
            {getDisplayName(
              customer
            )}
          </h3>

          <p style={styles.customerEmail}>
            {customer.email ||
              "No email"}
          </p>
        </div>
      </div>

      <div style={styles.cardMetrics}>
        <Detail
          label="Tier"
          value={getTier(
            customer
          )}
          accent="#ff45d8"
        />

        <Detail
          label="Lifetime Spend"
          value={`$${Number(
            customer.lifetime_spend ||
              0
          ).toFixed(2)}`}
          accent="#ffcc00"
        />

        <Detail
          label="Orders"
          value={String(
            customer.total_order_count
          )}
          accent="#00d9ff"
        />

        <Detail
          label="PugPoints"
          value={Number(
            customer.reward_points ||
              0
          ).toLocaleString()}
          accent="#00ff99"
        />
      </div>

      <div style={styles.cardFooter}>
        <span
          style={{
            ...styles.shippingBadge,
            color:
              customer.has_lifetime_free_shipping
                ? "#00ff99"
                : "#888",
            borderColor:
              customer.has_lifetime_free_shipping
                ? "rgba(0,255,153,.38)"
                : "rgba(255,255,255,.12)",
          }}
        >
          {customer.has_lifetime_free_shipping
            ? "Lifetime Shipping"
            : "Standard Shipping"}
        </span>

        <button
          type="button"
          onClick={onOpen}
          style={styles.openButton}
        >
          Open Profile
        </button>
      </div>
    </article>
  );
}

function SummaryCard({
  label,
  value,
  accent,
  active = false,
  onClick,
}: {
  label: string;
  value: string;
  accent: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const content = (
    <>
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
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        style={{
          ...styles.summaryCard,
          ...styles.summaryButton,
          borderColor:
            active
              ? accent
              : `${accent}55`,
          boxShadow:
            active
              ? `0 0 24px ${accent}44`
              : "none",
          background:
            active
              ? `linear-gradient(145deg, ${accent}16, rgba(6,6,9,.98))`
              : styles.summaryCard.background,
        }}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      style={{
        ...styles.summaryCard,
        borderColor:
          `${accent}55`,
      }}
    >
      {content}
    </div>
  );
}

function MiniStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div style={styles.miniStat}>
      <span style={styles.miniLabel}>
        {label}
      </span>

      <strong
        style={{
          color: accent,
          fontSize: 22,
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function Detail({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div style={styles.detail}>
      <span style={styles.detailLabel}>
        {label}
      </span>

      <strong
        style={{
          color:
            accent ||
            "#fff",
          overflowWrap:
            "anywhere",
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
    padding:
      "clamp(18px, 4vw, 34px)",
    background:
      "radial-gradient(circle at 10% 0%, rgba(255,69,216,.14), transparent 28%), radial-gradient(circle at 90% 4%, rgba(0,217,255,.14), transparent 30%), #000",
    color: "#fff",
  },

  container: {
    maxWidth: 1500,
    margin: "0 auto",
  },

  header: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems:
      "flex-start",
    gap: 20,
    flexWrap:
      "wrap" as const,
  },

  eyebrow: {
    margin: 0,
    color: "#00d9ff",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: ".15em",
  },

  title: {
    margin: "7px 0 0",
    color: "#ff45d8",
    fontSize:
      "clamp(44px, 7vw, 64px)",
    letterSpacing: "-.035em",
  },

  subtitle: {
    maxWidth: 820,
    margin: "12px 0 0",
    color: "#bcbcc5",
    fontSize: 18,
    lineHeight: 1.7,
  },

  backButton: {
    minHeight: 46,
    padding: "0 16px",
    display: "inline-flex",
    alignItems: "center",
    border:
      "1px solid rgba(0,217,255,.42)",
    borderRadius: 10,
    background:
      "rgba(0,217,255,.06)",
    color: "#7df9ff",
    textDecoration: "none",
    fontWeight: 900,
  },

  notice: {
    marginTop: 18,
    padding: "13px 15px",
    border:
      "1px solid rgba(0,217,255,.34)",
    borderRadius: 11,
    background:
      "rgba(0,217,255,.06)",
    color: "#7df9ff",
  },

  summaryGrid: {
    marginTop: 22,
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 14,
  },

  summaryCard: {
    padding: 19,
    display: "grid",
    gap: 7,
    border: "1px solid",
    borderRadius: 15,
    background:
      "linear-gradient(145deg, rgba(12,12,17,.97), rgba(6,6,9,.98))",
  },

  summaryButton: {
    width: "100%",
    color: "#fff",
    textAlign:
      "left" as const,
    cursor: "pointer",
    font: "inherit",
  },

  summaryLabel: {
    color: "#a7a7b0",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: ".08em",
    textTransform:
      "uppercase" as const,
  },

  summaryValue: {
    fontSize: 30,
  },

  searchPanel: {
    marginTop: 22,
    padding: 20,
    display: "grid",
    gridTemplateColumns:
      "minmax(0, 1fr) minmax(200px, 280px)",
    gap: 14,
    border:
      "1px solid rgba(0,217,255,.30)",
    borderRadius: 17,
    background:
      "linear-gradient(145deg, rgba(8,8,12,.96), rgba(15,8,18,.94))",
  },

  searchWrap: {
    position:
      "relative" as const,
  },

  label: {
    display: "grid",
    gap: 7,
    color: "#d0d0d7",
    fontSize: 14,
    fontWeight: 900,
  },

  searchInput: {
    width: "100%",
    minHeight: 54,
    boxSizing:
      "border-box" as const,
    padding: "14px 16px",
    border:
      "1px solid rgba(255,255,255,.16)",
    borderRadius: 10,
    background: "#050507",
    color: "#fff",
    fontSize: 16,
  },

  select: {
    width: "100%",
    minHeight: 52,
    boxSizing:
      "border-box" as const,
    padding: "12px 14px",
    border:
      "1px solid rgba(255,255,255,.16)",
    borderRadius: 10,
    background: "#050507",
    color: "#fff",
    fontSize: 15,
  },

  autocomplete: {
    position:
      "absolute" as const,
    left: 0,
    right: 0,
    top: "calc(100% + 7px)",
    zIndex: 50,
    display: "grid",
    overflow: "hidden",
    border:
      "1px solid rgba(0,217,255,.34)",
    borderRadius: 12,
    background: "#09090d",
    boxShadow:
      "0 20px 50px rgba(0,0,0,.55)",
  },

  autocompleteItem: {
    padding: "13px 15px",
    display: "grid",
    gap: 4,
    border: 0,
    borderBottom:
      "1px solid rgba(255,255,255,.08)",
    background:
      "transparent",
    color: "#fff",
    textAlign:
      "left" as const,
    cursor: "pointer",
  },

  autocompleteMeta: {
    color: "#94949d",
    fontSize: 12,
  },

  resultsHeader: {
    marginTop: 28,
  },

  clearLifetimeFilter: {
    marginTop: 10,
    minHeight: 40,
    padding: "0 13px",
    border:
      "1px solid rgba(0,255,153,.42)",
    borderRadius: 9,
    background:
      "rgba(0,255,153,.07)",
    color: "#00ff99",
    fontWeight: 900,
    cursor: "pointer",
  },

  sectionTitle: {
    margin: "5px 0 0",
    color: "#7df9ff",
    fontSize: 30,
  },

  customerGrid: {
    marginTop: 16,
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(310px, 1fr))",
    gap: 16,
  },

  customerCard: {
    padding: 19,
    display: "grid",
    gap: 16,
    border:
      "1px solid rgba(255,255,255,.12)",
    borderRadius: 17,
    background:
      "linear-gradient(145deg, rgba(11,11,15,.97), rgba(7,7,10,.98))",
    boxShadow:
      "0 0 20px rgba(0,217,255,.05)",
  },

  customerTop: {
    display: "flex",
    gap: 12,
    alignItems: "center",
  },

  avatar: {
    width: 52,
    height: 52,
    display: "grid",
    placeItems: "center",
    border:
      "1px solid rgba(255,69,216,.42)",
    borderRadius: 999,
    background:
      "rgba(255,69,216,.08)",
    color: "#ff75df",
    fontSize: 22,
    fontWeight: 900,
  },

  customerName: {
    margin: 0,
    color: "#fff",
    fontSize: 21,
  },

  customerEmail: {
    margin: "4px 0 0",
    color: "#9f9fa8",
    overflowWrap:
      "anywhere" as const,
  },

  cardMetrics: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: 10,
  },

  detail: {
    minWidth: 0,
    padding: 11,
    display: "grid",
    gap: 4,
    border:
      "1px solid rgba(255,255,255,.08)",
    borderRadius: 10,
    background:
      "rgba(255,255,255,.025)",
  },

  detailLabel: {
    color: "#898993",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: ".08em",
    textTransform:
      "uppercase" as const,
  },

  cardFooter: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: 10,
    flexWrap:
      "wrap" as const,
  },

  shippingBadge: {
    padding: "6px 9px",
    border: "1px solid",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 900,
  },

  openButton: {
    minHeight: 42,
    padding: "0 14px",
    border:
      "1px solid rgba(0,217,255,.45)",
    borderRadius: 9,
    background:
      "rgba(0,217,255,.07)",
    color: "#7df9ff",
    fontSize: 13,
    fontWeight: 900,
    cursor: "pointer",
  },

  drawerBackdrop: {
    position:
      "fixed" as const,
    inset: 0,
    zIndex: 200000,
    display: "flex",
    justifyContent:
      "flex-end",
    background:
      "rgba(0,0,0,.72)",
    backdropFilter:
      "blur(4px)",
  },

  drawer: {
    width:
      "min(680px, 100vw)",
    height: "100vh",
    display: "grid",
    gridTemplateRows:
      "auto minmax(0, 1fr)",
    borderLeft:
      "1px solid rgba(0,217,255,.32)",
    background:
      "linear-gradient(180deg, #09090d, #050507)",
    boxShadow:
      "-20px 0 60px rgba(0,0,0,.6)",
  },

  drawerHeader: {
    padding: 20,
    display: "flex",
    justifyContent:
      "space-between",
    alignItems:
      "flex-start",
    gap: 14,
    borderBottom:
      "1px solid rgba(255,255,255,.09)",
  },

  drawerTitle: {
    margin: "5px 0 0",
    color: "#ff75df",
    fontSize: 32,
  },

  drawerEmail: {
    margin: "5px 0 0",
    color: "#9f9fa8",
  },

  closeButton: {
    width: 44,
    height: 44,
    border:
      "1px solid rgba(255,255,255,.16)",
    borderRadius: 10,
    background:
      "rgba(255,255,255,.04)",
    color: "#fff",
    fontSize: 25,
    cursor: "pointer",
  },

  drawerScroll: {
    overflowY:
      "auto" as const,
    padding: 20,
  },

  drawerStats: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: 10,
  },

  miniStat: {
    padding: 13,
    display: "grid",
    gap: 5,
    border:
      "1px solid rgba(255,255,255,.09)",
    borderRadius: 11,
    background:
      "rgba(255,255,255,.025)",
  },

  miniLabel: {
    color: "#8d8d96",
    fontSize: 10,
    fontWeight: 900,
    textTransform:
      "uppercase" as const,
  },

  drawerSection: {
    marginTop: 16,
    padding: 17,
    display: "grid",
    gap: 12,
    border:
      "1px solid rgba(255,255,255,.10)",
    borderRadius: 14,
    background:
      "rgba(255,255,255,.025)",
  },

  drawerSectionTitle: {
    margin: 0,
    color: "#7df9ff",
    fontSize: 21,
  },

  detailGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: 10,
  },

  segmented: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: 8,
  },

  segmentButton: {
    minHeight: 42,
    border:
      "1px solid rgba(255,255,255,.14)",
    borderRadius: 9,
    background:
      "rgba(255,255,255,.03)",
    color: "#aaa",
    fontWeight: 900,
    cursor: "pointer",
  },

  segmentActive: {
    minHeight: 42,
    border:
      "1px solid rgba(0,217,255,.48)",
    borderRadius: 9,
    background:
      "rgba(0,217,255,.08)",
    color: "#7df9ff",
    fontWeight: 900,
    cursor: "pointer",
  },

  input: {
    width: "100%",
    minHeight: 48,
    boxSizing:
      "border-box" as const,
    padding: "12px 13px",
    border:
      "1px solid rgba(255,255,255,.15)",
    borderRadius: 9,
    background: "#050507",
    color: "#fff",
    fontSize: 15,
  },

  inlineForm: {
    display: "grid",
    gridTemplateColumns:
      "minmax(0, 1fr) auto",
    gap: 9,
  },

  primaryButton: {
    minHeight: 46,
    padding: "0 15px",
    border:
      "1px solid rgba(0,217,255,.48)",
    borderRadius: 9,
    background:
      "rgba(0,217,255,.08)",
    color: "#7df9ff",
    fontWeight: 900,
    cursor: "pointer",
  },

  successButton: {
    minHeight: 46,
    padding: "0 15px",
    border:
      "1px solid rgba(0,255,153,.48)",
    borderRadius: 9,
    background:
      "rgba(0,255,153,.08)",
    color: "#00ff99",
    fontWeight: 900,
    cursor: "pointer",
  },

  dangerButton: {
    minHeight: 46,
    padding: "0 15px",
    border:
      "1px solid rgba(255,93,93,.48)",
    borderRadius: 9,
    background:
      "rgba(255,93,93,.08)",
    color: "#ff8585",
    fontWeight: 900,
    cursor: "pointer",
  },

  assignmentList: {
    display: "grid",
    gap: 9,
  },

  assignmentRow: {
    padding: 11,
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: 10,
    border:
      "1px solid rgba(255,255,255,.08)",
    borderRadius: 9,
  },

  promoCode: {
    color: "#00ff99",
  },

  smallDangerButton: {
    minHeight: 36,
    padding: "0 11px",
    border:
      "1px solid rgba(255,93,93,.42)",
    borderRadius: 8,
    background:
      "rgba(255,93,93,.07)",
    color: "#ff8585",
    fontSize: 12,
    fontWeight: 900,
    cursor: "pointer",
  },

  orderList: {
    display: "grid",
    gap: 9,
  },

  orderRow: {
    padding: 12,
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: 12,
    border:
      "1px solid rgba(255,255,255,.09)",
    borderRadius: 10,
    background:
      "rgba(255,255,255,.02)",
    color: "#fff",
    textDecoration: "none",
  },

  orderRight: {
    display: "grid",
    justifyItems: "end",
    gap: 4,
  },

  muted: {
    margin: 0,
    color: "#9b9ba4",
  },

  mutedSmall: {
    marginTop: 3,
    color: "#85858f",
    fontSize: 11,
  },

  emptyState: {
    marginTop: 16,
    padding: 30,
    textAlign:
      "center" as const,
    border:
      "1px dashed rgba(0,217,255,.30)",
    borderRadius: 14,
    color: "#a8a8b1",
  },

  centerCard: {
    maxWidth: 560,
    margin: "10vh auto 0",
    padding: 30,
    display: "grid",
    gap: 14,
    justifyItems: "center",
    textAlign:
      "center" as const,
    border:
      "1px solid rgba(0,217,255,.34)",
    borderRadius: 16,
    background:
      "rgba(8,8,12,.95)",
  },

  primaryLink: {
    color: "#7df9ff",
  },
};