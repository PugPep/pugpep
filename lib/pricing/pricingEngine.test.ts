import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  CampaignPricingResult,
  PromoPricingResult,
} from "./types";

const {
  mockCampaignPricing,
  mockPromoPricing,
  mockReferralPricing,
  mockRewardsPricing,
  mockVipPricing,
  mockHeroPricing,
  mockShippingPricing,
  mockTaxPricing,
  mockCommission,
  mockSnapshot,
} = vi.hoisted(() => ({
  mockCampaignPricing: vi.fn(),
  mockPromoPricing: vi.fn(),
  mockReferralPricing: vi.fn(),
  mockRewardsPricing: vi.fn(),
  mockVipPricing: vi.fn(),
  mockHeroPricing: vi.fn(),
  mockShippingPricing: vi.fn(),
  mockTaxPricing: vi.fn(),
  mockCommission: vi.fn(),
  mockSnapshot: vi.fn(),
}));

vi.mock("./campaignPricing", () => ({
  calculateCampaignPricing: mockCampaignPricing,
}));

vi.mock("./promoEngine", () => ({
  calculatePromoPricing: mockPromoPricing,
}));

vi.mock("./referralEngine", () => ({
  calculateReferralPricing: mockReferralPricing,
}));

vi.mock("./rewardsEngine", () => ({
  calculateRewardsPricing: mockRewardsPricing,
}));

vi.mock("./vipEngine", () => ({
  calculateVipPricing: mockVipPricing,
}));

vi.mock("./heroEngine", () => ({
  calculateHeroPricing: mockHeroPricing,
}));

vi.mock("./shippingEngine", () => ({
  calculateShippingPricing: mockShippingPricing,
}));

vi.mock("./taxEngine", () => ({
  calculateTaxPricing: mockTaxPricing,
}));

vi.mock("./commissionEngine", () => ({
  calculateCommission: mockCommission,
}));

vi.mock("./snapshotEngine", () => ({
  createPricingSnapshot: mockSnapshot,
}));

import { calculatePricing } from "./pricingEngine";

function createSupabaseMock() {
  const auth = {
    getUser: vi.fn().mockResolvedValue({
      data: {
        user: {
          id: "customer-1",
          email: "customer@example.com",
        },
      },
      error: null,
    }),
  };

  const marketingRules = {
    rewards_enabled: true,
    allow_rewards_on_sale_items: true,
    earn_rewards_on_sale_orders: true,
    general_promos_enabled: true,
    allow_general_promos_on_sale_items: true,
    sales_rep_codes_enabled: true,
    sales_rep_discount_first_order_only: false,
    allow_sales_rep_discount_on_sale_items: true,
    preserve_sales_rep_attribution_when_discount_blocked: true,
    default_sales_rep_commission_percent: 20,
    referral_program_enabled: true,
    allow_referral_discount_on_sale_items: true,
    maximum_referral_discount_percent: 25,
    free_shipping_threshold: 250,
    lifetime_free_shipping_enabled: true,
    default_shipping_cost: 7,
    default_express_shipping_cost: 20,
    default_packaging_cost: 3,
    minimum_margin_warning_percent: 10,
    critical_margin_percent: 5,
    id: "rules-1",
    is_active: true,
    created_at: "2026-08-22T00:00:00.000Z",
  };

  const customerProfile = {
    id: "customer-1",
    reward_points: 0,
    lifetime_spend: 0,
    vip_tier: "Stone",
    has_lifetime_free_shipping: false,
    is_hero_account: false,
    hero_discount_percent: 0,
    qualified_referral_count: 0,
    referral_lifetime_discount_percent: 0,
    is_tax_exempt: false,
    tax_exemption_type: null,
    tax_exemption_number: null,
    tax_exemption_expires_at: null,
  };

  function makeQuery(table: string) {
    const row =
      table === "marketing_rules"
        ? marketingRules
        : customerProfile;

    const query: any = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      order: vi.fn(() => query),
      limit: vi.fn(() => query),
      maybeSingle: vi.fn().mockResolvedValue({
        data: row,
        error: null,
      }),
    };

    return query;
  }

  return {
    auth,
    from: vi.fn((table: string) => makeQuery(table)),
  } as any;
}

