"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ArchivedProductsPanel from "../../../components/admin/inventory/ArchivedProductsPanel";
import DosageAccordion from "../../../components/admin/inventory/DosageAccordion";
import GlobalKitPricingPanel from "../../../components/admin/inventory/GlobalKitPricingPanel";
import InventorySidebar from "../../../components/admin/inventory/InventorySidebar";
import { useAdminInventory } from "../../../hooks/admin/useAdminInventory";
import { createClient } from "../../../lib/supabaseClient";

type ProcurementRow = {
  product_slug: string;
  product_name: string;
  dosage: string;
  quantity: number;
};

export default function InventoryManagerPage() {
  const admin = useAdminInventory();
  const supabase = useMemo(() => createClient(), []);

  const [procurementRows, setProcurementRows] =
    useState<ProcurementRow[]>([]);
  const [procurementLoading, setProcurementLoading] =
    useState(false);
  const [procurementNotice, setProcurementNotice] =
    useState("");
  const [restockTarget, setRestockTarget] =
    useState(50);

  const [procurementOpen, setProcurementOpen] =
    useState(false);

  async function loadProcurementList() {
    setProcurementLoading(true);
    setProcurementNotice("");

    try {
      const [inventoryResult, productsResult] =
        await Promise.all([
          supabase
            .from("inventory")
            .select(
              "product_slug,dosage,purchase_type,quantity"
            )
            .eq("purchase_type", "single"),
          supabase
            .from("products")
            .select(
              "name,slug,is_active,deleted_at"
            )
            .is("deleted_at", null),
        ]);

      if (inventoryResult.error) {
        throw inventoryResult.error;
      }

      if (productsResult.error) {
        throw productsResult.error;
      }

      const productMap =
        new Map<string, string>();

      for (const row of productsResult.data || []) {
        if (row.is_active !== false) {
          productMap.set(
            String(row.slug),
            String(row.name || row.slug)
          );
        }
      }

      const rows =
        (inventoryResult.data || [])
          .filter(
            (row) =>
              productMap.has(
                String(row.product_slug)
              ) &&
              Number(row.quantity || 0) < 20
          )
          .map((row) => ({
            product_slug:
              String(row.product_slug),
            product_name:
              productMap.get(
                String(row.product_slug)
              ) || String(row.product_slug),
            dosage:
              String(row.dosage || "Unspecified"),
            quantity:
              Math.max(
                0,
                Number(row.quantity || 0)
              ),
          }))
          .sort((a, b) => {
            if (a.quantity !== b.quantity) {
              return a.quantity - b.quantity;
            }

            const byName =
              a.product_name.localeCompare(
                b.product_name
              );

            if (byName !== 0) {
              return byName;
            }

            return a.dosage.localeCompare(
              b.dosage
            );
          });

      setProcurementRows(rows);
    } catch (error) {
      setProcurementRows([]);
      setProcurementNotice(
        error instanceof Error
          ? error.message
          : "Unable to generate procurement list."
      );
    } finally {
      setProcurementLoading(false);
    }
  }

  async function copyProcurementList() {
    if (procurementRows.length === 0) {
      setProcurementNotice(
        "There are no products below 20 vials."
      );
      return;
    }

    const target =
      Math.max(20, Number(restockTarget || 20));

    const lines = [
      `PugPep Procurement List — inventory below 20 vials`,
      `Restock target: ${target} vials`,
      "",
      ...procurementRows.map((row) => {
        const orderQty =
          Math.max(0, target - row.quantity);

        return `${row.product_name} | ${row.dosage} | On hand: ${row.quantity} | Suggested order: ${orderQty}`;
      }),
    ];

    try {
      await navigator.clipboard.writeText(
        lines.join("\n")
      );
      setProcurementNotice(
        "Procurement list copied."
      );
    } catch {
      setProcurementNotice(
        "Unable to copy the procurement list."
      );
    }
  }

  useEffect(() => {
    if (!admin.authorized) {
      return;
    }

    void loadProcurementList();
  }, [
    admin.authorized,
    admin.inventory,
  ]);

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

  const productManagerHref = admin.selectedSlug
    ? `/admin/product-manager?product=${encodeURIComponent(admin.selectedSlug)}`
    : "/admin/product-manager";

  return (
    <main style={page}>
      <div style={container}>
        <header style={pageHeader}>
          <div>
            <p style={eyebrow}>CONTROL CENTER</p>
            <h1 style={pageTitle}>Inventory Manager</h1>
            <p style={subtitle}>
              Manage dosages, pricing, costs, availability, stock levels, and
              procurement. Product creation and storefront product details now
              live in Product Manager.
            </p>
          </div>
        </header>

        <div style={headerActions}>
          <button
            type="button"
            onClick={() =>
              admin.setShowDeleted((current) => !current)
            }
            style={{
              ...headerActionButton,
              border: "1px solid rgba(0,217,255,.46)",
              background: "rgba(0,217,255,.06)",
              color: "#7df9ff",
            }}
          >
            Archived Products
          </button>

          <Link
            href={productManagerHref}
            style={{
              ...headerActionButton,
              border: "1px solid rgba(255,69,216,.55)",
              background: "rgba(255,69,216,.07)",
              color: "#ff75df",
              textDecoration: "none",
            }}
            title={
              admin.selectedSlug
                ? `Continue with ${admin.selectedProduct.name || admin.selectedSlug} in Product Manager`
                : "Create products and edit product details"
            }
          >
            Product Manager
          </Link>
        </div>

        {admin.selectedSlug && (
          <div style={handoffBanner}>
            <div>
              <strong style={{ color: "#ffffff" }}>
                {admin.selectedProduct.name || admin.selectedSlug}
              </strong>
              <span style={handoffText}>
                {" "}
                is selected. Manage its dosage, pricing, and stock here, or
                continue to Product Manager for storefront details.
              </span>
            </div>

            <Link href={productManagerHref} style={handoffLink}>
              Continue with this product →
            </Link>
          </div>
        )}

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

        <section style={statusBar}>
          <div style={statusCard}>
            <span style={{ ...statusLabel, color: "#00ff99" }}>
              ACTIVE PRODUCTS
            </span>
            <strong style={statusValue}>
              {
                admin.products.filter(
                  (product) =>
                    product.is_active !== false
                ).length
              }
            </strong>
          </div>

          <div style={statusCard}>
            <span style={{ ...statusLabel, color: "#00d9ff" }}>
              ARCHIVED PRODUCTS
            </span>
            <strong style={statusValue}>
              {admin.deletedProducts.length}
            </strong>
          </div>

          <div style={statusCard}>
            <span style={{ ...statusLabel, color: "#ff75df" }}>
              HIDDEN PRODUCTS
            </span>
            <strong style={statusValue}>
              {
                admin.products.filter(
                  (product) =>
                    product.is_active === false
                ).length
              }
            </strong>
          </div>

          <div style={statusCard}>
            <span style={{ ...statusLabel, color: "#ffcc00" }}>
              PRODUCTS NEEDING RESTOCK
            </span>
            <strong style={statusValue}>
              {procurementRows.length}
            </strong>
          </div>
        </section>

        <GlobalKitPricingPanel admin={admin} />

        <section style={procurementPanel}>
          <button
            type="button"
            onClick={() =>
              setProcurementOpen(
                (current) => !current
              )
            }
            style={procurementToggle}
            aria-expanded={procurementOpen}
          >
            <div>
              <p style={procurementEyebrow}>
                LOW STOCK • PROCUREMENT
              </p>

              <h2 style={procurementTitle}>
                Products Below 20 Vials
              </h2>

              <p style={procurementHelp}>
                Automatically lists active single-vial inventory with fewer
                than 20 vials on hand.
              </p>
            </div>

            <div style={procurementToggleRight}>
              <span style={procurementCountBadge}>
                {procurementRows.length} item
                {procurementRows.length === 1
                  ? ""
                  : "s"}
              </span>

              <span
                style={{
                  ...procurementArrow,
                  transform: procurementOpen
                    ? "rotate(180deg)"
                    : "rotate(0deg)",
                }}
                aria-hidden="true"
              >
                ▼
              </span>
            </div>
          </button>

          {procurementOpen && (
            <div style={procurementContent}>
              <div style={procurementActions}>
                <label style={targetField}>
                  <span style={targetLabel}>
                    RESTOCK TARGET
                  </span>

                  <input
                    type="number"
                    min="20"
                    value={restockTarget}
                    onChange={(event) =>
                      setRestockTarget(
                        Math.max(
                          20,
                          Number(
                            event.target.value ||
                              20
                          )
                        )
                      )
                    }
                    style={targetInput}
                  />
                </label>

                <button
                  type="button"
                  onClick={() =>
                    void loadProcurementList()
                  }
                  style={secondaryButton}
                >
                  {procurementLoading
                    ? "Refreshing..."
                    : "Refresh List"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void copyProcurementList()
                  }
                  style={primaryButton}
                >
                  Copy Procurement List
                </button>
              </div>

              {procurementNotice && (
                <div style={procurementMessage}>
                  {procurementNotice}
                </div>
              )}

              {procurementLoading ? (
                <div style={procurementEmpty}>
                  Generating procurement list...
                </div>
              ) : procurementRows.length === 0 ? (
                <div style={procurementEmpty}>
                  No active products are currently below 20 vials.
                </div>
              ) : (
                <div style={procurementTableWrap}>
                  <table style={procurementTable}>
                    <thead>
                      <tr>
                        <th style={procurementTh}>
                          Product
                        </th>
                        <th style={procurementTh}>
                          Dosage
                        </th>
                        <th style={procurementTh}>
                          On Hand
                        </th>
                        <th style={procurementTh}>
                          Low-Stock Trigger
                        </th>
                        <th style={procurementTh}>
                          Suggested Order
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {procurementRows.map(
                        (row) => {
                          const target =
                            Math.max(
                              20,
                              Number(
                                restockTarget ||
                                  20
                              )
                            );

                          return (
                            <tr
                              key={`${row.product_slug}-${row.dosage}`}
                            >
                              <td style={procurementTd}>
                                <strong>
                                  {row.product_name}
                                </strong>
                              </td>

                              <td style={procurementTd}>
                                {row.dosage}
                              </td>

                              <td style={procurementTd}>
                                <span
                                  style={{
                                    color:
                                      row.quantity <= 5
                                        ? "#ff5a5a"
                                        : row.quantity <= 10
                                          ? "#ffcc00"
                                          : "#ffffff",
                                    fontWeight: 900,
                                  }}
                                >
                                  {row.quantity}
                                </span>
                              </td>

                              <td style={procurementTd}>
                                20 vials
                              </td>

                              <td style={procurementTd}>
                                <strong
                                  style={{
                                    color:
                                      "#00ff99",
                                  }}
                                >
                                  {Math.max(
                                    0,
                                    target -
                                      row.quantity
                                  )}{" "}
                                  vials
                                </strong>
                              </td>
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </section>

        <div className="inventory-layout" style={workspace}>
          <InventorySidebar admin={admin} />

          <section style={contentStack}>
            {admin.showDeleted && (
              <ArchivedProductsPanel admin={admin} />
            )}

            <DosageAccordion admin={admin} />
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

const statusBar = {
  marginTop: 22,
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(210px, 1fr))",
  gap: 14,
};

const statusCard = {
  minHeight: 104,
  padding: "18px 20px",
  borderRadius: 16,
  border:
    "1px solid rgba(255,255,255,.12)",
  background:
    "linear-gradient(145deg, rgba(12,12,17,.95), rgba(6,6,9,.96))",
  display: "grid",
  alignContent: "center",
  gap: 7,
};

const statusLabel = {
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: ".1em",
  textTransform: "uppercase" as const,
};

const statusValue = {
  fontSize: 32,
  lineHeight: 1,
  color: "#ffffff",
};

const headerActionButton = {
  width: 190,
  minWidth: 190,
  height: 54,
  minHeight: 54,
  padding: "0 18px",
  borderRadius: 9,
  fontSize: 16,
  lineHeight: 1,
  fontWeight: 900,
  fontFamily: "inherit",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center" as const,
  boxSizing: "border-box" as const,
  cursor: "pointer",
  whiteSpace: "nowrap" as const,
};

const procurementPanel = {
  marginTop: 22,
  padding: "clamp(18px, 3vw, 24px)",
  border: "1px solid rgba(255,204,0,.34)",
  borderRadius: 18,
  background:
    "linear-gradient(145deg, rgba(255,204,0,.055), rgba(8,8,12,.96))",
};

const procurementToggle = {
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 18,
  padding: 0,
  border: 0,
  background: "transparent",
  color: "#ffffff",
  cursor: "pointer",
  textAlign: "left" as const,
};

const procurementToggleRight = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  flexShrink: 0,
};

const procurementCountBadge = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 54,
  padding: "6px 9px",
  borderRadius: 999,
  border: "1px solid rgba(255,204,0,.32)",
  background: "rgba(255,204,0,.08)",
  color: "#ffcc00",
  fontSize: 11,
  fontWeight: 900,
};

const procurementArrow = {
  color: "#ffcc00",
  fontSize: 15,
  transition: "transform .2s ease",
};

const procurementContent = {
  marginTop: 18,
  paddingTop: 18,
  borderTop: "1px solid rgba(255,255,255,.08)",
};

const procurementEyebrow = {
  margin: 0,
  color: "#ffcc00",
  fontSize: 12,
  fontWeight: 950,
  letterSpacing: ".13em",
};

const procurementTitle = {
  margin: "5px 0 0",
  fontSize: 26,
  color: "#ffffff",
};

const procurementHelp = {
  margin: "7px 0 0",
  color: "#aaaab3",
};

const procurementActions = {
  display: "flex",
  alignItems: "flex-end",
  gap: 10,
  flexWrap: "wrap" as const,
};

const targetField = {
  display: "grid",
  gap: 5,
};

const targetLabel = {
  color: "#aaaab3",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: ".1em",
};

const targetInput = {
  width: 110,
  minHeight: 42,
  padding: "9px 10px",
  borderRadius: 9,
  border: "1px solid rgba(255,255,255,.15)",
  background: "#080808",
  color: "#ffffff",
};

const procurementMessage = {
  marginTop: 14,
  padding: "10px 12px",
  borderRadius: 10,
  background: "rgba(0,217,255,.07)",
  color: "#7df9ff",
  fontWeight: 800,
};

const procurementEmpty = {
  marginTop: 16,
  padding: 18,
  borderRadius: 12,
  border: "1px dashed rgba(255,255,255,.16)",
  color: "#aaaab3",
};

const procurementTableWrap = {
  marginTop: 18,
  overflowX: "auto" as const,
};

const procurementTable = {
  width: "100%",
  borderCollapse: "collapse" as const,
  minWidth: 720,
};

const procurementTh = {
  padding: "10px 12px",
  textAlign: "left" as const,
  borderBottom: "1px solid rgba(255,255,255,.15)",
  color: "#ffcc00",
  fontSize: 11,
  letterSpacing: ".08em",
  textTransform: "uppercase" as const,
};

const procurementTd = {
  padding: "12px",
  borderBottom: "1px solid rgba(255,255,255,.07)",
  color: "#d7d7dd",
};

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
  marginTop: 18,
  display: "flex",
  gap: 12,
  flexWrap: "wrap" as const,
  alignItems: "center",
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

const handoffBanner = {
  marginTop: 18,
  padding: "14px 16px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 15,
  flexWrap: "wrap" as const,
  border: "1px solid rgba(255,69,216,.35)",
  borderRadius: 12,
  background:
    "linear-gradient(90deg, rgba(255,69,216,.08), rgba(0,217,255,.045))",
};

const handoffText = {
  color: "#aaaab3",
};

const handoffLink = {
  color: "#7df9ff",
  textDecoration: "none",
  fontWeight: 950,
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

const productManagerButton = {
  ...secondaryButton,
  minHeight: 54,
  display: "inline-flex",
  alignItems: "center",
  textDecoration: "none",
  border: "1px solid rgba(255,69,216,.55)",
  background: "rgba(255,69,216,.07)",
  color: "#ff75df",
};
