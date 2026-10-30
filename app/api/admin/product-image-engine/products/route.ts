import { NextResponse } from "next/server";
import {
  categoryFiltersForFamily,
  requireProductImageAdmin,
} from "../../../../../lib/productImageEngine/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { admin } = await requireProductImageAdmin(request);
    const url = new URL(request.url);
    const family = url.searchParams.get("family") || "individual-peptides";
    const categories = categoryFiltersForFamily(family);

    if (!categories.length) {
      return NextResponse.json(
        { error: "Invalid product category.", family, products: [] },
        { status: 400 }
      );
    }

    const { data, error } = await admin
      .from("products")
      .select("id,name,slug,image,category,product_family,color")
      .in("category", categories)
      .order("name", { ascending: true });

    if (error) {
      console.error("Product Image Engine product lookup failed:", error);
      return NextResponse.json({ error: "Unable to load products." }, { status: 500 });
    }

    return NextResponse.json({ family, products: data || [] });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Product Image Engine products route failed:", error);
    return NextResponse.json({ error: "Unable to load products." }, { status: 500 });
  }
}