function makeLine(overrides: Record<string, unknown> = {}) {
  return {
    productOptionId: "option-1",
    productSlug: "test-product",
    productName: "Test Product",
    dosage: "10mg",
    purchaseType: "single" as const,
    quantity: 1,

    regularUnitPrice: 100,
    actualUnitPrice: 90,
    unitCost: 20,

    regularLineValue: 100,
    campaignLineRevenue: 90,
    saleDiscountAmount: 10,

    hasManualSale: false,
    manualSalePercent: 0,

    bundleDiscountApplied: false,
    bundleDiscountPercent: 0,
    bundleDiscountAmount: 0,
    bundleTierQuantity: null,

    paidQuantity: 1,
    freeQuantity: 0,

    hasCampaign: true,
    saleCampaignId: "campaign-1",
    saleCampaignName: "10% Sale",
    saleCampaignType: "percent" as const,

    allowRewardPoints: true,
    allowGeneralPromos: true,
    allowSalesRepDiscount: true,
    allowReferralDiscount: true,

    isTaxable: true,
    taxCode: null,

    lineCost: 20,
    lineProfitBeforeOrderCosts: 70,
    lineMarginBeforeOrderCosts: 77.7777777778,

    ...overrides,
  };
}

function makeCampaign(
  overrides: Partial<CampaignPricingResult> = {}
): CampaignPricingResult {
  const items =
    overrides.items || [makeLine()];

  return {
    items,
    regularMerchandiseValue: 100,
    campaignMerchandiseRevenue: 90,
    saleDiscount: 10,
    bundleDiscount: 0,
    primaryCampaignId: "campaign-1",
    primaryCampaignName: "10% Sale",
    primaryCampaignType: "percent",
    hasSaleItems: true,
    taxOffsetMode: "none",
    taxOffsetSourceType: null,
    taxOffsetSourceId: null,
    taxOffsetSourceCode: null,
    taxOffsetReason: null,
    warnings: [],
    ...overrides,
  };
}

function makePromo(
  overrides: Partial<PromoPricingResult> = {}
): PromoPricingResult {
  return {
    validation: {
      valid: true,
      source: "general",
      code: "SAVE15",
      discountType: "percent",
      discountValue: 15,
      minimumSpend: 0,
      excludeSaleItems: false,
      salesRepId: null,
      salesRepName: null,
      firstOrderOnly: false,
      discountAllowed: true,
      message: "",
      taxOffsetMode: "none",
      taxOffsetReason: null,
    },
    generalPromoDiscount: 15,
    salesRepDiscount: 0,
    appliedPromoCode: "SAVE15",
    appliedPromoSource: "general",
    salesRepId: null,
    salesRepName: null,
    taxOffsetMode: "none",
    taxOffsetSourceType: null,
    taxOffsetSourceId: null,
    taxOffsetSourceCode: null,
    taxOffsetReason: null,
    warnings: [],
    ...overrides,
  };
}

