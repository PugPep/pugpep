import type { HeroPricingResult } from "./types";
import { nonNegative, roundCurrency } from "./utils";

type HeroEngineInput = {
  isHeroAccount: boolean;
  heroDiscountPercent: number;
  eligibleMerchandiseAmount: number;
};

export function calculateHeroPricing({
  isHeroAccount,
  heroDiscountPercent,
  eligibleMerchandiseAmount,
}: HeroEngineInput): HeroPricingResult {
  const percent = isHeroAccount
    ? Math.min(100, nonNegative(heroDiscountPercent))
    : 0;

  const eligibleAmount = roundCurrency(
    nonNegative(eligibleMerchandiseAmount)
  );

  const heroDiscount = isHeroAccount
    ? roundCurrency(
        Math.min(
          eligibleAmount,
          eligibleAmount * (percent / 100)
        )
      )
    : 0;

  return {
    isHeroAccount: Boolean(isHeroAccount),
    heroDiscountPercent: percent,
    heroDiscount,
  };
}