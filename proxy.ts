import { NextRequest, NextResponse, type NextFetchEvent } from "next/server";
import site, {
  PUBLIC_ALIAS_ORIGINS,
  PUBLIC_ORIGIN,
  PUBLIC_POLICY_HEADER,
  PUBLIC_POLICY_PREFIX,
  policySlug,
} from "./prism-research-access.config.mjs";
import { createResearchVercelGate } from "./prism-research-access/hosts/vercel.mjs";
import { updateSession } from "./lib/supabase/proxy";

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow",
};

const STATIC_SKIP_PREFIXES = ["/_next/static/", "/_next/image/", "/favicon.ico"];
const STATIC_SKIP_EXT = /\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp4|woff|woff2)$/i;

function trimPath(value: string): string {
  return value.length > 1 ? value.replace(/\/+$/, "") : value;
}

function isAnyHostRoute(pathname: string, method: string): boolean {
  const clean = trimPath(pathname);
  return site.serviceRoutes.some(
    (route) =>
      route.anyHost === true &&
      route.owner === "host" &&
      trimPath(route.path) === clean &&
      route.method === method,
  );
}

function isServiceOrPublicAsset(pathname: string, method: string): boolean {
  if (
    ["GET", "HEAD"].includes(method) &&
    site.publicAssetPaths.includes(pathname)
  ) {
    return true;
  }
  const clean = trimPath(pathname);
  return site.serviceRoutes.some(
    (route) => trimPath(route.path) === clean && route.method === method,
  );
}

function shouldSkipSessionRefresh(pathname: string): boolean {
  if (pathname.startsWith("/api/prism/") || pathname.startsWith("/prism/")) {
    return true;
  }
  if (STATIC_SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }
  return STATIC_SKIP_EXT.test(pathname);
}

async function pugpepAfterGate(
  request: NextRequest,
): Promise<Response | undefined> {
  const path = request.nextUrl.pathname;
  const slug = policySlug(path);

  if (
    slug &&
    request.nextUrl.origin === PUBLIC_ORIGIN &&
    (request.method === "GET" || request.method === "HEAD")
  ) {
    const destination = request.nextUrl.clone();
    destination.pathname = `${PUBLIC_POLICY_PREFIX}/${slug}`;
    destination.search = "";
    const headers = new Headers(request.headers);
    headers.set(PUBLIC_POLICY_HEADER, path);
    const policy = NextResponse.rewrite(destination, { request: { headers } });
    policy.headers.set("Cache-Control", "private, no-store, max-age=0");
    policy.headers.set("CDN-Cache-Control", "no-store");
    policy.headers.set("Vercel-CDN-Cache-Control", "no-store");
    return policy;
  }

  if (isServiceOrPublicAsset(path, request.method)) {
    return undefined;
  }

  if (shouldSkipSessionRefresh(path)) {
    return undefined;
  }

  return updateSession(request);
}

const gate = createResearchVercelGate(site, {
  next: (init?: Parameters<typeof NextResponse.next>[0]) =>
    NextResponse.next(init),
  middleware: (req: Request) => pugpepAfterGate(req as NextRequest),
});

export async function proxy(
  request: NextRequest,
  event: NextFetchEvent,
): Promise<Response> {
  const url = request.nextUrl;
  const path = url.pathname;

  if (
    path === PUBLIC_POLICY_PREFIX ||
    path.startsWith(`${PUBLIC_POLICY_PREFIX}/`)
  ) {
    return new Response("Not found", { status: 404, headers: PRIVATE_HEADERS });
  }

  if (
    PUBLIC_ALIAS_ORIGINS.includes(url.origin) &&
    url.origin !== PUBLIC_ORIGIN &&
    (request.method === "GET" || request.method === "HEAD") &&
    !isAnyHostRoute(path, request.method)
  ) {
    const target = new URL(`${path}${url.search}`, PUBLIC_ORIGIN);
    const redirect = NextResponse.redirect(target, 308);
    for (const [name, value] of Object.entries(PRIVATE_HEADERS)) {
      redirect.headers.set(name, value);
    }
    return redirect;
  }

  let incoming: NextRequest = request;
  if (request.headers.has(PUBLIC_POLICY_HEADER)) {
    const headers = new Headers(request.headers);
    headers.delete(PUBLIC_POLICY_HEADER);
    incoming = new NextRequest(request, { headers });
  }

  const response = await gate(incoming, event);
  const location = response.headers.get("Location");
  if (location && location.startsWith("/")) {
    const headers = new Headers(response.headers);
    headers.set("Location", new URL(location, request.url).toString());
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }
  return response;
}
