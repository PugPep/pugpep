import { LOGO_ASSET_PATH, PUBLIC_ORIGIN } from "../prism-research-access.config.mjs";

export const SUPPORT_EMAIL = "Support@PugPep.com";
export const SUPPORT_MAILTO = "mailto:support@pugpep.com";

export type PolicySlug =
  | "policies"
  | "terms"
  | "privacy"
  | "research-use-policy"
  | "refund-policy"
  | "shipping-policy"
  | "sms-terms";

export type PolicyEntry = {
  slug: PolicySlug;
  title: string;
  navLabel: string;
  description: string;
  bodyHtml: string;
};

const POLICIES: Record<PolicySlug, PolicyEntry> = {
  policies: {
    slug: "policies",
    title: "Legal & Policies",
    navLabel: "Policy Center",
    description:
      "Central access to PugPep research-use standards, customer terms, privacy practices, fulfillment policies, and SMS communication rules.",
    bodyHtml: `
<p><strong>Last updated: August 22, 2026</strong></p>
<p>PugPep supplies laboratory research materials intended exclusively for research, analytical, educational, and in-vitro applications. This Policy Center provides direct access to the terms, research-use standards, privacy practices, shipping information, refund rules, and communication policies governing the PugPep website and services.</p>
<h2>Policy Library</h2>
<ul>
  <li><a href="/terms">Terms &amp; Conditions</a> &mdash; Access terms, ordering conditions, eligibility, and customer responsibilities.</li>
  <li><a href="/privacy">Privacy Policy</a> &mdash; How PugPep collects, uses, retains, and safeguards account, order, and communication data.</li>
  <li><a href="/research-use-policy">Research Use Only Policy</a> &mdash; Laboratory research scope, non-clinical classification, and compliance standards.</li>
  <li><a href="/refund-policy">Refund &amp; Return Policy</a> &mdash; Final-sale policy and resolution steps for damaged, broken, or incorrect orders.</li>
  <li><a href="/shipping-policy">Shipping &amp; Delivery Policy</a> &mdash; Fulfillment preparation, tracking updates, carrier transit, and address accuracy.</li>
  <li><a href="/sms-terms">SMS Terms</a> &mdash; Optional transactional PugPep Order Updates enrollment, STOP/HELP controls, and mobile privacy.</li>
</ul>
<h2>Research Use Notice</h2>
<p>PugPep products are intended for laboratory research purposes only. They are not intended for human or veterinary use and are not represented as drugs, medicines, dietary supplements, food products, cosmetics, medical devices, veterinary products, or products intended to diagnose, treat, cure, mitigate, or prevent disease.</p>
<p>Questions about any policy may be directed to <a href="${SUPPORT_MAILTO}">${SUPPORT_EMAIL}</a>.</p>
    `.trim(),
  },
  terms: {
    slug: "terms",
    title: "Terms & Conditions",
    navLabel: "Terms",
    description:
      "Terms governing access to PugPep, ordering, research-use materials, communications, fulfillment, and customer responsibilities.",
    bodyHtml: `
<p><strong>Last updated: November 13, 2026</strong></p>
<p>These Terms &amp; Conditions govern your access to and use of the PugPep website, ordering services, and laboratory research materials. Please read them alongside our <a href="/research-use-policy">Research Use Only Policy</a>, <a href="/privacy">Privacy Policy</a>, <a href="/refund-policy">Refund &amp; Return Policy</a>, <a href="/shipping-policy">Shipping &amp; Delivery Policy</a>, and <a href="/sms-terms">SMS Terms</a>.</p>
<h2>Research Use Only &amp; Eligibility</h2>
<p>Unless expressly stated otherwise, products distributed by PugPep are supplied exclusively as laboratory research materials for research, analytical, educational, and in-vitro applications. PugPep products are not intended for human or veterinary use, ingestion, injection, implantation, topical application, clinical treatment, diagnostic use, therapeutic use, or any other human or animal application.</p>
<p>By accessing PugPep ordering services or purchasing products, you represent that you meet the 21+ age and eligibility requirements displayed by PugPep and are acquiring materials solely for lawful laboratory research purposes. You agree not to purchase, use, resell, represent, or distribute PugPep research materials for prohibited human, veterinary, therapeutic, diagnostic, or consumer-health applications.</p>
<p>PugPep reserves the right to decline, cancel, restrict, or review an order when available information reasonably indicates a transaction may conflict with these Terms or applicable requirements.</p>
<h2>Handling, Quality &amp; Scientific Information</h2>
<p>Customers are responsible for determining suitability for intended research applications and for ensuring that possession, storage, handling, laboratory controls, protective equipment, and disposal comply with applicable laws, regulations, and safety standards. PugPep is not responsible for degradation, contamination, instability, or loss resulting from improper post-delivery storage, handling, or unauthorized use.</p>
<p>Website summaries of scientific literature or analytical characteristics are informational only and do not constitute medical or veterinary advice, dosing instructions, or claims of therapeutic benefit. Third-party Certificates of Analysis describe the tested research sample and do not warrant experimental outcomes or clinical suitability. Cosmetic variations such as puck shape or settling do not by themselves establish product failure or impurity.</p>
<h2>Ordering, Pricing &amp; Final Sale</h2>
<p>Product availability, pricing, promotions, discounts, and shipping options may change without prior notice. An order submission does not obligate PugPep to fulfill an order affected by inventory, payment, address, compliance, or operational issues. Customers are responsible for verifying selections, quantities, shipping details, and payment instructions before confirming an order.</p>
<p>All sales are final. Due to chain-of-custody and quality assurance standards for laboratory research materials, PugPep cannot accept returns, exchanges, or refunds once an order has been processed or shipped. See our <a href="/refund-policy">Refund &amp; Return Policy</a> for broken-vial or verified fulfillment-error remedies.</p>
<h2>Shipping &amp; Optional SMS Updates</h2>
<p>Customers must supply an accurate shipping address before fulfillment; carrier transit estimates are not guarantees. Customers may optionally opt in during checkout to receive transactional PugPep Order Updates via SMS. SMS consent is never a condition of purchase; reply STOP to opt out or HELP for assistance.</p>
<h2>Contact</h2>
<p>Questions regarding these Terms may be sent to <a href="${SUPPORT_MAILTO}">${SUPPORT_EMAIL}</a>.</p>
    `.trim(),
  },
  privacy: {
    slug: "privacy",
    title: "Privacy Policy",
    navLabel: "Privacy",
    description:
      "How PugPep collects, uses, protects, and manages customer, account, order, and communication information.",
    bodyHtml: `
<p><strong>Last updated: November 13, 2026</strong></p>
<p>PugPep respects the privacy of customers and research-community members. This Privacy Policy explains the categories of information collected through the PugPep website, customer accounts, checkout and ordering systems, customer support, and optional transactional SMS updates.</p>
<h2>Information Collected</h2>
<ul>
  <li><strong>Account &amp; Order Details:</strong> Contact name, email address, phone number (if supplied), billing and shipping details, order items, and payment status or transaction references needed to process and fulfill orders.</li>
  <li><strong>Support Correspondence:</strong> Messages and attachments you choose to share when contacting PugPep Support.</li>
  <li><strong>Technical &amp; Security Data:</strong> Browser type, device details, IP address, session identifiers, and security events processed to operate, secure, and protect the website against misuse.</li>
</ul>
<h2>How Information Is Used</h2>
<p>PugPep uses collected information to verify research access, administer customer accounts, process orders and payments, prepare shipments and tracking updates, provide customer support, prevent fraud or misuse, maintain business and tax records, and comply with legal obligations.</p>
<h2>Mobile Information &amp; Transactional SMS Consent</h2>
<p>Mobile phone numbers, SMS opt-in records, and messaging consent collected for optional PugPep Order Updates are treated separately from general communications. PugPep does not sell, rent, or share mobile phone numbers, SMS opt-in data, or messaging consent with third parties or affiliates for marketing or promotional purposes.</p>
<h2>Service Providers, Payment &amp; Storage</h2>
<p>PugPep may share necessary information with service providers that support website hosting, infrastructure, security, payment processing, shipping carriers, tracking notifications, or customer support under appropriate confidentiality and security obligations. Essential cookies and browser storage support access verification, account sessions, cart state, and site functionality.</p>
<p>We retain information for as long as reasonably necessary for fulfillment, account administration, security, accounting, dispute resolution, and legal compliance. This website is strictly restricted to eligible individuals aged 21+ and is not directed to children.</p>
<h2>Questions</h2>
<p>For privacy inquiries or requests regarding your information, contact <a href="${SUPPORT_MAILTO}">${SUPPORT_EMAIL}</a>.</p>
    `.trim(),
  },
  "research-use-policy": {
    slug: "research-use-policy",
    title: "Research Use Only Policy",
    navLabel: "Research Use",
    description:
      "Standards governing the purchase, handling, interpretation, and use of PugPep laboratory research materials.",
    bodyHtml: `
<h2>Laboratory Research Purposes Only</h2>
<p>Products offered by PugPep are supplied exclusively as laboratory research materials for research, analytical, educational, and in-vitro applications unless expressly stated otherwise. <strong>Not for human or veterinary use.</strong> PugPep products are not intended for ingestion, injection, implantation, topical application to humans or animals, clinical treatment, diagnostic use, therapeutic use, or any other human or veterinary application.</p>
<h2>Research Materials, Not Consumer Health Products</h2>
<p>PugPep products are not represented or offered as drugs, medicines, dietary supplements, food products, cosmetics, medical devices, veterinary products, or products intended to diagnose, treat, cure, mitigate, or prevent disease. Product names, compound identifiers, and literature references provide scientific context only.</p>
<h2>Scientific Information Is Not Medical Advice</h2>
<p>Content on the PugPep website summarizes laboratory characteristics, analytical documentation, and published research areas for informational context only. It does not constitute medical advice, veterinary advice, diagnosis, dosing instructions, clinical guidance, or therapeutic claims.</p>
<h2>Handling, Storage, Documentation &amp; Acknowledgment</h2>
<p>Where available, PugPep provides third-party Certificates of Analysis and analytical documentation describing the tested sample&apos;s identity, purity, or quantity. Customers are responsible for using qualified personnel, containment controls, and lawful laboratory disposal procedures.</p>
<p>By purchasing from PugPep, you affirm that materials are acquired solely for lawful laboratory research purposes and will not be resold or distributed for prohibited applications. PugPep reserves the right to refuse, restrict, or cancel any order reasonably suspected of non-compliant use. Contact <a href="${SUPPORT_MAILTO}">${SUPPORT_EMAIL}</a> with documentation questions.</p>
    `.trim(),
  },
  "refund-policy": {
    slug: "refund-policy",
    title: "Refund & Return Policy",
    navLabel: "Refunds",
    description:
      "Clear expectations for final-sale research materials, fulfillment issues, and order-resolution requests.",
    bodyHtml: `
<h2>All Sales Are Final</h2>
<p>For sanitation and quality assurance reasons, PugPep cannot accept returns. All sales are final. Once an order has been processed or shipped, PugPep does not offer exchanges or refunds. Once research materials leave PugPep&apos;s custody, storage conditions, handling history, packaging integrity, and chain of custody can no longer be independently verified.</p>
<h2>Damaged, Incorrect, or Incomplete Orders</h2>
<p>If an order arrives damaged, incorrect, incomplete, or is affected by a verified fulfillment error attributable to PugPep, contact PugPep Support promptly at <a href="${SUPPORT_MAILTO}">${SUPPORT_EMAIL}</a> with your order number and supporting information. If a vial arrives broken, PugPep will replace it or issue store credit toward your next purchase.</p>
<h2>Carrier &amp; Address Issues</h2>
<p>Customers must provide a complete and accurate shipping address prior to fulfillment. PugPep is not responsible for losses, delays, or delivery failures caused by inaccurate customer-supplied addresses, nor do carrier delays or weather disruptions automatically qualify an order for a refund.</p>
<h2>Research Use Notice</h2>
<p>All PugPep products are supplied solely for laboratory research purposes and not for human or veterinary use.</p>
    `.trim(),
  },
  "shipping-policy": {
    slug: "shipping-policy",
    title: "Shipping & Delivery Policy",
    navLabel: "Shipping",
    description:
      "Information about order preparation, carrier transit, tracking, delivery expectations, and customer shipping responsibilities.",
    bodyHtml: `
<h2>Processing &amp; Shipment</h2>
<p>PugPep prepares orders for shipment once order processing is complete. Processing times may vary based on order volume, inventory status, availability, holidays, carrier schedules, and operational factors. When tracking information becomes available, PugPep provides updates via email and, for customers who separately opt in, optional transactional SMS updates.</p>
<h2>Carrier Transit &amp; Estimates</h2>
<p>Once transferred to the carrier, transit timing is governed by carrier operations, weather, holidays, and service conditions outside PugPep&apos;s direct control. Estimated delivery dates are estimates only and are not guaranteed.</p>
<h2>Shipping Address &amp; Shipment Updates</h2>
<p>Please verify all shipping address fields before submitting an order; address changes cannot be guaranteed once processing or fulfillment begins. Carrier tracking statuses reflect updates reported by the shipping carrier. Optional transactional SMS delivery notifications require explicit checkout opt-in and are never required to purchase.</p>
<h2>Damaged, Missing, or Incorrect Shipments</h2>
<p>If a shipment arrives damaged, incomplete, or incorrect, contact <a href="${SUPPORT_MAILTO}">${SUPPORT_EMAIL}</a> as soon as possible with your order number and photographs of packaging, shipping label, and affected items. Verified fulfillment issues are handled under our <a href="/refund-policy">Refund &amp; Return Policy</a>.</p>
    `.trim(),
  },
  "sms-terms": {
    slug: "sms-terms",
    title: "SMS Terms",
    navLabel: "SMS Terms",
    description:
      "Terms governing optional PugPep transactional text-message updates for orders, shipping, tracking, and delivery.",
    bodyHtml: `
<h2>PugPep Order Updates</h2>
<p>PugPep Order Updates is an optional transactional SMS program for customers who affirmatively opt in during checkout. Messages cover order confirmation, shipping status, tracking updates, out-for-delivery alerts, and delivery confirmation. <strong>SMS consent is optional</strong> and is never a condition of purchase.</p>
<h2>Enrollment, Frequency &amp; Controls</h2>
<ul>
  <li><strong>How Customers Enroll:</strong> Enter a mobile phone number during checkout and actively select the separate unchecked SMS consent checkbox.</li>
  <li><strong>Frequency &amp; Rates:</strong> Message frequency varies by order activity. Message and data rates may apply. Carriers are not liable for delayed or undelivered messages.</li>
  <li><strong>STOP &amp; HELP:</strong> Reply <code>STOP</code> to opt out of further messages from PugPep Order Updates, or reply <code>HELP</code> for assistance (or email <a href="${SUPPORT_MAILTO}">${SUPPORT_EMAIL}</a>).</li>
</ul>
<h2>Mobile Information Privacy &amp; Transactional Scope</h2>
<p>PugPep does not sell, rent, or share mobile phone numbers, SMS opt-in data, or messaging consent with third parties or affiliates for promotional or marketing purposes. Opting in to PugPep Order Updates covers transactional order and shipping notifications only.</p>
    `.trim(),
  },
};

