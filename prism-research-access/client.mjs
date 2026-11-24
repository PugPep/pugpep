// Central PRISM Research Access site protocol pra-v1 (service/RESEARCH-ACCESS-CONTRACT.md):
//   POST /research-access/v1/decision  Bearer pra_k_  {grant_token, visitor_ip, ingress}   -> {allow, decision, session_max_age}
//   POST /research-access/v1/resume    Bearer pra_k_  {grant_token, return_path, visitor_ip, ingress} -> {resume_url}
//   POST /research-access/v1/exchange  Bearer pra_k_  {code, visitor_ip, ingress}          -> {grant_token, return_path, session_max_age} | 409 continue
//   POST /research-access/v1/purchase  Bearer pra_k_  {grant_token, destination_country, visitor_ip, ingress} -> {allow}
//   POST /research-access/v1/revoke    Bearer pra_k_  {grant_token}                        -> {revoked}
//   POST /research-access/v1/pair      {pairing_code, handoff_path}                        (the code is the credential)
// Every call FAILS CLOSED: timeout (8 s), transport error, redirect or a malformed body is
// "unavailable". Decisions are only allow | entry_required | unavailable: the reason an
// entrance is needed never reaches this site. Nothing here is echoed to a browser.
import { TOKEN } from './session.mjs';

export const PRODUCT = 'prism-research-access';
export const PROTOCOL = 'pra-v1';
export const SITE_KEY = /^pra_k_[0-9a-f]{48}$/;

export function researchClient({ serviceOrigin, siteKey, siteId, fetch: fetchImpl = fetch }) {
  let origin;
  try { origin = new URL(serviceOrigin); } catch {}
  const usable = Boolean(origin) && origin.protocol === 'https:' && origin.origin === serviceOrigin;

  async function call(path, body, authenticated = true) {
    if (!usable || (authenticated && !SITE_KEY.test(siteKey || ''))) return { status: 0, value: null };
    try {
      const response = await fetchImpl(serviceOrigin + path, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(8000),
        headers: { 'Content-Type': 'application/json', ...(authenticated ? { Authorization: 'Bearer ' + siteKey } : {}) },
        body: JSON.stringify(body) });
      let value = null;
      try { value = await response.json(); } catch {}
      return { status: response.status, value: value && typeof value === 'object' && !Array.isArray(value) ? value : null };
    } catch { return { status: 0, value: null }; }
  }
  // A URL the service hands back must be this service's own entrance route, nothing else.
  const own = (url, path) => {
    try { const u = new URL(url); return u.origin === serviceOrigin && u.pathname === path && !u.username && !u.password; } catch { return false; }
  };
  const net = network => ({ visitor_ip: network.visitor_ip, ingress: network.ingress });

  return {
    /** Paired-server browser transport. The browser never contacts the service directly. */
    async browser(input, network) {
      const { status, value } = await call('/research-access/v1/browser', { ...input, ...net(network) });
      if (status !== 200 || !value) return { kind: 'unavailable', status: 503 };
      if (value.kind === 'page' && [200, 400, 403, 404, 409, 429, 503].includes(value.status)
        && typeof value.html === 'string' && value.html.length <= 262144
        && typeof value.csp === 'string' && value.csp.length > 0 && value.csp.length <= 16384 && !/[\r\n]/.test(value.csp)
        && (value.flow_token === undefined || (typeof value.flow_token === 'string' && value.flow_token.length <= 2048
          && /^v1\.[A-Za-z0-9_-]+\.\d{1,12}\.[0-9a-f]{64}$/.test(value.flow_token)
          && Number.isInteger(value.flow_max_age) && value.flow_max_age > 0 && value.flow_max_age <= 1200))) return value;
      if (value.kind === 'handoff' && /^[0-9a-f]{64}$/.test(value.code || '')) return value;
      if (value.kind === 'leave' && value.clear_flow === true && typeof value.url === 'string' && value.url.length <= 2048) {
        try { const url = new URL(value.url); if (url.protocol === 'https:' && !url.username && !url.password) return value; } catch {}
      }
      return { kind: 'unavailable', status: 503 };
    },
    /** @returns {Promise<{decision: 'allow'|'entry_required'|'unavailable', maxAge: number}>} */
    async decision(token, network) {
      const { status, value } = await call('/research-access/v1/decision', { grant_token: token, ...net(network) });
      if (status !== 200 || !value) return { decision: 'unavailable', maxAge: 0 };
      if (value.decision === 'allow') {
        return value.allow === true && Number.isInteger(value.session_max_age) && value.session_max_age > 0
          ? { decision: 'allow', maxAge: value.session_max_age } : { decision: 'unavailable', maxAge: 0 };
      }
      return { decision: value.decision === 'entry_required' ? 'entry_required' : 'unavailable', maxAge: 0 };
    },
    /** One-use re-entry URL carrying this browser's grant into a new central flow, or null. */
    async resume(token, returnPath, network) {
      const { status, value } = await call('/research-access/v1/resume', { grant_token: token, return_path: returnPath, ...net(network) });
      return status === 200 && typeof value?.resume_url === 'string' && own(value.resume_url, '/research-entry/start') ? value.resume_url : null;
    },
    /** Fresh-visitor entrance on the central service (no site-side state is created). */
    startUrl(siteSlug, returnPath) {
      const start = new URL('/research-entry/start', serviceOrigin);
      start.searchParams.set('site', siteSlug);
      start.searchParams.set('return', returnPath);
      return start.toString();
    },
    /** @returns null (unavailable) | {continue} | {ok:false} | {ok:true, token, returnPath, maxAge} */
    async exchange(code, network) {
      const { status, value } = await call('/research-access/v1/exchange', { code, ...net(network) });
      if (status === 409 && value?.error === 'continue' && own(value.continue_url, '/research-entry/continue')) return { continue: value.continue_url };
      if (status === 400) return { ok: false };
      if (status !== 200 || !value || value.product !== PRODUCT || value.protocol !== PROTOCOL || value.site_id !== siteId
        || !TOKEN.test(value.grant_token || '') || typeof value.return_path !== 'string'
        || !Number.isInteger(value.session_max_age) || value.session_max_age < 1) return null;
      return { ok: true, token: value.grant_token, returnPath: value.return_path, maxAge: value.session_max_age };
    },
    /** @returns {Promise<boolean|null>} null = unavailable (refuse the order). */
    async purchase(token, destinationCountry, network) {
      const { status, value } = await call('/research-access/v1/purchase', { grant_token: token, destination_country: destinationCountry, ...net(network) });
      return status === 200 && typeof value?.allow === 'boolean' ? value.allow : null;
    },
    async revoke(token) { await call('/research-access/v1/revoke', { grant_token: token }); },
    /** Installer only: the one-use pairing code is the credential, so this call is unauthenticated. */
    async pair(pairingCode, handoffPath) {
      const { status, value } = await call('/research-access/v1/pair', { pairing_code: pairingCode, handoff_path: handoffPath }, false);
      return status === 200 && value?.product === PRODUCT && value?.protocol === PROTOCOL && SITE_KEY.test(value?.site_key || '') ? value : null;
    },
  };
}
