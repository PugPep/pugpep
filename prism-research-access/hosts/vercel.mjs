// Vercel Routing Middleware host for PRISM Research Access (runs before the CDN cache).
// vercel.com/docs/routing-middleware/api (updated 2026-08-20): default export of
// middleware.(ts|js) at the project root (or the file named by vercel.json proxy.entrypoint);
// it runs for EVERY route unless a matcher narrows it — do not add a matcher that skips
// private bundles, images, data or APIs. Returning a Response ends the request; returning
// nothing or next() from @vercel/functions continues, and next({ headers }) sets response
// headers (a Headers object is accepted; @vercel/functions 3.9.9 copies it with new Headers()).
// Next.js 16 uses proxy.ts (Node.js runtime): pass { next: init => NextResponse.next(init) }.
import { publicResearchResponse, researchOutcome, validateResearchConfig } from '../guard.mjs';
import { ingressReader } from '../ingress.mjs';
import { notice } from '../routes.mjs';

const PRIVATE = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Robots-Tag': 'noindex, nofollow' };

/**
 * @param {object} site  non-secret prism-research-access.config.mjs (origins, siteId, siteSlug, ingress, paths, serviceRoutes)
 * @param {{next: Function, middleware?: Function}} helpers  next from @vercel/functions (or the Next.js
 *   equivalent); middleware is the project's existing Routing Middleware, run only after the gate passes
 * @param {Record<string,string|undefined>} env  server environment; private keys are read only here
 */
export function createResearchVercelGate(site, { next, middleware }, env = process.env) {
  let config;
  const load = () => config ||= validateResearchConfig({ ...site,
    siteKey: env.PRA_SITE_KEY, cookieSecret: env.PRA_COOKIE_SECRET, turnstileSecret: env.PRA_TURNSTILE_SECRET, getIngress: ingressReader(site.ingress) });
  return async function researchAccess(request, context) {
    const policy = publicResearchResponse(request, site);
    if (policy) return policy;
    let outcome;
    // Misconfiguration withholds everything rather than exposing the site.
    try { outcome = await researchOutcome(request, load()); }
    catch { return notice(503, 'Access is temporarily unavailable. Please try again shortly.', { 'Retry-After': '60' }, site, request); }
    if (outcome.response) return outcome.response;
    const response = middleware ? await middleware(request, context) : undefined;
    if (outcome.pass !== 'research') return response || next();
    // An admitted response must never be cached and replayed to a browser without a grant.
    // Append the renewal so every cookie the application middleware set is kept.
    const headers = new Headers(response?.headers);
    for (const [name, value] of Object.entries(PRIVATE)) headers.set(name, value);
    if (outcome.setCookie) headers.append('Set-Cookie', outcome.setCookie);
    return response ? new Response(response.body, { status: response.status, statusText: response.statusText, headers }) : next({ headers });
  };
}
