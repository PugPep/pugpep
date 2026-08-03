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

type SimulatedLine = {
  option: ProductOption;
  productName: string;
  quantity: number;
  regularRevenue: number;
  saleRevenue: number;
  saleDiscount: number;
  productCost: number;
  profitBeforeOrderCosts: number;
  marginBeforeOrderCosts: number;
};

function money(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function percent(value: number) {
  return `${Number(value || 0).toFixed(1)}%`;
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

function calculateSaleUnitPrice(
  campaign: Campaign,
  option: ProductOption,
  assignment: Assignment | undefined
) {
  const regular = Math.max(0, Number(option.price || 0));

  if (campaign.campaign_type === "percent") {
    const discount =
      assignment?.discount_value_override == null
        ? Number(campaign.discount_value || 0)
        : Number(assignment.discount_value_override || 0);

    return (
      Math.round(
        regular *
          (1 - Math.min(100, Math.max(0, discount)) / 100) *
          100
      ) / 100
    );
  }

  if (campaign.campaign_type === "fixed") {
    const discount =
      assignment?.discount_value_override == null
        ? Number(campaign.discount_value || 0)
        : Number(assignment.discount_value_override || 0);

    return Math.max(
      0,
      Math.round((regular - Math.max(0, discount)) * 100) / 100
    );
  }

  return regular;
}

function calculateBuyXGetYRevenue(
  regularUnitPrice: number,
  quantity: number,
  campaign: Campaign,
  assignment: Assignment | undefined
) {
  const buyQuantity =
    assignment?.buy_quantity_override == null
      ? Number(campaign.buy_quantity || 1)
      : Math.max(1, Number(assignment.buy_quantity_override || 1));

  const getQuantity =
    assignment?.get_quantity_override == null
      ? Number(campaign.get_quantity || 1)
      : Math.max(1, Number(assignment.get_quantity_override || 1));

  const groupSize = buyQuantity + getQuantity;

  if (groupSize <= 0 || quantity <= 0) {
    return regularUnitPrice * quantity;
  }

  const completeGroups = Math.floor(quantity / groupSize);
  const remainder = quantity % groupSize;
  const paidRemainder = Math.min(remainder, buyQuantity);

  const paidUnits =
    completeGroups * buyQuantity + paidRemainder;

  return regularUnitPrice * paidUnits;
}

export default function ProfitSimulatorPage() {
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [quantities, setQuantities] = useState<Record<string, string>>({});

  const [shippingCollected, setShippingCollected] = useState("0");
  const [shippingCost, setShippingCost] = useState("8");
  const [packagingCost, setPackagingCost] = useState("3");
  const [rewardsDiscount, setRewardsDiscount] = useState("0");
  const [referralDiscountPercent, setReferralDiscountPercent] =
    useState("0");
  const [promoDiscountPercent, setPromoDiscountPercent] = useState("0");
  const [salesRepDiscountPercent, setSalesRepDiscountPercent] =
    useState("0");
  const [salesRepCommissionPercent, setSalesRepCommissionPercent] =
    useState("20");
  const [otherDirectCost, setOtherDirectCost] = useState("0");

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
            .eq("is_active", true)
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

  const campaignAssignments = useMemo(
    () =>
      assignments.filter(
        (assignment) =>
          assignment.sale_campaign_id === selectedCampaignId
      ),
    [assignments, selectedCampaignId]
  );

  const assignedOptions = useMemo(() => {
    if (!selectedCampaign) {
      return [];
    }

    if (selectedCampaign.is_storewide) {
      return options;
    }

    const assignedIds = new Set(
      campaignAssignments.map(
        (assignment) => assignment.product_option_id
      )
    );

    return options.filter((option) => assignedIds.has(option.id));
  }, [
    selectedCampaign,
    options,
    campaignAssignments,
  ]);

  const simulatedLines = useMemo<SimulatedLine[]>(() => {
    if (!selectedCampaign) {
      return [];
    }

    return assignedOptions
      .map((option) => {
        const quantity = Math.max(
          0,
          Math.floor(Number(quantities[option.id] || 0))
        );

        if (quantity <= 0) {
          return null;
        }

        const assignment = campaignAssignments.find(
          (row) => row.product_option_id === option.id
        );

        const regularUnitPrice = Math.max(
          0,
          Number(option.price || 0)
        );

        const regularRevenue = regularUnitPrice * quantity;

        const saleRevenue =
          selectedCampaign.campaign_type === "buy_x_get_y"
            ? calculateBuyXGetYRevenue(
                regularUnitPrice,
                quantity,
                selectedCampaign,
                assignment
              )
            : calculateSaleUnitPrice(
                selectedCampaign,
                option,
                assignment
              ) * quantity;

        const saleDiscount = Math.max(
          0,
          regularRevenue - saleRevenue
        );

        const productCost =
          Math.max(0, Number(option.cost || 0)) * quantity;

        const profitBeforeOrderCosts =
          saleRevenue - productCost;

        const marginBeforeOrderCosts =
          saleRevenue > 0
            ? (profitBeforeOrderCosts / saleRevenue) * 100
            : 0;

        return {
          option,
          productName:
            productBySlug.get(option.product_slug)?.name ||
            option.product_slug,
          quantity,
          regularRevenue,
          saleRevenue,
          saleDiscount,
          productCost,
          profitBeforeOrderCosts,
          marginBeforeOrderCosts,
        };
      })
      .filter((line): line is SimulatedLine => Boolean(line));
  }, [
    selectedCampaign,
    assignedOptions,
    campaignAssignments,
    quantities,
    productBySlug,
  ]);

  const totals = useMemo(() => {
    const regularRevenue = simulatedLines.reduce(
      (sum, line) => sum + line.regularRevenue,
      0
    );

    const campaignSaleRevenue = simulatedLines.reduce(
      (sum, line) => sum + line.saleRevenue,
      0
    );

    const saleDiscount = simulatedLines.reduce(
      (sum, line) => sum + line.saleDiscount,
      0
    );

    const productCost = simulatedLines.reduce(
      (sum, line) => sum + line.productCost,
      0
    );

    const promoPercent = Math.min(
      100,
      Math.max(0, Number(promoDiscountPercent || 0))
    );

    const referralPercent = Math.min(
      100,
      Math.max(0, Number(referralDiscountPercent || 0))
    );

    const salesRepDiscountPercentValue = Math.min(
      100,
      Math.max(0, Number(salesRepDiscountPercent || 0))
    );

    const promoDiscount =
      campaignSaleRevenue * (promoPercent / 100);

    const referralDiscount =
      campaignSaleRevenue * (referralPercent / 100);

    const salesRepDiscount =
      campaignSaleRevenue *
      (salesRepDiscountPercentValue / 100);

    const rewards = Math.max(
      0,
      Number(rewardsDiscount || 0)
    );

    const merchandiseRevenueAfterDiscounts = Math.max(
      0,
      campaignSaleRevenue -
        promoDiscount -
        referralDiscount -
        salesRepDiscount -
        rewards
    );

    const shippingRevenue = Math.max(
      0,
      Number(shippingCollected || 0)
    );

    const netRevenue =
      merchandiseRevenueAfterDiscounts + shippingRevenue;

    const shippingExpense = Math.max(
      0,
      Number(shippingCost || 0)
    );

    const packagingExpense = Math.max(
      0,
      Number(packagingCost || 0)
    );

    const otherCost = Math.max(
      0,
      Number(otherDirectCost || 0)
    );

    const profitBeforeCommission =
      netRevenue -
      productCost -
      shippingExpense -
      packagingExpense -
      otherCost;

    const commissionPercent = Math.min(
      100,
      Math.max(0, Number(salesRepCommissionPercent || 0))
    );

    const salesRepCommission = Math.max(
      0,
      profitBeforeCommission * (commissionPercent / 100)
    );

    const finalProfit =
      profitBeforeCommission - salesRepCommission;

    const finalMargin =
      netRevenue > 0
        ? (finalProfit / netRevenue) * 100
        : 0;

    return {
      regularRevenue,
      campaignSaleRevenue,
      saleDiscount,
      promoDiscount,
      referralDiscount,
      salesRepDiscount,
      rewards,
      merchandiseRevenueAfterDiscounts,
      shippingRevenue,
      netRevenue,
      productCost,
      shippingExpense,
      packagingExpense,
      otherCost,
      profitBeforeCommission,
      salesRepCommission,
      finalProfit,
      finalMargin,
    };
  }, [
    simulatedLines,
    promoDiscountPercent,
    referralDiscountPercent,
    salesRepDiscountPercent,
    rewardsDiscount,
    shippingCollected,
    shippingCost,
    packagingCost,
    otherDirectCost,
    salesRepCommissionPercent,
  ]);

  const sortedByMargin = useMemo(
    () =>
      [...simulatedLines].sort(
        (a, b) =>
          a.marginBeforeOrderCosts - b.marginBeforeOrderCosts
      ),
    [simulatedLines]
  );

  function selectCampaign(campaignId: string) {
    setSelectedCampaignId(campaignId);

    const nextQuantities: Record<string, string> = {};

    const campaign = campaigns.find(
      (item) => item.id === campaignId
    );

    if (campaign) {
      const relevantOptions = campaign.is_storewide
        ? options
        : options.filter((option) =>
            assignments.some(
              (assignment) =>
                assignment.sale_campaign_id === campaignId &&
                assignment.product_option_id === option.id &&
                assignment.is_active
            )
          );

      relevantOptions.forEach((option) => {
        nextQuantities[option.id] = "1";
      });
    }

    setQuantities(nextQuantities);
  }

  if (loading) {
    return (
      <main style={styles.page}>
        Loading Profit Simulator...
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
          href="/admin/promotions/assignments"
          style={styles.secondaryLink}
        >
          Product Assignments
        </Link>
      </div>

      <header style={styles.header}>
        <p style={styles.eyebrow}>MARKETING CENTER</p>

        <h1 style={styles.title}>Profit Simulator</h1>

        <p style={styles.subtitle}>
          Model campaign profit after discounts, product cost,
          shipping, packaging, rewards, referrals, and commission.
        </p>
      </header>

      <section style={styles.section}>
        <div style={styles.formGrid}>
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
            Shipping collected
            <input
              type="number"
              min="0"
              step="0.01"
              value={shippingCollected}
              onChange={(event) =>
                setShippingCollected(event.target.value)
              }
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Actual shipping cost
            <input
              type="number"
              min="0"
              step="0.01"
              value={shippingCost}
              onChange={(event) =>
                setShippingCost(event.target.value)
              }
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Packaging cost
            <input
              type="number"
              min="0"
              step="0.01"
              value={packagingCost}
              onChange={(event) =>
                setPackagingCost(event.target.value)
              }
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Rewards discount
            <input
              type="number"
              min="0"
              step="0.01"
              value={rewardsDiscount}
              onChange={(event) =>
                setRewardsDiscount(event.target.value)
              }
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Referral discount %
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={referralDiscountPercent}
              onChange={(event) =>
                setReferralDiscountPercent(event.target.value)
              }
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Promo discount %
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={promoDiscountPercent}
              onChange={(event) =>
                setPromoDiscountPercent(event.target.value)
              }
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Sales-rep discount %
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={salesRepDiscountPercent}
              onChange={(event) =>
                setSalesRepDiscountPercent(event.target.value)
              }
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Sales-rep commission %
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={salesRepCommissionPercent}
              onChange={(event) =>
                setSalesRepCommissionPercent(event.target.value)
              }
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Other direct cost
            <input
              type="number"
              min="0"
              step="0.01"
              value={otherDirectCost}
              onChange={(event) =>
                setOtherDirectCost(event.target.value)
              }
              style={styles.input}
            />
          </label>
        </div>

        <div style={styles.notice}>
          This simulator does not change campaign pricing or customer
          orders. It is a planning tool only.
        </div>
      </section>

      {selectedCampaign && (
        <>
          <section style={styles.section}>
            <h2 style={styles.heading}>Projected Financial Summary</h2>

            <div style={styles.summaryGrid}>
              <Summary
                label="Regular Revenue"
                value={money(totals.regularRevenue)}
              />

              <Summary
                label="Campaign Revenue"
                value={money(totals.campaignSaleRevenue)}
              />

              <Summary
                label="Campaign Discount"
                value={money(totals.saleDiscount)}
                warning
              />

              <Summary
                label="Promo Discount"
                value={money(totals.promoDiscount)}
                warning
              />

              <Summary
                label="Referral Discount"
                value={money(totals.referralDiscount)}
                warning
              />

              <Summary
                label="Rewards Discount"
                value={money(totals.rewards)}
                warning
              />

              <Summary
                label="Net Revenue"
                value={money(totals.netRevenue)}
              />

              <Summary
                label="Product Cost"
                value={money(totals.productCost)}
              />

              <Summary
                label="Shipping Cost"
                value={money(totals.shippingExpense)}
              />

              <Summary
                label="Packaging Cost"
                value={money(totals.packagingExpense)}
              />

              <Summary
                label="Commission"
                value={money(totals.salesRepCommission)}
              />

              <Summary
                label="Final Profit"
                value={money(totals.finalProfit)}
                danger={totals.finalProfit < 0}
              />

              <Summary
                label="Final Margin"
                value={percent(totals.finalMargin)}
                danger={totals.finalMargin < 15}
                warning={
                  totals.finalMargin >= 15 &&
                  totals.finalMargin < 30
                }
              />
            </div>

            {simulatedLines.length > 0 &&
              totals.finalMargin < 15 && (
                <div style={styles.dangerBox}>
                  Warning: this scenario is below a 15% final margin.
                </div>
              )}

            <div style={styles.breakdown}>
              <BreakdownRow
                label="Regular merchandise value"
                value={totals.regularRevenue}
                positive
              />

              <BreakdownRow
                label="Campaign sale discount"
                value={-totals.saleDiscount}
              />

              <BreakdownRow
                label="Promo discount"
                value={-totals.promoDiscount}
              />

              <BreakdownRow
                label="Referral discount"
                value={-totals.referralDiscount}
              />

              <BreakdownRow
                label="Sales-rep discount"
                value={-totals.salesRepDiscount}
              />

              <BreakdownRow
                label="Rewards discount"
                value={-totals.rewards}
              />

              <BreakdownRow
                label="Shipping collected"
                value={totals.shippingRevenue}
                positive
              />

              <BreakdownRow
                label="Product cost"
                value={-totals.productCost}
              />

              <BreakdownRow
                label="Shipping cost"
                value={-totals.shippingExpense}
              />

              <BreakdownRow
                label="Packaging cost"
                value={-totals.packagingExpense}
              />

              <BreakdownRow
                label="Other direct cost"
                value={-totals.otherCost}
              />

              <BreakdownRow
                label="Sales-rep commission"
                value={-totals.salesRepCommission}
              />

              <div style={styles.totalRow}>
                <strong>Final profit</strong>
                <strong
                  style={{
                    color:
                      totals.finalProfit >= 0
                        ? "#00ff99"
                        : "#ff4d4d",
                  }}
                >
                  {money(totals.finalProfit)}
                </strong>
              </div>
            </div>
          </section>

          <section style={styles.section}>
            <h2 style={styles.heading}>Product Quantities</h2>

            {assignedOptions.length === 0 ? (
              <p style={styles.emptyText}>
                No product options are assigned to this campaign.
              </p>
            ) : (
              <div style={styles.productGrid}>
                {assignedOptions.map((option) => {
                  const productName =
                    productBySlug.get(option.product_slug)?.name ||
                    option.product_slug;

                  return (
                    <article key={option.id} style={styles.quantityCard}>
                      <div>
                        <h3 style={styles.productName}>
                          {productName}
                        </h3>

                        <p style={styles.optionName}>
                          {option.dosage} · {option.purchase_type}
                        </p>
                      </div>

                      <label style={styles.label}>
                        Quantity
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={quantities[option.id] || "0"}
                          onChange={(event) =>
                            setQuantities((current) => ({
                              ...current,
                              [option.id]: event.target.value,
                            }))
                          }
                          style={styles.input}
                        />
                      </label>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section style={styles.section}>
            <h2 style={styles.heading}>Product Margin Review</h2>

            {sortedByMargin.length === 0 ? (
              <p style={styles.emptyText}>
                Enter quantities above to review product margins.
              </p>
            ) : (
              <div style={styles.marginGrid}>
                {sortedByMargin.map((line) => (
                  <article
                    key={line.option.id}
                    style={{
                      ...styles.marginCard,
                      borderColor:
                        line.profitBeforeOrderCosts < 0
                          ? "#ff4d4d"
                          : line.marginBeforeOrderCosts < 20
                          ? "#ffcc00"
                          : "#00ff99",
                    }}
                  >
                    <h3 style={styles.productName}>
                      {line.productName}
                    </h3>

                    <p style={styles.optionName}>
                      {line.option.dosage} ·{" "}
                      {line.option.purchase_type} · Qty {line.quantity}
                    </p>

                    <div style={styles.metrics}>
                      <span>
                        Regular revenue: {money(line.regularRevenue)}
                      </span>

                      <span>
                        Sale revenue: {money(line.saleRevenue)}
                      </span>

                      <span>
                        Product cost: {money(line.productCost)}
                      </span>

                      <span>
                        Profit before order costs:{" "}
                        {money(line.profitBeforeOrderCosts)}
                      </span>

                      <strong
                        style={{
                          color:
                            line.profitBeforeOrderCosts < 0
                              ? "#ff4d4d"
                              : line.marginBeforeOrderCosts < 20
                              ? "#ffcc00"
                              : "#00ff99",
                        }}
                      >
                        Margin before order costs:{" "}
                        {percent(line.marginBeforeOrderCosts)}
                      </strong>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
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
  value: string;
  danger?: boolean;
  warning?: boolean;
}) {
  return (
    <div style={styles.summaryCard}>
      <span style={styles.summaryLabel}>{label}</span>

      <strong
        style={{
          ...styles.summaryValue,
          color: danger
            ? "#ff4d4d"
            : warning
            ? "#ffcc00"
            : "#00d9ff",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function BreakdownRow({
  label,
  value,
  positive = false,
}: {
  label: string;
  value: number;
  positive?: boolean;
}) {
  return (
    <div style={styles.breakdownRow}>
      <span>{label}</span>

      <strong
        style={{
          color: positive ? "#00ff99" : "#ff9999",
        }}
      >
        {value >= 0 ? "+" : "-"}
        {money(Math.abs(value))}
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
    lineHeight: 1.65,
    maxWidth: "900px",
  },

  section: {
    maxWidth: "1200px",
    margin: "24px auto 0",
    padding: "clamp(15px, 3vw, 24px)",
    border: "1px solid #333333",
    borderRadius: "16px",
    background: "#111111",
  },

  heading: {
    marginTop: 0,
    color: "#00d9ff",
    fontSize: "clamp(23px, 4vw, 30px)",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(min(100%, 230px), 1fr))",
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
      "repeat(auto-fit, minmax(min(100%, 175px), 1fr))",
    gap: "12px",
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
    fontSize: "clamp(22px, 4vw, 29px)",
    lineHeight: 1.1,
  },

  dangerBox: {
    marginTop: "18px",
    padding: "16px",
    border: "1px solid #ff4d4d",
    borderRadius: "10px",
    background: "rgba(255,77,77,.08)",
    color: "#ff9999",
    fontWeight: "bold",
  },

  breakdown: {
    marginTop: "20px",
    overflow: "hidden",
    border: "1px solid #333333",
    borderRadius: "13px",
    background: "#080808",
  },

  breakdownRow: {
    minHeight: "48px",
    padding: "11px 14px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    borderBottom: "1px solid #252525",
  },

  totalRow: {
    minHeight: "58px",
    padding: "14px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    fontSize: "19px",
  },

  productGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(min(100%, 270px), 1fr))",
    gap: "14px",
  },

  quantityCard: {
    padding: "16px",
    border: "1px solid #3a3a3a",
    borderRadius: "12px",
    background: "#080808",
  },

  productName: {
    margin: 0,
    color: "#ff45d8",
    fontSize: "20px",
  },

  optionName: {
    margin: "5px 0 14px",
    color: "#aaaaaa",
  },

  marginGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
    gap: "14px",
  },

  marginCard: {
    padding: "16px",
    border: "1px solid",
    borderRadius: "12px",
    background: "#080808",
  },

  metrics: {
    display: "grid",
    gap: "7px",
    color: "#dddddd",
    fontSize: "15px",
  },

  emptyText: {
    color: "#aaaaaa",
  },
};