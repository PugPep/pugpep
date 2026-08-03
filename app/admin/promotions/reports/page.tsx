"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../../../lib/supabaseClient";

const ADMIN_EMAIL = "pugpep99@gmail.com";

type Campaign = {
  id: string;
  name: string;
  slug: string;
  campaign_type: "percent" | "fixed" | "buy_x_get_y";
  is_active: boolean;
};

type OrderRow = {
  id: string;
  order_number: string;
  created_at: string | null;
  status: string | null;

  subtotal: number | null;
  shipping: number | null;
  total: number | null;

  gross_revenue: number | null;
  net_revenue: number | null;
  total_discount: number | null;

  regular_merchandise_value: number | null;
  sale_discount: number | null;
  promo_discount: number | null;
  referral_discount: number | null;
  sales_rep_discount: number | null;
  reward_discount: number | null;

  shipping_collected: number | null;
  product_cost_total: number | null;

  actual_shipping_cost: number | null;
  actual_packaging_cost: number | null;
  other_direct_cost: number | null;

  estimated_shipping_cost: number | null;
  estimated_packaging_cost: number | null;
  estimated_profit: number | null;
  profit_margin_percent: number | null;

  profit_at_purchase: number | null;
  margin_at_purchase: number | null;
  financial_snapshot_locked: boolean | null;

  primary_sale_campaign_id: string | null;
  primary_sale_campaign_name: string | null;
};

type OrderItemRow = {
  id: string;
  order_id: string | null;
  product_name: string;
  dosage: string;
  purchase_type: string;
  quantity: number | null;

  price: number | null;
  cost: number | null;

  line_revenue: number | null;
  line_cost: number | null;
  line_profit: number | null;
  line_margin_percent: number | null;

  sale_campaign_id: string | null;
  sale_campaign_name: string | null;
};

type ProductPerformance = {
  key: string;
  productName: string;
  dosage: string;
  purchaseType: string;
  quantity: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
};

