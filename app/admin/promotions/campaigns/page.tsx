"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "../../../../lib/supabaseClient";

const ADMIN_EMAIL = "pugpep99@gmail.com";

type CampaignType =
  | "percent"
  | "fixed"
  | "buy_x_get_y";

type Campaign = {
  id: string;
  name: string;
  slug: string;
  campaign_type: CampaignType;
  discount_value: number;
  buy_quantity: number | null;
  get_quantity: number | null;
  is_storewide: boolean;
  priority: number;
  is_active: boolean;
  allow_reward_points: boolean;
  allow_general_promos: boolean;
  allow_sales_rep_discount: boolean;
  allow_referral_discount: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

type CampaignForm = {
  name: string;
  slug: string;
  campaignType: CampaignType;
  discountValue: string;
  buyQuantity: string;
  getQuantity: string;
  isStorewide: boolean;
  priority: string;
  isActive: boolean;
  allowRewardPoints: boolean;
  allowGeneralPromos: boolean;
  allowSalesRepDiscount: boolean;
  allowReferralDiscount: boolean;
};

const emptyForm: CampaignForm = {
  name: "",
  slug: "",
  campaignType: "percent",
  discountValue: "0",
  buyQuantity: "1",
  getQuantity: "1",
  isStorewide: false,
  priority: "50",
  isActive: false,
  allowRewardPoints: true,
  allowGeneralPromos: false,
  allowSalesRepDiscount: false,
  allowReferralDiscount: false,
};

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function money(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function getCampaignDescription(
  campaign: Campaign
) {
  if (
    campaign.campaign_type ===
    "percent"
  ) {
    return `${Number(
      campaign.discount_value || 0
    )}% off`;
  }

  if (
    campaign.campaign_type ===
    "fixed"
  ) {
    return `${money(
      campaign.discount_value
    )} off`;
  }

  return `Buy ${
    campaign.buy_quantity || 1
  }, get ${
    campaign.get_quantity || 1
  } free`;
}

function getErrorMessage(
  error: unknown
) {
  if (
    error instanceof Error &&
    error.message
  ) {
    return error.message;
  }

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

export default function CampaignsPage() {
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [loading, setLoading] =
    useState(true);

  const [authorized, setAuthorized] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [campaigns, setCampaigns] =
    useState<Campaign[]>([]);

  const [
    editingCampaignId,
    setEditingCampaignId,
  ] = useState<string | null>(
    null
  );

  const [form, setForm] =
    useState<CampaignForm>(
      emptyForm
    );

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState<
      "all" | "active" | "inactive"
    >("all");

  useEffect(() => {
    async function initialize() {
      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      const email =
        session?.user?.email;

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

      await loadCampaigns();
      setLoading(false);
    }

    void initialize();
  }, [supabase]);

  async function loadCampaigns() {
    const {
      data,
      error,
    } = await supabase
      .from("sale_campaigns")
      .select(
        [
          "id",
          "name",
          "slug",
          "campaign_type",
          "discount_value",
          "buy_quantity",
          "get_quantity",
          "is_storewide",
          "priority",
          "is_active",
          "allow_reward_points",
          "allow_general_promos",
          "allow_sales_rep_discount",
          "allow_referral_discount",
          "created_at",
          "updated_at",
        ].join(",")
      )
      .order("priority", {
        ascending: false,
      })
      .order("name", {
        ascending: true,
      });

    if (error) {
      alert(error.message);
      return;
    }

    setCampaigns(
      (data || []) as unknown as Campaign[]
    );
  }

  function updateForm<
    K extends keyof CampaignForm
  >(
    field: K,
    value: CampaignForm[K]
  ) {
    setForm(
      (current) => ({
        ...current,
        [field]: value,
      })
    );
  }

  function startCreate() {
    setEditingCampaignId(null);
    setForm(emptyForm);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function startEdit(
    campaign: Campaign
  ) {
    setEditingCampaignId(
      campaign.id
    );

    setForm({
      name:
        campaign.name || "",

      slug:
        campaign.slug || "",

      campaignType:
        campaign.campaign_type,

      discountValue:
        String(
          Number(
            campaign.discount_value ||
              0
          )
        ),

      buyQuantity:
        String(
          Number(
            campaign.buy_quantity ||
              1
          )
        ),

      getQuantity:
        String(
          Number(
            campaign.get_quantity ||
              1
          )
        ),

      isStorewide:
        campaign.is_storewide,

      priority:
        String(
          Number(
            campaign.priority || 0
          )
        ),

      isActive:
        campaign.is_active,

      allowRewardPoints:
        campaign.allow_reward_points,

      allowGeneralPromos:
        campaign.allow_general_promos,

      allowSalesRepDiscount:
        campaign.allow_sales_rep_discount,

      allowReferralDiscount:
        campaign.allow_referral_discount,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function cancelEdit() {
    setEditingCampaignId(null);
    setForm(emptyForm);
  }

  async function saveCampaign() {
    if (saving) {
      return;
    }

    const name =
      form.name.trim();

    const slug =
      toSlug(
        form.slug || form.name
      );

    if (!name) {
      alert(
        "Campaign name is required."
      );
      return;
    }

    if (!slug) {
      alert(
        "Campaign slug is required."
      );
      return;
    }

    const discountValue =
      Math.max(
        0,
        Number(
          form.discountValue || 0
        )
      );

    const priority =
      Math.floor(
        Number(
          form.priority || 0
        )
      );

    const buyQuantity =
      Math.max(
        1,
        Math.floor(
          Number(
            form.buyQuantity || 1
          )
        )
      );

    const getQuantity =
      Math.max(
        1,
        Math.floor(
          Number(
            form.getQuantity || 1
          )
        )
      );

    if (
      form.campaignType ===
        "percent" &&
      discountValue > 100
    ) {
      alert(
        "Percentage discounts cannot exceed 100%."
      );
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name,
        slug,

        campaign_type:
          form.campaignType,

        discount_value:
          form.campaignType ===
          "buy_x_get_y"
            ? 0
            : discountValue,

        buy_quantity:
          form.campaignType ===
          "buy_x_get_y"
            ? buyQuantity
            : null,

        get_quantity:
          form.campaignType ===
          "buy_x_get_y"
            ? getQuantity
            : null,

        is_storewide:
          form.isStorewide,

        priority,

        is_active:
          form.isActive,

        allow_reward_points:
          form.allowRewardPoints,

        allow_general_promos:
          form.allowGeneralPromos,

        allow_sales_rep_discount:
          form.allowSalesRepDiscount,

        allow_referral_discount:
          form.allowReferralDiscount,
      };

      if (editingCampaignId) {
        const {
          error,
        } = await supabase
          .from("sale_campaigns")
          .update(payload)
          .eq(
            "id",
            editingCampaignId
          );

        if (error) {
          throw error;
        }

        alert(
          "Campaign updated."
        );
      } else {
        const {
          error,
        } = await supabase
          .from("sale_campaigns")
          .insert(payload);

        if (error) {
          throw error;
        }

        alert(
          "Campaign created."
        );
      }

      setEditingCampaignId(null);
      setForm(emptyForm);

      await loadCampaigns();
    } catch (error: unknown) {
      console.error(
        "Unable to save campaign:",
        error
      );

      alert(
        getErrorMessage(error)
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleCampaign(
    campaign: Campaign
  ) {
    const {
      error,
    } = await supabase
      .from("sale_campaigns")
      .update({
        is_active:
          !campaign.is_active,
      })
      .eq("id", campaign.id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadCampaigns();
  }

  async function deleteCampaign(
    campaign: Campaign
  ) {
    const confirmed =
      window.confirm(
        `Delete "${campaign.name}"? Product assignments connected to this campaign may also need to be removed.`
      );

    if (!confirmed) {
      return;
    }

    const {
      error,
    } = await supabase
      .from("sale_campaigns")
      .delete()
      .eq("id", campaign.id);

    if (error) {
      alert(
        `Unable to delete campaign: ${error.message}`
      );
      return;
    }

    if (
      editingCampaignId ===
      campaign.id
    ) {
      cancelEdit();
    }

    await loadCampaigns();
  }

  const filteredCampaigns =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return campaigns.filter(
        (campaign) => {
          const matchesSearch =
            !query ||
            campaign.name
              .toLowerCase()
              .includes(query) ||
            campaign.slug
              .toLowerCase()
              .includes(query);

          const matchesStatus =
            statusFilter ===
              "all" ||
            (statusFilter ===
              "active" &&
              campaign.is_active) ||
            (statusFilter ===
              "inactive" &&
              !campaign.is_active);

          return (
            matchesSearch &&
            matchesStatus
          );
        }
      );
    }, [
      campaigns,
      search,
      statusFilter,
    ]);

  const activeCount =
    campaigns.filter(
      (campaign) =>
        campaign.is_active
    ).length;

  if (loading) {
    return (
      <main style={styles.page}>
        Loading campaigns...
      </main>
    );
  }

  if (!authorized) {
    return (
      <main style={styles.page}>
        <h1 style={styles.title}>
          Access Denied
        </h1>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <div style={styles.topBar}>
          <Link
            href="/admin/promotions"
            style={styles.backLink}
          >
            ← Marketing Center
          </Link>

          <div style={styles.topLinks}>
            <Link
              href="/admin/promotions/assignments"
              style={styles.secondaryLink}
            >
              Product Assignments
            </Link>

            <Link
              href="/admin/promotions/simulator"
              style={styles.secondaryLink}
            >
              Profit Simulator
            </Link>
          </div>
        </div>

        <header style={styles.header}>
          <div>
            <p style={styles.eyebrow}>
              MARKETING CENTER
            </p>

            <h1 style={styles.title}>
              Campaigns
            </h1>

            <p style={styles.subtitle}>
              Create and manage sale
              campaigns, priorities,
              product eligibility, and
              discount-stacking rules.
            </p>
          </div>

          <div style={styles.stats}>
            <Stat
              label="Total"
              value={campaigns.length}
            />

            <Stat
              label="Active"
              value={activeCount}
            />
          </div>
        </header>

        <section style={styles.editor}>
          <div style={styles.editorHeader}>
            <div>
              <h2 style={styles.heading}>
                {editingCampaignId
                  ? "Edit Campaign"
                  : "Create Campaign"}
              </h2>

              <p style={styles.helpText}>
                Product assignments are
                managed separately after
                the campaign is created.
              </p>
            </div>

            {editingCampaignId && (
              <button
                type="button"
                onClick={cancelEdit}
                style={styles.cancelButton}
              >
                Cancel Edit
              </button>
            )}
          </div>

          <div style={styles.formGrid}>
            <label style={styles.label}>
              Campaign name
              <input
                value={form.name}
                onChange={(event) => {
                  const nextName =
                    event.target.value;

                  updateForm(
                    "name",
                    nextName
                  );

                  if (
                    !editingCampaignId
                  ) {
                    updateForm(
                      "slug",
                      toSlug(
                        nextName
                      )
                    );
                  }
                }}
                placeholder="Christmas Sale"
                style={styles.input}
              />
            </label>

            <label style={styles.label}>
              Slug
              <input
                value={form.slug}
                onChange={(event) =>
                  updateForm(
                    "slug",
                    toSlug(
                      event.target.value
                    )
                  )
                }
                placeholder="christmas-sale"
                style={styles.input}
              />
            </label>

            <label style={styles.label}>
              Campaign type
              <select
                value={
                  form.campaignType
                }
                onChange={(event) =>
                  updateForm(
                    "campaignType",
                    event.target
                      .value as CampaignType
                  )
                }
                style={styles.input}
              >
                <option value="percent">
                  Percentage discount
                </option>

                <option value="fixed">
                  Fixed-dollar discount
                </option>

                <option value="buy_x_get_y">
                  Buy X, Get Y Free
                </option>
              </select>
            </label>

            {form.campaignType !==
              "buy_x_get_y" && (
              <label style={styles.label}>
                {form.campaignType ===
                "percent"
                  ? "Discount percent"
                  : "Discount amount"}

                <input
                  type="number"
                  min="0"
                  max={
                    form.campaignType ===
                    "percent"
                      ? "100"
                      : undefined
                  }
                  step="0.01"
                  value={
                    form.discountValue
                  }
                  onChange={(event) =>
                    updateForm(
                      "discountValue",
                      event.target.value
                    )
                  }
                  style={styles.input}
                />
              </label>
            )}

            {form.campaignType ===
              "buy_x_get_y" && (
              <>
                <label style={styles.label}>
                  Buy quantity
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={
                      form.buyQuantity
                    }
                    onChange={(event) =>
                      updateForm(
                        "buyQuantity",
                        event.target.value
                      )
                    }
                    style={styles.input}
                  />
                </label>

                <label style={styles.label}>
                  Free quantity
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={
                      form.getQuantity
                    }
                    onChange={(event) =>
                      updateForm(
                        "getQuantity",
                        event.target.value
                      )
                    }
                    style={styles.input}
                  />
                </label>
              </>
            )}

            <label style={styles.label}>
              Priority
              <input
                type="number"
                step="1"
                value={form.priority}
                onChange={(event) =>
                  updateForm(
                    "priority",
                    event.target.value
                  )
                }
                style={styles.input}
              />
            </label>
          </div>

          <div style={styles.toggleGrid}>
            <Toggle
              label="Active"
              description="Campaign can be selected by the pricing engine."
              checked={form.isActive}
              onChange={(checked) =>
                updateForm(
                  "isActive",
                  checked
                )
              }
            />

            <Toggle
              label="Storewide"
              description="Apply to all eligible product options."
              checked={form.isStorewide}
              onChange={(checked) =>
                updateForm(
                  "isStorewide",
                  checked
                )
              }
            />

            <Toggle
              label="Allow reward points"
              description="Rewards may be used on campaign items."
              checked={
                form.allowRewardPoints
              }
              onChange={(checked) =>
                updateForm(
                  "allowRewardPoints",
                  checked
                )
              }
            />

            <Toggle
              label="Allow general promos"
              description="Normal promo codes may stack with this campaign."
              checked={
                form.allowGeneralPromos
              }
              onChange={(checked) =>
                updateForm(
                  "allowGeneralPromos",
                  checked
                )
              }
            />

            <Toggle
              label="Allow sales-rep discount"
              description="A sales-rep introductory discount may stack."
              checked={
                form.allowSalesRepDiscount
              }
              onChange={(checked) =>
                updateForm(
                  "allowSalesRepDiscount",
                  checked
                )
              }
            />

            <Toggle
              label="Allow referral discount"
              description="Lifetime referral discounts may stack."
              checked={
                form.allowReferralDiscount
              }
              onChange={(checked) =>
                updateForm(
                  "allowReferralDiscount",
                  checked
                )
              }
            />
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={() => {
              void saveCampaign();
            }}
            style={{
              ...styles.saveButton,
              opacity:
                saving ? 0.65 : 1,
            }}
          >
            {saving
              ? "Saving..."
              : editingCampaignId
              ? "Save Campaign Changes"
              : "Create Campaign"}
          </button>
        </section>

        <section style={styles.listSection}>
          <div style={styles.filterGrid}>
            <label style={styles.label}>
              Search
              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search campaigns"
                style={styles.input}
              />
            </label>

            <label style={styles.label}>
              Status
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target
                      .value as
                      | "all"
                      | "active"
                      | "inactive"
                  )
                }
                style={styles.input}
              >
                <option value="all">
                  All campaigns
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

          <div style={styles.listHeader}>
            <h2 style={styles.heading}>
              Existing Campaigns
            </h2>

            <button
              type="button"
              onClick={startCreate}
              style={styles.newButton}
            >
              + New Campaign
            </button>
          </div>

          {filteredCampaigns.length ===
          0 ? (
            <div style={styles.empty}>
              No campaigns match the
              selected filters.
            </div>
          ) : (
            <div style={styles.campaignGrid}>
              {filteredCampaigns.map(
                (campaign) => (
                  <article
                    key={campaign.id}
                    style={styles.campaignCard}
                  >
                    <div style={styles.cardHeader}>
                      <div>
                        <h3 style={styles.cardTitle}>
                          {campaign.name}
                        </h3>

                        <p style={styles.cardSlug}>
                          {campaign.slug}
                        </p>
                      </div>

                      <span
                        style={{
                          ...styles.statusBadge,

                          color:
                            campaign.is_active
                              ? "#00ff99"
                              : "#999999",

                          borderColor:
                            campaign.is_active
                              ? "#00ff99"
                              : "#555555",
                        }}
                      >
                        {campaign.is_active
                          ? "ACTIVE"
                          : "INACTIVE"}
                      </span>
                    </div>

                    <div style={styles.discountBox}>
                      <strong>
                        {getCampaignDescription(
                          campaign
                        )}
                      </strong>

                      <span>
                        Priority{" "}
                        {campaign.priority}
                      </span>
                    </div>

                    <div style={styles.ruleGrid}>
                      <Rule
                        label="Storewide"
                        enabled={
                          campaign.is_storewide
                        }
                      />

                      <Rule
                        label="Rewards"
                        enabled={
                          campaign.allow_reward_points
                        }
                      />

                      <Rule
                        label="General promos"
                        enabled={
                          campaign.allow_general_promos
                        }
                      />

                      <Rule
                        label="Sales rep"
                        enabled={
                          campaign.allow_sales_rep_discount
                        }
                      />

                      <Rule
                        label="Referral"
                        enabled={
                          campaign.allow_referral_discount
                        }
                      />
                    </div>

                    <div style={styles.actions}>
                      <button
                        type="button"
                        onClick={() =>
                          startEdit(
                            campaign
                          )
                        }
                        style={styles.editButton}
                      >
                        Edit
                      </button>

                      <Link
                        href={`/admin/promotions/assignments?campaign=${campaign.id}`}
                        style={styles.assignButton}
                      >
                        Assign Products
                      </Link>

                      <button
                        type="button"
                        onClick={() => {
                          void toggleCampaign(
                            campaign
                          );
                        }}
                        style={
                          campaign.is_active
                            ? styles.disableButton
                            : styles.enableButton
                        }
                      >
                        {campaign.is_active
                          ? "Deactivate"
                          : "Activate"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          void deleteCampaign(
                            campaign
                          );
                        }}
                        style={styles.deleteButton}
                      >
                        Delete
                      </button>
                    </div>
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

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (
    checked: boolean
  ) => void;
}) {
  return (
    <label style={styles.toggleCard}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onChange(
            event.target.checked
          )
        }
        style={styles.checkbox}
      />

      <span>
        <strong
          style={{
            ...styles.toggleTitle,

            color: checked
              ? "#00ff99"
              : "#ffffff",
          }}
        >
          {label}
        </strong>

        <span style={styles.toggleDescription}>
          {description}
        </span>
      </span>
    </label>
  );
}

function Rule({
  label,
  enabled,
}: {
  label: string;
  enabled: boolean;
}) {
  return (
    <div style={styles.rule}>
      <span>{label}</span>

      <strong
        style={{
          color: enabled
            ? "#00ff99"
            : "#777777",
        }}
      >
        {enabled ? "YES" : "NO"}
      </strong>
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div style={styles.statCard}>
      <span style={styles.statLabel}>
        {label}
      </span>

      <strong style={styles.statValue}>
        {value}
      </strong>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding:
      "clamp(16px, 3vw, 32px)",
    background:
      "radial-gradient(circle at top, #11161b 0%, #040404 36%, #000 100%)",
    color: "#ffffff",
  },

  container: {
    width: "100%",
    maxWidth: 1240,
    margin: "0 auto",
  },

  topBar: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap" as const,
  },

  topLinks: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap" as const,
  },

  backLink: {
    color: "#00d9ff",
    textDecoration: "none",
    fontWeight: 800,
  },

  secondaryLink: {
    padding: "9px 12px",
    border:
      "1px solid #444444",
    borderRadius: 9,
    color: "#dddddd",
    textDecoration: "none",
    fontWeight: 700,
  },

  header: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "flex-end",
    gap: 20,
    flexWrap: "wrap" as const,
    marginTop: 28,
  },

  eyebrow: {
    margin: 0,
    color: "#888888",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.14em",
  },

  title: {
    margin: "6px 0 8px",
    color: "#ff45d8",
    fontSize:
      "clamp(34px, 7vw, 52px)",
  },

  subtitle: {
    maxWidth: 760,
    margin: 0,
    color: "#bbbbbb",
    fontSize: 17,
    lineHeight: 1.6,
  },

  stats: {
    display: "flex",
    gap: 10,
  },

  statCard: {
    minWidth: 92,
    padding: "13px 15px",
    border:
      "1px solid #333333",
    borderRadius: 12,
    background: "#0a0a0a",
    display: "grid",
    gap: 4,
  },

  statLabel: {
    color: "#999999",
    fontSize: 12,
    textTransform:
      "uppercase" as const,
    fontWeight: 800,
  },

  statValue: {
    color: "#00d9ff",
    fontSize: 24,
  },

  editor: {
    marginTop: 24,
    padding:
      "clamp(16px, 3vw, 24px)",
    border:
      "1px solid #333333",
    borderRadius: 16,
    background:
      "rgba(10,10,10,.94)",
  },

  editorHeader: {
    display: "flex",
    justifyContent:
      "space-between",
    gap: 14,
    alignItems: "start",
    flexWrap: "wrap" as const,
  },

  heading: {
    margin: 0,
    color: "#00d9ff",
    fontSize:
      "clamp(22px, 4vw, 29px)",
  },

  helpText: {
    margin:
      "6px 0 0",
    color: "#999999",
  },

  formGrid: {
    marginTop: 18,
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
    gap: 14,
  },

  label: {
    display: "grid",
    gap: 8,
    color: "#eeeeee",
    fontSize: 14,
    fontWeight: 800,
  },

  input: {
    width: "100%",
    minHeight: 49,
    boxSizing:
      "border-box" as const,
    padding: "11px 12px",
    border:
      "1px solid #444444",
    borderRadius: 9,
    background: "#080808",
    color: "#ffffff",
    fontSize: 16,
  },

  toggleGrid: {
    marginTop: 18,
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
    gap: 12,
  },

  toggleCard: {
    minHeight: 86,
    padding: 14,
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    border:
      "1px solid #363636",
    borderRadius: 11,
    background: "#080808",
    cursor: "pointer",
  },

  checkbox: {
    width: 22,
    height: 22,
    minWidth: 22,
    accentColor: "#00ff99",
    cursor: "pointer",
  },

  toggleTitle: {
    display: "block",
  },

  toggleDescription: {
    display: "block",
    marginTop: 5,
    color: "#999999",
    fontSize: 13,
    lineHeight: 1.5,
  },

  saveButton: {
    width: "100%",
    minHeight: 54,
    marginTop: 18,
    border: "none",
    borderRadius: 10,
    background:
      "linear-gradient(90deg, #00b7ff, #ff2fd0)",
    color: "#ffffff",
    fontSize: 17,
    fontWeight: 800,
    cursor: "pointer",
  },

  cancelButton: {
    padding: "9px 13px",
    border:
      "1px solid #ffcc66",
    borderRadius: 9,
    background: "#211600",
    color: "#ffcc66",
    fontWeight: 800,
    cursor: "pointer",
  },

  listSection: {
    marginTop: 24,
    padding:
      "clamp(16px, 3vw, 24px)",
    border:
      "1px solid #333333",
    borderRadius: 16,
    background:
      "rgba(10,10,10,.94)",
  },

  filterGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
    gap: 14,
  },

  listHeader: {
    marginTop: 20,
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap" as const,
  },

  newButton: {
    padding: "10px 14px",
    border:
      "1px solid #00d9ff",
    borderRadius: 9,
    background: "#00171d",
    color: "#00d9ff",
    fontWeight: 800,
    cursor: "pointer",
  },

  campaignGrid: {
    marginTop: 16,
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
    gap: 14,
  },

  campaignCard: {
    padding: 17,
    border:
      "1px solid #343434",
    borderRadius: 13,
    background: "#080808",
  },

  cardHeader: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "flex-start",
    gap: 12,
  },

  cardTitle: {
    margin: 0,
    color: "#ff45d8",
    fontSize: 21,
  },

  cardSlug: {
    margin: "4px 0 0",
    color: "#777777",
    fontSize: 13,
  },

  statusBadge: {
    padding: "5px 8px",
    border: "1px solid",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 800,
  },

  discountBox: {
    marginTop: 15,
    padding: 12,
    display: "flex",
    justifyContent:
      "space-between",
    gap: 12,
    flexWrap: "wrap" as const,
    borderRadius: 9,
    background:
      "rgba(0,217,255,.07)",
    color: "#00d9ff",
  },

  ruleGrid: {
    marginTop: 14,
    display: "grid",
    gap: 7,
  },

  rule: {
    display: "flex",
    justifyContent:
      "space-between",
    gap: 12,
    color: "#bbbbbb",
    fontSize: 14,
  },

  actions: {
    marginTop: 16,
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: 8,
  },

  editButton: {
    padding: "9px 10px",
    border:
      "1px solid #00d9ff",
    borderRadius: 8,
    background: "#00171d",
    color: "#00d9ff",
    fontWeight: 800,
    cursor: "pointer",
  },

  assignButton: {
    padding: "9px 10px",
    border:
      "1px solid #a575ff",
    borderRadius: 8,
    background: "#130823",
    color: "#c7a6ff",
    textAlign: "center" as const,
    textDecoration: "none",
    fontWeight: 800,
  },

  enableButton: {
    padding: "9px 10px",
    border:
      "1px solid #00ff99",
    borderRadius: 8,
    background: "#00271a",
    color: "#00ff99",
    fontWeight: 800,
    cursor: "pointer",
  },

  disableButton: {
    padding: "9px 10px",
    border:
      "1px solid #ffcc66",
    borderRadius: 8,
    background: "#241700",
    color: "#ffcc66",
    fontWeight: 800,
    cursor: "pointer",
  },

  deleteButton: {
    padding: "9px 10px",
    border:
      "1px solid #ff5d5d",
    borderRadius: 8,
    background: "#250000",
    color: "#ff7777",
    fontWeight: 800,
    cursor: "pointer",
  },

  empty: {
    marginTop: 16,
    padding: 24,
    border:
      "1px dashed #444444",
    borderRadius: 11,
    color: "#999999",
    textAlign: "center" as const,
  },
};