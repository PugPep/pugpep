"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../../../lib/supabaseClient";

const ADMIN_EMAIL = "pugpep99@gmail.com";

type MarketingRules = {
  id: string;
  rule_name: string;
  is_active: boolean;

  rewards_enabled: boolean;
  allow_rewards_on_sale_items: boolean;
  earn_rewards_on_sale_orders: boolean;

  general_promos_enabled: boolean;
  allow_general_promos_on_sale_items: boolean;
  allow_multiple_general_promos: boolean;

  sales_rep_codes_enabled: boolean;
  sales_rep_discount_first_order_only: boolean;
  allow_sales_rep_discount_on_sale_items: boolean;
  preserve_sales_rep_attribution_when_discount_blocked: boolean;
  default_sales_rep_commission_percent: number;

  referral_program_enabled: boolean;
  referral_required_paid_orders: number;
  allow_referral_discount_on_sale_items: boolean;
  maximum_referral_discount_percent: number;

  free_shipping_threshold: number;
  lifetime_free_shipping_enabled: boolean;
  default_shipping_cost: number;
  default_packaging_cost: number;

  minimum_margin_warning_percent: number;
  critical_margin_percent: number;

  default_campaign_priority: number;
  default_campaign_status: "draft" | "scheduled" | "active";
  allow_storewide_campaigns: boolean;

  created_at: string;
  updated_at: string;
};

type RulesForm = {
  ruleName: string;

  rewardsEnabled: boolean;
  allowRewardsOnSaleItems: boolean;
  earnRewardsOnSaleOrders: boolean;

  generalPromosEnabled: boolean;
  allowGeneralPromosOnSaleItems: boolean;
  allowMultipleGeneralPromos: boolean;

  salesRepCodesEnabled: boolean;
  salesRepDiscountFirstOrderOnly: boolean;
  allowSalesRepDiscountOnSaleItems: boolean;
  preserveSalesRepAttributionWhenDiscountBlocked: boolean;
  defaultSalesRepCommissionPercent: string;

  referralProgramEnabled: boolean;
  referralRequiredPaidOrders: string;
  allowReferralDiscountOnSaleItems: boolean;
  maximumReferralDiscountPercent: string;

  freeShippingThreshold: string;
  lifetimeFreeShippingEnabled: boolean;
  defaultShippingCost: string;
  defaultPackagingCost: string;

  minimumMarginWarningPercent: string;
  criticalMarginPercent: string;

  defaultCampaignPriority: string;
  defaultCampaignStatus: "draft" | "scheduled" | "active";
  allowStorewideCampaigns: boolean;
};

const emptyForm: RulesForm = {
  ruleName: "PugPep Marketing Rules",

  rewardsEnabled: true,
  allowRewardsOnSaleItems: true,
  earnRewardsOnSaleOrders: true,

  generalPromosEnabled: true,
  allowGeneralPromosOnSaleItems: false,
  allowMultipleGeneralPromos: false,

  salesRepCodesEnabled: true,
  salesRepDiscountFirstOrderOnly: true,
  allowSalesRepDiscountOnSaleItems: false,
  preserveSalesRepAttributionWhenDiscountBlocked: true,
  defaultSalesRepCommissionPercent: "20",

  referralProgramEnabled: true,
  referralRequiredPaidOrders: "2",
  allowReferralDiscountOnSaleItems: false,
  maximumReferralDiscountPercent: "10",

  freeShippingThreshold: "250",
  lifetimeFreeShippingEnabled: true,
  defaultShippingCost: "8",
  defaultPackagingCost: "3",

  minimumMarginWarningPercent: "20",
  criticalMarginPercent: "15",

  defaultCampaignPriority: "50",
  defaultCampaignStatus: "draft",
  allowStorewideCampaigns: true,
};

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

