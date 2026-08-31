"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../../lib/supabaseClient";


type NexusRow = {
  state_code: string;
  state_name: string;
  has_general_sales_tax: boolean;
  sales_threshold: number | null;
  transaction_threshold: number | null;
  threshold_operator: string;
  measurement_period: string;
  measurement_start: string | null;
  measurement_end: string | null;
  qualifying_sales: number;
  qualifying_transactions: number;
  revenue: number;
  cost: number;
  profit: number;
  margin_percent: number;
  sales_tax_collected: number;
  sales_progress_percent: number;
  transaction_progress_percent: number;
  overall_progress_percent: number;
  remaining_sales: number | null;
  threshold_met: boolean;
  nexus_status: string;
  registered_to_collect: boolean;
  tax_collection_enabled: boolean;
  auto_enable_when_registered_and_threshold_met: boolean;
  effective_tax_collection: boolean;
  notes: string | null;
  source_label: string | null;
  last_verified_on: string | null;
};

type Draft = {
  sales_threshold: string;
  transaction_threshold: string;
  threshold_operator: string;
  measurement_period: string;
  registered_to_collect: boolean;
  tax_collection_enabled: boolean;
  auto_enable_when_registered_and_threshold_met: boolean;
  notes: string;
};

function money(value: unknown) {
  const number = Number(value);
  return `$${(Number.isFinite(number) ? number : 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function numberValue(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function statusColor(row: NexusRow) {
  if (row.effective_tax_collection) return "#00ff99";
  if (row.threshold_met) return "#ff6f6f";
  if (row.nexus_status === "critical") return "#ff8a5b";
  if (row.nexus_status === "near") return "#ffcc00";
  if (row.nexus_status === "no-general-sales-tax") return "#9ea7ff";
  return "#7df9ff";
}

function statusLabel(row: NexusRow) {
  if (row.effective_tax_collection) return "TAX COLLECTION ACTIVE";
  if (row.threshold_met) return "THRESHOLD PASSED · REVIEW";
  if (row.nexus_status === "critical") return "CRITICAL · 90–99.99%";
  if (row.nexus_status === "near") return "NEAR · 75–89.99%";
  if (row.nexus_status === "no-general-sales-tax") {
    return "NO GENERAL STATE SALES TAX";
  }
  return "SAFE · UNDER 75%";
}

function periodLabel(value: string) {
  const labels: Record<string, string> = {
    current_or_previous_calendar_year: "Current or Previous Calendar Year",
    previous_calendar_year: "Previous Calendar Year",
    rolling_12_months: "Rolling 12 Months",
    four_completed_quarters: "Four Completed Quarters",
    twelve_months_ending_sep30: "12 Months Ending Sep. 30",
    seller_fiscal_year: "Seller Fiscal Year",
    none: "Not Applicable",
  };

  return labels[value] || value;
}

export default function AdminNexusPage() {
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [rows, setRows] = useState<NexusRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("attention");
  const [editingState, setEditingState] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [savingState, setSavingState] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  async function loadNexus() {
    const { data, error } = await supabase.rpc(
      "admin_get_state_nexus_summary"
    );

    if (error) {
      setNotice(error.message);
      setRows([]);
      return;
    }

    setRows((data || []) as NexusRow[]);
  }

  useEffect(() => {
    async function init() {
      const { data, error } = await supabase.auth.getUser();
            const {
              data: adminAccess,
              error: adminAccessError,
            } = await supabase.rpc("is_pugpep_admin");

            if (adminAccessError || !adminAccess) {
              setAuthorized(false);
              setLoading(false);
              return;
            }

            setAuthorized(true);
      await loadNexus();
      setLoading(false);
    }

    void init();
  }, [supabase]);

  const filteredRows = rows.filter((row) => {
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      row.state_code.toLowerCase().includes(query) ||
      row.state_name.toLowerCase().includes(query);

    if (!matchesSearch) return false;

    if (statusFilter === "all") return true;
    if (statusFilter === "safe") return row.nexus_status === "safe";
    if (statusFilter === "near") return row.nexus_status === "near";
    if (statusFilter === "critical") return row.nexus_status === "critical";
    if (statusFilter === "passed") return row.threshold_met;
    if (statusFilter === "tax_active") return row.effective_tax_collection;
    if (statusFilter === "review") {
      return row.threshold_met && !row.effective_tax_collection;
    }
    if (statusFilter === "attention") {
      return (
        row.threshold_met ||
        row.nexus_status === "critical" ||
        row.nexus_status === "near"
      );
    }

    return true;
  });

  const nearCount = rows.filter((row) => row.nexus_status === "near").length;
  const criticalCount = rows.filter(
    (row) => row.nexus_status === "critical"
  ).length;
  const passedCount = rows.filter((row) => row.threshold_met).length;
  const activeCount = rows.filter(
    (row) => row.effective_tax_collection
  ).length;
  const totalTax = rows.reduce(
    (sum, row) => sum + numberValue(row.sales_tax_collected),
    0
  );

  function startEdit(row: NexusRow) {
    setEditingState(row.state_code);
    setDraft({
      sales_threshold:
        row.sales_threshold == null ? "" : String(row.sales_threshold),
      transaction_threshold:
        row.transaction_threshold == null
          ? ""
          : String(row.transaction_threshold),
      threshold_operator: row.threshold_operator,
      measurement_period: row.measurement_period,
      registered_to_collect: Boolean(row.registered_to_collect),
      tax_collection_enabled: Boolean(row.tax_collection_enabled),
      auto_enable_when_registered_and_threshold_met: Boolean(
        row.auto_enable_when_registered_and_threshold_met
      ),
      notes: row.notes || "",
    });
    setNotice("");
  }

  function cancelEdit() {
    setEditingState(null);
    setDraft(null);
  }

  async function saveState(stateCode: string) {
    if (!draft || savingState) return;

    const threshold =
      draft.sales_threshold.trim() === ""
        ? null
        : Number(draft.sales_threshold);

    const transactions =
      draft.transaction_threshold.trim() === ""
        ? null
        : Math.max(0, Math.floor(Number(draft.transaction_threshold)));

    if (
      threshold != null &&
      (!Number.isFinite(threshold) || threshold < 0)
    ) {
      setNotice("Sales threshold must be zero or greater.");
      return;
    }

    setSavingState(stateCode);
    setNotice("");

    const { error } = await supabase.rpc(
      "admin_update_state_nexus_setting",
      {
        p_state_code: stateCode,
        p_sales_threshold: threshold,
        p_transaction_threshold: transactions,
        p_threshold_operator: draft.threshold_operator,
        p_measurement_period: draft.measurement_period,
        p_registered_to_collect: draft.registered_to_collect,
        p_tax_collection_enabled: draft.tax_collection_enabled,
        p_auto_enable_when_registered_and_threshold_met:
          draft.auto_enable_when_registered_and_threshold_met,
        p_notes: draft.notes.trim() || null,
      }
    );

    setSavingState(null);

    if (error) {
      setNotice(error.message);
      return;
    }

    setNotice(`${stateCode} nexus configuration saved.`);
    cancelEdit();
    await loadNexus();
  }

  if (loading) {
    return <main style={page}>Loading state nexus monitor...</main>;
  }

  if (!authorized) {
    return (
      <main style={page}>
        <h1 style={{ color: "#ff45d8" }}>Access Denied</h1>
        <p>You must be logged in as admin.</p>
      </main>
    );
  }

  return (
    <main style={page}>
      <div style={container}>
        <header style={header}>
          <div>
            <p style={eyebrow}>PUGPEP ADMIN · TAX OPERATIONS</p>
            <h1 style={title}>State Nexus Monitor</h1>
            <p style={subtitle}>
              Track economic-nexus exposure from paid orders by their current
              delivery state. Historical sales tax remains tied to the tax
              snapshot that was collected on each order.
            </p>
          </div>

          <div style={headerLinks}>
            <Link href="/admin" style={secondaryLink}>
              Orders
            </Link>
            <Link href="/admin/dashboard" style={secondaryLink}>
              Dashboard
            </Link>
          </div>
        </header>

        <div style={complianceNote}>
          <strong style={{ color: "#ffcc00" }}>
            Operational nexus monitor
          </strong>
          <span>
            Threshold rules, measurement periods, taxable-sales definitions,
            marketplace treatment and registration timing can change. Keep
            these settings verified with your tax professional/state guidance.
            The site only collects tax in states where the state configuration
            is effectively enabled.
          </span>
        </div>

        {notice && (
          <div style={noticeBox}>
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice("")}
              style={noticeClose}
            >
              ×
            </button>
          </div>
        )}

        <section style={kpiGrid}>
          <Kpi label="Near Threshold" value={nearCount} accent="#ffcc00" />
          <Kpi label="Critical" value={criticalCount} accent="#ff8a5b" />
          <Kpi label="Threshold Passed" value={passedCount} accent="#ff6f6f" />
          <Kpi label="Tax Active" value={activeCount} accent="#00ff99" />
          <Kpi
            label="Historical Tax Collected"
            value={money(totalTax)}
            accent="#00d9ff"
          />
        </section>

        <section style={toolbar}>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search state or abbreviation..."
            style={input}
          />

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            style={input}
          >
            <option value="attention">Needs Attention</option>
            <option value="all">All States</option>
            <option value="safe">Safe · under 75%</option>
            <option value="near">Near · 75–89.99%</option>
            <option value="critical">Critical · 90–99.99%</option>
            <option value="passed">Threshold Passed</option>
            <option value="review">Passed · Review Required</option>
            <option value="tax_active">Tax Collection Active</option>
          </select>

          <button
            type="button"
            onClick={() => void loadNexus()}
            style={primaryButton}
          >
            Refresh
          </button>
        </section>

        {filteredRows.length === 0 ? (
          <section style={panel}>
            <p style={muted}>No states match the current filter.</p>
          </section>
        ) : (
          <div style={stateGrid}>
            {filteredRows.map((row) => {
              const color = statusColor(row);
              const progress = Math.min(
                100,
                Math.max(0, numberValue(row.overall_progress_percent))
              );
              const isEditing = editingState === row.state_code;

              return (
                <article
                  key={row.state_code}
                  style={{
                    ...stateCard,
                    borderColor: `${color}55`,
                  }}
                >
                  <div style={stateHeader}>
                    <div>
                      <span style={{ ...statusPill, color, borderColor: `${color}66` }}>
                        {statusLabel(row)}
                      </span>
                      <h2 style={stateTitle}>
                        {row.state_code} · {row.state_name}
                      </h2>
                    </div>

                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => startEdit(row)}
                        style={secondaryButton}
                      >
                        Edit Rules
                      </button>
                    )}
                  </div>

                  <div style={progressHeader}>
                    <span>
                      {money(row.qualifying_sales)} qualifying sales
                    </span>
                    <strong style={{ color }}>
                      {numberValue(row.overall_progress_percent).toFixed(1)}%
                    </strong>
                  </div>

                  <div style={progressTrack}>
                    <div
                      style={{
                        ...progressFill,
                        width: `${progress}%`,
                        background: color,
                      }}
                    />
                  </div>

                  <div style={metricsGrid}>
                    <Metric
                      label="Sales Threshold"
                      value={
                        row.sales_threshold == null
                          ? "N/A"
                          : money(row.sales_threshold)
                      }
                    />
                    <Metric
                      label="Transactions"
                      value={
                        row.transaction_threshold == null
                          ? `${row.qualifying_transactions}`
                          : `${row.qualifying_transactions} / ${row.transaction_threshold}`
                      }
                    />
                    <Metric label="Revenue" value={money(row.revenue)} />
                    <Metric label="Cost" value={money(row.cost)} />
                    <Metric
                      label="Profit"
                      value={money(row.profit)}
                      accent={row.profit >= 0 ? "#00ff99" : "#ff6f6f"}
                    />
                    <Metric
                      label="Margin"
                      value={`${numberValue(row.margin_percent).toFixed(1)}%`}
                    />
                    <Metric
                      label="Sales Tax Collected"
                      value={money(row.sales_tax_collected)}
                      accent="#00d9ff"
                    />
                    <Metric
                      label="Remaining"
                      value={
                        row.remaining_sales == null
                          ? "N/A"
                          : row.remaining_sales <= 0
                          ? "Threshold reached"
                          : money(row.remaining_sales)
                      }
                    />
                  </div>

                  <div style={detailStrip}>
                    <span>
                      <strong>Measurement:</strong>{" "}
                      {periodLabel(row.measurement_period)}
                    </span>
                    <span>
                      <strong>Window:</strong>{" "}
                      {row.measurement_start || "—"} →{" "}
                      {row.measurement_end || "—"}
                    </span>
                    <span>
                      <strong>Registered:</strong>{" "}
                      {row.registered_to_collect ? "Yes" : "No"}
                    </span>
                    <span>
                      <strong>Tax Active:</strong>{" "}
                      {row.effective_tax_collection ? "Yes" : "No"}
                    </span>
                  </div>

                  {row.notes && !isEditing && (
                    <p style={notes}>{row.notes}</p>
                  )}

                  {isEditing && draft && (
                    <div style={editPanel}>
                      <div style={editGrid}>
                        <Field label="Sales Threshold">
                          <input
                            type="number"
                            min="0"
                            value={draft.sales_threshold}
                            onChange={(event) =>
                              setDraft({
                                ...draft,
                                sales_threshold: event.target.value,
                              })
                            }
                            style={input}
                          />
                        </Field>

                        <Field label="Transaction Threshold">
                          <input
                            type="number"
                            min="0"
                            value={draft.transaction_threshold}
                            onChange={(event) =>
                              setDraft({
                                ...draft,
                                transaction_threshold: event.target.value,
                              })
                            }
                            style={input}
                            placeholder="Blank = none"
                          />
                        </Field>

                        <Field label="Threshold Test">
                          <select
                            value={draft.threshold_operator}
                            onChange={(event) =>
                              setDraft({
                                ...draft,
                                threshold_operator: event.target.value,
                              })
                            }
                            style={input}
                          >
                            <option value="sales_only">Sales Only</option>
                            <option value="sales_or_transactions">
                              Sales OR Transactions
                            </option>
                            <option value="sales_and_transactions">
                              Sales AND Transactions
                            </option>
                            <option value="none">None</option>
                          </select>
                        </Field>

                        <Field label="Measurement Period">
                          <select
                            value={draft.measurement_period}
                            onChange={(event) =>
                              setDraft({
                                ...draft,
                                measurement_period: event.target.value,
                              })
                            }
                            style={input}
                          >
                            <option value="current_or_previous_calendar_year">
                              Current or Previous Calendar Year
                            </option>
                            <option value="previous_calendar_year">
                              Previous Calendar Year
                            </option>
                            <option value="rolling_12_months">
                              Rolling 12 Months
                            </option>
                            <option value="four_completed_quarters">
                              Four Completed Quarters
                            </option>
                            <option value="twelve_months_ending_sep30">
                              12 Months Ending Sep. 30
                            </option>
                            <option value="seller_fiscal_year">
                              Seller Fiscal Year
                            </option>
                            <option value="none">Not Applicable</option>
                          </select>
                        </Field>
                      </div>

                      <div style={toggleGrid}>
                        <Toggle
                          checked={draft.registered_to_collect}
                          onChange={(checked) =>
                            setDraft({
                              ...draft,
                              registered_to_collect: checked,
                            })
                          }
                          title="Registered to Collect"
                          text="Mark only after registration/authority to collect is established."
                        />

                        <Toggle
                          checked={draft.tax_collection_enabled}
                          onChange={(checked) =>
                            setDraft({
                              ...draft,
                              tax_collection_enabled: checked,
                            })
                          }
                          title="Manual Tax Collection Override"
                          text="Explicitly turns tax collection on for this state."
                        />

                        <Toggle
                          checked={
                            draft.auto_enable_when_registered_and_threshold_met
                          }
                          onChange={(checked) =>
                            setDraft({
                              ...draft,
                              auto_enable_when_registered_and_threshold_met:
                                checked,
                            })
                          }
                          title="Auto Enable After Threshold"
                          text="Requires both threshold met and Registered to Collect."
                        />
                      </div>

                      <Field label="Admin Notes">
                        <textarea
                          rows={4}
                          value={draft.notes}
                          onChange={(event) =>
                            setDraft({
                              ...draft,
                              notes: event.target.value,
                            })
                          }
                          style={{ ...input, resize: "vertical" }}
                        />
                      </Field>

                      <div style={actionRow}>
                        <button
                          type="button"
                          onClick={() => void saveState(row.state_code)}
                          disabled={savingState === row.state_code}
                          style={primaryButton}
                        >
                          {savingState === row.state_code
                            ? "Saving..."
                            : "Save State Rules"}
                        </button>

                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={savingState === row.state_code}
                          style={secondaryButton}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  <div style={sourceLine}>
                    Last verified: {row.last_verified_on || "Not recorded"}
                    {row.source_label ? ` · ${row.source_label}` : ""}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

function Kpi({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <div style={{ ...kpiCard, borderColor: `${accent}44` }}>
      <span style={{ ...kpiLabel, color: accent }}>{label}</span>
      <strong style={kpiValue}>{value}</strong>
    </div>
  );
}

function Metric({
  label,
  value,
  accent = "#fff",
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div style={metric}>
      <span style={metricLabel}>{label}</span>
      <strong style={{ color: accent }}>{value}</strong>
    </div>
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
      <span style={fieldLabel}>{label}</span>
      {children}
    </label>
  );
}

function Toggle({
  checked,
  onChange,
  title,
  text,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  text: string;
}) {
  return (
    <label style={toggle}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        <strong style={{ display: "block", color: "#fff" }}>{title}</strong>
        <small style={{ display: "block", marginTop: 3, color: "#8f8f98" }}>
          {text}
        </small>
      </span>
    </label>
  );
}

const page = {
  minHeight: "100vh",
  padding: "clamp(18px,4vw,34px)",
  background:
    "radial-gradient(circle at 10% 0%, rgba(255,69,216,.10), transparent 30%), radial-gradient(circle at 90% 0%, rgba(0,217,255,.10), transparent 34%), #000",
  color: "#fff",
};

const container = {
  width: "100%",
  maxWidth: 1480,
  margin: "0 auto",
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 20,
  flexWrap: "wrap" as const,
};

const eyebrow = {
  margin: 0,
  color: "#00d9ff",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: ".15em",
};

const title = {
  margin: "7px 0 0",
  color: "#ff45d8",
  fontSize: "clamp(38px,6vw,62px)",
  lineHeight: 1,
  letterSpacing: "-.035em",
};

const subtitle = {
  maxWidth: 850,
  margin: "13px 0 0",
  color: "#a9a9b2",
  lineHeight: 1.65,
};

const headerLinks = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap" as const,
};

const primaryButton = {
  border: "1px solid rgba(0,255,153,.55)",
  borderRadius: 10,
  padding: "11px 14px",
  background: "rgba(0,255,153,.10)",
  color: "#00ff99",
  fontWeight: 900,
  cursor: "pointer",
};

const secondaryButton = {
  border: "1px solid rgba(255,255,255,.16)",
  borderRadius: 10,
  padding: "10px 13px",
  background: "rgba(255,255,255,.04)",
  color: "#ddd",
  fontWeight: 800,
  cursor: "pointer",
};

const secondaryLink = {
  ...secondaryButton,
  textDecoration: "none",
};

const complianceNote = {
  marginTop: 22,
  padding: 14,
  border: "1px solid rgba(255,204,0,.28)",
  borderRadius: 12,
  background: "rgba(255,204,0,.045)",
  display: "grid",
  gap: 5,
  color: "#c8c0a2",
  fontSize: 13,
  lineHeight: 1.55,
};

const noticeBox = {
  marginTop: 16,
  padding: 12,
  border: "1px solid rgba(0,217,255,.28)",
  borderRadius: 10,
  background: "rgba(0,217,255,.05)",
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  color: "#c8f5ff",
};

const noticeClose = {
  border: 0,
  background: "transparent",
  color: "#fff",
  cursor: "pointer",
  fontSize: 20,
};

const kpiGrid = {
  marginTop: 20,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
};

const kpiCard = {
  padding: 15,
  border: "1px solid rgba(255,255,255,.12)",
  borderRadius: 12,
  background: "rgba(255,255,255,.025)",
};

const kpiLabel = {
  display: "block",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: ".08em",
  textTransform: "uppercase" as const,
};

const kpiValue = {
  display: "block",
  marginTop: 7,
  fontSize: 25,
};

const toolbar = {
  marginTop: 18,
  display: "grid",
  gridTemplateColumns: "minmax(220px,1fr) minmax(220px,.65fr) auto",
  gap: 10,
  padding: 14,
  border: "1px solid rgba(255,255,255,.11)",
  borderRadius: 12,
  background: "rgba(255,255,255,.025)",
};

const input = {
  width: "100%",
  boxSizing: "border-box" as const,
  minHeight: 44,
  padding: "10px 12px",
  border: "1px solid rgba(255,255,255,.15)",
  borderRadius: 9,
  background: "#070707",
  color: "#fff",
  fontSize: 16,
};

const panel = {
  marginTop: 18,
  padding: 18,
  border: "1px solid rgba(255,255,255,.11)",
  borderRadius: 12,
  background: "rgba(255,255,255,.025)",
};

const stateGrid = {
  marginTop: 18,
  display: "grid",
  gap: 14,
};

const stateCard = {
  padding: 18,
  border: "1px solid rgba(255,255,255,.12)",
  borderRadius: 14,
  background:
    "linear-gradient(180deg, rgba(255,255,255,.035), rgba(255,255,255,.018))",
};

const stateHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 14,
  flexWrap: "wrap" as const,
};

const statusPill = {
  display: "inline-block",
  padding: "4px 8px",
  border: "1px solid",
  borderRadius: 999,
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: ".07em",
};

const stateTitle = {
  margin: "9px 0 0",
  fontSize: 23,
};

const progressHeader = {
  marginTop: 16,
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  color: "#b8b8c0",
  fontSize: 13,
};

const progressTrack = {
  height: 9,
  marginTop: 7,
  overflow: "hidden",
  borderRadius: 999,
  background: "rgba(255,255,255,.07)",
};

const progressFill = {
  height: "100%",
  borderRadius: 999,
};

const metricsGrid = {
  marginTop: 15,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 9,
};

const metric = {
  padding: 10,
  border: "1px solid rgba(255,255,255,.08)",
  borderRadius: 9,
  background: "rgba(0,0,0,.24)",
};

const metricLabel = {
  display: "block",
  marginBottom: 4,
  color: "#777f89",
  fontSize: 10,
  fontWeight: 900,
  textTransform: "uppercase" as const,
};

const detailStrip = {
  marginTop: 13,
  display: "flex",
  gap: 14,
  flexWrap: "wrap" as const,
  color: "#8f8f98",
  fontSize: 12,
};

const notes = {
  margin: "12px 0 0",
  color: "#c8c8ce",
  lineHeight: 1.55,
};

const editPanel = {
  marginTop: 16,
  padding: 15,
  border: "1px solid rgba(255,69,216,.25)",
  borderRadius: 12,
  background: "rgba(255,69,216,.035)",
};

const editGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px,1fr))",
  gap: 12,
};

const toggleGrid = {
  marginTop: 14,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px,1fr))",
  gap: 10,
};

const toggle = {
  display: "flex",
  gap: 10,
  alignItems: "flex-start",
  padding: 11,
  border: "1px solid rgba(255,255,255,.10)",
  borderRadius: 10,
  background: "rgba(255,255,255,.025)",
};

const field = {
  display: "grid",
  gap: 6,
};

const fieldLabel = {
  color: "#a7a7ae",
  fontSize: 11,
  fontWeight: 900,
  textTransform: "uppercase" as const,
};

const actionRow = {
  marginTop: 14,
  display: "flex",
  gap: 10,
  flexWrap: "wrap" as const,
};

const sourceLine = {
  marginTop: 13,
  paddingTop: 10,
  borderTop: "1px solid rgba(255,255,255,.07)",
  color: "#666e78",
  fontSize: 10,
};

const muted = {
  color: "#8f8f98",
};