export function getPublicPolicy(slug: string): PolicyEntry | null {
  return Object.prototype.hasOwnProperty.call(POLICIES, slug)
    ? POLICIES[slug as PolicySlug]
    : null;
}

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export function renderPublicPolicyHtml(entry: PolicyEntry): string {
  const canonicalSlug = entry.slug === "policies" ? "policies" : entry.slug;
  const nav = (Object.values(POLICIES) as PolicyEntry[])
    .map((policy) => {
      const href = `/${policy.slug}`;
      return policy.slug === entry.slug
        ? `<strong>${esc(policy.navLabel)}</strong>`
        : `<a href="${href}">${esc(policy.navLabel)}</a>`;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(entry.title)} · PugPep</title>
  <meta name="description" content="${esc(entry.description)}" />
  <link rel="canonical" href="${esc(PUBLIC_ORIGIN)}/${esc(canonicalSlug)}" />
  <style>
    *{box-sizing:border-box}
    :root{color-scheme:dark}
    body{margin:0;min-height:100vh;padding:36px 20px;background:radial-gradient(circle at 12% 0%,rgba(0,217,255,.14),transparent 34%),radial-gradient(circle at 88% 0%,rgba(255,69,216,.14),transparent 34%),#020408;color:#f3f6fb;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,sans-serif;line-height:1.68}
    main{max-width:780px;margin:0 auto;background:linear-gradient(155deg,rgba(10,12,18,.96),rgba(14,10,20,.94));border:1px solid rgba(0,217,255,.26);border-top:3px solid #00d9ff;border-radius:16px;padding:34px 30px;box-shadow:0 24px 60px rgba(0,0,0,.6)}
    .logo{display:inline-block;margin:0 0 20px;text-decoration:none}
    .logo img{display:block;height:36px;width:auto}
    h1{margin:0 0 8px;font-size:30px;line-height:1.15;letter-spacing:-.02em;color:#ffffff}
    .meta{margin:0 0 18px;color:#9ea9ba;font-size:14px}
    nav{display:flex;flex-wrap:wrap;gap:10px 16px;margin:0 0 24px;padding:0 0 16px;border-bottom:1px solid rgba(255,255,255,.12);font-size:14px}
    nav a{color:#7df9ff;text-decoration:underline;text-underline-offset:3px}
    nav strong{color:#ff45d8}
    h2{margin:24px 0 8px;font-size:18px;color:#7df9ff}
    p,ul{margin:0 0 12px;color:#cfd6e3;font-size:15px}
    ul{padding-left:20px}
    li{margin:0 0 7px}
    a{color:#7df9ff}
    code{padding:1px 6px;border-radius:5px;background:rgba(255,255,255,.08);color:#fff;font-size:13.5px}
    .foot{margin-top:28px;padding-top:16px;border-top:1px solid rgba(255,255,255,.12);font-size:13.5px;color:#9ea9ba;display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px}
    @media (max-width:540px){main{padding:24px 18px}}
  </style>
</head>
<body>
  <main>
    <a class="logo" href="/" aria-label="PugPep home"><img src="${esc(LOGO_ASSET_PATH)}" alt="PugPep" /></a>
    <h1>${esc(entry.title)}</h1>
    <p class="meta">PugPep Research Materials · <a href="${SUPPORT_MAILTO}">${SUPPORT_EMAIL}</a></p>
    <nav aria-label="Policies">${nav}</nav>
    ${entry.bodyHtml}
    <div class="foot">
      <span>PugPep &copy; 2026 &middot; Laboratory research materials only.</span>
      <a href="/">Return to PugPep</a>
    </div>
  </main>
</body>
</html>`;
}
