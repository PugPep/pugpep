import Link from "next/link";

export default function AdminDashboardPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#000", color: "#fff", padding: 35 }}>
      <h1 style={{ color: "#ff45d8" }}>Admin Dashboard</h1>

      <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <AdminCard title="Orders" href="/admin" />
        <AdminCard title="Products" href="/admin/products" />
        <AdminCard title="Inventory" href="/admin/inventory" />
        <AdminCard title="Pricing / Options" href="/admin/options" />
      </div>
    </main>
  );
}

function AdminCard({ title, href }: { title: string; href: string }) {
  return (
    <Link
      href={href}
      style={{
        padding: 24,
        borderRadius: 16,
        background: "#111",
        border: "1px solid #333",
        color: "#fff",
        textDecoration: "none",
        fontWeight: "bold",
        boxShadow: "0 0 20px rgba(255,45,216,.18)",
      }}
    >
      {title}
    </Link>
  );
}