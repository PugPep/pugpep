"use client";

type Props = {
  activeProducts: number;
  comingSoonCount: number;
  featuredCount: number;
  deletedCount: number;
  totalOptions: number;
  totalSingleInventory: number;
  preSaleOptions: number;
  saleOptions: number;
};

export default function ProductStats({
  activeProducts,
  comingSoonCount,
  featuredCount,
  deletedCount,
  totalOptions,
  totalSingleInventory,
  preSaleOptions,
  saleOptions,
}: Props) {
  return (
    <section style={statsGrid}>
      <StatCard label="Active Products" value={String(activeProducts)} accent="#00d9ff" />
      <StatCard label="Coming Soon" value={String(comingSoonCount)} accent="#ffcc00" />
      <StatCard label="Featured" value={String(featuredCount)} accent="#ff75df" />
      <StatCard label="Deleted Products" value={String(deletedCount)} accent="#b8bcc4" />
      <StatCard label="Selected Options" value={String(totalOptions)} accent="#ff45d8" />
      <StatCard label="Single Units" value={String(totalSingleInventory)} accent="#00ff99" />
      <StatCard label="Pre-Sale Options" value={String(preSaleOptions)} accent="#ffcc00" />
      <StatCard label="Sale Options" value={String(saleOptions)} accent="#ff75df" />
    </section>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div
      style={{
        ...statCard,
        borderColor: `${accent}55`,
        boxShadow: `0 0 18px ${accent}18`,
      }}
    >
      <span style={{ ...statLabel, color: accent }}>{label}</span>
      <strong style={statValue}>{value}</strong>
    </div>
  );
}

const statsGrid = {
  marginTop: 22,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 16,
};

const statCard = {
  padding: 21,
  display: "grid",
  gap: 7,
  border: "1px solid",
  borderRadius: 18,
  background:
    "linear-gradient(145deg, rgba(12,12,17,.95), rgba(6,6,9,.96))",
};

const statLabel = {
  fontSize: 14,
  fontWeight: 900,
  letterSpacing: ".1em",
  textTransform: "uppercase" as const,
};

const statValue = {
  fontSize: 34,
};
