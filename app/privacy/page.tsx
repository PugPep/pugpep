"use client";

import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main style={page}>
      <div style={container}>
        <section style={hero}>
          <p style={eyebrow}>
            PUGPEP PRIVACY
          </p>

          <h1 style={title}>
            Privacy Policy
          </h1>

          <p style={subtitle}>
            How PugPep collects, uses, protects, and manages customer,
            account, order, and communication information.
          </p>

          <p style={updatedText}>
            Last updated: August 22, 2026
          </p>
        </section>

        <section style={introPanel}>
          <p style={sectionEyebrow}>
            OUR APPROACH
          </p>

          <h2 style={sectionTitle}>
            Privacy, Transparency &amp; Responsible Data Use
          </h2>

          <p style={bodyText}>
            PugPep respects the privacy of customers and research-community
            members. This Privacy Policy explains the categories of
            information we may collect, why we use that information, when it
            may be shared with service providers, how long it may be retained,
            and the choices available to customers.
          </p>

          <p style={bodyText}>
            This Policy applies to information collected through the PugPep
            website, customer accounts, checkout and ordering systems,
            customer-support communications, and optional transactional SMS
            services.
          </p>
        </section>

        <Section
          eyebrow="INFORMATION WE COLLECT"
          title="1. Information You Provide"
        >
          <p style={bodyText}>
            We may collect information that you voluntarily provide when you
            create or use an account, place an order, communicate with support,
            or use other PugPep services.
          </p>

          <div style={grid}>
            <InfoCard
              title="Identity & Contact"
              text="Name, organization, email address, mobile phone number, and other contact information you provide."
            />

            <InfoCard
              title="Order & Delivery"
              text="Products ordered, quantities, order history, shipping address, tracking information, fulfillment status, and related transaction records."
            />

            <InfoCard
              title="Account Information"
              text="Account identifiers, customer profile information, rewards or loyalty information, preferences, and account-related settings."
            />

            <InfoCard
              title="Support Communications"
              text="Messages, requests, documentation, photographs, or other information you provide when contacting PugPep about an order or service issue."
            />
          </div>
        </Section>

        <Section
          eyebrow="AUTOMATIC INFORMATION"
          title="2. Website & Technical Information"
        >
          <p style={bodyText}>
            Depending on the services and technologies used by the website, we
            may receive technical or usage information such as browser type,
            device information, IP address, session information, referring
            pages, website interactions, security events, or similar technical
            data.
          </p>

          <p style={bodyText}>
            This information may be used to operate and secure the website,
            identify technical problems, prevent fraud or misuse, analyze
            performance, and improve customer experience.
          </p>
        </Section>

        <Section
          eyebrow="HOW INFORMATION IS USED"
          title="3. Business & Service Purposes"
        >
          <p style={bodyText}>
            PugPep may use information for legitimate business and service
            purposes, including:
          </p>

          <div style={grid}>
            <InfoCard
              title="Order Processing"
              text="Creating orders, verifying order details, coordinating payment records, preparing shipments, and maintaining fulfillment history."
            />

            <InfoCard
              title="Customer Support"
              text="Responding to questions, resolving order issues, reviewing damaged or incorrect shipments, and maintaining support records."
            />

            <InfoCard
              title="Account Administration"
              text="Maintaining customer profiles, rewards information, account preferences, eligibility records, and related services."
            />

            <InfoCard
              title="Security & Compliance"
              text="Detecting fraud, misuse, unauthorized activity, technical abuse, and maintaining records reasonably necessary for legal, regulatory, operational, or compliance purposes."
            />
          </div>
        </Section>

        <Section
          eyebrow="SMS PRIVACY"
          title="4. Mobile Information &amp; SMS Consent"
        >
          <div style={smsBox}>
            <strong style={smsTitle}>
              Mobile information and messaging consent are treated separately
              from general marketing data.
            </strong>

            <p style={bodyText}>
              PugPep may collect a mobile phone number and SMS opt-in status
              when a customer voluntarily chooses to receive transactional
              order updates.
            </p>

            <p style={bodyText}>
              Mobile phone numbers, SMS opt-in records, and messaging consent
              are not sold, rented, or shared with third parties or affiliates
              for their marketing or promotional purposes.
            </p>

            <p style={bodyText}>
              PugPep may use service providers that help deliver requested
              communications or operate related website, messaging, hosting,
              order-management, shipping, security, or customer-support
              functions.
            </p>

            <p style={bodyText}>
              Message frequency varies according to order activity. Message
              and data rates may apply. Customers may reply STOP to opt out and
              HELP for assistance.
            </p>
          </div>

          <PolicyLink href="/sms-terms">
            View SMS Terms →
          </PolicyLink>
        </Section>

        <Section
          eyebrow="SERVICE PROVIDERS"
          title="5. When Information May Be Shared"
        >
          <p style={bodyText}>
            PugPep may provide information to vendors and service providers
            that perform functions on our behalf, such as website hosting,
            infrastructure, communications, payment or transaction support,
            shipping and tracking, analytics, fraud prevention, security, and
            customer service.
          </p>

          <p style={bodyText}>
            These providers may receive only the information reasonably
            necessary to perform the services for which they are engaged,
            subject to their own contractual, legal, and security obligations.
          </p>

          <p style={bodyText}>
            PugPep may also disclose information when reasonably necessary to
            comply with law, legal process, court orders, governmental
            requests, enforce applicable policies, investigate fraud or abuse,
            or protect the rights, property, safety, or security of PugPep,
            customers, or others.
          </p>
        </Section>

        <Section
          eyebrow="PAYMENT INFORMATION"
          title="6. Payment &amp; Transaction Data"
        >
          <p style={bodyText}>
            Payment methods may be supported by third-party financial,
            payment, banking, cryptocurrency, or transaction-service
            providers. PugPep may receive transaction status, payment
            references, confirmation details, or other information necessary
            to associate payment activity with an order.
          </p>

          <p style={bodyText}>
            PugPep does not represent that every payment method is processed
            directly by PugPep. Information submitted directly to an external
            payment or financial provider may also be governed by that
            provider&apos;s privacy practices and terms.
          </p>
        </Section>

        <Section
          eyebrow="COOKIES & TECHNOLOGY"
          title="7. Cookies, Local Storage &amp; Similar Technologies"
        >
          <p style={bodyText}>
            PugPep may use cookies, browser storage, session technologies, or
            similar tools to support website functionality such as account
            sessions, cart behavior, age or access acknowledgments, security,
            preferences, analytics, or other operational features.
          </p>

          <p style={bodyText}>
            Your browser may provide controls for managing cookies or local
            storage. Disabling certain technologies may affect website
            functionality.
          </p>
        </Section>

        <Section
          eyebrow="DATA RETENTION"
          title="8. How Long Information Is Retained"
        >
          <p style={bodyText}>
            PugPep retains information for as long as reasonably necessary to
            fulfill the purposes described in this Policy, including order
            fulfillment, account administration, customer service, fraud
            prevention, business records, dispute resolution, security,
            accounting, and legal or compliance obligations.
          </p>

          <p style={bodyText}>
            Retention periods may differ depending on the type of information,
            the nature of the transaction, operational requirements, and
            applicable recordkeeping obligations.
          </p>
        </Section>

        <Section
          eyebrow="SECURITY"
          title="9. Information Security"
        >
          <p style={bodyText}>
            PugPep uses reasonable administrative, technical, and
            organizational measures intended to protect customer and business
            information against unauthorized access, misuse, alteration, loss,
            or disclosure.
          </p>

          <p style={bodyText}>
            No method of electronic transmission, storage, or online security
            can be guaranteed to be completely secure. Customers are also
            responsible for maintaining the confidentiality of account
            credentials and protecting access to their devices and email
            accounts.
          </p>
        </Section>

        <Section
          eyebrow="YOUR CHOICES"
          title="10. Customer Privacy Choices"
        >
          <p style={bodyText}>
            Customers may choose not to enroll in optional SMS updates and may
            opt out of an eligible PugPep SMS program by replying STOP.
          </p>

          <p style={bodyText}>
            Customers may contact PugPep to ask questions about information
            associated with their account, request correction of inaccurate
            contact details, or ask about available privacy choices. Certain
            records may need to be retained for legitimate business, security,
            financial, legal, or compliance purposes.
          </p>
        </Section>

        <Section
          eyebrow="CHILDREN"
          title="11. Age &amp; Children&apos;s Privacy"
        >
          <p style={bodyText}>
            PugPep ordering services are not directed to children. PugPep does
            not knowingly seek to collect personal information from children
            through its research-material ordering services.
          </p>
        </Section>

        <Section
          eyebrow="EXTERNAL SERVICES"
          title="12. Third-Party Links &amp; Services"
        >
          <p style={bodyText}>
            The PugPep website may contain links to or integrations with
            third-party services. PugPep is not responsible for the privacy
            practices, content, security, or policies of independent
            third-party websites or services.
          </p>
        </Section>

        <Section
          eyebrow="POLICY UPDATES"
          title="13. Changes to This Privacy Policy"
        >
          <p style={bodyText}>
            PugPep may update this Privacy Policy from time to time to reflect
            changes in services, technology, business practices, applicable
            requirements, or privacy procedures. The current version will be
            posted on this page with an updated revision date.
          </p>
        </Section>

        <section style={contactPanel}>
          <p style={sectionEyebrow}>
            CONTACT
          </p>

          <h2 style={sectionTitle}>
            Privacy Questions
          </h2>

          <p style={bodyText}>
            Questions about this Privacy Policy, account information, or
            PugPep communications may be directed to{" "}
            <a
              href="mailto:Support@PugPep.com"
              style={textLink}
            >
              Support@PugPep.com
            </a>
            .
          </p>

          <div style={linkGrid}>
            <PolicyLink href="/policies">
              Legal &amp; Policies
            </PolicyLink>

            <PolicyLink href="/terms">
              Terms &amp; Conditions
            </PolicyLink>

            <PolicyLink href="/sms-terms">
              SMS Terms
            </PolicyLink>

            <PolicyLink href="/research-use">
              Research Use Policy
            </PolicyLink>
          </div>
        </section>

        <footer style={footer}>
          <Link href="/policies" style={footerLink}>
            Legal &amp; Policies
          </Link>

          <span style={dot}>
            •
          </span>

          <Link href="/terms" style={footerLink}>
            Terms &amp; Conditions
          </Link>

          <span style={dot}>
            •
          </span>

          <Link href="/" style={footerLink}>
            Return Home
          </Link>

          <p style={copyright}>
            PUGPEP © 2026 All Rights Reserved
          </p>
        </footer>
      </div>
    </main>
  );
}

