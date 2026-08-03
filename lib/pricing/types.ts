import type { SupabaseClient } from "@supabase/supabase-js";

export type CampaignType =
  | "percent"
  | "fixed"
  | "buy_x_get_y";

export type PromoSource =
  | "general"
  | "sales_rep"
  | null;

export type DiscountSourceType =
  | "campaign"
  | "general_promo"
  | "sales_rep"
  | "referral"
  | "rewards"
  | "vip"
  | "manual"
  | "merchant_tax_offset";

export type ShippingMethod =
  | "standard"
  | "express";

export type ShippingDiscountReason =
  | "none"
  | "threshold"
  | "lifetime"
  | "campaign"
  | "promo"
  | "manual"
  | "express_upgrade";

export type TaxCalculationMode =
  | "manual"
  | "automatic";

export type TaxProvider =
  | "manual"
  | "stripe_tax"
  | "taxjar"
  | "avalara"
  | "other";

export type TaxOffsetMode =
  | "none"
  | "merchant_funded";

export type PricingWarningCode =
  | "LOW_MARGIN"
  | "CRITICAL_MARGIN"
  | "NEGATIVE_PROFIT"
  | "PROMO_BLOCKED"
  | "REFERRAL_BLOCKED"
  | "REWARDS_BLOCKED"
  | "SALES_REP_DISCOUNT_BLOCKED"
  | "TAX_RATE_NOT_FOUND"
  | "PRODUCT_OPTION_NOT_FOUND"
  | "PRODUCT_INACTIVE"
  | "OUT_OF_STOCK"
  | "INSUFFICIENT_INVENTORY"
  | "INVALID_QUANTITY"
  | "MISSING_PRODUCT_OPTION_ID";

export type PricingWarning = {
  code: PricingWarningCode;
  message: string;
  severity: "info" | "warning" | "critical";
  productOptionId?: string;
};

export type PricingAddress = {
  countryCode: string;
  stateCode: string;
  postalCode: string;
  city?: string;
  county?: string;
};

export type PricingCartItemInput = {
  productOptionId: string;
  quantity: number;
};

export type PricingInput = {
  supabase: SupabaseClient;
  customerId: string;
  items: PricingCartItemInput[];
  shippingAddress: PricingAddress;
  promoCode?: string | null;
  rewardPointsRequested?: number;

  shippingMethod?: ShippingMethod;

  manualDiscount?: number;
  otherDirectCost?: number;
};

export type ProductOptionCampaignPrice = {
  productOptionId: string;
  productSlug: string;
  dosage: string;
  purchaseType: "single" | "kit";

  hasCampaign: boolean;
  saleCampaignId: string | null;
  saleCampaignName: string | null;
  saleCampaignType: CampaignType | null;

  regularUnitPrice: number;
  saleUnitPrice: number;
  saleDiscountAmount: number;
  discountValue: number;

  unitCost: number;
  profitBeforeShipping: number;
  marginBeforeShipping: number;

  buyQuantity: number | null;
  getQuantity: number | null;

  allowRewardPoints: boolean;
  allowGeneralPromos: boolean;
  allowSalesRepDiscount: boolean;
  allowReferralDiscount: boolean;

  taxOffsetMode: TaxOffsetMode;
  taxOffsetReason: string | null;
};

export type PricedCartLine = {
  productOptionId: string;
  productSlug: string;
  productName: string;
  dosage: string;
  purchaseType: "single" | "kit";
  quantity: number;

  regularUnitPrice: number;
  actualUnitPrice: number;
  unitCost: number;

  regularLineValue: number;
  campaignLineRevenue: number;
  saleDiscountAmount: number;

  paidQuantity: number;
  freeQuantity: number;

  hasCampaign: boolean;
  saleCampaignId: string | null;
  saleCampaignName: string | null;
  saleCampaignType: CampaignType | null;

  allowRewardPoints: boolean;
  allowGeneralPromos: boolean;
  allowSalesRepDiscount: boolean;
  allowReferralDiscount: boolean;

  isTaxable: boolean;
  taxCode: string | null;

  lineCost: number;
  lineProfitBeforeOrderCosts: number;
  lineMarginBeforeOrderCosts: number;
};

