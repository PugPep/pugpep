export function prismCheckoutHost(): URL | null {
  try {
    const raw = (process.env.PRISM_CHECKOUT_HOST || "").trim();
    if (!raw) return null;
    const dest = new URL(raw);
    const suffix = ".workers.dev";
    const host = dest.hostname.toLowerCase();
    if (
      dest.protocol !== "https:" ||
      !host.endsWith(suffix) ||
      !host.includes("pugpep") ||
      dest.pathname !== "/" ||
      dest.username ||
      dest.password ||
      dest.port ||
      dest.search ||
      dest.hash
    ) {
      return null;
    }
    return dest;
  } catch {
    return null;
  }
}

export function prismProxySecret(): string {
  return (process.env.PRISM_PROXY_SECRET || "").trim();
}

export function prismMerchantSecret(): string {
  return (process.env.PRISM_MERCHANT_SECRET || "").trim();
}

export function isPrismCheckoutEnabled(): boolean {
  return (
    process.env.PRISM_CHECKOUT_ENABLED === "true" &&
    Boolean(prismCheckoutHost()) &&
    prismProxySecret().length >= 32
  );
}
