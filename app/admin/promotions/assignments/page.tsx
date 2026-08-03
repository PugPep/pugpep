"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../../../lib/supabaseClient";

const ADMIN_EMAIL = "pugpep99@gmail.com";

type CampaignType = "percent" | "fixed" | "buy_x_get_y";

type Campaign = {
  id: string;
  name: string;
  campaign_type: CampaignType;
  discount_value: number;
  buy_quantity: number | null;
  get_quantity: number | null;
  is_storewide: boolean;
  is_active: boolean;
};

type Product = {
  id: string;
  name: string;
  slug: string;
};

type ProductOption = {
  id: string;
  product_slug: string;
  dosage: string;
  purchase_type: string;
  price: number;
  cost: number;
  status: string;
};

type Assignment = {
  id: string;
  sale_campaign_id: string;
  product_option_id: string;
  discount_value_override: number | null;
  buy_quantity_override: number | null;
  get_quantity_override: number | null;
  is_active: boolean;
};

type Draft = {
  selected: boolean;
  discountOverride: string;
  buyOverride: string;
  getOverride: string;
};

function money(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function getCampaignLabel(campaign: Campaign) {
  if (campaign.campaign_type === "percent") {
    return `${Number(campaign.discount_value || 0)}% off`;
  }

  if (campaign.campaign_type === "fixed") {
    return `${money(campaign.discount_value)} off`;
  }

  return `Buy ${campaign.buy_quantity || 0}, get ${
    campaign.get_quantity || 0
  } free`;
}

function calculateOption(
  campaign: Campaign,
  option: ProductOption,
  draft: Draft
) {
  const regular = Math.max(0, Number(option.price || 0));
  const cost = Math.max(0, Number(option.cost || 0));

  let salePrice = regular;

  if (campaign.campaign_type === "percent") {
    const percent =
      draft.discountOverride.trim() === ""
        ? Number(campaign.discount_value || 0)
        : Number(draft.discountOverride || 0);

    salePrice =
      Math.round(
        regular * (1 - Math.min(100, Math.max(0, percent)) / 100) * 100
      ) / 100;
  }

  if (campaign.campaign_type === "fixed") {
    const fixed =
      draft.discountOverride.trim() === ""
        ? Number(campaign.discount_value || 0)
        : Number(draft.discountOverride || 0);

    salePrice = Math.max(
      0,
      Math.round((regular - Math.max(0, fixed)) * 100) / 100
    );
  }

  if (campaign.campaign_type === "buy_x_get_y") {
    const buy =
      draft.buyOverride.trim() === ""
        ? Number(campaign.buy_quantity || 1)
        : Math.max(1, Math.floor(Number(draft.buyOverride || 1)));

    const get =
      draft.getOverride.trim() === ""
        ? Number(campaign.get_quantity || 1)
        : Math.max(1, Math.floor(Number(draft.getOverride || 1)));

    salePrice =
      buy + get > 0
        ? Math.round(((regular * buy) / (buy + get)) * 100) / 100
        : regular;
  }

  const discount = Math.max(0, regular - salePrice);
  const profit = salePrice - cost;
  const margin = salePrice > 0 ? (profit / salePrice) * 100 : 0;

  return {
    regular,
    cost,
    salePrice,
    discount,
    profit,
    margin,
  };
}

export default function PromotionAssignmentsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [saving, setSaving] = useState(false);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  const [shippingCost, setShippingCost] = useState("8");
  const [packagingCost, setPackagingCost] = useState("3");

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

      const [campaignResult, productResult, optionResult, assignmentResult] =
        await Promise.all([
          supabase
            .from("sale_campaigns")
            .select(
              "id,name,campaign_type,discount_value,buy_quantity,get_quantity,is_storewide,is_active"
            )
            .order("name", { ascending: true }),

          supabase
            .from("products")
            .select("id,name,slug")
            .eq("is_active", true)
            .order("name", { ascending: true }),

          supabase
            .from("product_options")
            .select(
              "id,product_slug,dosage,purchase_type,price,cost,status"
            )
            .order("product_slug", { ascending: true })
            .order("dosage", { ascending: true }),

          supabase
            .from("sale_campaign_products")
            .select("*")
            .order("created_at", { ascending: true }),
        ]);

      if (campaignResult.error) alert(campaignResult.error.message);
      if (productResult.error) alert(productResult.error.message);
      if (optionResult.error) alert(optionResult.error.message);
      if (assignmentResult.error) alert(assignmentResult.error.message);

      setCampaigns((campaignResult.data || []) as Campaign[]);
      setProducts((productResult.data || []) as Product[]);
      setOptions((optionResult.data || []) as ProductOption[]);
      setAssignments((assignmentResult.data || []) as Assignment[]);

      setLoading(false);
    }

    void initialize();
  }, [supabase]);

  const selectedCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === selectedCampaignId),
    [campaigns, selectedCampaignId]
  );

  const productBySlug = useMemo(() => {
    const map = new Map<string, Product>();

    products.forEach((product) => {
      map.set(product.slug, product);
    });

    return map;
  }, [products]);

  const visibleOptions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return options.filter((option) => {
      const product = productBySlug.get(option.product_slug);

      const searchable = [
        product?.name || "",
        option.product_slug,
        option.dosage,
        option.purchase_type,
      ]
        .join(" ")
        .toLowerCase();

      return !query || searchable.includes(query);
    });
  }, [options, productBySlug, search]);

  const groupedOptions = useMemo(() => {
    const groups = new Map<string, ProductOption[]>();

    visibleOptions.forEach((option) => {
      const group = groups.get(option.product_slug) || [];
      group.push(option);
      groups.set(option.product_slug, group);
    });

    return Array.from(groups.entries()).sort((a, b) => {
      const aName = productBySlug.get(a[0])?.name || a[0];
      const bName = productBySlug.get(b[0])?.name || b[0];
      return aName.localeCompare(bName);
    });
  }, [visibleOptions, productBySlug]);

  const selectedOptions = useMemo(
    () => options.filter((option) => drafts[option.id]?.selected),
    [options, drafts]
  );

  const totals = useMemo(() => {
    if (!selectedCampaign) {
      return {
        regular: 0,
        sale: 0,
        discount: 0,
        productCost: 0,
        profit: 0,
        margin: 0,
      };
    }

    const subtotal = selectedOptions.reduce(
      (sum, option) => {
        const preview = calculateOption(
          selectedCampaign,
          option,
          drafts[option.id]
        );

        sum.regular += preview.regular;
        sum.sale += preview.salePrice;
        sum.discount += preview.discount;
        sum.productCost += preview.cost;
        sum.profit += preview.profit;

        return sum;
      },
      {
        regular: 0,
        sale: 0,
        discount: 0,
        productCost: 0,
        profit: 0,
      }
    );

    const finalProfit =
      subtotal.profit -
      Math.max(0, Number(shippingCost || 0)) -
      Math.max(0, Number(packagingCost || 0));

    const margin =
      subtotal.sale > 0 ? (finalProfit / subtotal.sale) * 100 : 0;

    return {
      ...subtotal,
      profit: finalProfit,
      margin,
    };
  }, [
    selectedCampaign,
    selectedOptions,
    drafts,
    shippingCost,
    packagingCost,
  ]);

  function selectCampaign(campaignId: string) {
    setSelectedCampaignId(campaignId);

    const nextDrafts: Record<string, Draft> = {};

    options.forEach((option) => {
      const assignment = assignments.find(
        (row) =>
          row.sale_campaign_id === campaignId &&
          row.product_option_id === option.id
      );

      nextDrafts[option.id] = {
        selected: Boolean(assignment?.is_active),

        discountOverride:
          assignment?.discount_value_override == null
            ? ""
            : String(assignment.discount_value_override),

        buyOverride:
          assignment?.buy_quantity_override == null
            ? ""
            : String(assignment.buy_quantity_override),

        getOverride:
          assignment?.get_quantity_override == null
            ? ""
            : String(assignment.get_quantity_override),
      };
    });

    setDrafts(nextDrafts);
    setSearch("");
  }

  function updateDraft(optionId: string, patch: Partial<Draft>) {
    setDrafts((current) => ({
      ...current,

      [optionId]: {
        selected: current[optionId]?.selected || false,
        discountOverride: current[optionId]?.discountOverride || "",
        buyOverride: current[optionId]?.buyOverride || "",
        getOverride: current[optionId]?.getOverride || "",
        ...patch,
      },
    }));
  }

  function toggleWholeProduct(productSlug: string, selected: boolean) {
    setDrafts((current) => {
      const next = { ...current };

      options
        .filter((option) => option.product_slug === productSlug)
        .forEach((option) => {
          next[option.id] = {
            selected,
            discountOverride: next[option.id]?.discountOverride || "",
            buyOverride: next[option.id]?.buyOverride || "",
            getOverride: next[option.id]?.getOverride || "",
          };
        });

      return next;
    });
  }

  async function saveAssignments() {
    if (!selectedCampaign || saving) {
      return;
    }

    setSaving(true);

    try {
      const currentAssignments = assignments.filter(
        (assignment) =>
          assignment.sale_campaign_id === selectedCampaign.id
      );

      const selectedIds = new Set(
        options
          .filter((option) => drafts[option.id]?.selected)
          .map((option) => option.id)
      );

      for (const option of options) {
        const draft = drafts[option.id];

        if (!draft?.selected) {
          continue;
        }

        const { error } = await supabase.rpc(
          "admin_assign_product_option_to_campaign",
          {
            p_sale_campaign_id: selectedCampaign.id,
            p_product_option_id: option.id,

            p_discount_value_override:
              draft.discountOverride.trim() === ""
                ? null
                : Number(draft.discountOverride),

            p_buy_quantity_override:
              draft.buyOverride.trim() === ""
                ? null
                : Math.max(
                    1,
                    Math.floor(Number(draft.buyOverride || 1))
                  ),

            p_get_quantity_override:
              draft.getOverride.trim() === ""
                ? null
                : Math.max(
                    1,
                    Math.floor(Number(draft.getOverride || 1))
                  ),
          }
        );

        if (error) {
          throw error;
        }
      }

      for (const assignment of currentAssignments) {
        if (selectedIds.has(assignment.product_option_id)) {
          continue;
        }

        const { error } = await supabase.rpc(
          "admin_remove_product_option_from_campaign",
          {
            p_sale_campaign_id: selectedCampaign.id,
            p_product_option_id: assignment.product_option_id,
          }
        );

        if (error) {
          throw error;
        }
      }

      const { data, error } = await supabase
        .from("sale_campaign_products")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        throw error;
      }

      setAssignments((data || []) as Assignment[]);

      alert("Campaign product assignments saved.");
    } catch (error) {
      console.error("Unable to save assignments:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Unable to save product assignments."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main style={styles.page}>
        Loading Product Assignments...
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
          href="/admin/promotions/campaigns"
          style={styles.secondaryLink}
        >
          Campaigns
        </Link>
      </div>

      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>MARKETING CENTER</p>

          <h1 style={styles.title}>Product Assignments</h1>

          <p style={styles.subtitle}>
            Assign exact dosages, singles, and kits to a campaign.
          </p>
        </div>
      </header>

      <section style={styles.section}>
        <div style={styles.topGrid}>
          <label style={styles.label}>
            Campaign
            <select
              value={selectedCampaignId}
              onChange={(event) => selectCampaign(event.target.value)}
              style={styles.input}
            >
              <option value="">Select a campaign</option>

              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name} — {getCampaignLabel(campaign)}
                </option>
              ))}
            </select>
          </label>

          <label style={styles.label}>
            Estimated shipping cost
            <input
              type="number"
              min="0"
              step="0.01"
              value={shippingCost}
              onChange={(event) => setShippingCost(event.target.value)}
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Estimated packaging cost
            <input
              type="number"
              min="0"
              step="0.01"
              value={packagingCost}
              onChange={(event) => setPackagingCost(event.target.value)}
              style={styles.input}
            />
          </label>
        </div>

        {selectedCampaign && (
          <>
            <div style={styles.notice}>
              This preview treats each selected product option as one unit.
              Shipping and packaging are deducted once from the combined
              preview.
            </div>

            <div style={styles.summaryGrid}>
              <Summary label="Selected Options" value={selectedOptions.length} />
              <Summary label="Regular Revenue" value={money(totals.regular)} />
              <Summary label="Sale Revenue" value={money(totals.sale)} />
              <Summary label="Sale Discount" value={money(totals.discount)} />
              <Summary label="Product Cost" value={money(totals.productCost)} />
              <Summary
                label="Projected Profit"
                value={money(totals.profit)}
                danger={totals.profit < 0}
              />
              <Summary
                label="Projected Margin"
                value={`${totals.margin.toFixed(1)}%`}
                danger={totals.margin < 15}
                warning={totals.margin >= 15 && totals.margin < 30}
              />
            </div>

            {selectedOptions.length > 0 && totals.margin < 15 && (
              <div style={styles.dangerBox}>
                Warning: projected margin is below 15% after estimated shipping
                and packaging.
              </div>
            )}

            <label style={styles.label}>
              Search products
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search product, dosage, or purchase type"
                style={styles.input}
              />
            </label>

            <div style={styles.groups}>
              {groupedOptions.map(([productSlug, productOptions]) => {
                const product = productBySlug.get(productSlug);

                const allSelected = productOptions.every(
                  (option) => drafts[option.id]?.selected
                );

                return (
                  <section key={productSlug} style={styles.group}>
                    <div style={styles.groupHeader}>
                      <div>
                        <h2 style={styles.productName}>
                          {product?.name || productSlug}
                        </h2>

                        <div style={styles.slug}>{productSlug}</div>
                      </div>

                      <label style={styles.selectAll}>
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={(event) =>
                            toggleWholeProduct(
                              productSlug,
                              event.target.checked
                            )
                          }
                          style={styles.checkbox}
                        />

                        Select all options
                      </label>
                    </div>

                    <div style={styles.optionGrid}>
                      {productOptions.map((option) => {
                        const draft = drafts[option.id] || {
                          selected: false,
                          discountOverride: "",
                          buyOverride: "",
                          getOverride: "",
                        };

                        const preview = calculateOption(
                          selectedCampaign,
                          option,
                          draft
                        );

                        const negative = preview.profit < 0;
                        const lowMargin = preview.margin < 20;

                        return (
                          <article
                            key={option.id}
                            style={{
                              ...styles.optionCard,
                              borderColor: draft.selected
                                ? negative
                                  ? "#ff4d4d"
                                  : lowMargin
                                  ? "#ffcc00"
                                  : "#00ff99"
                                : "#3a3a3a",
                            }}
                          >
                            <label style={styles.optionTitle}>
                              <input
                                type="checkbox"
                                checked={draft.selected}
                                onChange={(event) =>
                                  updateDraft(option.id, {
                                    selected: event.target.checked,
                                  })
                                }
                                style={styles.checkbox}
                              />

                              <strong>
                                {option.dosage} · {option.purchase_type}
                              </strong>
                            </label>

                            <div style={styles.metrics}>
                              <span>Regular: {money(preview.regular)}</span>
                              <span>Cost: {money(preview.cost)}</span>
                              <span>Sale: {money(preview.salePrice)}</span>
                              <span>Profit: {money(preview.profit)}</span>

                              <strong
                                style={{
                                  color: negative
                                    ? "#ff4d4d"
                                    : lowMargin
                                    ? "#ffcc00"
                                    : "#00ff99",
                                }}
                              >
                                Margin: {preview.margin.toFixed(1)}%
                              </strong>
                            </div>

                            {selectedCampaign.campaign_type !==
                            "buy_x_get_y" ? (
                              <label style={styles.smallLabel}>
                                Override discount
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={draft.discountOverride}
                                  onChange={(event) =>
                                    updateDraft(option.id, {
                                      discountOverride: event.target.value,
                                    })
                                  }
                                  placeholder="Use campaign default"
                                  style={styles.smallInput}
                                />
                              </label>
                            ) : (
                              <div style={styles.overrideGrid}>
                                <label style={styles.smallLabel}>
                                  Buy override
                                  <input
                                    type="number"
                                    min="1"
                                    value={draft.buyOverride}
                                    onChange={(event) =>
                                      updateDraft(option.id, {
                                        buyOverride: event.target.value,
                                      })
                                    }
                                    placeholder="Default"
                                    style={styles.smallInput}
                                  />
                                </label>

                                <label style={styles.smallLabel}>
                                  Free override
                                  <input
                                    type="number"
                                    min="1"
                                    value={draft.getOverride}
                                    onChange={(event) =>
                                      updateDraft(option.id, {
                                        getOverride: event.target.value,
                                      })
                                    }
                                    placeholder="Default"
                                    style={styles.smallInput}
                                  />
                                </label>
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>

            <div style={styles.saveBar}>
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveAssignments()}
                style={{
                  ...styles.saveButton,
                  opacity: saving ? 0.65 : 1,
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Saving..." : "Save Product Assignments"}
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function Summary({
  label,
  value,
  danger = false,
  warning = false,
}: {
  label: string;
  value: string | number;
  danger?: boolean;
  warning?: boolean;
}) {
  return (
    <div style={styles.summaryCard}>
      <span style={styles.summaryLabel}>{label}</span>

      <strong
        style={{
          ...styles.summaryValue,
          color: danger ? "#ff4d4d" : warning ? "#ffcc00" : "#00d9ff",
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
    padding: "clamp(15px, 3vw, 32px)",
    background: "#000000",
    color: "#ffffff",
    fontSize: "16px",
    lineHeight: 1.5,
  },

  topBar: {
    maxWidth: "1200px",
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
    maxWidth: "1200px",
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
  },

  section: {
    maxWidth: "1200px",
    margin: "24px auto 0",
    padding: "clamp(15px, 3vw, 24px)",
    border: "1px solid #333333",
    borderRadius: "16px",
    background: "#111111",
  },

  topGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(min(100%, 250px), 1fr))",
    gap: "14px",
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

  notice: {
    marginTop: "18px",
    padding: "15px",
    border: "1px solid #2f6570",
    borderRadius: "12px",
    background: "rgba(0,217,255,.07)",
    color: "#d7f8ff",
    lineHeight: 1.65,
  },

  summaryGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(min(100%, 170px), 1fr))",
    gap: "12px",
    margin: "18px 0",
  },

  summaryCard: {
    minHeight: "88px",
    padding: "16px",
    display: "grid",
    alignContent: "center",
    gap: "7px",
    border: "1px solid #383838",
    borderRadius: "12px",
    background: "#080808",
  },

  summaryLabel: {
    color: "#aaaaaa",
    fontSize: "13px",
    fontWeight: "bold",
    textTransform: "uppercase" as const,
  },

  summaryValue: {
    fontSize: "clamp(23px, 4vw, 29px)",
    lineHeight: 1.1,
  },

  dangerBox: {
    marginBottom: "18px",
    padding: "16px",
    border: "1px solid #ff4d4d",
    borderRadius: "10px",
    background: "rgba(255,77,77,.08)",
    color: "#ff9999",
    fontWeight: "bold",
  },

  groups: {
    display: "grid",
    gap: "18px",
    marginTop: "20px",
  },

  group: {
    padding: "clamp(14px, 3vw, 18px)",
    border: "1px solid #3a3a3a",
    borderRadius: "13px",
    background: "#080808",
  },

  groupHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap" as const,
    marginBottom: "15px",
  },

  productName: {
    margin: 0,
    color: "#ff45d8",
    fontSize: "clamp(21px, 4vw, 26px)",
  },

  slug: {
    marginTop: "4px",
    color: "#999999",
    fontSize: "14px",
  },

  selectAll: {
    minHeight: "44px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  checkbox: {
    width: "22px",
    height: "22px",
    minWidth: "22px",
    accentColor: "#00ff99",
    cursor: "pointer",
  },

  optionGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
    gap: "13px",
  },

  optionCard: {
    padding: "16px",
    border: "1px solid #3a3a3a",
    borderRadius: "11px",
    background: "#050505",
  },

  optionTitle: {
    minHeight: "44px",
    display: "flex",
    alignItems: "center",
    gap: "11px",
    color: "#00d9ff",
    fontSize: "17px",
    cursor: "pointer",
  },

  metrics: {
    display: "grid",
    gap: "7px",
    margin: "13px 0",
    color: "#dddddd",
    fontSize: "15px",
  },

  smallLabel: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "7px",
    color: "#dddddd",
    fontSize: "15px",
    fontWeight: "bold",
  },

  smallInput: {
    width: "100%",
    minHeight: "46px",
    boxSizing: "border-box" as const,
    padding: "10px 11px",
    background: "#050505",
    color: "#ffffff",
    border: "1px solid #555555",
    borderRadius: "9px",
    fontSize: "16px",
  },

  overrideGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(125px, 1fr))",
    gap: "10px",
  },

  saveBar: {
    position: "sticky" as const,
    bottom: "0",
    marginTop: "20px",
    padding: "12px 0 0",
    background:
      "linear-gradient(180deg, transparent, #111111 30%)",
  },

  saveButton: {
    width: "100%",
    minHeight: "54px",
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