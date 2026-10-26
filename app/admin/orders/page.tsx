/**
 * PUGPEP — ADMIN ORDERS ROUTE
 * FILE: app/admin/orders/page.tsx
 * ROUTE: /admin/orders
 *
 * Redirects to the canonical Operations Center at /admin.
 * Individual orders remain at /admin/orders/[id].
 * The product details page remains at /products/[slug].
 */

import { redirect } from "next/navigation";

export default function AdminOrdersPage() {
  redirect("/admin");
}