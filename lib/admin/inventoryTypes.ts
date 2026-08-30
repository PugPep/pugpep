export type Product = {
  id: string;
  name: string;
  slug: string;
  color: string;
  image: string;
  short_description: string;
  description: string;
  storage?: string | null;
  category: string;
  is_active: boolean;
  is_new: boolean;
  feature_on_homepage: boolean;
  new_until?: string | null;
  homepage_feature_order?: number | null;
  is_coming_soon?: boolean;
  coming_soon_date?: string | null;
  deleted_at?: string | null;
};

export type InventoryOption = {
  id: string;
  product_slug: string;
  dosage: string;
  purchase_type: string;
  price: number;
  cost: number;
  status: string;
  sale_active: boolean;
  sale_percent: number;
  is_active: boolean;
  archived_at?: string | null;
  bundle_discount_enabled: boolean;
  bundle_qty_1: number;
  bundle_discount_1: number;
  bundle_qty_2: number;
  bundle_discount_2: number;
  bundle_qty_3: number;
  bundle_discount_3: number;
};

export type PricingDraft = {
  price: string;
  cost: string;
  salePercent: string;
};

export type InventoryItem = {
  id: string;
  product_slug: string;
  dosage: string;
  purchase_type: string;
  quantity: number;
  status: string;
};

export type NewOptionDraft = {
  dosage: string;
  purchase_type: string;
  price: string;
  cost: string;
  status: string;
  quantity: string;
};

export type NewProductDraft = {
  name: string;
  slug: string;
  color: string;
  image: string;
  short_description: string;
  description: string;
  storage: string;
  category: string;
  is_active: boolean;
  is_new: boolean;
  feature_on_homepage: boolean;
  new_until: string;
  homepage_feature_order: string;
  is_coming_soon: boolean;
  coming_soon_date: string;
};
