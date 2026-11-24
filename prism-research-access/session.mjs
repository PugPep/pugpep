// PRISM Research Access — remembered-browser cookie for native (Fetch/Web Crypto) hosts.
// Same signed format and context as the WordPress edition:
//   g1.<grant token>.<expiry>.<renew>.<HMAC-SHA256(cookieSecret, "pra|v1|g|<site_id>|<token>|<expiry>|<renew>")>
// `renew` is the visitor's Remember me choice (1/0), inside the signed message. A four-part value issued
// before Remember me (`g1.<token>.<expiry>.<HMAC of "pra|v1|g|<site_id>|<token>|<expiry>">`) stays valid and counts as remembered.
// The token is an opaque 32-byte grant from the central service. It carries no permission
// (every protected request asks the service), is HttpOnly, and never reaches client JavaScript.
export const COOKIE = '__Host-ra_access';
// Read only, so a browser admitted before the rename stays admitted; never set (routes.mjs expires it after a click).
export const LEGACY_COOKIE = '__Host-prism_research_access';
export const TOKEN = /^[0-9a-f]{64}$/;

const encoder = new TextEncoder();
const hex = bytes => [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
const unhex = text => new Uint8Array(text.match(/../g).map(pair => parseInt(pair, 16)));

function key(secret) {
  // An empty or short key makes the HMAC publicly computable: verify nothing rather than verify weakly.
  if (typeof secret !== 'string' || secret.length < 32) throw new Error('pra_cookie_secret_unusable');
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
// flag undefined = the four-part message of a cookie issued before Remember me.
const message = (siteId, token, expiry, flag) => encoder.encode(`pra|v1|g|${siteId}|${token}|${expiry}` + (flag === undefined ? '' : `|${flag}`));
const attributes = maxAge => `Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`; // __Host-: no Domain

/** Set-Cookie value for a grant the service issued (exchange) or renewed (decision); renew = Remember me, required
 * so no caller issues a remembered cookie by omission. */
export async function grantCookie(secret, siteId, token, maxAge, renew) {
  if (!TOKEN.test(token) || !Number.isInteger(maxAge) || maxAge < 1 || typeof renew !== 'boolean') throw new Error('pra_grant_invalid');
  const expiry = Math.floor(Date.now() / 1000) + maxAge, flag = renew ? '1' : '0';
  const signature = hex(await crypto.subtle.sign('HMAC', await key(secret), message(siteId, token, expiry, flag)));
  return `${COOKIE}=g1.${token}.${expiry}.${flag}.${signature}; ${attributes(maxAge)}`;
}

export const clearGrantCookie = () => `${COOKIE}=; ${attributes(0)}`;

/** @returns {Promise<{token: string, expiry: number, renew: boolean} | null>} a signature-valid, unexpired grant for this site. */
export async function readGrant(request, secret, siteId) {
  const sent = (request.headers.get('cookie') || '').split(';').map(part => part.trim());
  const name = [COOKIE, LEGACY_COOKIE].find(name => sent.some(part => part.startsWith(name + '=')));
  if (!name) return null;
  const parts = sent.find(part => part.startsWith(name + '=')).slice(name.length + 1).split('.');
  if (![4, 5].includes(parts.length) || parts[0] !== 'g1') return null;
  const [, token, expiry] = parts, signature = parts.at(-1), flag = parts.length === 5 ? parts[3] : undefined;
  if (!TOKEN.test(token) || !/^\d{1,12}$/.test(expiry) || Number(expiry) < Date.now() / 1000 || !/^[0-9a-f]{64}$/.test(signature)
    || (flag !== undefined && !['0', '1'].includes(flag))) return null;
  // subtle.verify compares in constant time. Four parts = issued before Remember me: counts as remembered.
  return await crypto.subtle.verify('HMAC', await key(secret), unhex(signature), message(siteId, token, expiry, flag))
    ? { token, expiry: Number(expiry), renew: flag !== '0' } : null;
}
