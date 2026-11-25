import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse, type NextFetchEvent } from "next/server";

const updateSessionMock = vi.fn(async (req: NextRequest) => {
  const res = NextResponse.next({ request: req });
  res.headers.set("x-supabase-session", "refreshed");
  return res;
});

vi.mock("../lib/supabase/proxy", () => ({
  updateSession: updateSessionMock,
}));

const TEST_SITE_ID = "11111111-1111-4111-8111-111111111111";
const TEST_SECRET = "0123456789abcdef0123456789abcdef";
const TEST_SITE_KEY = `pra_k_${"0".repeat(48)}`;
const TEST_TOKEN = "a".repeat(64);
const DUMMY_EVENT = {} as NextFetchEvent;

async function loadGateSubject(decision: "allow" | "deny" = "allow") {
  vi.resetModules();
  process.env.PRA_SERVICE_ORIGIN = "https://research-access.prismpro.io";
  process.env.PRA_PUBLIC_ORIGIN = "https://pugpep.com";
  process.env.PRA_SITE_ID = TEST_SITE_ID;
  process.env.PRA_SITE_SLUG = "pugpep";
  process.env.PRA_SITE_KEY = TEST_SITE_KEY;
  process.env.PRA_COOKIE_SECRET = TEST_SECRET;
  process.env.PRA_TURNSTILE_SITE_KEY = "1x00000000000000000000AA";
  process.env.PRA_TURNSTILE_SECRET = "1x0000000000000000000000000000000AA";
  process.env.PRA_INGRESS_EVIDENCE_REF = "vercel-trusted-proxy-test";

  const guard = await import("../prism-research-access/guard.mjs");
  const session = await import("../prism-research-access/session.mjs");
  const config = await import("../prism-research-access.config.mjs");

  guard.setClientFactoryForTests(() => ({
    door: async () => ({
      html: "<!doctype html><title>Research Gate</title>",
      maxAge: 3600,
    }),
    browser: async (input: { door?: string; features?: string[] }) => ({
      kind: "page",
      status: 200,
      csp: "default-src 'self'",
      html: `<!doctype html><html lang="en"><head><title>Research Access</title></head><body><div class="pra-wrap"><main class="pra-card" id="pra-agree" data-door="${input?.door || ""}" data-features="${(input?.features || []).join(",")}"><h1>Research Access</h1><form method="post"><input type="hidden" name="_pra_action" value="agree"><button type="submit">Confirm</button><button class="pra-leave" type="submit">Cancel</button></form></main></div></body></html>`,
    }),
    action: async () => ({
      status: 200,
      headers: { "content-type": "application/json" },
      body: "{}",
    }),
    decision: async () => ({
      decision,
      maxAge: 3600,
    }),
  }));

  const { proxy } = await import("../proxy");
  return { proxy, session, config };
}

