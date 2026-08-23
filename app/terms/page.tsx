"use client";

import Link from "next/link";

export default function TermsPage() {
  return (
    <main style={page}>
      <div style={container}>
        <section style={hero}>
          <p style={eyebrow}>
            PUGPEP LEGAL
          </p>

          <h1 style={title}>
            Terms &amp; Conditions
          </h1>

          <p style={heroText}>
            Terms governing access to PugPep, ordering, research-use
            materials, communications, fulfillment, and customer
            responsibilities.
          </p>

          <p style={updatedText}>
            Last updated: August 22, 2026
          </p>
        </section>

        <Section
          eyebrow="RESEARCH USE"
          title="1. Laboratory Research Use Only"
        >
          <p style={paragraphStyle}>
            Unless expressly stated otherwise, products distributed by PugPep
            are supplied exclusively as laboratory research materials for
            research, analytical, educational, and in-vitro applications.
          </p>

          <p style={paragraphStyle}>
            PugPep products are not intended for human or veterinary use,
            ingestion, injection, implantation, topical application, clinical
            treatment, diagnostic use, therapeutic use, or any other human or
            animal application.
          </p>

          <p style={paragraphStyle}>
            Products are not represented as drugs, medicines, dietary
            supplements, food products, cosmetics, medical devices, veterinary
            products, or products intended to diagnose, treat, cure, mitigate,
            or prevent disease.
          </p>

          <PolicyLink href="/research-use">
            View the full Research Use Policy →
          </PolicyLink>
        </Section>

        <Section
          eyebrow="ELIGIBILITY"
          title="2. Customer Eligibility &amp; Research-Use Representation"
        >
          <p style={paragraphStyle}>
            By accessing PugPep ordering services or purchasing products, the
            customer represents that they meet the age and eligibility
            requirements displayed by PugPep and are acquiring the materials
            for lawful laboratory research purposes.
          </p>

          <p style={paragraphStyle}>
            Customers agree not to purchase, use, resell, represent,
            distribute, or otherwise provide PugPep research materials for
            prohibited human, veterinary, therapeutic, diagnostic, or
            consumer-health applications.
          </p>

          <p style={paragraphStyle}>
            PugPep reserves the right to decline, cancel, restrict, or review
            an order when information available to PugPep reasonably indicates
            that a transaction may be inconsistent with these Terms, the
            Research Use Policy, or applicable requirements.
          </p>
        </Section>

        <Section
          eyebrow="CUSTOMER RESPONSIBILITY"
          title="3. Handling, Storage &amp; Laboratory Responsibility"
        >
          <p style={paragraphStyle}>
            Customers are responsible for determining whether a material is
            appropriate for their intended research application and for
            ensuring that purchase, possession, storage, handling, testing,
            documentation, and disposal comply with applicable laws,
            regulations, institutional requirements, laboratory procedures,
            and safety standards.
          </p>

          <p style={paragraphStyle}>
            Customers are responsible for using appropriate laboratory
            controls, qualified personnel, protective equipment, containment
            procedures, and handling practices suitable for the material and
            research being performed.
          </p>

          <p style={paragraphStyle}>
            PugPep is not responsible for degradation, contamination,
            instability, loss, or other changes resulting from improper
            post-delivery storage, handling, environmental exposure, or
            unauthorized use.
          </p>
        </Section>

        <Section
          eyebrow="SCIENTIFIC INFORMATION"
          title="4. No Medical, Veterinary, or Dosing Advice"
        >
          <p style={paragraphStyle}>
            Information appearing on the PugPep website may summarize
            scientific literature, analytical characteristics, laboratory
            documentation, areas of investigation, or other research-oriented
            information.
          </p>

          <p style={paragraphStyle}>
            Such information is provided for research and informational
            purposes only and does not constitute medical advice, veterinary
            advice, diagnosis, treatment recommendations, administration
            instructions, dosing guidance, clinical guidance, or claims of
            therapeutic benefit.
          </p>
        </Section>

        <Section
          eyebrow="QUALITY"
          title="5. Product Quality &amp; Analytical Testing"
        >
          <p style={paragraphStyle}>
            PugPep is committed to maintaining research-material quality,
            consistency, and transparent access to available analytical
            documentation.
          </p>

          <p style={paragraphStyle}>
            Where available, products may have third-party Certificates of
            Analysis or other laboratory documentation relating to identity,
            purity, quantity, or other analytical measurements.
          </p>

          <p style={paragraphStyle}>
            Analytical documentation describes the tested research sample and
            does not constitute evidence of safety, efficacy, therapeutic
            performance, clinical suitability, or regulatory approval.
            PugPep does not warrant any particular experimental outcome or
            suitability for a customer&apos;s specific research protocol.
          </p>

          <PolicyLink href="/quality">
            View Quality &amp; Testing →
          </PolicyLink>
        </Section>

        <Section
          eyebrow="PRODUCT APPEARANCE"
          title="6. Lyophilized Appearance &amp; Packaging Variation"
        >
          <p style={paragraphStyle}>
            Research materials may exhibit differences in cosmetic appearance,
            including puck shape, fragmentation, settling, or other visible
            variation resulting from compound characteristics, packaging,
            transportation, vibration, pressure changes, or environmental
            conditions.
          </p>

          <p style={paragraphStyle}>
            Cosmetic appearance alone does not establish identity, purity,
            contamination, or product failure. Customers should rely on
            applicable analytical documentation and appropriate laboratory
            evaluation rather than visual appearance alone.
          </p>
        </Section>

        <Section
          eyebrow="ORDERS"
          title="7. Orders, Availability &amp; Pricing"
        >
          <p style={paragraphStyle}>
            Product availability, pricing, promotions, discounts, and shipping
            options may change without prior notice. An order submission does
            not obligate PugPep to fulfill an order that cannot be completed
            because of inventory, payment, address, compliance, technical, or
            other legitimate operational issues.
          </p>

          <p style={paragraphStyle}>
            Customers are responsible for reviewing product selections,
            quantities, shipping information, and order details before
            confirming an order.
          </p>
        </Section>

        <Section
          eyebrow="PAYMENTS"
          title="8. Payment Responsibility"
        >
          <p style={paragraphStyle}>
            Customers are responsible for providing accurate payment
            information and following the payment instructions presented for
            the selected payment method.
          </p>

          <p style={paragraphStyle}>
            Cryptocurrency and other irreversible payment transactions require
            particular care. Customers are responsible for confirming wallet
            addresses, networks, assets, amounts, and transaction details
            before sending funds. PugPep is not responsible for funds sent to
            an incorrect address, through an unsupported network, or through an
            incorrect transaction selected by the customer.
          </p>
        </Section>

        <Section
          eyebrow="FINAL SALE"
          title="9. Refund &amp; Return Policy"
        >
          <div style={warningBox}>
            <strong style={warningTitle}>
              All sales are final.
            </strong>

            <p style={warningText}>
              Due to the nature of specialized laboratory research materials
              and the inability to independently verify handling, storage, or
              chain of custody after fulfillment, PugPep does not accept
              returns, exchanges, or refunds once an order has been processed
              or shipped.
            </p>
          </div>

          <p style={paragraphStyle}>
            If an order arrives damaged, incorrect, incomplete, or is affected
            by a verified PugPep fulfillment error, customers should contact
            PugPep Support with the order number and supporting information.
            Verified fulfillment issues may be resolved through replacement,
            account credit, or another appropriate remedy at PugPep&apos;s
            discretion.
          </p>

          <PolicyLink href="/refund-policy">
            View the full Refund &amp; Return Policy →
          </PolicyLink>
        </Section>

        <Section
          eyebrow="FULFILLMENT"
          title="10. Shipping, Tracking &amp; Delivery"
        >
          <p style={paragraphStyle}>
            Customers are responsible for providing a complete and accurate
            shipping address before fulfillment. PugPep cannot guarantee that
            an address can be changed after processing or shipment has begun.
          </p>

          <p style={paragraphStyle}>
            Carrier transit estimates are not guaranteed delivery dates.
            Weather, carrier processing, transportation disruptions, holidays,
            service interruptions, delivery-access limitations, incorrect
            address information, and other conditions outside PugPep&apos;s
            direct control may affect delivery.
          </p>

          <p style={paragraphStyle}>
            A carrier delay or missed estimated delivery date does not, by
            itself, make an order eligible for a refund. PugPep may assist with
            available tracking information or carrier inquiries when
            appropriate.
          </p>

          <PolicyLink href="/shipping-policy">
            View the full Shipping &amp; Delivery Policy →
          </PolicyLink>
        </Section>

        <Section
          eyebrow="SMS COMMUNICATIONS"
          title="11. Optional Transactional SMS"
        >
          <p style={paragraphStyle}>
            Customers may voluntarily opt in during checkout to receive PugPep
            Order Updates, including order confirmation, shipping, tracking,
            out-for-delivery, carrier-related, and delivery notifications.
          </p>

          <p style={paragraphStyle}>
            SMS consent is optional and is not a condition of purchase.
            Message frequency varies according to order activity. Message and
            data rates may apply.
          </p>

          <p style={paragraphStyle}>
            Reply STOP to an eligible PugPep SMS message to opt out and HELP
            for assistance. Carriers are not liable for delayed or undelivered
            messages.
          </p>

          <PolicyLink href="/sms-terms">
            View the full SMS Terms →
          </PolicyLink>
        </Section>

        <Section
          eyebrow="PRIVACY"
          title="12. Privacy &amp; Customer Information"
        >
          <p style={paragraphStyle}>
            PugPep handles personal information in accordance with its Privacy
            Policy. Information may be used to operate customer accounts,
            process and fulfill orders, provide customer support, prevent fraud
            or misuse, maintain business records, and provide communications
            requested by the customer.
          </p>

          <p style={paragraphStyle}>
            Mobile phone numbers, SMS opt-in data, and messaging consent are
            not sold, rented, or shared with third parties or affiliates for
            their marketing or promotional purposes.
          </p>

          <PolicyLink href="/privacy">
            View the Privacy Policy →
          </PolicyLink>
        </Section>

        <Section
          eyebrow="LIMITATION OF LIABILITY"
          title="13. Assumption of Research Responsibility &amp; Liability"
        >
          <p style={paragraphStyle}>
            To the maximum extent permitted by applicable law, customers
            assume responsibility for the lawful possession, handling,
            storage, research use, and disposition of materials purchased from
            PugPep.
          </p>

          <p style={paragraphStyle}>
            To the maximum extent permitted by applicable law, PugPep and its
            owners, affiliates, operators, employees, and service providers are
            not liable for indirect, incidental, special, consequential, or
            exemplary damages arising from misuse, unauthorized application,
            improper handling, or use inconsistent with these Terms.
          </p>

          <p style={paragraphStyle}>
            Nothing in these Terms excludes or limits liability where such
            exclusion or limitation is prohibited by applicable law.
          </p>
        </Section>

        <Section
          eyebrow="REGULATORY POSITIONING"
          title="14. Regulatory &amp; Business Status Statement"
        >
          <p style={paragraphStyle}>
            Statements made on the PugPep website have not been evaluated by
            the U.S. Food and Drug Administration. PugPep products are not
            intended to diagnose, treat, cure, mitigate, or prevent disease.
          </p>

          <p style={paragraphStyle}>
            PugPep operates as a supplier of laboratory research materials.
            PugPep is not represented as a compounding pharmacy under Section
            503A of the Federal Food, Drug, and Cosmetic Act and is not
            represented as an outsourcing facility under Section 503B.
          </p>
        </Section>

        <Section
          eyebrow="POLICY CHANGES"
          title="15. Changes to These Terms"
        >
          <p style={paragraphStyle}>
            PugPep may update these Terms from time to time to reflect changes
            in services, business practices, policies, communications, or
            applicable requirements. The current version will be posted on
            this page with an updated revision date.
          </p>
        </Section>

        <Section
          eyebrow="ACCEPTANCE"
          title="16. Acceptance of Terms"
        >
          <p style={paragraphStyle}>
            By accessing PugPep services, creating an account, or placing an
            order, the customer acknowledges that they have reviewed and agree
            to the Terms and policies applicable to their use of the website
            and purchase of research materials.
          </p>

          <div style={policyGrid}>
            <PolicyLink href="/policies">
              Legal &amp; Policies
            </PolicyLink>

            <PolicyLink href="/research-use">
              Research Use Policy
            </PolicyLink>

            <PolicyLink href="/refund-policy">
              Refund &amp; Return Policy
            </PolicyLink>

            <PolicyLink href="/shipping-policy">
              Shipping &amp; Delivery Policy
            </PolicyLink>

            <PolicyLink href="/privacy">
              Privacy Policy
            </PolicyLink>

            <PolicyLink href="/sms-terms">
              SMS Terms
            </PolicyLink>
          </div>
        </Section>

        <section style={contactSection}>
          <p style={sectionEyebrow}>
            SUPPORT
          </p>

          <h2 style={sectionTitle}>
            Questions About These Terms
          </h2>

          <p style={paragraphStyle}>
            Questions regarding these Terms, an order, or a PugPep policy may
            be directed to{" "}
            <a
              href="mailto:Support@PugPep.com"
              style={textLink}
            >
              Support@PugPep.com
            </a>
            .
          </p>
        </section>

        <footer style={footer}>
          <Link href="/policies" style={footerLink}>
            Legal &amp; Policies
          </Link>

          <span style={dot}>
            •
          </span>

          <Link href="/privacy" style={footerLink}>
            Privacy Policy
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

const heroText = {
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

const section = {
  margin: "0 auto 24px",
  padding:
    "clamp(22px, 4vw, 30px)",
  border:
    "1px solid rgba(255,255,255,.12)",
  borderRadius: 18,
  background:
    "linear-gradient(145deg, rgba(8,8,12,.95), rgba(10,7,13,.92))",
  backdropFilter: "blur(8px)",
};

const contactSection = {
  margin: "0 auto 24px",
  padding:
    "clamp(22px, 4vw, 30px)",
  border:
    "1px solid rgba(0,217,255,.28)",
  borderRadius: 18,
  background:
    "linear-gradient(145deg, rgba(5,11,14,.94), rgba(7,8,12,.96))",
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

const paragraphStyle = {
  color: "#c8c8cf",
  lineHeight: 1.8,
  margin: "10px 0",
  fontSize: 16,
};

const warningBox = {
  margin: "4px 0 16px",
  padding: 18,
  border:
    "1px solid rgba(255,204,102,.35)",
  borderRadius: 14,
  background:
    "rgba(255,204,102,.05)",
};

const warningTitle = {
  color: "#ffcc66",
  fontSize: 18,
};

const warningText = {
  margin: "8px 0 0",
  color: "#c8c8cf",
  lineHeight: 1.75,
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

const policyGrid = {
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