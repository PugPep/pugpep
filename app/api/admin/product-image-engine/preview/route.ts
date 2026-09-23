import { NextResponse } from "next/server";

import {
  CYBER_PALETTES,
  paletteForSlug,
} from "../../../../../lib/productImageEngine/palettes";

import {
  renderProductImage,
} from "../../../../../lib/productImageEngine/render";

import {
  requireProductImageAdmin,
} from "../../../../../lib/productImageEngine/server";

import type {
  CyberPalette,
} from "../../../../../lib/productImageEngine/types";

export const dynamic = "force-dynamic";

function normalizeHexColor(
  value: unknown
): string | null {
  const raw =
    String(value || "")
      .trim();

  if (
    !/^#[0-9a-fA-F]{6}$/.test(
      raw
    )
  ) {
    return null;
  }

  return raw.toLowerCase();
}

function getRequestedPalette(
  paletteKey: string,
  slug: string,
  customColor: unknown
): CyberPalette {
  if (
    paletteKey === "custom"
  ) {
    const normalized =
      normalizeHexColor(
        customColor
      );

    if (!normalized) {
      throw new Error(
        "Custom color must be a 6-digit hex color such as #ff45d8."
      );
    }

    return {
      key:
        `custom:${normalized}`,
      primary:
        normalized,
      secondary:
        normalized,
      glow:
        normalized,
    };
  }

  if (
    !paletteKey ||
    paletteKey === "random"
  ) {
    return paletteForSlug(
      slug
    );
  }

  const selected =
    CYBER_PALETTES.find(
      (palette) =>
        palette.key ===
        paletteKey
    );

  return (
    selected ||
    paletteForSlug(
      slug
    )
  );
}

function safeNumber(
  value: unknown,
  fallback: number
): number {
  const parsed =
    Number(value);

  if (
    !Number.isFinite(
      parsed
    )
  ) {
    return fallback;
  }

  return Math.round(
    parsed
  );
}

async function verifyPublicAsset(
  url: string,
  label: string
) {
  const response =
    await fetch(
      url,
      {
        method: "GET",
        cache: "no-store",
      }
    );

  if (
    !response.ok
  ) {
    throw new Error(
      `${label} could not be loaded from storage (${response.status} ${response.statusText}). The template database record may point to a file that no longer exists.`
    );
  }

  const contentType =
    response.headers.get(
      "content-type"
    ) || "";

  if (
    !contentType.startsWith(
      "image/"
    )
  ) {
    throw new Error(
      `${label} did not return an image. Received content type "${contentType || "unknown"}".`
    );
  }
}

