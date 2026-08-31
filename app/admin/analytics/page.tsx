"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "../../../lib/supabaseClient";


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
    events,
    setEvents,
  ] =
    useState<
      AnalyticsEvent[]
    >([]);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    eventFilter,
    setEventFilter,
  ] = useState("all");

  const [
    notice,
    setNotice,
  ] = useState("");

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

      if (error || !data.user) {
        setNotice(
          error?.message ||
            "You must be signed in to view site analytics."
        );
        setAuthorized(false);
        setLoading(false);
        return;
      }

      const {
        data: adminAccess,
        error: adminAccessError,
      } = await supabase.rpc("is_pugpep_admin");

      if (
        adminAccessError ||
        !adminAccess
      ) {
        setNotice(
          adminAccessError?.message ||
            "Admin access is required."
        );
        setAuthorized(false);
        setLoading(false);
        return;
      }

      setAuthorized(true);
      await loadEvents();

      if (!cancelled) {
        setLoading(false);
      }
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function loadEvents() {
    setNotice("");

    const {
      data,
      error,
    } =
      await supabase
        .from(
          "analytics_events"
        )
        .select("*")
        .order(
          "created_at",
          {
            ascending: false,
          }
        )
        .limit(1000);

    if (error) {
      setNotice(
        error.message
      );
      return;
    }

    setEvents(
      data || []
    );
  }

  const stats = useMemo(() => {
    const count = (
      type: string
    ) =>
      events.filter(
        (
          event
        ) =>
          event.event_type ===
          type
      ).length;

    const paymentMethods:
      Record<
        string,
        number
      > = {};

    const promoCodes:
      Record<
        string,
        number
      > = {};

    const productViews:
      Record<
        string,
        number
      > = {};

    const pageViews:
      Record<
        string,
        number
      > = {};

    for (
      const event
      of events
    ) {
      if (
        event.payment_method
      ) {
        paymentMethods[
          event.payment_method
        ] =
          (
            paymentMethods[
              event.payment_method
            ] ||
            0
          ) + 1;
      }

      if (
        event.promo_code
      ) {
        promoCodes[
          event.promo_code
        ] =
          (
            promoCodes[
              event.promo_code
            ] ||
            0
          ) + 1;
      }

      if (
        event.product_slug
      ) {
        productViews[
          event.product_slug
        ] =
          (
            productViews[
              event.product_slug
            ] ||
            0
          ) + 1;
      }

      if (
        event.page_path
      ) {
        pageViews[
          event.page_path
        ] =
          (
            pageViews[
              event.page_path
            ] ||
            0
          ) + 1;
      }
    }

    const checkoutStarted =
      count(
        "checkout_started"
      );

    const ordersCreated =
      count(
        "order_created"
      );

    const ordersConfirmed =
      count(
        "order_confirmed"
      );

    const addToCart =
      count(
        "add_to_cart"
      );

    const productViewCount =
      count(
        "product_view"
      );

    const cartConversion =
      productViewCount > 0
        ? (
            addToCart /
            productViewCount
          ) *
          100
        : 0;

    const checkoutConversion =
      checkoutStarted > 0
        ? (
            ordersConfirmed /
            checkoutStarted
          ) *
          100
        : 0;

    const orderCreationConversion =
      checkoutStarted > 0
        ? (
            ordersCreated /
            checkoutStarted
          ) *
          100
        : 0;

    return {
      totalEvents:
        events.length,
      checkoutStarted,
      ordersCreated,
      ordersConfirmed,
      paymentMethodSelected:
        count(
          "payment_method_selected"
        ),
      productViews:
        productViewCount,
      addToCart,
      cartConversion,
      checkoutConversion,
      orderCreationConversion,
      paymentMethods,
      promoCodes,
      productViewsBySlug:
        productViews,
      pageViews,
    };
  }, [events]);

  const eventTypes = useMemo(
    () =>
      Array.from(
        new Set(
          events.map(
            (
              event
            ) =>
              event.event_type
          )
        )
      ).sort(),
    [events]
  );

  const filteredEvents =
    events.filter(
      (
        event
      ) => {
        const query =
          search
            .trim()
            .toLowerCase();

        const matchesSearch =
          !query ||
          event.event_type
            .toLowerCase()
            .includes(
              query
            ) ||
          String(
            event.order_number ||
              ""
          )
            .toLowerCase()
            .includes(
              query
            ) ||
          String(
            event.payment_method ||
              ""
          )
            .toLowerCase()
            .includes(
              query
            ) ||
          String(
            event.promo_code ||
              ""
          )
            .toLowerCase()
            .includes(
              query
            ) ||
          String(
            event.product_slug ||
              ""
          )
            .toLowerCase()
            .includes(
              query
            ) ||
          String(
            event.page_path ||
              ""
          )
            .toLowerCase()
            .includes(
              query
            );

        const matchesFilter =
          eventFilter ===
          "all"
            ? true
            : event.event_type ===
              eventFilter;

        return (
          matchesSearch &&
          matchesFilter
        );
      }
    );

  const topPaymentMethods =
    Object.entries(
      stats.paymentMethods
    ).sort(
      (
        a,
        b
      ) =>
        b[1] -
        a[1]
    );

  const topPromoCodes =
    Object.entries(
      stats.promoCodes
    ).sort(
      (
        a,
        b
      ) =>
        b[1] -
        a[1]
    );

  const topProducts =
    Object.entries(
      stats.productViewsBySlug
    )
      .sort(
        (
          a,
          b
        ) =>
          b[1] -
          a[1]
      )
      .slice(
        0,
        8
      );

  if (loading) {
    return (
      <main style={page}>
        <div style={centerCard}>
          <div style={loadingRing} />

          <h1 style={pageTitle}>
            Loading Site Analytics
          </h1>

          <p style={muted}>
            Checking your site-event tracking and preparing the analytics workspace...
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
            You must be signed in with an admin or super-admin account.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main style={page}>
      <div style={container}>
        <header style={heroPanel}>
          <div style={heroGlowPink} />
          <div style={heroGlowCyan} />

          <div style={heroCopy}>
            <div style={heroTopline}>
              <span style={heroPill}>PUGPEP ADMIN</span>
              <span style={heroLiveDot}>● SITE BEHAVIOR</span>
            </div>

            <p style={eyebrow}>
              CUSTOMER JOURNEY
            </p>

            <h1 style={pageTitle}>
              Site Analytics
            </h1>

            <p style={subtitle}>
              Understand how visitors move from product views to cart, checkout,
              payment selection, and confirmed orders.
            </p>
          </div>

          <div style={heroActions}>
            <button
              type="button"
              onClick={() => {
                void loadEvents();
              }}
              style={refreshButton}
            >
              Refresh Events
            </button>
          </div>
        </header>

        {notice && (
          <div style={noticeBanner}>
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

        <section style={healthPanel}>
          <div style={healthCopy}>
            <p style={sectionEyebrow}>TRACKING STATUS</p>
            <h2 style={sectionTitle}>
              {events.length > 0
                ? "Analytics Events Connected"
                : "No Analytics Events Found"}
            </h2>
            <p style={healthText}>
              {events.length > 0
                ? `${events.length} recent site events are available in analytics_events.`
                : "The page is connected, but analytics_events returned no rows. This usually means event tracking has not written data yet, or database access is preventing rows from being returned."}
            </p>
          </div>

          <span
            style={{
              ...healthBadge,
              color:
                events.length > 0
                  ? "#00ff99"
                  : "#ffcc00",
              borderColor:
                events.length > 0
                  ? "rgba(0,255,153,.38)"
                  : "rgba(255,204,0,.38)",
              background:
                events.length > 0
                  ? "rgba(0,255,153,.08)"
                  : "rgba(255,204,0,.08)",
            }}
          >
            {events.length > 0
              ? "TRACKING ACTIVE"
              : "NO EVENT DATA"}
          </span>
        </section>

        <section style={statsPanel}>
          <div style={panelHeading}>
            <div>
              <p style={sectionEyebrow}>FUNNEL ACTIVITY</p>
              <h2 style={sectionTitle}>Event Overview</h2>
            </div>

            <span style={resultBadge}>
              Latest {events.length} events
            </span>
          </div>

          <div style={statsGrid}>
          <StatCard
            label="Total Events"
            value={String(
              stats.totalEvents
            )}
            accent="#00d9ff"
          />

          <StatCard
            label="Product Views"
            value={String(
              stats.productViews
            )}
            accent="#ff75df"
          />

          <StatCard
            label="Add to Cart"
            value={String(
              stats.addToCart
            )}
            accent="#00ff99"
          />

          <StatCard
            label="Checkout Started"
            value={String(
              stats.checkoutStarted
            )}
            accent="#ffcc00"
          />

          <StatCard
            label="Orders Created"
            value={String(
              stats.ordersCreated
            )}
            accent="#7df9ff"
          />

          <StatCard
            label="Orders Confirmed"
            value={String(
              stats.ordersConfirmed
            )}
            accent="#00ff99"
          />

          <StatCard
            label="Payment Clicks"
            value={String(
              stats.paymentMethodSelected
            )}
            accent="#ff75df"
          />
          </div>
        </section>

        <section style={conversionPanel}>
          <div style={panelHeading}>
            <div>
              <p style={sectionEyebrow}>CONVERSION FUNNEL</p>
              <h2 style={sectionTitle}>Journey Conversion</h2>
            </div>
          </div>

          <div style={conversionGrid}>
          <ConversionCard
            label="Product View → Cart"
            value={`${stats.cartConversion.toFixed(
              1
            )}%`}
            description="Add-to-cart events divided by product views."
            accent="#00d9ff"
          />

          <ConversionCard
            label="Checkout → Order Created"
            value={`${stats.orderCreationConversion.toFixed(
              1
            )}%`}
            description="Orders created divided by checkout starts."
            accent="#ffcc00"
          />

          <ConversionCard
            label="Checkout → Confirmed"
            value={`${stats.checkoutConversion.toFixed(
              1
            )}%`}
            description="Confirmed orders divided by checkout starts."
            accent="#00ff99"
          />
          </div>
        </section>

        <div style={summaryLayout}>
          <section style={panel}>
            <SectionHeader
              eyebrow="PAYMENTS"
              title="Payment Method Interest"
            />

            {topPaymentMethods.length ===
            0 ? (
              <p style={muted}>
                No payment method data yet.
              </p>
            ) : (
              <RankList
                entries={
                  topPaymentMethods
                }
                accent="#00d9ff"
              />
            )}
          </section>

          <section style={panel}>
            <SectionHeader
              eyebrow="PROMOTIONS"
              title="Promo Code Usage"
            />

            {topPromoCodes.length ===
            0 ? (
              <p style={muted}>
                No promo code data yet.
              </p>
            ) : (
              <RankList
                entries={
                  topPromoCodes
                }
                accent="#00ff99"
              />
            )}
          </section>

          <section style={panel}>
            <SectionHeader
              eyebrow="PRODUCTS"
              title="Most Viewed Products"
            />

            {topProducts.length ===
            0 ? (
              <p style={muted}>
                No product-view data yet.
              </p>
            ) : (
              <RankList
                entries={
                  topProducts
                }
                accent="#ff75df"
              />
            )}
          </section>
        </div>

        <section style={panel}>
          <div style={panelHeader}>
            <SectionHeader
              eyebrow="ACTIVITY"
              title="Recent Events"
            />

            <span style={resultBadge}>
              {
                filteredEvents.length
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
              placeholder="Search event, order, product, page, payment, or promo..."
              style={searchInput}
            />

            <select
              value={
                eventFilter
              }
              onChange={(
                event
              ) =>
                setEventFilter(
                  event.target.value
                )
              }
              style={filterSelect}
            >
              <option value="all">
                All Event Types
              </option>

              {eventTypes.map(
                (
                  eventType
                ) => (
                  <option
                    key={
                      eventType
                    }
                    value={
                      eventType
                    }
                  >
                    {
                      eventType
                    }
                  </option>
                )
              )}
            </select>
          </div>

          {filteredEvents.length ===
          0 ? (
            <div style={emptyState}>
              <p style={muted}>
                No analytics events match this search or filter.
              </p>
            </div>
          ) : (
            <div style={eventGrid}>
              {filteredEvents
                .slice(
                  0,
                  100
                )
                .map(
                  (
                    event
                  ) => (
                    <article
                      key={
                        event.id
                      }
                      style={eventCard}
                    >
                      <div style={eventHeader}>
                        <span style={eventBadge}>
                          {
                            event.event_type
                          }
                        </span>

                        <time style={eventTime}>
                          {new Date(
                            event.created_at
                          ).toLocaleString()}
                        </time>
                      </div>

                      <div style={eventDetails}>
                        <Meta
                          label="Order"
                          value={
                            event.order_number ||
                            "-"
                          }
                        />

                        <Meta
                          label="Product"
                          value={
                            event.product_slug ||
                            "-"
                          }
                        />

                        <Meta
                          label="Page"
                          value={
                            event.page_path ||
                            "-"
                          }
                        />

                        <Meta
                          label="Payment"
                          value={
                            event.payment_method ||
                            "-"
                          }
                        />

                        <Meta
                          label="Promo"
                          value={
                            event.promo_code ||
                            "-"
                          }
                          accent={
                            event.promo_code
                              ? "#00ff99"
                              : undefined
                          }
                        />
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

function ConversionCard({
  label,
  value,
  description,
  accent,
}: {
  label: string;
  value: string;
  description: string;
  accent: string;
}) {
  return (
    <div
      style={{
        ...conversionCard,
        borderColor:
          `${accent}44`,
      }}
    >
      <span style={conversionLabel}>
        {label}
      </span>

      <strong
        style={{
          ...conversionValue,
          color: accent,
        }}
      >
        {value}
      </strong>

      <p style={conversionText}>
        {description}
      </p>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div>
      <p style={sectionEyebrow}>
        {eyebrow}
      </p>

      <h2 style={sectionTitle}>
        {title}
      </h2>
    </div>
  );
}

function RankList({
  entries,
  accent,
}: {
  entries: Array<
    [
      string,
      number
    ]
  >;
  accent: string;
}) {
  const maxValue =
    Math.max(
      ...entries.map(
        (
          [
            ,
            value,
          ]
        ) =>
          value
      ),
      1
    );

  return (
    <div style={rankList}>
      {entries.map(
        (
          [
            label,
            value,
          ],
          index
        ) => (
          <div
            key={
              label
            }
            style={rankRow}
          >
            <div style={rankTopLine}>
              <span style={rankLabel}>
                {index +
                  1}
                .{" "}
                {label}
              </span>

              <strong
                style={{
                  color: accent,
                }}
              >
                {value}
              </strong>
            </div>

            <div style={barTrack}>
              <div
                style={{
                  ...barFill,
                  width:
                    `${Math.max(
                      6,
                      (
                        value /
                        maxValue
                      ) *
                        100
                    )}%`,
                  background:
                    accent,
                  boxShadow:
                    `0 0 12px ${accent}55`,
                }}
              />
            </div>
          </div>
        )
      )}
    </div>
  );
}

function Meta({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div style={metaCard}>
      <span style={metaLabel}>
        {label}
      </span>

      <strong
        style={{
          ...metaValue,
          color:
            accent ||
            "#ffffff",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

const page = {
  minHeight: "100vh",
  padding: "clamp(18px, 3vw, 34px)",
  background:
    "radial-gradient(circle at 12% 0%, rgba(255,69,216,.055), transparent 26%), radial-gradient(circle at 88% 4%, rgba(0,217,255,.055), transparent 26%), #030305",
  color: "#ffffff",
};

const container = {
  width: "100%",
  maxWidth: 1480,
  margin: "0 auto",
};

const heroPanel = {
  position: "relative" as const,
  overflow: "hidden",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 24,
  padding: "clamp(22px, 3vw, 30px)",
  border: "1px solid rgba(255,255,255,.10)",
  borderRadius: 22,
  background:
    "linear-gradient(135deg, rgba(255,69,216,.10), rgba(0,217,255,.065) 46%, rgba(0,255,153,.055))",
  boxShadow:
    "0 24px 70px rgba(0,0,0,.34), inset 0 1px 0 rgba(255,255,255,.04)",
  flexWrap: "wrap" as const,
};

const heroGlowPink = {
  position: "absolute" as const,
  width: 260,
  height: 260,
  top: -150,
  left: -70,
  borderRadius: "50%",
  background: "rgba(255,69,216,.14)",
  filter: "blur(55px)",
  pointerEvents: "none" as const,
};

const heroGlowCyan = {
  position: "absolute" as const,
  width: 280,
  height: 280,
  right: -90,
  bottom: -175,
  borderRadius: "50%",
  background: "rgba(0,217,255,.13)",
  filter: "blur(60px)",
  pointerEvents: "none" as const,
};

const heroCopy = {
  position: "relative" as const,
  zIndex: 1,
  minWidth: 0,
};

const heroTopline = {
  marginBottom: 10,
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap" as const,
};

const heroPill = {
  padding: "5px 8px",
  border: "1px solid rgba(255,69,216,.34)",
  borderRadius: 999,
  background: "rgba(255,69,216,.08)",
  color: "#ff75df",
  fontSize: 9,
  fontWeight: 1000,
  letterSpacing: ".10em",
};

const heroLiveDot = {
  color: "#00ff99",
  fontSize: 9,
  fontWeight: 1000,
  letterSpacing: ".08em",
};

const heroActions = {
  position: "relative" as const,
  zIndex: 1,
};

const eyebrow = {
  margin: 0,
  color: "#00d9ff",
  fontSize: 13,
  fontWeight: 900,
  letterSpacing: ".15em",
};

const pageTitle = {
  margin: "5px 0 0",
  color: "#ffffff",
  fontSize: "clamp(34px, 4.4vw, 52px)",
  letterSpacing: "-.04em",
  lineHeight: .98,
};

const subtitle = {
  maxWidth: 760,
  margin: "11px 0 0",
  color: "#9aa0aa",
  fontSize: 14,
  lineHeight: 1.55,
};

const refreshButton = {
  minHeight: 40,
  padding: "9px 14px",
  border: "1px solid rgba(0,255,153,.50)",
  borderRadius: 11,
  background:
    "linear-gradient(135deg, rgba(0,255,153,.18), rgba(0,217,255,.10))",
  color: "#00ff99",
  boxShadow: "0 0 22px rgba(0,255,153,.08)",
  fontSize: 12,
  fontWeight: 950,
  cursor: "pointer",
};

const noticeBanner = {
  marginTop: 18,
  padding: "14px 16px",
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 12,
  border:
    "1px solid rgba(255,111,111,.48)",
  borderRadius: 12,
  background:
    "rgba(255,111,111,.07)",
  color: "#ff8a8a",
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

const healthPanel = {
  marginTop: 18,
  padding: 18,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  border: "1px solid rgba(255,255,255,.09)",
  borderRadius: 18,
  background:
    "linear-gradient(145deg, rgba(10,10,15,.97), rgba(5,5,8,.99))",
  flexWrap: "wrap" as const,
};

const healthCopy = {
  minWidth: 0,
};

const healthText = {
  maxWidth: 800,
  margin: "7px 0 0",
  color: "#858b95",
  fontSize: 12,
  lineHeight: 1.55,
};

const healthBadge = {
  padding: "7px 10px",
  border: "1px solid",
  borderRadius: 999,
  fontSize: 9,
  fontWeight: 1000,
  letterSpacing: ".06em",
  whiteSpace: "nowrap" as const,
};

const statsPanel = {
  marginTop: 18,
  padding: 18,
  border: "1px solid rgba(255,255,255,.09)",
  borderRadius: 18,
  background:
    "linear-gradient(145deg, rgba(10,10,15,.97), rgba(5,5,8,.99))",
};

const conversionPanel = {
  marginTop: 18,
  padding: 18,
  border: "1px solid rgba(255,255,255,.09)",
  borderRadius: 18,
  background:
    "linear-gradient(145deg, rgba(10,10,15,.97), rgba(5,5,8,.99))",
};

const panelHeading = {
  marginBottom: 13,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap" as const,
};

const sectionEyebrow = {
  margin: 0,
  color: "#ff75df",
  fontSize: 9,
  fontWeight: 1000,
  letterSpacing: ".12em",
};

const sectionTitle = {
  margin: "4px 0 0",
  color: "#ffffff",
  fontSize: 20,
  lineHeight: 1.1,
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
  gap: 10,
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

const conversionGrid = {
  marginTop: 18,
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(250px, 1fr))",
  gap: 15,
};

const conversionCard = {
  padding: 20,
  display: "grid",
  gap: 9,
  border: "1px solid",
  borderRadius: 16,
  background:
    "rgba(255,255,255,.03)",
};

const conversionLabel = {
  color: "#d0d0d7",
  fontSize: 14,
  fontWeight: 900,
};

const conversionValue = {
  fontSize: 32,
};

const conversionText = {
  margin: 0,
  color: "#9f9fa8",
  lineHeight: 1.6,
};

const summaryLayout = {
  marginTop: 22,
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(300px, 1fr))",
  gap: 16,
};

const panel = {
  padding: 18,
  border: "1px solid rgba(255,255,255,.09)",
  borderRadius: 18,
  background:
    "linear-gradient(145deg, rgba(10,10,15,.97), rgba(5,5,8,.99))",
  boxShadow: "0 18px 52px rgba(0,0,0,.20)",
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

const rankList = {
  marginTop: 16,
  display: "grid",
  gap: 14,
};

const rankRow = {
  display: "grid",
  gap: 7,
};

const rankTopLine = {
  display: "flex",
  justifyContent:
    "space-between",
  gap: 12,
};

const rankLabel = {
  color: "#d0d0d6",
  overflowWrap:
    "anywhere" as const,
};

const barTrack = {
  height: 8,
  overflow: "hidden",
  borderRadius: 999,
  background:
    "rgba(255,255,255,.07)",
};

const barFill = {
  height: "100%",
  borderRadius: 999,
};

const toolbar = {
  display: "grid",
  gridTemplateColumns:
    "minmax(0, 1fr) minmax(220px, 320px)",
  gap: 12,
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

const filterSelect = {
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

const eventGrid = {
  marginTop: 18,
  display: "grid",
  gap: 14,
};

const eventCard = {
  padding: 18,
  display: "grid",
  gap: 15,
  border:
    "1px solid rgba(255,255,255,.11)",
  borderRadius: 15,
  background:
    "rgba(0,0,0,.26)",
};

const eventHeader = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap:
    "wrap" as const,
};

const eventBadge = {
  padding: "7px 10px",
  border:
    "1px solid rgba(255,69,216,.44)",
  borderRadius: 999,
  background:
    "rgba(255,69,216,.07)",
  color: "#ff75df",
  fontSize: 12,
  fontWeight: 900,
};

const eventTime = {
  color: "#8f8f98",
  fontSize: 13,
};

const eventDetails = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 10,
};

const metaCard = {
  minWidth: 0,
  padding: 12,
  display: "grid",
  gap: 5,
  border:
    "1px solid rgba(255,255,255,.08)",
  borderRadius: 10,
  background:
    "rgba(255,255,255,.025)",
};

const metaLabel = {
  color: "#8f8f98",
  fontSize: 11,
  fontWeight: 900,
  textTransform:
    "uppercase" as const,
};

const metaValue = {
  overflowWrap:
    "anywhere" as const,
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