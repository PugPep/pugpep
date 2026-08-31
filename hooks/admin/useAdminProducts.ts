"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../lib/supabaseClient";
import type {
  InventoryItem,
  NewOptionDraft,
  NewProductDraft,
  PricingDraft,
  Product,
  ProductOption,
} from "../../lib/admin/productTypes";


const emptyNewOption: NewOptionDraft = {
  dosage: "",
  purchase_type: "single",
  price: "",
  cost: "",
  status: "in stock",
  quantity: "",
};

const emptyNewProduct: NewProductDraft = {
  name: "",
  slug: "",
  color: "#ff45d8",
  image: "",
  short_description: "",
  description: "",
  category: "peptide",
  is_active: true,
  is_new: false,
  feature_on_homepage: false,
  new_until: null,
  homepage_feature_order: null,
  is_coming_soon: false,
  coming_soon_date: null,
};

export function useAdminProducts() {
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [deletedProducts, setDeletedProducts] = useState<Product[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Partial<Product>>({});

  const [options, setOptions] = useState<ProductOption[]>([]);
  const [pricingDrafts, setPricingDrafts] = useState<Record<string, PricingDraft>>({});
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [showAddOption, setShowAddOption] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "live" | "coming-soon" | "new" | "featured" | "hidden"
  >("all");

  const [notice, setNotice] = useState("");
  const [newProduct, setNewProduct] = useState<NewProductDraft>(emptyNewProduct);
  const [newOption, setNewOption] = useState<NewOptionDraft>(emptyNewOption);

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();
            const {
              data: adminAccess,
              error: adminAccessError,
            } = await supabase.rpc("is_pugpep_admin");

            if (adminAccessError || !adminAccess) {
              setAuthorized(false);
              setLoading(false);
              return;
            }

            setAuthorized(true);
      await loadProducts();
      await loadDeletedProducts();
      setLoading(false);
    }

    void init();
  }, [supabase]);

  function getSingleStatus(quantity: number) {
    return quantity > 0 ? "in stock" : "out of stock";
  }

  function getKitStatus(quantity: number) {
    return quantity >= 10 ? "in stock" : "pre-sale";
  }

  async function loadProducts() {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .is("deleted_at", null)
      .order("name", { ascending: true });

    if (error) alert(error.message);
    else setProducts((data || []) as Product[]);
  }

  async function loadDeletedProducts() {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .not("deleted_at", "is", null)
      .order("name", { ascending: true });

    if (error) alert(error.message);
    else setDeletedProducts((data || []) as Product[]);
  }

  async function selectProduct(slug: string) {
    setSelectedSlug(slug);

    const found = products.find((p) => p.slug === slug);
    setSelectedProduct(found || {});

    if (!slug) {
      setOptions([]);
      setInventory([]);
      return;
    }

    await loadOptions(slug);
    await loadInventory(slug);
  }

  async function loadOptions(slug: string) {
    const { data, error } = await supabase
      .from("product_options")
      .select("*")
      .eq("product_slug", slug)
      .order("dosage", { ascending: true });

    if (error) {
      alert(error.message);
      return;
    }

    const rows = (data || []) as ProductOption[];
    setOptions(rows);

    setPricingDrafts(
      Object.fromEntries(
        rows.map((option) => [
          option.id,
          {
            price: String(option.price ?? 0),
            cost: String(option.cost ?? 0),
            salePercent: String(option.sale_percent ?? 0),
          },
        ])
      )
    );
  }

  async function loadInventory(slug: string) {
    const { data, error } = await supabase
      .from("inventory")
      .select("*")
      .eq("product_slug", slug)
      .order("dosage", { ascending: true });

    if (error) alert(error.message);
    else setInventory((data || []) as InventoryItem[]);
  }

  function updateProductField(field: keyof Product, value: string | boolean) {
    setSelectedProduct((prev) => ({ ...prev, [field]: value }));
  }

  async function saveProductChanges() {
    if (!selectedProduct.id) return alert("Select a product first.");

    const { error } = await supabase
      .from("products")
      .update({
        name: selectedProduct.name,
        slug: selectedProduct.slug,
        category: selectedProduct.category,
        color: selectedProduct.color,
        image: selectedProduct.image,
        short_description: selectedProduct.short_description,
        description: selectedProduct.description,
        is_active: selectedProduct.is_active,
        is_new: selectedProduct.is_new ?? false,
        feature_on_homepage: selectedProduct.feature_on_homepage ?? false,
        new_until: selectedProduct.new_until || null,
        homepage_feature_order:
          selectedProduct.homepage_feature_order === undefined ||
          selectedProduct.homepage_feature_order === null
            ? null
            : Number(selectedProduct.homepage_feature_order),
        is_coming_soon: selectedProduct.is_coming_soon ?? false,
        coming_soon_date: selectedProduct.coming_soon_date || null,
      })
      .eq("id", selectedProduct.id);

    if (error) {
      alert(error.message);
      return;
    }

    setNotice("Product updated.");
    await loadProducts();
  }

  async function createProduct() {
    if (!newProduct.name || !newProduct.slug) {
      alert("Product name and slug are required.");
      return;
    }

    const { error } = await supabase.from("products").insert(newProduct);

    if (error) {
      alert(error.message);
      return;
    }

    setNotice("Product created.");
    setNewProduct(emptyNewProduct);
    setShowAddProduct(false);
    await loadProducts();
  }

  async function deleteProduct() {
    if (!selectedProduct.id || !selectedSlug) {
      alert("Select a product first.");
      return;
    }

    const confirmDelete = window.confirm(
      `Delete ${selectedProduct.name}?\n\nThe product will be removed from the customer site and moved to Deleted Products. It can be restored later.`
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("products")
      .update({
        is_active: false,
        deleted_at: new Date().toISOString(),
      })
      .eq("id", selectedProduct.id);

    if (error) {
      alert(error.message);
      return;
    }

    setNotice("Product moved to Deleted Products.");
    setSelectedSlug("");
    setSelectedProduct({});
    setOptions([]);
    setInventory([]);

    await loadProducts();
    await loadDeletedProducts();
  }

  async function restoreProduct(productId: string) {
    const { error } = await supabase
      .from("products")
      .update({
        deleted_at: null,
        is_active: false,
      })
      .eq("id", productId);

    if (error) {
      alert(error.message);
      return;
    }

    setNotice(
      "Product restored. It is still hidden from customers until Active Product is checked."
    );

    await loadProducts();
    await loadDeletedProducts();
  }

  async function setProductActive(nextActive: boolean) {
    if (!selectedProduct.id) {
      alert("Select a product first.");
      return;
    }

    setSelectedProduct((previous) => ({
      ...previous,
      is_active: nextActive,
    }));

    setProducts((previous) =>
      previous.map((row) =>
        row.id === selectedProduct.id
          ? { ...row, is_active: nextActive }
          : row
      )
    );

    const { error } = await supabase
      .from("products")
      .update({ is_active: nextActive })
      .eq("id", selectedProduct.id);

    if (error) {
      alert(error.message);

      setSelectedProduct((previous) => ({
        ...previous,
        is_active: !nextActive,
      }));

      await loadProducts();
      return;
    }

    setNotice(
      nextActive
        ? "Product is active and visible to customers."
        : "Product is inactive and hidden from customers."
    );
  }

  function updateOptionLocal(
    id: string,
    field: keyof ProductOption,
    value: string | number | boolean
  ) {
    setOptions((previous) =>
      previous.map((row) =>
        row.id === id ? { ...row, [field]: value } : row
      )
    );
  }

  function updatePricingDraft(
    optionId: string,
    patch: Partial<PricingDraft>
  ) {
    setPricingDrafts((previous) => ({
      ...previous,
      [optionId]: {
        price: previous[optionId]?.price ?? "0",
        cost: previous[optionId]?.cost ?? "0",
        salePercent: previous[optionId]?.salePercent ?? "0",
        ...patch,
      },
    }));
  }

  async function updateOption(
    id: string,
    field: string,
    value: string | number | boolean
  ) {
    const { error } = await supabase
      .from("product_options")
      .update({ [field]: value })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    if (selectedSlug) await loadOptions(selectedSlug);
  }

  async function updateInventory(id: string, quantity: number) {
    const safeQuantity = Math.max(0, Number(quantity));
    const inventoryRow = inventory.find((row) => row.id === id);

    if (!inventoryRow) {
      alert("Inventory row not found.");
      return;
    }

    const singleStatus = getSingleStatus(safeQuantity);
    const kitStatus = getKitStatus(safeQuantity);

    const { error: inventoryError } = await supabase
      .from("inventory")
      .update({
        quantity: safeQuantity,
        status: singleStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (inventoryError) {
      alert(inventoryError.message);
      return;
    }

    const { error: singleError } = await supabase
      .from("product_options")
      .update({ status: singleStatus })
      .eq("product_slug", inventoryRow.product_slug)
      .eq("dosage", inventoryRow.dosage)
      .eq("purchase_type", "single");

    if (singleError) {
      alert(singleError.message);
      return;
    }

    const { error: kitError } = await supabase
      .from("product_options")
      .update({ status: kitStatus })
      .eq("product_slug", inventoryRow.product_slug)
      .eq("dosage", inventoryRow.dosage)
      .eq("purchase_type", "kit");

    if (kitError) {
      alert(kitError.message);
      return;
    }

    if (selectedSlug) {
      await loadOptions(selectedSlug);
      await loadInventory(selectedSlug);
    }
  }

  async function addOptionAndInventory() {
    if (!selectedSlug) {
      alert("Select a product first.");
      return;
    }

    if (!newOption.dosage || !newOption.price) {
      alert("Dosage and price are required.");
      return;
    }

    const qty = Math.max(0, Number(newOption.quantity || 0));

    const autoStatus =
      newOption.purchase_type === "kit"
        ? getKitStatus(qty)
        : getSingleStatus(qty);

    const { error: optionError } = await supabase.from("product_options").insert({
      product_slug: selectedSlug,
      dosage: newOption.dosage,
      purchase_type: newOption.purchase_type,
      price: Number(newOption.price),
      cost: Number(newOption.cost || 0),
      status: autoStatus,
      sale_active: false,
      sale_percent: 0,
    });

    if (optionError) {
      alert(optionError.message);
      return;
    }

    if (newOption.purchase_type === "single") {
      const { error: inventoryError } = await supabase.from("inventory").insert({
        product_slug: selectedSlug,
        dosage: newOption.dosage,
        purchase_type: "single",
        quantity: qty,
        status: getSingleStatus(qty),
      });

      if (inventoryError) {
        alert(inventoryError.message);
        return;
      }

      await supabase
        .from("product_options")
        .update({ status: getKitStatus(qty) })
        .eq("product_slug", selectedSlug)
        .eq("dosage", newOption.dosage)
        .eq("purchase_type", "kit");
    }

    setNewOption(emptyNewOption);
    setShowAddOption(false);

    await loadOptions(selectedSlug);
    await loadInventory(selectedSlug);
  }

  const filteredProducts = products.filter((product) => {
    const query = search.trim().toLowerCase();

    const matchesSearch =
      !query ||
      product.name.toLowerCase().includes(query) ||
      product.slug.toLowerCase().includes(query) ||
      String(product.category || "").toLowerCase().includes(query);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const newUntil = product.new_until
      ? new Date(`${product.new_until}T23:59:59`)
      : null;

    const currentlyNew =
      Boolean(product.is_new) &&
      (!newUntil || newUntil.getTime() >= today.getTime());

    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "live"
        ? Boolean(product.is_active) && !product.is_coming_soon
        : statusFilter === "coming-soon"
        ? Boolean(product.is_coming_soon)
        : statusFilter === "new"
        ? currentlyNew
        : statusFilter === "featured"
        ? Boolean(product.feature_on_homepage)
        : statusFilter === "hidden"
        ? !product.is_active
        : true;

    return matchesSearch && matchesStatus;
  });

  const totalOptions = options.length;

  const totalSingleInventory = inventory.reduce(
    (sum, row) => sum + Math.max(0, Number(row.quantity || 0)),
    0
  );

  const preSaleOptions = options.filter(
    (option) => option.status === "pre-sale"
  ).length;

  const saleOptions = options.filter(
    (option) =>
      option.sale_active &&
      Number(option.sale_percent || 0) > 0
  ).length;

  const comingSoonCount = products.filter(
    (product) => product.is_coming_soon
  ).length;

  const featuredCount = products.filter(
    (product) => product.feature_on_homepage
  ).length;

  return {
    loading,
    authorized,

    products,
    deletedProducts,
    filteredProducts,

    selectedSlug,
    selectedProduct,
    setSelectedProduct,

    options,
    pricingDrafts,
    inventory,
    setInventory,

    showAddProduct,
    setShowAddProduct,
    showDeleted,
    setShowDeleted,
    showAddOption,
    setShowAddOption,

    search,
    setSearch,
    statusFilter,
    setStatusFilter,

    notice,
    setNotice,

    newProduct,
    setNewProduct,
    newOption,
    setNewOption,

    totalOptions,
    totalSingleInventory,
    preSaleOptions,
    saleOptions,
    comingSoonCount,
    featuredCount,

    selectProduct,
    createProduct,
    restoreProduct,
    saveProductChanges,
    deleteProduct,
    setProductActive,
    updateProductField,
    updateOption,
    updateOptionLocal,
    updatePricingDraft,
    updateInventory,
    addOptionAndInventory,
  };
}
