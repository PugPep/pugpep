// Visitor-address provenance for native hosts. The configuration is an operator assertion
// recorded with real evidence and mirrored in the central site registration; it is never a
// value from a browser body or an arbitrary forwarded header. The central service
// re-validates that the address is a public IP and fails closed.
//
// Vercel (vercel.com/docs/headers/request-headers, updated 2025-12-13): Vercel overwrites
// X-Forwarded-For and does not forward external IPs; x-real-ip is identical. With nothing in
// front of Vercel that platform-written header is the visitor address (adapter trusted_proxy,
// source x_real_ip). A proxy/CDN in front of Vercel breaks this: record evidence for that
// chain's own header before enabling protected traffic.
const HEADERS = { cf_connecting_ip: 'cf-connecting-ip', true_client_ip: 'true-client-ip', x_real_ip: 'x-real-ip' };

export class IngressUnverified extends Error { constructor() { super('ingress_unverified'); } }

/**
 * @param {{adapter:string, source:string, verified:boolean, evidenceRef:string}} saved
 * @param {(request: Request) => string|undefined} [remoteAddress] host socket address, only for source remote_addr
 */
export function ingressReader(saved, remoteAddress) {
  const valid = saved && saved.verified === true && typeof saved.evidenceRef === 'string' && saved.evidenceRef.trim()
    && ['direct', 'trusted_proxy', 'managed_normalized'].includes(saved.adapter)
    && (saved.source === 'remote_addr' ? saved.adapter !== 'trusted_proxy' && typeof remoteAddress === 'function'
      : saved.adapter === 'trusted_proxy' && Boolean(HEADERS[saved.source]));
  // x_forwarded_for chains need a per-host trusted-hop list; no supported native host needs one, so it is refused.
  return async request => {
    if (!valid) throw new IngressUnverified();
    const raw = saved.source === 'remote_addr' ? remoteAddress(request) : request.headers.get(HEADERS[saved.source]);
    // Exactly one address: never a comma list, zone id or padded value.
    if (typeof raw !== 'string' || raw.length > 45 || !/^[0-9a-fA-F:.]{3,45}$/.test(raw)) throw new IngressUnverified();
    return { visitor_ip: raw.toLowerCase(), ingress: { adapter: saved.adapter, version: 1, source: saved.source } };
  };
}
