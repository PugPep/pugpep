import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  AccountingResult,
  CommissionResult,
  MarketingRulesRecord,
  PromoPricingResult,
} from "./types";

import {
  clamp,
  nonNegative,
  roundCurrency,
} from "./utils";

type CommissionEngineInput = {
  supabase: SupabaseClient;
  customerId: string;
  promo: PromoPricingResult;
  accounting: AccountingResult;
  marketingRules: MarketingRulesRecord;
};

type CustomerAssignmentRow = {
  sales_rep_id: string;
  attribution_code: string | null;
};

type SalesRepRow = {
  id: string;
  display_name: string;
  commission_rate: number | null;
  is_active: boolean;
};

async function loadCustomerAssignment({
  supabase,
  customerId,
}: {
  supabase: SupabaseClient;
  customerId: string;
}) {
  const {
    data,
    error,
  } = await supabase
    .from("customer_sales_rep_assignments")
    .select(
      "sales_rep_id,attribution_code"
    )
    .eq("customer_id", customerId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data
    ? (data as unknown as CustomerAssignmentRow)
    : null;
}

async function loadSalesRep({
  supabase,
  salesRepId,
}: {
  supabase: SupabaseClient;
  salesRepId: string;
}) {
  const {
    data,
    error,
  } = await supabase
    .from("sales_reps")
    .select(
      "id,display_name,commission_rate,is_active"
    )
    .eq("id", salesRepId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data
    ? (data as unknown as SalesRepRow)
    : null;
}

function normalizeCommissionRate({
  storedRate,
  fallbackPercent,
}: {
  storedRate: unknown;
  fallbackPercent: unknown;
}) {
  /*
   * sales_reps.commission_rate is stored as a decimal:
   * 0.20 = 20%.
   */
  const rate = Number(storedRate);

  if (
    Number.isFinite(rate) &&
    rate >= 0 &&
    rate <= 1
  ) {
    return rate;
  }

  return (
    clamp(
      fallbackPercent,
      0,
      100
    ) / 100
  );
}

export async function calculateCommission({
  supabase,
  customerId,
  promo,
  accounting,
  marketingRules,
}: CommissionEngineInput): Promise<CommissionResult> {
  /*
   * A newly validated sales-rep promo can identify the rep before
   * the permanent customer assignment has been written.
   */
  let salesRepId =
    promo.salesRepId;

  let salesRepName =
    promo.salesRepName;

  if (!salesRepId) {
    const assignment =
      await loadCustomerAssignment({
        supabase,
        customerId,
      });

    salesRepId =
      assignment?.sales_rep_id ||
      null;
  }

  if (!salesRepId) {
    return {
      salesRepId: null,
      salesRepName: null,
      commissionRate: 0,
      commissionBasis: 0,
      commissionAmount: 0,
      commissionStatus: "none",
    };
  }

  const rep =
    await loadSalesRep({
      supabase,
      salesRepId,
    });

  if (
    !rep ||
    !rep.is_active
  ) {
    return {
      salesRepId: null,
      salesRepName: null,
      commissionRate: 0,
      commissionBasis: 0,
      commissionAmount: 0,
      commissionStatus: "none",
    };
  }

  salesRepName =
    rep.display_name ||
    salesRepName ||
    null;

  const commissionRate =
    normalizeCommissionRate({
      storedRate:
        rep.commission_rate,

      fallbackPercent:
        marketingRules.default_sales_rep_commission_percent,
    });

  /*
   * Commission is calculated from positive profit before commission.
   * A zero-profit or negative-profit order never creates a commission.
   */
  const commissionBasis =
    roundCurrency(
      Math.max(
        0,
        nonNegative(
          accounting.profitBeforeCommission
        )
      )
    );

  const commissionAmount =
    roundCurrency(
      commissionBasis *
        commissionRate
    );

  return {
    salesRepId:
      rep.id,

    salesRepName,

    commissionRate,

    commissionBasis,

    commissionAmount,

    commissionStatus:
      commissionAmount > 0
        ? "pending"
        : "none",
  };
}