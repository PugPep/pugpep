

import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../lib/supabaseClient";
import type {
  Product,
  InventoryOption,
  PricingDraft,
  InventoryItem,
} from "../../lib/admin/inventoryTypes";

const ADMIN_EMAIL = "pugpep99@gmail.com";

export function useAdminInventory() {
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [deletedProducts, setDeletedProducts] = useState<Product[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Partial<Product>>({});

  const [options, setOptions] = useState<InventoryOption[]>([]);
  const [pricingDrafts, setPricingDrafts] = useState<Record<string, PricingDraft>>({});
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [showAddOption, setShowAddOption] = useState(false);

  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [newProductImageUploading, setNewProductImageUploading] = useState(false);
  const [globalKitDiscount, setGlobalKitDiscount] = useState("15");
  const [updatingAllKits, setUpdatingAllKits] = useState(false);



  const emptyNewOption = {
    dosage: "",
    purchase_type: "single",
    price: "",
    cost: "",
    status: "in stock",
    quantity: "",
  };

  const [newProduct, setNewProduct] = useState({
  name: "",
  slug: "",
  color: "#ff45d8",
  image: "",
  short_description: "",
  description: "",
  storage: "",
  category: "peptide",
  is_active: true,
  is_new: false,
  feature_on_homepage: false,
  new_until: "",
  homepage_feature_order: "",
  is_coming_soon: false,
  coming_soon_date: "",
});

  const [newOption, setNewOption] = useState(emptyNewOption);

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email;

      if (!email || email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
        setAuthorized(false);
        setLoading(false);
        return;
      }

      setAuthorized(true);
      await loadProducts();
      await loadDeletedProducts();
      setLoading(false);
    }

    init();
  }, []);

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
    else setProducts(data || []);
  }

  async function loadDeletedProducts() {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .not("deleted_at", "is", null)
      .order("name", { ascending: true });

    if (error) alert(error.message);
    else setDeletedProducts(data || []);
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

    const rows = (data || []) as InventoryOption[];

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
    else setInventory(data || []);
  }

  function updateProductField(field: keyof Product, value: string | boolean) {
    setSelectedProduct((prev) => ({ ...prev, [field]: value }));
  }

  async function uploadNewProductImage(file: File) {
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }

    const maxFileSize = 5 * 1024 * 1024;

    if (file.size > maxFileSize) {
      alert("Product images must be 5 MB or smaller.");
      return;
    }

    setNewProductImageUploading(true);

    try {
      const extension =
        file.name.split(".").pop()?.toLowerCase() || "png";

      const rawSlug = newProduct.slug || newProduct.name || "new-product";
      const safeSlug = rawSlug
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/g, "-")
        .replace(/^-+|-+$/g, "") || "new-product";

      const objectPath =
        `products/${safeSlug}-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(objectPath, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(objectPath);

      const publicUrl = publicUrlData.publicUrl;

      if (!publicUrl) {
        throw new Error("Supabase did not return a public image URL.");
      }

      setNewProduct((previous) => ({
        ...previous,
        image: publicUrl,
      }));

      setNotice("New product image uploaded. Finish the product details and click Save New Product.");
    } catch (error) {
      console.error("New product image upload failed:", error);

      alert(
        error instanceof Error
          ? error.message
          : "The product image could not be uploaded."
      );
    } finally {
      setNewProductImageUploading(false);
    }
  }

  async function uploadProductImage(file: File) {
    if (!selectedProduct.id || !selectedProduct.slug) {
      alert("Select a product first.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }

    const maxFileSize = 5 * 1024 * 1024;

    if (file.size > maxFileSize) {
      alert("Product images must be 5 MB or smaller.");
      return;
    }

    setImageUploading(true);

    try {
      const extension =
        file.name.split(".").pop()?.toLowerCase() || "png";

      const safeSlug = String(selectedProduct.slug)
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/g, "-")
        .replace(/^-+|-+$/g, "");

      const objectPath =
        `products/${safeSlug}-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(objectPath, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(objectPath);

      const publicUrl = publicUrlData.publicUrl;

      if (!publicUrl) {
        throw new Error("Supabase did not return a public image URL.");
      }

      const { error: productError } = await supabase
        .from("products")
        .update({
          image: publicUrl,
        })
        .eq("id", selectedProduct.id);

      if (productError) {
        throw productError;
      }

      setSelectedProduct((previous) => ({
        ...previous,
        image: publicUrl,
      }));

      setProducts((previous) =>
        previous.map((product) =>
          product.id === selectedProduct.id
            ? {
                ...product,
                image: publicUrl,
              }
            : product
        )
      );

      setNotice("Product image uploaded and updated on the website.");
    } catch (error) {
      console.error("Product image upload failed:", error);

      alert(
        error instanceof Error
          ? error.message
          : "The product image could not be uploaded."
      );
    } finally {
      setImageUploading(false);
    }
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
        storage: selectedProduct.storage || "",
        is_active: selectedProduct.is_active ?? true,
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

    const { error } = await supabase.from("products").insert({
      ...newProduct,
      new_until: newProduct.new_until || null,
      homepage_feature_order:
        newProduct.homepage_feature_order === ""
          ? null
          : Number(newProduct.homepage_feature_order),
      is_coming_soon: Boolean(newProduct.is_coming_soon),
      coming_soon_date: newProduct.coming_soon_date || null,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setNotice("Product created.");

    setNewProduct({
  name: "",
  slug: "",
  color: "#ff45d8",
  image: "",
  short_description: "",
  description: "",
  storage: "",
  category: "peptide",
  is_active: true,
  is_new: false,
  feature_on_homepage: false,
  new_until: "",
  homepage_feature_order: "",
  is_coming_soon: false,
  coming_soon_date: "",
});
    setShowAddProduct(false);
    await loadProducts();
  }

  async function archiveProduct() {
    if (!selectedProduct.id || !selectedSlug) {
      alert("Select a product first.");
      return;
    }

    const confirmed = window.confirm(
      `Archive ${selectedProduct.name || "this product"}?\n\n` +
        "This will hide the product from customers and move it to Archived Products. " +
        "It can be restored later."
    );

    if (!confirmed) return;

    const archivedAt = new Date().toISOString();

    const { error } = await supabase
      .from("products")
      .update({
        is_active: false,
        deleted_at: archivedAt,
      })
      .eq("id", selectedProduct.id);

    if (error) {
      alert(error.message);
      return;
    }

    setNotice(
      `${selectedProduct.name || "Product"} moved to Archived Products.`
    );

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
        is_active: true,
      })
      .eq("id", productId);

    if (error) {
      alert(error.message);
      return;
    }

    setNotice("Archived product restored.");

    await loadProducts();
    await loadDeletedProducts();
  }

  function findMatchingSingleOption(option: InventoryOption) {
    if (option.purchase_type !== "kit") {
      return null;
    }

    return (
      options.find(
        (candidate) =>
          candidate.purchase_type === "single" &&
          candidate.product_slug === option.product_slug &&
          candidate.dosage === option.dosage &&
          !candidate.archived_at
      ) || null
    );
  }

  function getKitSavings(option: InventoryOption) {
    if (option.purchase_type !== "kit") {
      return null;
    }

    const single = findMatchingSingleOption(option);

    if (!single) {
      return null;
    }

    const singlePrice = Math.max(
      0,
      Number(
        pricingDrafts[single.id]?.price ??
          single.price ??
          0
      )
    );

    const kitPrice = Math.max(
      0,
      Number(
        pricingDrafts[option.id]?.price ??
          option.price ??
          0
      )
    );

    const tenSingleValue = singlePrice * 10;

    if (tenSingleValue <= 0) {
      return null;
    }

    const savingsAmount = Math.max(
      0,
      tenSingleValue - kitPrice
    );

    const savingsPercent =
      (savingsAmount / tenSingleValue) * 100;

    return {
      singlePrice,
      tenSingleValue,
      kitPrice,
      savingsAmount,
      savingsPercent,
    };
  }

  async function applyGlobalKitDiscount() {
    if (updatingAllKits) return;

    const discountPercent = Math.min(
      100,
      Math.max(
        0,
        Number(globalKitDiscount || 0)
      )
    );

    const confirmed = window.confirm(
      `Apply a ${discountPercent}% kit discount to every active kit?\n\n` +
        "Each kit will be repriced from the matching dosage single-vial price × 10. " +
        "Kit bundle discounts will also remain disabled."
    );

    if (!confirmed) return;

    setUpdatingAllKits(true);
    setNotice("");

    try {
      const { data, error } = await supabase.rpc(
        "admin_apply_global_kit_discount",
        {
          p_discount_percent: discountPercent,
        }
      );

      if (error) {
        throw error;
      }

      const result =
        data && typeof data === "object"
          ? (data as Record<string, unknown>)
          : null;

      setNotice(
        `Global kit pricing updated to ${discountPercent}% savings.` +
          (result?.updated_count != null
            ? ` ${String(result.updated_count)} kit option(s) updated.`
            : "")
      );

      if (selectedSlug) {
        await loadOptions(selectedSlug);
      }
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Global kit pricing could not be updated."
      );
    } finally {
      setUpdatingAllKits(false);
    }
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

  function updateOptionLocal(
    optionId: string,
    patch: Partial<InventoryOption>
  ) {
    setOptions((previous) =>
      previous.map((row) =>
        row.id === optionId
          ? {
              ...row,
              ...patch,
            }
          : row
      )
    );
  }

  async function setOptionActive(
    optionId: string,
    nextActive: boolean
  ) {
    const option = options.find((row) => row.id === optionId);

    if (!option) {
      alert("InventoryOption not found.");
      return;
    }

    if (option.archived_at) {
      alert("Restore this option before making it active.");
      return;
    }

    updateOptionLocal(optionId, {
      is_active: nextActive,
    });

    const { error } = await supabase
      .from("product_options")
      .update({ is_active: nextActive })
      .eq("id", optionId);

    if (error) {
      alert(error.message);
      await loadOptions(selectedSlug);
      return;
    }

    setNotice(
      nextActive
        ? `${option.dosage} ${option.purchase_type} is active and visible to customers.`
        : `${option.dosage} ${option.purchase_type} is inactive and hidden from customers.`
    );
  }

  async function archiveOption(optionId: string) {
    const option = options.find((row) => row.id === optionId);

    if (!option) {
      alert("InventoryOption not found.");
      return;
    }

    const confirmed = window.confirm(
      `Archive ${option.dosage} ${option.purchase_type}?\n\nOnly this exact option will be archived. Other dosages, singles, and kits will not be changed.`
    );

    if (!confirmed) return;

    const archivedAt = new Date().toISOString();

    const { error } = await supabase
      .from("product_options")
      .update({
        is_active: false,
        archived_at: archivedAt,
        sale_active: false,
      })
      .eq("id", optionId);

    if (error) {
      alert(error.message);
      return;
    }

    updateOptionLocal(optionId, {
      is_active: false,
      archived_at: archivedAt,
      sale_active: false,
    });

    setNotice(
      `${option.dosage} ${option.purchase_type} archived. No other option was changed.`
    );
  }

  async function restoreOption(optionId: string) {
    const option = options.find((row) => row.id === optionId);

    if (!option) {
      alert("InventoryOption not found.");
      return;
    }

    const { error } = await supabase
      .from("product_options")
      .update({
        archived_at: null,
        is_active: false,
      })
      .eq("id", optionId);

    if (error) {
      alert(error.message);
      return;
    }

    updateOptionLocal(optionId, {
      archived_at: null,
      is_active: false,
    });

    setNotice(
      `${option.dosage} ${option.purchase_type} restored. Check Active Product when you want it visible to customers.`
    );
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
      is_active: true,
      archived_at: null,
      bundle_discount_enabled:
        newOption.purchase_type === "single",
      bundle_qty_1: 3,
      bundle_discount_1: 2,
      bundle_qty_2: 5,
      bundle_discount_2: 4,
      bundle_qty_3: 8,
      bundle_discount_3: 7,
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

  function getInventoryForOption(option: InventoryOption) {
    return inventory.find(
      (row) =>
        row.product_slug === option.product_slug &&
        row.dosage === option.dosage &&
        row.purchase_type === "single"
    );
  }

  const filteredProducts = products.filter((product) => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return true;
    }

    return (
      product.name.toLowerCase().includes(query) ||
      product.slug.toLowerCase().includes(query) ||
      String(product.category || "").toLowerCase().includes(query)
    );
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
      option.is_active !== false &&
      !option.archived_at &&
      option.sale_active &&
      Number(option.sale_percent || 0) > 0
  ).length;

  return {
    loading,
    authorized,
    products,
    deletedProducts,
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
    notice,
    setNotice,
    imageUploading,
    newProductImageUploading,
    globalKitDiscount,
    setGlobalKitDiscount,
    updatingAllKits,
    newProduct,
    setNewProduct,
    newOption,
    setNewOption,
    filteredProducts,
    totalOptions,
    totalSingleInventory,
    preSaleOptions,
    saleOptions,
    getSingleStatus,
    getKitStatus,
    selectProduct,
    uploadNewProductImage,
    uploadProductImage,
    updateProductField,
    saveProductChanges,
    createProduct,
    archiveProduct,
    restoreProduct,
    findMatchingSingleOption,
    getKitSavings,
    applyGlobalKitDiscount,
    updatePricingDraft,
    updateOptionLocal,
    setOptionActive,
    archiveOption,
    restoreOption,
    updateOption,
    updateInventory,
    addOptionAndInventory,
    getInventoryForOption,
  };
}