function Section({
  eyebrow: sectionLabel,
  title: sectionHeading,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={section}>
      <p style={sectionEyebrow}>
        {sectionLabel}
      </p>

      <h2 style={sectionTitle}>
        {sectionHeading}
      </h2>

      {children}
    </section>
  );
}

function InfoCard({
  title: cardTitle,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div style={infoCard}>
      <div style={infoIcon}>
        ✓
      </div>

      <div>
        <strong style={infoTitle}>
          {cardTitle}
        </strong>

        <p style={infoText}>
          {text}
        </p>
      </div>
    </div>
  );
}

function PolicyLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      style={policyLink}
    >
      {children}
    </Link>
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
  maxWidth: 1150,
  margin: "0 auto",
};

const hero = {
  maxWidth: 900,
  margin: "0 auto 34px",
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
    "clamp(46px, 8vw, 70px)",
  letterSpacing: "-.04em",
  textShadow:
    "0 0 26px rgba(255,45,210,.36)",
};

const subtitle = {
  maxWidth: 800,
  margin: "16px auto 0",
  color: "#c6c6ce",
  fontSize: 20,
  lineHeight: 1.7,
};

const updatedText = {
  margin: "12px 0 0",
  color: "#85858e",
  fontSize: 13,
};

const introPanel = {
  margin: "0 auto 24px",
  padding:
    "clamp(22px, 4vw, 30px)",
  border:
    "1px solid rgba(0,217,255,.30)",
  borderRadius: 18,
  background:
    "linear-gradient(145deg, rgba(8,8,12,.95), rgba(15,8,18,.92))",
};

