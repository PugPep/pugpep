// First-party Research Access browser transport. Interactive HTML is produced by the
// paired policy service and returned at the requested client URL, before host rendering.
// Only the dedicated flow token and allowlisted fields cross the server boundary.
import { grantCookie, clearGrantCookie, readGrant, LEGACY_COOKIE } from './session.mjs';

export const ENTRY_PATH = '/research-entry'; // legacy links return to a local document
export const RETURN_PATH = '/research-return'; // retained for existing one-use handoffs
export const FORGET_PATH = '/research-forget';
export const TERMS_PATH = '/privacy-policy-terms-of-use'; // client-domain public terms: any visitor, indexable, no flow
export const FLOW_COOKIE = '__Host-ra_flow';
export const LEGACY_FLOW_COOKIE = '__Host-prism_research_flow'; // read only; never set
// The visitor's Remember me choice (1/0), held only between the door click and the exchange that follows it.
const KEEP_COOKIE = '__Host-ra_keep';
const DAY = 86400; // an unticked browser's access lasts at most this long and is never renewed
const DOOR = { door: 'v2', features: ['remember'] }; // the service shows the Remember me control only to an adapter declaring it
const FLOW = /^v1\.[A-Za-z0-9_-]+\.\d{1,12}\.[0-9a-f]{64}$/;
const CODE = /^[0-9a-f]{64}$/;
const PRIVATE = { 'Cache-Control': 'private, no-store, max-age=0', 'Referrer-Policy': 'same-origin', 'X-Robots-Tag': 'noindex, nofollow', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY' };
const UNAVAILABLE = 'Access is temporarily unavailable. Please try again shortly.';
const FIELDS = { agree: ['csrf', 'agreement_id', 'statement'], email: ['csrf', 'email'], code: ['csrf', 'code'], cancel: ['csrf'] };

export const trim = path => path.length > 1 ? path.replace(/\/+$/, '') : path;
const redirect = (location, cookies = [], status = 303) => {
  const headers = new Headers({ ...PRIVATE, Location: location });
  for (const cookie of cookies) headers.append('Set-Cookie', cookie);
  return new Response(null, { status, headers });
};
const flowCookie = (token = '', maxAge = 0) => `${FLOW_COOKIE}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
const keepCookie = (value = '', maxAge = 0) => `${KEEP_COOKIE}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
const sentCookies = request => (request.headers.get('cookie') || '').split(';').map(part => part.trim());
// Old names are expired only on the responses a human reaches by clicking (exchange, leave, forget), and only
// when this request carried them: the door a crawler sees never prints an old name.
const clearLegacy = (request, ...names) => names.filter(name => sentCookies(request).some(part => part.startsWith(name + '=')))
  .map(name => `${name}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);
const readKeep = request => sentCookies(request).find(part => part.startsWith(KEEP_COOKIE + '='))?.slice(KEEP_COOKIE.length + 1);
const clearKeep = request => readKeep(request) === undefined ? [] : [keepCookie()]; // only when the request carried one
/** Cookies for a successful exchange. Remembered = the service lifetime, renewed as the visitor browses; otherwise
 * at most a day, never renewed. The choice: this request's door click, else the keep cookie a click left (consumed
 * here), else the setting of a valid access cookie the browser already holds (never an upgrade), else `otherwise`. */
const admit = async (request, config, exchanged, posted, otherwise) => {
  const keep = readKeep(request);
  const held = posted === undefined && keep === undefined ? await readGrant(request, config.cookieSecret, config.siteId) : null;
  const remember = posted ?? (keep !== undefined ? keep === '1' : held ? held.renew : otherwise);
  // Unticked inherited from a held cookie (no fresh choice): never outlive it, so silent handoffs cannot extend it.
  // With nothing left, no access cookie: the browser sees the door next time.
  const maxAge = remember ? exchanged.maxAge : Math.min(exchanged.maxAge, DAY, held ? held.expiry - Math.floor(Date.now() / 1000) : DAY);
  return [...(maxAge >= 1 ? [await grantCookie(config.cookieSecret, config.siteId, exchanged.token, maxAge, remember)] : []),
    flowCookie(), ...clearKeep(request), ...clearLegacy(request, LEGACY_COOKIE, LEGACY_FLOW_COOKIE)];
};
const sha256 = async text => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))].map(byte => byte.toString(16).padStart(2, '0')).join('');

/** Neutral fixed-appearance first-party notice; no detection details or invented branding. */
export const notice = (status, text, extra = {}, theme = 'light') => new Response(
  `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Access</title><style>:root{color-scheme:${theme === 'dark' ? 'dark' : 'light'}}body{margin:0;min-height:100svh;display:grid;place-content:center;padding:24px;font:15px/1.6 -apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;background:${theme === 'dark' ? '#10151d' : '#f4f6f9'};color:${theme === 'dark' ? '#f0f3f8' : '#1a263a'}}main{max-width:440px}a{color:inherit}</style><main><p>${text}</p><p><a href="/">Return to the home page</a></p></main></html>`,
  { status, headers: { ...PRIVATE, 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'", ...extra } });
const unavailable = config => notice(503, UNAVAILABLE, { 'Retry-After': '30' }, config.theme);

/** Same-origin path + query only; remove only gate controls, preserving host parameters. */
export function safeDestination(raw, config) {
  if (typeof raw !== 'string' || !raw || raw.length > 2048 || !raw.startsWith('/') || raw.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(raw)) return '';
  let url;
  try { url = new URL(raw, config.publicOrigin); } catch { return ''; }
  if (url.origin !== config.publicOrigin || url.username || url.password || /%2f|%5c|%00/i.test(url.pathname)) return '';
  if ([ENTRY_PATH, RETURN_PATH, FORGET_PATH, TERMS_PATH].includes(trim(url.pathname))) return '';
  if (url.searchParams.has('_pra_action')) url.searchParams.delete('agreement');
  url.searchParams.delete('_pra_action');
  return url.pathname + url.search;
}
const home = config => safeDestination(config.defaultPath || '/', config) || '/';

function readFlow(request) {
  const sent = sentCookies(request);
  const name = [FLOW_COOKIE, LEGACY_FLOW_COOKIE].find(name => sent.some(part => part.startsWith(name + '=')));
  const matches = name ? sent.filter(part => part.startsWith(name + '=')) : [];
  if (matches.length !== 1) return undefined;
  const token = matches[0].slice(name.length + 1);
  return token.length <= 2048 && FLOW.test(token) ? token : undefined;
}

/** Bound parsing: ordinary host POSTs remain available only after admission. */
export async function readBrowserAction(request) {
  const url = new URL(request.url);
  if (request.method === 'GET') {
    const operation = url.searchParams.get('_pra_action');
    if (operation === 'terms') return { operation, form: { agreement_id: url.searchParams.get('agreement') || '' } };
    if (operation === 'email') return { operation };
    return null;
  }
  if (request.method !== 'POST' || (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase() !== 'application/x-www-form-urlencoded') return null;
  if (Number(request.headers.get('content-length')) > 16384) return null;
  const reader = request.clone().body?.getReader();
  if (!reader) return null;
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16384) { void reader.cancel(); return null; }
      chunks.push(value);
    }
  } catch { return null; }
  const bytes = new Uint8Array(size); let at = 0;
  for (const chunk of chunks) { bytes.set(chunk, at); at += chunk.byteLength; }
  const params = new URLSearchParams(new TextDecoder().decode(bytes));
  const actions = params.getAll('_pra_action');
  if (actions.length !== 1 || !Object.hasOwn(FIELDS, actions[0])) return null;
  const operation = actions[0], form = {};
  for (const name of FIELDS[operation]) {
    if (name === 'statement') {
      const values = [...params.getAll('statement[]'), ...params.getAll('statement')];
      if (values.length > 24 || values.some(value => value.length > 128)) return { invalid: true };
      form.statement = values;
    } else {
      const values = params.getAll(name);
      if (values.length > 1 || (values[0] || '').length > 512) return { invalid: true };
      form[name] = values[0] || '';
    }
  }
  const tokens = params.getAll('cf-turnstile-response');
  if (tokens.length > 1 || (tokens[0] || '').length > 2048) return { invalid: true };
  // Remember me is read on the door click only and kept here: it is never in `form` (the service refuses undeclared fields).
  return { operation, form, botToken: tokens[0] || '', ...(operation === 'agree' ? { remember: params.get('remember') === '1' } : {}) };
}

/** Real Siteverify with the matching widget secret, exact host/action and visitor address.
 * https://developers.cloudflare.com/turnstile/get-started/server-side-validation/ */
async function botProof(config, network, flow, action, token) {
  const response = await (config.fetch || fetch)('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(8000),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret: config.turnstileSecret, response: token, remoteip: network.visitor_ip }),
  });
  if (!response.ok) throw new Error('pra_bot_unavailable');
  const value = await response.json();
  const hostname = new URL(config.publicOrigin).hostname;
  const age = Date.now() - Date.parse(value.challenge_ts);
  if (value.success !== true || value.hostname !== hostname || value.action !== action || !Number.isFinite(age) || age < -60000 || age > 300000) return null;
  return { flow_token_sha256: await sha256(flow), action, hostname, token_sha256: await sha256(token), verified_at: new Date().toISOString() };
}

/** Return only gate HTML at this document URL; a successful exchange alone grants access. */
export async function handleBrowser(request, config, client, action = { operation: 'open' }) {
  if (action.invalid) return notice(400, 'This request was refused.', {}, config.theme);
  const url = new URL(request.url);
  const returnPath = safeDestination(url.pathname + url.search, config);
  if (!returnPath) return notice(400, 'This link is unavailable.', {}, config.theme);
  const flow = readFlow(request);
  // Door v2: the agreement screen carries a signed ticket (its csrf) and no flow, so only the
  // checkbox click and cancel may arrive flowless; the service validates the ticket.
  const ticketPost = request.method === 'POST' && !flow && ['agree', 'cancel'].includes(action.operation);
  if (request.method === 'POST' && (request.headers.get('origin') !== config.publicOrigin || (!flow && !ticketPost))) return notice(403, 'This request was refused.', {}, config.theme);
  let network;
  try { network = await config.getIngress(request); } catch { return unavailable(config); }
  const grant = await readGrant(request, config.cookieSecret, config.siteId);
  const input = { operation: action.operation, return_path: returnPath, ...DOOR,
    ...(flow ? { flow_token: flow } : {}), ...(grant ? { grant_token: grant.token } : {}),
    ...(request.method === 'POST' ? { browser_origin: request.headers.get('origin') } : {}),
    ...(action.form ? { form: action.form } : {}) };
  if (['agree', 'email'].includes(action.operation) && action.botToken) {
    try {
      // A signed door ticket (the v1. format) as csrf binds the proof to the ticket, even beside a stale
      // flow cookie; a live flow's csrf is its 64-hex binding, which binds to the flow cookie.
      const bound = FLOW.test(String(action.form?.csrf || '')) ? String(action.form.csrf) : flow;
      const proof = await botProof(config, network, bound, action.operation === 'agree' ? 'pra_accept' : 'pra_email', action.botToken);
      if (!proof) return notice(400, 'Complete the verification and try again.', {}, config.theme);
      input.bot_proof = proof;
    } catch { return unavailable(config); }
  }
  let output = await client.browser(input, network);
  // A changed connection at the one-use exchange may require another screen. Re-open
  // once using this same first-party flow; never expose its central continuation URL.
  for (let attempt = 0; attempt < 2; attempt++) {
    if (output.kind === 'page') {
      const headers = new Headers({ ...PRIVATE, 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': output.csp,
        'Permissions-Policy': 'geolocation=(), camera=(), microphone=()' });
      // The site front door (path "/") is the one gated document search engines may list by brand name;
      // it never contains catalog content. Every other path keeps the noindex header.
      if (request.method === 'GET' && ['/', TERMS_PATH].includes(trim(url.pathname))) headers.delete('X-Robots-Tag');
      if (output.flow_token) headers.append('Set-Cookie', flowCookie(output.flow_token, output.flow_max_age));
      // The email and code steps may come between the door click and the exchange: the choice waits beside the flow.
      if (action.remember !== undefined) headers.append('Set-Cookie', keepCookie(action.remember ? '1' : '0', output.flow_token ? output.flow_max_age : 1200));
      return new Response(output.html, { status: output.status, headers });
    }
    if (output.kind === 'leave') return redirect(output.url, [flowCookie(), ...clearKeep(request), ...clearLegacy(request, LEGACY_FLOW_COOKIE)]);
    if (output.kind !== 'handoff') return unavailable(config);
    const exchanged = await client.exchange(output.code, network);
    if (exchanged?.ok) {
      const destination = safeDestination(exchanged.returnPath, config);
      if (!destination) return unavailable(config);
      // No recorded choice and no access cookie already held counts as unticked here.
      return redirect(destination, await admit(request, config, exchanged, action.remember, false));
    }
    // A click that created its flow in this call has no flow cookie: re-open flowless (the door screen).
    if (!exchanged?.continue || attempt > 0) return unavailable(config);
    output = await client.browser({ operation: 'open', return_path: returnPath, ...DOOR, ...(flow ? { flow_token: flow } : {}), ...(grant ? { grant_token: grant.token } : {}) }, network);
  }
  return unavailable(config);
}

/** The client-domain public page: answered for every visitor, indexable, no flow. */
export async function handlePublicTerms(request, config, client) {
  let network;
  try { network = await config.getIngress(request); } catch { return unavailable(config); }
  const output = await client.browser({ operation: 'public_terms', return_path: '/', ...DOOR }, network);
  if (output.kind !== 'page' || output.status !== 200) return unavailable(config);
  const headers = new Headers({ ...PRIVATE, 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': output.csp });
  headers.delete('X-Robots-Tag');
  return new Response(request.method === 'HEAD' ? null : output.html, { status: 200, headers });
}

/** Older entrance links only return to a normal client document; no shared-host fallback. */
export async function handleEntry(request, config) {
  if (!['GET', 'HEAD'].includes(request.method)) return notice(405, 'This link is unavailable.', { Allow: 'GET, HEAD' }, config.theme);
  return redirect(safeDestination(new URL(request.url).searchParams.get('return') || '', config) || home(config));
}

/** Compatibility for outstanding pre-migration handoffs; continuations stay local. */
export async function handleReturn(request, config, client) {
  if (request.method !== 'GET') return notice(405, 'This link is unavailable.', { Allow: 'GET' }, config.theme);
  const code = new URL(request.url).searchParams.get('code') || '';
  const restart = () => notice(400, 'This entry link is no longer valid. Please start again from the home page.', {}, config.theme);
  if (!CODE.test(code)) return restart();
  let network;
  try { network = await config.getIngress(request); } catch { return unavailable(config); }
  const exchanged = await client.exchange(code, network);
  if (!exchanged) return unavailable(config);
  if (exchanged.continue) return redirect(home(config));
  if (!exchanged.ok) return restart();
  // The service-hosted entrance never offers Remember me: with no keep cookie and no access cookie held, remembered.
  return redirect(safeDestination(exchanged.returnPath, config) || home(config), await admit(request, config, exchanged, undefined, true));
}

/** Same-origin POST revokes only this browser's grant and clears both local cookies. */
export async function handleForget(request, config, client) {
  if (request.method !== 'POST') return notice(405, 'This link is unavailable.', { Allow: 'POST' }, config.theme);
  if (request.headers.get('origin') !== config.publicOrigin) return notice(403, 'This request was refused.', {}, config.theme);
  const grant = await readGrant(request, config.cookieSecret, config.siteId);
  if (grant) await client.revoke(grant.token);
  return redirect('/', [clearGrantCookie(), flowCookie(), ...clearKeep(request), ...clearLegacy(request, LEGACY_COOKIE, LEGACY_FLOW_COOKIE)]);
}