function money(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function percent(value: number) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function safeNumber(value: number | null | undefined) {
  return Number(value || 0);
}

function formatDate(value: string | null) {
  if (!value) return "Unknown";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Unknown"
    : date.toLocaleDateString();
}

/*
 * New orders use the permanent financial snapshot fields.
 * Older orders fall back to the legacy estimated fields.
 */
function getOrderProfit(order: OrderRow) {
  if (order.financial_snapshot_locked) {
    return safeNumber(order.profit_at_purchase);
  }

  if (safeNumber(order.profit_at_purchase) !== 0) {
    return safeNumber(order.profit_at_purchase);
  }

  return safeNumber(order.estimated_profit);
}

function getOrderMargin(order: OrderRow) {
  if (order.financial_snapshot_locked) {
    return safeNumber(order.margin_at_purchase);
  }

  if (safeNumber(order.margin_at_purchase) !== 0) {
    return safeNumber(order.margin_at_purchase);
  }

  return safeNumber(order.profit_margin_percent);
}

function getRegularRevenue(order: OrderRow) {
  if (safeNumber(order.regular_merchandise_value) !== 0) {
    return safeNumber(order.regular_merchandise_value);
  }

  if (safeNumber(order.gross_revenue) !== 0) {
    return safeNumber(order.gross_revenue);
  }

  return safeNumber(order.subtotal);
}

function getNetRevenue(order: OrderRow) {
  if (safeNumber(order.net_revenue) !== 0) {
    return safeNumber(order.net_revenue);
  }

  return Math.max(
    0,
    getRegularRevenue(order) -
      getTotalDiscount(order) +
      getShippingCollected(order)
  );
}

function getTotalDiscount(order: OrderRow) {
  const detailedDiscounts =
    safeNumber(order.sale_discount) +
    safeNumber(order.promo_discount) +
    safeNumber(order.referral_discount) +
    safeNumber(order.sales_rep_discount) +
    safeNumber(order.reward_discount);

  if (detailedDiscounts !== 0) {
    return detailedDiscounts;
  }

  return safeNumber(order.total_discount);
}

function getShippingCollected(order: OrderRow) {
  if (safeNumber(order.shipping_collected) !== 0) {
    return safeNumber(order.shipping_collected);
  }

  return safeNumber(order.shipping);
}

function getShippingCost(order: OrderRow) {
  if (order.financial_snapshot_locked) {
    return safeNumber(order.actual_shipping_cost);
  }

  if (safeNumber(order.actual_shipping_cost) !== 0) {
    return safeNumber(order.actual_shipping_cost);
  }

  return safeNumber(order.estimated_shipping_cost);
}

function getPackagingCost(order: OrderRow) {
  if (order.financial_snapshot_locked) {
    return safeNumber(order.actual_packaging_cost);
  }

  if (safeNumber(order.actual_packaging_cost) !== 0) {
    return safeNumber(order.actual_packaging_cost);
  }

  return safeNumber(order.estimated_packaging_cost);
}

export default function CampaignReportsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItemRow[]>([]);

  const [selectedCampaignId, setSelectedCampaignId] =
    useState("all");

  const [dateRange, setDateRange] =
    useState("all");

  useEffect(() => {
    async function initialize() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const email = session?.user?.email;

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

      const [
        campaignResult,
        orderResult,
        itemResult,
      ] = await Promise.all([
        supabase
          .from("sale_campaigns")
          .select(
            "id,name,slug,campaign_type,is_active"
          )
          .order("name", {
            ascending: true,
          }),

        supabase
          .from("orders")
          .select(
            [
              "id",
              "order_number",
              "created_at",
              "status",

              "subtotal",
              "shipping",
              "total",

              "gross_revenue",
              "net_revenue",
              "total_discount",

              "regular_merchandise_value",
              "sale_discount",
              "promo_discount",
              "referral_discount",
              "sales_rep_discount",
              "reward_discount",

              "shipping_collected",
              "product_cost_total",

              "actual_shipping_cost",
              "actual_packaging_cost",
              "other_direct_cost",

              "estimated_shipping_cost",
              "estimated_packaging_cost",
              "estimated_profit",
              "profit_margin_percent",

              "profit_at_purchase",
              "margin_at_purchase",
              "financial_snapshot_locked",

              "primary_sale_campaign_id",
              "primary_sale_campaign_name",
            ].join(",")
          )
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("order_items")
          .select(
            [
              "id",
              "order_id",
              "product_name",
              "dosage",
              "purchase_type",
              "quantity",

              "price",
              "cost",

              "line_revenue",
              "line_cost",
              "line_profit",
              "line_margin_percent",

              "sale_campaign_id",
              "sale_campaign_name",
            ].join(",")
          ),
      ]);

      if (campaignResult.error) {
        alert(campaignResult.error.message);
      }

      if (orderResult.error) {
        alert(orderResult.error.message);
      }

      if (itemResult.error) {
        alert(itemResult.error.message);
      }

      setCampaigns(
        (campaignResult.data ?? []) as unknown as Campaign[]
      );

      setOrders(
        (orderResult.data ?? []) as unknown as OrderRow[]
      );

      setOrderItems(
        (itemResult.data ?? []) as unknown as OrderItemRow[]
      );

      setLoading(false);
    }

    void initialize();
  }, [supabase]);

  const filteredOrders = useMemo(() => {
    const now = new Date();

    return orders.filter((order) => {
      const campaignMatches =
        selectedCampaignId === "all" ||
        order.primary_sale_campaign_id ===
          selectedCampaignId;

      if (!campaignMatches) {
        return false;
      }

      if (dateRange === "all") {
        return true;
      }

      const created = order.created_at
        ? new Date(order.created_at)
        : null;

      if (
        !created ||
        Number.isNaN(created.getTime())
      ) {
        return false;
      }

      const days = Number(dateRange);

      const cutoff = new Date(
        now.getTime() -
          days * 24 * 60 * 60 * 1000
      );

      return created >= cutoff;
    });
  }, [
    orders,
    selectedCampaignId,
    dateRange,
  ]);

  const filteredOrderIds = useMemo(
    () =>
      new Set(
        filteredOrders.map(
          (order) => order.id
        )
      ),
    [filteredOrders]
  );

  const filteredItems = useMemo(
    () =>
      orderItems.filter((item) => {
        if (
          !item.order_id ||
          !filteredOrderIds.has(
            item.order_id
          )
        ) {
          return false;
        }

        if (
          selectedCampaignId === "all"
        ) {
          return true;
        }

        return (
          item.sale_campaign_id ===
          selectedCampaignId
        );
      }),
    [
      orderItems,
      filteredOrderIds,
      selectedCampaignId,
    ]
  );

  const totals = useMemo(() => {
    const result =
      filteredOrders.reduce(
        (sum, order) => {
          sum.orders += 1;

          sum.regularRevenue +=
            getRegularRevenue(order);

          sum.saleDiscount +=
            safeNumber(
              order.sale_discount
            );

          sum.promoDiscount +=
            safeNumber(
              order.promo_discount
            );

          sum.referralDiscount +=
            safeNumber(
              order.referral_discount
            );

          sum.salesRepDiscount +=
            safeNumber(
              order.sales_rep_discount
            );

          sum.rewardDiscount +=
            safeNumber(
              order.reward_discount
            );

          sum.totalDiscount +=
            getTotalDiscount(order);

          sum.shippingCollected +=
            getShippingCollected(order);

          sum.productCost +=
            safeNumber(
              order.product_cost_total
            );

          sum.shippingCost +=
            getShippingCost(order);

          sum.packagingCost +=
            getPackagingCost(order);

          sum.otherDirectCost +=
            safeNumber(
              order.other_direct_cost
            );

          sum.profit +=
            getOrderProfit(order);

          sum.netRevenue +=
            getNetRevenue(order);

          return sum;
        },
        {
          orders: 0,
          regularRevenue: 0,
          saleDiscount: 0,
          promoDiscount: 0,
          referralDiscount: 0,
          salesRepDiscount: 0,
          rewardDiscount: 0,
          totalDiscount: 0,
          shippingCollected: 0,
          productCost: 0,
          shippingCost: 0,
          packagingCost: 0,
          otherDirectCost: 0,
          profit: 0,
          netRevenue: 0,
        }
      );

    const margin =
      result.netRevenue > 0
        ? (result.profit /
            result.netRevenue) *
          100
        : 0;

    const averageOrder =
      result.orders > 0
        ? result.netRevenue /
          result.orders
        : 0;

    return {
      ...result,
      margin,
      averageOrder,
    };
  }, [filteredOrders]);

  const productPerformance =
    useMemo<ProductPerformance[]>(
      () => {
        const map = new Map<
          string,
          ProductPerformance
        >();

        filteredItems.forEach((item) => {
          const key = [
            item.product_name,
            item.dosage,
            item.purchase_type,
          ].join("|");

          const quantity = Math.max(
            0,
            safeNumber(item.quantity)
          );

          const revenue =
            safeNumber(
              item.line_revenue
            ) !== 0
              ? safeNumber(
                  item.line_revenue
                )
              : safeNumber(
                  item.price
                ) * quantity;

          const cost =
            safeNumber(item.line_cost) !==
            0
              ? safeNumber(
                  item.line_cost
                )
              : safeNumber(
                  item.cost
                ) * quantity;

          const profit =
            safeNumber(
              item.line_profit
            ) !== 0
              ? safeNumber(
                  item.line_profit
                )
              : revenue - cost;

          const current =
            map.get(key) || {
              key,
              productName:
                item.product_name,
              dosage: item.dosage,
              purchaseType:
                item.purchase_type,
              quantity: 0,
              revenue: 0,
              cost: 0,
              profit: 0,
              margin: 0,
            };

          current.quantity += quantity;
          current.revenue += revenue;
          current.cost += cost;
          current.profit += profit;

          current.margin =
            current.revenue > 0
              ? (current.profit /
                  current.revenue) *
                100
              : 0;

          map.set(key, current);
        });

        return Array.from(
          map.values()
        );
      },
      [filteredItems]
    );

  const bestProducts = useMemo(
    () =>
      [...productPerformance]
        .filter(
          (item) =>
            item.revenue > 0
        )
        .sort(
          (a, b) =>
            b.margin - a.margin
        )
        .slice(0, 5),
    [productPerformance]
  );

  const worstProducts = useMemo(
    () =>
      [...productPerformance]
        .filter(
          (item) =>
            item.revenue > 0
        )
        .sort(
          (a, b) =>
            a.margin - b.margin
        )
        .slice(0, 5),
    [productPerformance]
  );

  const recentOrders = useMemo(
    () => filteredOrders.slice(0, 20),
    [filteredOrders]
  );

  const selectedCampaign =
    useMemo(
      () =>
        selectedCampaignId === "all"
          ? null
          : campaigns.find(
              (campaign) =>
                campaign.id ===
                selectedCampaignId
            ) || null,
      [
        campaigns,
        selectedCampaignId,
      ]
    );

  if (loading) {
    return (
      <main style={styles.page}>
        Loading Campaign Reports...
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
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.topBar}>
        <Link
          href="/admin/promotions"
          style={styles.backLink}
        >
          ← Marketing Center
        </Link>

        <Link
          href="/admin/promotions/rules"
          style={styles.secondaryLink}
        >
          Marketing Rules
        </Link>
      </div>

      <header style={styles.header}>
        <p style={styles.eyebrow}>
          MARKETING CENTER
        </p>

        <h1 style={styles.title}>
          Campaign Reports
        </h1>

        <p style={styles.subtitle}>
          Review campaign revenue,
          discounts, costs, profit,
          margin, and product performance
          from stored order snapshots.
        </p>
      </header>

      <section style={styles.notice}>
        Older orders use legacy profit,
        margin, shipping-cost, and
        packaging-cost fields when the new
        permanent snapshot fields are
        empty. Historical orders cannot be
        assigned to a campaign unless that
        campaign was stored when the order
        was created.
      </section>

      <section style={styles.section}>
        <div style={styles.filterGrid}>
          <label style={styles.label}>
            Campaign

            <select
              value={
                selectedCampaignId
              }
              onChange={(event) =>
                setSelectedCampaignId(
                  event.target.value
                )
              }
              style={styles.input}
            >
              <option value="all">
                All campaigns
              </option>

              {campaigns.map(
                (campaign) => (
                  <option
                    key={campaign.id}
                    value={campaign.id}
                  >
                    {campaign.name}
                  </option>
                )
              )}
            </select>
          </label>

          <label style={styles.label}>
            Date range

            <select
              value={dateRange}
              onChange={(event) =>
                setDateRange(
                  event.target.value
                )
              }
              style={styles.input}
            >
              <option value="all">
                All time
              </option>

              <option value="7">
                Last 7 days
              </option>

              <option value="30">
                Last 30 days
              </option>

              <option value="90">
                Last 90 days
              </option>

              <option value="365">
                Last 12 months
              </option>
            </select>
          </label>
        </div>

        {selectedCampaign && (
          <div
            style={
              styles.selectedCampaign
            }
          >
            <strong
              style={
                styles.selectedCampaignName
              }
            >
              {selectedCampaign.name}
            </strong>

            <span>
              {selectedCampaign.is_active
                ? "Active"
                : "Inactive"}
            </span>
          </div>
        )}
      </section>

      <section style={styles.section}>
        <h2 style={styles.heading}>
          Financial Summary
        </h2>

        <div style={styles.summaryGrid}>
          <Summary
            label="Orders"
            value={String(
              totals.orders
            )}
          />

          <Summary
            label="Regular Revenue"
            value={money(
              totals.regularRevenue
            )}
          />

          <Summary
            label="Total Discounts"
            value={money(
              totals.totalDiscount
            )}
            warning
          />

          <Summary
            label="Net Revenue"
            value={money(
              totals.netRevenue
            )}
          />

          <Summary
            label="Product Cost"
            value={money(
              totals.productCost
            )}
          />

          <Summary
            label="Shipping Cost"
            value={money(
              totals.shippingCost
            )}
          />

          <Summary
            label="Packaging Cost"
            value={money(
              totals.packagingCost
            )}
          />

          <Summary
            label="Profit"
            value={money(
              totals.profit
            )}
            danger={
              totals.profit < 0
            }
          />

          <Summary
            label="Margin"
            value={percent(
              totals.margin
            )}
            danger={
              totals.margin < 15
            }
            warning={
              totals.margin >= 15 &&
              totals.margin < 30
            }
          />

          <Summary
            label="Average Order"
            value={money(
              totals.averageOrder
            )}
          />
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.heading}>
          Discount Breakdown
        </h2>

        <div style={styles.summaryGrid}>
          <Summary
            label="Campaign Discounts"
            value={money(
              totals.saleDiscount
            )}
            warning
          />

          <Summary
            label="Promo Discounts"
            value={money(
              totals.promoDiscount
            )}
            warning
          />

          <Summary
            label="Referral Discounts"
            value={money(
              totals.referralDiscount
            )}
            warning
          />

          <Summary
            label="Sales-Rep Discounts"
            value={money(
              totals.salesRepDiscount
            )}
            warning
          />

          <Summary
            label="Rewards Used"
            value={money(
              totals.rewardDiscount
            )}
            warning
          />

          <Summary
            label="Shipping Collected"
            value={money(
              totals.shippingCollected
            )}
          />
        </div>
      </section>

      <section style={styles.twoColumnGrid}>
        <article style={styles.section}>
          <h2 style={styles.heading}>
            Highest Margins
          </h2>

          {bestProducts.length === 0 ? (
            <p style={styles.emptyText}>
              No product performance data
              is available yet.
            </p>
          ) : (
            <div style={styles.rankList}>
              {bestProducts.map(
                (item, index) => (
                  <ProductRank
                    key={item.key}
                    rank={index + 1}
                    item={item}
                    good
                  />
                )
              )}
            </div>
          )}
        </article>

        <article style={styles.section}>
          <h2 style={styles.heading}>
            Lowest Margins
          </h2>

          {worstProducts.length === 0 ? (
            <p style={styles.emptyText}>
              No product performance data
              is available yet.
            </p>
          ) : (
            <div style={styles.rankList}>
              {worstProducts.map(
                (item, index) => (
                  <ProductRank
                    key={item.key}
                    rank={index + 1}
                    item={item}
                    good={false}
                  />
                )
              )}
            </div>
          )}
        </article>
      </section>

      <section style={styles.section}>
        <h2 style={styles.heading}>
          Recent Orders
        </h2>

        {recentOrders.length === 0 ? (
          <p style={styles.emptyText}>
            No orders match the selected
            filters.
          </p>
        ) : (
          <div style={styles.orderGrid}>
            {recentOrders.map(
              (order) => {
                const orderProfit =
                  getOrderProfit(order);

                const orderMargin =
                  getOrderMargin(order);

                return (
                  <article
                    key={order.id}
                    style={styles.orderCard}
                  >
                    <div
                      style={
                        styles.orderHeader
                      }
                    >
                      <div>
                        <h3
                          style={
                            styles.orderNumber
                          }
                        >
                          {
                            order.order_number
                          }
                        </h3>

                        <p
                          style={
                            styles.orderMeta
                          }
                        >
                          {formatDate(
                            order.created_at
                          )}
                        </p>
                      </div>

                      <span
                        style={
                          styles.statusBadge
                        }
                      >
                        {order.status ||
                          "unknown"}
                      </span>
                    </div>

                    <div
                      style={
                        styles.orderMetrics
                      }
                    >
                      <span>
                        Campaign:{" "}
                        <strong>
                          {order.primary_sale_campaign_name ||
                            "None"}
                        </strong>
                      </span>

                      <span>
                        Profit:{" "}
                        <strong
                          style={{
                            color:
                              orderProfit >=
                              0
                                ? "#00ff99"
                                : "#ff4d4d",
                          }}
                        >
                          {money(
                            orderProfit
                          )}
                        </strong>
                      </span>

                      <span>
                        Margin:{" "}
                        <strong>
                          {percent(
                            orderMargin
                          )}
                        </strong>
                      </span>
                    </div>
                  </article>
                );
              }
            )}
          </div>
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
  value: string;
  danger?: boolean;
  warning?: boolean;
}) {
  return (
    <div style={styles.summaryCard}>
      <span style={styles.summaryLabel}>
        {label}
      </span>

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

function ProductRank({
  rank,
  item,
  good,
}: {
  rank: number;
  item: ProductPerformance;
  good: boolean;
}) {
  return (
    <div style={styles.rankRow}>
      <span
        style={{
          ...styles.rankNumber,
          color: good
            ? "#00ff99"
            : "#ffcc00",
          borderColor: good
            ? "#00ff99"
            : "#ffcc00",
        }}
      >
        {rank}
      </span>

      <div style={styles.rankDetails}>
        <strong style={styles.rankName}>
          {item.productName}
        </strong>

        <span style={styles.rankMeta}>
          {item.dosage} ·{" "}
          {item.purchaseType} · Qty{" "}
          {item.quantity}
        </span>
      </div>

      <div style={styles.rankValues}>
        <strong
          style={{
            color:
              item.margin < 15
                ? "#ff4d4d"
                : item.margin < 30
                ? "#ffcc00"
                : "#00ff99",
          }}
        >
          {percent(item.margin)}
        </strong>

        <span>{money(item.profit)}</span>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding:
      "clamp(15px, 3vw, 32px)",
    background: "#000000",
    color: "#ffffff",
    fontSize: "16px",
    lineHeight: 1.5,
  },

  topBar: {
    maxWidth: "1200px",
    margin: "0 auto",
    display: "flex",
    justifyContent:
      "space-between",
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
    fontSize:
      "clamp(32px, 7vw, 50px)",
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
    maxWidth: "1200px",
    margin: "20px auto 0",
    padding: "15px",
    border: "1px solid #6a5723",
    borderRadius: "12px",
    background:
      "rgba(255,204,0,.07)",
    color: "#ffeaa1",
    lineHeight: 1.65,
  },

  section: {
    maxWidth: "1200px",
    margin: "22px auto 0",
    padding:
      "clamp(15px, 3vw, 24px)",
    border: "1px solid #333333",
    borderRadius: "16px",
    background: "#111111",
  },

  heading: {
    marginTop: 0,
    marginBottom: "14px",
    color: "#00d9ff",
    fontSize:
      "clamp(22px, 4vw, 29px)",
  },

  filterGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
    gap: "14px",
  },

  label: {
    display: "flex",
    flexDirection:
      "column" as const,
    gap: "9px",
    color: "#f2f2f2",
    fontWeight: "bold",
  },

  input: {
    width: "100%",
    minHeight: "50px",
    boxSizing:
      "border-box" as const,
    padding: "12px 13px",
    background: "#080808",
    color: "#ffffff",
    border: "1px solid #555555",
    borderRadius: "10px",
    fontSize: "16px",
  },

  selectedCampaign: {
    marginTop: "16px",
    padding: "13px 15px",
    display: "flex",
    justifyContent:
      "space-between",
    gap: "12px",
    flexWrap: "wrap" as const,
    border: "1px solid #333333",
    borderRadius: "10px",
    background: "#080808",
  },

  selectedCampaignName: {
    color: "#ff45d8",
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
    textTransform:
      "uppercase" as const,
  },

  summaryValue: {
    fontSize:
      "clamp(22px, 4vw, 29px)",
    lineHeight: 1.1,
  },

  twoColumnGrid: {
    maxWidth: "1200px",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(min(100%, 430px), 1fr))",
    gap: "20px",
  },

  rankList: {
    display: "grid",
    gap: "10px",
  },

  rankRow: {
    minHeight: "72px",
    padding: "12px",
    display: "grid",
    gridTemplateColumns:
      "42px 1fr auto",
    alignItems: "center",
    gap: "12px",
    border: "1px solid #333333",
    borderRadius: "11px",
    background: "#080808",
  },

  rankNumber: {
    width: "34px",
    height: "34px",
    display: "grid",
    placeItems: "center",
    border: "1px solid",
    borderRadius: "50%",
    fontWeight: "bold",
  },

  rankDetails: {
    minWidth: 0,
    display: "grid",
    gap: "4px",
  },

  rankName: {
    color: "#ffffff",
    overflowWrap:
      "anywhere" as const,
  },

  rankMeta: {
    color: "#999999",
    fontSize: "13px",
  },

  rankValues: {
    display: "grid",
    justifyItems: "end",
    gap: "3px",
  },

  orderGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
    gap: "14px",
  },

  orderCard: {
    padding: "16px",
    border: "1px solid #333333",
    borderRadius: "12px",
    background: "#080808",
  },

  orderHeader: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "flex-start",
    gap: "12px",
  },

  orderNumber: {
    margin: 0,
    color: "#ff45d8",
    fontSize: "18px",
  },

  orderMeta: {
    margin: "5px 0 0",
    color: "#999999",
    fontSize: "14px",
  },

  statusBadge: {
    padding: "5px 8px",
    border: "1px solid #555555",
    borderRadius: "999px",
    color: "#dddddd",
    fontSize: "12px",
    fontWeight: "bold",
    textTransform:
      "uppercase" as const,
  },

  orderMetrics: {
    display: "grid",
    gap: "7px",
    marginTop: "15px",
    color: "#dddddd",
  },

  emptyText: {
    color: "#aaaaaa",
  },
};