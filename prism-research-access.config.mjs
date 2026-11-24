export const PUBLIC_ORIGIN = (process.env.PRA_PUBLIC_ORIGIN || "https://pugpep.com").replace(/\/+$/, "");

export const PUBLIC_ALIAS_ORIGINS = [
  "https://pugpep.com",
  "https://www.pugpep.com",
  "https://biohackingpep.com",
  "https://www.biohackingpep.com",
];

export const PUBLIC_POLICY_PATHS = [
  "/policies",
  "/terms",
  "/privacy",
  "/research-use-policy",
  "/research-use",
  "/refund-policy",
  "/shipping-policy",
  "/sms-terms",
];

export const PUBLIC_POLICY_PREFIX = "/prism-public-policy";
export const PUBLIC_POLICY_HEADER = "x-pugpep-public-policy";
export const LOGO_ASSET_PATH =
  "/site-branding/6f89d292002be23ddeb4a84373329fb979ac2ef577dda6c4d8d6e38c618d8c45.webp";

export function policySlug(path) {
  const clean = path.length > 1 ? path.replace(/\/+$/, "") : path;
  if (clean === "/research-use") return "research-use-policy";
  return PUBLIC_POLICY_PATHS.includes(clean) ? clean.slice(1) : "";
}

const evidenceRef = (process.env.PRA_INGRESS_EVIDENCE_REF || "").trim();

export default {
  serviceOrigin: (process.env.PRA_SERVICE_ORIGIN || "https://research-access.prismpro.io").replace(/\/+$/, ""),
  publicOrigin: PUBLIC_ORIGIN,
  siteId: process.env.PRA_SITE_ID,
  siteSlug: process.env.PRA_SITE_SLUG || "pugpep",
  browserTransport: "same-origin-v1",
  turnstileSiteKey: process.env.PRA_TURNSTILE_SITE_KEY,
  theme: "dark",
  ingress: {
    adapter: "trusted_proxy",
    source: "x_real_ip",
    verified: Boolean(evidenceRef),
    evidenceRef,
  },
  publicPaths: PUBLIC_POLICY_PATHS,
  publicAssetPaths: [LOGO_ASSET_PATH],
  serviceRoutes: [
    { path: "/api/prism/callback", method: "POST", owner: "checkout" },
    { path: "/api/cron/unpaid-orders", method: "GET", owner: "host", anyHost: true },
    { path: "/api/tracking/webhook", method: "POST", owner: "host" },
    { path: "/api/aurpay/webhook", method: "POST", owner: "host" },
  ],
  defaultPath: "/",
};
