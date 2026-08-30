

import type { Product } from "../../../lib/admin/productTypes";

type Props = {
  products: Product[];
  onClose: () => void;
  restoreProduct: (productId: string) => Promise<void>;
};

export default function DeletedProductsPanel({
  products,
  onClose,
  restoreProduct,
}: Props) {
  return (
    <section style={panel}>
      <div style={panelHeader}>
        <div>
          <p style={sectionEyebrow}>DELETED</p>
          <h2 style={sectionTitle}>Deleted Products</h2>
        </div>

        <button type="button" onClick={onClose} style={closeButton}>
          Close
        </button>
      </div>

      {products.length === 0 ? (
        <p style={muted}>No archived products found.</p>
      ) : (
        <div style={restoreGrid}>
          {products.map((product) => (
            <div key={product.id} style={restoreCard}>
              <div>
                <strong style={restoreName}>{product.name}</strong>
                <span style={restoreSlug}>{product.slug}</span>
              </div>

              <button
                type="button"
                onClick={() => void restoreProduct(product.id)}
                style={secondaryButton}
              >
                Restore
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const panel = {
  padding: "clamp(18px, 3vw, 24px)",
  border: "1px solid rgba(0,217,255,.32)",
  borderRadius: 18,
  background:
    "linear-gradient(145deg, rgba(8,8,12,.96), rgba(15,8,18,.94))",
  boxShadow: "0 0 20px rgba(0,217,255,.07)",
};

const panelHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 14,
  flexWrap: "wrap" as const,
  marginBottom: 16,
};

const sectionEyebrow = {
  margin: 0,
  color: "#00d9ff",
  fontSize: 14,
  fontWeight: 900,
  letterSpacing: ".13em",
};

const sectionTitle = {
  margin: "5px 0 0",
  color: "#7df9ff",
  fontSize: 31,
};

const closeButton = {
  minHeight: 40,
  padding: "9px 12px",
  border: "1px solid rgba(255,255,255,.18)",
  borderRadius: 9,
  background: "rgba(255,255,255,.04)",
  color: "#ccccd2",
  cursor: "pointer",
  fontWeight: 800,
};

const restoreGrid = {
  display: "grid",
  gap: 12,
};

const restoreCard = {
  padding: 15,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 15,
  border: "1px solid rgba(255,255,255,.10)",
  borderRadius: 10,
  background: "rgba(0,0,0,.24)",
};

const restoreName = {
  display: "block",
  color: "#ffffff",
};

const restoreSlug = {
  display: "block",
  marginTop: 3,
  color: "#8f8f98",
  fontSize: 14,
};

const secondaryButton = {
  minHeight: 54,
  fontSize: 16,
  padding: "13px 18px",
  border: "1px solid rgba(0,217,255,.46)",
  borderRadius: 9,
  background: "rgba(0,217,255,.06)",
  color: "#7df9ff",
  fontWeight: 900,
  cursor: "pointer",
};

const muted = {
  color: "#a9a9b2",
  fontSize: 16,
  lineHeight: 1.7,
};
