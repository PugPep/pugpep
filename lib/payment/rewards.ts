import type { SupabaseClient } from "@supabase/supabase-js";

export async function deductRewardPoints({
  supabase,
  customerId,
  rewardPointsBefore,
  pointsUsed,
}: {
  supabase: SupabaseClient;
  customerId: string;
  rewardPointsBefore: number;
  pointsUsed: number;
}) {
  if (pointsUsed <= 0) {
    return 0;
  }

  const remainingPoints =
    Math.max(
      0,
      rewardPointsBefore -
        pointsUsed
    );

  const { error } =
    await supabase
      .from("customer_profiles")
      .update({
        reward_points:
          remainingPoints,
      })
      .eq(
        "id",
        customerId
      );

  if (error) {
    throw error;
  }

  return pointsUsed;
}

export async function restoreRewardPoints({
  supabase,
  customerId,
  points,
}: {
  supabase: SupabaseClient;
  customerId: string;
  points: number;
}) {
  if (points <= 0) {
    return;
  }

  const { data } =
    await supabase
      .from("customer_profiles")
      .select(
        "reward_points"
      )
      .eq(
        "id",
        customerId
      )
      .maybeSingle();

  if (!data) {
    return;
  }

  await supabase
    .from("customer_profiles")
    .update({
      reward_points:
        Number(
          data.reward_points ||
          0
        ) +
        points,
    })
    .eq(
      "id",
      customerId
    );
}