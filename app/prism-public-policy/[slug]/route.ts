import {
  getPublicPolicy,
  renderPublicPolicyHtml,
} from "../../../lib/prism-public-policies";
import {
  PUBLIC_ORIGIN,
  PUBLIC_POLICY_HEADER,
  PUBLIC_POLICY_PREFIX,
  policySlug,
} from "../../../prism-research-access.config.mjs";

export const dynamic = "force-dynamic";

const HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "private, no-store, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "same-origin",
  "Content-Security-Policy":
    "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'",
};

async function handler(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const url = new URL(request.url);
  const publicPath = request.headers.get(PUBLIC_POLICY_HEADER) || "";
  const entry = getPublicPolicy(slug);

  if (
    !entry ||
    !["GET", "HEAD"].includes(request.method) ||
    url.origin !== PUBLIC_ORIGIN ||
    policySlug(publicPath) !== slug ||
    (url.pathname !== publicPath &&
      url.pathname !== `${PUBLIC_POLICY_PREFIX}/${slug}`)
  ) {
    return new Response(request.method === "HEAD" ? null : "Not found", {
      status: 404,
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }

  const html = renderPublicPolicyHtml(entry);
  return new Response(request.method === "HEAD" ? null : html, {
    status: 200,
    headers: HEADERS,
  });
}

export const GET = handler;
export const HEAD = handler;
