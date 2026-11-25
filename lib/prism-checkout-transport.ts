import type { PendingOrder } from "./payment/types";

export const PRISM_SDK_PATH_RE =
  /^\/prism\/0\.2\.2-candidate\.4(?:-[a-zA-Z0-9.-]+)?\/assets\/js\/checkout\.js$/;

const STRIPE_JS_URL = "https://js.stripe.com/v3/";
const STRIPE_PRECONNECT_ORIGINS = [
  "https://js.stripe.com",
  "https://api.stripe.com",
];
const PREPARED_TTL_MS = 60_000;

export type PrismClientConfig = {
  enabled: true;
  apiBase: string;
  moduleUrl: string;
};

export type PrismSdkState = {
  busy: boolean;
  pending: boolean;
  completed: boolean;
  ready: boolean;
};

export type PrismQuoteData = {
  amount_minor?: number;
  subtotal_minor?: number;
  discount_minor?: number;
  shipping_minor?: number;
  tax_minor?: number;
};

export type PrismOrderReceipt = {
  order_number?: string;
  id?: string;
};

export type Payload = Record<string, unknown>;

export type Transport = {
  bootstrap(extra?: Payload): Promise<Payload>;
  post(action: string, fields?: Payload): Promise<Payload>;
};

export type CheckoutSdk = {
  createTransport(
    base: string,
    signal?: AbortSignal,
    injected?: unknown,
    auth?: { getToken: () => Promise<string | null> },
  ): Transport;
  mountPrismCheckout(
    node: HTMLElement,
    options: {
      apiBase: string;
      appearance: "dark" | "light";
      transport: Transport;
      auth?: { getToken: () => Promise<string | null> };
      hostForm: {
        readFields(): Record<string, string>;
        writeFields(fields: Record<string, string>): void;
        validate(): boolean;
        onState(state: PrismSdkState): void;
        onQuote?(quote: PrismQuoteData): void;
        onComplete(order: PrismOrderReceipt): void;
      };
    },
  ): { submit(): Promise<void>; refresh(): Promise<void>; destroy(): void };
};

export type PreparedCardBootstrap = {
  sdk: CheckoutSdk;
  rawApi: Transport;
  boot: Payload;
  saved: Payload;
  initialCart: Payload | null;
  initialQuote: Payload | null;
  alreadyPending: boolean;
};

let cachedModuleUrl = "";
let checkoutModulePromise: Promise<CheckoutSdk> | null = null;
let stripeScriptPromise: Promise<void> | null = null;
let preparedEntry: {
  key: string;
  expiresAt: number;
  promise: Promise<PreparedCardBootstrap>;
} | null = null;

function ensurePreconnect(origin: string) {
  if (document.head.querySelector(`link[rel="preconnect"][href="${origin}"]`)) return;
  const link = document.createElement("link");
  link.rel = "preconnect";
  link.href = origin;
  document.head.append(link);
}

function cssPathsForModule(moduleUrl: string): string[] {
  const cleanBase = moduleUrl.replace(/\/js\/checkout\.js(?:\?.*)?$/, "");
  if (!cleanBase || cleanBase === moduleUrl) return [];
  return [
    `${cleanBase}/css/payment-tokens.css`,
    `${cleanBase}/css/native.css`,
  ];
}