const section = {
  margin: "0 auto 24px",
  padding:
    "clamp(22px, 4vw, 30px)",
  border:
    "1px solid rgba(255,255,255,.12)",
  borderRadius: 18,
  background:
    "linear-gradient(145deg, rgba(8,8,12,.95), rgba(10,7,13,.92))",
};

const contactPanel = {
  margin: "0 auto 24px",
  padding:
    "clamp(22px, 4vw, 30px)",
  border:
    "1px solid rgba(0,255,153,.26)",
  borderRadius: 18,
  background:
    "linear-gradient(145deg, rgba(5,14,12,.92), rgba(7,8,12,.96))",
};

const sectionEyebrow = {
  margin: 0,
  color: "#00d9ff",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: ".14em",
};

const sectionTitle = {
  margin: "7px 0 14px",
  color: "#7df9ff",
  fontSize:
    "clamp(24px, 4vw, 32px)",
};

const bodyText = {
  margin: "10px 0",
  color: "#c8c8cf",
  lineHeight: 1.8,
  fontSize: 16,
};

const grid = {
  marginTop: 18,
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 14,
};

const infoCard = {
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

const infoIcon = {
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

const infoTitle = {
  color: "#ffffff",
  fontSize: 17,
};

const infoText = {
  margin: "6px 0 0",
  color: "#a9a9b2",
  lineHeight: 1.6,
};

const smsBox = {
  padding: 18,
  border:
    "1px solid rgba(0,255,153,.35)",
  borderRadius: 14,
  background:
    "rgba(0,255,153,.05)",
};

const smsTitle = {
  color: "#00ff99",
  fontSize: 18,
};

const policyLink = {
  display: "inline-flex",
  marginTop: 14,
  minHeight: 42,
  padding: "9px 13px",
  alignItems: "center",
  border:
    "1px solid rgba(0,217,255,.42)",
  borderRadius: 9,
  background:
    "rgba(0,217,255,.05)",
  color: "#7df9ff",
  fontSize: 14,
  fontWeight: 900,
  textDecoration: "none",
};

const linkGrid = {
  marginTop: 14,
  display: "flex",
  flexWrap: "wrap" as const,
  gap: 10,
};

const textLink = {
  color: "#7df9ff",
  textDecoration: "underline",
};

const footer = {
  marginTop: 38,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  flexWrap: "wrap" as const,
  gap: 10,
  textAlign: "center" as const,
};

const footerLink = {
  color: "#7df9ff",
  textDecoration: "none",
  fontSize: 13,
};

const dot = {
  color: "#62666d",
};

const copyright = {
  width: "100%",
  margin: "12px 0 0",
  color: "#00d9ff",
  fontWeight: 900,
  fontSize: 13,
};