function setupDownstreamMocks() {
  mockReferralPricing.mockResolvedValue({
    qualifiedReferralCount: 0,
    referralDiscountPercent: 0,
    referralDiscount: 0,
    warnings: [],
  });

  mockVipPricing.mockResolvedValue({
    vipTier: "Stone",
    vipDiscountPercent: 0,
    vipDiscount: 0,
  });

  mockHeroPricing.mockReturnValue({
    isHeroAccount: false,
    heroDiscountPercent: 0,
    heroDiscount: 0,
  });

  mockRewardsPricing.mockResolvedValue({
    requestedPoints: 0,
    availablePoints: 0,
    pointsUsed: 0,
    rewardDiscount: 0,
    pointsEarned: 0,
    warnings: [],
  });

  mockShippingPricing.mockReturnValue({
    shippingMethod: "standard",
    shippingMethodLabel: "Standard Shipping",
    shippingCollected: 0,
    shippingDiscountAmount: 0,
    shippingDiscountReason: "Test",
    merchantPaidShippingAmount: 0,
    estimatedShippingCost: 0,
    estimatedPackagingCost: 0,
    hasLifetimeFreeShipping: false,
    estimatedDelivery: "Test",
  });

  mockTaxPricing.mockResolvedValue({
    enabled: false,
    provider: "none",
    taxableSubtotal: 0,
    salesTaxRate: 0,
    salesTaxAmount: 0,
    salesTaxState: null,
    salesTaxCounty: null,
    salesTaxCity: null,
    salesTaxPostalCode: null,
    salesTaxJurisdiction: null,
    taxCalculationId: null,
    taxExempt: false,
    taxExemptionReason: null,
    merchantTaxOffsetDiscount: 0,
    merchantTaxOffsetMode: "none",
    merchantTaxOffsetSourceType: null,
    merchantTaxOffsetSourceId: null,
    merchantTaxOffsetSourceCode: null,
    merchantTaxOffsetReason: null,
    warnings: [],
  });

  mockCommission.mockResolvedValue({
    salesRepId: null,
    salesRepName: null,
    commissionRate: 0,
    commissionBasis: 0,
    commissionAmount: 0,
    commissionStatus: "none",
  });

  mockSnapshot.mockReturnValue({
    snapshotVersion: "test",
    pricingEngineVersion: "test",
    createdAt: "2026-08-22T00:00:00.000Z",
    customerId: "customer-1",
    primarySaleCampaignId: null,
    primarySaleCampaignName: null,
    appliedPromoCode: null,
    appliedPromoSource: null,
    vipTierAtPurchase: "Stone",
    heroAccountAtPurchase: false,
    heroDiscountPercent: 0,
    qualifiedReferralCount: 0,
    referralDiscountPercent: 0,
    rewardPointsUsed: 0,
    rewardsPointsEarned: 0,
    shippingMethod: "standard",
    shippingMethodLabel: "Standard Shipping",
    shippingDiscountReason: null,
    merchantPaidShippingAmount: 0,
    taxableSubtotal: 0,
    salesTaxRate: 0,
    salesTaxAmount: 0,
    taxProvider: "none",
    taxJurisdiction: null,
    merchantTaxOffsetDiscount: 0,
    merchantTaxOffsetMode: "none",
    merchantTaxOffsetSourceType: null,
    merchantTaxOffsetSourceId: null,
    merchantTaxOffsetSourceCode: null,
    merchantTaxOffsetReason: null,
    discounts: {} as any,
    accounting: {} as any,
    commission: {} as any,
    steps: [],
    warnings: [],
  });
}

function makeInput() {
  return {
    supabase: createSupabaseMock(),
    customerId: "customer-1",
    items: [
      {
        productOptionId: "option-1",
        quantity: 1,
      },
    ],
    promoCode: "SAVE15",
    rewardPointsRequested: 0,
    shippingMethod: "standard" as const,
    shippingAddress: {
      countryCode: "US",
      stateCode: "SC",
      postalCode: "29550",
      city: "Hartsville",
    },
    manualDiscount: 0,
    otherDirectCost: 0,
  };
}

