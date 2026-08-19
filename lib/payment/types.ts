import type {
  PricingResult,
  PricingSnapshot,
  ShippingMethod,
} from "../pricing/types";

export type PaymentMethod =
  | "cashapp"
  | "venmo"
  | "zelle"
  | "crypto";

export type PendingCustomer = {
  organization: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
};

export type PendingCartItem = {
  productOptionId?: string;
  slug: string;
  name: string;
  dosage: string;
  purchaseType: "single" | "kit";
  price: number;
  regularPrice?: number;
  salePrice?: number;
  wasOnSale?: boolean;
  salePercent?: number;
  cost?: number;
  quantity?: number;
  status?: string;
  maxAvailable?: number;
  image?: string;
};

export type PendingOrder = {
  id: string;
  userId: string | null;
  orderNumber: string;
  customer: PendingCustomer;
  items: PendingCartItem[];

  pricingInput?: {
    items: {
      productOptionId?: string;
      quantity: number;
    }[];

    promoCode?: string | null;
    rewardPointsRequested?: number;
    shippingMethod?: ShippingMethod;

    shippingAddress: {
      countryCode: string;
      stateCode: string;
      postalCode: string;
      city?: string;
      county?: string;
    };
  };

  pricing?: PricingResult;
  pricingSnapshot?: PricingSnapshot;

  shippingMethod?: ShippingMethod;
  shippingMethodLabel?: string;
  paymentMethod?: PaymentMethod;

  subtotal: number;
  shipping: number;
  salesTax?: number;
  rewardPointsUsed?: number;
  rewardDiscount?: number;
  promoCode?: string | null;
  promoSource?: string | null;
  promoDiscountAllowed?: boolean;
  promoDiscountType?: string | null;
  promoDiscountValue?: number;
  promoDiscount?: number;
  totalDiscount?: number;
  total: number;
  hasLifetimeFreeShipping?: boolean;
  createdAt: string;
  confirmed?: boolean;
};

export type CustomerProfileRow = {
  reward_points: number | null;
  lifetime_spend: number | null;
};

export type SupabaseErrorDetails = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
};

export type InsertedOrderItem = {
  id: string;
  product_option_id: string;
};