function ensurePrismStylesheet(relPath: string) {
  const href = new URL(relPath, window.location.href).href;
  if (document.querySelector(`link[data-prism-style="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.dataset.prismStyle = href;
  document.head.append(link);
}

function preloadStripeScript(): Promise<void> {
  const win = window as Window & { Stripe?: unknown };
  if (win.Stripe) return Promise.resolve();
  if (stripeScriptPromise) return stripeScriptPromise;
  const existing = document.querySelector<HTMLScriptElement>(
    `script[src="${STRIPE_JS_URL}"]`,
  );
  if (existing) {
    stripeScriptPromise = new Promise((resolve) => {
      if (win.Stripe) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => {
          stripeScriptPromise = null;
          resolve();
        },
        { once: true },
      );
    });
    return stripeScriptPromise;
  }
  stripeScriptPromise = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = STRIPE_JS_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      stripeScriptPromise = null;
      script.remove();
      resolve();
    };
    document.head.append(script);
  });
  return stripeScriptPromise;
}

export function loadCheckoutModule(moduleUrl: string): Promise<CheckoutSdk> {
  if (!PRISM_SDK_PATH_RE.test(moduleUrl)) {
    return Promise.reject(
      new Error("Secure card checkout configuration could not be verified."),
    );
  }
  if (!checkoutModulePromise || cachedModuleUrl !== moduleUrl) {
    cachedModuleUrl = moduleUrl;
    checkoutModulePromise = (
      import(/* webpackIgnore: true */ moduleUrl) as Promise<CheckoutSdk>
    ).catch((err: unknown) => {
      if (cachedModuleUrl === moduleUrl) {
        checkoutModulePromise = null;
      }
      throw err;
    });
  }
  return checkoutModulePromise;
}

export function prewarmPrismCheckout(moduleUrl: string) {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (!PRISM_SDK_PATH_RE.test(moduleUrl)) return;
  for (const origin of STRIPE_PRECONNECT_ORIGINS) ensurePreconnect(origin);
  for (const stylePath of cssPathsForModule(moduleUrl)) {
    ensurePrismStylesheet(stylePath);
  }
  void preloadStripeScript();
  void loadCheckoutModule(moduleUrl).catch(() => {});
}

function splitFullName(name: string): { first: string; last: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return { first: parts[0] || "Customer", last: "" };
  }
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

export function buildPugPepCartItems(
  order: PendingOrder,
): Array<{ product_id: string; quantity: number }> {
  return order.items
    .filter((item) => Boolean(item.productOptionId))
    .map((item) => {
      const rawGroup =
        "customKitGroupId" in item && typeof item.customKitGroupId === "string"
          ? item.customKitGroupId.trim().toLowerCase()
          : "";
      const productId = rawGroup
        ? `${item.productOptionId!.toLowerCase()}__${rawGroup}`
        : item.productOptionId!.toLowerCase();
      return {
        product_id: productId,
        quantity: Math.max(1, Math.floor(Number(item.quantity || 1))),
      };
    });
}

export function buildPugPepHostFields(
  order: PendingOrder,
  termsAccepted: boolean,
): Record<string, string> {
  const { first, last } = splitFullName(order.customer.name || "");
  const state = (order.customer.state || "").trim().toUpperCase();
  const zip = (order.customer.zip || "").trim();
  const promoCode = String(order.pricingInput?.promoCode ?? order.promoCode ?? "")
    .trim()
    .toUpperCase()
    .slice(0, 40);
  const rewardPoints = Math.max(
    0,
    Math.floor(
      Number(order.pricingInput?.rewardPointsRequested ?? order.rewardPointsUsed ?? 0) ||
        0,
    ),
  );
  const smsFlag = order.smsConsent === true ? "1" : "0";
  const safeOrderNum = String(order.orderNumber || "")
    .replace(/[^A-Za-z0-9_-]/g, "")
    .slice(0, 40);
  const metaCode = `pts=${rewardPoints};sms=${smsFlag};ord=${safeOrderNum}`.slice(0, 120);
  const country = (
    order.pricingInput?.shippingAddress?.countryCode || "US"
  ).toUpperCase();

  return {
    billing_first_name: first,
    billing_last_name: last,
    billing_company: (order.customer.organization || "").trim(),
    billing_email: (order.customer.email || "").trim(),
    billing_phone: (order.customer.phone || "").trim(),
    billing_address_1: (order.customer.address || "").trim(),
    billing_address_2: "",
    billing_city: (order.customer.city || "").trim(),
    billing_state: state,
    billing_postcode: zip,
    billing_country: country,
    ship_to_different_address: "0",
    shipping_first_name: first,
    shipping_last_name: last,
    shipping_company: (order.customer.organization || "").trim(),
    shipping_address_1: (order.customer.address || "").trim(),
    shipping_address_2: "",
    shipping_city: (order.customer.city || "").trim(),
    shipping_state: state,
    shipping_postcode: zip,
    shipping_country: country,
    shipping_method: "standard",
    prism_discount_code: promoCode,
    prism_referral_code: metaCode,
    prism_terms_accepted: termsAccepted ? "1" : "0",
  };
}

export function resetPreparedPugPepCardBootstrap() {
  preparedEntry = null;
}

export function preparePugPepCardBootstrap(opts: {
  config: PrismClientConfig;
  order: PendingOrder;
  getToken: () => Promise<string | null>;
  termsAccepted: boolean;
}): Promise<PreparedCardBootstrap> {
  const items = buildPugPepCartItems(opts.order);
  if (!items.length) {
    return Promise.reject(
      new Error("Your cart has no eligible items for card checkout."),
    );
  }
  const fields = buildPugPepHostFields(opts.order, opts.termsAccepted);
  const fieldsJson = JSON.stringify(fields);
  const key = JSON.stringify({
    apiBase: opts.config.apiBase,
    moduleUrl: opts.config.moduleUrl,
    orderId: opts.order.id,
    items,
    fieldsJson,
  });

  if (preparedEntry && preparedEntry.key === key && Date.now() < preparedEntry.expiresAt) {
    return preparedEntry.promise;
  }

  prewarmPrismCheckout(opts.config.moduleUrl);

  const promise = (async (): Promise<PreparedCardBootstrap> => {
    const sdk = await loadCheckoutModule(opts.config.moduleUrl);
    const rawApi = sdk.createTransport(opts.config.apiBase, undefined, undefined, {
      getToken: opts.getToken,
    });
    const boot = await rawApi.bootstrap({
      items,
      fields: fieldsJson,
      shipping_method: "standard",
      ship_to_different_address: "0",
    });
    const saved =
      boot.native_status && typeof boot.native_status === "object"
        ? (boot.native_status as Payload)
        : await rawApi.post("psc_native_status");
    const status = String(saved.status || "idle");
    const alreadyPending =
      !["none", "idle"].includes(status) && saved.retry_allowed !== true;

    if (alreadyPending) {
      return {
        sdk,
        rawApi,
        boot,
        saved,
        initialCart: (boot.cart as Payload | undefined) ?? null,
        initialQuote: (boot.quote as Payload | undefined) ?? null,
        alreadyPending: true,
      };
    }

    if (boot.express_bootstrap && typeof boot.express_bootstrap === "object") {
      return {
        sdk,
        rawApi,
        boot,
        saved,
        initialCart: (boot.cart as Payload | undefined) ?? { items },
        initialQuote: boot.express_bootstrap as Payload,
        alreadyPending: false,
      };
    }

    const cartResult = await rawApi.post("psc_native_cart", { items });
    const initialQuote = await rawApi.post("psc_sync_wallet", {
      fields: fieldsJson,
      shipping_method: "standard",
      ship_to_different_address: "0",
    });

    return {
      sdk,
      rawApi,
      boot,
      saved,
      initialCart: (cartResult.cart as Payload | undefined) ?? null,
      initialQuote,
      alreadyPending: false,
    };
  })().catch((err) => {
    if (preparedEntry?.promise === promise) {
      preparedEntry = null;
    }
    throw err;
  });

  preparedEntry = {
    key,
    expiresAt: Date.now() + PREPARED_TTL_MS,
    promise,
  };
  return promise;
}

export function createMountHandoffTransport(opts: {
  rawApi: Transport;
  initialBoot: Payload;
  initialStatus: Payload;
  initialCart: Payload | null;
  initialQuote: Payload | null;
  editable: boolean;
}): Transport {
  const { rawApi, initialBoot, initialStatus, initialCart, initialQuote, editable } =
    opts;

  let pendingBoot: Payload | null = initialBoot.store_policy
    ? {
        ...initialBoot,
        cart: initialCart ?? initialBoot.cart,
        quote: initialQuote ?? initialBoot.quote,
      }
    : null;
  let pendingStatus: Payload | null = initialStatus;
  let pendingExpress: Payload | null =
    editable && initialQuote ? initialQuote : null;
  let bootHandled = false;

  return {
    async bootstrap(extra?: Payload) {
      if (pendingBoot !== null) {
        const result = pendingBoot;
        pendingBoot = null;
        bootHandled = true;
        return result;
      }
      if (bootHandled) {
        pendingStatus = null;
        pendingExpress = null;
      }
      bootHandled = true;
      return rawApi.bootstrap(extra);
    },
    async post(action: string, data: Payload = {}) {
      if (action === "psc_native_status" && pendingStatus !== null) {
        const result = pendingStatus;
        pendingStatus = null;
        return result;
      }
      if (action === "psc_express_bootstrap" && pendingExpress !== null) {
        const result = pendingExpress;
        pendingExpress = null;
        return result;
      }
      pendingBoot = null;
      pendingStatus = null;
      pendingExpress = null;
      return rawApi.post(action, data);
    },
  };
}
