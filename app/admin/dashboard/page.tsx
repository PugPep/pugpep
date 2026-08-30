"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { createClient } from "../../../lib/supabaseClient";

const ADMIN_EMAIL = "pugpep99@gmail.com";

type DatePreset =
  | "today"
  | "this_week"
  | "this_month"
  | "last_month"
  | "this_quarter"
  | "this_year"
  | "all_time"
  | "month_year"
  | "custom";

type TopMetric = "units" | "revenue" | "profit";

type Order = {
  id: string;
  order_number?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  user_id?: string | null;
  status?: string | null;
  shipping_status?: string | null;
  created_at: string;
  total?: number | null;
  net_revenue?: number | null;
  product_cost_total?: number | null;
  estimated_shipping_cost?: number | null;
  estimated_packaging_cost?: number | null;
  estimated_profit?: number | null;
  profit_margin_percent?: number | null;
  total_discount?: number | null;
  promo_code?: string | null;
  payment_method?: string | null;
  tracking_number?: string | null;
  closed_at?: string | null;
  deleted_at?: string | null;
  state?: string | null;
  zip?: string | null;
  sales_tax_amount?: number | null;
  sales_tax_state?: string | null;
  sales_tax_postal_code?: string | null;
};

type NexusSummary = {
  state_code: string;
  state_name: string;
  sales_threshold: number | null;
  transaction_threshold: number | null;
  qualifying_sales: number;
  qualifying_transactions: number;
  revenue: number;
  cost: number;
  profit: number;
  margin_percent: number;
  sales_tax_collected: number;
  overall_progress_percent: number;
  remaining_sales: number | null;
  threshold_met: boolean;
  nexus_status: string;
  registered_to_collect: boolean;
  effective_tax_collection: boolean;
};

type OrderItem = {
  id?: string;
  order_id: string;
  product_name?: string | null;
  product_slug?: string | null;
  dosage?: string | null;
  purchase_type?: string | null;
  quantity?: number | null;
  line_revenue?: number | null;
  line_cost?: number | null;
  line_profit?: number | null;
  price?: number | null;
  actual_unit_price?: number | null;
  sale_unit_price?: number | null;
  cost?: number | null;
};

type Customer = {
  id: string;
  email?: string | null;
  full_name?: string | null;
  lifetime_spend?: number | null;
  vip_tier?: string | null;
  reward_points?: number | null;
  created_at?: string | null;
};

type InventoryRow = {
  id?: string;
  product_slug: string;
  dosage: string;
  quantity: number;
  status?: string | null;
};

type ProductOption = {
  id: string;
  product_slug: string;
  dosage: string;
  purchase_type: string;
  status?: string | null;
  is_active?: boolean;
  archived_at?: string | null;
};

type Product = {
  slug: string;
  name: string;
  is_active?: boolean;
  deleted_at?: string | null;
};

type DateRange = {
  start: Date | null;
  end: Date | null;
  label: string;
};

type TrendPoint = {
  key: string;
  label: string;
  revenue: number;
  profit: number;
  orders: number;
};

type ProductPerformance = {
  name: string;
  units: number;
  revenue: number;
  profit: number;
};

function safeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function money(value: unknown) {
  return `$${safeNumber(value).toFixed(2)}`;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function formatInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseInputDate(value: string, end = false) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return end ? endOfDay(date) : startOfDay(date);
}

function getDateRange(
  preset: DatePreset,
  customStart: string,
  customEnd: string,
  selectedMonth: number,
  selectedYear: number
): DateRange {
  const now = new Date();

  if (preset === "all_time") {
    return { start: null, end: null, label: "All Time" };
  }

  if (preset === "today") {
    return {
      start: startOfDay(now),
      end: endOfDay(now),
      label: "Today",
    };
  }

  if (preset === "this_week") {
    const day = now.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const start = new Date(now);
    start.setDate(now.getDate() + mondayOffset);

    return {
      start: startOfDay(start),
      end: endOfDay(now),
      label: "This Week",
    };
  }

  if (preset === "this_month") {
    return {
      start: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)),
      end: endOfDay(now),
      label: now.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      }),
    };
  }

  if (preset === "last_month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);

    return {
      start: startOfDay(start),
      end: endOfDay(end),
      label: start.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      }),
    };
  }

  if (preset === "this_quarter") {
    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
    const start = new Date(now.getFullYear(), quarterStartMonth, 1);

    return {
      start: startOfDay(start),
      end: endOfDay(now),
      label: `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`,
    };
  }

  if (preset === "this_year") {
    return {
      start: startOfDay(new Date(now.getFullYear(), 0, 1)),
      end: endOfDay(now),
      label: String(now.getFullYear()),
    };
  }

  if (preset === "month_year") {
    const start = new Date(selectedYear, selectedMonth, 1);
    const end = new Date(selectedYear, selectedMonth + 1, 0);

    return {
      start: startOfDay(start),
      end: endOfDay(end),
      label: start.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      }),
    };
  }

  const start = parseInputDate(customStart);
  const end = parseInputDate(customEnd, true);

  return {
    start,
    end,
    label:
      start && end
        ? `${start.toLocaleDateString()} – ${end.toLocaleDateString()}`
        : "Custom Range",
  };
}

function getPreviousRange(range: DateRange): DateRange | null {
  if (!range.start || !range.end) return null;

  const duration = range.end.getTime() - range.start.getTime();
  const previousEnd = new Date(range.start.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - duration);

  return {
    start: startOfDay(previousStart),
    end: endOfDay(previousEnd),
    label: "Previous Period",
  };
}

function inRange(value: string | null | undefined, range: DateRange) {
  if (!value) return false;
  if (!range.start || !range.end) return true;

  const timestamp = new Date(value).getTime();
  return (
    timestamp >= range.start.getTime() &&
    timestamp <= range.end.getTime()
  );
}

function getOrderRevenue(order: Order) {
  return order.net_revenue == null
    ? safeNumber(order.total)
    : safeNumber(order.net_revenue);
}

function getOrderCost(order: Order) {
  return (
    safeNumber(order.product_cost_total) +
    safeNumber(order.estimated_shipping_cost) +
    safeNumber(order.estimated_packaging_cost)
  );
}

function getOrderProfit(order: Order) {
  return order.estimated_profit == null
    ? getOrderRevenue(order) - getOrderCost(order)
    : safeNumber(order.estimated_profit);
}

function percentChange(current: number, previous: number) {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }

  return ((current - previous) / Math.abs(previous)) * 100;
}

function buildTrend(
  paidOrders: Order[],
  range: DateRange
): TrendPoint[] {
  if (paidOrders.length === 0) return [];

  const firstDate =
    range.start ||
    new Date(
      Math.min(
        ...paidOrders.map((order) => new Date(order.created_at).getTime())
      )
    );

  const lastDate = range.end || new Date();

  const days =
    Math.max(
      1,
      Math.ceil(
        (lastDate.getTime() - firstDate.getTime()) / 86400000
      )
    );

  const useMonths = days > 62;
  const bucketMap = new Map<string, TrendPoint>();

  paidOrders.forEach((order) => {
    const date = new Date(order.created_at);

    const key = useMonths
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      : formatInputDate(date);

    const label = useMonths
      ? date.toLocaleDateString(undefined, {
          month: "short",
          year: "2-digit",
        })
      : date.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        });

    const current = bucketMap.get(key) || {
      key,
      label,
      revenue: 0,
      profit: 0,
      orders: 0,
    };

    current.revenue += getOrderRevenue(order);
    current.profit += getOrderProfit(order);
    current.orders += 1;

    bucketMap.set(key, current);
  });

  return Array.from(bucketMap.values()).sort((a, b) =>
    a.key.localeCompare(b.key)
  );
}

