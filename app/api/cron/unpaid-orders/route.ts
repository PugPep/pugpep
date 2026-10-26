import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PENDING = ["pending", "unpaid", "awaiting payment", "awaiting_payment", "payment pending", "payment_pending"];
const FOUR_HOURS = 4 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

type Order = {
  id: string;
  order_number: string;
  customer_name: string | null;
  customer_email: string | null;
  created_at: string;
  status: string;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
};

function dateText(date: Date): string {
  return date.toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" }) + " ET";
}

async function sendEmail(template_id: string, order: Order, cancelledAt?: string | null) {
  const userId = process.env.EMAILJS_PUBLIC_KEY || process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;
  const serviceId = process.env.EMAILJS_SERVICE_ID || process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
  if (!userId || !serviceId) throw new Error("EmailJS service/user ID not configured");
  if (!order.customer_email) throw new Error("Missing customer email");
  const created = new Date(order.created_at);
  const params = {
    name: order.customer_name || "Customer",
    customer_name: order.customer_name || "Customer",
    email: order.customer_email,
    to_email: order.customer_email,
    order_number: order.order_number,
    order_created_at: dateText(created),
    payment_deadline: dateText(new Date(created.getTime() + DAY)),
    canceled_at: dateText(cancelledAt ? new Date(cancelledAt) : new Date()),
  };
  const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ service_id: serviceId, template_id, user_id: userId,
      ...(process.env.EMAILJS_PRIVATE_KEY ? { accessToken: process.env.EMAILJS_PRIVATE_KEY } : {}),
      template_params: params }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`EmailJS ${response.status}: ${(await response.text()).slice(0, 250)}`);
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return NextResponse.json({ error: "Missing server Supabase configuration" }, { status: 500 });
  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const now = Date.now();
  const summary = { reminders: 0, cancellations: 0, cancellationEmails: 0, skipped: 0, errors: [] as string[] };

  // Fetch pending orders older than four hours. The claim RPC revalidates statuses and holds atomically.
  const { data: due, error: dueError } = await db.from("orders")
    .select("id,order_number,customer_name,customer_email,created_at,status,cancelled_at,cancellation_reason")
    .in("status", PENDING)
    .lt("created_at", new Date(now - FOUR_HOURS).toISOString())
    .is("deleted_at", null)
    .is("closed_at", null)
    .order("created_at", { ascending: true })
    .limit(250);
  if (dueError) return NextResponse.json({ error: dueError.message }, { status: 500 });

  async function process(order: Order, action: "reminder" | "cancel") {
    const { data: claimed, error: claimError } = await db.rpc("pugpep_claim_unpaid_action", { p_order_id: order.id, p_action: action });
    if (claimError) throw new Error(`Claim failed for ${order.order_number}: ${claimError.message}`);
    if (!claimed) { summary.skipped++; return; }
    let delivered = false;
    try {
      // Read after claim to avoid sending based on stale page/list data.
      const { data: fresh, error } = await db.from("orders")
        .select("id,order_number,customer_name,customer_email,created_at,status,cancelled_at,cancellation_reason")
        .eq("id", order.id).single();
      if (error || !fresh) throw new Error(error?.message || "Order missing");
      const current = fresh as Order;
      if (action === "reminder") {
        if (!PENDING.includes(current.status.toLowerCase().trim())) return;
        await sendEmail("template_x2cjyqa", current);
        summary.reminders++;
      } else {
        if (PENDING.includes(current.status.toLowerCase().trim())) {
          // Atomic recheck of age, paid status, and payment-verification hold.
          const { data: cancelled, error: cancelError } = await db.rpc("pugpep_auto_cancel_unpaid_order", {
            p_order_id: current.id,
          });
          if (cancelError) throw new Error(`Cancellation failed: ${cancelError.message}`);
          if (!cancelled) return;
          summary.cancellations++;
        }
        const { data: canceled, error: verifyError } = await db.from("orders")
          .select("id,order_number,customer_name,customer_email,created_at,status,cancelled_at,cancellation_reason")
          .eq("id", current.id).single();
        if (verifyError || !canceled || !["cancelled", "canceled"].includes(String(canceled.status).toLowerCase())) {
          throw new Error("Cancellation not confirmed; customer not emailed");
        }
        await sendEmail("template_jqmyve8", canceled as Order, canceled.cancelled_at);
        summary.cancellationEmails++;
      }
      delivered = true;
    } finally {
      const { error: finishError } = await db.rpc("pugpep_finish_unpaid_action", {
        p_order_id: order.id, p_action: action, p_sent: delivered,
      });
      if (finishError) summary.errors.push(`Finish failed ${order.order_number}: ${finishError.message}`);
    }
  }

  for (const order of (due || []) as Order[]) {
    const action = new Date(order.created_at).getTime() <= now - DAY ? "cancel" : "reminder";
    try { await process(order, action); }
    catch (e) { summary.errors.push(`${order.order_number}: ${e instanceof Error ? e.message : String(e)}`); }
  }

  // If a cancellation succeeded but EmailJS failed, retry the cancellation NOTICE only.
  const { data: retryRows, error: retryError } = await db.from("pugpep_payment_automation")
    .select("order_id").not("cancellation_started_at", "is", null)
    .is("cancellation_email_sent_at", null).limit(100);
  if (retryError) summary.errors.push(retryError.message);
  for (const row of retryRows || []) {
    const { data: record, error } = await db.from("orders")
      .select("id,order_number,customer_name,customer_email,created_at,status,cancelled_at,cancellation_reason")
      .eq("id", row.order_id).single();
    if (error || !record || !["cancelled", "canceled"].includes(record.status.toLowerCase())) continue;
    try { await process(record as Order, "cancel"); }
    catch (e) { summary.errors.push(`${record.order_number}: ${e instanceof Error ? e.message : String(e)}`); }
  }
  return NextResponse.json(summary, { status: summary.errors.length ? 207 : 200 });
}
