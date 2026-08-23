"use client";

import Link from "next/link";

export default function RefundPolicyPage() {
  return (
    <main style={page}>
      <div style={container}>
        <section style={hero}>
          <p style={eyebrow}>
            CUSTOMER POLICY
          </p>

          <h1 style={title}>
            Refund &amp; Return Policy
          </h1>

          <p style={subtitle}>
            Clear expectations for final-sale research materials, fulfillment
            issues, and order-resolution requests.
          </p>
        </section>

        <section style={policyPanel}>
          <div>
            <p style={sectionEyebrow}>
              FINAL SALE POLICY
            </p>

            <h2 style={sectionTitle}>
              All Sales Are Final
            </h2>
          </div>

          <p style={bodyText}>
            Due to the nature of specialized laboratory research materials,
            PugPep does not accept returns, exchanges, or refunds once an order
            has been processed or shipped.
          </p>

          <div style={noticeBox}>
            <strong style={noticeTitle}>
              Research-material integrity matters.
            </strong>

            <p style={noticeText}>
              Once products leave PugPep&apos;s custody, storage conditions,
              handling history, packaging integrity, and chain of custody can no
              longer be independently verified. For this reason, returned
              research materials cannot be restocked or resold.
            </p>
          </div>
        </section>

        <section style={resolutionPanel}>
          <p style={sectionEyebrow}>
            ORDER RESOLUTION
          </p>

          <h2 style={sectionTitle}>
            Damaged, Incorrect, or Incomplete Orders
          </h2>

          <p style={bodyText}>
            If an order arrives damaged, incorrect, incomplete, or is affected
            by a verified fulfillment error attributable to PugPep, contact
            PugPep Support as soon as possible with your order number and
            supporting information.
          </p>

          <div style={resolutionGrid}>
            <PolicyPoint
              title="Damaged Shipment"
              text="Provide your order number and clear photographs of the package, shipping label, packaging, and affected items."
            />

            <PolicyPoint
              title="Incorrect Product"
              text="Provide your order number and photographs showing the item received and its identifying label."
            />

            <PolicyPoint
              title="Missing Item"
              text="Provide your order number and a description of the item believed to be missing from the shipment."
            />

            <PolicyPoint
              title="Fulfillment Error"
              text="If PugPep verifies an internal fulfillment error, we will review the appropriate resolution based on the circumstances."
            />
          </div>

          <p style={bodyText}>
            When PugPep determines that a verified fulfillment issue occurred,
            the available resolution may include a replacement, account credit,
            or another appropriate remedy at PugPep&apos;s discretion.
          </p>
        </section>

        <section style={exceptionsPanel}>
          <p style={sectionEyebrow}>
            CIRCUMSTANCES OUTSIDE PUGPEP&apos;S CONTROL
          </p>

          <h2 style={sectionTitle}>
            Carrier &amp; Address Issues
          </h2>

          <p style={bodyText}>
            Customers are responsible for providing a complete and accurate
            shipping address before an order is fulfilled. PugPep is not
            responsible for losses, delays, or delivery failures caused by
            incorrect or incomplete customer-provided address information.
          </p>

          <p style={bodyText}>
            Carrier delays, weather events, service disruptions, delivery
            attempts, and other circumstances outside PugPep&apos;s direct
            control do not automatically qualify an order for a refund.
            PugPep may assist with available carrier information or claims
            when appropriate.
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
            and are not intended for human or veterinary use. Product
            information and research references do not constitute medical
            advice, dosing guidance, treatment recommendations, or claims of
            therapeutic benefit.
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
            For questions about an order or to report a potential fulfillment
            issue, contact{" "}
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
              href="/shipping-policy"
              style={link}
            >
              Shipping &amp; Delivery Policy
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
  maxWidth: 760,
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
    "1px solid rgba(255,69,216,.28)",
  borderRadius: 20,
  background:
    "linear-gradient(145deg, rgba(9,7,13,.95), rgba(5,10,14,.94))",
  boxShadow:
    "0 0 24px rgba(255,69,216,.06)",
};

const resolutionPanel = {
  marginTop: 28,
  padding:
    "clamp(22px, 4vw, 32px)",
  border:
    "1px solid rgba(0,217,255,.30)",
  borderRadius: 20,
  background:
    "linear-gradient(145deg, rgba(8,8,12,.95), rgba(15,8,18,.92))",
};

const exceptionsPanel = {
  marginTop: 28,
  padding:
    "clamp(22px, 4vw, 32px)",
  border:
    "1px solid rgba(255,204,102,.28)",
  borderRadius: 20,
  background:
    "linear-gradient(145deg, rgba(12,10,6,.94), rgba(8,8,12,.96))",
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

const resolutionGrid = {
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