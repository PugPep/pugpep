"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../../lib/supabaseClient";

const ADMIN_EMAIL = "pugpep99@gmail.com";

type AnalyticsEvent = {
  id: string;
  event_type: string;
  page_path?: string | null;
  product_slug?: string | null;
  order_number?: string | null;
  promo_code?: string | null;
  payment_method?: string | null;
  metadata?: any;
  created_at: string;
};

export default function AnalyticsPage() {
  const supabase = createClient();

  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email;

      if (!email || email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
        setAuthorized(false);
        setLoading(false);
        return;
      }

      setAuthorized(true);
      await loadEvents();
      setLoading(false);
    }

    init();
  }, []);

  async function loadEvents() {
    const { data, error } = await supabase
      .from("analytics_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) {
      alert(error.message);
      return;
    }

    setEvents(data || []);
  }

  const stats = useMemo(() => {
    const count = (type: string) =>
      events.filter((event) => event.event_type === type).length;

    const paymentMethods: Record<string, number> = {};
    const promoCodes: Record<string, number> = {};

    events.forEach((event) => {
      if (event.payment_method) {
        paymentMethods[event.payment_method] =
          (paymentMethods[event.payment_method] || 0) + 1;
      }

      if (event.promo_code) {
        promoCodes[event.promo_code] =
          (promoCodes[event.promo_code] || 0) + 1;
      }
    });

    return {
      totalEvents: events.length,
      checkoutStarted: count("checkout_started"),
      ordersCreated: count("order_created"),
      ordersConfirmed: count("order_confirmed"),
      paymentMethodSelected: count("payment_method_selected"),
      productViews: count("product_view"),
      addToCart: count("add_to_cart"),
      paymentMethods,
      promoCodes,
    };
  }, [events]);

  if (loading) {
    return <main style={page}>Loading analytics...</main>;
  }

  if (!authorized) {
    return (
      <main style={page}>
        <h1 style={{ color: "#ff45d8" }}>Access Denied</h1>
      </main>
    );
  }

  return (
    <main style={page}>
      <h1 style={{ color: "#ff45d8" }}>Analytics Dashboard</h1>

      <section style={grid}>
        <StatCard label="Total Events" value={stats.totalEvents} />
        <StatCard label="Checkout Started" value={stats.checkoutStarted} />
        <StatCard label="Orders Created" value={stats.ordersCreated} />
        <StatCard label="Orders Confirmed" value={stats.ordersConfirmed} />
        <StatCard label="Payment Clicks" value={stats.paymentMethodSelected} />
        <StatCard label="Product Views" value={stats.productViews} />
        <StatCard label="Add To Cart" value={stats.addToCart} />
      </section>

      <section style={box}>
        <h2 style={heading}>Payment Method Interest</h2>

        {Object.keys(stats.paymentMethods).length === 0 ? (
          <p style={text}>No payment method data yet.</p>
        ) : (
          Object.entries(stats.paymentMethods).map(([method, count]) => (
            <div key={method} style={row}>
              <span>{method}</span>
              <strong>{count}</strong>
            </div>
          ))
        )}
      </section>

      <section style={box}>
        <h2 style={heading}>Promo Code Usage</h2>

        {Object.keys(stats.promoCodes).length === 0 ? (
          <p style={text}>No promo code data yet.</p>
        ) : (
          Object.entries(stats.promoCodes).map(([code, count]) => (
            <div key={code} style={row}>
              <span>{code}</span>
              <strong>{count}</strong>
            </div>
          ))
        )}
      </section>

      <section style={box}>
        <h2 style={heading}>Recent Events</h2>

        {events.length === 0 ? (
          <p style={text}>No analytics events found.</p>
        ) : (
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Time</th>
                <th style={th}>Event</th>
                <th style={th}>Order</th>
                <th style={th}>Payment</th>
                <th style={th}>Promo</th>
              </tr>
            </thead>

            <tbody>
              {events.slice(0, 50).map((event) => (
                <tr key={event.id}>
                  <td style={td}>
                    {new Date(event.created_at).toLocaleString()}
                  </td>
                  <td style={td}>{event.event_type}</td>
                  <td style={td}>{event.order_number || "-"}</td>
                  <td style={td}>{event.payment_method || "-"}</td>
                  <td style={td}>{event.promo_code || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div style={statCard}>
      <div style={statValue}>{value}</div>
      <div style={statLabel}>{label}</div>
    </div>
  );
}

const page = {
  minHeight: "100vh",
  background: "#000",
  color: "#fff",
  padding: 35,
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 16,
  marginTop: 25,
};

const statCard = {
  padding: 20,
  border: "1px solid rgba(255,255,255,.18)",
  borderRadius: 16,
  background: "rgba(255,255,255,.05)",
};

const statValue = {
  fontSize: 36,
  color: "#00d9ff",
  fontWeight: "bold",
};

const statLabel = {
  color: "#ccc",
  marginTop: 8,
};

const box = {
  marginTop: 25,
  padding: 22,
  border: "1px solid rgba(255,255,255,.18)",
  borderRadius: 16,
  background: "rgba(0,0,0,.58)",
};

const heading = {
  color: "#00d9ff",
  marginTop: 0,
};

const text = {
  color: "#ccc",
};

const row = {
  display: "flex",
  justifyContent: "space-between",
  borderBottom: "1px solid #333",
  padding: "10px 0",
};

const table = {
  width: "100%",
  borderCollapse: "collapse" as const,
};

const th = {
  textAlign: "left" as const,
  color: "#00d9ff",
  padding: 10,
  borderBottom: "1px solid #333",
};

const td = {
  padding: 10,
  borderBottom: "1px solid #222",
};