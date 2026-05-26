"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabaseClient";

type Stats = {
  revenue: number;
  totalOrders: number;
  pendingOrders: number;
  paidOrders: number;
  shippedOrders: number;
  todayRevenue: number;

  productCosts: number;
  estimatedShippingCosts: number;
  estimatedPackagingCosts: number;
  estimatedNetProfit: number;

  averageOrderValue: number;
  repeatCustomerPercent: number;
  averageCustomerLifetimeValue: number;

  vipCustomers: number;
  totalCustomers: number;
};

type TopProduct = {
  name: string;
  quantity: number;
};

export default function AdminDashboardPage() {
  const supabase = createClient();

  const [stats, setStats] = useState<Stats>({
    revenue: 0,
    totalOrders: 0,
    pendingOrders: 0,
    paidOrders: 0,
    shippedOrders: 0,
    todayRevenue: 0,

    productCosts: 0,
    estimatedShippingCosts: 0,
    estimatedPackagingCosts: 0,
    estimatedNetProfit: 0,

    averageOrderValue: 0,
    repeatCustomerPercent: 0,
    averageCustomerLifetimeValue: 0,

    vipCustomers: 0,
    totalCustomers: 0,
  });

  const [topProducts, setTopProducts] = useState<
    TopProduct[]
  >([]);

  useEffect(() => {
    async function loadDashboard() {
      const { data: orders } = await supabase
        .from("orders")
        .select("*");

      const { data: orderItems } = await supabase
        .from("order_items")
        .select("*");

      const { data: customers } = await supabase
        .from("customer_profiles")
        .select("*");

      const allOrders = orders || [];
      const allItems = orderItems || [];
      const allCustomers = customers || [];

      const paidOrders = allOrders.filter(
        (o) => o.status === "paid"
      );

      const pendingOrders = allOrders.filter(
        (o) => o.status === "pending"
      );

      const shippedOrders = allOrders.filter(
        (o) => o.shipping_status === "shipped"
      );

      const now = new Date();

      const todayOrders = paidOrders.filter(
        (order) => {
          const orderDate = new Date(
            order.created_at
          );

          return (
            orderDate.getDate() ===
              now.getDate() &&
            orderDate.getMonth() ===
              now.getMonth() &&
            orderDate.getFullYear() ===
              now.getFullYear()
          );
        }
      );

      const revenue = paidOrders.reduce(
        (sum, order) =>
          sum + Number(order.total || 0),
        0
      );

      const todayRevenue = todayOrders.reduce(
        (sum, order) =>
          sum + Number(order.total || 0),
        0
      );

      // TRUE HISTORICAL COSTS
      const productCosts = paidOrders.reduce(
        (sum, order) =>
          sum +
          Number(order.product_cost_total || 0),
        0
      );

      const estimatedShippingCosts =
        paidOrders.reduce(
          (sum, order) =>
            sum +
            Number(
              order.estimated_shipping_cost ||
                0
            ),
          0
        );

      const estimatedPackagingCosts =
        paidOrders.reduce(
          (sum, order) =>
            sum +
            Number(
              order.estimated_packaging_cost ||
                0
            ),
          0
        );

      const estimatedNetProfit =
        paidOrders.reduce(
          (sum, order) =>
            sum +
            Number(
              order.estimated_profit || 0
            ),
          0
        );

      const averageOrderValue =
        paidOrders.length > 0
          ? revenue / paidOrders.length
          : 0;

      const totalCustomers =
        allCustomers.length;

      const vipCustomers =
        allCustomers.filter(
          (c) =>
            c.vip_tier &&
            c.vip_tier !== "Stone"
        ).length;

      const repeatCustomers =
        allCustomers.filter((customer) => {
          const customerOrders =
            paidOrders.filter(
              (order) =>
                order.user_id === customer.id
            );

          return customerOrders.length >= 2;
        });

      const repeatCustomerPercent =
        totalCustomers > 0
          ? (repeatCustomers.length /
              totalCustomers) *
            100
          : 0;

      const averageCustomerLifetimeValue =
        totalCustomers > 0
          ? revenue / totalCustomers
          : 0;

      // TOP PRODUCTS
      const productSales: Record<
        string,
        number
      > = {};

      allItems.forEach((item) => {
        const name =
          item.product_name || "Unknown";

        const type =
          item.purchase_type === "kit"
            ? "Kit"
            : "Single Vial";

        const label = `${name} (${type})`;

        productSales[label] =
          (productSales[label] || 0) +
          Number(item.quantity || 1);
      });

      const sortedProducts =
        Object.entries(productSales)
          .map(([name, quantity]) => ({
            name,
            quantity,
          }))
          .sort(
            (a, b) =>
              b.quantity - a.quantity
          )
          .slice(0, 10);

      setTopProducts(sortedProducts);

      setStats({
        revenue,
        totalOrders: allOrders.length,
        pendingOrders:
          pendingOrders.length,
        paidOrders: paidOrders.length,
        shippedOrders:
          shippedOrders.length,
        todayRevenue,

        productCosts,
        estimatedShippingCosts,
        estimatedPackagingCosts,
        estimatedNetProfit,

        averageOrderValue,
        repeatCustomerPercent,
        averageCustomerLifetimeValue,

        vipCustomers,
        totalCustomers,
      });
    }

    loadDashboard();
  }, []);

  return (
    <main style={page}>
      <h1 style={{ color: "#ff45d8" }}>
        Admin Dashboard
      </h1>

      <div style={statsGrid}>
        <StatCard
          title="Total Revenue"
          value={`$${stats.revenue.toFixed(2)}`}
          color="#00ff99"
        />

        <StatCard
          title="Revenue Today"
          value={`$${stats.todayRevenue.toFixed(
            2
          )}`}
          color="#00d9ff"
        />

        <StatCard
          title="Total Orders"
          value={stats.totalOrders}
          color="#ff45d8"
        />

        <StatCard
          title="Pending Orders"
          value={stats.pendingOrders}
          color="#ff4d4d"
        />

        <StatCard
          title="Paid Orders"
          value={stats.paidOrders}
          color="#ffcc00"
        />

        <StatCard
          title="Shipped Orders"
          value={stats.shippedOrders}
          color="#00d9ff"
        />

        <StatCard
          title="Product Costs"
          value={`$${stats.productCosts.toFixed(
            2
          )}`}
          color="#ff4d4d"
        />

        <StatCard
          title="Shipping Costs"
          value={`$${stats.estimatedShippingCosts.toFixed(
            2
          )}`}
          color="#ffcc00"
        />

        <StatCard
          title="Packaging Costs"
          value={`$${stats.estimatedPackagingCosts.toFixed(
            2
          )}`}
          color="#ff9900"
        />

        <StatCard
          title="Estimated Net Profit"
          value={`$${stats.estimatedNetProfit.toFixed(
            2
          )}`}
          color="#00ff99"
        />

        <StatCard
          title="Average Order Value"
          value={`$${stats.averageOrderValue.toFixed(
            2
          )}`}
          color="#00d9ff"
        />

        <StatCard
          title="Repeat Customer %"
          value={`${stats.repeatCustomerPercent.toFixed(
            1
          )}%`}
          color="#ff45d8"
        />

        <StatCard
          title="Customer Lifetime Value"
          value={`$${stats.averageCustomerLifetimeValue.toFixed(
            2
          )}`}
          color="#00ff99"
        />

        <StatCard
          title="VIP Customers"
          value={stats.vipCustomers}
          color="#ffcc00"
        />

        <StatCard
          title="Total Customers"
          value={stats.totalCustomers}
          color="#8888ff"
        />
      </div>

      <section style={sectionBox}>
        <h2
          style={{
            color: "#00d9ff",
            marginBottom: 25,
          }}
        >
          Top Selling Products
        </h2>

        <div
          style={{
            display: "grid",
            gap: 16,
          }}
        >
          {topProducts.length === 0 ? (
            <p style={{ color: "#888" }}>
              No product sales yet.
            </p>
          ) : (
            topProducts.map((product) => (
              <div key={product.name}>
                <div style={barHeader}>
                  <span>{product.name}</span>

                  <span>
                    {product.quantity} sold
                  </span>
                </div>

                <div style={barTrack}>
                  <div
                    style={{
                      ...barFill,
                      width: `${Math.min(
                        product.quantity * 10,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <div style={adminLinksGrid}>
        <AdminCard
          title="Orders"
          href="/admin"
        />

        <AdminCard
          title="Dashboard"
          href="/admin/dashboard"
        />

        <AdminCard
          title="Products"
          href="/admin/products"
        />

        <AdminCard
          title="Inventory"
          href="/admin/inventory"
        />

        <AdminCard
          title="Pricing / Options"
          href="/admin/options"
        />

        <AdminCard
          title="Email Campaigns"
          href="/admin/email"
        />

        <AdminCard
          title="VIP Customers"
          href="/admin/vip"
        />
      </div>
    </main>
  );
}

function StatCard({
  title,
  value,
  color,
}: {
  title: string;
  value: string | number;
  color: string;
}) {
  return (
    <div
      style={{
        padding: 24,
        borderRadius: 16,
        background: "#111",
        border: `1px solid ${color}`,
        boxShadow: `0 0 18px ${color}33`,
      }}
    >
      <div
        style={{
          color,
          fontSize: 14,
          marginBottom: 10,
          fontWeight: "bold",
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 32,
          fontWeight: "bold",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function AdminCard({
  title,
  href,
}: {
  title: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      style={adminCard}
    >
      {title}
    </Link>
  );
}

const page = {
  minHeight: "100vh",
  background: "#000",
  color: "#fff",
  padding: 35,
};

const statsGrid = {
  display: "grid",
  gap: 18,
  gridTemplateColumns:
    "repeat(auto-fit, minmax(220px, 1fr))",

  marginTop: 25,
  marginBottom: 35,
};

const sectionBox = {
  marginBottom: 40,
  padding: 24,
  borderRadius: 16,
  background: "#111",
  border: "1px solid #333",
};

const barHeader = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: 6,
  fontWeight: "bold",
};

const barTrack = {
  width: "100%",
  height: 18,
  background: "#050505",
  borderRadius: 999,
  overflow: "hidden",
};

const barFill = {
  height: "100%",
  background:
    "linear-gradient(90deg, #00b7ff, #ff2fd0)",
};

const adminLinksGrid = {
  display: "grid",
  gap: 18,
  gridTemplateColumns:
    "repeat(auto-fit, minmax(220px, 1fr))",
};

const adminCard = {
  padding: 24,
  borderRadius: 16,
  background: "#111",
  border: "1px solid #333",
  color: "#fff",
  textDecoration: "none",
  fontWeight: "bold",
  boxShadow:
    "0 0 20px rgba(255,45,216,.18)",
};