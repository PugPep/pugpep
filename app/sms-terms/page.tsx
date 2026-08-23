"use client";

import Link from "next/link";

export default function SmsTermsPage() {
  return (
    <main style={page}>
      <div style={container}>
        <section style={hero}>
          <p style={eyebrow}>
            COMMUNICATIONS POLICY
          </p>

          <h1 style={title}>
            SMS Terms
          </h1>

          <p style={subtitle}>
            Terms governing optional PugPep transactional text-message updates
            for orders, shipping, tracking, and delivery.
          </p>
        </section>

        <section style={programPanel}>
          <p style={sectionEyebrow}>
            PROGRAM NAME
          </p>

          <h2 style={sectionTitle}>
            PugPep Order Updates
          </h2>

          <p style={bodyText}>
            PugPep Order Updates is an optional transactional SMS program for
            customers who affirmatively opt in during checkout. Messages may
            include order confirmation, shipping status, tracking information,
            out-for-delivery notifications, carrier-related updates, and
            delivery confirmation.
          </p>

          <div style={noticeBox}>
            <strong style={noticeTitle}>
              SMS consent is optional.
            </strong>

            <p style={noticeText}>
              Consent to receive text messages is not a condition of purchase.
              Customers may complete an order without enrolling in PugPep Order
              Updates.
            </p>
          </div>
        </section>

        <section style={consentPanel}>
          <p style={sectionEyebrow}>
            OPT-IN
          </p>

          <h2 style={sectionTitle}>
            How Customers Enroll
          </h2>

          <p style={bodyText}>
            Customers may opt in through the PugPep checkout process by
            providing a mobile phone number and actively selecting the
            separate, unchecked SMS consent checkbox.
          </p>

          <p style={bodyText}>
            By selecting that checkbox, the customer agrees to receive
            transactional SMS messages from PugPep regarding the applicable
            order and related shipment activity.
          </p>
        </section>

        <section style={messagePanel}>
          <p style={sectionEyebrow}>
            MESSAGE DETAILS
          </p>

          <h2 style={sectionTitle}>
            Frequency, Rates &amp; Delivery
          </h2>

          <div style={standardsGrid}>
            <PolicyPoint
              title="Message Frequency"
              text="Message frequency varies based on order and shipment activity."
            />

            <PolicyPoint
              title="Message & Data Rates"
              text="Message and data rates may apply according to the customer's mobile carrier and service plan."
            />

            <PolicyPoint
              title="Carrier Delivery"
              text="Carriers are not liable for delayed or undelivered messages."
            />
          </div>
        </section>

        <section style={commandsPanel}>
          <p style={sectionEyebrow}>
            CUSTOMER CONTROLS
          </p>

          <h2 style={sectionTitle}>
            STOP &amp; HELP
          </h2>

          <div style={commandGrid}>
            <div style={commandCard}>
              <span style={commandKeyword}>
                STOP
              </span>

              <p style={commandText}>
                Reply <strong>STOP</strong> to an eligible PugPep SMS message
                to opt out of further messages from the applicable messaging
                program. After the opt-out request is processed, no further
                messages should be sent from that program unless the customer
                opts in again.
              </p>
            </div>

            <div style={commandCard}>
              <span style={commandKeyword}>
                HELP
              </span>

              <p style={commandText}>
                Reply <strong>HELP</strong> for assistance or contact{" "}
                <a
                  href="mailto:Support@PugPep.com"
                  style={link}
                >
                  Support@PugPep.com
                </a>
                .
              </p>
            </div>
          </div>
        </section>

        <section style={privacyPanel}>
          <p style={sectionEyebrow}>
            PRIVACY
          </p>

          <h2 style={sectionTitle}>
            Mobile Information &amp; Consent
          </h2>

          <p style={bodyText}>
            PugPep does not sell, rent, or share mobile phone numbers,
            text-messaging opt-in data, or SMS consent with third parties or
            affiliates for their marketing or promotional purposes.
          </p>

          <p style={bodyText}>
            PugPep may use service providers that help operate the messaging,
            hosting, order-management, shipping, security, or customer-support
            functions necessary to provide requested services.
          </p>

          <Link
            href="/privacy"
            style={ctaLink}
          >
            View Privacy Policy →
          </Link>
        </section>

        <section style={scopePanel}>
          <p style={sectionEyebrow}>
            PROGRAM SCOPE
          </p>

          <h2 style={sectionTitle}>
            Transactional Messages Only
          </h2>

          <p style={bodyText}>
            Enrollment in PugPep Order Updates is for transactional order and
            delivery communications. Opting in to these messages does not, by
            itself, enroll a customer in promotional or marketing text
            messages.
          </p>
        </section>

        <section style={contactPanel}>
          <p style={sectionEyebrow}>
            SUPPORT
          </p>

          <h2 style={sectionTitle}>
            Questions About SMS
          </h2>

          <p style={bodyText}>
            For assistance with PugPep Order Updates, contact{" "}
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
              href="/privacy"
              style={link}
            >
              Privacy Policy
            </Link>

            <span style={dot}>
              •
            </span>

            <Link
              href="/terms"
              style={link}
            >
              Terms &amp; Conditions
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
  maxWidth: 790,
  margin: "16px auto 0",
  color: "#c6c6ce",
  fontSize: 20,
  lineHeight: 1.7,
};

const programPanel = {
  marginTop: 34,
  padding:
    "clamp(22px, 4vw, 32px)",
  border:
    "1px solid rgba(0,217,255,.30)",
  borderRadius: 20,
  background:
    "linear-gradient(145deg, rgba(8,8,12,.95), rgba(15,8,18,.92))",
};

const consentPanel = {
  marginTop: 28,
  padding:
    "clamp(22px, 4vw, 32px)",
  border:
    "1px solid rgba(0,255,153,.28)",
  borderRadius: 20,
  background:
    "linear-gradient(145deg, rgba(5,14,12,.92), rgba(7,8,12,.96))",
};

const messagePanel = {
  marginTop: 28,
  padding:
    "clamp(22px, 4vw, 32px)",
  border:
    "1px solid rgba(255,204,102,.28)",
  borderRadius: 20,
  background:
    "linear-gradient(145deg, rgba(12,10,6,.94), rgba(8,8,12,.96))",
};

const commandsPanel = {
  marginTop: 28,
  padding:
    "clamp(22px, 4vw, 32px)",
  border:
    "1px solid rgba(255,69,216,.28)",
  borderRadius: 20,
  background:
    "linear-gradient(145deg, rgba(9,7,13,.95), rgba(5,10,14,.94))",
};

const privacyPanel = {
  marginTop: 28,
  padding:
    "clamp(22px, 4vw, 32px)",
  border:
    "1px solid rgba(125,249,255,.28)",
  borderRadius: 20,
  background:
    "linear-gradient(145deg, rgba(5,11,14,.94), rgba(7,8,12,.96))",
};

const scopePanel = {
  marginTop: 28,
  padding:
    "clamp(22px, 4vw, 32px)",
  border:
    "1px solid rgba(255,117,223,.26)",
  borderRadius: 20,
  background:
    "linear-gradient(145deg, rgba(13,7,12,.93), rgba(7,8,12,.96))",
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
    "1px solid rgba(0,255,153,.35)",
  borderRadius: 14,
  background:
    "rgba(0,255,153,.05)",
};

const noticeTitle = {
  color: "#00ff99",
  fontSize: 17,
};

const noticeText = {
  margin: "8px 0 0",
  color: "#c3c3ca",
  lineHeight: 1.7,
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

const commandGrid = {
  marginTop: 20,
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 14,
};

const commandCard = {
  padding: 20,
  border:
    "1px solid rgba(255,255,255,.10)",
  borderRadius: 14,
  background:
    "rgba(0,0,0,.27)",
};

const commandKeyword = {
  display: "inline-flex",
  padding: "6px 10px",
  border:
    "1px solid rgba(0,255,153,.42)",
  borderRadius: 999,
  background:
    "rgba(0,255,153,.08)",
  color: "#00ff99",
  fontWeight: 900,
  letterSpacing: ".08em",
};

const commandText = {
  margin: "12px 0 0",
  color: "#c3c3ca",
  lineHeight: 1.7,
};

const ctaLink = {
  display: "inline-flex",
  marginTop: 20,
  minHeight: 48,
  padding: "11px 15px",
  alignItems: "center",
  border:
    "1px solid rgba(0,217,255,.48)",
  borderRadius: 10,
  background:
    "rgba(0,217,255,.06)",
  color: "#7df9ff",
  fontSize: 15,
  fontWeight: 900,
  textDecoration: "none",
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