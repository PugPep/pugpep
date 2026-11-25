import { isIP } from "node:net";
import {
  isPrismCheckoutEnabled,
  prismCheckoutHost,
  prismProxySecret,
} from "./prism-config";

const PRIVATE = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
};

const PAYMENT_ROUTES = new Set([
  "/api/prism/bootstrap",
  "/api/prism/action",
  "/api/prism/callback",
]);
const CALLBACK_HEADERS = [
  "x-psc-site",
  "x-psc-contract",
  "x-psc-timestamp",
  "x-psc-nonce",
  "x-psc-signature",
];
const ALLOWED_COOKIES = new Set([
  "__Host-prism_session",
  "__Host-ra_access",
  "__Host-prism_research_access",
]);
export const PRISM_SDK_ASSET_RE =
  /^\/prism\/0\.2\.2-candidate\.4(?:-[a-zA-Z0-9.-]+)?\/assets\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)+$/;

function disabled(): Response {
  return Response.json({ enabled: false }, { headers: PRIVATE });
}

function unavailable(): Response {
  return new Response(null, { status: 404, headers: PRIVATE });
}

function visitorIp(request: Request): string | null {
  const ip = request.headers.get("x-real-ip")?.trim() || "";
  return isIP(ip) ? ip : null;
}

export async function relayPrismCheckout(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const isConfig =
    url.pathname === "/api/prism/config" && request.method === "GET";
  const isCallback =
    url.pathname === "/api/prism/callback" && request.method === "POST";
  const isAction =
    PAYMENT_ROUTES.has(url.pathname) && request.method === "POST";
  const isAsset =
    PRISM_SDK_ASSET_RE.test(url.pathname) &&
    ["GET", "HEAD"].includes(request.method);

  if (!isConfig && !isAction && !isAsset) {
    return unavailable();
  }

  const host = prismCheckoutHost();
  const secret = prismProxySecret();
  if (!host || secret.length < 32) {
    return isConfig ? disabled() : unavailable();
  }
  if (!isCallback && !isPrismCheckoutEnabled()) {
    return isConfig ? disabled() : unavailable();
  }

  const ip = visitorIp(request);
  if (!isCallback && !ip) {
    return isConfig ? disabled() : unavailable();
  }

  const headers = new Headers();
  for (const name of [
    "content-type",
    "origin",
    "sec-fetch-site",
    "x-psc-bootstrap",
    ...(isCallback ? CALLBACK_HEADERS : []),
  ]) {
    const value = request.headers.get(name);
    if (value !== null) headers.set(name, value);
  }

  const cookies = (request.headers.get("cookie") || "")
    .split(";")
    .map((part) => part.trim())
    .filter((part) => ALLOWED_COOKIES.has(part.split("=", 1)[0] || ""));
  if (cookies.length) headers.set("cookie", cookies.join("; "));

  headers.set("x-prism-proxy", secret);
  if (ip) headers.set("x-prism-visitor-ip", ip);
  const ua = request.headers.get("user-agent")?.trim();
  if (ua && !isCallback) {
    headers.set("x-prism-visitor-agent", ua.slice(0, 512));
  }

  if (!isCallback && !isAsset && !isConfig) {
    const token = (request.headers.get("x-prism-account") || "").trim();
    if (token && token.length <= 4096 && token.split(".").length === 3) {
      headers.set("x-prism-account", token);
    }
  }

  try {
    const body = isAction ? await request.arrayBuffer() : undefined;
    const upstream = await fetch(new URL(url.pathname + url.search, host), {
      method: request.method,
      headers,
      cache: "no-store",
      redirect: "manual",
      ...(body ? { body } : {}),
    });

    if (upstream.status >= 300 && upstream.status < 400) {
      return isConfig ? disabled() : unavailable();
    }

    if (isConfig) {
      if (!upstream.ok) return disabled();
      const data = (await upstream.json().catch(() => null)) as {
        enabled?: unknown;
        apiBase?: unknown;
        moduleUrl?: unknown;
      } | null;
      if (
        !data ||
        data.enabled !== true ||
        data.apiBase !== "/api/prism" ||
        typeof data.moduleUrl !== "string" ||
        !PRISM_SDK_ASSET_RE.test(data.moduleUrl) ||
        !data.moduleUrl.endsWith("/assets/js/checkout.js")
      ) {
        return disabled();
      }
      return Response.json(
        { enabled: true, apiBase: "/api/prism", moduleUrl: data.moduleUrl },
        { headers: PRIVATE },
      );
    }

    const returned = new Headers(PRIVATE);
    const contentType = upstream.headers.get("content-type");
    if (contentType) returned.set("content-type", contentType);
    for (const cookie of upstream.headers.getSetCookie()) {
      const name = cookie.split("=", 1)[0] || "";
      if (ALLOWED_COOKIES.has(name)) returned.append("set-cookie", cookie);
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: returned,
    });
  } catch {
    return isConfig
      ? disabled()
      : Response.json(
          { success: false, data: { code: "checkout_unavailable" } },
          { status: 503, headers: PRIVATE },
        );
  }
}
