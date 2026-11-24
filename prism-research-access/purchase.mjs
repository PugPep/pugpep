// PRISM Research Access — purchase rule for native hosts. Call it at the REAL server-side
// order/payment-creation entry with the canonical order destination (shipping country; billing
// country only when nothing ships). Browser-supplied eligibility is never an input. The
// central purchase scope decides the rest: `unconfirmed` refuses every order. No payment-rail,
// fee, Stripe account or checkout-screen changes.
import { researchClient } from './client.mjs';
import { readGrant } from './session.mjs';

export const REFUSED = 'We’re unable to complete this order. Please contact support.';
export const DESTINATION_ONLY = 'Orders can only be shipped to the United States or Canada.';

/** @returns {Promise<string|null>} null = allowed; otherwise the customer-facing refusal. */
export async function purchaseRefusal(request, destinationCountry, config) {
  const country = typeof destinationCountry === 'string' ? destinationCountry.trim().toUpperCase() : '';
  if (!['US', 'CA'].includes(country)) return DESTINATION_ONLY;   // accurate shipping policy; says nothing about the connection
  try {
    const grant = await readGrant(request, config.cookieSecret, config.siteId);
    if (!grant) return REFUSED;
    const allowed = await researchClient(config).purchase(grant.token, country, await config.getIngress(request));
    return allowed === true ? null : REFUSED;
  } catch {
    return REFUSED;   // unavailable = refuse, never allow
  }
}

export async function checkPurchase(request, destinationCountry, config) {
  return (await purchaseRefusal(request, destinationCountry, config)) === null;
}