export type CampaignPricingResult = {
  items: PricedCartLine[];
  regularMerchandiseValue: number;
  campaignMerchandiseRevenue: number;
  saleDiscount: number;

  primaryCampaignId: string | null;
  primaryCampaignName: string | null;
  primaryCampaignType: CampaignType | null;

  hasSaleItems: boolean;
  taxOffsetMode: TaxOffsetMode;
  taxOffsetSourceType: "campaign" | null;
  taxOffsetSourceId: string | null;
  taxOffsetSourceCode: string | null;
  taxOffsetReason: string | null;

  warnings: PricingWarning[];
};

export type PromoValidationResult = {
  valid: boolean;
  source: PromoSource;
  code: string | null;
  discountType: "percent" | "fixed" | null;
  discountValue: number;
  salesRepId: string | null;
  salesRepName: string | null;
  firstOrderOnly: boolean;
  discountAllowed: boolean;
  message: string;

  taxOffsetMode: TaxOffsetMode;
  taxOffsetReason: string | null;
};

export type PromoPricingResult = {
  validation: PromoValidationResult | null;

  generalPromoDiscount: number;
  salesRepDiscount: number;

  appliedPromoCode: string | null;
  appliedPromoSource: PromoSource;

  salesRepId: string | null;
  salesRepName: string | null;

  taxOffsetMode: TaxOffsetMode;
  taxOffsetSourceType: "promo_code" | null;
  taxOffsetSourceId: string | null;
  taxOffsetSourceCode: string | null;
  taxOffsetReason: string | null;

  warnings: PricingWarning[];
};

export type ReferralPricingResult = {
  qualifiedReferralCount: number;
  referralDiscountPercent: number;
  referralDiscount: number;
  referralDiscountAllowed: boolean;
  warnings: PricingWarning[];
};

export type RewardsPricingResult = {
  rewardsEnabled: boolean;
  availablePoints: number;
  requestedPoints: number;
  pointsUsed: number;
  rewardDiscount: number;
  rewardsAllowed: boolean;
  pointsEarned: number;
  warnings: PricingWarning[];
};

export type VipPricingResult = {
  vipTier: string;
  vipDiscountPercent: number;
  vipDiscount: number;
};

export type ShippingPricingResult = {
  shippingMethod: ShippingMethod;
  shippingMethodLabel: string;
  estimatedDelivery: string;

  standardShippingPrice: number;
  expressShippingPrice: number;
  selectedShippingPrice: number;

  shippingCollected: number;
  shippingDiscountAmount: number;
  shippingDiscountReason: ShippingDiscountReason;

  estimatedShippingCost: number;
  estimatedPackagingCost: number;

  hasLifetimeFreeShipping: boolean;
  freeShippingThreshold: number;

  merchantPaidShippingAmount: number;
  freeStandardShippingApplied: boolean;
  expressUpgradeApplied: boolean;
};

export type TaxRateResult = {
  enabled: boolean;
  rate: number;
  taxShipping: boolean;
  jurisdiction: string | null;
  rateId: string | null;

  countryCode: string | null;
  stateCode: string | null;
  countyName: string | null;
  cityName: string | null;
  postalCode: string | null;
  productTaxCode: string | null;
};

export type TaxPricingResult = {
  enabled: boolean;
  calculationMode: TaxCalculationMode;
  provider: TaxProvider;

  taxableSubtotal: number;
  salesTaxRate: number;
  salesTaxAmount: number;

  salesTaxState: string | null;
  salesTaxCounty: string | null;
  salesTaxCity: string | null;
  salesTaxPostalCode: string | null;
  salesTaxJurisdiction: string | null;

  taxCalculationId: string | null;

  taxExempt: boolean;
  taxExemptionReason: string | null;

  merchantTaxOffsetDiscount: number;
  merchantTaxOffsetMode: TaxOffsetMode;
  merchantTaxOffsetSourceType:
    | "campaign"
    | "promo_code"
    | null;
  merchantTaxOffsetSourceId: string | null;
  merchantTaxOffsetSourceCode: string | null;
  merchantTaxOffsetReason: string | null;

  warnings: PricingWarning[];
};

export type DiscountBreakdown = {
  saleDiscount: number;
  generalPromoDiscount: number;
  salesRepDiscount: number;
  referralDiscount: number;
  rewardsDiscount: number;
  vipDiscount: number;
  manualDiscount: number;
  merchantTaxOffsetDiscount: number;
  totalDiscount: number;
};