function buildMonthlyPerformance(paidOrders: Order[]) {
  const rows = new Map<
    string,
    {
      month: string;
      orders: number;
      revenue: number;
      costs: number;
      profit: number;
      discounts: number;
    }
  >();

  paidOrders.forEach((order) => {
    const date = new Date(order.created_at);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0"
    )}`;

    const current = rows.get(key) || {
      month: date.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      }),
      orders: 0,
      revenue: 0,
      costs: 0,
      profit: 0,
      discounts: 0,
    };

    current.orders += 1;
    current.revenue += getOrderRevenue(order);
    current.costs += getOrderCost(order);
    current.profit += getOrderProfit(order);
    current.discounts += safeNumber(order.total_discount);

    rows.set(key, current);
  });

  return Array.from(rows.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([, value]) => ({
      Month: value.month,
      Orders: value.orders,
      Revenue: Number(value.revenue.toFixed(2)),
      Costs: Number(value.costs.toFixed(2)),
      Profit: Number(value.profit.toFixed(2)),
      Margin:
        value.revenue > 0
          ? Number(((value.profit / value.revenue) * 100).toFixed(2))
          : 0,
      Discounts: Number(value.discounts.toFixed(2)),
      "Average Order":
        value.orders > 0
          ? Number((value.revenue / value.orders).toFixed(2))
          : 0,
    }));
}

export default function AdminDashboardPage() {
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [notice, setNotice] = useState("");

  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [nexusRows, setNexusRows] = useState<NexusSummary[]>([]);

  const [preset, setPreset] = useState<DatePreset>("this_month");
  const [selectedMonth, setSelectedMonth] = useState(() =>
    new Date().getMonth()
  );
  const [selectedYear, setSelectedYear] = useState(() =>
    new Date().getFullYear()
  );
  const [customStart, setCustomStart] = useState(() =>
    formatInputDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  );
  const [customEnd, setCustomEnd] = useState(() =>
    formatInputDate(new Date())
  );
  const [topMetric, setTopMetric] = useState<TopMetric>("revenue");

  const selectedRange = useMemo(
    () =>
      getDateRange(
        preset,
        customStart,
        customEnd,
        selectedMonth,
        selectedYear
      ),
    [
      preset,
      customStart,
      customEnd,
      selectedMonth,
      selectedYear,
    ]
  );

  const previousRange = useMemo(
    () => getPreviousRange(selectedRange),
    [selectedRange]
  );

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const orderYears = orders
      .map((order) => new Date(order.created_at).getFullYear())
      .filter((year) => Number.isFinite(year));

    const earliestYear =
      orderYears.length > 0
        ? Math.min(...orderYears)
        : currentYear - 3;

    const latestYear = Math.max(
      currentYear,
      ...(orderYears.length > 0 ? orderYears : [currentYear])
    );

    const years: number[] = [];

    for (let year = latestYear; year >= earliestYear; year -= 1) {
      years.push(year);
    }

    return years;
  }, [orders]);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setNotice("");

      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      const email = userData.user?.email;

      if (
        userError ||
        !email ||
        email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()
      ) {
        setAuthorized(false);
        setLoading(false);
        return;
      }

      setAuthorized(true);

      const [
        ordersResult,
        itemsResult,
        customersResult,
        inventoryResult,
        optionsResult,
        productsResult,
        nexusResult,
      ] = await Promise.all([
        supabase.from("orders").select("*"),
        supabase.from("order_items").select("*"),
        supabase.from("customer_profiles").select("*"),
        supabase.from("inventory").select("*"),
        supabase
          .from("product_options")
          .select(
            "id,product_slug,dosage,purchase_type,status,is_active,archived_at"
          ),
        supabase
          .from("products")
          .select("slug,name,is_active,deleted_at"),
        supabase.rpc("admin_get_state_nexus_summary"),
      ]);

      const errors = [
        ordersResult.error,
        itemsResult.error,
        customersResult.error,
        inventoryResult.error,
        optionsResult.error,
        productsResult.error,
        nexusResult.error,
      ].filter(Boolean);

      if (errors.length > 0) {
        console.error("Dashboard loading errors:", errors);
        setNotice(
          "Some dashboard data could not be loaded. The available sections are still shown."
        );
      }

      setOrders((ordersResult.data || []) as Order[]);
      setOrderItems((itemsResult.data || []) as OrderItem[]);
      setCustomers((customersResult.data || []) as Customer[]);
      setInventory((inventoryResult.data || []) as InventoryRow[]);
      setOptions((optionsResult.data || []) as ProductOption[]);
      setProducts((productsResult.data || []) as Product[]);
      setNexusRows((nexusResult.data || []) as NexusSummary[]);

      setLoading(false);
    }

    void loadDashboard();
  }, [supabase]);

  const activeOrders = useMemo(
    () => orders.filter((order) => !order.deleted_at),
    [orders]
  );

  const paidOrdersAllTime = useMemo(
    () =>
      activeOrders.filter(
        (order) => order.status === "paid"
      ),
    [activeOrders]
  );

  const periodOrders = useMemo(
    () =>
      activeOrders.filter((order) =>
        inRange(order.created_at, selectedRange)
      ),
    [activeOrders, selectedRange]
  );

  const paidPeriodOrders = useMemo(
    () =>
      periodOrders.filter(
        (order) => order.status === "paid"
      ),
    [periodOrders]
  );

  const previousPaidOrders = useMemo(() => {
    if (!previousRange) return [];

    return paidOrdersAllTime.filter((order) =>
      inRange(order.created_at, previousRange)
    );
  }, [paidOrdersAllTime, previousRange]);

  const revenue = useMemo(
    () =>
      paidPeriodOrders.reduce(
        (sum, order) => sum + getOrderRevenue(order),
        0
      ),
    [paidPeriodOrders]
  );

  const costs = useMemo(
    () =>
      paidPeriodOrders.reduce(
        (sum, order) => sum + getOrderCost(order),
        0
      ),
    [paidPeriodOrders]
  );

  const profit = useMemo(
    () =>
      paidPeriodOrders.reduce(
        (sum, order) => sum + getOrderProfit(order),
        0
      ),
    [paidPeriodOrders]
  );

  const discounts = useMemo(
    () =>
      paidPeriodOrders.reduce(
        (sum, order) => sum + safeNumber(order.total_discount),
        0
      ),
    [paidPeriodOrders]
  );

  const salesTaxCollected = paidPeriodOrders.reduce(
    (sum, order) => sum + safeNumber(order.sales_tax_amount),
    0
  );

  const statePerformance = useMemo(() => {
    const map = new Map<
      string,
      {
        state: string;
        orders: number;
        revenue: number;
        costs: number;
        profit: number;
        salesTax: number;
      }
    >();

    paidPeriodOrders.forEach((order) => {
      const state = String(order.state || "Unknown").trim().toUpperCase() || "Unknown";
      const current = map.get(state) || {
        state,
        orders: 0,
        revenue: 0,
        costs: 0,
        profit: 0,
        salesTax: 0,
      };

      current.orders += 1;
      current.revenue += getOrderRevenue(order);
      current.costs += getOrderCost(order);
      current.profit += getOrderProfit(order);
      current.salesTax += safeNumber(order.sales_tax_amount);
      map.set(state, current);
    });

    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [paidPeriodOrders]);

  const passedNexusStates = nexusRows.filter((row) => row.threshold_met);
  const criticalNexusStates = nexusRows.filter((row) => row.nexus_status === "critical");
  const nearNexusStates = nexusRows.filter((row) => row.nexus_status === "near");
  const taxActiveStates = nexusRows.filter((row) => row.effective_tax_collection);

  const nexusAttention = nexusRows
    .filter(
      (row) =>
        row.threshold_met ||
        row.nexus_status === "critical" ||
        row.nexus_status === "near"
    )
    .sort(
      (a, b) =>
        safeNumber(b.overall_progress_percent) -
        safeNumber(a.overall_progress_percent)
    );

  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const aov =
    paidPeriodOrders.length > 0
      ? revenue / paidPeriodOrders.length
      : 0;

  const previousRevenue = previousPaidOrders.reduce(
    (sum, order) => sum + getOrderRevenue(order),
    0
  );

  const previousProfit = previousPaidOrders.reduce(
    (sum, order) => sum + getOrderProfit(order),
    0
  );

  const previousAov =
    previousPaidOrders.length > 0
      ? previousRevenue / previousPaidOrders.length
      : 0;

  const currentRevenueChange =
    previousRange ? percentChange(revenue, previousRevenue) : null;

  const currentProfitChange =
    previousRange ? percentChange(profit, previousProfit) : null;

  const currentOrderChange =
    previousRange
      ? percentChange(
          paidPeriodOrders.length,
          previousPaidOrders.length
        )
      : null;

  const currentAovChange =
    previousRange ? percentChange(aov, previousAov) : null;

  const pendingOrders = periodOrders.filter(
    (order) => order.status === "pending"
  );

  const readyToShipOrders = periodOrders.filter(
    (order) =>
      order.status === "paid" &&
      !order.closed_at &&
      (!order.shipping_status ||
        order.shipping_status === "not shipped" ||
        order.shipping_status === "ready to ship")
  );

  const shippedOrders = periodOrders.filter(
    (order) => order.shipping_status === "shipped"
  );

  const deliveredOrders = periodOrders.filter(
    (order) => order.shipping_status === "delivered"
  );

  const deliveredNotClosed = periodOrders.filter(
    (order) =>
      order.shipping_status === "delivered" &&
      !order.closed_at
  );

  const stalePaidOrders = periodOrders.filter((order) => {
    if (
      order.status !== "paid" ||
      order.closed_at ||
      (order.shipping_status &&
        order.shipping_status !== "not shipped" &&
        order.shipping_status !== "ready to ship")
    ) {
      return false;
    }

    const ageHours =
      (Date.now() - new Date(order.created_at).getTime()) /
      3600000;

    return ageHours >= 48;
  });

  const productNameBySlug = useMemo(
    () =>
      new Map(
        products.map((product) => [
          String(product.slug),
          String(product.name || product.slug),
        ])
      ),
    [products]
  );

  const lowInventory = useMemo(
    () =>
      inventory
        .filter((row) => safeNumber(row.quantity) <= 5)
        .sort(
          (a, b) =>
            safeNumber(a.quantity) - safeNumber(b.quantity)
        ),
    [inventory]
  );

  const presaleOptions = useMemo(
    () =>
      options.filter(
        (option) =>
          option.is_active !== false &&
          !option.archived_at &&
          option.status === "pre-sale"
      ),
    [options]
  );

  const filteredOrderIds = useMemo(
    () => new Set(paidPeriodOrders.map((order) => order.id)),
    [paidPeriodOrders]
  );

  const periodItems = useMemo(
    () =>
      orderItems.filter((item) =>
        filteredOrderIds.has(item.order_id)
      ),
    [orderItems, filteredOrderIds]
  );

  const productPerformance = useMemo(() => {
    const map = new Map<string, ProductPerformance>();

    periodItems.forEach((item) => {
      const quantity = Math.max(1, safeNumber(item.quantity, 1));
      const name =
        item.product_name ||
        productNameBySlug.get(String(item.product_slug || "")) ||
        "Unknown Product";

      const type =
        item.purchase_type === "kit" ? "Kit" : "Single";
      const label = `${name} · ${type}`;

      const actualUnitPrice = safeNumber(
        item.actual_unit_price ??
          item.sale_unit_price ??
          item.price
      );

      const lineRevenue = safeNumber(
        item.line_revenue,
        actualUnitPrice * quantity
      );

      const unitCost = safeNumber(item.cost);
      const lineCost = safeNumber(
        item.line_cost,
        unitCost * quantity
      );

      const lineProfit = safeNumber(
        item.line_profit,
        lineRevenue - lineCost
      );

      const current = map.get(label) || {
        name: label,
        units: 0,
        revenue: 0,
        profit: 0,
      };

      current.units += quantity;
      current.revenue += lineRevenue;
      current.profit += lineProfit;

      map.set(label, current);
    });

    return Array.from(map.values()).sort((a, b) => {
      if (topMetric === "units") return b.units - a.units;
      if (topMetric === "profit") return b.profit - a.profit;
      return b.revenue - a.revenue;
    });
  }, [periodItems, productNameBySlug, topMetric]);

  const topProducts = productPerformance.slice(0, 10);

  const trend = useMemo(
    () => buildTrend(paidPeriodOrders, selectedRange),
    [paidPeriodOrders, selectedRange]
  );

  const maxTrendRevenue = Math.max(
    1,
    ...trend.map((point) => point.revenue)
  );

  const maxTrendProfit = Math.max(
    1,
    ...trend.map((point) => Math.max(0, point.profit))
  );

  const orderCountByCustomer = useMemo(() => {
    const map = new Map<string, number>();

    paidOrdersAllTime.forEach((order) => {
      const key =
        order.user_id ||
        String(order.customer_email || "").toLowerCase();

      if (!key) return;
      map.set(key, (map.get(key) || 0) + 1);
    });

    return map;
  }, [paidOrdersAllTime]);

  const periodCustomerKeys = useMemo(() => {
    const keys = new Set<string>();

    paidPeriodOrders.forEach((order) => {
      const key =
        order.user_id ||
        String(order.customer_email || "").toLowerCase();

      if (key) keys.add(key);
    });

    return keys;
  }, [paidPeriodOrders]);

  const repeatCustomers = Array.from(periodCustomerKeys).filter(
    (key) => (orderCountByCustomer.get(key) || 0) >= 2
  ).length;

  const repeatCustomerPercent =
    periodCustomerKeys.size > 0
      ? (repeatCustomers / periodCustomerKeys.size) * 100
      : 0;

  const firstPaidOrderByCustomer = useMemo(() => {
    const map = new Map<string, Date>();

    [...paidOrdersAllTime]
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() -
          new Date(b.created_at).getTime()
      )
      .forEach((order) => {
        const key =
          order.user_id ||
          String(order.customer_email || "").toLowerCase();

        if (!key || map.has(key)) return;
        map.set(key, new Date(order.created_at));
      });

    return map;
  }, [paidOrdersAllTime]);

  const newCustomers = Array.from(
    firstPaidOrderByCustomer.entries()
  ).filter(([, firstDate]) =>
    inRange(firstDate.toISOString(), selectedRange)
  ).length;

  const periodCustomerProfiles = customers.filter((customer) => {
    const key =
      customer.id ||
      String(customer.email || "").toLowerCase();
    return periodCustomerKeys.has(key);
  });

  const averageCustomerLifetimeValue =
    periodCustomerProfiles.length > 0
      ? periodCustomerProfiles.reduce(
          (sum, customer) =>
            sum + safeNumber(customer.lifetime_spend),
          0
        ) / periodCustomerProfiles.length
      : 0;

  const vipCustomers = periodCustomerProfiles.filter(
    (customer) =>
      customer.vip_tier &&
      customer.vip_tier !== "Stone"
  ).length;

  const vipTierCounts = useMemo(() => {
    const map = new Map<string, number>();

    periodCustomerProfiles.forEach((customer) => {
      const tier = customer.vip_tier || "Stone";
      map.set(tier, (map.get(tier) || 0) + 1);
    });

    return Array.from(map.entries()).sort(
      (a, b) => b[1] - a[1]
    );
  }, [periodCustomerProfiles]);

  function exportDashboard() {
    const workbook = XLSX.utils.book_new();

    const summaryRows = [
      ["PUGPEP Business Intelligence"],
      ["Reporting Period", selectedRange.label],
      ["Generated", new Date().toLocaleString()],
      [],
      ["Metric", "Value"],
      ["Paid Orders", paidPeriodOrders.length],
      ["Revenue", Number(revenue.toFixed(2))],
      ["Costs", Number(costs.toFixed(2))],
      ["Profit", Number(profit.toFixed(2))],
      ["Margin %", Number(margin.toFixed(2))],
      ["Average Order Value", Number(aov.toFixed(2))],
      ["Discounts", Number(discounts.toFixed(2))],
      ["Sales Tax Collected", Number(salesTaxCollected.toFixed(2))],
      ["New Customers", newCustomers],
      ["Repeat Customer %", Number(repeatCustomerPercent.toFixed(2))],
      [
        "Average Customer Lifetime Value",
        Number(averageCustomerLifetimeValue.toFixed(2)),
      ],
      ["VIP Customers", vipCustomers],
      [],
      ["Operations"],
      ["Pending Payment", pendingOrders.length],
      ["Ready to Ship", readyToShipOrders.length],
      ["Paid 48+ Hours / Not Shipped", stalePaidOrders.length],
      ["Shipped", shippedOrders.length],
      ["Delivered", deliveredOrders.length],
      ["Delivered / Not Closed", deliveredNotClosed.length],
      ["Low Inventory Rows (≤5)", lowInventory.length],
      ["Pre-Sale Options", presaleOptions.length],
    ];

    const summarySheet =
      XLSX.utils.aoa_to_sheet(summaryRows);

    summarySheet["!cols"] = [
      { wch: 34 },
      { wch: 24 },
    ];

    XLSX.utils.book_append_sheet(
      workbook,
      summarySheet,
      "Summary"
    );

    const productRows = productPerformance.map((product) => ({
      Product: product.name,
      "Units Sold": product.units,
      Revenue: Number(product.revenue.toFixed(2)),
      Profit: Number(product.profit.toFixed(2)),
      "Profit Margin %":
        product.revenue > 0
          ? Number(
              (
                (product.profit / product.revenue) *
                100
              ).toFixed(2)
            )
          : 0,
    }));

    const productSheet =
      XLSX.utils.json_to_sheet(productRows);

    productSheet["!cols"] = [
      { wch: 42 },
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
      { wch: 18 },
    ];

    XLSX.utils.book_append_sheet(
      workbook,
      productSheet,
      "Product Performance"
    );

    const orderRows = paidPeriodOrders.map((order) => ({
      "Order Number": order.order_number || "",
      Date: new Date(order.created_at).toLocaleString(),
      Customer: order.customer_name || "",
      Email: order.customer_email || "",
      Revenue: Number(getOrderRevenue(order).toFixed(2)),
      Costs: Number(getOrderCost(order).toFixed(2)),
      Profit: Number(getOrderProfit(order).toFixed(2)),
      "Margin %":
        getOrderRevenue(order) > 0
          ? Number(
              (
                (getOrderProfit(order) /
                  getOrderRevenue(order)) *
                100
              ).toFixed(2)
            )
          : 0,
      Discount: Number(
        safeNumber(order.total_discount).toFixed(2)
      ),
      Payment: order.payment_method || "",
      Status: order.status || "",
      Shipping: order.shipping_status || "",
      Tracking: order.tracking_number || "",
      Promo: order.promo_code || "",
    }));

    const ordersSheet =
      XLSX.utils.json_to_sheet(orderRows);

    ordersSheet["!cols"] = [
      { wch: 18 },
      { wch: 22 },
      { wch: 24 },
      { wch: 30 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 16 },
      { wch: 14 },
      { wch: 18 },
      { wch: 24 },
      { wch: 16 },
    ];

    XLSX.utils.book_append_sheet(
      workbook,
      ordersSheet,
      "Orders"
    );

    const customerRows = periodCustomerProfiles
      .sort(
        (a, b) =>
          safeNumber(b.lifetime_spend) -
          safeNumber(a.lifetime_spend)
      )
      .map((customer) => ({
        Customer: customer.full_name || "",
        Email: customer.email || "",
        "VIP Tier": customer.vip_tier || "Stone",
        "Lifetime Spend": Number(
          safeNumber(customer.lifetime_spend).toFixed(2)
        ),
        "PugPoints": Number(
          safeNumber(customer.reward_points).toFixed(2)
        ),
        "Lifetime Paid Orders":
          orderCountByCustomer.get(customer.id) ||
          orderCountByCustomer.get(
            String(customer.email || "").toLowerCase()
          ) ||
          0,
      }));

    const customerSheet =
      XLSX.utils.json_to_sheet(customerRows);

    customerSheet["!cols"] = [
      { wch: 24 },
      { wch: 30 },
      { wch: 14 },
      { wch: 18 },
      { wch: 14 },
      { wch: 20 },
    ];

    XLSX.utils.book_append_sheet(
      workbook,
      customerSheet,
      "Customers"
    );

    const monthlySheet =
      XLSX.utils.json_to_sheet(
        buildMonthlyPerformance(paidOrdersAllTime)
      );

    monthlySheet["!cols"] = [
      { wch: 18 },
      { wch: 10 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
      { wch: 14 },
      { wch: 16 },
    ];

    XLSX.utils.book_append_sheet(
      workbook,
      monthlySheet,
      "Monthly Performance"
    );

    const inventoryRows = lowInventory.map((row) => ({
      Product:
        productNameBySlug.get(row.product_slug) ||
        row.product_slug,
      Dosage: row.dosage,
      Quantity: safeNumber(row.quantity),
      Status: row.status || "",
    }));

    const inventorySheet =
      XLSX.utils.json_to_sheet(inventoryRows);

    inventorySheet["!cols"] = [
      { wch: 28 },
      { wch: 14 },
      { wch: 10 },
      { wch: 16 },
    ];

    XLSX.utils.book_append_sheet(
      workbook,
      inventorySheet,
      "Low Inventory"
    );

    const safeLabel = selectedRange.label
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();

    const stateRows = statePerformance.map((row) => ({
      State: row.state,
      Orders: row.orders,
      Revenue: Number(row.revenue.toFixed(2)),
      Costs: Number(row.costs.toFixed(2)),
      Profit: Number(row.profit.toFixed(2)),
      "Margin %":
        row.revenue > 0
          ? Number(((row.profit / row.revenue) * 100).toFixed(2))
          : 0,
      "Sales Tax Collected": Number(row.salesTax.toFixed(2)),
    }));

    const stateSheet = XLSX.utils.json_to_sheet(stateRows);
    XLSX.utils.book_append_sheet(workbook, stateSheet, "State Performance");

    const nexusExportRows = nexusRows.map((row) => ({
      State: row.state_code,
      Name: row.state_name,
      "Qualifying Sales": Number(safeNumber(row.qualifying_sales).toFixed(2)),
      Transactions: safeNumber(row.qualifying_transactions),
      "Sales Threshold": row.sales_threshold == null ? "" : Number(row.sales_threshold),
      "Progress %": Number(safeNumber(row.overall_progress_percent).toFixed(2)),
      Status: row.nexus_status,
      "Threshold Met": row.threshold_met ? "Yes" : "No",
      "Registered": row.registered_to_collect ? "Yes" : "No",
      "Tax Collection Active": row.effective_tax_collection ? "Yes" : "No",
      Revenue: Number(safeNumber(row.revenue).toFixed(2)),
      Cost: Number(safeNumber(row.cost).toFixed(2)),
      Profit: Number(safeNumber(row.profit).toFixed(2)),
      "Historical Sales Tax Collected": Number(
        safeNumber(row.sales_tax_collected).toFixed(2)
      ),
    }));

    const nexusSheet = XLSX.utils.json_to_sheet(nexusExportRows);
    XLSX.utils.book_append_sheet(workbook, nexusSheet, "State Nexus");

    XLSX.writeFile(
      workbook,
      `PugPep-Business-Intelligence-${safeLabel || "report"}.xlsx`
    );
  }

  if (loading) {
    return (
      <main style={page}>
        <div style={loadingCard}>
          <div style={loadingRing} />
          <p style={eyebrow}>PUGPEP CONTROL CENTER</p>
          <h1 style={pageTitle}>Loading Business Intelligence</h1>
          <p style={muted}>Building your operating dashboard...</p>
        </div>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main style={page}>
        <div style={loadingCard}>
          <p style={eyebrow}>ADMIN ACCESS</p>
          <h1 style={pageTitle}>Access Denied</h1>
          <p style={muted}>
            You must be signed in with the PugPep administrator account.
          </p>
          <Link href="/login" style={primaryLink}>
            Go to Login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main style={page}>
      <div style={container}>
        <header style={pageHeader}>
          <div>
            <p style={eyebrow}>PUGPEP BUSINESS INTELLIGENCE</p>

            <h1 style={pageTitle}>Executive Dashboard</h1>

            <p style={subtitle}>
              Revenue, profitability, fulfillment, customers, product performance,
              and inventory health in one operating view.
            </p>
          </div>

          <div style={headerActions}>
            <Link href="/admin/nexus" style={secondaryLink}>
              State Nexus
            </Link>

            <Link href="/admin" style={secondaryLink}>
              Orders
            </Link>

            <button
              type="button"
              onClick={exportDashboard}
              style={exportButton}
            >
              Export Excel
            </button>
          </div>
        </header>

        {notice && (
          <div style={noticeBanner}>
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

        <section style={periodPanel}>
          <div>
            <p style={sectionEyebrow}>REPORTING PERIOD</p>
            <h2 style={sectionTitle}>{selectedRange.label}</h2>
          </div>

          <div style={periodControls}>
            <select
              value={preset}
              onChange={(event) =>
                setPreset(event.target.value as DatePreset)
              }
              style={selectInput}
            >
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="this_quarter">This Quarter</option>
              <option value="this_year">This Year</option>
              <option value="all_time">All Time</option>
              <option value="month_year">Select Month & Year</option>
              <option value="custom">Custom Range</option>
            </select>

            {preset === "month_year" && (
              <>
                <select
                  value={selectedMonth}
                  onChange={(event) =>
                    setSelectedMonth(Number(event.target.value))
                  }
                  style={selectInput}
                  aria-label="Reporting month"
                >
                  {[
                    "January",
                    "February",
                    "March",
                    "April",
                    "May",
                    "June",
                    "July",
                    "August",
                    "September",
                    "October",
                    "November",
                    "December",
                  ].map((month, index) => (
                    <option key={month} value={index}>
                      {month}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedYear}
                  onChange={(event) =>
                    setSelectedYear(Number(event.target.value))
                  }
                  style={selectInput}
                  aria-label="Reporting year"
                >
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </>
            )}

            {preset === "custom" && (
              <>
                <input
                  type="date"
                  value={customStart}
                  onChange={(event) =>
                    setCustomStart(event.target.value)
                  }
                  style={dateInput}
                />

                <input
                  type="date"
                  value={customEnd}
                  onChange={(event) =>
                    setCustomEnd(event.target.value)
                  }
                  style={dateInput}
                />
              </>
            )}
          </div>
        </section>

        <section style={heroKpiGrid}>
          <KpiCard
            label="Revenue"
            value={money(revenue)}
            accent="#00d9ff"
            change={currentRevenueChange}
          />

          <KpiCard
            label="Profit"
            value={money(profit)}
            accent={profit >= 0 ? "#00ff99" : "#ff6f6f"}
            change={currentProfitChange}
          />

          <KpiCard
            label="Paid Orders"
            value={String(paidPeriodOrders.length)}
            accent="#ff45d8"
            change={currentOrderChange}
          />

          <KpiCard
            label="Margin"
            value={`${margin.toFixed(1)}%`}
            accent={margin >= 20 ? "#00ff99" : "#ffcc00"}
          />

          <KpiCard
            label="Average Order"
            value={money(aov)}
            accent="#7df9ff"
            change={currentAovChange}
          />

          <KpiCard
            label="New Customers"
            value={String(newCustomers)}
            accent="#9ea7ff"
          />

          <KpiCard
            label="Sales Tax Collected"
            value={money(salesTaxCollected)}
            accent="#9ea7ff"
          />
        </section>

        <div style={mainGrid}>
          <section style={panel}>
            <div style={panelHeader}>
              <div>
                <p style={sectionEyebrow}>STATE NEXUS MONITOR</p>
                <h2 style={sectionTitle}>Threshold Exposure</h2>
              </div>

              <Link href="/admin/nexus" style={primaryLink}>
                Manage Nexus
              </Link>
            </div>

            <div style={healthGrid}>
              <HealthCard label="Near 75–89.99%" value={nearNexusStates.length} accent="#ffcc00" href="/admin/nexus" />
              <HealthCard label="Critical 90–99.99%" value={criticalNexusStates.length} accent="#ff8a5b" href="/admin/nexus" />
              <HealthCard label="Threshold Passed" value={passedNexusStates.length} accent="#ff6f6f" href="/admin/nexus" />
              <HealthCard label="Tax Collection Active" value={taxActiveStates.length} accent="#00ff99" href="/admin/nexus" />
            </div>

            {nexusAttention.length === 0 ? (
              <EmptyState text="No states are currently near or above their configured nexus threshold." />
            ) : (
              <div style={attentionList}>
                {nexusAttention.slice(0, 8).map((row) => (
                  <div key={row.state_code} style={attentionRow}>
                    <span><strong>{row.state_code}</strong> · {row.state_name}</span>
                    <strong
                      style={{
                        color: row.threshold_met
                          ? "#ff6f6f"
                          : row.nexus_status === "critical"
                          ? "#ff8a5b"
                          : "#ffcc00",
                      }}
                    >
                      {safeNumber(row.overall_progress_percent).toFixed(1)}%
                      {row.threshold_met
                        ? row.effective_tax_collection
                          ? " · TAX ACTIVE"
                          : " · REVIEW"
                        : ""}
                    </strong>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={panel}>
            <div style={panelHeader}>
              <div>
                <p style={sectionEyebrow}>STATE PERFORMANCE</p>
                <h2 style={sectionTitle}>Revenue, Cost & Profit</h2>
              </div>
              <span style={periodBadge}>{selectedRange.label}</span>
            </div>

            {statePerformance.length === 0 ? (
              <EmptyState text="No paid orders are available by state for this period." />
            ) : (
              <div style={attentionList}>
                {statePerformance.slice(0, 10).map((row) => (
                  <div key={row.state} style={attentionRow}>
                    <span><strong>{row.state}</strong> · {row.orders} order{row.orders === 1 ? "" : "s"}</span>
                    <span style={{ textAlign: "right" }}>
                      <strong style={{ color: "#00d9ff" }}>{money(row.revenue)}</strong>
                      {" · "}<span>{money(row.costs)} cost</span>
                      {" · "}<strong style={{ color: row.profit >= 0 ? "#00ff99" : "#ff6f6f" }}>{money(row.profit)} profit</strong>
                      {row.salesTax > 0 && (
                        <> · <span style={{ color: "#9ea7ff" }}>{money(row.salesTax)} tax</span></>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div style={mainGrid}>
          <section style={panel}>
            <div style={panelHeader}>
              <div>
                <p style={sectionEyebrow}>PERFORMANCE TREND</p>
                <h2 style={sectionTitle}>Revenue & Profit</h2>
              </div>

              <span style={periodBadge}>{selectedRange.label}</span>
            </div>

            {trend.length === 0 ? (
              <EmptyState text="No paid-order performance is available for this period." />
            ) : (
              <div style={trendChart}>
                {trend.map((point) => (
                  <div key={point.key} style={trendColumn}>
                    <div style={trendBars}>
                      <div
                        title={`${point.label} Revenue ${money(point.revenue)}`}
                        style={{
                          ...revenueBar,
                          height: `${Math.max(
                            6,
                            (point.revenue / maxTrendRevenue) * 170
                          )}px`,
                        }}
                      />

                      <div
                        title={`${point.label} Profit ${money(point.profit)}`}
                        style={{
                          ...profitBar,
                          height: `${Math.max(
                            4,
                            (Math.max(0, point.profit) /
                              maxTrendProfit) *
                              170
                          )}px`,
                        }}
                      />
                    </div>

                    <span style={trendLabel}>{point.label}</span>
                    <span style={trendOrderCount}>
                      {point.orders} order{point.orders === 1 ? "" : "s"}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div style={legendRow}>
              <span style={legendItem}>
                <span style={{ ...legendDot, background: "#00d9ff" }} />
                Revenue
              </span>

              <span style={legendItem}>
                <span style={{ ...legendDot, background: "#00ff99" }} />
                Profit
              </span>
            </div>
          </section>

          <section style={panel}>
            <div style={panelHeader}>
              <div>
                <p style={sectionEyebrow}>OPERATIONS HEALTH</p>
                <h2 style={sectionTitle}>Needs Attention</h2>
              </div>
            </div>

            <div style={healthGrid}>
              <HealthCard
                label="Pending Payment"
                value={pendingOrders.length}
                accent="#ff6f6f"
                href="/admin"
              />

              <HealthCard
                label="Ready to Ship"
                value={readyToShipOrders.length}
                accent="#ffcc00"
                href="/admin"
              />

              <HealthCard
                label="48+ Hours Unshipped"
                value={stalePaidOrders.length}
                accent="#ff8a5b"
                href="/admin"
              />

              <HealthCard
                label="Delivered / Open"
                value={deliveredNotClosed.length}
                accent="#9ea7ff"
                href="/admin"
              />

              <HealthCard
                label="Low Inventory"
                value={lowInventory.length}
                accent="#ff45d8"
                href="/admin/inventory"
              />

              <HealthCard
                label="Pre-Sale Options"
                value={presaleOptions.length}
                accent="#00d9ff"
                href="/admin/inventory"
              />
            </div>

            {lowInventory.length > 0 && (
              <div style={attentionList}>
                <span style={attentionHeading}>
                  LOW INVENTORY WATCH
                </span>

                {lowInventory.slice(0, 6).map((row) => (
                  <div
                    key={`${row.product_slug}-${row.dosage}`}
                    style={attentionRow}
                  >
                    <span>
                      {productNameBySlug.get(row.product_slug) ||
                        row.product_slug}{" "}
                      · {row.dosage}
                    </span>

                    <strong
                      style={{
                        color:
                          safeNumber(row.quantity) === 0
                            ? "#ff6f6f"
                            : "#ffcc00",
                      }}
                    >
                      {safeNumber(row.quantity)} left
                    </strong>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div style={mainGrid}>
          <section style={panel}>
            <div style={panelHeader}>
              <div>
                <p style={sectionEyebrow}>PRODUCT PERFORMANCE</p>
                <h2 style={sectionTitle}>Top Products</h2>
              </div>

              <div style={metricTabs}>
                {[
                  { key: "revenue", label: "Revenue" },
                  { key: "profit", label: "Profit" },
                  { key: "units", label: "Units" },
                ].map((item) => {
                  const active = topMetric === item.key;

                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() =>
                        setTopMetric(item.key as TopMetric)
                      }
                      style={{
                        ...metricTab,
                        borderColor: active
                          ? "#00ff99"
                          : "rgba(255,255,255,.14)",
                        color: active
                          ? "#00ff99"
                          : "#b8b8c0",
                        background: active
                          ? "rgba(0,255,153,.08)"
                          : "rgba(255,255,255,.03)",
                      }}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {topProducts.length === 0 ? (
              <EmptyState text="No product sales are available for this reporting period." />
            ) : (
              <div style={productRanking}>
                {topProducts.map((product, index) => {
                  const metricValue =
                    topMetric === "units"
                      ? product.units
                      : topMetric === "profit"
                      ? product.profit
                      : product.revenue;

                  const maxValue =
                    topMetric === "units"
                      ? Math.max(1, topProducts[0]?.units || 1)
                      : topMetric === "profit"
                      ? Math.max(1, topProducts[0]?.profit || 1)
                      : Math.max(1, topProducts[0]?.revenue || 1);

                  return (
                    <div key={product.name} style={rankingRow}>
                      <div style={rankingHeader}>
                        <div style={rankingName}>
                          <span style={rankingNumber}>
                            {index + 1}
                          </span>
                          <strong>{product.name}</strong>
                        </div>

                        <strong style={rankingValue}>
                          {topMetric === "units"
                            ? `${product.units} units`
                            : money(metricValue)}
                        </strong>
                      </div>

                      <div style={rankingTrack}>
                        <div
                          style={{
                            ...rankingFill,
                            width: `${Math.max(
                              3,
                              Math.min(
                                100,
                                (Math.max(0, metricValue) /
                                  maxValue) *
                                  100
                              )
                            )}%`,
                          }}
                        />
                      </div>

                      <div style={rankingMeta}>
                        <span>{product.units} units</span>
                        <span>{money(product.revenue)} revenue</span>
                        <span>{money(product.profit)} profit</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section style={panel}>
            <div style={panelHeader}>
              <div>
                <p style={sectionEyebrow}>CUSTOMER INTELLIGENCE</p>
                <h2 style={sectionTitle}>Customer Growth</h2>
              </div>
            </div>

            <div style={customerMetricGrid}>
              <MiniMetric
                label="Customers Ordering"
                value={String(periodCustomerKeys.size)}
                accent="#00d9ff"
              />

              <MiniMetric
                label="New Customers"
                value={String(newCustomers)}
                accent="#00ff99"
              />

              <MiniMetric
                label="Repeat Rate"
                value={`${repeatCustomerPercent.toFixed(1)}%`}
                accent="#ff45d8"
              />

              <MiniMetric
                label="Avg Lifetime Value"
                value={money(averageCustomerLifetimeValue)}
                accent="#ffcc00"
              />

              <MiniMetric
                label="VIP Customers"
                value={String(vipCustomers)}
                accent="#9ea7ff"
              />

              <MiniMetric
                label="Discounts Given"
                value={money(discounts)}
                accent="#ff75df"
              />
            </div>

            <div style={tierPanel}>
              <span style={attentionHeading}>VIP TIER MIX</span>

              {vipTierCounts.length === 0 ? (
                <p style={muted}>No customer tier data in this period.</p>
              ) : (
                vipTierCounts.map(([tier, count]) => (
                  <div key={tier} style={tierRow}>
                    <span>{tier}</span>
                    <strong>{count}</strong>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <section style={financialPanel}>
          <div style={panelHeader}>
            <div>
              <p style={sectionEyebrow}>FINANCIAL DETAIL</p>
              <h2 style={sectionTitle}>Period Economics</h2>
            </div>
          </div>

          <div style={financialGrid}>
            <FinancialCard
              label="Revenue"
              value={money(revenue)}
              accent="#00d9ff"
            />

            <FinancialCard
              label="Historical Costs"
              value={money(costs)}
              accent="#ffcc66"
            />

            <FinancialCard
              label="Profit"
              value={money(profit)}
              accent={profit >= 0 ? "#00ff99" : "#ff6f6f"}
            />

            <FinancialCard
              label="Margin"
              value={`${margin.toFixed(1)}%`}
              accent={margin >= 20 ? "#00ff99" : "#ffcc00"}
            />

            <FinancialCard
              label="Discounts"
              value={money(discounts)}
              accent="#ff75df"
            />

            <FinancialCard
              label="Average Order"
              value={money(aov)}
              accent="#7df9ff"
            />
          </div>
        </section>

        <section style={navigationPanel}>
          <div style={panelHeader}>
            <div>
              <p style={sectionEyebrow}>ADMIN WORKSPACES</p>
              <h2 style={sectionTitle}>Control Center</h2>
            </div>
          </div>

          <div style={adminLinksGrid}>
            <AdminCard
              title="Orders"
              description="Payments, fulfillment, tracking, and order corrections"
              href="/admin"
              accent="#00d9ff"
            />

            <AdminCard
              title="Dashboard"
              description="Business intelligence and performance"
              href="/admin/dashboard"
              accent="#ff45d8"
            />

            <AdminCard
              title="Products"
              description="Product catalog and website details"
              href="/admin/products"
              accent="#00ff99"
            />

            <AdminCard
              title="Inventory"
              description="Stock, dosages, kits, and availability"
              href="/admin/inventory"
              accent="#ffcc00"
            />

            <AdminCard
              title="Pricing / Options"
              description="Product options, pricing, and configuration"
              href="/admin/options"
              accent="#9ea7ff"
            />

            <AdminCard
              title="Email Campaigns"
              description="Customer communication and campaigns"
              href="/admin/email"
              accent="#ff75df"
            />

            <AdminCard
              title="VIP Customers"
              description="Loyalty, lifetime spend, and tier management"
              href="/admin/vip"
              accent="#7df9ff"
            />
          </div>
        </section>
      </div>

      <style jsx>{`
        @media (max-width: 820px) {
          .dashboard-mobile-stack {
            grid-template-columns: minmax(0, 1fr) !important;
          }
        }
      `}</style>
    </main>
  );
}

function KpiCard({
  label,
  value,
  accent,
  change,
}: {
  label: string;
  value: string;
  accent: string;
  change?: number | null;
}) {
  const hasChange = typeof change === "number";
  const positive = hasChange && change >= 0;

  return (
    <article
      style={{
        ...kpiCard,
        borderColor: `${accent}55`,
        boxShadow: `0 0 24px ${accent}12`,
      }}
    >
      <span style={{ ...kpiLabel, color: accent }}>{label}</span>
      <strong style={kpiValue}>{value}</strong>

      {change === null ? (
        <span style={kpiChangeMuted}>No prior-period comparison</span>
      ) : hasChange ? (
        <span
          style={{
            ...kpiChange,
            color: positive ? "#00ff99" : "#ff6f6f",
          }}
        >
          {positive ? "▲" : "▼"} {Math.abs(change).toFixed(1)}% vs prior period
        </span>
      ) : null}
    </article>
  );
}

function HealthCard({
  label,
  value,
  accent,
  href,
}: {
  label: string;
  value: number;
  accent: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      style={{
        ...healthCard,
        borderColor: `${accent}45`,
        textDecoration: "none",
      }}
    >
      <span style={{ ...healthLabel, color: accent }}>{label}</span>
      <strong style={healthValue}>{value}</strong>
      <span style={healthCta}>OPEN WORKSPACE →</span>
    </Link>
  );
}

function MiniMetric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div style={miniMetric}>
      <span style={miniMetricLabel}>{label}</span>
      <strong style={{ ...miniMetricValue, color: accent }}>
        {value}
      </strong>
    </div>
  );
}

function FinancialCard({
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
        ...financialCard,
        borderColor: `${accent}35`,
      }}
    >
      <span style={financialLabel}>{label}</span>
      <strong style={{ ...financialValue, color: accent }}>
        {value}
      </strong>
    </div>
  );
}

function AdminCard({
  title,
  description,
  href,
  accent,
}: {
  title: string;
  description: string;
  href: string;
  accent: string;
}) {
  return (
    <Link
      href={href}
      style={{
        ...adminCard,
        borderColor: `${accent}38`,
        boxShadow: `0 0 22px ${accent}0d`,
      }}
    >
      <span style={{ ...adminCardEyebrow, color: accent }}>
        PUGPEP ADMIN
      </span>

      <strong style={adminCardTitle}>{title}</strong>

      <span style={adminCardDescription}>{description}</span>

      <span style={{ ...adminCardCta, color: accent }}>
        OPEN →
      </span>
    </Link>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={emptyState}>
      <span style={{ fontSize: 32 }}>📊</span>
      <p style={{ ...muted, margin: 0 }}>{text}</p>
    </div>
  );
}

const page = {
  minHeight: "100vh",
  padding: "clamp(18px, 4vw, 34px)",
  background:
    "radial-gradient(circle at 12% 0%, rgba(255,69,216,.13), transparent 29%), radial-gradient(circle at 88% 3%, rgba(0,217,255,.13), transparent 31%), radial-gradient(circle at 50% 100%, rgba(0,255,153,.055), transparent 28%), #000",
  color: "#fff",
  fontSize: 16,
  lineHeight: 1.5,
};

const container = {
  width: "100%",
  maxWidth: 1480,
  margin: "0 auto",
};

const pageHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 22,
  flexWrap: "wrap" as const,
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
  fontSize: "clamp(42px, 7vw, 64px)",
  letterSpacing: "-.04em",
  textShadow: "0 0 22px rgba(255,69,216,.24)",
};

const subtitle = {
  maxWidth: 840,
  margin: "12px 0 0",
  color: "#c0c0c8",
  fontSize: 18,
  lineHeight: 1.7,
};

const headerActions = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap" as const,
};

const primaryLink = {
  minHeight: 48,
  padding: "11px 16px",
  display: "grid",
  placeItems: "center",
  border: "1px solid rgba(0,255,153,.5)",
  borderRadius: 10,
  background: "rgba(0,255,153,.08)",
  color: "#00ff99",
  textDecoration: "none",
  fontWeight: 900,
};

const secondaryLink = {
  minHeight: 48,
  padding: "11px 16px",
  display: "grid",
  placeItems: "center",
  border: "1px solid rgba(0,217,255,.44)",
  borderRadius: 10,
  background: "rgba(0,217,255,.06)",
  color: "#7df9ff",
  textDecoration: "none",
  fontWeight: 900,
};

const exportButton = {
  minHeight: 48,
  padding: "11px 17px",
  border: "1px solid #45d97a",
  borderRadius: 10,
  background: "linear-gradient(180deg, #2eea6f, #19b857)",
  color: "#fff",
  fontWeight: 900,
  cursor: "pointer",
  fontSize: 15,
};

const noticeBanner = {
  marginTop: 18,
  padding: "12px 14px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 15,
  border: "1px solid rgba(255,204,0,.42)",
  borderRadius: 12,
  background: "rgba(255,204,0,.07)",
  color: "#ffdd66",
  fontWeight: 800,
};

const noticeClose = {
  border: 0,
  background: "transparent",
  color: "#ffdd66",
  fontSize: 25,
  cursor: "pointer",
};

const periodPanel = {
  marginTop: 22,
  padding: "18px 20px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 18,
  flexWrap: "wrap" as const,
  border: "1px solid rgba(0,217,255,.28)",
  borderRadius: 18,
  background:
    "linear-gradient(145deg, rgba(0,217,255,.055), rgba(255,69,216,.035))",
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
  color: "#f4f5f7",
  fontSize: "clamp(24px, 4vw, 31px)",
};

const periodControls = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap" as const,
};

const selectInput = {
  minHeight: 48,
  padding: "0 14px",
  border: "1px solid rgba(0,217,255,.35)",
  borderRadius: 10,
  background: "#050507",
  color: "#fff",
  fontWeight: 800,
  fontSize: 15,
};

const dateInput = {
  minHeight: 48,
  padding: "0 13px",
  border: "1px solid rgba(255,255,255,.16)",
  borderRadius: 10,
  background: "#050507",
  color: "#fff",
  fontSize: 15,
};

const heroKpiGrid = {
  marginTop: 18,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 14,
};

const kpiCard = {
  minHeight: 148,
  padding: 20,
  display: "flex",
  flexDirection: "column" as const,
  justifyContent: "space-between",
  gap: 8,
  border: "1px solid",
  borderRadius: 18,
  background:
    "linear-gradient(145deg, rgba(13,13,18,.97), rgba(5,5,8,.98))",
};

const kpiLabel = {
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: ".11em",
  textTransform: "uppercase" as const,
};

const kpiValue = {
  fontSize: "clamp(28px, 4vw, 38px)",
  letterSpacing: "-.03em",
};

const kpiChange = {
  fontSize: 11,
  fontWeight: 900,
};

const kpiChangeMuted = {
  color: "#777d86",
  fontSize: 11,
  fontWeight: 700,
};

const mainGrid = {
  marginTop: 18,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 480px), 1fr))",
  gap: 18,
};

const panel = {
  padding: "clamp(18px, 3vw, 24px)",
  border: "1px solid rgba(255,255,255,.11)",
  borderRadius: 20,
  background:
    "linear-gradient(145deg, rgba(9,9,13,.97), rgba(5,5,8,.98))",
  boxShadow: "0 18px 50px rgba(0,0,0,.22)",
};

const panelHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 14,
  flexWrap: "wrap" as const,
  marginBottom: 18,
};

const periodBadge = {
  padding: "6px 10px",
  border: "1px solid rgba(0,255,153,.28)",
  borderRadius: 999,
  color: "#00ff99",
  background: "rgba(0,255,153,.05)",
  fontSize: 11,
  fontWeight: 900,
};

const trendChart = {
  minHeight: 230,
  display: "flex",
  alignItems: "flex-end",
  gap: 9,
  overflowX: "auto" as const,
  padding: "20px 5px 8px",
  borderBottom: "1px solid rgba(255,255,255,.08)",
};

const trendColumn = {
  minWidth: 54,
  flex: "1 0 54px",
  display: "grid",
  justifyItems: "center",
  gap: 5,
};

const trendBars = {
  height: 176,
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  gap: 4,
};

const revenueBar = {
  width: 14,
  minHeight: 4,
  borderRadius: "6px 6px 2px 2px",
  background:
    "linear-gradient(180deg, rgba(125,249,255,.95), rgba(0,217,255,.52))",
  boxShadow: "0 0 12px rgba(0,217,255,.18)",
};

const profitBar = {
  width: 14,
  minHeight: 4,
  borderRadius: "6px 6px 2px 2px",
  background:
    "linear-gradient(180deg, rgba(120,255,190,.95), rgba(0,255,153,.48))",
  boxShadow: "0 0 12px rgba(0,255,153,.15)",
};

const trendLabel = {
  color: "#b8bbc2",
  fontSize: 10,
  fontWeight: 800,
  whiteSpace: "nowrap" as const,
};

const trendOrderCount = {
  color: "#656b73",
  fontSize: 9,
  whiteSpace: "nowrap" as const,
};

const legendRow = {
  marginTop: 14,
  display: "flex",
  gap: 16,
  flexWrap: "wrap" as const,
};

const legendItem = {
  display: "flex",
  alignItems: "center",
  gap: 7,
  color: "#aeb1b8",
  fontSize: 12,
  fontWeight: 800,
};

const legendDot = {
  width: 8,
  height: 8,
  borderRadius: 999,
};

const healthGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
  gap: 10,
};

const healthCard = {
  minHeight: 116,
  padding: 14,
  display: "grid",
  gap: 5,
  alignContent: "space-between",
  border: "1px solid",
  borderRadius: 14,
  background: "rgba(255,255,255,.025)",
};

const healthLabel = {
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: ".08em",
  textTransform: "uppercase" as const,
};

const healthValue = {
  color: "#fff",
  fontSize: 31,
};

const healthCta = {
  color: "#777d84",
  fontSize: 9,
  fontWeight: 900,
};

const attentionList = {
  marginTop: 16,
  padding: 14,
  display: "grid",
  gap: 8,
  border: "1px solid rgba(255,204,0,.18)",
  borderRadius: 13,
  background: "rgba(255,204,0,.035)",
};

const attentionHeading = {
  color: "#9fa3aa",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: ".12em",
};

const attentionRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  color: "#d7d8dd",
  fontSize: 13,
};

const metricTabs = {
  display: "flex",
  gap: 6,
  flexWrap: "wrap" as const,
};

const metricTab = {
  minHeight: 36,
  padding: "7px 11px",
  border: "1px solid",
  borderRadius: 999,
  cursor: "pointer",
  fontWeight: 900,
  fontSize: 11,
};

const productRanking = {
  display: "grid",
  gap: 14,
};

const rankingRow = {
  display: "grid",
  gap: 7,
};

const rankingHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: 14,
  alignItems: "center",
};

const rankingName = {
  minWidth: 0,
  display: "flex",
  alignItems: "center",
  gap: 9,
  color: "#ebedf0",
  fontSize: 13,
};

const rankingNumber = {
  width: 25,
  height: 25,
  display: "grid",
  placeItems: "center",
  flex: "0 0 25px",
  borderRadius: 999,
  border: "1px solid rgba(255,69,216,.35)",
  background: "rgba(255,69,216,.06)",
  color: "#ff75df",
  fontSize: 10,
  fontWeight: 900,
};

const rankingValue = {
  color: "#00ff99",
  fontSize: 13,
  whiteSpace: "nowrap" as const,
};

const rankingTrack = {
  width: "100%",
  height: 8,
  overflow: "hidden",
  borderRadius: 999,
  background: "#08090b",
};

const rankingFill = {
  height: "100%",
  borderRadius: 999,
  background:
    "linear-gradient(90deg, #00d9ff, #ff45d8, #00ff99)",
};

const rankingMeta = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap" as const,
  color: "#777c84",
  fontSize: 10,
};

const customerMetricGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
  gap: 10,
};

const miniMetric = {
  minHeight: 92,
  padding: 13,
  display: "grid",
  alignContent: "space-between",
  gap: 7,
  border: "1px solid rgba(255,255,255,.08)",
  borderRadius: 13,
  background: "rgba(255,255,255,.025)",
};

const miniMetricLabel = {
  color: "#9599a1",
  fontSize: 10,
  fontWeight: 900,
  textTransform: "uppercase" as const,
};

const miniMetricValue = {
  fontSize: 24,
};

const tierPanel = {
  marginTop: 16,
  padding: 14,
  display: "grid",
  gap: 8,
  border: "1px solid rgba(158,167,255,.18)",
  borderRadius: 13,
  background: "rgba(158,167,255,.03)",
};

const tierRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  color: "#d2d4da",
  fontSize: 13,
};

const financialPanel = {
  ...panel,
  marginTop: 18,
};

const financialGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))",
  gap: 12,
};

const financialCard = {
  minHeight: 110,
  padding: 16,
  display: "grid",
  alignContent: "space-between",
  gap: 9,
  border: "1px solid",
  borderRadius: 14,
  background: "rgba(255,255,255,.022)",
};

const financialLabel = {
  color: "#979ba3",
  fontSize: 11,
  fontWeight: 900,
  textTransform: "uppercase" as const,
};

const financialValue = {
  fontSize: 27,
};

const navigationPanel = {
  ...panel,
  marginTop: 18,
};

const adminLinksGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: 12,
};

const adminCard = {
  minHeight: 154,
  padding: 17,
  display: "flex",
  flexDirection: "column" as const,
  gap: 7,
  border: "1px solid",
  borderRadius: 15,
  background:
    "linear-gradient(145deg, rgba(255,255,255,.025), rgba(0,0,0,.18))",
  color: "#fff",
  textDecoration: "none",
};

const adminCardEyebrow = {
  fontSize: 9,
  fontWeight: 900,
  letterSpacing: ".11em",
};

const adminCardTitle = {
  marginTop: 5,
  fontSize: 21,
};

const adminCardDescription = {
  color: "#8e929a",
  fontSize: 12,
  lineHeight: 1.5,
};

const adminCardCta = {
  marginTop: "auto",
  fontSize: 11,
  fontWeight: 900,
};

const emptyState = {
  minHeight: 180,
  display: "grid",
  placeItems: "center",
  alignContent: "center",
  gap: 10,
  textAlign: "center" as const,
  border: "1px dashed rgba(255,255,255,.12)",
  borderRadius: 14,
  background: "rgba(255,255,255,.015)",
};

const muted = {
  color: "#a5a8af",
  lineHeight: 1.65,
};

const loadingCard = {
  width: "min(760px, 100%)",
  margin: "80px auto",
  padding: "clamp(24px, 5vw, 42px)",
  display: "grid",
  justifyItems: "center",
  textAlign: "center" as const,
  gap: 12,
  border: "1px solid rgba(0,217,255,.26)",
  borderRadius: 20,
  background:
    "linear-gradient(145deg, rgba(10,10,14,.98), rgba(5,5,8,.98))",
};

const loadingRing = {
  width: 38,
  height: 38,
  border: "3px solid rgba(255,255,255,.10)",
  borderTopColor: "#00d9ff",
  borderRadius: 999,
};