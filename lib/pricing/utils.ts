import type {
  PricingWarning,
  PricingWarningCode,
} from "./types";

export const PRICING_ENGINE_VERSION = 1;
export const PRICING_SNAPSHOT_VERSION = 2;

export function toNumber(
  value: unknown,
  fallback = 0
) {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

export function nonNegative(
  value: unknown
) {
  return Math.max(
    0,
    toNumber(value)
  );
}

export function clamp(
  value: unknown,
  minimum: number,
  maximum: number
) {
  return Math.min(
    maximum,
    Math.max(
      minimum,
      toNumber(value)
    )
  );
}

export function clampPercent(
  value: unknown
) {
  return clamp(value, 0, 100);
}

export function roundCurrency(
  value: unknown
) {
  return Math.round(
    (toNumber(value) +
      Number.EPSILON) *
      100
  ) / 100;
}

export function roundPercent(
  value: unknown
) {
  return Math.round(
    (toNumber(value) +
      Number.EPSILON) *
      100
  ) / 100;
}

export function safeQuantity(
  value: unknown
) {
  return Math.max(
    0,
    Math.floor(
      toNumber(value)
    )
  );
}

export function safePositiveQuantity(
  value: unknown
) {
  return Math.max(
    1,
    Math.floor(
      toNumber(value, 1)
    )
  );
}

export function calculatePercentAmount(
  baseAmount: unknown,
  percent: unknown
) {
  return roundCurrency(
    nonNegative(baseAmount) *
      (clampPercent(percent) /
        100)
  );
}

export function calculateFixedDiscount(
  baseAmount: unknown,
  fixedAmount: unknown
) {
  return roundCurrency(
    Math.min(
      nonNegative(baseAmount),
      nonNegative(fixedAmount)
    )
  );
}

export function applyDiscount(
  baseAmount: unknown,
  discountAmount: unknown
) {
  return roundCurrency(
    Math.max(
      0,
      nonNegative(baseAmount) -
        nonNegative(discountAmount)
    )
  );
}

export function calculateMarginPercent(
  revenue: unknown,
  profit: unknown
) {
  const safeRevenue =
    nonNegative(revenue);

  if (safeRevenue <= 0) {
    return 0;
  }

  return roundPercent(
    (toNumber(profit) /
      safeRevenue) *
      100
  );
}

export function calculateBuyXGetY({
  quantity,
  buyQuantity,
  getQuantity,
}: {
  quantity: unknown;
  buyQuantity: unknown;
  getQuantity: unknown;
}) {
  const totalQuantity =
    safeQuantity(quantity);

  const safeBuyQuantity =
    Math.max(
      1,
      safeQuantity(
        buyQuantity
      )
    );

  const safeGetQuantity =
    Math.max(
      1,
      safeQuantity(
        getQuantity
      )
    );

  const groupSize =
    safeBuyQuantity +
    safeGetQuantity;

  if (
    totalQuantity <= 0 ||
    groupSize <= 0
  ) {
    return {
      paidQuantity: 0,
      freeQuantity: 0,
    };
  }

  const completeGroups =
    Math.floor(
      totalQuantity / groupSize
    );

  const remainingQuantity =
    totalQuantity % groupSize;

  const paidRemainder =
    Math.min(
      remainingQuantity,
      safeBuyQuantity
    );

  const paidQuantity =
    completeGroups *
      safeBuyQuantity +
    paidRemainder;

  return {
    paidQuantity,
    freeQuantity:
      totalQuantity -
      paidQuantity,
  };
}

export function distributeAmount(
  totalAmount: unknown,
  weights: number[]
) {
  const safeTotal =
    roundCurrency(
      nonNegative(totalAmount)
    );

  if (
    safeTotal <= 0 ||
    weights.length === 0
  ) {
    return weights.map(
      () => 0
    );
  }

  const safeWeights =
    weights.map(
      (weight) =>
        nonNegative(weight)
    );

  const weightTotal =
    safeWeights.reduce(
      (sum, weight) =>
        sum + weight,
      0
    );

  if (weightTotal <= 0) {
    return safeWeights.map(
      () => 0
    );
  }

  let distributed = 0;

  return safeWeights.map(
    (weight, index) => {
      if (
        index ===
        safeWeights.length - 1
      ) {
        return roundCurrency(
          safeTotal -
            distributed
        );
      }

      const share =
        roundCurrency(
          safeTotal *
            (weight /
              weightTotal)
        );

      distributed =
        roundCurrency(
          distributed + share
        );

      return share;
    }
  );
}

export function calculateMerchantTaxOffset({
  taxableAmountBeforeOffset,
  taxRate,
}: {
  taxableAmountBeforeOffset: unknown;
  taxRate: unknown;
}) {
  const taxableAmount =
    nonNegative(
      taxableAmountBeforeOffset
    );

  const safeTaxRate =
    clamp(
      taxRate,
      0,
      1
    );

  if (
    taxableAmount <= 0 ||
    safeTaxRate <= 0
  ) {
    return {
      merchantTaxOffsetDiscount: 0,
      taxableSubtotalAfterOffset:
        roundCurrency(
          taxableAmount
        ),
      salesTaxAmount: 0,
      customerTaxInclusiveAmount:
        roundCurrency(
          taxableAmount
        ),
    };
  }

  /*
   * The merchant-funded offset is solved so:
   *
   * discounted taxable subtotal
   * + tax on that subtotal
   * = original pre-tax subtotal.
   */
  const taxableSubtotalAfterOffset =
    roundCurrency(
      taxableAmount /
        (1 + safeTaxRate)
    );

  const merchantTaxOffsetDiscount =
    roundCurrency(
      taxableAmount -
        taxableSubtotalAfterOffset
    );

  const salesTaxAmount =
    roundCurrency(
      taxableSubtotalAfterOffset *
        safeTaxRate
    );

  return {
    merchantTaxOffsetDiscount,
    taxableSubtotalAfterOffset,
    salesTaxAmount,
    customerTaxInclusiveAmount:
      roundCurrency(
        taxableSubtotalAfterOffset +
          salesTaxAmount
      ),
  };
}

export function normalizeCode(
  value: unknown
) {
  return typeof value ===
    "string"
    ? value.trim().toUpperCase()
    : "";
}

export function normalizeText(
  value: unknown
) {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

export function optionalText(
  value: unknown
) {
  const normalized =
    normalizeText(value);

  return normalized || null;
}

export function formatCurrency(
  value: unknown
) {
  return `$${roundCurrency(
    value
  ).toFixed(2)}`;
}

export function formatPercent(
  value: unknown
) {
  return `${roundPercent(
    value
  ).toFixed(2)}%`;
}

export function createWarning({
  code,
  message,
  severity = "warning",
  productOptionId,
}: {
  code: PricingWarningCode;
  message: string;
  severity?:
    | "info"
    | "warning"
    | "critical";
  productOptionId?: string;
}): PricingWarning {
  return {
    code,
    message,
    severity,
    ...(productOptionId
      ? { productOptionId }
      : {}),
  };
}

export function uniqueWarnings(
  warnings: PricingWarning[]
) {
  const seen =
    new Set<string>();

  return warnings.filter(
    (warning) => {
      const key = [
        warning.code,
        warning.message,
        warning.productOptionId ||
          "",
      ].join("|");

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    }
  );
}

export function getMarginWarnings({
  profit,
  margin,
  warningThreshold,
  criticalThreshold,
}: {
  profit: unknown;
  margin: unknown;
  warningThreshold: unknown;
  criticalThreshold: unknown;
}) {
  const warnings:
    PricingWarning[] = [];

  const safeProfit =
    toNumber(profit);

  const safeMargin =
    toNumber(margin);

  const safeWarningThreshold =
    clampPercent(
      warningThreshold
    );

  const safeCriticalThreshold =
    clampPercent(
      criticalThreshold
    );

  if (safeProfit < 0) {
    warnings.push(
      createWarning({
        code:
          "NEGATIVE_PROFIT",
        message:
          "This pricing scenario produces a negative profit.",
        severity:
          "critical",
      })
    );
  }

  if (
    safeMargin <
    safeCriticalThreshold
  ) {
    warnings.push(
      createWarning({
        code:
          "CRITICAL_MARGIN",
        message:
          `Profit margin is below the critical threshold of ${formatPercent(
            safeCriticalThreshold
          )}.`,
        severity:
          "critical",
      })
    );

    return warnings;
  }

  if (
    safeMargin <
    safeWarningThreshold
  ) {
    warnings.push(
      createWarning({
        code: "LOW_MARGIN",
        message:
          `Profit margin is below the warning threshold of ${formatPercent(
            safeWarningThreshold
          )}.`,
        severity:
          "warning",
      })
    );
  }

  return warnings;
}

export function sumCurrency(
  values: unknown[]
) {
  return roundCurrency(
    values.reduce<number>(
      (sum, value) =>
        sum +
        toNumber(value),
      0
    )
  );
}

export function currentIsoDate() {
  return new Date().toISOString();
}