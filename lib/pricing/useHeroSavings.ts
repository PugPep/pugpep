"use client";

import { useEffect, useState } from "react";
import type { createClient } from "../supabaseClient";
import { calculateHeroPricing } from "./heroEngine";

type Client = ReturnType<typeof createClient>;

export function calculateHeroSavingsCents(merchandiseCents: number, percent: number) {
  if (percent <= 0) return 0;
  const { heroDiscount } = calculateHeroPricing({
    isHeroAccount: true,
    heroDiscountPercent: percent,
    eligibleMerchandiseAmount: merchandiseCents / 100,
  });
  return Math.round(heroDiscount * 100);
}

export function useHeroSavingsRate(supabase: Client) {
  const [rate, setRate] = useState(0);

  useEffect(() => {
    let active = true;
    let request = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      clearTimeout(timer);
      const currentRequest = ++request;
      setRate(0);

      const customerId = session?.user.id;
      if (!customerId) return;

      // Run the profile query outside Supabase's auth callback.
      timer = setTimeout(() => {
        void (async () => {
          try {
            const { data, error } = await supabase.from("customer_profiles")
              .select("is_hero_account, hero_discount_percent")
              .eq("id", customerId)
              .maybeSingle();

            if (!active || currentRequest !== request || error || !data?.is_hero_account) return;
            const percent = Number(data.hero_discount_percent ?? 5);
            if (Number.isFinite(percent)) setRate(Math.min(100, Math.max(0, percent)));
          } catch (error) {
            if (active && currentRequest === request) {
              console.error("Unable to load Hero savings:", error);
            }
          }
        })();
      }, 0);
    });

    return () => {
      active = false;
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [supabase]);

  return rate;
}