export async function POST(
  request: Request
) {
  try {
    const {
      admin,
    } =
      await requireProductImageAdmin(
        request
      );

    let body:
      Record<string, unknown>;

    try {
      body =
        await request.json();
    } catch {
      return NextResponse.json(
        {
          error:
            "Preview request body is not valid JSON.",
        },
        {
          status: 400,
        }
      );
    }

    const productId =
      String(
        body.productId ||
        ""
      );

    const templateId =
      String(
        body.templateId ||
        ""
      );

    const paletteKey =
      String(
        body.paletteKey ||
        "random"
      );

    const customColor =
      body.customColor;

    const labelText =
      typeof body.labelText ===
      "string"
        ? body.labelText
        : null;

    const layout =
      (
        body.layout &&
        typeof body.layout ===
          "object"
      )
        ? body.layout as Record<
            string,
            unknown
          >
        : {};

    if (
      !productId ||
      !templateId
    ) {
      return NextResponse.json(
        {
          error:
            "Product and template are required.",
        },
        {
          status: 400,
        }
      );
    }

    const [
      productResult,
      templateResult,
    ] =
      await Promise.all([
        admin
          .from(
            "products"
          )
          .select(
            `
            id,
            name,
            slug,
            image,
            category,
            product_family,
            color
            `
          )
          .eq(
            "id",
            productId
          )
          .single(),

        admin
          .from(
            "product_image_templates"
          )
          .select("*")
          .eq(
            "id",
            templateId
          )
          .single(),
      ]);

    const {
      data: product,
      error: productError,
    } =
      productResult;

    const {
      data: template,
      error: templateError,
    } =
      templateResult;

    if (
      productError ||
      !product
    ) {
      console.error(
        "Preview product lookup failed:",
        productError
      );

      return NextResponse.json(
        {
          error:
            "Product not found.",
          product_id:
            productId,
        },
        {
          status: 404,
        }
      );
    }

    if (
      templateError ||
      !template
    ) {
      console.error(
        "Preview template lookup failed:",
        templateError
      );

      return NextResponse.json(
        {
          error:
            "Template not found.",
          template_id:
            templateId,
        },
        {
          status: 404,
        }
      );
    }

    const productFamily =
      product.product_family ||
      null;

    const templateProductFamily =
      template.product_family ||
      null;

    const isLabMaterial =
      product.category ===
      "lab-material";

    if (
      !isLabMaterial &&
      !productFamily
    ) {
      return NextResponse.json(
        {
          error:
            "This product does not have a Product Family assigned.",
          product_id:
            product.id,
          product_name:
            product.name,
        },
        {
          status: 400,
        }
      );
    }

    if (
      !isLabMaterial &&
      templateProductFamily &&
      productFamily !==
        templateProductFamily
    ) {
      return NextResponse.json(
        {
          error:
            "Selected template is assigned to a different Product Family. Shared templates with no Product Family are allowed.",
          product_family:
            productFamily,
          template_product_family:
            templateProductFamily,
          product_name:
            product.name,
          template_name:
            template.name,
        },
        {
          status: 400,
        }
      );
    }

    if (
      !template.template_path
    ) {
      return NextResponse.json(
        {
          error:
            "Selected template has no template image path.",
          template_id:
            template.id,
          template_name:
            template.name,
        },
        {
          status: 409,
        }
      );
    }

    const templateUrl =
      admin.storage
        .from(
          "product-image-templates"
        )
        .getPublicUrl(
          template.template_path
        )
        .data.publicUrl;

    const maskUrl =
      template.mask_path
        ? admin.storage
            .from(
              "product-image-templates"
            )
            .getPublicUrl(
              template.mask_path
            )
            .data.publicUrl
        : null;

    /*
      Verify the stored files before entering the renderer.
      This catches template rows left behind by the older
      delete behavior where Storage could be removed before
      the database row was deleted.
    */
    await verifyPublicAsset(
      templateUrl,
      `Template "${template.name}"`
    );

    if (
      maskUrl
    ) {
      await verifyPublicAsset(
        maskUrl,
        `Mask for "${template.name}"`
      );
    }

    const palette =
      getRequestedPalette(
        paletteKey,
        product.slug,
        customColor
      );

    const renderTemplate = {
      ...template,

      name_y:
        safeNumber(
          layout.nameY,
          template.name_y ??
            1110
        ),

      strength_y:
        safeNumber(
          layout.strengthY,
          template.strength_y ??
            1170
        ),

      research_text_y:
        safeNumber(
          layout.researchTextY,
          template.research_text_y ??
            1205
        ),

      name_font_size:
        safeNumber(
          layout.nameFontSize,
          template.name_font_size ??
            54
        ),

      strength_font_size:
        safeNumber(
          layout.strengthFontSize,
          template.strength_font_size ??
            42
        ),

      research_font_size:
        safeNumber(
          layout.researchFontSize,
          template.research_font_size ??
            22
        ),
    };

    const image =
      await renderProductImage({
        template:
          renderTemplate,

        templateUrl,

        maskUrl,

        product,

        palette,

        labelText,
      });

    if (
      !image ||
      image.length === 0
    ) {
      throw new Error(
        "Renderer returned an empty image."
      );
    }

    return new Response(
      new Uint8Array(
        image
      ),
      {
        status: 200,

        headers: {
          "Content-Type":
            "image/webp",

          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",

          Pragma:
            "no-cache",

          Expires:
            "0",

          "X-Product-Image-Mode":
            "preview-only",

          "X-Palette-Key":
            palette.key,

          "X-Palette-Primary":
            palette.primary,

          "X-Palette-Secondary":
            palette.secondary,

          "X-Template-Id":
            template.id,

          "X-Template-Family":
            templateProductFamily ||
            "shared",

          "X-Product-Family":
            productFamily ||
            "none",
        },
      }
    );
  } catch (
    error
  ) {
    if (
      error instanceof Response
    ) {
      return error;
    }

    console.error(
      "Product Image Engine preview failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to generate preview.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }
}
