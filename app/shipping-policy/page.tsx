"use client";

import Link from "next/link";

export default function ShippingPolicyPage() {
  return (
    <main style={page}>
      <div style={container}>
        <section style={hero}>
          <p style={eyebrow}>
            FULFILLMENT POLICY
          </p>

          <h1 style={title}>
            Shipping &amp; Delivery Policy
          </h1>

          <p style={subtitle}>
            Information about order preparation, carrier transit, tracking,
            delivery expectations, and customer shipping responsibilities.
          </p>
        </section>

        <section style={policyPanel}>
          <p style={sectionEyebrow}>
            ORDER FULFILLMENT
          </p>

          <h2 style={sectionTitle}>
            Processing &amp; Shipment
          </h2>

          <p style={bodyText}>
            PugPep prepares orders for shipment after order processing is
            complete. Processing times may vary based on order volume,
            inventory status, product availability, holidays, carrier
            schedules, and other operational factors.
          </p>

          <p style={bodyText}>
            When tracking information becomes available, PugPep may provide it
            through email and, for customers who separately opt in, optional
            transactional SMS updates.
          </p>

          <div style={standardsGrid}>
            <PolicyPoint
              title="Tracked Fulfillment"
              text="When available, shipment tracking is associated with the applicable order so customers can follow carrier progress."
            />

            <PolicyPoint
              title="Address Accuracy"
              text="Customers are responsible for providing a complete and accurate delivery address before the order is fulfilled."
            />

            <PolicyPoint
              title="Carrier Transit"
              text="Transit estimates are provided by the shipping carrier and are not guaranteed delivery dates."
            />
          </div>
        </section>

        <section style={carrierPanel}>
          <p style={sectionEyebrow}>
            CARRIER TRANSIT
          </p>

          <h2 style={sectionTitle}>
            Delays &amp; Service Interruptions
          </h2>

          <p style={bodyText}>
            Once a shipment has been transferred to the carrier, delivery
            timing is affected by carrier operations and conditions outside
            PugPep&apos;s direct control.
          </p>

          <p style={bodyText}>
            Delays may result from weather, transportation disruptions,
            holidays, carrier processing, service interruptions, incorrect or
            incomplete address information, delivery-access limitations, or
            other circumstances affecting the carrier network.
          </p>

          <div style={noticeBox}>
            <strong style={noticeTitle}>
              Estimated delivery dates are estimates.
            </strong>

            <p style={noticeText}>
              A carrier delay or missed estimated delivery date does not, by
              itself, make an order eligible for a refund. PugPep may assist
              with available tracking information or a carrier inquiry when
              appropriate.
            </p>
          </div>
        </section>

        <section style={addressPanel}>
          <p style={sectionEyebrow}>
            CUSTOMER RESPONSIBILITY
          </p>

          <h2 style={sectionTitle}>
            Shipping Address
          </h2>

          <p style={bodyText}>
            Customers must review all shipping information before completing
            an order. PugPep is not responsible for delivery problems caused
            by an incorrect, incomplete, outdated, or otherwise inaccurate
            address supplied by the customer.
          </p>

          <p style={bodyText}>
            If you discover an address issue before fulfillment, contact
            PugPep Support as soon as possible. PugPep cannot guarantee that
            an address can be changed after processing or shipment has begun.
          </p>
        </section>

        <section style={trackingPanel}>
          <p style={sectionEyebrow}>
            TRACKING &amp; DELIVERY STATUS
          </p>

          <h2 style={sectionTitle}>
            Shipment Updates
          </h2>

          <p style={bodyText}>
            Carrier tracking may show statuses such as label created, accepted,
            in transit, out for delivery, delivered, exception, or another
            carrier-defined status. Carrier tracking information is provided
            by the carrier and may not update in real time.
          </p>

          <p style={bodyText}>
            Customers who voluntarily opt in to transactional SMS updates may
            receive order-related text messages concerning shipment,
            tracking, out-for-delivery, and delivery status. SMS consent is
            optional and is not required to complete a purchase.
          </p>
        </section>

        <section style={issuePanel}>
          <p style={sectionEyebrow}>
            DELIVERY ISSUES
          </p>

          <h2 style={sectionTitle}>
            Damaged, Missing, or Incorrect Shipments
          </h2>

          <p style={bodyText}>
            If a shipment arrives damaged, appears incomplete, contains an
            incorrect item, or reflects a potential fulfillment issue, contact
            PugPep Support as soon as possible with the order number and
            supporting information.
          </p>

          <p style={bodyText}>
            Depending on the circumstances, PugPep may request photographs of
            the shipment, packaging, shipping label, and affected materials to
            help review the issue.
          </p>

          <p style={bodyText}>
            Resolution of a verified fulfillment issue is governed by the
            PugPep{" "}
            <Link
              href="/refund-policy"
              style={link}
            >
              Refund &amp; Return Policy
            </Link>
            .
          </p>
        </section>

        <section style={researchPanel}>
          <p style={sectionEyebrow}>
            RESEARCH USE NOTICE
          </p>

          <h2 style={researchTitle}>
            Laboratory Research Materials Only
          </h2>

          <p style={bodyText}>
            PugPep products are supplied for laboratory research purposes only
            and are not intended for human or veterinary use. Shipment,
            storage, and delivery information provided by PugPep does not
            constitute medical, clinical, dosing, or treatment guidance.
          </p>
        </section>

        <section style={contactPanel}>
          <p style={sectionEyebrow}>
            SUPPORT
          </p>

          <h2 style={sectionTitle}>
            Contact PugPep
          </h2>

          <p style={bodyText}>
            For questions about shipping, tracking, or a delivery issue,
            contact{" "}
            <a
              href="mailto:Support@PugPep.com"
              style={link}
            >
              Support@PugPep.com
            </a>
            .
          </p>

          <div style={footerLinks}>
            <Link
              href="/policies"
              style={link}
            >
              Legal &amp; Policies
            </Link>

            <span style={dot}>
              •
            </span>

            <Link
              href="/refund-policy"
              style={link}
            >
              Refund &amp; Return Policy
            </Link>

            <span style={dot}>
              •
            </span>

            <Link
              href="/"
              style={link}
            >
              Return Home
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function PolicyPoint({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div style={pointCard}>
      <div style={pointIcon}>
        ✓
      </div>

      <div>
        <strong style={pointTitle}>
          {title}
        </strong>

        <p style={pointText}>
          {text}
        </p>
      </div>
    </div>
  );
}

const page = {
  minHeight: "100vh",
  padding:
    "clamp(28px, 6vw, 72px) clamp(18px, 4vw, 34px)",
  background:
    "radial-gradient(circle at 10% 0%, rgba(0,217,255,.14), transparent 30%), radial-gradient(circle at 90% 0%, rgba(255,45,210,.16), transparent 31%), radial-gradient(circle at 50% 100%, rgba(0,255,153,.06), transparent 36%), #000",
  color: "#ffffff",
  fontSize: 16,
};

const container = {
  width: "100%",
  maxWidth: 1120,
  margin: "0 auto",
};

const hero = {
  maxWidth: 900,
  margin: "0 auto",
  textAlign: "center" as const,
};

const eyebrow = {
  margin: 0,
  color: "#00d9ff",
  fontSize: 13,
  fontWeight: 900,
  letterSpacing: ".16em",
};

const title = {
  margin: "10px 0 0",
  color: "#ff45d8",
  fontSize:
    "clamp(44px, 8vw, 68px)",
  letterSpacing: "-.04em",
  textShadow:
    "0 0 26px rgba(255,45,210,.36)",
};

const subtitle = {
  maxWidth: 780,
  margin: "16px auto 0",
  color: "#c6c6ce",
  fontSize: 20,
  lineHeight: 1.7,
};

const policyPanel = {
  marginTop: 34,
  padding:
    "clamp(22px, 4vw, 32px)",
  border:
    "1px solid rgba(0,217,255,.30)",
  borderRadius: 20,
  background:
    "linear-gradient(145deg, rgba(8,8,12,.95), rgba(15,8,18,.92))",
};

const carrierPanel = {
  marginTop: 28,
  padding:
    "clamp(22px, 4vw, 32px)",
  border:
    "1px solid rgba(255,204,102,.28)",
  borderRadius: 20,
  background:
    "linear-gradient(145deg, rgba(12,10,6,.94), rgba(8,8,12,.96))",
};

const addressPanel = {
  marginTop: 28,
  padding:
    "clamp(22px, 4vw, 32px)",
  border:
    "1px solid rgba(255,69,216,.28)",
  borderRadius: 20,
  background:
    "linear-gradient(145deg, rgba(9,7,13,.95), rgba(5,10,14,.94))",
};

const trackingPanel = {
  marginTop: 28,
  padding:
    "clamp(22px, 4vw, 32px)",
  border:
    "1px solid rgba(125,249,255,.28)",
  borderRadius: 20,
  background:
    "linear-gradient(145deg, rgba(5,11,14,.94), rgba(7,8,12,.96))",
};

const issuePanel = {
  marginTop: 28,
  padding:
    "clamp(22px, 4vw, 32px)",
  border:
    "1px solid rgba(255,117,223,.26)",
  borderRadius: 20,
  background:
    "linear-gradient(145deg, rgba(13,7,12,.93), rgba(7,8,12,.96))",
};

const researchPanel = {
  marginTop: 28,
  padding:
    "clamp(22px, 4vw, 32px)",
  border:
    "1px solid rgba(0,255,153,.28)",
  borderRadius: 20,
  background:
    "linear-gradient(145deg, rgba(5,14,12,.92), rgba(7,8,12,.96))",
};

const contactPanel = {
  marginTop: 28,
  padding:
    "clamp(22px, 4vw, 32px)",
  border:
    "1px solid rgba(255,255,255,.11)",
  borderRadius: 20,
  background:
    "rgba(7,7,10,.93)",
};

const sectionEyebrow = {
  margin: 0,
  color: "#00d9ff",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: ".14em",
};

const sectionTitle = {
  margin: "7px 0 0",
  color: "#7df9ff",
  fontSize:
    "clamp(28px, 5vw, 40px)",
};

const researchTitle = {
  margin: "7px 0 0",
  color: "#00ff99",
  fontSize:
    "clamp(28px, 5vw, 38px)",
};

const bodyText = {
  margin: "14px 0 0",
  color: "#c3c3ca",
  fontSize: 17,
  lineHeight: 1.75,
};

const standardsGrid = {
  marginTop: 22,
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 14,
};

const pointCard = {
  padding: 17,
  display: "grid",
  gridTemplateColumns:
    "38px minmax(0, 1fr)",
  gap: 12,
  border:
    "1px solid rgba(255,255,255,.10)",
  borderRadius: 13,
  background:
    "rgba(0,0,0,.25)",
};

const pointIcon = {
  width: 34,
  height: 34,
  display: "grid",
  placeItems: "center",
  border:
    "1px solid rgba(0,255,153,.42)",
  borderRadius: 999,
  background:
    "rgba(0,255,153,.08)",
  color: "#00ff99",
  fontWeight: 900,
};

const pointTitle = {
  color: "#ffffff",
  fontSize: 17,
};

const pointText = {
  margin: "6px 0 0",
  color: "#a9a9b2",
  lineHeight: 1.6,
};

const noticeBox = {
  marginTop: 20,
  padding: 18,
  border:
    "1px solid rgba(255,204,102,.35)",
  borderRadius: 14,
  background:
    "rgba(255,204,102,.05)",
};

const noticeTitle = {
  color: "#ffcc66",
  fontSize: 17,
};

const noticeText = {
  margin: "8px 0 0",
  color: "#c3c3ca",
  lineHeight: 1.7,
};

const footerLinks = {
  marginTop: 20,
  display: "flex",
  gap: 10,
  alignItems: "center",
  flexWrap: "wrap" as const,
};

const link = {
  color: "#7df9ff",
  textDecoration: "underline",
};

const dot = {
  color: "#62666d",
};