export type CurrentProduct = {
  name: string;
  slug: string;
  image: string | null;
  is_active: boolean;
};

export type CurrentProductOption = {
  id?: string;
  product_slug: string;
  dosage: string;
  purchase_type: string;
  price: number;
  status: string;
  cost: number | null;
};

export type CurrentInventory = {
  quantity: number;
};

export type RepresentativeDashboardResult = {
  rep?: {
    id?: string;
    user_id?: string;
    display_name?: string;
    commission_percent?: number;
    commission_rate?: number;
    is_active?: boolean;
  };
};

export type AccountProfile = {
  full_name?: string | null;
  organization?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;

  vip_tier?: string | null;
  lifetime_spend?: number | null;
  reward_points?: number | null;
  has_lifetime_free_shipping?: boolean | null;
  is_hero_account?: boolean | null;
  hero_discount_percent?: number | null;
};

export type DeliveryForm = {
  full_name: string;
  organization: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
};

export type AccountOrder = {
  id: string;
  order_number: string;
  total: number | null;
  status: string | null;
  shipping_status: string | null;
  tracking_number: string | null;
  created_at: string | null;
  shipping_method_label?: string | null;
};
