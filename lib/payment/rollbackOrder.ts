import type { SupabaseClient } from "@supabase/supabase-js";

export async function rollbackOrder(
  supabase: SupabaseClient,
  orderId: string
) {
  try {
    await supabase
      .from(
        "order_financial_ledger"
      )
      .delete()
      .eq(
        "order_id",
        orderId
      );

    await supabase
      .from("order_items")
      .delete()
      .eq(
        "order_id",
        orderId
      );

    await supabase
      .from("orders")
      .delete()
      .eq("id", orderId);
  } catch (rollbackError) {
    console.error(
      "Unable to fully roll back incomplete order:",
      rollbackError
    );
  }
}