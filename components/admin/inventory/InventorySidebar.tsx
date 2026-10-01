"use client";

import {
  useEffect,
  useState,
} from "react";

import type {
  useAdminInventory,
} from "../../../hooks/admin/useAdminInventory";

type AdminInventory =
  ReturnType<
    typeof useAdminInventory
  >;

type PendingVisibilityChange = {
  slug: string;
  nextActive: boolean;
} | null;

export default function InventorySidebar({
  admin,
}: {
  admin: AdminInventory;
}) {
  const {
    filteredProducts,
    selectedSlug,
    selectedProduct,
    search,
    setSearch,
    selectProduct,
    setProductActive,
    unhideProduct,
  } = admin;

  const [
    pendingVisibilityChange,
    setPendingVisibilityChange,
  ] =
    useState<PendingVisibilityChange>(
      null
    );

  useEffect(() => {
    if (
      !pendingVisibilityChange
    ) {
      return;
    }

    if (
      selectedSlug !==
      pendingVisibilityChange.slug
    ) {
      return;
    }

    if (
      selectedProduct.slug !==
      pendingVisibilityChange.slug
    ) {
      return;
    }

    const nextActive =
      pendingVisibilityChange
        .nextActive;

    setPendingVisibilityChange(
      null
    );

    void setProductActive(
      nextActive
    );
  }, [
    pendingVisibilityChange,
    selectedProduct.slug,
    selectedSlug,
    setProductActive,
  ]);

  async function toggleProductVisibility(
    product: {
      id: string;
      slug: string;
      is_active?: boolean | null;
    }
  ) {
    const currentlyActive =
      product.is_active !== false;

    const nextActive =
      !currentlyActive;

    if (nextActive) {
      await unhideProduct(
        product.id
      );

      return;
    }

    if (
      selectedSlug ===
        product.slug &&
      selectedProduct.id ===
        product.id
    ) {
      await setProductActive(
        false
      );

      return;
    }

    setPendingVisibilityChange({
      slug:
        product.slug,
      nextActive:
        false,
    });

    await selectProduct(
      product.slug
    );
  }

  return (
    <aside style={sidebar}>
      <div
        style={
          sidebarHeader
        }
      >
        <div>
          <p
            style={
              sectionEyebrow
            }
          >
            CATALOG
          </p>

          <h2
            style={
              sectionTitle
            }
          >
            Products
          </h2>
        </div>

        <span
          style={
            countBadge
          }
        >
          {
            filteredProducts.length
          }
        </span>
      </div>

      <input
        type="search"
        placeholder="Search products..."
        value={search}
        onChange={(
          event
        ) =>
          setSearch(
            event.target.value
          )
        }
        style={
          searchInput
        }
      />

      <div
        style={
          productList
        }
      >
        {filteredProducts.length ===
        0 ? (
          <p style={muted}>
            No matching products
            found.
          </p>
        ) : (
          filteredProducts.map(
            (product) => {
              const selected =
                selectedSlug ===
                product.slug;

              const visible =
                product.is_active !==
                false;

              const visibilityPending =
                pendingVisibilityChange
                  ?.slug ===
                product.slug;

              return (
                <div
                  key={
                    product.id
                  }
                  style={{
                    ...productListItem,

                    borderColor:
                      selected
                        ? product.color ||
                          "#00d9ff"
                        : "rgba(255,255,255,.10)",

                    background:
                      selected
                        ? `${
                            product.color ||
                            "#00d9ff"
                          }12`
                        : "rgba(255,255,255,.025)",

                    boxShadow:
                      selected
                        ? `0 0 16px ${
                            product.color ||
                            "#00d9ff"
                          }22`
                        : "none",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      void selectProduct(
                        product.slug
                      );
                    }}
                    style={
                      productSelectButton
                    }
                  >
                    <span
                      style={{
                        ...productColorDot,

                        background:
                          product.color ||
                          "#ff45d8",

                        boxShadow:
                          `0 0 10px ${
                            product.color ||
                            "#ff45d8"
                          }66`,
                      }}
                    />

                    <span
                      style={
                        productListCopy
                      }
                    >
                      <strong>
                        {
                          product.name
                        }
                      </strong>

                      <small>
                        {
                          product.slug
                        }
                      </small>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={(
                      event
                    ) => {
                      event.stopPropagation();

                      void toggleProductVisibility(
                        product
                      );
                    }}
                    disabled={
                      visibilityPending
                    }
                    style={{
                      ...visibilityButton,

                      color:
                        visible
                          ? "#00ff99"
                          : "#ffcc00",

                      opacity:
                        visibilityPending
                          ? 0.55
                          : 1,

                      cursor:
                        visibilityPending
                          ? "wait"
                          : "pointer",
                    }}
                    title={
                      visible
                        ? "Hide this product from the website"
                        : "Show this product on the website"
                    }
                    aria-label={
                      visible
                        ? `Hide ${product.name} from the website`
                        : `Show ${product.name} on the website`
                    }
                  >
                    <span
                      style={
                        visibilityText
                      }
                    >
                      {visibilityPending
                        ? "UPDATING"
                        : visible
                          ? "VISIBLE"
                          : "HIDDEN"}
                    </span>

                    <span
                      style={{
                        ...visibilitySwitch,

                        background:
                          visible
                            ? "rgba(0,255,153,.22)"
                            : "rgba(255,255,255,.09)",
                      }}
                    >
                      <span
                        style={{
                          ...visibilityKnob,

                          transform:
                            visible
                              ? "translateX(17px)"
                              : "translateX(0)",

                          background:
                            visible
                              ? "#00ff99"
                              : "#888892",

                          boxShadow:
                            visible
                              ? "0 0 8px rgba(0,255,153,.6)"
                              : "none",
                        }}
                      />
                    </span>
                  </button>
                </div>
              );
            }
          )
        )}
      </div>
    </aside>
  );
}

