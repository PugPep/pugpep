"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "../../../lib/supabaseClient";

const ADMIN_EMAIL =
  "pugpep99@gmail.com";

type Promo = {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  is_active: boolean;
};

export default function PromoManagerPage() {
  const supabase = useMemo(
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
    promos,
    setPromos,
  ] = useState<Promo[]>([]);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<
    "all" | "active" | "inactive"
  >("all");

  const [
    notice,
    setNotice,
  ] = useState("");

  const [
    creating,
    setCreating,
  ] = useState(false);

  const [
    busyPromoId,
    setBusyPromoId,
  ] = useState<string | null>(
    null
  );

  const [
    newPromo,
    setNewPromo,
  ] = useState({
    code: "",
    discount_type:
      "percent",
    discount_value: "",
  });

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const {
        data,
        error,
      } =
        await supabase.auth.getUser();

      if (cancelled) {
        return;
      }

      if (error) {
        console.error(
          "Admin verification failed:",
          error
        );
      }

      const email =
        data.user?.email;

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
      await loadPromos();

      if (!cancelled) {
        setLoading(false);
      }
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function loadPromos() {
    const {
      data,
      error,
    } =
      await supabase
        .from("promo_codes")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

    if (error) {
      alert(error.message);
      return;
    }

    setPromos(
      (data || []) as Promo[]
    );
  }

  async function createPromo() {
    if (creating) {
      return;
    }

    const code =
      newPromo.code
        .trim()
        .toUpperCase();

    const discountValue =
      Number(
        newPromo.discount_value
      );

    if (
      !code ||
      !Number.isFinite(
        discountValue
      ) ||
      discountValue <= 0
    ) {
      setNotice(
        "Enter a promo code and a discount greater than zero."
      );
      return;
    }

    if (
      newPromo.discount_type ===
        "percent" &&
      discountValue > 100
    ) {
      setNotice(
        "Percentage discounts cannot exceed 100%."
      );
      return;
    }

    setCreating(true);
    setNotice("");

    const {
      error,
    } =
      await supabase
        .from("promo_codes")
        .insert({
          code,
          discount_type:
            newPromo.discount_type,
          discount_value:
            discountValue,
          is_active: true,
        });

    setCreating(false);

    if (error) {
      setNotice(
        error.message
      );
      return;
    }

    setNewPromo({
      code: "",
      discount_type:
        "percent",
      discount_value: "",
    });

    setNotice(
      `Promo code ${code} created.`
    );

    await loadPromos();
  }

  async function togglePromo(
    id: string,
    active: boolean,
    code: string
  ) {
    if (busyPromoId) {
      return;
    }

    setBusyPromoId(id);
    setNotice("");

    const {
      error,
    } =
      await supabase
        .from("promo_codes")
        .update({
          is_active: !active,
        })
        .eq("id", id);

    setBusyPromoId(null);

    if (error) {
      setNotice(
        error.message
      );
      return;
    }

    setNotice(
      `${code} ${
        active
          ? "deactivated"
          : "activated"
      }.`
    );

    await loadPromos();
  }

  async function deletePromo(
    id: string,
    code: string
  ) {
    if (busyPromoId) {
      return;
    }

    const confirmed =
      window.confirm(
        `Delete promo code ${code}? This cannot be undone.`
      );

    if (!confirmed) {
      return;
    }

    setBusyPromoId(id);
    setNotice("");

    const {
      error,
    } =
      await supabase
        .from("promo_codes")
        .delete()
        .eq("id", id);

    setBusyPromoId(null);

    if (error) {
      setNotice(
        error.message
      );
      return;
    }

    setNotice(
      `${code} deleted.`
    );

    setPromos(
      (
        current
      ) =>
        current.filter(
          (
            promo
          ) =>
            promo.id !==
            id
        )
    );
  }

  const activeCount =
    promos.filter(
      (
        promo
      ) =>
        promo.is_active
    ).length;

  const inactiveCount =
    promos.length -
    activeCount;

  const percentCount =
    promos.filter(
      (
        promo
      ) =>
        promo.discount_type ===
        "percent"
    ).length;

  const fixedCount =
    promos.length -
    percentCount;

  const filteredPromos =
    promos.filter(
      (
        promo
      ) => {
        const query =
          search
            .trim()
            .toLowerCase();

        const matchesSearch =
          !query ||
          promo.code
            .toLowerCase()
            .includes(
              query
            ) ||
          promo.discount_type
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
            ? promo.is_active
            : !promo.is_active;

        return (
          matchesSearch &&
          matchesStatus
        );
      }
    );

  if (loading) {
    return (
      <main style={page}>
        <div style={centerCard}>
          <div style={loadingRing} />

          <h1 style={pageTitle}>
            Loading Promo Codes
          </h1>

          <p style={muted}>
            Preparing the promotion workspace...
          </p>
        </div>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main style={page}>
        <div style={centerCard}>
          <p style={eyebrow}>
            CONTROL CENTER
          </p>

          <h1 style={pageTitle}>
            Access Denied
          </h1>

          <p style={muted}>
            You must be logged in as the administrator.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main style={page}>
      <div style={container}>
        <header style={header}>
          <div>
            <p style={eyebrow}>
              CONTROL CENTER
            </p>

            <h1 style={pageTitle}>
              Promo Codes
            </h1>

            <p style={subtitle}>
              Create, activate, deactivate, search, and remove promotional codes.
            </p>
          </div>
        </header>

        {notice && (
          <div
            style={{
              ...noticeBanner,
              borderColor:
                notice
                  .toLowerCase()
                  .includes(
                    "enter"
                  ) ||
                notice
                  .toLowerCase()
                  .includes(
                    "cannot"
                  ) ||
                notice
                  .toLowerCase()
                  .includes(
                    "failed"
                  )
                  ? "rgba(255,111,111,.55)"
                  : "rgba(0,255,153,.48)",
              color:
                notice
                  .toLowerCase()
                  .includes(
                    "enter"
                  ) ||
                notice
                  .toLowerCase()
                  .includes(
                    "cannot"
                  ) ||
                notice
                  .toLowerCase()
                  .includes(
                    "failed"
                  )
                  ? "#ff8a8a"
                  : "#00ff99",
            }}
          >
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
            label="Total Codes"
            value={String(
              promos.length
            )}
            accent="#00d9ff"
          />

          <StatCard
            label="Active"
            value={String(
              activeCount
            )}
            accent="#00ff99"
          />

          <StatCard
            label="Inactive"
            value={String(
              inactiveCount
            )}
            accent="#ff6f6f"
          />

          <StatCard
            label="Percent Codes"
            value={String(
              percentCount
            )}
            accent="#ff75df"
          />

          <StatCard
            label="Fixed Codes"
            value={String(
              fixedCount
            )}
            accent="#ffcc00"
          />
        </section>

        <section style={panel}>
          <div style={panelHeader}>
            <div>
              <p style={sectionEyebrow}>
                CREATE
              </p>

              <h2 style={sectionTitle}>
                New Promo Code
              </h2>
            </div>
          </div>

          <div style={formGrid}>
            <label style={field}>
              <span style={fieldLabel}>
                Promo Code
              </span>

              <input
                value={
                  newPromo.code
                }
                onChange={(
                  event
                ) =>
                  setNewPromo({
                    ...newPromo,
                    code:
                      event.target.value.toUpperCase(),
                  })
                }
                placeholder="EXAMPLE20"
                style={input}
              />
            </label>

            <label style={field}>
              <span style={fieldLabel}>
                Discount Type
              </span>

              <select
                value={
                  newPromo.discount_type
                }
                onChange={(
                  event
                ) =>
                  setNewPromo({
                    ...newPromo,
                    discount_type:
                      event.target.value,
                  })
                }
                style={input}
              >
                <option value="percent">
                  Percent Off
                </option>

                <option value="fixed">
                  Fixed Dollar Amount
                </option>
              </select>
            </label>

            <label style={field}>
              <span style={fieldLabel}>
                Discount Value
              </span>

              <input
                type="number"
                min="0"
                step={
                  newPromo.discount_type ===
                  "percent"
                    ? "1"
                    : "0.01"
                }
                value={
                  newPromo.discount_value
                }
                onChange={(
                  event
                ) =>
                  setNewPromo({
                    ...newPromo,
                    discount_value:
                      event.target.value,
                  })
                }
                placeholder={
                  newPromo.discount_type ===
                  "percent"
                    ? "20"
                    : "10.00"
                }
                style={input}
              />
            </label>

            <button
              type="button"
              onClick={() => {
                void createPromo();
              }}
              disabled={creating}
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
            >
              {creating
                ? "Creating..."
                : "Create Promo Code"}
            </button>
          </div>
        </section>

        <section style={panel}>
          <div style={panelHeader}>
            <div>
              <p style={sectionEyebrow}>
                MANAGE
              </p>

              <h2 style={sectionTitle}>
                Current and Past Codes
              </h2>
            </div>

            <span style={resultBadge}>
              {
                filteredPromos.length
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
              placeholder="Search promo codes..."
              style={searchInput}
            />

            <div style={filterRow}>
              {[
                {
                  key: "all",
                  label: `All (${promos.length})`,
                },
                {
                  key: "active",
                  label: `Active (${activeCount})`,
                },
                {
                  key: "inactive",
                  label: `Inactive (${inactiveCount})`,
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

          {filteredPromos.length ===
          0 ? (
            <div style={emptyState}>
              <p style={muted}>
                No promo codes match this search or filter.
              </p>
            </div>
          ) : (
            <div style={promoGrid}>
              {filteredPromos.map(
                (
                  promo
                ) => {
                  const busy =
                    busyPromoId ===
                    promo.id;

                  return (
                    <article
                      key={
                        promo.id
                      }
                      style={{
                        ...promoCard,
                        borderColor:
                          promo.is_active
                            ? "rgba(0,255,153,.36)"
                            : "rgba(255,111,111,.28)",
                      }}
                    >
                      <div style={promoHeader}>
                        <div>
                          <p style={promoCode}>
                            {
                              promo.code
                            }
                          </p>

                          <span style={promoType}>
                            {promo.discount_type ===
                            "percent"
                              ? "Percentage Discount"
                              : "Fixed Discount"}
                          </span>
                        </div>

                        <span
                          style={{
                            ...statusBadge,
                            color:
                              promo.is_active
                                ? "#00ff99"
                                : "#ff7f7f",
                            borderColor:
                              promo.is_active
                                ? "rgba(0,255,153,.48)"
                                : "rgba(255,111,111,.48)",
                            background:
                              promo.is_active
                                ? "rgba(0,255,153,.08)"
                                : "rgba(255,111,111,.08)",
                          }}
                        >
                          {promo.is_active
                            ? "ACTIVE"
                            : "INACTIVE"}
                        </span>
                      </div>

                      <div style={discountValue}>
                        {promo.discount_type ===
                        "percent"
                          ? `${Number(
                              promo.discount_value ||
                                0
                            ).toFixed(
                              0
                            )}% OFF`
                          : `$${Number(
                              promo.discount_value ||
                                0
                            ).toFixed(
                              2
                            )} OFF`}
                      </div>

                      <div style={actionRow}>
                        <button
                          type="button"
                          onClick={() => {
                            void togglePromo(
                              promo.id,
                              promo.is_active,
                              promo.code
                            );
                          }}
                          disabled={
                            Boolean(
                              busyPromoId
                            )
                          }
                          style={{
                            ...(promo.is_active
                              ? deactivateButton
                              : activateButton),
                            opacity:
                              busy
                                ? 0.6
                                : 1,
                          }}
                        >
                          {busy
                            ? "Saving..."
                            : promo.is_active
                            ? "Deactivate"
                            : "Activate"}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            void deletePromo(
                              promo.id,
                              promo.code
                            );
                          }}
                          disabled={
                            Boolean(
                              busyPromoId
                            )
                          }
                          style={{
                            ...deleteButton,
                            opacity:
                              busy
                                ? 0.6
                                : 1,
                          }}
                        >
                          {busy
                            ? "Working..."
                            : "Delete"}
                        </button>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </section>
      </div>
    </main>
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
  maxWidth: 1320,
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
  maxWidth: 800,
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
  border: "1px solid",
  borderRadius: 12,
  background:
    "rgba(255,255,255,.04)",
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
  alignItems: "end",
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

const promoGrid = {
  marginTop: 18,
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
  gap: 16,
};

const promoCard = {
  padding: 18,
  display: "grid",
  gap: 18,
  border: "1px solid",
  borderRadius: 15,
  background:
    "rgba(0,0,0,.26)",
};

const promoHeader = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems:
    "flex-start",
  gap: 12,
};

const promoCode = {
  margin: 0,
  color: "#ff75df",
  fontSize: 24,
  fontWeight: 900,
  letterSpacing: ".04em",
  overflowWrap:
    "anywhere" as const,
};

const promoType = {
  display: "block",
  marginTop: 5,
  color: "#9f9fa8",
  fontSize: 14,
};

const statusBadge = {
  flexShrink: 0,
  padding: "7px 10px",
  border: "1px solid",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 900,
};

const discountValue = {
  minHeight: 74,
  display: "grid",
  placeItems: "center",
  border:
    "1px solid rgba(0,217,255,.24)",
  borderRadius: 12,
  background:
    "rgba(0,217,255,.04)",
  color: "#7df9ff",
  fontSize: 30,
  fontWeight: 900,
};

const actionRow = {
  display: "flex",
  gap: 10,
  flexWrap:
    "wrap" as const,
};

const activateButton = {
  minHeight: 46,
  padding: "11px 15px",
  border:
    "1px solid rgba(0,255,153,.50)",
  borderRadius: 9,
  background:
    "rgba(0,255,153,.07)",
  color: "#00ff99",
  fontSize: 15,
  fontWeight: 900,
  cursor: "pointer",
};

const deactivateButton = {
  minHeight: 46,
  padding: "11px 15px",
  border:
    "1px solid rgba(255,204,0,.50)",
  borderRadius: 9,
  background:
    "rgba(255,204,0,.07)",
  color: "#ffcc00",
  fontSize: 15,
  fontWeight: 900,
  cursor: "pointer",
};

const deleteButton = {
  minHeight: 46,
  padding: "11px 15px",
  border:
    "1px solid rgba(255,93,93,.56)",
  borderRadius: 9,
  background:
    "rgba(255,93,93,.07)",
  color: "#ff8585",
  fontSize: 15,
  fontWeight: 900,
  cursor: "pointer",
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

const centerCard = {
  maxWidth: 560,
  margin: "10vh auto 0",
  padding: 32,
  display: "grid",
  justifyItems: "center",
  gap: 12,
  textAlign:
    "center" as const,
  border:
    "1px solid rgba(0,217,255,.38)",
  borderRadius: 17,
  background:
    "rgba(8,8,12,.92)",
};

const loadingRing = {
  width: 46,
  height: 46,
  border:
    "4px solid rgba(0,217,255,.18)",
  borderTopColor:
    "#ff45d8",
  borderRadius: 999,
};