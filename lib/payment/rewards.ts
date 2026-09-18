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

  if (pointsUsed > rewardPointsBefore) {
    throw new Error(
      "Insufficient reward points."
    );
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    "deduct_customer_reward_points",
    {
      p_customer_id:
        customerId,

      p_points_used:
        pointsUsed,
    }
  );

  if (error) {
    throw error;
  }

  return Number(data || 0);
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

  const { error } =
    await supabase.rpc(
      "restore_customer_reward_points",
      {
        p_customer_id:
          customerId,

        p_points:
          points,
      }
    );

  if (error) {
    throw error;
  }
}