describe("pricingEngine highest promotional discount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDownstreamMocks();
  });

  it("uses a 15% promo instead of a 10% sale", async () => {
    mockCampaignPricing.mockResolvedValue(
      makeCampaign()
    );

    mockPromoPricing.mockResolvedValue(
      makePromo({
        generalPromoDiscount: 15,
      })
    );

    const result =
      await calculatePricing(
        makeInput()
      );

    expect(
      result.discounts.saleDiscount
    ).toBe(0);

    expect(
      result.discounts.generalPromoDiscount
    ).toBe(15);

    expect(
      result.campaign.campaignMerchandiseRevenue
    ).toBe(100);

    expect(
      result.campaign.primaryCampaignId
    ).toBeNull();

    expect(
      result.campaign.items[0].actualUnitPrice
    ).toBe(100);

    expect(
      result.accounting.merchandiseRevenueAfterDiscounts
    ).toBe(85);
  });

  it("keeps a 20% sale instead of a 15% promo", async () => {
    mockCampaignPricing.mockResolvedValue(
      makeCampaign({
        items: [
          makeLine({
            actualUnitPrice: 80,
            campaignLineRevenue: 80,
            saleDiscountAmount: 20,
            lineProfitBeforeOrderCosts: 60,
            lineMarginBeforeOrderCosts: 75,
            saleCampaignName: "20% Sale",
          }),
        ],
        campaignMerchandiseRevenue: 80,
        saleDiscount: 20,
        primaryCampaignName: "20% Sale",
      })
    );

    mockPromoPricing.mockResolvedValue(
      makePromo({
        generalPromoDiscount: 15,
      })
    );

    const result =
      await calculatePricing(
        makeInput()
      );

    expect(
      result.discounts.saleDiscount
    ).toBe(20);

    expect(
      result.discounts.generalPromoDiscount
    ).toBe(0);

    expect(
      result.campaign.campaignMerchandiseRevenue
    ).toBe(80);

    expect(
      result.campaign.primaryCampaignId
    ).toBe("campaign-1");

    expect(
      result.accounting.merchandiseRevenueAfterDiscounts
    ).toBe(80);
  });

  it("lets the sale win an exact tie", async () => {
    mockCampaignPricing.mockResolvedValue(
      makeCampaign({
        items: [
          makeLine({
            actualUnitPrice: 85,
            campaignLineRevenue: 85,
            saleDiscountAmount: 15,
          }),
        ],
        campaignMerchandiseRevenue: 85,
        saleDiscount: 15,
      })
    );

    mockPromoPricing.mockResolvedValue(
      makePromo({
        generalPromoDiscount: 15,
      })
    );

    const result =
      await calculatePricing(
        makeInput()
      );

    expect(
      result.discounts.saleDiscount
    ).toBe(15);

    expect(
      result.discounts.generalPromoDiscount
    ).toBe(0);
  });

  it("fully restores BOGO quantities when a larger promo wins", async () => {
    mockCampaignPricing.mockResolvedValue(
      makeCampaign({
        items: [
          makeLine({
            quantity: 2,
            regularUnitPrice: 100,
            regularLineValue: 200,
            actualUnitPrice: 50,
            campaignLineRevenue: 100,
            saleDiscountAmount: 100,
            paidQuantity: 1,
            freeQuantity: 1,
            saleCampaignType:
              "buy_x_get_y",
            saleCampaignName:
              "Buy 1 Get 1",
            lineCost: 40,
            lineProfitBeforeOrderCosts: 60,
            lineMarginBeforeOrderCosts: 60,
          }),
        ],
        regularMerchandiseValue: 200,
        campaignMerchandiseRevenue: 100,
        saleDiscount: 100,
        primaryCampaignName:
          "Buy 1 Get 1",
        primaryCampaignType:
          "buy_x_get_y",
      })
    );

    mockPromoPricing.mockResolvedValue(
      makePromo({
        validation: {
          ...makePromo().validation!,
          discountType: "fixed",
          discountValue: 120,
        },
        generalPromoDiscount: 120,
      })
    );

    const result =
      await calculatePricing(
        {
          ...makeInput(),
          items: [
            {
              productOptionId:
                "option-1",
              quantity: 2,
            },
          ],
        }
      );

    const line =
      result.campaign.items[0];

    expect(
      result.discounts.saleDiscount
    ).toBe(0);

    expect(
      result.discounts.generalPromoDiscount
    ).toBe(120);

    expect(line.paidQuantity).toBe(2);
    expect(line.freeQuantity).toBe(0);
    expect(line.hasCampaign).toBe(false);
    expect(line.saleCampaignId).toBeNull();
    expect(line.saleCampaignType).toBeNull();
    expect(line.campaignLineRevenue).toBe(200);
    expect(line.actualUnitPrice).toBe(100);

    expect(
      result.accounting.merchandiseRevenueAfterDiscounts
    ).toBe(80);
  });

  it("restores a manual product sale when the promo wins", async () => {
    mockCampaignPricing.mockResolvedValue(
      makeCampaign({
        items: [
          makeLine({
            hasCampaign: false,
            saleCampaignId: null,
            saleCampaignName: null,
            saleCampaignType: null,
            hasManualSale: true,
            manualSalePercent: 10,
            campaignLineRevenue: 90,
            actualUnitPrice: 90,
            saleDiscountAmount: 10,
          }),
        ],
        campaignMerchandiseRevenue: 90,
        saleDiscount: 10,
        primaryCampaignId: null,
        primaryCampaignName: null,
        primaryCampaignType: null,
      })
    );

    mockPromoPricing.mockResolvedValue(
      makePromo({
        generalPromoDiscount: 15,
      })
    );

    const result =
      await calculatePricing(
        makeInput()
      );

    const line =
      result.campaign.items[0];

    expect(line.hasManualSale).toBe(false);
    expect(line.manualSalePercent).toBe(0);
    expect(line.campaignLineRevenue).toBe(100);
    expect(line.actualUnitPrice).toBe(100);
    expect(line.saleDiscountAmount).toBe(0);
    expect(
      result.discounts.generalPromoDiscount
    ).toBe(15);
  });

  it("preserves sales-rep attribution when the larger sale wins", async () => {
    mockCampaignPricing.mockResolvedValue(
      makeCampaign({
        items: [
          makeLine({
            campaignLineRevenue: 80,
            actualUnitPrice: 80,
            saleDiscountAmount: 20,
          }),
        ],
        campaignMerchandiseRevenue: 80,
        saleDiscount: 20,
      })
    );

    mockPromoPricing.mockResolvedValue(
      makePromo({
        validation: {
          ...makePromo().validation!,
          source: "sales_rep",
          code: "REP15",
          salesRepId: "rep-1",
          salesRepName: "Olivia",
        },
        generalPromoDiscount: 0,
        salesRepDiscount: 15,
        appliedPromoCode: "REP15",
        appliedPromoSource:
          "sales_rep",
        salesRepId: "rep-1",
        salesRepName: "Olivia",
      })
    );

    mockCommission.mockResolvedValue({
      salesRepId: "rep-1",
      salesRepName: "Olivia",
      commissionRate: 20,
      commissionBasis: 60,
      commissionAmount: 12,
      commissionStatus: "pending",
    });

    const result =
      await calculatePricing(
        {
          ...makeInput(),
          promoCode: "REP15",
        }
      );

    expect(
      result.discounts.saleDiscount
    ).toBe(20);

    expect(
      result.discounts.salesRepDiscount
    ).toBe(0);

    expect(
      result.promo.appliedPromoCode
    ).toBe("REP15");

    expect(
      result.promo.appliedPromoSource
    ).toBe("sales_rep");

    expect(
      result.promo.salesRepId
    ).toBe("rep-1");

    expect(mockCommission).toHaveBeenCalledWith(
      expect.objectContaining({
        promo:
          expect.objectContaining({
            appliedPromoCode: "REP15",
            appliedPromoSource:
              "sales_rep",
            salesRepId: "rep-1",
          }),
      })
    );
  });

  it("keeps bundle savings separate when a promo is also applied", async () => {
    mockCampaignPricing.mockResolvedValue(
      makeCampaign({
        items: [
          makeLine({
            hasCampaign: false,
            saleCampaignId: null,
            saleCampaignName: null,
            saleCampaignType: null,
            campaignLineRevenue: 90,
            actualUnitPrice: 90,
            saleDiscountAmount: 0,
            bundleDiscountApplied: true,
            bundleDiscountPercent: 10,
            bundleDiscountAmount: 10,
            bundleTierQuantity: 1,
          }),
        ],
        campaignMerchandiseRevenue: 90,
        saleDiscount: 0,
        bundleDiscount: 10,
        primaryCampaignId: null,
        primaryCampaignName: null,
        primaryCampaignType: null,
        hasSaleItems: false,
      })
    );

    mockPromoPricing.mockResolvedValue(
      makePromo({
        generalPromoDiscount: 13.5,
      })
    );

    const result =
      await calculatePricing(
        makeInput()
      );

    expect(
      result.discounts.bundleDiscount
    ).toBe(10);

    expect(
      result.discounts.generalPromoDiscount
    ).toBe(13.5);

    expect(
      result.campaign.campaignMerchandiseRevenue
    ).toBe(90);

    expect(
      result.accounting.merchandiseRevenueAfterDiscounts
    ).toBe(76.5);
  });
});