"use client";

import type { useAdminInventory } from "../../../hooks/admin/useAdminInventory";

type AdminInventory = ReturnType<typeof useAdminInventory>;

export default function InventorySidebar({
  admin,
}: {
  admin: AdminInventory;
}) {
  const {
    filteredProducts,
    selectedSlug,
    search,
    setSearch,
    selectProduct,
  } = admin;

  return (
          <aside style={sidebar}>
            <div style={sidebarHeader}>
              <div>
                <p style={sectionEyebrow}>CATALOG</p>
                <h2 style={sectionTitle}>Products</h2>
              </div>

              <span style={countBadge}>
                {filteredProducts.length}
              </span>
            </div>

            <input
              type="search"
              placeholder="Search products..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={searchInput}
            />

            <div style={productList}>
              {filteredProducts.length === 0 ? (
                <p style={muted}>No matching products found.</p>
              ) : (
                filteredProducts.map((product) => {
                  const selected = selectedSlug === product.slug;

                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => {
                        void selectProduct(product.slug);
                      }}
                      style={{
                        ...productListItem,
                        borderColor: selected
                          ? product.color || "#00d9ff"
                          : "rgba(255,255,255,.10)",
                        background: selected
                          ? `${product.color || "#00d9ff"}12`
                          : "rgba(255,255,255,.025)",
                        boxShadow: selected
                          ? `0 0 16px ${product.color || "#00d9ff"}22`
                          : "none",
                      }}
                    >
                      <span
                        style={{
                          ...productColorDot,
                          background: product.color || "#ff45d8",
                          boxShadow: `0 0 10px ${product.color || "#ff45d8"}66`,
                        }}
                      />

                      <span style={productListCopy}>
                        <strong>{product.name}</strong>
                        <small>{product.slug}</small>
                      </span>

                      <span
                        style={{
                          ...productCategory,
                          color: product.is_active
                            ? "#8f8f98"
                            : "#ffcc00",
                        }}
                      >
                        {product.is_active
                          ? product.category === "lab-material"
                            ? "Material"
                            : "Compound"
                          : "HIDDEN"}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </aside>
  );
}

const sidebar = {
  padding: 21,
  border: "1px solid rgba(0,217,255,.32)",
  borderRadius: 18,
  background:
    "linear-gradient(145deg, rgba(8,8,12,.96), rgba(15,8,18,.94))",
  boxShadow: "0 0 20px rgba(0,217,255,.07)",
};

const sidebarHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 15,
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

const countBadge = {
  padding: "8px 11px",
  border: "1px solid rgba(255,69,216,.44)",
  borderRadius: 999,
  background: "rgba(255,69,216,.07)",
  color: "#ff75df",
  fontSize: 13,
  fontWeight: 900,
};

const searchInput = {
  width: "100%",
  minHeight: 54,
  fontSize: 16,
  marginTop: 14,
  boxSizing: "border-box" as const,
  padding: "13px 15px",
  border: "1px solid rgba(255,255,255,.15)",
  borderRadius: 9,
  background: "#050507",
  color: "#ffffff",
};

const productList = {
  maxHeight: "68vh",
  marginTop: 12,
  display: "grid",
  gap: 8,
  overflowY: "auto" as const,
};

const productListItem = {
  width: "100%",
  padding: 15,
  display: "grid",
  gridTemplateColumns: "12px minmax(0, 1fr) auto",
  alignItems: "center",
  gap: 12,
  border: "1px solid",
  borderRadius: 10,
  color: "#ffffff",
  textAlign: "left" as const,
  cursor: "pointer",
};

const productColorDot = {
  width: 9,
  height: 9,
  borderRadius: 999,
};

const productListCopy = {
  minWidth: 0,
  display: "grid",
  gap: 3,
};

const productCategory = {
  color: "#8f8f98",
  fontSize: 14,
  fontWeight: 800,
};

const muted = {
  color: "#a9a9b2",
  fontSize: 16,
  lineHeight: 1.7,
};