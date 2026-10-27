import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PENDING_STATUSES = [
  "pending",
  "unpaid",
  "awaiting payment",
  "awaiting_payment",
  "payment pending",
  "payment_pending",
];
const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_ORDERS_PER_RUN = 500;
const MAX_NOTICE_RETRIES_PER_RUN = 100;

const REMINDER_TEMPLATE = "template_x2cjyqa";
const CANCELLATION_TEMPLATE = "template_jqmyve8";

type Action = "reminder" | "cancel";
type Order = {
  id: string;
  order_number: string;
  customer_name: string | null;
  customer_email: string | null;
  created_at: string;
  status: string;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  deleted_at: string | null;
  closed_at: string | null;
};
type AutomationState = {
  hold_until: string | null;
  reminder_sent_at: string | null;
  cancellation_email_sent_at: string | null;
  cancellation_started_at: string | null;
};

const ORDER_COLUMNS =
  "id,order_number,customer_name,customer_email,created_at,status,cancelled_at,cancellation_reason,deleted_at,closed_at";

function isPending(status: string): boolean {
  return PENDING_STATUSES.includes(status.toLowerCase().trim());
}

function isCancelled(status: string): boolean {
  return ["cancelled", "canceled"].includes(status.toLowerCase().trim());
}

function isOnHold(holdUntil: string | null | undefined): boolean {
  return !!holdUntil && new Date(holdUntil).getTime() > Date.now();
}

function dateText(value: Date): string {
  return (
    value.toLocaleString("en-US", {
      timeZone: "America/New_York",
      dateStyle: "medium",
      timeStyle: "short",
    }) + " ET"
  );
}

