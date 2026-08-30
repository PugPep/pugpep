"use client";

import AddProductPanel from "../../../components/admin/products/AddProductPanel";
import DeletedProductsPanel from "../../../components/admin/products/DeletedProductsPanel";
import PricingStockPanel from "../../../components/admin/products/PricingStockPanel";
import ProductDetailsPanel from "../../../components/admin/products/ProductDetailsPanel";
import ProductSidebar from "../../../components/admin/products/ProductSidebar";
import ProductStats from "../../../components/admin/products/ProductStats";
import { useAdminProducts } from "../../../hooks/admin/useAdminProducts";

export default function AdminProductsPage() {
  const admin = useAdminProducts();

  if (admin.loading) {
    return <main style={page}>Loading...</main>;
  }

  if (!admin.authorized) {
    return (
      <main style={page}>
        <h1 style={{ color: "#ff45d8" }}>Access Denied</h1>
        <p>You must be logged in as admin.</p>
      </main>
    );
  }

  return (
    <main style={page}>
      <div style={container}>
        <header style={pageHeader}>
          <div>
            <p style={eyebrow}>CONTROL CENTER</p>
            <h1 style={pageTitle}>Laboratory Inventory</h1>
            <p style={subtitle}>
              Manage compounds, pricing, costs, availability, and inventory
              from one workspace.
            </p>
          </div>

          <div style={headerActions}>
            <button
              type="button"
              onClick={() =>
                admin.setShowAddProduct((current) => !current)
              }
              style={primaryButton}
            >
              + New Product
            </button>

            <button
              type="button"
              onClick={() =>
                admin.setShowDeleted((current) => !current)
              }
              style={secondaryButton}
            >
              Deleted Products
            </button>
          </div>
        </header>

        {admin.notice && (
          <div style={noticeBanner}>
            <span>{admin.notice}</span>

            <button
              type="button"
              onClick={() => admin.setNotice("")}
              style={noticeClose}
            >
              ×
            </button>
          </div>
        )}

        <ProductStats
          activeProducts={
            admin.products.filter((product) => product.is_active).length
          }
          comingSoonCount={admin.comingSoonCount}
          featuredCount={admin.featuredCount}
          deletedCount={admin.deletedProducts.length}
          totalOptions={admin.totalOptions}
          totalSingleInventory={admin.totalSingleInventory}
          preSaleOptions={admin.preSaleOptions}
          saleOptions={admin.saleOptions}
        />

        <div className="inventory-layout" style={workspace}>
          <ProductSidebar
            products={admin.filteredProducts}
            selectedSlug={admin.selectedSlug}
            search={admin.search}
            setSearch={admin.setSearch}
            statusFilter={admin.statusFilter}
            setStatusFilter={admin.setStatusFilter}
            selectProduct={admin.selectProduct}
          />

          <section style={contentStack}>
            {admin.showDeleted && (
              <DeletedProductsPanel
                products={admin.deletedProducts}
                onClose={() => admin.setShowDeleted(false)}
                restoreProduct={admin.restoreProduct}
              />
            )}

            {admin.showAddProduct && (
              <AddProductPanel
                newProduct={admin.newProduct}
                setNewProduct={admin.setNewProduct}
                onClose={() => admin.setShowAddProduct(false)}
                createProduct={admin.createProduct}
              />
            )}

            <PricingStockPanel
              selectedSlug={admin.selectedSlug}
              selectedProductName={admin.selectedProduct.name}
              showAddOption={admin.showAddOption}
              setShowAddOption={admin.setShowAddOption}
              newOption={admin.newOption}
              setNewOption={admin.setNewOption}
              options={admin.options}
              pricingDrafts={admin.pricingDrafts}
              inventory={admin.inventory}
              setInventory={admin.setInventory}
              addOptionAndInventory={admin.addOptionAndInventory}
              updateOption={admin.updateOption}
              updateOptionLocal={admin.updateOptionLocal}
              updatePricingDraft={admin.updatePricingDraft}
              updateInventory={admin.updateInventory}
            />

            <ProductDetailsPanel
              selectedSlug={admin.selectedSlug}
              selectedProduct={admin.selectedProduct}
              setSelectedProduct={admin.setSelectedProduct}
              updateProductField={admin.updateProductField}
              setProductActive={admin.setProductActive}
              saveProductChanges={admin.saveProductChanges}
              deleteProduct={admin.deleteProduct}
            />
          </section>
        </div>

        <style jsx>{`
          @media (max-width: 1040px) {
            .inventory-layout {
              grid-template-columns: minmax(0, 1fr) !important;
            }
          }

          @media (max-width: 720px) {
            .inventory-layout {
              gap: 16px !important;
            }

            button,
            input,
            select,
            textarea {
              font-size: 16px !important;
            }
          }
        `}</style>
      </div>
    </main>
  );
}

const page = {
  minHeight: "100vh",
  fontSize: 16,
  lineHeight: 1.5,
  padding: "clamp(18px, 4vw, 34px)",
  background:
    "radial-gradient(circle at 12% 0%, rgba(255,69,216,.12), transparent 30%), radial-gradient(circle at 88% 4%, rgba(0,217,255,.12), transparent 32%), #000000",
  color: "#ffffff",
};

const container = {
  width: "100%",
  maxWidth: 1480,
  margin: "0 auto",
};

const pageHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 20,
  flexWrap: "wrap" as const,
};

const eyebrow = {
  margin: 0,
  color: "#00d9ff",
  fontSize: 13,
  fontWeight: 900,
  letterSpacing: ".15em",
};

const pageTitle = {
  margin: "7px 0 0",
  color: "#ff45d8",
  fontSize: "clamp(44px, 7vw, 64px)",
  letterSpacing: "-.035em",
  textShadow: "0 0 18px rgba(255,69,216,.22)",
};

const subtitle = {
  maxWidth: 820,
  margin: "12px 0 0",
  color: "#c2c2ca",
  fontSize: 18,
  lineHeight: 1.7,
};

const headerActions = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap" as const,
};

const noticeBanner = {
  marginTop: 18,
  padding: "12px 14px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 15,
  border: "1px solid rgba(0,255,153,.45)",
  borderRadius: 11,
  background: "rgba(0,255,153,.08)",
  color: "#00ff99",
  fontWeight: 800,
};

const noticeClose = {
  border: 0,
  background: "transparent",
  color: "#00ff99",
  fontSize: 25,
  cursor: "pointer",
};

const workspace = {
  marginTop: 22,
  display: "grid",
  gridTemplateColumns: "320px minmax(0, 1fr)",
  gap: 20,
  alignItems: "start",
};

const contentStack = {
  display: "grid",
  gap: 18,
};

const primaryButton = {
  minHeight: 54,
  fontSize: 16,
  padding: "13px 18px",
  border: "1px solid #45d97a",
  borderRadius: 9,
  background: "linear-gradient(180deg, #2eea6f, #19b857)",
  color: "#ffffff",
  fontWeight: 900,
  cursor: "pointer",
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