const sidebar = {
  padding: 21,

  border:
    "1px solid rgba(0,217,255,.32)",

  borderRadius: 18,

  background:
    "linear-gradient(145deg, rgba(8,8,12,.96), rgba(15,8,18,.94))",

  boxShadow:
    "0 0 20px rgba(0,217,255,.07)",
};

const sidebarHeader = {
  display:
    "flex",

  justifyContent:
    "space-between",

  alignItems:
    "center",

  gap: 15,
};

const sectionEyebrow = {
  margin: 0,

  color:
    "#00d9ff",

  fontSize: 14,

  fontWeight: 900,

  letterSpacing:
    ".13em",
};

const sectionTitle = {
  margin:
    "5px 0 0",

  color:
    "#7df9ff",

  fontSize: 31,
};

const countBadge = {
  padding:
    "8px 11px",

  border:
    "1px solid rgba(255,69,216,.44)",

  borderRadius: 999,

  background:
    "rgba(255,69,216,.07)",

  color:
    "#ff75df",

  fontSize: 13,

  fontWeight: 900,
};

const searchInput = {
  width:
    "100%",

  minHeight: 54,

  fontSize: 16,

  marginTop: 14,

  boxSizing:
    "border-box" as const,

  padding:
    "13px 15px",

  border:
    "1px solid rgba(255,255,255,.15)",

  borderRadius: 9,

  background:
    "#050507",

  color:
    "#ffffff",
};

const productList = {
  maxHeight:
    "68vh",

  marginTop: 12,

  display:
    "grid",

  gap: 8,

  overflowY:
    "auto" as const,
};

const productListItem = {
  width:
    "100%",

  minHeight: 66,

  padding:
    "10px 11px 10px 13px",

  display:
    "grid",

  gridTemplateColumns:
    "minmax(0, 1fr) auto",

  alignItems:
    "center",

  gap: 10,

  border:
    "1px solid",

  borderRadius: 10,

  color:
    "#ffffff",

  boxSizing:
    "border-box" as const,

  transition:
    "border-color .15s ease, background .15s ease, box-shadow .15s ease",
};

const productSelectButton = {
  minWidth: 0,

  width:
    "100%",

  padding: 0,

  border: 0,

  background:
    "transparent",

  color:
    "#ffffff",

  display:
    "grid",

  gridTemplateColumns:
    "12px minmax(0, 1fr)",

  alignItems:
    "center",

  gap: 12,

  textAlign:
    "left" as const,

  fontFamily:
    "inherit",

  cursor:
    "pointer",
};

const productColorDot = {
  width: 9,

  height: 9,

  borderRadius: 999,
};

const productListCopy = {
  minWidth: 0,

  display:
    "grid",

  gap: 3,
};

const visibilityButton = {
  flexShrink: 0,

  minWidth: 78,

  padding:
    "6px 7px",

  display:
    "grid",

  justifyItems:
    "center",

  gap: 5,

  border: 0,

  borderRadius: 9,

  background:
    "transparent",

  fontFamily:
    "inherit",

  transition:
    "all .16s ease",
};

const visibilityText = {
  fontSize: 9,

  lineHeight: 1,

  fontWeight: 950,

  letterSpacing:
    ".055em",
};

const visibilitySwitch = {
  width: 38,

  height: 21,

  padding: 2,

  display:
    "flex",

  alignItems:
    "center",

  border: 0,

  borderRadius: 999,

  boxSizing:
    "border-box" as const,

  transition:
    "all .16s ease",
};

const visibilityKnob = {
  width: 15,

  height: 15,

  borderRadius:
    "50%",

  transition:
    "transform .16s ease, background .16s ease, box-shadow .16s ease",
};

const muted = {
  color:
    "#a9a9b2",

  fontSize: 16,

  lineHeight: 1.7,
};