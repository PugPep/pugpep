declare module "*prism-research-access.config.mjs" {
  export const PUBLIC_ORIGIN: string;
  export const PUBLIC_ALIAS_ORIGINS: string[];
  export const PUBLIC_POLICY_PATHS: string[];
  export const PUBLIC_POLICY_PREFIX: string;
  export const PUBLIC_POLICY_HEADER: string;
  export const LOGO_ASSET_PATH: string;
  export function policySlug(path: string): string;
  const site: {
    serviceOrigin: string;
    publicOrigin: string;
    siteId?: string;
    siteSlug: string;
    browserTransport: string;
    turnstileSiteKey?: string;
    theme: "light" | "dark";
    frontDoor?: unknown;
    ingress: {
      adapter: string;
      source: string;
      verified: boolean;
      evidenceRef: string;
    };
    publicPaths: string[];
    publicAssetPaths: string[];
    serviceRoutes: Array<{
      path: string;
      method: string;
      owner: "checkout" | "host";
      anyHost?: boolean;
    }>;
    defaultPath?: string;
  };
  export default site;
}

declare module "*prism-research-access/hosts/vercel.mjs" {
  export function createResearchVercelGate(
    site: unknown,
    helpers: {
      next: (init?: { headers?: Headers }) => Response;
      middleware?: (
        request: Request,
        context?: unknown,
      ) => Promise<Response | undefined> | Response | undefined;
    },
    env?: Record<string, string | undefined>,
  ): (request: Request, context?: unknown) => Promise<Response>;
}

declare module "*prism-research-access/purchase.mjs" {
  export const REFUSED: string;
  export const DESTINATION_ONLY: string;
  export function purchaseRefusal(
    request: Request,
    destinationCountry: string,
    config: unknown,
  ): Promise<string | null>;
}
