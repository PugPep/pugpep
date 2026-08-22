"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import QRCode from "qrcode";

import { createClient } from "../../../lib/supabaseClient";

const ADMIN_EMAIL =
  "pugpep99@gmail.com";

type PromoUsageType =
  | "continuous"
  | "once_per_customer"
  | "single_use_total";

type Promo = {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  usage_type: PromoUsageType;
  minimum_spend: number | null;
  exclude_sale_items: boolean;
  is_active: boolean;
};

type PromoRedemption = {
  promo_code_id: string;
};

type PromoEditForm = {
  id: string;
  originalCode: string;
  code: string;
  discount_type: string;
  discount_value: string;
  usage_type: PromoUsageType;
  minimum_spend: string;
  exclude_sale_items: boolean;
  is_active: boolean;
};

function usageLabel(
  usageType: PromoUsageType
) {
  if (
    usageType ===
    "once_per_customer"
  ) {
    return "Once Per Customer";
  }

  if (
    usageType ===
    "single_use_total"
  ) {
    return "Single Use Total";
  }

  return "Continuous";
}

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
    redemptionCounts,
    setRedemptionCounts,
  ] = useState<
    Record<string, number>
  >({});

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
    editingPromo,
    setEditingPromo,
  ] = useState<PromoEditForm | null>(
    null
  );

  const [
    savingEdit,
    setSavingEdit,
  ] = useState(false);

  const [
    qrPromo,
    setQrPromo,
  ] = useState<Promo | null>(
    null
  );

  const [
    qrDataUrl,
    setQrDataUrl,
  ] = useState("");

  const [
    qrLoading,
    setQrLoading,
  ] = useState(false);

  const [
    newPromo,
    setNewPromo,
  ] = useState<{
    code: string;
    discount_type: string;
    discount_value: string;
    usage_type: PromoUsageType;
    minimum_spend: string;
    exclude_sale_items: boolean;
  }>({
    code: "",
    discount_type:
      "percent",
    discount_value: "",
    usage_type:
      "continuous",
    minimum_spend: "",
    exclude_sale_items: false,
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
    const [
      promoResult,
      redemptionResult,
    ] =
      await Promise.all([
        supabase
          .from("promo_codes")
          .select("*")
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from(
            "promo_code_redemptions"
          )
          .select(
            "promo_code_id"
          ),
      ]);

    if (promoResult.error) {
      alert(
        promoResult.error.message
      );
      return;
    }

    if (
      redemptionResult.error
    ) {
      console.error(
        "Unable to load promo redemption counts:",
        redemptionResult.error
      );
    }

    setPromos(
      (promoResult.data ||
        []) as Promo[]
    );

    const counts:
      Record<string, number> = {};

    (
      (redemptionResult.data ||
        []) as PromoRedemption[]
    ).forEach(
      (redemption) => {
        counts[
          redemption.promo_code_id
        ] =
          (counts[
            redemption.promo_code_id
          ] || 0) + 1;
      }
    );

    setRedemptionCounts(
      counts
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

    const minimumSpend =
      newPromo.minimum_spend.trim()
        ? Number(
            newPromo.minimum_spend
          )
        : 0;

    if (
      !Number.isFinite(
        minimumSpend
      ) ||
      minimumSpend < 0
    ) {
      setNotice(
        "Minimum spend must be zero or a positive dollar amount."
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
          usage_type:
            newPromo.usage_type,
          minimum_spend:
            minimumSpend > 0
              ? minimumSpend
              : null,
          exclude_sale_items:
            newPromo.exclude_sale_items,
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
      usage_type:
        "continuous",
      minimum_spend: "",
      exclude_sale_items: false,
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

  async function updateUsageType(
    id: string,
    usageType: PromoUsageType,
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
          usage_type:
            usageType,
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
      `${code} usage changed to ${usageLabel(
        usageType
      )}.`
    );

    await loadPromos();
  }

  function openEditPromo(
    promo: Promo
  ) {
    setEditingPromo({
      id: promo.id,
      originalCode: promo.code,
      code: promo.code,
      discount_type:
        promo.discount_type,
      discount_value:
        String(
          promo.discount_value
        ),
      usage_type:
        promo.usage_type,
      minimum_spend:
        promo.minimum_spend &&
        Number(
          promo.minimum_spend
        ) > 0
          ? String(
              promo.minimum_spend
            )
          : "",
      exclude_sale_items:
        Boolean(
          promo.exclude_sale_items
        ),
      is_active:
        promo.is_active,
    });
  }

  async function savePromoEdit() {
    if (
      !editingPromo ||
      savingEdit
    ) {
      return;
    }

    const code =
      editingPromo.code
        .trim()
        .toUpperCase();

    const discountValue =
      Number(
        editingPromo.discount_value
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

    const minimumSpend =
      editingPromo.minimum_spend.trim()
        ? Number(
            editingPromo.minimum_spend
          )
        : 0;

    if (
      !Number.isFinite(
        minimumSpend
      ) ||
      minimumSpend < 0
    ) {
      setNotice(
        "Minimum spend must be zero or a positive dollar amount."
      );
      return;
    }

    if (
      editingPromo.discount_type ===
        "percent" &&
      discountValue > 100
    ) {
      setNotice(
        "Percentage discounts cannot exceed 100%."
      );
      return;
    }

    const redemptionCount =
      redemptionCounts[
        editingPromo.id
      ] || 0;

    if (
      redemptionCount > 0 &&
      code !==
        editingPromo.originalCode
    ) {
      setNotice(
        "The promo code itself cannot be renamed after it has redemptions. You can still edit its discount, usage rule, and active status."
      );
      return;
    }

    setSavingEdit(true);
    setNotice("");

    const {
      error,
    } =
      await supabase
        .from("promo_codes")
        .update({
          code,
          discount_type:
            editingPromo.discount_type,
          discount_value:
            discountValue,
          usage_type:
            editingPromo.usage_type,
          minimum_spend:
            minimumSpend > 0
              ? minimumSpend
              : null,
          exclude_sale_items:
            editingPromo.exclude_sale_items,
          is_active:
            editingPromo.is_active,
        })
        .eq(
          "id",
          editingPromo.id
        );

    setSavingEdit(false);

    if (error) {
      setNotice(
        error.message
      );
      return;
    }

    setNotice(
      `${code} updated.`
    );

    setEditingPromo(null);

    await loadPromos();
  }

  async function openPromoQr(
    promo: Promo
  ) {
    setQrPromo(promo);
    setQrDataUrl("");
    setQrLoading(true);

    try {
      const promoUrl =
        `https://pugpep.com/promo/${encodeURIComponent(
          promo.code
        )}`;

      const dataUrl =
        await QRCode.toDataURL(
          promoUrl,
          {
            width: 720,
            margin: 2,
            errorCorrectionLevel:
              "H",
          }
        );

      setQrDataUrl(
        dataUrl
      );
    } catch (error) {
      console.error(
        "Promo QR generation failed:",
        error
      );

      setNotice(
        "Unable to generate the promo QR code."
      );
    } finally {
      setQrLoading(false);
    }
  }

  function downloadPromoQr() {
    if (
      !qrPromo ||
      !qrDataUrl
    ) {
      return;
    }

    const anchor =
      document.createElement(
        "a"
      );

    anchor.href =
      qrDataUrl;

    anchor.download =
      `PugPep-${qrPromo.code}-QR.png`;

    document.body.appendChild(
      anchor
    );

    anchor.click();
    anchor.remove();
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
            ) ||
          usageLabel(
            promo.usage_type
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

            <label style={field}>
              <span style={fieldLabel}>
                Usage Type
              </span>

              <select
                value={
                  newPromo.usage_type
                }
                onChange={(
                  event
                ) =>
                  setNewPromo({
                    ...newPromo,
                    usage_type:
                      event.target
                        .value as PromoUsageType,
                  })
                }
                style={input}
              >
                <option value="continuous">
                  Continuous
                </option>

                <option value="once_per_customer">
                  Single Use Per Customer
                </option>

                <option value="single_use_total">
                  Single Use Total
                </option>
              </select>

            </label>

            <label style={field}>
              <span style={fieldLabel}>
                Minimum Spend
              </span>

              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  newPromo.minimum_spend
                }
                onChange={(
                  event
                ) =>
                  setNewPromo({
                    ...newPromo,
                    minimum_spend:
                      event.target.value,
                  })
                }
                placeholder="Optional — e.g. 100.00"
                style={input}
              />
            </label>

            <label style={toggleFieldCompact}>
              <span>
                <strong style={fieldLabel}>
                  Exclude Sale Items
                </strong>

                <span style={toggleHelper}>
                  Promo applies only to full-price merchandise.
                </span>
              </span>

              <input
                type="checkbox"
                checked={
                  newPromo.exclude_sale_items
                }
                onChange={(
                  event
                ) =>
                  setNewPromo({
                    ...newPromo,
                    exclude_sale_items:
                      event.target.checked,
                  })
                }
                style={checkbox}
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

          <p style={usageHelperText}>
            <strong style={{ color: "#7df9ff" }}>
              Usage types:
            </strong>{" "}
            Continuous can be reused. Single Use Per Customer allows one redemption per account. Single Use Total allows one redemption across the entire store.
          </p>
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

                      <div style={usagePanel}>
                        <div style={usageInfoRow}>
                          <span style={usageInfoLabel}>
                            Usage
                          </span>

                          <strong
                            style={{
                              color:
                                promo.usage_type ===
                                "continuous"
                                  ? "#00d9ff"
                                  : promo.usage_type ===
                                    "once_per_customer"
                                  ? "#ffcc00"
                                  : "#ff75df",
                            }}
                          >
                            {usageLabel(
                              promo.usage_type
                            )}
                          </strong>
                        </div>

                        <div style={usageInfoRow}>
                          <span style={usageInfoLabel}>
                            Redemptions
                          </span>

                          <strong>
                            {redemptionCounts[
                              promo.id
                            ] || 0}
                            {promo.usage_type ===
                            "single_use_total"
                              ? " / 1"
                              : ""}
                          </strong>
                        </div>

                        <div style={usageInfoRow}>
                          <span style={usageInfoLabel}>
                            Minimum Spend
                          </span>

                          <strong>
                            {Number(
                              promo.minimum_spend ||
                                0
                            ) > 0
                              ? `$${Number(
                                  promo.minimum_spend
                                ).toFixed(2)}`
                              : "None"}
                          </strong>
                        </div>

                        <div style={usageInfoRow}>
                          <span style={usageInfoLabel}>
                            Sale Items
                          </span>

                          <strong
                            style={{
                              color:
                                promo.exclude_sale_items
                                  ? "#ffcc00"
                                  : "#00ff99",
                            }}
                          >
                            {promo.exclude_sale_items
                              ? "Excluded"
                              : "Eligible"}
                          </strong>
                        </div>

                        <label style={usageEditor}>
                          <span style={usageInfoLabel}>
                            Change Usage Rule
                          </span>

                          <select
                            value={
                              promo.usage_type
                            }
                            disabled={busy}
                            onChange={(
                              event
                            ) => {
                              const next =
                                event.target
                                  .value as PromoUsageType;

                              if (
                                next ===
                                  "single_use_total" &&
                                (redemptionCounts[
                                  promo.id
                                ] || 0) > 1
                              ) {
                                const confirmed =
                                  window.confirm(
                                    `${promo.code} already has ${redemptionCounts[promo.id]} recorded redemptions. Changing it to Single Use Total will make it immediately exhausted. Continue?`
                                  );

                                if (
                                  !confirmed
                                ) {
                                  event.target.value =
                                    promo.usage_type;
                                  return;
                                }
                              }

                              void updateUsageType(
                                promo.id,
                                next,
                                promo.code
                              );
                            }}
                            style={smallSelect}
                          >
                            <option value="continuous">
                              Continuous
                            </option>

                            <option value="once_per_customer">
                              Once Per Customer
                            </option>

                            <option value="single_use_total">
                              Single Use Total
                            </option>
                          </select>
                        </label>
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
                            openEditPromo(
                              promo
                            );
                          }}
                          disabled={
                            Boolean(
                              busyPromoId
                            )
                          }
                          style={editButton}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            void openPromoQr(
                              promo
                            );
                          }}
                          disabled={
                            Boolean(
                              busyPromoId
                            )
                          }
                          style={qrButton}
                        >
                          QR Code
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

      {editingPromo && (
        <div
          style={modalOverlay}
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setEditingPromo(
                null
              );
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-promo-title"
            style={modalCard}
          >
            <div style={modalHeader}>
              <div>
                <p style={sectionEyebrow}>
                  EDIT PROMO
                </p>

                <h2
                  id="edit-promo-title"
                  style={modalTitle}
                >
                  {editingPromo.originalCode}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setEditingPromo(
                    null
                  )
                }
                style={modalClose}
                aria-label="Close edit promo dialog"
              >
                ×
              </button>
            </div>

            <div style={editGrid}>
              <label style={field}>
                <span style={fieldLabel}>
                  Promo Code
                </span>

                <input
                  value={
                    editingPromo.code
                  }
                  disabled={
                    (redemptionCounts[
                      editingPromo.id
                    ] || 0) > 0
                  }
                  onChange={(
                    event
                  ) =>
                    setEditingPromo({
                      ...editingPromo,
                      code:
                        event.target.value.toUpperCase(),
                    })
                  }
                  style={{
                    ...input,
                    opacity:
                      (redemptionCounts[
                        editingPromo.id
                      ] || 0) > 0
                        ? 0.55
                        : 1,
                  }}
                />

                {(redemptionCounts[
                  editingPromo.id
                ] || 0) > 0 && (
                  <span style={fieldHelper}>
                    Code name is locked after the first redemption to preserve order history.
                  </span>
                )}
              </label>

              <label style={field}>
                <span style={fieldLabel}>
                  Discount Type
                </span>

                <select
                  value={
                    editingPromo.discount_type
                  }
                  onChange={(
                    event
                  ) =>
                    setEditingPromo({
                      ...editingPromo,
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
                    editingPromo.discount_type ===
                    "percent"
                      ? "1"
                      : "0.01"
                  }
                  value={
                    editingPromo.discount_value
                  }
                  onChange={(
                    event
                  ) =>
                    setEditingPromo({
                      ...editingPromo,
                      discount_value:
                        event.target.value,
                    })
                  }
                  style={input}
                />
              </label>

              <label style={field}>
                <span style={fieldLabel}>
                  Usage Type
                </span>

                <select
                  value={
                    editingPromo.usage_type
                  }
                  onChange={(
                    event
                  ) =>
                    setEditingPromo({
                      ...editingPromo,
                      usage_type:
                        event.target
                          .value as PromoUsageType,
                    })
                  }
                  style={input}
                >
                  <option value="continuous">
                    Continuous
                  </option>

                  <option value="once_per_customer">
                    Single Use Per Customer
                  </option>

                  <option value="single_use_total">
                    Single Use Total
                  </option>
                </select>
              </label>

              <label style={field}>
                <span style={fieldLabel}>
                  Minimum Spend
                </span>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    editingPromo.minimum_spend
                  }
                  onChange={(
                    event
                  ) =>
                    setEditingPromo({
                      ...editingPromo,
                      minimum_spend:
                        event.target.value,
                    })
                  }
                  placeholder="Optional — e.g. 100.00"
                  style={input}
                />

                <span style={fieldHelper}>
                  Merchandise total required before the promo can apply. Shipping and tax do not count.
                </span>
              </label>

              <label style={toggleField}>
                <span>
                  <strong style={fieldLabel}>
                    Exclude Sale Items
                  </strong>

                  <span style={toggleHelper}>
                    Campaign-sale, manual-sale, and bundle-discounted lines will not receive this promo.
                  </span>
                </span>

                <input
                  type="checkbox"
                  checked={
                    editingPromo.exclude_sale_items
                  }
                  onChange={(
                    event
                  ) =>
                    setEditingPromo({
                      ...editingPromo,
                      exclude_sale_items:
                        event.target.checked,
                    })
                  }
                  style={checkbox}
                />
              </label>

              <label style={toggleField}>
                <span>
                  <strong style={fieldLabel}>
                    Active
                  </strong>

                  <span style={toggleHelper}>
                    Customers can only redeem active promo codes.
                  </span>
                </span>

                <input
                  type="checkbox"
                  checked={
                    editingPromo.is_active
                  }
                  onChange={(
                    event
                  ) =>
                    setEditingPromo({
                      ...editingPromo,
                      is_active:
                        event.target.checked,
                    })
                  }
                  style={checkbox}
                />
              </label>
            </div>

            <div style={modalActions}>
              <button
                type="button"
                onClick={() =>
                  setEditingPromo(
                    null
                  )
                }
                style={secondaryButton}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  void savePromoEdit();
                }}
                disabled={
                  savingEdit
                }
                style={{
                  ...createButton,
                  opacity:
                    savingEdit
                      ? 0.65
                      : 1,
                }}
              >
                {savingEdit
                  ? "Saving..."
                  : "Save Changes"}
              </button>
            </div>
          </section>
        </div>
      )}

      {qrPromo && (
        <div
          style={modalOverlay}
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setQrPromo(
                null
              );
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="promo-qr-title"
            style={qrModalCard}
          >
            <div style={modalHeader}>
              <div>
                <p style={sectionEyebrow}>
                  PROMO QR
                </p>

                <h2
                  id="promo-qr-title"
                  style={modalTitle}
                >
                  {qrPromo.code}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setQrPromo(
                    null
                  )
                }
                style={modalClose}
                aria-label="Close QR code dialog"
              >
                ×
              </button>
            </div>

            <p style={qrDescription}>
              Scanning this QR sends the customer to PugPep, remembers{" "}
              <strong style={{ color: "#ff75df" }}>
                {qrPromo.code}
              </strong>
              , and automatically applies it when they reach checkout.
            </p>

            <div style={qrPreview}>
              {qrLoading ? (
                <div style={qrLoadingBox}>
                  Generating QR...
                </div>
              ) : qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR code for promo ${qrPromo.code}`}
                  style={qrImage}
                />
              ) : (
                <div style={qrLoadingBox}>
                  QR unavailable
                </div>
              )}
            </div>

            <div style={qrLinkBox}>
              https://pugpep.com/promo/{qrPromo.code}
            </div>

            <div style={modalActions}>
              <button
                type="button"
                onClick={() =>
                  setQrPromo(
                    null
                  )
                }
                style={secondaryButton}
              >
                Close
              </button>

              <button
                type="button"
                onClick={
                  downloadPromoQr
                }
                disabled={
                  !qrDataUrl
                }
                style={{
                  ...createButton,
                  opacity:
                    qrDataUrl
                      ? 1
                      : 0.55,
                }}
              >
                Download QR PNG
              </button>
            </div>
          </section>
        </div>
      )}
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

const fieldHelper = {
  color: "#8f8f98",
  fontSize: 12,
  lineHeight: 1.5,
};

const usageHelperText = {
  margin: "12px 0 0",
  color: "#8f8f98",
  fontSize: 12,
  lineHeight: 1.55,
};

const modalOverlay = {
  position: "fixed" as const,
  inset: 0,
  zIndex: 1000,
  padding: 20,
  display: "grid",
  placeItems: "center",
  overflowY: "auto" as const,
  background: "rgba(0,0,0,.78)",
  backdropFilter: "blur(8px)",
};

const modalCard = {
  width: "min(760px, 100%)",
  padding: "clamp(20px, 4vw, 30px)",
  border: "1px solid rgba(0,217,255,.42)",
  borderRadius: 18,
  background:
    "linear-gradient(145deg, rgba(10,10,15,.99), rgba(17,8,20,.99))",
  boxShadow:
    "0 0 40px rgba(0,217,255,.12)",
};

const qrModalCard = {
  ...modalCard,
  width: "min(600px, 100%)",
};

const modalHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  marginBottom: 20,
};

const modalTitle = {
  margin: "5px 0 0",
  color: "#ff75df",
  fontSize: 32,
};

const modalClose = {
  width: 44,
  height: 44,
  border: "1px solid rgba(255,255,255,.16)",
  borderRadius: 10,
  background: "rgba(255,255,255,.04)",
  color: "#ffffff",
  fontSize: 26,
  cursor: "pointer",
};

const editGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 16,
};

const toggleFieldCompact = {
  minHeight: 54,
  padding: "9px 14px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 14,
  border: "1px solid rgba(255,255,255,.16)",
  borderRadius: 10,
  background: "#050507",
};

const toggleField = {
  minHeight: 70,
  padding: "12px 14px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  border: "1px solid rgba(255,255,255,.12)",
  borderRadius: 10,
  background: "#050507",
};

const toggleHelper = {
  display: "block",
  marginTop: 5,
  color: "#8f8f98",
  fontSize: 12,
  lineHeight: 1.4,
};

const checkbox = {
  width: 22,
  height: 22,
  accentColor: "#00ff99",
};

const modalActions = {
  marginTop: 22,
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  flexWrap: "wrap" as const,
};

const secondaryButton = {
  minHeight: 54,
  padding: "13px 18px",
  border: "1px solid rgba(255,255,255,.18)",
  borderRadius: 10,
  background: "rgba(255,255,255,.04)",
  color: "#ffffff",
  fontSize: 15,
  fontWeight: 900,
  cursor: "pointer",
};

const qrDescription = {
  margin: "0 0 16px",
  color: "#c3c3cb",
  lineHeight: 1.6,
};

const qrPreview = {
  width: "100%",
  display: "grid",
  placeItems: "center",
  padding: 18,
  borderRadius: 16,
  background: "#ffffff",
};

const qrImage = {
  display: "block",
  width: "min(340px, 100%)",
  height: "auto",
};

const qrLoadingBox = {
  minHeight: 260,
  display: "grid",
  placeItems: "center",
  color: "#222222",
  fontWeight: 900,
};

const qrLinkBox = {
  marginTop: 12,
  padding: "12px 14px",
  border: "1px solid rgba(255,255,255,.12)",
  borderRadius: 10,
  background: "#050507",
  color: "#7df9ff",
  fontSize: 13,
  overflowWrap: "anywhere" as const,
};

const usagePanel = {
  display: "grid",
  gap: 10,
  padding: 13,
  border:
    "1px solid rgba(255,255,255,.10)",
  borderRadius: 11,
  background:
    "rgba(255,255,255,.025)",
};

const usageInfoRow = {
  display: "flex",
  justifyContent:
    "space-between",
  gap: 12,
  alignItems: "center",
};

const usageInfoLabel = {
  color: "#9f9fa8",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: ".05em",
  textTransform:
    "uppercase" as const,
};

const usageEditor = {
  display: "grid",
  gap: 7,
  marginTop: 3,
};

const smallSelect = {
  width: "100%",
  minHeight: 42,
  boxSizing:
    "border-box" as const,
  padding: "9px 11px",
  border:
    "1px solid rgba(255,255,255,.16)",
  borderRadius: 9,
  background: "#050507",
  color: "#ffffff",
  fontSize: 14,
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

const editButton = {
  minHeight: 46,
  padding: "11px 15px",
  border:
    "1px solid rgba(0,217,255,.50)",
  borderRadius: 9,
  background:
    "rgba(0,217,255,.07)",
  color: "#7df9ff",
  fontSize: 15,
  fontWeight: 900,
  cursor: "pointer",
};

const qrButton = {
  minHeight: 46,
  padding: "11px 15px",
  border:
    "1px solid rgba(255,117,223,.50)",
  borderRadius: 9,
  background:
    "rgba(255,117,223,.07)",
  color: "#ff75df",
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