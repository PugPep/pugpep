// Types for TypeScript hosts consuming the PRISM Research Access native modules (protocol pra-v1).
export type Ingress = { adapter: 'direct' | 'trusted_proxy' | 'managed_normalized'; version: 1; source: 'remote_addr' | 'cf_connecting_ip' | 'true_client_ip' | 'x_real_ip' };
export type SavedIngress = { adapter: Ingress['adapter']; source: Ingress['source']; verified: boolean; evidenceRef: string };
export type ServiceRoute = { path: string; method: string; owner: 'checkout' | 'host'; anyHost?: boolean };

/** Non-secret site configuration (prism-research-access.config.mjs). */
export type ResearchSite = {
  serviceOrigin: string; publicOrigin: string; siteId: string; siteSlug: string; ingress: SavedIngress;
  browserTransport: 'same-origin-v1'; // authenticated setup capability, verified before activation
  turnstileSiteKey: string; // this client's public key; matches registered brand.turnstile_sitekey
  theme: 'light' | 'dark'; // fixed installation appearance; matches registered brand.theme
  publicPaths: string[]; publicAssetPaths: string[]; serviceRoutes: ServiceRoute[]; defaultPath?: string;
};
export type ResearchConfig = ResearchSite & {
  siteKey: string;       // server secret PRA_SITE_KEY (pra_k_…)
  cookieSecret: string;  // server secret PRA_COOKIE_SECRET (≥32 chars)
  turnstileSecret: string; // matching widget server secret PRA_TURNSTILE_SECRET; never browser configuration
  getIngress(request: Request): Promise<{ visitor_ip: string; ingress: Ingress }>;
  fetch?: typeof fetch;
};
export type ResearchOutcome = { response: Response } | { pass: 'public' | 'service' | 'research'; setCookie?: string };

export declare function validateResearchConfig(config: ResearchConfig): ResearchConfig;
export declare function researchOutcome(request: Request, config: ResearchConfig): Promise<ResearchOutcome>;
/** Runs the host handler only after admission; applies private response headers and grant renewal. */
export declare function researchGate(request: Request, config: ResearchConfig,
  next: (request: Request) => Response | Promise<Response>): Promise<Response>;
/** null = allowed; otherwise the customer-facing refusal. Call at the real server order entry. */
export declare function purchaseRefusal(request: Request, destinationCountry: string, config: ResearchConfig): Promise<string | null>;
export declare function checkPurchase(request: Request, destinationCountry: string, config: ResearchConfig): Promise<boolean>;
export declare function createResearchVercelGate(site: ResearchSite, helpers: {
  next: (init?: { headers?: HeadersInit }) => Response;
  middleware?: (request: Request, context?: unknown) => Response | null | undefined | Promise<Response | null | undefined>;
}, env?: Record<string, string | undefined>): (request: Request, context?: unknown) => Promise<Response>;

/** Node HTTP/1 listener adapter; host must protect every upstream/static/alternate entry as well. */
export declare function createResearchNodeGate(site: ResearchSite,
  next: (request: import('node:http').IncomingMessage, response: import('node:http').ServerResponse) => unknown,
  env?: Record<string, string | undefined>):
  (request: import('node:http').IncomingMessage, response: import('node:http').ServerResponse) => Promise<unknown>;
/** Normalize a real Node socket peer for both admission and server purchase checks. */
export declare function nodeVisitorAddress(address?: string): string | undefined;