async function sendEmail(
  templateId: string,
  order: Order,
  cancelledAt?: string | null
): Promise<void> {
  const userId =
    process.env.EMAILJS_PUBLIC_KEY || process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;
  const serviceId =
    process.env.EMAILJS_SERVICE_ID || process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
  const privateKey = process.env.EMAILJS_PRIVATE_KEY;

  if (!userId || !serviceId || !privateKey) {
    throw new Error("EmailJS server credentials are incomplete");
  }
  if (!order.customer_email?.trim()) {
    throw new Error("Order has no customer email address");
  }

  const created = new Date(order.created_at);
  const params = {
    name: order.customer_name || "Customer",
    customer_name: order.customer_name || "Customer",
    email: order.customer_email,
    to_email: order.customer_email,
    order_number: order.order_number,
    order_created_at: dateText(created),
    payment_deadline: dateText(new Date(created.getTime() + DAY_MS)),
    canceled_at: dateText(cancelledAt ? new Date(cancelledAt) : new Date()),
    cancellation_reason: order.cancellation_reason || "Payment not received within 24 hours",
  };

  const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: serviceId,
      template_id: templateId,
      user_id: userId,
      accessToken: privateKey,
      template_params: params,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    // Do not log customer details or secret credentials.
    const body = (await response.text()).slice(0, 180);
    throw new Error(`EmailJS returned HTTP ${response.status}: ${body}`);
  }
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: "Missing server Supabase configuration" },
      { status: 500 }
    );
  }

  const db = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const now = Date.now();
  const summary = {
    examined: 0,
    reminders: 0,
    cancellations: 0,
    cancellationEmails: 0,
    skipped: 0,
    errors: [] as string[],
  };

  async function getOrder(id: string): Promise<Order> {
    const { data, error } = await db
      .from("orders")
      .select(ORDER_COLUMNS)
      .eq("id", id)
      .single();
    if (error || !data) throw new Error(`Unable to read order: ${error?.message || "not found"}`);
    return data as Order;
  }

  async function getAutomationState(id: string): Promise<AutomationState> {
    const { data, error } = await db
      .from("pugpep_payment_automation")
      .select("hold_until,reminder_sent_at,cancellation_email_sent_at,cancellation_started_at")
      .eq("order_id", id)
      .single();
    if (error || !data) throw new Error(`Unable to read automation state: ${error?.message || "not found"}`);
    return data as AutomationState;
  }

  async function processUnpaidAction(order: Order, action: Action): Promise<void> {
    const { data: claimed, error: claimError } = await db.rpc(
      "pugpep_claim_unpaid_action",
      { p_order_id: order.id, p_action: action }
    );
    if (claimError) throw new Error(`Claim failed: ${claimError.message}`);
    if (!claimed) {
      summary.skipped++;
      return;
    }

    let delivered = false;
    try {
      const current = await getOrder(order.id);
      const state = await getAutomationState(order.id);

      if (isOnHold(state.hold_until) || current.deleted_at || current.closed_at) {
        summary.skipped++;
        return;
      }

      if (action === "reminder") {
        const age = Date.now() - new Date(current.created_at).getTime();
        if (!isPending(current.status) || age < FOUR_HOURS_MS || age >= DAY_MS || state.reminder_sent_at) {
          summary.skipped++;
          return;
        }

        // Re-read as close as practical to the external email request.
        const latest = await getOrder(order.id);
        const latestState = await getAutomationState(order.id);
        if (
          !isPending(latest.status) || latest.deleted_at || latest.closed_at ||
          isOnHold(latestState.hold_until) || latestState.reminder_sent_at
        ) {
          summary.skipped++;
          return;
        }

        await sendEmail(REMINDER_TEMPLATE, latest);
        summary.reminders++;
      } else {
        if (state.cancellation_email_sent_at) {
          summary.skipped++;
          return;
        }

        if (isPending(current.status)) {
          // Database function locks and re-checks payment status and holds.
          const { data: cancelled, error: cancellationError } = await db.rpc(
            "pugpep_auto_cancel_unpaid_order",
            { p_order_id: current.id }
          );
          if (cancellationError) {
            throw new Error(`Cancellation failed: ${cancellationError.message}`);
          }
          if (!cancelled) {
            summary.skipped++;
            return;
          }
          summary.cancellations++;
        } else if (!isCancelled(current.status) || !state.cancellation_started_at) {
          summary.skipped++;
          return;
        }

        const cancelledOrder = await getOrder(order.id);
        const finalState = await getAutomationState(order.id);
        if (
          !isCancelled(cancelledOrder.status) ||
          !finalState.cancellation_started_at ||
          finalState.cancellation_email_sent_at ||
          cancelledOrder.deleted_at || cancelledOrder.closed_at ||
          isOnHold(finalState.hold_until)
        ) {
          summary.skipped++;
          return;
        }

        await sendEmail(CANCELLATION_TEMPLATE, cancelledOrder, cancelledOrder.cancelled_at);
        summary.cancellationEmails++;
      }
      delivered = true;
    } finally {
      const { error: finishError } = await db.rpc("pugpep_finish_unpaid_action", {
        p_order_id: order.id,
        p_action: action,
        p_sent: delivered,
      });
      if (finishError) {
        summary.errors.push(`Finish tracking failed for ${order.order_number}: ${finishError.message}`);
      }
    }
  }

  // Only live, unpaid orders. Deleted and closed historical orders are excluded.
  const { data: due, error: dueError } = await db
    .from("orders")
    .select(ORDER_COLUMNS)
    .in("status", PENDING_STATUSES)
    .lt("created_at", new Date(now - FOUR_HOURS_MS).toISOString())
    .is("deleted_at", null)
    .is("closed_at", null)
    .order("created_at", { ascending: true })
    .limit(MAX_ORDERS_PER_RUN);
  if (dueError) return NextResponse.json({ error: dueError.message }, { status: 500 });

  for (const order of (due || []) as Order[]) {
    summary.examined++;
    const action: Action = new Date(order.created_at).getTime() <= now - DAY_MS
      ? "cancel"
      : "reminder";
    try {
      await processUnpaidAction(order, action);
    } catch (error) {
      summary.errors.push(`${order.order_number}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Retry a cancellation NOTICE only if cancellation was already performed
  // by this automation. Never cancel the same order again on a retry.
  const { data: retries, error: retryError } = await db
    .from("pugpep_payment_automation")
    .select("order_id")
    .not("cancellation_started_at", "is", null)
    .is("cancellation_email_sent_at", null)
    .limit(MAX_NOTICE_RETRIES_PER_RUN);

  if (retryError) summary.errors.push(`Retry lookup failed: ${retryError.message}`);

  for (const row of retries || []) {
    try {
      const order = await getOrder(row.order_id);
      if (!isCancelled(order.status) || order.deleted_at || order.closed_at) continue;
      await processUnpaidAction(order, "cancel");
    } catch (error) {
      summary.errors.push(`Cancellation notice retry: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // HTTP 207 indicates at least one action needs attention; the job itself ran.
  console.info("PugPep unpaid orders cron", {
    examined: summary.examined,
    reminders: summary.reminders,
    cancellations: summary.cancellations,
    cancellationEmails: summary.cancellationEmails,
    skipped: summary.skipped,
    errorCount: summary.errors.length,
  });
  return NextResponse.json(summary, { status: summary.errors.length ? 207 : 200 });
}
