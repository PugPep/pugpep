"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "../../../lib/supabaseClient";

type CustomerAccount = {
  id: string;
  full_name: string | null;
  email: string | null;
  is_sales_rep: boolean;
};

type SalesRep = {
  id: string;
  display_name: string;
  email: string | null;
  commission_percent: number;
  customer_count: number;
  paid_order_count: number;
  paid_revenue: number;
  paid_profit: number;
  unpaid_commission: number;
  paid_commission: number;
  is_active: boolean;
};

export default function SalesRepsPage() {
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [
    accounts,
    setAccounts,
  ] =
    useState<
      CustomerAccount[]
    >([]);

  const [
    reps,
    setReps,
  ] =
    useState<
      SalesRep[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    creating,
    setCreating,
  ] =
    useState(false);

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<
      "all" | "active" | "inactive"
    >("all");

  const [
    notice,
    setNotice,
  ] =
    useState("");

  const [
    form,
    setForm,
  ] =
    useState({
      userId: "",
      displayName: "",
      commissionPercent:
        "20",
      promoCode: "",
      discountType:
        "percent",
      discountValue:
        "10",
    });

  useEffect(() => {
    void loadPage();
  }, []);

  async function loadPage() {
    setLoading(true);
    setNotice("");

    const [
      accountsResult,
      repsResult,
    ] =
      await Promise.all([
        supabase.rpc(
          "admin_get_customer_account_options"
        ),

        supabase.rpc(
          "admin_get_sales_reps"
        ),
      ]);

    if (
      accountsResult.error
    ) {
      setNotice(
        accountsResult.error.message
      );
    } else {
      setAccounts(
        accountsResult.data ||
          []
      );
    }

    if (
      repsResult.error
    ) {
      setNotice(
        repsResult.error.message
      );
    } else {
      setReps(
        repsResult.data ||
          []
      );
    }

    setLoading(false);
  }

  async function createRep() {
    if (
      !form.userId
    ) {
      setNotice(
        "Please select a customer account."
      );
      return;
    }

    if (
      !form.displayName.trim()
    ) {
      setNotice(
        "Please enter a display name."
      );
      return;
    }

    const commissionPercent =
      Number(
        form.commissionPercent
      );

    const discountValue =
      Number(
        form.discountValue
      );

    if (
      !Number.isFinite(
        commissionPercent
      ) ||
      commissionPercent <
        0 ||
      commissionPercent >
        100
    ) {
      setNotice(
        "Commission percentage must be between 0 and 100."
      );
      return;
    }

    if (
      !Number.isFinite(
        discountValue
      ) ||
      discountValue < 0
    ) {
      setNotice(
        "Customer discount must be zero or greater."
      );
      return;
    }

    setCreating(true);
    setNotice("");

    const {
      data,
      error,
    } =
      await supabase.rpc(
        "admin_create_sales_rep",
        {
          p_user_id:
            form.userId,
          p_display_name:
            form.displayName.trim(),
          p_commission_percent:
            commissionPercent,
          p_promo_code:
            form.promoCode
              .trim()
              .toUpperCase() ||
            null,
          p_discount_type:
            form.discountType,
          p_discount_value:
            discountValue,
        }
      );

    setCreating(false);

    if (error) {
      setNotice(
        error.message
      );
      return;
    }

    setNotice(
      "Sales representative created."
    );

    if (data) {
      window.location.href =
        `/admin/sales-reps/${data}`;
      return;
    }

    setForm({
      userId: "",
      displayName: "",
      commissionPercent:
        "20",
      promoCode: "",
      discountType:
        "percent",
      discountValue:
        "10",
    });

    await loadPage();
  }

  const activeReps =
    reps.filter(
      (
        rep
      ) =>
        rep.is_active
    );

  const inactiveReps =
    reps.filter(
      (
        rep
      ) =>
        !rep.is_active
    );

  const totalCustomers =
    reps.reduce(
      (
        sum,
        rep
      ) =>
        sum +
        Number(
          rep.customer_count ||
            0
        ),
      0
    );

  const totalPaidOrders =
    reps.reduce(
      (
        sum,
        rep
      ) =>
        sum +
        Number(
          rep.paid_order_count ||
            0
        ),
      0
    );

  const totalRevenue =
    reps.reduce(
      (
        sum,
        rep
      ) =>
        sum +
        Number(
          rep.paid_revenue ||
            0
        ),
      0
    );

  const totalProfit =
    reps.reduce(
      (
        sum,
        rep
      ) =>
        sum +
        Number(
          rep.paid_profit ||
            0
        ),
      0
    );

  const totalUnpaidCommission =
    reps.reduce(
      (
        sum,
        rep
      ) =>
        sum +
        Number(
          rep.unpaid_commission ||
            0
        ),
      0
    );

  const totalPaidCommission =
    reps.reduce(
      (
        sum,
        rep
      ) =>
        sum +
        Number(
          rep.paid_commission ||
            0
        ),
      0
    );

  const filteredReps =
    reps.filter(
      (
        rep
      ) => {
        const query =
          search
            .trim()
            .toLowerCase();

        const matchesSearch =
          !query ||
          rep.display_name
            .toLowerCase()
            .includes(
              query
            ) ||
          String(
            rep.email ||
              ""
          )
            .toLowerCase()
            .includes(
              query
            );

        const matchesStatus =
          statusFilter ===
          "all"
            ? true
            : statusFilter ===
              "active"
            ? rep.is_active
            : !rep.is_active;

        return (
          matchesSearch &&
          matchesStatus
        );
      }
    );

  return (
    <main style={page}>
      <div style={container}>
        <header style={header}>
          <div>
            <p style={eyebrow}>
              CONTROL CENTER
            </p>

            <h1 style={pageTitle}>
              Sales Representatives
            </h1>

            <p style={subtitle}>
              Create representatives, assign promotional codes, and review customer, revenue, profit, and commission performance.
            </p>
          </div>
        </header>

        {notice && (
          <div style={noticeBanner}>
            <span>
              {notice}
            </span>

            <button
              type="button"
              onClick={() =>
                setNotice("")
              }
              style={noticeClose}
            >
              ×
            </button>
          </div>
        )}

        <section style={statsGrid}>
          <StatCard
            label="Total Reps"
            value={String(
              reps.length
            )}
            accent="#00d9ff"
          />

          <StatCard
            label="Active"
            value={String(
              activeReps.length
            )}
            accent="#00ff99"
          />

          <StatCard
            label="Inactive"
            value={String(
              inactiveReps.length
            )}
            accent="#ff6f6f"
          />

          <StatCard
            label="Customers"
            value={String(
              totalCustomers
            )}
            accent="#ff75df"
          />

          <StatCard
            label="Paid Orders"
            value={String(
              totalPaidOrders
            )}
            accent="#ffcc00"
          />

          <StatCard
            label="Revenue"
            value={`$${totalRevenue.toFixed(
              2
            )}`}
            accent="#00d9ff"
          />

          <StatCard
            label="Profit"
            value={`$${totalProfit.toFixed(
              2
            )}`}
            accent={
              totalProfit >= 0
                ? "#00ff99"
                : "#ff6f6f"
            }
          />

          <StatCard
            label="Unpaid Commission"
            value={`$${totalUnpaidCommission.toFixed(
              2
            )}`}
            accent="#ffcc00"
          />

          <StatCard
            label="Paid Commission"
            value={`$${totalPaidCommission.toFixed(
              2
            )}`}
            accent="#7df9ff"
          />
        </section>

        <section style={panel}>
          <div style={panelHeader}>
            <div>
              <p style={sectionEyebrow}>
                CREATE
              </p>

              <h2 style={sectionTitle}>
                Add a Sales Representative
              </h2>
            </div>
          </div>

          <div style={formGrid}>
            <Field label="Customer Account">
              <select
                style={input}
                value={
                  form.userId
                }
                onChange={(
                  event
                ) => {
                  const selectedAccount =
                    accounts.find(
                      (
                        account
                      ) =>
                        account.id ===
                        event.target
                          .value
                    );

                  setForm(
                    (
                      current
                    ) => ({
                      ...current,
                      userId:
                        event.target
                          .value,
                      displayName:
                        selectedAccount?.full_name ||
                        selectedAccount?.email ||
                        "",
                    })
                  );
                }}
              >
                <option value="">
                  Select an account
                </option>

                {accounts.map(
                  (
                    account
                  ) => (
                    <option
                      key={
                        account.id
                      }
                      value={
                        account.id
                      }
                    >
                      {account.full_name ||
                        account.email ||
                        account.id}
                      {account.is_sales_rep
                        ? " — Existing Rep"
                        : ""}
                    </option>
                  )
                )}
              </select>
            </Field>

            <Field label="Display Name">
              <input
                style={input}
                value={
                  form.displayName
                }
                placeholder="Representative name"
                onChange={(
                  event
                ) =>
                  setForm(
                    (
                      current
                    ) => ({
                      ...current,
                      displayName:
                        event.target
                          .value,
                    })
                  )
                }
              />
            </Field>

            <Field label="Commission Percentage">
              <input
                style={input}
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={
                  form.commissionPercent
                }
                onChange={(
                  event
                ) =>
                  setForm(
                    (
                      current
                    ) => ({
                      ...current,
                      commissionPercent:
                        event.target
                          .value,
                    })
                  )
                }
              />
            </Field>

            <Field label="Promo Code">
              <input
                style={input}
                value={
                  form.promoCode
                }
                placeholder="REP10"
                onChange={(
                  event
                ) =>
                  setForm(
                    (
                      current
                    ) => ({
                      ...current,
                      promoCode:
                        event.target.value.toUpperCase(),
                    })
                  )
                }
              />
            </Field>

            <Field label="Discount Type">
              <select
                style={input}
                value={
                  form.discountType
                }
                onChange={(
                  event
                ) =>
                  setForm(
                    (
                      current
                    ) => ({
                      ...current,
                      discountType:
                        event.target
                          .value,
                    })
                  )
                }
              >
                <option value="percent">
                  Percent Discount
                </option>

                <option value="fixed">
                  Fixed-Dollar Discount
                </option>
              </select>
            </Field>

            <Field label="Customer Discount">
              <input
                style={input}
                type="number"
                min="0"
                step="0.01"
                value={
                  form.discountValue
                }
                onChange={(
                  event
                ) =>
                  setForm(
                    (
                      current
                    ) => ({
                      ...current,
                      discountValue:
                        event.target
                          .value,
                    })
                  )
                }
              />
            </Field>
          </div>

          <button
            type="button"
            style={{
              ...createButton,
              opacity:
                creating
                  ? 0.65
                  : 1,
              cursor:
                creating
                  ? "not-allowed"
                  : "pointer",
            }}
            disabled={creating}
            onClick={() => {
              void createRep();
            }}
          >
            {creating
              ? "Creating..."
              : "Create Sales Representative"}
          </button>
        </section>

        <section style={panel}>
          <div style={panelHeader}>
            <div>
              <p style={sectionEyebrow}>
                MANAGE
              </p>

              <h2 style={sectionTitle}>
                Current Representatives
              </h2>
            </div>

            <span style={resultBadge}>
              {
                filteredReps.length
              }{" "}
              visible
            </span>
          </div>

          <div style={toolbar}>
            <input
              type="search"
              value={search}
              onChange={(
                event
              ) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search representatives by name or email..."
              style={searchInput}
            />

            <div style={filterRow}>
              {[
                {
                  key: "all",
                  label: `All (${reps.length})`,
                },
                {
                  key: "active",
                  label: `Active (${activeReps.length})`,
                },
                {
                  key: "inactive",
                  label: `Inactive (${inactiveReps.length})`,
                },
              ].map(
                (
                  item
                ) => {
                  const active =
                    statusFilter ===
                    item.key;

                  return (
                    <button
                      key={
                        item.key
                      }
                      type="button"
                      onClick={() =>
                        setStatusFilter(
                          item.key as
                            | "all"
                            | "active"
                            | "inactive"
                        )
                      }
                      style={{
                        ...filterButton,
                        borderColor:
                          active
                            ? "#00ff99"
                            : "rgba(255,255,255,.14)",
                        background:
                          active
                            ? "rgba(0,255,153,.10)"
                            : "rgba(255,255,255,.035)",
                        color:
                          active
                            ? "#00ff99"
                            : "#d0d0d6",
                      }}
                    >
                      {
                        item.label
                      }
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {loading ? (
            <div style={emptyState}>
              <p style={muted}>
                Loading representatives...
              </p>
            </div>
          ) : filteredReps.length ===
            0 ? (
            <div style={emptyState}>
              <p style={muted}>
                No representatives match this search or filter.
              </p>
            </div>
          ) : (
            <div style={repGrid}>
              {filteredReps.map(
                (
                  rep
                ) => (
                  <article
                    key={
                      rep.id
                    }
                    style={{
                      ...repCard,
                      borderColor:
                        rep.is_active
                          ? "rgba(0,255,153,.34)"
                          : "rgba(255,111,111,.28)",
                    }}
                  >
                    <div style={repHeader}>
                      <div>
                        <Link
                          href={`/admin/sales-reps/${rep.id}`}
                          style={repName}
                        >
                          {
                            rep.display_name
                          }
                        </Link>

                        <span style={repEmail}>
                          {rep.email ||
                            "No email"}
                        </span>
                      </div>

                      <span
                        style={{
                          ...statusBadge,
                          color:
                            rep.is_active
                              ? "#00ff99"
                              : "#ff7f7f",
                          borderColor:
                            rep.is_active
                              ? "rgba(0,255,153,.48)"
                              : "rgba(255,111,111,.48)",
                          background:
                            rep.is_active
                              ? "rgba(0,255,153,.08)"
                              : "rgba(255,111,111,.08)",
                        }}
                      >
                        {rep.is_active
                          ? "ACTIVE"
                          : "INACTIVE"}
                      </span>
                    </div>

                    <div style={rateCard}>
                      <span style={metricLabel}>
                        Commission Rate
                      </span>

                      <strong style={rateValue}>
                        {Number(
                          rep.commission_percent ||
                            0
                        ).toFixed(
                          2
                        )}
                        %
                      </strong>
                    </div>

                    <div style={metricsGrid}>
                      <Metric
                        label="Customers"
                        value={String(
                          Number(
                            rep.customer_count ||
                              0
                          )
                        )}
                      />

                      <Metric
                        label="Paid Orders"
                        value={String(
                          Number(
                            rep.paid_order_count ||
                              0
                          )
                        )}
                      />

                      <Metric
                        label="Revenue"
                        value={`$${Number(
                          rep.paid_revenue ||
                            0
                        ).toFixed(
                          2
                        )}`}
                        accent="#00d9ff"
                      />

                      <Metric
                        label="Profit"
                        value={`$${Number(
                          rep.paid_profit ||
                            0
                        ).toFixed(
                          2
                        )}`}
                        accent={
                          Number(
                            rep.paid_profit ||
                              0
                          ) >= 0
                            ? "#00ff99"
                            : "#ff6f6f"
                        }
                      />

                      <Metric
                        label="Unpaid Commission"
                        value={`$${Number(
                          rep.unpaid_commission ||
                            0
                        ).toFixed(
                          2
                        )}`}
                        accent="#ffcc00"
                      />

                      <Metric
                        label="Paid Commission"
                        value={`$${Number(
                          rep.paid_commission ||
                            0
                        ).toFixed(
                          2
                        )}`}
                        accent="#7df9ff"
                      />
                    </div>

                    <Link
                      href={`/admin/sales-reps/${rep.id}`}
                      style={viewButton}
                    >
                      Open Representative
                    </Link>
                  </article>
                )
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={field}>
      <span style={fieldLabel}>
        {label}
      </span>

      {children}
    </label>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div
      style={{
        ...statCard,
        borderColor:
          `${accent}55`,
        boxShadow:
          `0 0 18px ${accent}18`,
      }}
    >
      <span
        style={{
          ...statLabel,
          color: accent,
        }}
      >
        {label}
      </span>

      <strong style={statValue}>
        {value}
      </strong>
    </div>
  );
}

function Metric({
  label,
  value,
  accent = "#ffffff",
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div style={metricCard}>
      <span style={metricLabel}>
        {label}
      </span>

      <strong
        style={{
          color: accent,
        }}
      >
        {value}
      </strong>
    </div>
  );
}

const page = {
  minHeight: "100vh",
  padding:
    "clamp(18px, 4vw, 34px)",
  background:
    "radial-gradient(circle at 12% 0%, rgba(255,47,208,.14), transparent 27%), radial-gradient(circle at 88% 4%, rgba(0,217,255,.14), transparent 30%), #000",
  color: "#ffffff",
  fontSize: 16,
};

const container = {
  width: "100%",
  maxWidth: 1380,
  margin: "0 auto",
};

const header = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems:
    "flex-start",
  gap: 20,
  flexWrap:
    "wrap" as const,
};

const eyebrow = {
  margin: 0,
  color: "#00d9ff",
  fontSize: 13,
  fontWeight: 900,
  letterSpacing: ".15em",
};

const pageTitle = {
  margin: "7px 0 0",
  color: "#ff45d8",
  fontSize:
    "clamp(44px, 7vw, 64px)",
  letterSpacing: "-.035em",
  textShadow:
    "0 0 18px rgba(255,69,216,.22)",
};

const subtitle = {
  maxWidth: 840,
  margin: "12px 0 0",
  color: "#c1c1c9",
  fontSize: 18,
  lineHeight: 1.7,
};

const noticeBanner = {
  marginTop: 18,
  padding: "14px 16px",
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 12,
  border:
    "1px solid rgba(0,255,153,.45)",
  borderRadius: 12,
  background:
    "rgba(0,255,153,.08)",
  color: "#00ff99",
  fontSize: 16,
  fontWeight: 800,
};

const noticeClose = {
  border: 0,
  background:
    "transparent",
  color: "inherit",
  fontSize: 22,
  cursor: "pointer",
};

const statsGrid = {
  marginTop: 22,
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 15,
};

const statCard = {
  padding: 20,
  display: "grid",
  gap: 8,
  border: "1px solid",
  borderRadius: 16,
  background:
    "linear-gradient(145deg, rgba(12,12,17,.97), rgba(6,6,9,.98))",
};

const statLabel = {
  fontSize: 13,
  fontWeight: 900,
  letterSpacing: ".08em",
  textTransform:
    "uppercase" as const,
};

const statValue = {
  fontSize: 34,
};

const panel = {
  marginTop: 22,
  padding:
    "clamp(18px, 3vw, 24px)",
  border:
    "1px solid rgba(0,217,255,.32)",
  borderRadius: 18,
  background:
    "linear-gradient(145deg, rgba(8,8,12,.96), rgba(15,8,18,.94))",
  boxShadow:
    "0 0 20px rgba(0,217,255,.07)",
};

const panelHeader = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 14,
  flexWrap:
    "wrap" as const,
  marginBottom: 18,
};

const sectionEyebrow = {
  margin: 0,
  color: "#00d9ff",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: ".13em",
};

const sectionTitle = {
  margin: "5px 0 0",
  color: "#7df9ff",
  fontSize: 31,
};

const resultBadge = {
  padding: "7px 11px",
  border:
    "1px solid rgba(255,69,216,.44)",
  borderRadius: 999,
  background:
    "rgba(255,69,216,.07)",
  color: "#ff75df",
  fontSize: 13,
  fontWeight: 900,
};

const formGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
};

const field = {
  minWidth: 0,
  display: "grid",
  gap: 7,
};

const fieldLabel = {
  color: "#d0d0d7",
  fontSize: 14,
  fontWeight: 900,
};

const input = {
  width: "100%",
  minWidth: 0,
  minHeight: 54,
  boxSizing:
    "border-box" as const,
  padding: "14px 16px",
  border:
    "1px solid rgba(255,255,255,.16)",
  borderRadius: 10,
  background: "#050507",
  color: "#ffffff",
  fontSize: 16,
};

const createButton = {
  minHeight: 54,
  marginTop: 18,
  padding: "13px 18px",
  border:
    "1px solid #45d97a",
  borderRadius: 10,
  background:
    "linear-gradient(180deg, #2eea6f, #19b857)",
  color: "#ffffff",
  fontSize: 16,
  fontWeight: 900,
};

const toolbar = {
  display: "grid",
  gap: 14,
};

const searchInput = {
  width: "100%",
  minHeight: 54,
  boxSizing:
    "border-box" as const,
  padding: "14px 16px",
  border:
    "1px solid rgba(255,255,255,.16)",
  borderRadius: 10,
  background: "#050507",
  color: "#ffffff",
  fontSize: 16,
};

const filterRow = {
  display: "flex",
  gap: 10,
  flexWrap:
    "wrap" as const,
};

const filterButton = {
  minHeight: 46,
  padding: "11px 15px",
  border: "1px solid",
  borderRadius: 999,
  fontSize: 15,
  fontWeight: 900,
  cursor: "pointer",
};

const repGrid = {
  marginTop: 18,
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(min(100%, 360px), 1fr))",
  gap: 16,
};

const repCard = {
  padding: 18,
  display: "grid",
  gap: 18,
  border: "1px solid",
  borderRadius: 15,
  background:
    "rgba(0,0,0,.26)",
};

const repHeader = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems:
    "flex-start",
  gap: 12,
};

const repName = {
  color: "#ff75df",
  textDecoration: "none",
  fontSize: 24,
  fontWeight: 900,
};

const repEmail = {
  display: "block",
  marginTop: 5,
  color: "#9f9fa8",
  fontSize: 14,
  overflowWrap:
    "anywhere" as const,
};

const statusBadge = {
  flexShrink: 0,
  padding: "7px 10px",
  border: "1px solid",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 900,
};

const rateCard = {
  minHeight: 86,
  display: "grid",
  placeItems: "center",
  border:
    "1px solid rgba(0,217,255,.24)",
  borderRadius: 12,
  background:
    "rgba(0,217,255,.04)",
};

const rateValue = {
  color: "#7df9ff",
  fontSize: 31,
};

const metricsGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",
  gap: 10,
};

const metricCard = {
  padding: 13,
  display: "grid",
  gap: 5,
  border:
    "1px solid rgba(255,255,255,.08)",
  borderRadius: 10,
  background:
    "rgba(255,255,255,.025)",
};

const metricLabel = {
  color: "#8f8f98",
  fontSize: 11,
  fontWeight: 900,
  textTransform:
    "uppercase" as const,
};

const viewButton = {
  minHeight: 48,
  display: "grid",
  placeItems: "center",
  padding: "11px 15px",
  border:
    "1px solid rgba(0,217,255,.46)",
  borderRadius: 9,
  background:
    "rgba(0,217,255,.06)",
  color: "#7df9ff",
  textDecoration: "none",
  fontSize: 15,
  fontWeight: 900,
};

const emptyState = {
  marginTop: 18,
  padding: 28,
  display: "grid",
  justifyItems: "center",
  border:
    "1px dashed rgba(0,217,255,.28)",
  borderRadius: 12,
};

const muted = {
  color: "#a7a7af",
  fontSize: 16,
  lineHeight: 1.6,
};