export type AccountingResult = {
  regularMerchandiseValue: number;
  merchandiseRevenueAfterDiscounts: number;

  shippingCollected: number;
  salesTaxCollected: number;

  customerTotal: number;

  grossRevenue: number;
  netRevenue: number;

  productCostTotal: number;
  shippingCost: number;
  packagingCost: number;
  otherDirectCost: number;

  profitBeforeCommission: number;
  profitAfterCommission: number;
  profitMarginPercent: number;
};

export type CommissionResult = {
  salesRepId: string | null;
  salesRepName: string | null;
  commissionRate: number;
  commissionBasis: number;
  commissionAmount: number;
  commissionStatus: "none" | "pending";
};

export type PricingStep = {
  label: string;
  amount?: number;
  message: string;
  category:
    | "revenue"
    | "discount"
    | "shipping"
    | "tax"
    | "cost"
    | "commission"
    | "profit"
    | "rule";
};

export type PricingSnapshot = {
  snapshotVersion: number;
  pricingEngineVersion: number;
  createdAt: string;

  customerId: string;

  primarySaleCampaignId: string | null;
  primarySaleCampaignName: string | null;

  appliedPromoCode: string | null;
  appliedPromoSource: PromoSource;

  vipTierAtPurchase: string;

  qualifiedReferralCount: number;
  referralDiscountPercent: number;

  rewardPointsUsed: number;
  rewardsPointsEarned: number;

  shippingMethod: ShippingMethod;
  shippingMethodLabel: string;
  shippingDiscountReason: ShippingDiscountReason;
  merchantPaidShippingAmount: number;

  taxableSubtotal: number;
  salesTaxRate: number;
  salesTaxAmount: number;
  taxProvider: TaxProvider;
  taxJurisdiction: string | null;

  merchantTaxOffsetDiscount: number;
  merchantTaxOffsetMode: TaxOffsetMode;
  merchantTaxOffsetSourceType:
    | "campaign"
    | "promo_code"
    | null;
  merchantTaxOffsetSourceId: string | null;
  merchantTaxOffsetSourceCode: string | null;
  merchantTaxOffsetReason: string | null;

  discounts: DiscountBreakdown;
  accounting: AccountingResult;
  commission: CommissionResult;

  steps: PricingStep[];
  warnings: PricingWarning[];
};

export type PricingResult = {
  campaign: CampaignPricingResult;
  promo: PromoPricingResult;
  referral: ReferralPricingResult;
  rewards: RewardsPricingResult;
  vip: VipPricingResult;
  shipping: ShippingPricingResult;
  tax: TaxPricingResult;
  discounts: DiscountBreakdown;
  accounting: AccountingResult;
  commission: CommissionResult;
  snapshot: PricingSnapshot;
  warnings: PricingWarning[];
};

export type MarketingRulesRecord = {
  rewards_enabled: boolean;
  allow_rewards_on_sale_items: boolean;
  earn_rewards_on_sale_orders: boolean;

  general_promos_enabled: boolean;
  allow_general_promos_on_sale_items: boolean;

  sales_rep_codes_enabled: boolean;
  sales_rep_discount_first_order_only: boolean;
  allow_sales_rep_discount_on_sale_items: boolean;
  preserve_sales_rep_attribution_when_discount_blocked: boolean;
  default_sales_rep_commission_percent: number;

  referral_program_enabled: boolean;
  allow_referral_discount_on_sale_items: boolean;
  maximum_referral_discount_percent: number;

  free_shipping_threshold: number;
  lifetime_free_shipping_enabled: boolean;
  default_shipping_cost: number;
  default_express_shipping_cost: number;
  default_packaging_cost: number;

  minimum_margin_warning_percent: number;
  critical_margin_percent: number;
};

export type CustomerPricingProfile = {
  id: string;
  rewardPoints: number;
  lifetimeSpend: number;
  vipTier: string;
  hasLifetimeFreeShipping: boolean;
  qualifiedReferralCount: number;
  referralLifetimeDiscountPercent: number;
  isTaxExempt: boolean;
  taxExemptionType: string | null;
  taxExemptionNumber: string | null;
  taxExemptionExpiresAt: string | null;
};