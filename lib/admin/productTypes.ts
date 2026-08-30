export type Product = {
  id: string;
  name: string;
  slug: string;
  color: string;
  image: string;
  short_description: string;
  description: string;
  category: string;
  is_active: boolean;
  is_new?: boolean;
  feature_on_homepage?: boolean;
  new_until?: string | null;
  homepage_feature_order?: number | null;
  is_coming_soon?: boolean;
  coming_soon_date?: string | null;
  deleted_at?: string | null;
};

export type ProductOption = {
  id: string;
  product_slug: string;
  dosage: string;
  purchase_type: string;
  price: number;
  cost: number;
  status: string;
  sale_active: boolean;
  sale_percent: number;
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

export type NewProductDraft = {
  name: string;
  slug: string;
  color: string;
  image: string;
  short_description: string;
  description: string;
  category: string;
  is_active: boolean;
  is_new: boolean;
  feature_on_homepage: boolean;
  new_until: string | null;
  homepage_feature_order: number | null;
  is_coming_soon: boolean;
  coming_soon_date: string | null;
};

export type NewOptionDraft = {
  dosage: string;
  purchase_type: string;
  price: string;
  cost: string;
  status: string;
  quantity: string;
};