describe("PugPep PRISM Research Gate (proxy.ts)", () => {
  beforeEach(() => {
    updateSessionMock.mockClear();
  });

  it("canonicalizes known public alias domains via 308 to PUBLIC_ORIGIN", async () => {
    const { proxy } = await loadGateSubject();
    for (const alias of [
      "https://www.pugpep.com/shop?promo=LAB10",
      "https://biohackingpep.com/terms",
      "https://www.biohackingpep.com/",
    ]) {
      const req = new NextRequest(alias, {
        method: "GET",
        headers: { "x-real-ip": "203.0.113.10" },
      });
      const res = await proxy(req, DUMMY_EVENT);
      expect(res.status).toBe(308);
      const parsed = new URL(alias);
      expect(res.headers.get("location")).toBe(
        `https://pugpep.com${parsed.pathname}${parsed.search}`,
      );
      expect(updateSessionMock).not.toHaveBeenCalled();
    }
  });

  it("withholds unknown deployment hosts with 404 while preserving anyHost cron route", async () => {
    const { proxy } = await loadGateSubject();
    const blockedReq = new NextRequest("https://pugpep-preview.vercel.app/shop", {
      method: "GET",
      headers: { "x-real-ip": "203.0.113.10" },
    });
    const blockedRes = await proxy(blockedReq, DUMMY_EVENT);
    expect(blockedRes.status).toBe(404);
    expect(updateSessionMock).not.toHaveBeenCalled();

    const cronReq = new NextRequest(
      "https://pugpep-preview.vercel.app/api/cron/unpaid-orders",
      {
        method: "GET",
        headers: { "x-real-ip": "203.0.113.10" },
      },
    );
    const cronRes = await proxy(cronReq, DUMMY_EVENT);
    expect(cronRes.status).toBe(200);
    expect(updateSessionMock).not.toHaveBeenCalled();
  });

  it("allows machine serviceRoutes without Research Access cookie or updateSession", async () => {
    const { proxy } = await loadGateSubject();
    for (const servicePath of [
      "/api/prism/callback",
      "/api/tracking/webhook",
      "/api/aurpay/webhook",
    ]) {
      const req = new NextRequest(`https://pugpep.com${servicePath}`, {
        method: "POST",
        headers: { "x-real-ip": "203.0.113.10" },
      });
      const res = await proxy(req, DUMMY_EVENT);
      expect(res.status).toBe(200);
      expect(updateSessionMock).not.toHaveBeenCalled();
    }
  });

  it("denies un-admitted non-document assets and APIs with 403", async () => {
    const { proxy } = await loadGateSubject();
    for (const blockedPath of [
      "/api/analytics",
      "/_next/static/chunks/main.js",
      "/pugpep-hero-desktop.png",
    ]) {
      const req = new NextRequest(`https://pugpep.com${blockedPath}`, {
        method: "GET",
        headers: { "x-real-ip": "203.0.113.10" },
      });
      const res = await proxy(req, DUMMY_EVENT);
      expect(res.status).toBe(403);
      expect(updateSessionMock).not.toHaveBeenCalled();
    }
  });

  it("allows configured gate branding asset without admission", async () => {
    const { proxy, config } = await loadGateSubject();
    const req = new NextRequest(
      `https://pugpep.com${config.LOGO_ASSET_PATH}`,
      {
        method: "GET",
        headers: { "x-real-ip": "203.0.113.10" },
      },
    );
    const res = await proxy(req, DUMMY_EVENT);
    expect(res.status).toBe(200);
    expect(updateSessionMock).not.toHaveBeenCalled();
  });

  it("blocks direct /prism-public-policy/* requests and rewrites public policy paths safely", async () => {
    const { proxy, config } = await loadGateSubject();
    const directReq = new NextRequest(
      "https://pugpep.com/prism-public-policy/terms",
      {
        method: "GET",
        headers: {
          "x-real-ip": "203.0.113.10",
          [config.PUBLIC_POLICY_HEADER]: "/terms",
        },
      },
    );
    const directRes = await proxy(directReq, DUMMY_EVENT);
    expect(directRes.status).toBe(404);

    for (const [publicPath, expectedSlug] of [
      ["/privacy", "privacy"],
      ["/research-use", "research-use-policy"],
      ["/research-use-policy", "research-use-policy"],
      ["/sms-terms", "sms-terms"],
    ]) {
      const req = new NextRequest(`https://pugpep.com${publicPath}`, {
        method: "GET",
        headers: {
          "x-real-ip": "203.0.113.10",
          [config.PUBLIC_POLICY_HEADER]: "/spoofed",
        },
      });
      const res = await proxy(req, DUMMY_EVENT);
      expect(res.status).toBe(200);
      expect(res.headers.get("x-middleware-rewrite")).toBe(
        `https://pugpep.com/prism-public-policy/${expectedSlug}`,
      );
      expect(updateSessionMock).not.toHaveBeenCalled();
    }
  });

  it("runs updateSession only after admission on non-static routes", async () => {
    const { proxy, session } = await loadGateSubject("allow");
    const cookieHeader = (
      await session.grantCookie(TEST_SECRET, TEST_SITE_ID, TEST_TOKEN, 7200, true)
    ).split(";")[0];

    const pageReq = new NextRequest("https://pugpep.com/shop", {
      method: "GET",
      headers: {
        cookie: cookieHeader,
        "x-real-ip": "203.0.113.10",
      },
    });
    const pageRes = await proxy(pageReq, DUMMY_EVENT);
    expect(pageRes.status).toBe(200);
    expect(updateSessionMock).toHaveBeenCalledTimes(1);
    expect(pageRes.headers.get("x-supabase-session")).toBe("refreshed");
    expect(pageRes.headers.get("cache-control")).toBe(
      "private, no-store, max-age=0",
    );

    updateSessionMock.mockClear();
    const assetReq = new NextRequest(
      "https://pugpep.com/_next/static/chunks/app.js",
      {
        method: "GET",
        headers: {
          cookie: cookieHeader,
          "x-real-ip": "203.0.113.10",
        },
      },
    );
    const assetRes = await proxy(assetReq, DUMMY_EVENT);
    expect(assetRes.status).toBe(200);
    expect(updateSessionMock).not.toHaveBeenCalled();
  });

  it("renders standalone CSP-locked policy HTML only with valid internal header", async () => {
    const { config } = await loadGateSubject();
    const policyRoute = await import("../app/prism-public-policy/[slug]/route");

    const spoofedRes = await policyRoute.GET(
      new Request("https://pugpep.com/terms", { method: "GET" }),
      { params: Promise.resolve({ slug: "terms" }) },
    );
    expect(spoofedRes.status).toBe(404);

    const okRes = await policyRoute.GET(
      new Request("https://pugpep.com/research-use", {
        method: "GET",
        headers: {
          [config.PUBLIC_POLICY_HEADER]: "/research-use",
        },
      }),
      { params: Promise.resolve({ slug: "research-use-policy" }) },
    );
    expect(okRes.status).toBe(200);
    expect(okRes.headers.get("content-security-policy")).toContain("default-src 'none'");
    const html = await okRes.text();
    expect(html).toContain("Research Use Only Policy");
    expect(html).toContain(config.LOGO_ASSET_PATH);
    expect(html).not.toContain("<script");
  });

  it("serves Nov 21 2-column front door without VPN or Remember copy", async () => {
    const { proxy } = await loadGateSubject();

    const gateReq = new NextRequest("https://pugpep.com/", {
      method: "GET",
      headers: { "x-real-ip": "203.0.113.10" },
    });
    const gateRes = await proxy(gateReq, DUMMY_EVENT);
    expect(gateRes.status).toBe(200);
    const gateHtml = await gateRes.text();
    expect(gateHtml).toContain("pfd-shell");
    expect(gateHtml).toContain("PugPep");
    expect(gateHtml).toContain("support@pugpep.com");
    expect(gateHtml).toContain("Need help logging in?");
    expect(gateHtml).toContain("https://pugpep.com/research-use-policy");
    expect(gateHtml).toContain('data-door="v2"');
    expect(gateHtml).toContain('data-features=""');
    expect(gateHtml.toLowerCase()).not.toContain("remember me");
    expect(gateHtml.toLowerCase()).not.toContain("vpn");
    expect(gateHtml.toLowerCase()).not.toContain("institutional email");
  });
});
