// PRISM Research Access — private-by-default request guard for Fetch-standard hosts.
// Order is the contract:
//   1 canonical path + exact public origin     2 exact Research Access endpoints (+ public terms, GET/HEAD)
//   3 exact public paths/assets (GET/HEAD)      4 exact self-authenticating service routes
//   5 signed grant cookie  6 verified ingress   7 fresh central decision   8 allow or withhold
// An error anywhere below step 4 withholds content; it never passes through. No crawler,
// user-agent or IP exemption. Nothing here is a browser overlay.
import { researchClient, SITE_KEY } from './client.mjs';
import { readGrant, grantCookie } from './session.mjs';
import { joshSettings } from './josh-compat.mjs';
import { joshPolicyResponse } from './josh-policies.mjs';
import { ENTRY_PATH, RETURN_PATH, FORGET_PATH, TERMS_PATH, trim, notice, handleEntry, handleReturn, handleForget, handlePublicTerms, readBrowserAction, handleBrowser } from './routes.mjs';

const PRIVATE = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Robots-Tag': 'noindex, nofollow' };
const deny = (status, extra = {}) => new Response(JSON.stringify({ error: 'access_required' }),
  { status, headers: { ...PRIVATE, 'Content-Type': 'application/json', ...extra } });
const wantsDocument = request => request.method === 'GET' && (request.headers.get('sec-fetch-dest') === 'document'
  || (!request.headers.get('sec-fetch-dest') && (request.headers.get('accept') || '').includes('text/html'))
  // The site front door (exactly "/") is always a document: crawlers and link previewers that send
  // Accept: */* receive the gate page, never the JSON denial. It can only ever carry the gate.
  || trim(new URL(request.url).pathname) === '/');

export function validateResearchConfig(config) {
  const fail = reason => { throw new Error('pra_config_invalid: ' + reason); };
  for (const name of ['serviceOrigin', 'publicOrigin']) {
    let url; try { url = new URL(config[name]); } catch {}
    if (!url || url.protocol !== 'https:' || url.origin !== config[name]) fail(name);
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(config.siteId || '')) fail('siteId');
  if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(config.siteSlug || '')) fail('siteSlug');
  if (!SITE_KEY.test(config.siteKey || '')) fail('siteKey');
  if (typeof config.cookieSecret !== 'string' || config.cookieSecret.length < 32) fail('cookieSecret');
  if (config.browserTransport !== 'same-origin-v1') fail('browserTransport');
  if (typeof config.turnstileSiteKey !== 'string' || !/^[A-Za-z0-9_-]{10,256}$/.test(config.turnstileSiteKey)) fail('turnstileSiteKey');
  if (typeof config.turnstileSecret !== 'string' || !/^[A-Za-z0-9_-]{20,256}$/.test(config.turnstileSecret)) fail('turnstileSecret');
  if (!['light', 'dark'].includes(config.theme)) fail('theme');
  if (typeof config.getIngress !== 'function') fail('getIngress');
  const path = value => typeof value === 'string' && value.startsWith('/') && !value.includes('..') && !/[\\*?#]/.test(value);
  if (config.defaultPath !== undefined && !path(config.defaultPath)) fail('defaultPath');
  if (!Array.isArray(config.publicPaths) || !config.publicPaths.every(path)) fail('publicPaths');
  // Only named public gate dependencies; never an application asset-directory bypass.
  if (!Array.isArray(config.publicAssetPaths) || !config.publicAssetPaths.every(value => path(value) && !value.endsWith('/'))) fail('publicAssetPaths');
  if (!Array.isArray(config.serviceRoutes) || !config.serviceRoutes.every(route => path(route?.path) && /^[A-Z]+$/.test(route.method || '')
    && ['checkout', 'host'].includes(route.owner))) fail('serviceRoutes');
  const reserved = [ENTRY_PATH, RETURN_PATH, FORGET_PATH, TERMS_PATH];
  if ([...config.publicPaths, ...config.serviceRoutes.map(route => route.path)].some(value => reserved.includes(trim(value)))) fail('reserved path');
  joshSettings(config); // An explicit profile must match this site's canonical origin and fixed theme.
  return config;
}

// Test seam only: a plain setter, never read from config.
let clientFactory = researchClient;
export const setClientFactoryForTests = f => { clientFactory = f; };

/** Public Josh policies precede secret-dependent validation; all other routes retain the existing guard. */
export function publicResearchResponse(request, site) {
  const settings = joshSettings(site, request);
  return settings ? joshPolicyResponse(request, settings) : null;
}

