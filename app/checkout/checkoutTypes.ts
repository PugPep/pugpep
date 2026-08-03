import type { PricingResult, ShippingMethod } from "../../lib/pricing/types";

export type CustomerForm = {
  organization: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
};

export type TierTheme = {
  color: string;
  glow: string;
  background: string;
  border: string;
};

export type CheckoutPricing = PricingResult | null;

export type ShippingChoice = ShippingMethod;