export default function MarketingRulesPage() {
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [saving, setSaving] = useState(false);

  const [ruleId, setRuleId] = useState<string | null>(null);
  const [form, setForm] = useState<RulesForm>(emptyForm);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    async function initialize() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const email = session?.user?.email;

      if (
        !email ||
        email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()
      ) {
        setAuthorized(false);
        setLoading(false);
        return;
      }

      setAuthorized(true);

      const { data, error } = await supabase
        .from("marketing_rules")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }

      if (data) {
        const rules = data as MarketingRules;

        setRuleId(rules.id);
        setLastUpdated(rules.updated_at);

        setForm({
          ruleName: rules.rule_name || "PugPep Marketing Rules",

          rewardsEnabled: rules.rewards_enabled,
          allowRewardsOnSaleItems:
            rules.allow_rewards_on_sale_items,
          earnRewardsOnSaleOrders:
            rules.earn_rewards_on_sale_orders,

          generalPromosEnabled:
            rules.general_promos_enabled,
          allowGeneralPromosOnSaleItems:
            rules.allow_general_promos_on_sale_items,
          allowMultipleGeneralPromos:
            rules.allow_multiple_general_promos,

          salesRepCodesEnabled:
            rules.sales_rep_codes_enabled,
          salesRepDiscountFirstOrderOnly:
            rules.sales_rep_discount_first_order_only,
          allowSalesRepDiscountOnSaleItems:
            rules.allow_sales_rep_discount_on_sale_items,
          preserveSalesRepAttributionWhenDiscountBlocked:
            rules.preserve_sales_rep_attribution_when_discount_blocked,
          defaultSalesRepCommissionPercent: String(
            Number(rules.default_sales_rep_commission_percent || 0)
          ),

          referralProgramEnabled:
            rules.referral_program_enabled,
          referralRequiredPaidOrders: String(
            Number(rules.referral_required_paid_orders || 2)
          ),
          allowReferralDiscountOnSaleItems:
            rules.allow_referral_discount_on_sale_items,
          maximumReferralDiscountPercent: String(
            Number(rules.maximum_referral_discount_percent || 0)
          ),

          freeShippingThreshold: String(
            Number(rules.free_shipping_threshold || 0)
          ),
          lifetimeFreeShippingEnabled:
            rules.lifetime_free_shipping_enabled,
          defaultShippingCost: String(
            Number(rules.default_shipping_cost || 0)
          ),
          defaultPackagingCost: String(
            Number(rules.default_packaging_cost || 0)
          ),

          minimumMarginWarningPercent: String(
            Number(rules.minimum_margin_warning_percent || 0)
          ),
          criticalMarginPercent: String(
            Number(rules.critical_margin_percent || 0)
          ),

          defaultCampaignPriority: String(
            Number(rules.default_campaign_priority || 0)
          ),
          defaultCampaignStatus:
            rules.default_campaign_status || "draft",
          allowStorewideCampaigns:
            rules.allow_storewide_campaigns,
        });
      }

      setLoading(false);
    }

    void initialize();
  }, [supabase]);

  function updateForm<K extends keyof RulesForm>(
    field: K,
    value: RulesForm[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function saveRules() {
    if (!ruleId || saving) {
      return;
    }

    const commissionPercent = Math.min(
      100,
      Math.max(
        0,
        Number(form.defaultSalesRepCommissionPercent || 0)
      )
    );

    const requiredPaidOrders = Math.max(
      1,
      Math.floor(Number(form.referralRequiredPaidOrders || 1))
    );

    const maxReferralDiscount = Math.min(
      100,
      Math.max(
        0,
        Number(form.maximumReferralDiscountPercent || 0)
      )
    );

    const freeShippingThreshold = Math.max(
      0,
      Number(form.freeShippingThreshold || 0)
    );

    const shippingCost = Math.max(
      0,
      Number(form.defaultShippingCost || 0)
    );

    const packagingCost = Math.max(
      0,
      Number(form.defaultPackagingCost || 0)
    );

    const minimumMarginWarning = Math.min(
      100,
      Math.max(
        0,
        Number(form.minimumMarginWarningPercent || 0)
      )
    );

    const criticalMargin = Math.min(
      100,
      Math.max(
        0,
        Number(form.criticalMarginPercent || 0)
      )
    );

    if (criticalMargin > minimumMarginWarning) {
      alert(
        "Critical margin must be less than or equal to the warning margin."
      );
      return;
    }

    const campaignPriority = Math.floor(
      Number(form.defaultCampaignPriority || 0)
    );

    setSaving(true);

    try {
      const { data, error } = await supabase
        .from("marketing_rules")
        .update({
          rule_name:
            form.ruleName.trim() || "PugPep Marketing Rules",

          rewards_enabled: form.rewardsEnabled,
          allow_rewards_on_sale_items:
            form.allowRewardsOnSaleItems,
          earn_rewards_on_sale_orders:
            form.earnRewardsOnSaleOrders,

          general_promos_enabled:
            form.generalPromosEnabled,
          allow_general_promos_on_sale_items:
            form.allowGeneralPromosOnSaleItems,
          allow_multiple_general_promos:
            form.allowMultipleGeneralPromos,

          sales_rep_codes_enabled:
            form.salesRepCodesEnabled,
          sales_rep_discount_first_order_only:
            form.salesRepDiscountFirstOrderOnly,
          allow_sales_rep_discount_on_sale_items:
            form.allowSalesRepDiscountOnSaleItems,
          preserve_sales_rep_attribution_when_discount_blocked:
            form.preserveSalesRepAttributionWhenDiscountBlocked,
          default_sales_rep_commission_percent:
            commissionPercent,

          referral_program_enabled:
            form.referralProgramEnabled,
          referral_required_paid_orders:
            requiredPaidOrders,
          allow_referral_discount_on_sale_items:
            form.allowReferralDiscountOnSaleItems,
          maximum_referral_discount_percent:
            maxReferralDiscount,

          free_shipping_threshold:
            freeShippingThreshold,
          lifetime_free_shipping_enabled:
            form.lifetimeFreeShippingEnabled,
          default_shipping_cost:
            shippingCost,
          default_packaging_cost:
            packagingCost,

          minimum_margin_warning_percent:
            minimumMarginWarning,
          critical_margin_percent:
            criticalMargin,

          default_campaign_priority:
            campaignPriority,
          default_campaign_status:
            form.defaultCampaignStatus,
          allow_storewide_campaigns:
            form.allowStorewideCampaigns,
        })
        .eq("id", ruleId)
        .select("id, updated_at")
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error("The marketing rules were not updated.");
      }

      setLastUpdated(data.updated_at);
      alert("Marketing rules saved.");
    } catch (error) {
      console.error("Unable to save marketing rules:", error);
      alert(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main style={styles.page}>
        Loading Marketing Rules...
      </main>
    );
  }

  if (!authorized) {
    return (
      <main style={styles.page}>
        <h1 style={styles.title}>Access Denied</h1>
        <p>You must be logged in as the administrator.</p>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.topBar}>
        <Link href="/admin/promotions" style={styles.backLink}>
          ← Marketing Center
        </Link>

        <Link
          href="/admin/promotions/simulator"
          style={styles.secondaryLink}
        >
          Profit Simulator
        </Link>
      </div>

      <header style={styles.header}>
        <p style={styles.eyebrow}>MARKETING CENTER</p>

        <h1 style={styles.title}>Marketing Rules</h1>

        <p style={styles.subtitle}>
          Configure the default business rules used by campaigns,
          checkout, referrals, rewards, shipping, and profit warnings.
        </p>
      </header>

      <section style={styles.notice}>
        These settings are stored in the database. The unified pricing
        engine will use them as its default rules in a later phase.
      </section>

      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.heading}>General Settings</h2>

            <p style={styles.helpText}>
              {lastUpdated
                ? `Last updated ${new Date(
                    lastUpdated
                  ).toLocaleString()}`
                : "No update date available"}
            </p>
          </div>
        </div>

        <label style={styles.label}>
          Rule set name
          <input
            value={form.ruleName}
            onChange={(event) =>
              updateForm("ruleName", event.target.value)
            }
            style={styles.input}
          />
        </label>
      </section>

      <section style={styles.section}>
        <h2 style={styles.heading}>Rewards</h2>

        <div style={styles.toggleGrid}>
          <Toggle
            label="Rewards enabled"
            description="Allow customers to use the rewards system."
            checked={form.rewardsEnabled}
            onChange={(checked) =>
              updateForm("rewardsEnabled", checked)
            }
          />

          <Toggle
            label="Allow rewards on sale items"
            description="Allow reward discounts to stack with campaign pricing."
            checked={form.allowRewardsOnSaleItems}
            onChange={(checked) =>
              updateForm("allowRewardsOnSaleItems", checked)
            }
          />

          <Toggle
            label="Earn rewards on sale orders"
            description="Award reward points when a customer purchases sale items."
            checked={form.earnRewardsOnSaleOrders}
            onChange={(checked) =>
              updateForm("earnRewardsOnSaleOrders", checked)
            }
          />
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.heading}>General Promo Codes</h2>

        <div style={styles.toggleGrid}>
          <Toggle
            label="General promo codes enabled"
            description="Allow standard promo codes at checkout."
            checked={form.generalPromosEnabled}
            onChange={(checked) =>
              updateForm("generalPromosEnabled", checked)
            }
          />

          <Toggle
            label="Allow promo codes on sale items"
            description="Allow standard promo codes to stack with campaign pricing."
            checked={form.allowGeneralPromosOnSaleItems}
            onChange={(checked) =>
              updateForm(
                "allowGeneralPromosOnSaleItems",
                checked
              )
            }
          />

          <Toggle
            label="Allow multiple promo codes"
            description="Permit more than one general promo code on the same order."
            checked={form.allowMultipleGeneralPromos}
            onChange={(checked) =>
              updateForm("allowMultipleGeneralPromos", checked)
            }
          />
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.heading}>Sales Representatives</h2>

        <div style={styles.toggleGrid}>
          <Toggle
            label="Sales-rep codes enabled"
            description="Allow sales-rep codes and customer attribution."
            checked={form.salesRepCodesEnabled}
            onChange={(checked) =>
              updateForm("salesRepCodesEnabled", checked)
            }
          />

          <Toggle
            label="First-order discount only"
            description="Limit the sales-rep discount to a customer's first order."
            checked={form.salesRepDiscountFirstOrderOnly}
            onChange={(checked) =>
              updateForm(
                "salesRepDiscountFirstOrderOnly",
                checked
              )
            }
          />

          <Toggle
            label="Allow rep discount on sale items"
            description="Allow the first-order rep discount to stack with campaigns."
            checked={form.allowSalesRepDiscountOnSaleItems}
            onChange={(checked) =>
              updateForm(
                "allowSalesRepDiscountOnSaleItems",
                checked
              )
            }
          />

          <Toggle
            label="Preserve attribution when discount is blocked"
            description="Still assign the customer to the rep even when no rep discount applies."
            checked={
              form.preserveSalesRepAttributionWhenDiscountBlocked
            }
            onChange={(checked) =>
              updateForm(
                "preserveSalesRepAttributionWhenDiscountBlocked",
                checked
              )
            }
          />
        </div>

        <div style={styles.formGrid}>
          <label style={styles.label}>
            Default commission %
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.defaultSalesRepCommissionPercent}
              onChange={(event) =>
                updateForm(
                  "defaultSalesRepCommissionPercent",
                  event.target.value
                )
              }
              style={styles.input}
            />
          </label>
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.heading}>Referral Program</h2>

        <div style={styles.toggleGrid}>
          <Toggle
            label="Referral program enabled"
            description="Allow referral tracking and lifetime referral discounts."
            checked={form.referralProgramEnabled}
            onChange={(checked) =>
              updateForm("referralProgramEnabled", checked)
            }
          />

          <Toggle
            label="Allow referral discount on sale items"
            description="Allow lifetime referral discounts to stack with campaigns."
            checked={form.allowReferralDiscountOnSaleItems}
            onChange={(checked) =>
              updateForm(
                "allowReferralDiscountOnSaleItems",
                checked
              )
            }
          />
        </div>

        <div style={styles.formGrid}>
          <label style={styles.label}>
            Required paid orders
            <input
              type="number"
              min="1"
              step="1"
              value={form.referralRequiredPaidOrders}
              onChange={(event) =>
                updateForm(
                  "referralRequiredPaidOrders",
                  event.target.value
                )
              }
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Maximum referral discount %
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.maximumReferralDiscountPercent}
              onChange={(event) =>
                updateForm(
                  "maximumReferralDiscountPercent",
                  event.target.value
                )
              }
              style={styles.input}
            />
          </label>
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.heading}>Shipping & Packaging</h2>

        <div style={styles.toggleGrid}>
          <Toggle
            label="Lifetime free shipping enabled"
            description="Honor lifetime free-shipping customer accounts."
            checked={form.lifetimeFreeShippingEnabled}
            onChange={(checked) =>
              updateForm(
                "lifetimeFreeShippingEnabled",
                checked
              )
            }
          />
        </div>

        <div style={styles.formGrid}>
          <label style={styles.label}>
            Free-shipping threshold
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.freeShippingThreshold}
              onChange={(event) =>
                updateForm(
                  "freeShippingThreshold",
                  event.target.value
                )
              }
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Default shipping cost
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.defaultShippingCost}
              onChange={(event) =>
                updateForm(
                  "defaultShippingCost",
                  event.target.value
                )
              }
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Default packaging cost
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.defaultPackagingCost}
              onChange={(event) =>
                updateForm(
                  "defaultPackagingCost",
                  event.target.value
                )
              }
              style={styles.input}
            />
          </label>
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.heading}>Profit Warnings</h2>

        <div style={styles.formGrid}>
          <label style={styles.label}>
            Low-margin warning %
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.minimumMarginWarningPercent}
              onChange={(event) =>
                updateForm(
                  "minimumMarginWarningPercent",
                  event.target.value
                )
              }
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Critical margin %
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.criticalMarginPercent}
              onChange={(event) =>
                updateForm(
                  "criticalMarginPercent",
                  event.target.value
                )
              }
              style={styles.input}
            />
          </label>
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.heading}>Campaign Defaults</h2>

        <div style={styles.toggleGrid}>
          <Toggle
            label="Allow storewide campaigns"
            description="Permit campaigns that apply across the full catalog."
            checked={form.allowStorewideCampaigns}
            onChange={(checked) =>
              updateForm("allowStorewideCampaigns", checked)
            }
          />
        </div>

        <div style={styles.formGrid}>
          <label style={styles.label}>
            Default campaign priority
            <input
              type="number"
              step="1"
              value={form.defaultCampaignPriority}
              onChange={(event) =>
                updateForm(
                  "defaultCampaignPriority",
                  event.target.value
                )
              }
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Default campaign status
            <select
              value={form.defaultCampaignStatus}
              onChange={(event) =>
                updateForm(
                  "defaultCampaignStatus",
                  event.target.value as
                    | "draft"
                    | "scheduled"
                    | "active"
                )
              }
              style={styles.input}
            >
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="active">Active</option>
            </select>
          </label>
        </div>
      </section>

      <div style={styles.saveBar}>
        <button
          type="button"
          disabled={saving || !ruleId}
          onClick={() => void saveRules()}
          style={{
            ...styles.saveButton,
            opacity: saving || !ruleId ? 0.65 : 1,
            cursor:
              saving || !ruleId
                ? "not-allowed"
                : "pointer",
          }}
        >
          {saving ? "Saving Rules..." : "Save Marketing Rules"}
        </button>
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
  onChange: (checked: boolean) => void;
}) {
  return (
    <label style={styles.toggleCard}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onChange(event.target.checked)
        }
        style={styles.checkbox}
      />

      <span>
        <strong
          style={{
            ...styles.toggleTitle,
            color: checked ? "#00ff99" : "#ffffff",
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

const styles = {
  page: {
    minHeight: "100vh",
    padding: "clamp(15px, 3vw, 32px)",
    paddingBottom: "110px",
    background: "#000000",
    color: "#ffffff",
    fontSize: "16px",
    lineHeight: 1.5,
  },

  topBar: {
    maxWidth: "1100px",
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap" as const,
  },

  backLink: {
    color: "#00d9ff",
    textDecoration: "none",
    fontWeight: "bold",
  },

  secondaryLink: {
    color: "#dddddd",
    textDecoration: "none",
    border: "1px solid #555555",
    borderRadius: "10px",
    padding: "10px 14px",
    fontWeight: "bold",
  },

  header: {
    maxWidth: "1100px",
    margin: "26px auto 0",
  },

  eyebrow: {
    margin: 0,
    color: "#888888",
    fontSize: "13px",
    fontWeight: "bold",
    letterSpacing: "1.2px",
  },

  title: {
    margin: "7px 0 8px",
    color: "#ff45d8",
    fontSize: "clamp(32px, 7vw, 50px)",
    lineHeight: 1.08,
  },

  subtitle: {
    margin: 0,
    color: "#bdbdbd",
    fontSize: "17px",
    lineHeight: 1.65,
    maxWidth: "900px",
  },

  notice: {
    maxWidth: "1100px",
    margin: "20px auto 0",
    padding: "15px",
    border: "1px solid #2f6570",
    borderRadius: "12px",
    background: "rgba(0,217,255,.07)",
    color: "#d7f8ff",
    lineHeight: 1.65,
  },

  section: {
    maxWidth: "1100px",
    margin: "22px auto 0",
    padding: "clamp(15px, 3vw, 24px)",
    border: "1px solid #333333",
    borderRadius: "16px",
    background: "#111111",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "14px",
    flexWrap: "wrap" as const,
  },

  heading: {
    marginTop: 0,
    marginBottom: "12px",
    color: "#00d9ff",
    fontSize: "clamp(22px, 4vw, 29px)",
  },

  helpText: {
    margin: 0,
    color: "#999999",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
    gap: "14px",
    marginTop: "16px",
  },

  label: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "9px",
    color: "#f2f2f2",
    fontWeight: "bold",
  },

  input: {
    width: "100%",
    minHeight: "50px",
    boxSizing: "border-box" as const,
    padding: "12px 13px",
    background: "#080808",
    color: "#ffffff",
    border: "1px solid #555555",
    borderRadius: "10px",
    fontSize: "16px",
  },

  toggleGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
    gap: "12px",
  },

  toggleCard: {
    minHeight: "92px",
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    padding: "15px",
    border: "1px solid #3a3a3a",
    borderRadius: "12px",
    background: "#080808",
    cursor: "pointer",
  },

  checkbox: {
    width: "22px",
    height: "22px",
    minWidth: "22px",
    marginTop: "2px",
    accentColor: "#00ff99",
    cursor: "pointer",
  },

  toggleTitle: {
    display: "block",
    fontSize: "16px",
    lineHeight: 1.35,
  },

  toggleDescription: {
    display: "block",
    marginTop: "5px",
    color: "#aaaaaa",
    fontSize: "14px",
    lineHeight: 1.55,
  },

  saveBar: {
    position: "fixed" as const,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    padding: "12px clamp(15px, 3vw, 32px)",
    borderTop: "1px solid #333333",
    background: "rgba(5,5,5,.96)",
    backdropFilter: "blur(12px)",
  },

  saveButton: {
    width: "min(1100px, 100%)",
    minHeight: "54px",
    display: "block",
    margin: "0 auto",
    padding: "13px 18px",
    border: "none",
    borderRadius: "11px",
    background:
      "linear-gradient(90deg, #00b7ff, #ff2fd0)",
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: "bold",
  },
};