/** @returns {Promise<{response: Response} | {pass: 'public'|'service'|'research', setCookie?: string}>} */
export async function researchOutcome(request, config) {
  const url = new URL(request.url);
  if (/%2f|%5c|\\|\/\/|%00/i.test(url.pathname)) return { response: deny(400) };
  const path = trim(url.pathname), method = request.method;
  // 1. Unknown hosts (generated deployment URLs, old aliases) get nothing, not a redirect that confirms the site.
  //    Sole exception: an exact self-authenticating host route flagged anyHost (e.g. a provider cron).
  if (url.origin !== config.publicOrigin) {
    return config.serviceRoutes.some(route => route.anyHost === true && route.owner === 'host' && trim(route.path) === path && route.method === method)
      ? { pass: 'service' } : { response: deny(404) };
  }
  const policy = publicResearchResponse(request, config);
  if (policy) return { response: policy };
  const client = clientFactory(config);

  // 2. Exact Research Access endpoints.
  if (path === ENTRY_PATH) return { response: await handleEntry(request, config, client) };
  if (path === RETURN_PATH) return { response: await handleReturn(request, config, client) };
  if (path === FORGET_PATH) return { response: await handleForget(request, config, client) };
  if (path === TERMS_PATH && ['GET', 'HEAD'].includes(method)) return { response: await handlePublicTerms(request, config, client) };

  // 3. Exact public surface, read-only methods.
  if (['GET', 'HEAD'].includes(method)) {
    if (config.publicPaths.some(item => trim(item) === path)) return { pass: 'public' };
    if (config.publicAssetPaths.includes(url.pathname)) return { pass: 'public' };
  }
  // 4. Independently authenticated machine routes (signed payment callbacks); their own handler verifies them.
  if (config.serviceRoutes.some(route => trim(route.path) === path && route.method === method)) return { pass: 'service' };

  // Gate controls never reach the merchant application, even when an older grant exists.
  const browserAction = await readBrowserAction(request);
  if (browserAction) return { response: await handleBrowser(request, config, client, browserAction) };

  // 5-7. Remembered browser, provenance, fresh central decision.
  const grant = await readGrant(request, config.cookieSecret, config.siteId);
  let decision = 'none', maxAge = 0;
  // Hashed build files (styles, scripts, images) for a browser with a valid signed grant: the page
  // document already got a fresh central decision, so skip one call per file to avoid unstyled pages.
  if (grant && request.method === 'GET' && /^\/(?:assets|api\/prism-site-files)\/[^/]+$/.test(new URL(request.url).pathname)) return { pass: 'research' };
  if (grant) {
    try { ({ decision, maxAge } = await client.decision(grant.token, await config.getIngress(request))); }
    catch { decision = 'unavailable'; }
  }
  // 8.
  if (decision === 'allow') {
    // The service renews at most daily; follow its lifetime, never extend it locally.
    // Only a remembered browser renews; an unticked one keeps its one-day cookie to the end.
    const renew = grant.renew && Math.floor(Date.now() / 1000) + maxAge - grant.expiry > 3600;
    return { pass: 'research', ...(renew ? { setCookie: await grantCookie(config.cookieSecret, config.siteId, grant.token, maxAge, grant.renew) } : {}) };
  }
  if (decision === 'unavailable') return { response: wantsDocument(request)
    ? notice(503, 'Access is temporarily unavailable. Please try again shortly.', { 'Retry-After': '30' }, config, request) : deny(503, { 'Retry-After': '30' }) };
  if (!wantsDocument(request)) return { response: deny(403) };   // APIs/files: neutral private denial, no payload
  return { response: await handleBrowser(request, config, client) };
}

/** Wrap the host's real handler so admitted responses retain cache protection and renewal. */
export async function researchGate(request, config, next) {
  try {
    const policy = publicResearchResponse(request, config);
    if (policy) return policy;
    validateResearchConfig(config);
    const outcome = await researchOutcome(request, config);
    if (outcome.response) return outcome.response;
    const response = await next(request);
    if (!(response instanceof Response)) throw new TypeError('Expected a host Response');
    if (outcome.pass !== 'research') return response;
    // Clone headers: fetch/redirect responses can be immutable. Append rather than replace
    // Set-Cookie so the host's own sessions and this grant renewal are both preserved.
    const headers = new Headers(response.headers);
    for (const [name, value] of Object.entries(PRIVATE)) headers.set(name, value);
    if (outcome.setCookie) headers.append('Set-Cookie', outcome.setCookie);
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  } catch {
    return notice(503, 'Access is temporarily unavailable. Please try again shortly.', { 'Retry-After': '30' }, config, request);
  }
}
