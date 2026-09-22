export type ProductImageFamily =
  | "peptides"
  | "sprays"
  | "lab-materials";

export type ProductImageTemplate = {
  id: string;

  family: ProductImageFamily;

  name: string;

  version: number;

  is_active: boolean;

  template_path: string;

  mask_path: string | null;

  canvas_width: number;

  canvas_height: number;

  name_y: number;

  strength_y: number;

  research_text_y: number;

  name_font_size: number;

  strength_font_size: number;

  research_font_size: number;

  created_by?: string | null;

  created_at?: string;
};

export type EngineProduct = {
  id: string;

  name: string;

  slug: string;

  image: string | null;

  category: string;

  color?: string | null;
};

export type CyberPalette = {
  key: string;

  primary: string;

  secondary: string;

  glow: string;
};